import assert from 'node:assert/strict';

const id = value => typeof value === 'object' && value ? value.id : value;
const q = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const uuid = value => { assert.match(value, /^[a-f0-9-]{36}$/iu, 'Invalid inventory identifier.'); return value; };

/** Complete, private inventory; never infer an unused or multi-material color. */
export function planBackfill({ colors, materials, projects }, clientSlug = 'sonshine-roofing') {
  for (const rows of [colors, materials, projects]) {
    assert.ok(Array.isArray(rows) && rows.length, 'Complete nonempty inventory required.');
    assert.equal(new Set(rows.map(row => uuid(row.id))).size, rows.length, 'Duplicate inventory row.');
    assert.ok(rows.every(row => row.client?.slug === clientSlug), 'Other tenant usage appeared; review before global relationship constraints.');
  }
  const materialById = new Map(materials.map(row => [row.id, row]));
  const colorById = new Map(colors.map(row => [row.id, row]));
  for (const project of projects) {
    assert.ok(materialById.has(id(project.material_type)), 'Unknown project material.');
    assert.ok(!project.roof_color || colorById.has(id(project.roof_color)), 'Unknown project color.');
  }
  return colors.map(color => {
    const used = new Set(projects.filter(project => id(project.roof_color) === color.id).map(project => id(project.material_type)));
    assert.equal(used.size, 1, 'Unused or ambiguous color requires editorial review.');
    const material = [...used][0];
    assert.ok(!color.material_type || id(color.material_type) === material, 'Existing parent disagrees with usage.');
    if (color.status === 'published') assert.equal(materialById.get(material).status, 'published', 'Published color has an unpublished parent.');
    return { id: color.id, material_type: material };
  });
}

/** Private SQL output contains identifiers and must be stored outside Git. */
export function backfillSQL(inventory) {
  const mapping = planBackfill(inventory);
  const { colors, materials, projects } = inventory;
  const catalog = rows => rows.map(row => `(${q(row.id)}::uuid,${q(row.client.slug)},${q(row.name)},${q(row.slug)},${q(row.status)},${q(row.sort)}::integer)`).join(',\n');
  const projectValues = projects.map(row => `(${q(row.id)}::uuid,${q(row.client.slug)},${q(row.status)},${q(id(row.material_type))}::uuid,${q(id(row.roof_color))}::uuid,${q(row.published_at)}::timestamptz,${q(row.modified_at)}::timestamptz)`).join(',\n');
  return `BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.roofing_material_types,public.roofing_roof_colors,public.roofing_projects IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE expected_colors(id uuid,client_slug text,name text,slug text,status text,sort integer) ON COMMIT DROP;
CREATE TEMP TABLE expected_materials(LIKE expected_colors) ON COMMIT DROP;
CREATE TEMP TABLE expected_projects(id uuid,client_slug text,status text,material_type uuid,roof_color uuid,published_at timestamptz,modified_at timestamptz) ON COMMIT DROP;
CREATE TEMP TABLE expected_color_mapping(id uuid,material_type uuid) ON COMMIT DROP;
INSERT INTO expected_colors VALUES ${catalog(colors)};
INSERT INTO expected_materials VALUES ${catalog(materials)};
INSERT INTO expected_projects VALUES ${projectValues};
INSERT INTO expected_color_mapping VALUES ${mapping.map(row => `(${q(row.id)}::uuid,${q(row.material_type)}::uuid)`).join(',\n')};
DO $preflight$
BEGIN
  IF EXISTS ((SELECT x.id,c.slug,x.name,x.slug,x.status,x.sort FROM public.roofing_roof_colors x JOIN public.clients c ON c.id=x.client EXCEPT SELECT * FROM expected_colors)
    UNION ALL (SELECT * FROM expected_colors EXCEPT SELECT x.id,c.slug,x.name,x.slug,x.status,x.sort FROM public.roofing_roof_colors x JOIN public.clients c ON c.id=x.client))
    OR EXISTS ((SELECT x.id,c.slug,x.name,x.slug,x.status,x.sort FROM public.roofing_material_types x JOIN public.clients c ON c.id=x.client EXCEPT SELECT * FROM expected_materials)
    UNION ALL (SELECT * FROM expected_materials EXCEPT SELECT x.id,c.slug,x.name,x.slug,x.status,x.sort FROM public.roofing_material_types x JOIN public.clients c ON c.id=x.client))
    OR EXISTS ((SELECT x.id,c.slug,x.status,x.material_type,x.roof_color,x.published_at,x.modified_at FROM public.roofing_projects x JOIN public.clients c ON c.id=x.client EXCEPT SELECT * FROM expected_projects)
    UNION ALL (SELECT * FROM expected_projects EXCEPT SELECT x.id,c.slug,x.status,x.material_type,x.roof_color,x.published_at,x.modified_at FROM public.roofing_projects x JOIN public.clients c ON c.id=x.client)) THEN
    RAISE EXCEPTION 'Inventory changed since review; refresh and review instead of guessing' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM public.roofing_roof_colors c JOIN expected_color_mapping m USING(id)
    WHERE c.material_type IS NOT NULL AND c.material_type<>m.material_type) THEN
    RAISE EXCEPTION 'Color parent changed since review' USING ERRCODE='23514';
  END IF;
END;
$preflight$;
UPDATE public.roofing_roof_colors c SET material_type=m.material_type FROM expected_color_mapping m
  WHERE c.id=m.id AND c.material_type IS NULL;
DO $preserve_dates$
BEGIN
  IF EXISTS (SELECT 1 FROM public.roofing_projects p JOIN expected_projects e USING(id)
    WHERE p.published_at IS DISTINCT FROM e.published_at OR p.modified_at IS DISTINCT FROM e.modified_at) THEN
    RAISE EXCEPTION 'Classification backfill changed project editorial dates' USING ERRCODE='23514';
  END IF;
END;
$preserve_dates$;
COMMIT;\n`;
}
