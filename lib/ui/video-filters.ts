import type { TermLite } from '@/lib/content/project-types';
import type { ArchiveFilterGroup } from './archive-filters';

export const videoConditionNotice = {
  message: 'This saved search uses project filters. Choose Roofing Projects or clear those filters, then select Search.',
  clearLabel: 'Clear project filters',
};

/** Both project refinements are optional once Roofing Projects is selected. */
export function videoArchiveGroups({
  categories,
  materials,
  serviceAreas,
}: {
  categories: Array<{ slug: string; label: string }>;
  materials: TermLite[];
  serviceAreas: TermLite[];
}): ArchiveFilterGroup[] {
  const projectCondition = {
    key: 'bucket',
    values: ['roofing-project'],
    disabledPlaceholder: 'Roofing Projects first',
    savedParentValue: 'roofing-project',
  };
  return [
    { key: 'bucket', label: 'Category', paramKey: 'bk', options: categories },
    {
      key: 'material', label: 'Material', paramKey: 'mt', enabledWhen: projectCondition,
      options: materials.map((term) => ({ slug: term.slug.toLowerCase(), label: term.name })),
    },
    {
      key: 'area', label: 'Location', paramKey: 'sa', enabledWhen: projectCondition,
      options: serviceAreas
        .map((term) => ({ slug: term.slug.toLowerCase(), label: term.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    },
  ];
}
