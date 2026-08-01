export function normalizePageParams<T extends Record<string, any>>(params: T): Record<string, any> {
  const result: Record<string, any> = {};
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

export function normalizeObjectKeysDeep<T extends Record<string, any>>(
  obj: T,
  depth: number = 3
): Record<string, any> {
  if (depth <= 0 || obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj as any;
  }
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) {
      continue;
    }
    const key =
      k === 'pageSize' || k === 'pagesize'
        ? 'page_size'
        : k === 'sortBy'
          ? 'sort_by'
          : k === 'sortOrder'
            ? 'sort_order'
            : k;
    if (typeof v === 'object' && !Array.isArray(v)) {
      result[key] = normalizeObjectKeysDeep(v as Record<string, any>, depth - 1);
    } else {
      result[key] = v;
    }
  }
  return result;
}

export default normalizePageParams;
