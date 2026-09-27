export function normalizePageParams<T extends Record<string, unknown>>(
  params: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key =
      k === "pageSize" || k === "page_size" || k === "pagesize"
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

export function normalizeObjectKeysDeep<T extends Record<string, unknown>>(
  obj: T,
  depth: number = 3
): Record<string, unknown> {
  if (depth <= 0 || obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj as Record<string, unknown>;
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) {
      continue;
    }
    const key =
      k === "pageSize" || k === "page_size" || k === "pagesize"
        ? 'page_size'
        : k === 'sortBy'
          ? 'sort_by'
          : k === 'sortOrder'
            ? 'sort_order'
            : k;
    if (typeof v === 'object' && !Array.isArray(v)) {
      result[key] = normalizeObjectKeysDeep(v as Record<string, unknown>, depth - 1);
    } else {
      result[key] = v;
    }
  }
  return result;
}

export default normalizePageParams;
