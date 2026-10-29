import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const dom = new JSDOM('<div id="root"></div>', { url: 'https://archive.test/project' });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent'])
  globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const navigationListeners = new Set();
for (const method of ['pushState', 'replaceState']) {
  const original = window.history[method].bind(window.history);
  window.history[method] = (...args) => {
    original(...args);
    navigationListeners.forEach((listener) => listener());
  };
}
window.addEventListener('popstate', () => navigationListeners.forEach((listener) => listener()));
const navigation = {
  useSearchParams() {
    const query = React.useSyncExternalStore(
      (listener) => {
        navigationListeners.add(listener);
        return () => navigationListeners.delete(listener);
      },
      () => window.location.search,
    );
    return React.useMemo(() => new URLSearchParams(query), [query]);
  },
};

// Compile the actual component and local helpers; only Next's URL hook and the network are replaced.
const modules = new Map();
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const loadedModule = { exports: {} };
  modules.set(filename, loadedModule);
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const localRequire = (id) => {
    if (id === 'next/navigation') return navigation;
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/')
        ? resolve(root, id.slice(2))
        : resolve(dirname(filename), id);
      const path = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate));
      return loadSource(path);
    }
    return require(id);
  };
  new Function('require', 'module', 'exports', compiled)(
    localRequire,
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}
const helpers = loadSource(resolve(root, 'lib/ui/archive-filters.ts'));
const Archive = loadSource(
  resolve(root, 'components/dynamic-content/ResourceArchiveClient.tsx'),
).default;
const options = (...values) =>
  values.map((value) => ({ slug: value, label: value[0].toUpperCase() + value.slice(1) }));
