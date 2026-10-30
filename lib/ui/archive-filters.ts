export type ArchiveFilterGroup = {
  key: string;
  label: string;
  paramKey: string;
  options: Array<{ slug: string; label: string; parentSlug?: string }>;
  /** Restrict options to the selected parent, without changing request timing. */
  dependsOn?: { key: string; disabledPlaceholder: string };
  helpText?: string;
  enabledWhen?: {
    key: string;
    values: string[];
    disabledPlaceholder?: string;
    /** Infer a missing parent in saved links; preserve explicit conflicts for repair. */
    savedParentValue?: string;
  };
};

export type ArchiveFilters = {
  search: string;
  selections: Record<string, string>;
};

export function isArchiveFilterEnabled(
  group: ArchiveFilterGroup,
  filters: ArchiveFilters,
): boolean {
  return (
    (!group.dependsOn || Boolean(filters.selections[group.dependsOn.key])) &&
    (!group.enabledWhen ||
      group.enabledWhen.values.includes(filters.selections[group.enabledWhen.key] ?? ''))
  );
}

export function archiveFilterView(
  group: ArchiveFilterGroup,
  filters: ArchiveFilters,
  groups: ArchiveFilterGroup[],
) {
  const enabled = isArchiveFilterEnabled(group, filters);
  const parentKey = group.dependsOn?.key;
  const parent = parentKey
    ? groups.find((candidate) => candidate.key === parentKey)?.options.find(
        (option) => option.slug === filters.selections[parentKey],
      )
    : undefined;
  const label = parent ? `${parent.label} ${group.label.toLowerCase()}` : group.label;
  const options = group.dependsOn
    ? group.options.filter((option) => option.parentSlug === parent?.slug)
    : group.options;
  const selected = group.options.find((option) => option.slug === filters.selections[group.key]);
  const conflict = Boolean(group.dependsOn && parent && selected && selected.parentSlug !== parent.slug);
  return {
    enabled, label, options, selected, conflict,
    placeholder: !enabled && (group.dependsOn?.disabledPlaceholder || group.enabledWhen?.disabledPlaceholder)
      ? (group.dependsOn?.disabledPlaceholder ?? group.enabledWhen?.disabledPlaceholder)
      : `All ${label === 'Category' ? 'categories' : `${label.toLowerCase()}s`}`,
  };
}

export function changeArchiveSelection(
  filters: ArchiveFilters,
  groups: ArchiveFilterGroup[],
  key: string,
  value: string,
  minSearchLength = 2,
): ArchiveFilters {
  const selections = { ...filters.selections, [key]: value };
  if (filters.selections[key] !== value) {
    for (const group of groups) {
      if (group.dependsOn?.key === key) selections[group.key] = '';
    }
  }
  return { ...normalizeArchiveFilters({ ...filters, selections }, groups, minSearchLength), search: filters.search };
}

export function normalizeArchiveFilters(
  filters: ArchiveFilters,
  groups: ArchiveFilterGroup[],
  minSearchLength = 2,
  preserveSavedConditions = false,
): ArchiveFilters {
  const search = filters.search.trim();
  const normalized: ArchiveFilters = {
    search: search.length >= minSearchLength ? search : '',
    selections: {},
  };
  for (const group of groups) {
    const value = (filters.selections[group.key] ?? '').trim().toLowerCase();
    normalized.selections[group.key] =
      group.options.find((option) => option.slug.toLowerCase() === value)?.slug ?? '';
  }
  for (const group of groups) {
    if (!isArchiveFilterEnabled(group, normalized) && !(preserveSavedConditions && group.enabledWhen?.savedParentValue)) {
      normalized.selections[group.key] = '';
    }
  }
  return normalized;
}

export function readArchiveFilters(
  params: URLSearchParams,
  groups: ArchiveFilterGroup[],
  minSearchLength = 2,
  searchParamKey = 'q',
): { filters: ArchiveFilters; adjustedLegacyLink: boolean; inferredParent: boolean } {
  const selections: Record<string, string> = {};
  let adjustedLegacyLink = false;
  for (const group of groups) {
    const values = params
      .getAll(group.paramKey)
      .flatMap((value) => value.split(','))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (new Set(values).size > 1) adjustedLegacyLink = true;
    selections[group.key] =
      values.find((value) => group.options.some((option) => option.slug.toLowerCase() === value)) ??
      '';
  }
  // Resolve saved links before normalization disables dependent fields.
  let inferredParent = false;
  for (const group of groups) {
    const parentKey = group.dependsOn?.key ?? group.enabledWhen?.key;
    if (!parentKey || selections[parentKey] || !selections[group.key]) continue;
    const parentSlug = group.dependsOn
      ? group.options.find((option) => option.slug === selections[group.key])?.parentSlug
      : group.enabledWhen?.savedParentValue;
    const parent = groups.find((candidate) => candidate.key === parentKey);
    if (parentSlug && parent?.options.some((option) => option.slug === parentSlug)) {
      selections[parent.key] = parentSlug;
      inferredParent = true;
    }
  }
  return {
    filters: normalizeArchiveFilters(
      { search: params.get(searchParamKey) ?? '', selections },
      groups,
      minSearchLength,
      true,
    ),
    adjustedLegacyLink,
    inferredParent,
  };
}

/** Only saved, explicitly incompatible conditions can reach this state. */
export function archiveConditionConflicts(filters: ArchiveFilters, groups: ArchiveFilterGroup[]) {
  return groups.filter((group) => group.enabledWhen?.savedParentValue &&
    filters.selections[group.key] && !isArchiveFilterEnabled(group, filters));
}

// Keep unrelated query parameters (including shared-video links) intact.
export function writeArchiveFilters(
  params: URLSearchParams,
  filters: ArchiveFilters,
  groups: ArchiveFilterGroup[],
  searchParamKey = 'q',
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(searchParamKey);
  for (const group of groups) next.delete(group.paramKey);
  if (filters.search) next.set(searchParamKey, filters.search);
  for (const group of groups) {
    const value = filters.selections[group.key];
    if (value) next.set(group.paramKey, value);
  }
  return next;
}

export function archiveLocationKey(
  params: URLSearchParams,
  groups: ArchiveFilterGroup[],
  searchParamKey = 'q',
): string {
  return JSON.stringify([
    params.getAll(searchParamKey),
    ...groups.map((group) => params.getAll(group.paramKey)),
  ]);
}

export function archivePayloadInput(filters: ArchiveFilters): {
  search: string;
  selections: Record<string, string[]>;
} {
  return {
    search: filters.search,
    selections: Object.fromEntries(
      Object.entries(filters.selections).map(([key, value]) => [key, value ? [value] : []]),
    ),
  };
}
