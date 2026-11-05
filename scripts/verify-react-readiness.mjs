import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
const require = createRequire(import.meta.url);
const root = resolve(new URL('../', import.meta.url).pathname);
const React = require('react');
const { act } = React;
const { createRoot, hydrateRoot } = require('react-dom/client');
const { renderToString } = require('react-dom/server');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/', pretendToBeVisual: true });
for (const key of ['window','document','HTMLElement','HTMLImageElement','HTMLAnchorElement','MutationObserver','Event','MouseEvent','KeyboardEvent','Node','Element']) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
window.scrollTo = () => {};
HTMLElement.prototype.scrollIntoView = () => {};
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IntersectionObserver = class { observe() {} disconnect() {} };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
let pathname = '/fixture-post';
let intersecting = false;
const pageRequests = [];
const cachedPages = [];
const host = (tag) => ({ children, ...props }) => {
  for (const key of ['initial','animate','exit','transition','layout','layoutId','whileInView','viewport','whileHover','whileTap','fill','priority','proseGuard','prefetch','crop','image','projectTitle','decorative']) delete props[key];
  return React.createElement(tag, props, children);
};
const cache = new Map();
function load(filename) {
  filename = resolve(root, filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = { exports: {} }; cache.set(filename, loaded);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (id) => {
    if (id === '@/lib/ui/useIntersection') return { useIntersection: () => ({ ref: () => {}, intersecting }) };
    if (id === '@/lib/content/resource-fetch') return {
      fetchPage: (_kind, query, signal) => new Promise(resolve => pageRequests.push({ query, signal, resolve })),
      setCachedPages: (_kind, query, pages) => cachedPages.push({ query, pages }),
    };
    if (id === '@/components/dynamic-content/blog/BlogArchiveCard' || id === '@/components/dynamic-content/project/ProjectArchiveCard') return {__esModule:true, default: () => null};
    if (id.endsWith('.css')) return {};
    if (id === 'next/script') return { __esModule: true, default: ({id}) => React.createElement('i', { 'data-script': id }) };
    if (id === 'next/navigation') return { useSearchParams: () => new URLSearchParams(), usePathname: () => pathname };
    if (id === 'next/image') return { __esModule: true, default: host('img') };
    if (id === '@/components/media/StaticImage') return { __esModule: true, default: host('img') };
    if (id === 'next/link' || id === '@/components/utils/SmartLink' || id === '@/components/utils/SitePhoneLink') return { __esModule: true, default: host('a') };
    if (id === '@/components/dynamic-content/project/ProjectTestimonial') return { __esModule: true, default: () => null };
    if (id === '@/components/lead-capture/Turnstile') return { __esModule: true, default: () => React.createElement('input', { type: 'hidden', name: 'cfToken', value: 'synthetic', readOnly: true }) };
    if (id === 'framer-motion') return { motion: new Proxy({}, { get: (_, tag) => host(tag) }), AnimatePresence: ({children}) => children, LayoutGroup: ({children}) => children, useReducedMotion: () => true };
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? resolve(root,id.slice(2)) : resolve(dirname(filename),id);
      return load([base,`${base}.ts`,`${base}.tsx`,`${base}.mjs`].find(existsSync));
    }
    return require(id);
  };
  new Function('require','module','exports',code)(localRequire,loaded,loaded.exports); return loaded.exports;
}
let mounted;
async function clean() {
  if (mounted) await act(async () => mounted.unmount());
  mounted = null; document.body.innerHTML = '<div id="root"></div>';
}
async function mount(component, props = {}) {
  await clean(); mounted=createRoot(document.getElementById('root'));
  await act(async () => mounted.render(React.createElement(component,props)));
}
const click = async (node) => { assert.ok(node); await act(async () => node.dispatchEvent(new MouseEvent('click',{bubbles:true}))); };
try {
  process.env.NEXT_PUBLIC_GTM_ID='GTM-SYNTHETIC';
  process.env.NEXT_PUBLIC_META_PIXEL_ID='0000000000';
  process.env.NEXT_PUBLIC_BASE_URL='https://example.test';
  process.env.NEXT_PUBLIC_ENV='production';
  const Analytics = load('lib/telemetry/analytics.tsx');
  assert.equal(renderToString(React.createElement(Analytics.default,{enabled:true})), '', 'No host-dependent tracking in static HTML');
  await mount(Analytics.default,{enabled:false});
  assert.equal(document.querySelectorAll('[data-script]').length,0);
  await mount(Analytics.default,{enabled:true});
  assert.equal(document.querySelectorAll('[data-script]').length,2,'Allowed production host enables both providers');
  const win = {dataLayer:[],__gtmQueue:[{event:'synthetic',lead_id:'fixture'}]};
  Analytics.flushQueuedEvents(win); Analytics.flushQueuedEvents(win);
  assert.equal(win.dataLayer.length,1,'A queued event flushes only once');
  dom.reconfigure({url:'https://untrusted.example/'});
  await mount(Analytics.default,{enabled:true});
  assert.equal(document.querySelectorAll('[data-script]').length,0,'Unapproved hostname stays disabled');
  dom.reconfigure({url:'https://example.test/'});
  await clean();

  const Infinite = load('components/dynamic-content/InfiniteList.tsx').default;
  const firstPage = {items:[{name:'First'}],pageInfo:{hasNextPage:true,endCursor:'first'},total:2};
  const listProps = {kind:'blog',initial:firstPage,filters:{q:'first'},renderItem:item=>React.createElement('h3',null,item.name)};
  await mount(Infinite,listProps);
  intersecting=true;
  await act(async()=>mounted.render(React.createElement(Infinite,listProps)));
  assert.equal(pageRequests.length,1);
  const changedProps={...listProps,initial:{items:[{name:'New search'}],pageInfo:{hasNextPage:false,endCursor:null},total:1},filters:{q:'second'}};
  await act(async()=>mounted.render(React.createElement(Infinite,changedProps)));
  assert.equal(pageRequests[0].signal.aborted,true,'Changed query cancels old request');
  const cacheCount=cachedPages.length;
  await act(async()=>pageRequests[0].resolve({items:[{name:'Stale result'}],pageInfo:{hasNextPage:false,endCursor:null}}));
  assert.match(document.body.textContent,/New search/);assert.doesNotMatch(document.body.textContent,/Stale result/);
  assert.equal(cachedPages.length,cacheCount,'Cancelled response does not repopulate cache');
  await clean(); intersecting=false;

  const Gallery = load('components/dynamic-content/project/ProjectGallery.tsx').default;
  await mount(Gallery,{projectTitle:'Synthetic gallery',images:[{url:'/fixture-photo.jpg',altText:'Synthetic roof'}]});
  await act(async()=>new Promise(resolve=>setTimeout(resolve,25)));
  const photoTrigger=document.querySelector('button[aria-label="Open photo: Synthetic roof"]');
  assert.notEqual(document.activeElement,photoTrigger,'Pointer click need not focus the button in Safari');
  await click(photoTrigger);
  assert.ok(document.querySelector('[role="dialog"]'));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,10)));
  await act(async()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,25)));
  assert.equal(document.querySelector('[role="dialog"]'),null);
  assert.equal(document.activeElement,photoTrigger,'Closing restores the actual pointer trigger');
  await clean();

  const Hours = load('components/utils/OpenOrClosed.tsx').default;
  const server = renderToString(React.createElement(Hours));
  assert.match(server, /Checking hours/);
  document.getElementById('root').innerHTML=server;
  const hydrationErrors=[];
  await act(async () => { mounted=hydrateRoot(document.getElementById('root'),React.createElement(Hours),{onRecoverableError: e => hydrationErrors.push(e)}); });
  assert.equal(hydrationErrors.length,0); assert.doesNotMatch(document.body.textContent,/Checking hours/);
  await clean();

  const Estimator = load('components/lead-capture/financing/MonthlyEstimator.tsx').default;
  document.cookie=`ss_financing_calc=${encodeURIComponent(JSON.stringify({unlocked:true,amount:22000,scores:{serviceFinanceScore:75,ygreneScore:25}}))}; Path=/`;
  assert.doesNotMatch(renderToString(React.createElement(Estimator)),/\$22,000/,'Server ignores browser cookie');
  await mount(Estimator);
  assert.match(document.body.textContent,/22,000/,'Client mount restores persisted calculator amount');
  assert.match(document.body.textContent,/75/,'Reduced-motion scores show their final value');
  await clean(); document.cookie='ss_financing_calc=; Max-Age=0; Path=/';

  const Toc = load('components/global-nav/static-pages/TocFromHeadings.tsx').default;
  dom.reconfigure({url:'https://example.test/article#first-heading'});
  document.body.insertAdjacentHTML('beforeend','<article id="article-root"><h2>First heading</h2><h2 data-toc-exclude>Hidden heading</h2></article>');
  mounted=createRoot(document.getElementById('root'));
  await act(async () => mounted.render(React.createElement(Toc,{mobile:true})));
  assert.ok(document.querySelector('#article-root h2').id);
  assert.equal(document.querySelectorAll('#root a').length,1);
  assert.equal(document.querySelector('#root a[aria-current]')?.getAttribute('href'),'#first-heading','Client-mounted mobile TOC respects existing hash');
  await act(async () => { document.getElementById('article-root').insertAdjacentHTML('beforeend','<h2>Added heading</h2>'); });
  assert.equal(document.querySelectorAll('#root a').length,2,'DOM heading subscription updates');
  await act(async()=>{window.location.hash='#added-heading'; window.dispatchEvent(new Event('hashchange'));});
  assert.equal(document.querySelector('#root a[aria-current]')?.getAttribute('href'),'#added-heading','Hash navigation updates active heading');
  dom.reconfigure({url:'https://example.test/'});
  await clean();

  const Lightbox = load('components/dynamic-content/blog/BlogPostInlineImageLightbox.tsx').default;
  document.body.insertAdjacentHTML('beforeend','<article id="article-root"><img src="https://example.test/fixture.png" alt="Synthetic roof"></article>');
  mounted=createRoot(document.getElementById('root'));
  await act(async () => mounted.render(React.createElement(Lightbox)));
  await click(document.querySelector('[data-blog-inline-lightbox-trigger]'));
  assert.ok(document.querySelector('[role="dialog"]'));
  pathname='/next-post';
  await act(async () => mounted.render(React.createElement(Lightbox)));
  assert.equal(document.querySelector('[role="dialog"]'),null,'Route change closes prior image');
  await clean();

  const { NavMenu } = load('components/global-nav/header/NavMenu.tsx');
  await mount(NavMenu, { navigation: [
    { label: 'Roofing Services', children: [{ label: 'Roof Repair', href: '/roof-repair' }] },
    { label: 'About', href: '/about-sonshine-roofing' },
  ] });
  const desktop = document.querySelector('ul');
  const menuTrigger = desktop.querySelector('button');
  const menuItem = menuTrigger.closest('li');
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'false');
  await act(async () => menuTrigger.focus());
  await click(menuTrigger);
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'true', 'Button activation opens desktop submenu');
  const submenuLink = desktop.querySelector('a[href="/roof-repair"]');
  await act(async () => submenuLink.focus());
  await act(async () => {
    menuItem.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    await new Promise(resolve => setTimeout(resolve, 150));
  });
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'true', 'Mouse leave preserves a keyboard-focused submenu');
  await act(async () => submenuLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'false', 'Escape closes desktop submenu');
  assert.equal(document.activeElement, menuTrigger, 'Escape restores the heading button focus');
  await act(async () => menuTrigger.blur());
  await act(async () => menuItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })));
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'true', 'Hover opening remains supported');
  await click(menuTrigger);
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'true', 'Click after hover keeps the menu open');
  await act(async () => menuTrigger.focus());
  await act(async () => desktop.querySelector('a[href="/about-sonshine-roofing"]').focus());
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'false', 'Leaving the menu item closes its submenu');

  const hoverMenu = async () => act(async () => menuItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })));
  const leaveMenu = async () => act(async () => {
    menuItem.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    await new Promise(resolve => setTimeout(resolve, 160));
  });
  const pointerClick = async (node) => act(async () => {
    node.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
    node.focus();
    // The real router handles navigation; this component fixture supplies its pathname below.
    node.addEventListener('click', event => event.preventDefault(), { once: true });
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
  });
  await hoverMenu();
  await pointerClick(menuTrigger);
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'true', 'Pointer click keeps the hovered heading open');
  await leaveMenu();
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'false', 'Pointer-focused heading must not latch the dropdown after hover ends');

  await hoverMenu();
  await pointerClick(menuTrigger);
  await act(async () => menuTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
  await act(async () => desktop.querySelector('a[href="/roof-repair"]').focus());
  await leaveMenu();
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'true', 'Switching from mouse to keyboard preserves focused links');
  await pointerClick(desktop.querySelector('a[href="/roof-repair"]'));
  await leaveMenu();
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'false', 'Pointer link activation and mouse exit dismiss the dropdown');

  await hoverMenu();
  await pointerClick(desktop.querySelector('a[href="/roof-repair"]'));
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'false', 'Same-page link activation closes without needing a pathname change');

  await hoverMenu();
  await act(async () => {
    menuItem.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    await new Promise(resolve => setTimeout(resolve, 40));
    menuItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
    await new Promise(resolve => setTimeout(resolve, 160));
  });
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'true', 'Re-entering during the close delay cancels dismissal');

  await pointerClick(menuTrigger);
  await act(async () => {
    menuItem.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
    menuTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    desktop.querySelector('a[href="/roof-repair"]').focus();
    await new Promise(resolve => setTimeout(resolve, 160));
  });
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'true', 'Keyboard navigation cancels a pending pointer-close timer');
  await act(async () => desktop.querySelector('a[href="/about-sonshine-roofing"]').focus());
  await hoverMenu();
  await leaveMenu();
  assert.equal(menuTrigger.getAttribute('aria-expanded'), 'false', 'Keyboard focus in another nav item does not hold a hovered dropdown open');
  await hoverMenu();

  const navigation = [
    { label: 'Roofing Services', children: [{ label: 'Roof Replacement', href: '/roof-replacement-sarasota-fl' }] },
    { label: 'Our Work', children: [{ label: 'Project Gallery', href: '/project' }] },
  ];
  pathname = '/roof-replacement-sarasota-fl';
  await act(async () => mounted.render(React.createElement(NavMenu, { navigation })));
  const routeMenu = document.querySelector('ul');
  const routeTrigger = routeMenu.querySelector('button');
  assert.equal(routeTrigger.getAttribute('aria-expanded'), 'false', 'Client navigation clears the previous desktop menu');
  await pointerClick(routeTrigger);
  pathname = '/project';
  await act(async () => mounted.render(React.createElement(NavMenu, { navigation })));
  assert.equal(document.querySelector('ul button').getAttribute('aria-expanded'), 'false', 'A second route change also clears menu state');
  pathname = '/roof-replacement-sarasota-fl';
  await act(async () => mounted.render(React.createElement(NavMenu, { navigation })));
  assert.equal(document.querySelector('ul button').getAttribute('aria-expanded'), 'false', 'Back navigation starts with a closed menu');
  await clean();

  const ReviewsCatcher = load('components/reviews-catcher/ReviewsCatcher.tsx').default;
  await mount(ReviewsCatcher);
  const reviewLink = [...document.querySelectorAll('a')].find(node => node.textContent.includes('Review Us On Google'));
  assert.ok(reviewLink);
  assert.equal(reviewLink.closest('button'), null, 'Review CTA is one link, without an inert outer button');
  assert.ok(reviewLink.classList.contains('px-6'), 'The link owns the full styled button padding');
  assert.equal(reviewLink.getAttribute('target'), '_blank');
  await clean();
  console.log('Analytics gates/queue, React hydration/clock, restored calculator, reduced motion, DOM headings, route-scoped lightbox, desktop menu and review CTA checks passed.');
} finally { await clean(); dom.window.close(); }
