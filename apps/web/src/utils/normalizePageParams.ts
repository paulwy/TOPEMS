export function normalizePageParams<T extends Record<string, unknown>>(
  params: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key =
      k === 'pageSize' || k === 'pagesize'
        ? 'page_size'
        : k === 'sortBy'
          ? 'sort_by'
          : k === 'sortOrder'
            ? 'sort_order'
            : k;
    result[key] = v;
  }
  return result;
}

export default normalizePageParams;