const { projectArchiveGroups } = loadSource(resolve(root, 'lib/ui/project-filters.ts'));
const groups = projectArchiveGroups({
  materials: options('metal', 'tile', 'shingle').map(({ slug, label }) => ({ slug, name: label })),
  roofColors: [
    { slug: 'charcoal', name: 'Charcoal', materialTypeSlug: 'shingle' },
    { slug: 'sunset-red', name: 'Sunset Red', materialTypeSlug: 'tile' },
    { slug: 'bronze', name: 'Bronze', materialTypeSlug: 'metal' },
  ],
  serviceAreas: options('sarasota', 'venice').map(({ slug, label }) => ({ slug, name: label })),
});
const videoGroups = [
  {
    key: 'bucket',
    label: 'Category',
    paramKey: 'bk',
    options: options('roofing-project', 'commercials'),
  },
  ...groups.filter((group) => group.key !== 'roof'),
];
const page = (name, total = 1) => ({
  items: total ? [{ name }] : [],
  total,
  pageInfo: { hasNextPage: false, endCursor: null },
});
let requests;
let mountedRoot;
let rendered;
async function mount(query = '', customGroups = groups, strict = false) {
  await act(async () => {
    if (mountedRoot) mountedRoot.unmount();
    window.history.replaceState(null, '', `/project${query}`);
  });
  requests = [];
  globalThis.fetch = (url, init) =>
    new Promise((resolveResponse, reject) => {
      requests.push({
        url,
        body: JSON.parse(init.body),
        signal: init.signal,
        fail: () => reject(new Error('synthetic failure')),
        finish: (result) => resolveResponse({ ok: true, json: async () => result }),
      });
    });
  mountedRoot = createRoot(document.getElementById('root'));
  const props = {
    kind: 'project',
    apiPath: '/api/resources/project',
    pageSize: 6,
    groups: customGroups,
    initialFilters: { search: '', selections: {} },
    initialResult: page('Initial', 53),
    labels: { itemSingular: 'project', itemPlural: 'projects' },
    buildFiltersPayload: (input) => input,
    renderResults: (value) => {
      rendered = value;
      return React.createElement(
        'div',
        { id: 'results' },
        value.result.items.map((item) => item.name).join(','),
      );
    },
  };
  await act(async () =>
    mountedRoot.render(
      strict
        ? React.createElement(React.StrictMode, null, React.createElement(Archive, props))
        : React.createElement(Archive, props),
    ),
  );
}
async function choose(id, value) {
  await act(async () => {
    const element = document.getElementById(id);
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function type(value) {
  await act(async () => {
    const element = document.getElementById('project-search');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () =>
    document
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
}
async function click(label) {
  await act(async () =>
    [...document.querySelectorAll('button')].find((button) => button.textContent === label).click(),
  );
}
async function finish(request, result) {
  await act(async () => request.finish(result));
}
async function historyBack() {
  await act(async () => {
    window.history.back();
    await new Promise((done) => window.addEventListener('popstate', done, { once: true }));
  });
}

await test('shared accordion content is readable when its entrance animation cannot run', async () => {
  const Accordion = loadSource(resolve(root, 'components/ui/Accordion.tsx')).Accordion;
  const source = readFileSync(resolve(root, 'app/globals.css'), 'utf8');
  const utility = source.match(/@utility accordion-motion\s*\{([\s\S]*?)\n\s*details\[/u)?.[1];
  const rule = utility ? `.accordion-motion {${utility}}` : null;
  assert.ok(rule, 'shared accordion CSS exists');
  const style = document.createElement('style');
  style.textContent = rule;
  document.head.append(style);
  const accordionRoot = createRoot(document.getElementById('root'));
  await act(async () =>
    accordionRoot.render(
      React.createElement(
        Accordion,
        { summary: 'Example question', defaultOpen: true },
        'Readable answer',
      ),
    ),
  );
  // JSDOM does not run CSS animations, matching the fallback needed by reduced motion.
  assert.equal(window.getComputedStyle(document.querySelector('.accordion-motion')).opacity, '1');
  assert.equal(
    window.getComputedStyle(document.querySelector('.accordion-motion')).transform,
    'none',
  );
  await act(async () => accordionRoot.unmount());
  style.remove();
});

await test('legacy filters choose the first valid value and preserve unrelated URL data', () => {
  const params = new URLSearchParams(
    'q=roof,repair&mt=missing,tile,metal&rc=bronze&sa=venice&v=video-demo&utm_source=test',
  );
  const parsed = helpers.readArchiveFilters(params, groups);
  assert.equal(parsed.adjustedLegacyLink, true);
  assert.equal(parsed.filters.search, 'roof,repair');
  assert.equal(parsed.filters.selections.material, 'tile');
  const output = helpers.writeArchiveFilters(params, parsed.filters, groups);
  assert.equal(output.get('mt'), 'tile');
  assert.equal(output.get('v'), 'video-demo');
  assert.equal(output.get('utm_source'), 'test');
  assert.equal(
    helpers.readArchiveFilters(new URLSearchParams('mt=metal&mt=tile'), groups).adjustedLegacyLink,
    true,
  );
});

await test('editing all fields sends no request; submission applies them together', async () => {
  await mount('?utm_source=test#results');
  await type('roof');
  await choose('project-material', 'metal');
  await choose('project-roof', 'bronze');
  await choose('project-area', 'venice');
  assert.equal(requests.length, 0);
  assert.equal(window.location.search, '?utm_source=test');
  assert.equal(rendered.result.total, 53);
  await submit();
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body.filters, {
    search: 'roof',
    selections: { material: ['metal'], roof: ['bronze'], area: ['venice'] },
  });
  assert.equal(window.location.hash, '#results');
  await finish(requests[0], page('Metal result', 4));
  const appliedPayload = rendered.listFilters;
  await choose('project-material', 'tile');
  assert.equal(
    rendered.listFilters,
    appliedPayload,
    'pagination keeps the submitted filters while draft changes',
  );
  assert.match(document.body.textContent, /Material: Metal/);
});

await test('superseded responses cannot replace newer results or clear their loading state', async () => {
  await mount();
  await choose('project-material', 'metal');
  await submit();
  const older = requests[0];
  await choose('project-material', 'tile');
  await submit();
  assert.equal(older.signal.aborted, true);
  await finish(older, page('Stale'));
  assert.equal(rendered.result.total, 53);
  assert.equal(document.querySelector('[aria-busy]').getAttribute('aria-busy'), 'true');
  await finish(requests[1], page('Newest', 8));
  assert.equal(rendered.result.total, 8);
  assert.equal(document.querySelector('[aria-busy]').getAttribute('aria-busy'), 'false');
});

await test('failed searches keep prior results and retry the submitted criteria', async () => {
  await mount();
  await choose('project-material', 'metal');
  await choose('project-roof', 'bronze');
  await submit();
  await act(async () => requests[0].fail());
  assert.match(document.querySelector('[role="alert"]').textContent, /previous results/);
  assert.equal(rendered.result.total, 53);
  await choose('project-material', 'tile');
  await click('Retry search');
  assert.deepEqual(requests[1].body.filters.selections.material, ['metal']);
  assert.deepEqual(requests[1].body.filters.selections.roof, ['bronze'], 'retry uses submitted color even after a draft material change clears it');
  await finish(requests[1], page('Retry result', 6));
  assert.equal(rendered.result.total, 6);
});

await test('Clear all resets pending and applied filters, URL and first page', async () => {
  await mount('?mt=metal&v=video-demo&utm_source=test');
  await finish(requests[0], page('Filtered', 6));
  await type('pending');
  await choose('project-area', 'venice');
  await click('Clear all');
  assert.equal(document.getElementById('project-search').value, '');
  assert.ok([...document.querySelectorAll('select')].every((select) => select.value === ''));
  assert.equal(new URLSearchParams(window.location.search).get('mt'), null);
  assert.equal(new URLSearchParams(window.location.search).get('v'), 'video-demo');
  assert.equal(new URLSearchParams(window.location.search).get('utm_source'), 'test');
  assert.equal(requests[1].body.after, null);
  await finish(requests[1], page('Reset', 53));
  assert.equal(rendered.result.total, 53);
});

await test('video categories preserve material and location draft fields for overlapping assignments', async () => {
  await mount('', videoGroups);
  await choose('project-material', 'metal');
  await choose('project-area', 'venice');
  assert.equal(
    document.getElementById('project-bucket').value,
    '',
    'do not silently switch video type',
  );
  await choose('project-bucket', 'commercials');
  for (const id of ['project-material', 'project-area']) {
    assert.notEqual(document.getElementById(id).value, '');
    assert.equal(document.getElementById(id).disabled, false);
  }
  assert.equal(requests.length, 0);
  await submit();
  assert.deepEqual(requests[0].body.filters.selections, {
    bucket: ['commercials'],
    material: ['metal'],
    area: ['venice'],
  });
  await choose('project-bucket', 'roofing-project');
  assert.equal(document.getElementById('project-material').disabled, false);
});

await test('legacy deep links hydrate under StrictMode and browser Back restores the prior search', async () => {
  await mount('?mt=metal,tile&v=video-demo', groups, true);
  const active = requests.filter((request) => !request.signal.aborted);
  assert.equal(active.length, 1);
  assert.equal(document.getElementById('project-material').value, 'metal');
  assert.match(document.body.textContent, /saved search included multiple selections/);
  assert.equal(new URLSearchParams(window.location.search).get('mt'), 'metal');
  await finish(active[0], page('Metal', 6));
  await choose('project-material', 'tile');
  await submit();
  await finish(requests.at(-1), page('Tile', 8));
  await historyBack();
  assert.equal(document.getElementById('project-material').value, 'metal');
  assert.deepEqual(requests.at(-1).body.filters.selections.material, ['metal']);
  await finish(requests.at(-1), page('Metal again', 6));
  assert.equal(rendered.result.total, 6);
});

await test('explicit same-criteria Search and pending-only Clear all refresh the first page', async () => {
  await mount();
  const originalResult = rendered.result;
  const originalPayload = rendered.listFilters;
  await submit();
  assert.equal(requests.length, 1, 'explicit Search must refresh even when criteria are unchanged');
  assert.equal(requests[0].body.after, null);
  await finish(requests[0], page('Refreshed first page', 53));
  assert.notEqual(rendered.result, originalResult);
  assert.notEqual(
    rendered.listFilters,
    originalPayload,
    'fresh result/payload reset existing InfiniteList pagination',
  );
  const refreshedPayload = rendered.listFilters;
  await choose('project-material', 'metal');
  await click('Clear all');
  assert.equal(requests.length, 2, 'pending-only reset must refresh the first page');
  assert.equal(requests[1].body.after, null);
  await finish(requests[1], page('Reset first page', 53));
  assert.notEqual(rendered.listFilters, refreshedPayload);
  assert.equal(
    [...document.querySelectorAll('button')].find((button) => button.textContent === 'Clear all')
      .disabled,
    false,
  );
});

await test('zero results suggest checking filters and offer the same Clear all action', async () => {
  await mount();
  await choose('project-material', 'metal');
  await submit();
  await finish(requests[0], page('Empty', 0));
  assert.match(document.body.textContent, /Check your search and filters, or clear all filters/);
  assert.equal(document.querySelectorAll('button').length > 0, true);
  await click('Clear all');
  await finish(requests.at(-1), page('All again', 53));
  assert.equal(rendered.result.total, 53);
});


await test('Location, Material, Color order and material dependency preserve independent draft choices', async () => {
  await mount();
  assert.deepEqual([...document.querySelectorAll('select')].map((element) => element.name), ['sa', 'mt', 'rc']);
  const color = document.getElementById('project-roof');
  assert.equal(color.disabled, true);
  assert.equal(color.options[0].textContent, 'Choose a material first');
  await choose('project-area', 'venice');
  assert.equal(color.disabled, true);
  await choose('project-material', 'shingle');
  assert.equal(color.disabled, false);
  assert.equal(document.querySelector('label[for="project-roof"]').textContent, 'Shingle color');
  assert.deepEqual([...color.options].map((option) => option.textContent), ['All shingle colors', 'Charcoal']);
  await choose('project-roof', 'charcoal');
  await choose('project-area', 'sarasota');
  assert.equal(color.value, 'charcoal');
  assert.equal(document.getElementById('project-material').value, 'shingle');
  assert.doesNotMatch(document.body.textContent, /Material and location apply to roofing-project videos/);
  await submit();
  await finish(requests.at(-1), page('Charcoal', 3));
  assert.match(document.body.textContent, /Location: Sarasota · Material: Shingle · Color: Charcoal/);
  await type('pending search');
  await choose('project-material', 'metal');
  assert.equal(color.value, '');
  assert.equal(document.querySelector('.sr-only[role="status"]').textContent, 'Color cleared.');
  assert.equal(document.getElementById('project-area').value, 'sarasota');
  assert.equal(document.getElementById('project-search').value, 'pending search');
  assert.equal(requests.length, 1);
  assert.match(document.body.textContent, /Material: Shingle · Color: Charcoal/);
  assert.deepEqual([...color.options].map((option) => option.textContent), ['All metal colors', 'Bronze']);
  await choose('project-roof', 'bronze');
  await choose('project-material', '');
  assert.equal(color.value, '');
  assert.equal(color.disabled, true);
  assert.equal(document.getElementById('project-area').value, 'sarasota');
});

await test('color-only links infer their parent before normalization and replace history', async () => {
  const before = window.history.length;
  await mount('?rc=charcoal&sa=venice&utm_source=test#results', groups, true);
  assert.equal(window.history.length, before, 'canonicalization must not add a Back step');
  assert.equal(document.getElementById('project-material').value, 'shingle');
  assert.equal(document.getElementById('project-roof').value, 'charcoal');
  assert.equal(new URLSearchParams(window.location.search).get('mt'), 'shingle');
  assert.equal(new URLSearchParams(window.location.search).get('utm_source'), 'test');
  assert.equal(window.location.hash, '#results');
  const active = requests.filter((request) => !request.signal.aborted);
  assert.equal(active.length, 1);
  assert.deepEqual(active[0].body.filters.selections, { area: ['venice'], material: ['shingle'], roof: ['charcoal'] });
  await finish(active[0], page('Legacy charcoal', 3));
  await choose('project-material', 'metal');
  await submit();
  await finish(requests.at(-1), page('Metal', 6));
  await historyBack();
  assert.equal(document.getElementById('project-material').value, 'shingle');
  assert.equal(document.getElementById('project-roof').value, 'charcoal');
  await finish(requests.at(-1), page('Restored charcoal', 3));
});

await test('conflicting saved links retain both dimensions until an explicit draft repair', async () => {
  await mount('?mt=metal&rc=charcoal&utm_source=test#results');
  assert.equal(document.getElementById('project-roof').value, 'charcoal');
  assert.deepEqual(requests.at(-1).body.filters.selections, { area: [], material: ['metal'], roof: ['charcoal'] });
  assert.match(document.querySelector('[role="alert"]').textContent, /different material/);
  assert.equal(new URLSearchParams(window.location.search).get('rc'), 'charcoal');
  await finish(requests.at(-1), page('Conflict', 0));
  await click('Clear color');
  assert.equal(document.getElementById('project-roof').value, '');
  assert.equal(document.querySelector('[role="alert"]'), null);
  assert.equal(requests.length, 1, 'repair remains a draft until Search');
  assert.equal(new URLSearchParams(window.location.search).get('rc'), 'charcoal');
  await submit();
  assert.deepEqual(requests.at(-1).body.filters.selections, { area: [], material: ['metal'], roof: [] });
  await finish(requests.at(-1), page('Repaired metal', 6));
  assert.equal(rendered.result.total, 6);
});


await test('shared dependency help is opt-in and blog controls stay independent', async () => {
  const conditional = [
    videoGroups[0],
    { ...groups.find((group) => group.key === 'material'), enabledWhen: { key: 'bucket', values: ['roofing-project'] }, helpText: 'Material applies to roofing-project videos.' },
  ];
  await mount('', conditional);
  assert.equal(document.getElementById('project-material').disabled, true);
  assert.match(document.getElementById('project-material-help').textContent, /roofing-project videos/);
  assert.equal(document.getElementById('project-material').getAttribute('aria-describedby'), 'project-material-help');
  await choose('project-bucket', 'roofing-project');
  await choose('project-material', 'metal');
  await choose('project-bucket', 'commercials');
  assert.equal(document.getElementById('project-material').value, '');
  await mount('', [{ key: 'topic', label: 'Topic', paramKey: 'tp', options: options('maintenance', 'roofing') }]);
  const topic = document.getElementById('project-topic');
  assert.equal(topic.disabled, false);
  assert.equal(topic.options[0].textContent, 'All topics');
  assert.doesNotMatch(document.body.textContent, /roofing-project videos|Choose a material first/);
  await choose('project-topic', 'maintenance');
  await submit();
  assert.deepEqual(requests.at(-1).body.filters.selections, { topic: ['maintenance'] });
});

await act(async () => mountedRoot.unmount());
dom.window.close();
