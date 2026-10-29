// Offline: creates private migration SQL, never connects to Directus or PostgreSQL.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { backfillSQL } from './backfill.mjs';
import { prepareRecoveryDirectory } from '../location-model/permissions.mjs';

const [inventoryFile,directory]=process.argv.slice(2);
assert.ok(inventoryFile && directory,'Usage: node scripts/project-color-model/prepare.mjs PRIVATE_INVENTORY PRIVATE_RECOVERY_DIRECTORY');
const target=await prepareRecoveryDirectory(resolve(directory));
const inventory=JSON.parse(await readFile(inventoryFile,'utf8'));
const invariants=(await readFile(new URL('./invariants.sql',import.meta.url),'utf8'))
  .replace(/^BEGIN;$/mu,'').replace(/^COMMIT;$/mu,'');
const permission=await readFile(new URL('./reader-permission.sql',import.meta.url),'utf8');
const sql=backfillSQL(inventory).replace(/COMMIT;\n$/u,'')+'\n'+invariants+'\n'+permission+'\nCOMMIT;\n';
await writeFile(resolve(target,'apply.sql'),sql,{mode:0o600,flag:'wx'});
console.log('Prepared private atomic backfill, integrity and reader-permission SQL. No remote changes.');
