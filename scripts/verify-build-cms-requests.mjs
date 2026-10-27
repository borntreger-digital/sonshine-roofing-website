import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { readDirectusCollection } from '../lib/content/directus-projects.mjs';
import { fetchStaticMediaSnapshot } from '../lib/content/directus-static-media.mjs';
import { STATIC_IMAGE_FOLDER } from '../lib/content/static-image-files.mjs';
import { readRouteCollection } from './route-inventory.mjs';

const config = {
  url: 'https://cms.example.test',
  token: 'synthetic-only',
  clientSlug: 'sonshine-roofing',
};
const row = { id: 'one', status: 'published', client: { slug: config.clientSlug } };
const collectionPayload = { data: [row], meta: { filter_count: 1 } };
const callers = [
  {
    name: 'collection',
    run: (fetcher, url = config.url) =>
      readDirectusCollection({ ...config, url }, fetcher, 'services', ['client.slug', 'status']),
    payload: () => collectionPayload,
  },
  {
    name: 'route inventory',
    run: (fetcher, url = config.url) =>
      readRouteCollection({
        collection: 'services',
        fields: [],
        directusUrl: url,
        directusToken: config.token,
        clientSlug: config.clientSlug,
        fetcher,
      }),
    payload: () => collectionPayload,
  },
  {
    name: 'static media',
    run: (fetcher, url = config.url) =>
      fetchStaticMediaSnapshot(
        {
          DIRECTUS_URL: url,
          DIRECTUS_TOKEN: config.token,
          DIRECTUS_CLIENT_SLUG: config.clientSlug,
        },
        fetcher,
      ),
    payload: (url) => ({
      data: JSON.parse(url.searchParams.get('filter')).id._in.map((id) => ({
        id,
        folder: STATIC_IMAGE_FOLDER,
        type: 'image/png',
        description: 'Synthetic roof',
        width: 100,
        height: 100,
      })),
    }),
  },
];
const networkError = () =>
  new TypeError('synthetic private URL and token', {
    cause: Object.assign(new Error('private details'), { code: 'ECONNRESET' }),
  });
