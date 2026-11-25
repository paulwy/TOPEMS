/**
 * SRM 列表接口返回体解包
 *
 * 后端 SRM 列表接口统一返回 `{ <key>: T[], total, page, page_size }`，
 * 而 `src/api/srm` 的类型标注是 `T[]`，直接当数组用会炸（`slice/map is not a function`）。
 * 这里统一解包：数组原样返回，包体按 key 取，取不到给空数组。
 */
export function unwrapList<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const inner = (data as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}
