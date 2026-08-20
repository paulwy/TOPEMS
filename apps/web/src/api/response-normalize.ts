/**
 * V79 P2-8 / P2-9 Axios 响应归一拦截器（默认关闭，可通过环境变量一键启用）
 *
 * 功能：
 *   - normalizeListField: items/records/list/data[] → 统一到 data 字段
 *   - normalizeTotalField: total_count/count/totalItems/total → 统一到 total 字段
 *
 * 开关：
 *   import.meta.env.V79_NORMALIZE_RESPONSE === 'true' 时启用，默认关闭不影响任何现有调用。
 *
 * Backward compatible: 所有改动默认关闭，零侵入；需要验证时在 .env.local 设 V79_NORMALIZE_RESPONSE=true。
 */

/**
 * 归一化列表字段。
 *
 * Variant 覆盖（P2-8 stub 的 4 种）：
 *   1. { items: [...] }          → { data: [...] }
 *   2. { records: [...] }        → { data: [...] }
 *   3. { list: [...] }           → { data: [...] }
 *   4. { data: { items: [...] } } → data 内层 items 提升
 *
 * 若 resp 已是 { data: [...] } 数组形式，则原样返回（不破坏 canonical 格式）。
 */
export function normalizeListField(resp: Record<string, unknown>): Record<string, unknown> {
  if (!resp || typeof resp !== 'object') return resp;

  const candidates = ['items', 'records', 'list'];
  for (const key of candidates) {
    if (Array.isArray(resp[key])) {
      return { ...resp, data: resp[key] };
    }
  }

  if (resp.data && typeof resp.data === 'object' && !Array.isArray(resp.data)) {
    for (const key of candidates) {
      if (Array.isArray((resp.data as Record<string, unknown>)[key])) {
        return {
          ...resp,
          data: {
            ...resp.data,
            data: (resp.data as Record<string, unknown>)[key],
          },
        };
      }
    }
  }

  return resp;
}

/**
 * 归一化分页总数字段。
 *
 * Variant 覆盖（P2-9 stub 的 4 种）：
 *   1. { total_count: N }     → { total: N }
 *   2. { count: N }           → { total: N }
 *   3. { totalItems: N }      → { total: N }
 *   4. { data: { total_count / count / totalItems: N } } → 内层提升
 *
 * 若 resp 已有 total 字段（number 类型），原样返回。
 */
export function normalizeTotalField(resp: Record<string, unknown>): Record<string, unknown> {
  if (!resp || typeof resp !== 'object') return resp;

  const totalCandidates: Array<[string, boolean]> = [
    ['total_count', true],
    ['count', true],
    ['totalItems', true],
    ['TotalCount', false],
  ];

  if (typeof resp.total !== 'number') {
    for (const [key, prefer] of totalCandidates) {
      const val = (resp as Record<string, unknown>)[key];
      if (typeof val === 'number') {
        return { ...resp, total: val };
      }
      if (prefer && typeof val === 'string' && !Number.isNaN(Number(val))) {
        return { ...resp, total: Number(val) };
      }
    }
  }

  if (resp.data && typeof resp.data === 'object' && !Array.isArray(resp.data)) {
    const inner = resp.data as Record<string, unknown>;
    if (typeof inner.total !== 'number') {
      for (const [key, prefer] of totalCandidates) {
        const val = inner[key];
        if (typeof val === 'number') {
          return {
            ...resp,
            data: { ...inner, total: val },
          };
        }
        if (prefer && typeof val === 'string' && !Number.isNaN(Number(val))) {
          return {
            ...resp,
            data: { ...inner, total: Number(val) },
          };
        }
      }
    }
  }

  return resp;
}

/**
 * 读取开关：显式 'true' 才启用，默认 false。
 *
 * 即使 Vite 没有定义此 env 变量，import.meta.env 访问也是安全的（返回 undefined）。
 */
function shouldNormalize(): boolean {
  try {
    const val = (import.meta as any).env?.V79_NORMALIZE_RESPONSE;
    return val === 'true' || val === true;
  } catch {
    return false;
  }
}

export default {
  normalizeListField,
  normalizeTotalField,
  shouldNormalize,
};