function verifyRequest(url, options) {
  assert.equal(options.method ?? 'GET', 'GET');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.headers.Authorization, 'Bearer synthetic-only');
  assert.ok(options.signal instanceof AbortSignal);
  assert.ok(url.searchParams.has('filter'));
}
for (const caller of callers) {
  for (const phase of ['connection', 'body'])
    test(`${caller.name} recovers a dropped ${phase} without changing the request`, async () => {
      const requests = [];
      const result = await caller.run(async (url, options) => {
        // Assertions after the request fail are intentionally separate from the injected failure.
        requests.push({ url: url.href, options });
        if (requests.length === 1 && phase === 'connection') throw networkError();
        return {
          ok: true,
          json: async () => {
            if (requests.length === 1) throw networkError();
            return caller.payload(url);
          },
        };
      });
      assert.ok(result);
      assert.equal(requests[0].url, requests[1].url);
      assert.notEqual(requests[0].options.signal, requests[1].options.signal);
      for (const request of requests) verifyRequest(new URL(request.url), request.options);
    });
  test(`${caller.name} stops after three failures without exposing request details`, async () => {
    let attempts = 0;
    await assert.rejects(
      caller.run(async () => {
        attempts++;
        throw networkError();
      }),
      (error) => {
        assert.equal(error.code, 'ECONNRESET');
        assert.equal(error.cause, undefined);
        assert.doesNotMatch(error.message, /private|example.test|synthetic-only|Bearer/);
        return true;
      },
    );
    assert.equal(attempts, 3);
  });
  for (const status of [401, 403, 404, 503])
    test(`${caller.name} preserves HTTP ${status} failure without retry`, async () => {
      let attempts = 0,
        canceled = 0;
      await assert.rejects(
        caller.run(async () => {
          attempts++;
          return {
            ok: false,
            status,
            body: {
              cancel: async () => {
                canceled++;
              },
            },
            json: () => assert.fail('HTTP error body must not be read'),
          };
        }),
        new RegExp(`HTTP ${status}`),
      );
      assert.equal(attempts, 1);
      assert.equal(canceled, 1);
    });
  test(`${caller.name} rejects invalid JSON without retry`, async () => {
    let attempts = 0;
    await assert.rejects(
      caller.run(async () => {
        attempts++;
        return {
          ok: true,
          json: async () => {
            throw new SyntaxError('synthetic malformed JSON');
          },
        };
      }),
      SyntaxError,
    );
    assert.equal(attempts, 1);
  });
  test(`${caller.name} handles a real interrupted response body`, async () => {
    let attempts = 0;
    const server = createServer((request, response) => {
      attempts++;
      assert.equal(request.headers.authorization, 'Bearer synthetic-only');
      response.writeHead(200, { 'content-type': 'application/json' });
      if (attempts === 1) {
        response.write('{"data":');
        setTimeout(() => request.socket.destroy(), 10);
      } else response.end(JSON.stringify(caller.payload(new URL(request.url, 'http://localhost'))));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      await caller.run(fetch, `http://127.0.0.1:${server.address().port}`);
      assert.ok(attempts >= 2);
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

test('a retried later collection page neither duplicates nor drops rows', async () => {
  const pages = [],
    attempts = new Map();
  const result = await readDirectusCollection(
    config,
    async (url, options) => {
      verifyRequest(url, options);
      assert.deepEqual(JSON.parse(url.searchParams.get('filter')), {
        client: { slug: { _eq: config.clientSlug } },
        status: { _eq: 'published' },
      });
      const page = Number(url.searchParams.get('page'));
      pages.push(page);
      attempts.set(page, (attempts.get(page) ?? 0) + 1);
      if (page === 2 && attempts.get(page) === 1) throw networkError();
      return Response.json({
        data: Array.from({ length: page === 1 ? 100 : 1 }, (_, i) => ({
          id: String((page - 1) * 100 + i),
        })),
        meta: { filter_count: 101 },
      });
    },
    'services',
    [],
  );
  assert.equal(result.length, 101);
  assert.equal(new Set(result.map((r) => r.id)).size, 101);
  assert.deepEqual(pages, [1, 2, 2]);
});

test('route scope and inventory validation still fail without a retry', async () => {
  for (const payload of [
    { data: [{ ...row, client: { slug: 'foreign' } }], meta: { filter_count: 1 } },
    { data: [row], meta: { filter_count: 2 } },
  ]) {
    let attempts = 0;
    await assert.rejects(
      callers[1].run(async () => {
        attempts++;
        return Response.json(payload);
      }),
      /scope|truncated/,
    );
    assert.equal(attempts, 1);
  }
});

test('failed fresh capture removes old seals and never seals partial content', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'sonshine-retry-seal-'));
  try {
    await mkdir(join(scratch, '.generated'));
    for (const name of ['content-manifest.json', 'capture-complete.json'])
      await writeFile(join(scratch, '.generated', name), '{"old":true}');
    const stub = join(scratch, 'fetch.mjs');
    await writeFile(
      stub,
      `globalThis.fetch = async () => { throw new TypeError('synthetic-only', { cause: Object.assign(new Error('synthetic-only'), { code: 'ECONNRESET' }) }); };`,
    );
    const child = spawn(
      process.execPath,
      [
        '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
        '--import',
        stub,
        new URL('./generate-content-snapshot.mjs', import.meta.url).pathname,
      ],
      {
        cwd: scratch,
        env: {
          PATH: process.env.PATH,
          DIRECTUS_URL: config.url,
          DIRECTUS_TOKEN: config.token,
          DIRECTUS_CLIENT_SLUG: config.clientSlug,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let output = '';
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (chunk) => {
        output += chunk;
      });
    const [code] = await once(child, 'exit');
    assert.notEqual(code, 0);
    assert.match(output, /attempt=3\/3/);
    assert.doesNotMatch(output, /synthetic-only/);
    for (const name of ['content-manifest.json', 'capture-complete.json'])
      await assert.rejects(readFile(join(scratch, '.generated', name)), { code: 'ENOENT' });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
