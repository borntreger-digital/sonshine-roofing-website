// Directus editor metadata; database invariants are in invariants.sql.
export const materialField = {
  field: 'material_type', type: 'uuid', schema: { is_nullable: true },
  meta: {
    special: ['m2o'], interface: 'select-dropdown-m2o',
    options: { template: '{{name}}', filter: { _and: [
      { client: { _eq: '{{client}}' } }, { status: { _eq: 'published' } },
    ] } },
    display: 'related-values', display_options: { template: '{{name}}' },
    sort: 11, width: 'half', required: false,
    conditions: [{ name: 'Published colors require a material',
      rule: { status: { _eq: 'published' } }, required: true }],
  },
};
export const materialRelation = {
  collection: 'roofing_roof_colors', field: 'material_type',
  related_collection: 'roofing_material_types', meta: { one_deselect_action: 'nullify' },
  schema: { on_delete: 'RESTRICT', on_update: 'RESTRICT' },
};
export const projectColorOptions = {
  template: '{{name}}', filter: { _and: [
    { client: { _eq: '{{client}}' } },
    { status: { _eq: 'published' } },
    { material_type: { _eq: '{{material_type}}' } },
  ] },
};
export const projectColorCondition = {
  name: 'Choose material before color',
  rule: { material_type: { _null: true } }, readonly: true,
};
