import type { ProjectSnapshot } from '@/lib/content/project-types';
import type { ArchiveFilterGroup } from './archive-filters';

/** The independent location filter precedes the material/color pair. */
export function projectArchiveGroups(terms: ProjectSnapshot['terms']): ArchiveFilterGroup[] {
  return [
    {
      key: 'area',
      label: 'Location',
      paramKey: 'sa',
      options: terms.serviceAreas
        .map((term) => ({ slug: term.slug, label: term.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    },
    {
      key: 'material',
      label: 'Material',
      paramKey: 'mt',
      options: terms.materials.map((term) => ({ slug: term.slug, label: term.name })),
    },
    {
      key: 'roof',
      label: 'Color',
      paramKey: 'rc',
      dependsOn: { key: 'material', disabledPlaceholder: 'Choose a material' },
      options: terms.roofColors
        .map((term) => ({ slug: term.slug, label: term.name, parentSlug: term.materialTypeSlug }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    },
  ];
}
