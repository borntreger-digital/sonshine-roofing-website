// Contract v3. Definitions contain no source records or private identifiers.
export const MODEL_VERSION = 'location-model-v7';
const NEIGHBORHOOD_DESCRIPTION_LIMIT = 220;
const field = (name, type, options = {}) => ({ field: name, type,
  schema: type === 'alias' ? null : { is_nullable: true, ...options.schema },
  meta: { interface: 'input', ...options.meta } });
const string = (name, required = false) => field(name, 'string', { schema: { is_nullable: !required }, meta: { required } });
const id = () => field('id', 'uuid', { schema: { is_primary_key: true, is_nullable: false }, meta: { special: ['uuid'], hidden: true, readonly: true } });
const relation = (name, required = false) => field(name, 'uuid', { schema: { is_nullable: !required }, meta: { special: ['m2o'], interface: 'select-dropdown-m2o', required } });
const status = (name = 'status', choices = ['draft', 'published', 'archived'], defaultValue = 'draft') => field(name, 'string', {
  schema: { is_nullable: false, default_value: defaultValue }, meta: { required: true, interface: 'select-dropdown', options: { choices: choices.map(value => ({ text: value, value })) } } });
const prose = (name, html = false) => field(name, 'text', { meta: { interface: html ? 'input-rich-text-html' : 'input-multiline', note: html ? 'Restricted semantic HTML; frontend sanitizes before rendering.' : 'Plain text. Describe verified coverage without implying undocumented work.' } });
const media = (name, note = 'Coverage overview only, without customer-home pins. File description is required.') => field(name, 'uuid', { meta: { special: ['file'], interface: 'file-image', note } });
const timestamp = name => field(name, 'timestamp', { meta: { interface: 'datetime' } });
const sort = () => field('sort', 'integer', { schema: { default_value: 0, is_nullable: false } });
const alias = name => field(name, 'alias', { meta: { special: ['m2m'], interface: 'list-m2m' } });
const system = () => [
  field('date_created', 'timestamp', { meta: { special: ['date-created'], interface: 'datetime', readonly: true } }),
  field('date_updated', 'timestamp', { meta: { special: ['date-updated'], interface: 'datetime', readonly: true } }),
];
export const locationSchema = {
  roofing_service_areas: [
    status('page_status', ['taxonomy_only', 'draft', 'published'], 'taxonomy_only'),
    string('page_title'), prose('introduction'), prose('overview', true), media('overview_map'), timestamp('published_at'),
    field('seo', 'alias', { meta: { special: ['alias', 'no-data', 'group'], interface: 'group-detail', options: { headerIcon: 'search', start: 'closed' } } }),
    ...[
      field('noindex', 'boolean', { schema: { default_value: false, is_nullable: false }, meta: { interface: 'boolean', required: true } }),
      string('meta_title'), prose('meta_description'), string('primary_focus_keyword'),
      field('focus_keywords', 'json', { meta: { special: ['cast-json'], interface: 'tags' } }),
      string('og_title'), prose('og_description'), media('og_image_override'),
    ].map(item => ({ ...item, meta: { ...item.meta, group: 'seo' } })),
  ],
  roofing_neighborhoods: [id(), relation('client', true), status(), string('name', true), string('slug', true), relation('service_area', true),
    field('description', 'text', { meta: {
      interface: 'input-multiline', options: { softLength: NEIGHBORHOOD_DESCRIPTION_LIMIT },
      note: `Plain text. Describe verified coverage without implying undocumented work. Use no more than ${NEIGHBORHOOD_DESCRIPTION_LIMIT} characters.`,
      validation: { _or: [
        { description: { _null: true } },
        // A true end-of-input assertion also counts a trailing line break.
        { description: { _regex: `^[\\s\\S]{0,${NEIGHBORHOOD_DESCRIPTION_LIMIT}}(?![\\s\\S])` } },
      ] },
      validation_message: `Use no more than ${NEIGHBORHOOD_DESCRIPTION_LIMIT} characters.`,
    } }), prose('landmarks'),
    media('image', 'Optional neighborhood photo with a verified file description. A photo is not a coverage map and must not imply undocumented completed work.'),
    media('coverage_map'), sort(), ...system()],
  roofing_projects: [
    field('job_id', 'string', { meta: { hidden: true, note: 'Private AccuLynx reference. UUID case is canonicalized; one job per project within the client. Denied to public and website-reader policies. Optional until documented SonShine enrichment succeeds.' } }),
    field('zip', 'string', { meta: { note: 'Verified job ZIP. Optional until documented SonShine enrichment succeeds. Never infer a neighborhood from ZIP alone.' } }),
    relation('neighborhood'),
  ],
  reviews: [relation('service_area')],
  sponsor_features: [alias('service_areas')],
  sponsor_service_areas: [id(), relation('sponsor', true), relation('service_area', true), ...system()],
  roofing_service_area_neighbors: [id(), relation('service_area', true), relation('nearby_area', true),
    field('approved', 'boolean', { schema: { default_value: false, is_nullable: false }, meta: { interface: 'boolean', note: 'Owner-approved direct backfill only. Draft recommendations remain false.' } }), sort(), ...system()],
  service_area_sections: [alias('areas')],
  service_area_section_areas: [id(), relation('section', true), relation('service_area', true), sort(), ...system()],
  faqs: [relation('service_area')],
  navigation_items: [relation('service_area')],
};
const edge = (collection, name, target, meta = {}, onDelete = 'RESTRICT') => ({ collection, field: name, related_collection: target, schema: { on_delete: onDelete, on_update: 'NO ACTION' }, meta });
export const locationRelations = [
  edge('roofing_service_areas', 'overview_map', 'directus_files', {}, 'SET NULL'),
  edge('roofing_service_areas', 'og_image_override', 'directus_files', {}, 'SET NULL'),
  edge('roofing_neighborhoods', 'client', 'clients'), edge('roofing_neighborhoods', 'service_area', 'roofing_service_areas'),
  edge('roofing_neighborhoods', 'image', 'directus_files', {}, 'SET NULL'),
  edge('roofing_neighborhoods', 'coverage_map', 'directus_files', {}, 'SET NULL'),
  edge('roofing_projects', 'neighborhood', 'roofing_neighborhoods'), edge('reviews', 'service_area', 'roofing_service_areas'),
  edge('sponsor_service_areas', 'sponsor', 'sponsor_features', { one_field: 'service_areas', junction_field: 'service_area', one_deselect_action: 'delete' }),
  edge('sponsor_service_areas', 'service_area', 'roofing_service_areas', { junction_field: 'sponsor' }),
  edge('roofing_service_area_neighbors', 'service_area', 'roofing_service_areas'),
  edge('roofing_service_area_neighbors', 'nearby_area', 'roofing_service_areas'),
  edge('service_area_section_areas', 'section', 'service_area_sections', { one_field: 'areas', junction_field: 'service_area', sort_field: 'sort', one_deselect_action: 'delete' }),
  edge('service_area_section_areas', 'service_area', 'roofing_service_areas', { junction_field: 'section' }),
  edge('faqs', 'service_area', 'roofing_service_areas'), edge('navigation_items', 'service_area', 'roofing_service_areas'),
];
export const publicProjectFields = [
  'id', 'sort', 'date_created', 'date_updated', 'client', 'status', 'title', 'slug', 'published_at', 'modified_at',
  'description', 'featured_image', 'product_links', 'material_type', 'roof_color', 'service_area',
  'client_testimonial_name', 'client_testimonial_date', 'client_testimonial', 'review_source', 'review_url',
  'scope_key', 'noindex', 'meta_title', 'meta_description', 'primary_focus_keyword', 'focus_keywords',
  'og_title', 'og_description', 'og_image_override', 'gallery', 'neighborhood',
];
export const publicLocationFields = {
  roofing_projects: publicProjectFields,
  roofing_service_areas: ['id', 'sort', 'client', 'status', 'name', 'slug', 'scope_key', 'page_status', 'page_title', 'introduction', 'overview', 'overview_map', 'published_at', 'date_updated', 'noindex', 'meta_title', 'meta_description', 'primary_focus_keyword', 'focus_keywords', 'og_title', 'og_description', 'og_image_override'],
  roofing_neighborhoods: ['id', 'client', 'status', 'name', 'slug', 'service_area', 'description', 'landmarks', 'image', 'coverage_map', 'sort', 'date_updated'],
  reviews: ['id', 'client', 'author_name', 'rating', 'review_text', 'owner_reply', 'review_date', 'source', 'sort_order', 'url', 'status', 'external_id', 'source_created_at', 'source_updated_at', 'service_area'],
  sponsor_features: ['id', 'sort', 'client', 'status', 'title', 'slug', 'logo', 'description', 'website_url', 'facebook_url', 'instagram_url', 'service_area_slugs', 'service_areas', 'published_at', 'date_updated'],
  sponsor_service_areas: ['id', 'sponsor', 'service_area'],
  roofing_service_area_neighbors: ['id', 'service_area', 'nearby_area', 'approved', 'sort'],
  service_area_sections: ['id', 'client', 'title', 'service_areas', 'areas', 'eyebrow', 'subtitle', 'highlight_text', 'path_overrides'],
  service_area_section_areas: ['id', 'section', 'service_area', 'sort'],
  faqs: ['id', 'client', 'question', 'answer', 'sort_order', 'status', 'website_page', 'service', 'service_area'],
  navigation_items: ['id', 'menu', 'parent', 'label', 'link_type', 'page', 'service', 'service_area', 'url', 'anchor', 'icon', 'sort', 'status', 'open_in_new_tab', 'description'],
};
