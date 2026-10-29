import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fetchEditorialSnapshot } from '../lib/content/build/editorial.mjs';
import { editorialFixture, editorialFetcher } from './fixtures/editorial.mjs';
import { makeSiteShellFixture } from './fixtures/location-site-shell.mjs';
import {
  normalizeSiteSettings,
  normalizeServiceSummaries,
} from '../lib/content/directus-site-shell.ts';
import { normalizeLocationSnapshot } from '../lib/content/directus-locations.mjs';
import { mapDirectusProject } from '../lib/content/directus-projects.mjs';
import { STATIC_IMAGE_FILES } from '../lib/content/static-image-files.mjs';

if (process.env.DEPLOYMENT_FIXTURE !== '1')
  throw new Error(
    'Synthetic snapshots require DEPLOYMENT_FIXTURE=1 in an isolated test directory.',
  );
const revision = process.argv[2] || 'A';
const config = {
  url: 'https://cms.example.test',
  clientSlug: 'sonshine-roofing',
  token: 'synthetic',
};
const env = {
  DIRECTUS_URL: config.url,
  DIRECTUS_CLIENT_SLUG: config.clientSlug,
  DIRECTUS_TOKEN: config.token,
};
const raw = editorialFixture(3, revision);
if (revision === 'B') {
  raw.blog_posts[0].slug = 'new-after-build';
  raw.blog_posts[0].scope_key = 'sonshine-roofing:new-after-build';
  raw.blog_posts = raw.blog_posts.filter((row) => row.slug !== 'fixture-post-1');
}
const { editorial } = await fetchEditorialSnapshot(env, editorialFetcher(raw));
const fixture = makeSiteShellFixture(config.clientSlug);
const siteShell = {
  settings: normalizeSiteSettings(fixture.siteSettings[0], config),
  services: normalizeServiceSummaries(fixture.services, config),
};
const client = { slug: config.clientSlug },
  scope = { client, status: 'published' };
const file = {
  id: 'synthetic-roof',
  description: 'Synthetic roof image',
  type: 'image/webp',
  width: 1200,
  height: 800,
};
const term = (slug) => ({ ...scope, id: slug, slug, name: slug });
const project = mapDirectusProject(
  {
    ...scope,
    id: 'project',
    slug: 'fixture-project',
    scope_key: 'sonshine-roofing:fixture-project',
    title: 'Synthetic roof',
    description: 'A synthetic roof replacement.',
    published_at: '2020-01-01T12:00:00Z',
    featured_image: file,
    gallery: [],
    neighborhood: null,
    material_type: term('metal'),
    service_area: term('fixture-city'),
    roof_color: { ...term('fixture-bronze'), material_type: term('metal') },
    product_links: [],
    noindex: true,
  },
  config,
);
const videos = ['sonshine-roofing-best-of-the-best-2023', 'sonshine-roofing-introduction'].map(
  (slug) => ({
    id: slug,
    slug,
    title: 'Synthetic video',
    excerpt: 'Synthetic video description',
    date: '2020-01-01T12:00:00Z',
    youtubeId: 'abcdefghijk',
    thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    legacyIds: [],
    categories: [],
    materialTypes: [],
    serviceAreas: [],
    projectSlug: null,
    uploadDate: null,
  }),
);
const projects = {
  version: 3,
  clientSlug: config.clientSlug,
  projects: [project],
  videos,
  categories: [],
  terms: {
    materials: [{ slug: 'metal', name: 'Metal' }],
    roofColors: [{ slug: 'fixture-bronze', name: 'fixture-bronze', materialTypeSlug: 'metal' }],
    serviceAreas: [{ slug: 'fixture-city', name: 'Fixture city' }],
  },
};
const area = {
  ...scope,
  id: 'fixture-city',
  slug: 'fixture-city',
  name: 'fixture-city',
  scope_key: 'sonshine-roofing:fixture-city',
  page_status: 'published',
  page_title: 'Synthetic roofing location',
  meta_title: 'Synthetic location title',
  meta_description: 'Synthetic location description',
  introduction: 'Synthetic location introduction.',
  overview: null,
  overview_map: null,
  published_at: '2020-01-01T12:00:00Z',
  date_updated: null,

  noindex: true,
  og_image_override: null,
};
const locations = normalizeLocationSnapshot(
  {
    siteShell,
    featuredOffers: [],
    areas: [area],
    neighborhoods: [],
    neighbors: [],
    reviews: [],
    sponsors: [],
    sponsorAreas: [],
    faqs: [],
    faqScopes: [],
    faqUnavailable: [],
    navigation: [],
    coverage: [{ id: 'coverage', client, title: 'Coverage' }],
    coverageAreas: [],
  },
  config,
  projects,
);
const media = {
  version: 1,
  clientSlug: config.clientSlug,
  images: Object.fromEntries(
    Object.keys(STATIC_IMAGE_FILES).map((key) => [
      key,
      {
        url: config.url + '/assets/synthetic',
        description: 'Synthetic image',
        width: 1200,
        height: 800,
        type: 'image/webp',
        focalPoint: null,
      },
    ]),
  ),
};
Object.assign(editorial, {
  redirects: [
    {
      source: '/wp-content/uploads/fixture-relative.jpg',
      destination: revision === 'B' ? '/blog' : '/',
      statusCode: 308,
    },
  ],
  legacyMediaRedirects: [
    {
      sourcePath: '/wp-content/uploads/fixture-direct.jpg',
      destination: `${config.url}/assets/${revision === 'B' ? '22222222' : '11111111'}-1111-1111-1111-111111111111`,
      statusCode: 308,
      wildcard: false,
      preserveQuery: false,
    },
    {
      sourcePath: '/wp-content/uploads/fixture-retired.jpg',
      destination: 'https://legacy.example.test/wp-content/uploads/retired.webp',
      statusCode: 308,
      wildcard: false,
      preserveQuery: true,
    },
    {
      sourcePath: '/wp-content/*',
      destination: 'https://legacy.example.test/wp-content/*',
      statusCode: 308,
      wildcard: true,
      preserveQuery: true,
    },
  ],
  routeOwners: [],
  assetOrigin: config.url,
  buildSettings: {
    contentSecurityPolicy: siteShell.settings.contentSecurityPolicy,
    llmsTxt: 'Synthetic fixture only.\n',
  },
});
await mkdir('.generated', { recursive: true });
for (const [name, value] of Object.entries({
  projects,
  locations,
  'static-media': media,
  editorial,
  'capture-complete': { version: 1 },
}))
  await writeFile(join('.generated', name + '.json'), JSON.stringify(value));
console.log(`Created synthetic deployment ${revision}.`);
