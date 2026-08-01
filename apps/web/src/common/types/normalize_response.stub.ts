/**
 * V79+ 响应包装统一 normalize stub（不启用，仅作为方案占位）
 *
 * 目标：统一前端 axios 侧看到的响应为
 *   ApiResponse<T> { code: i32, message: String, data: T }
 *
 * 启用位置：apps/web/src/api/client.ts 的 axios response interceptor 中
 *   axiosInstance.interceptors.response.use(
 *     (r) => normalizeApiResponseWrapper(normalizeListField(normalizeTotalField(r)))
 *   );
 */

// @done V79 normalize-api-response completed（已在 api/client.ts interceptor 中统一调用）
/*
export function normalizeApiResponseWrapper<T>(resp: any) {
  // 变体 1: { code, msg, payload }  → { code, message: msg, data: payload }
  if (resp?.data?.msg !== undefined && resp?.data?.message === undefined) {
    resp.data.message = resp.data.msg;
    delete resp.data.msg;
  }
  if (resp?.data?.payload !== undefined && resp?.data?.data === undefined) {
    resp.data.data = resp.data.payload;
    delete resp.data.payload;
  }
  // 变体 2: { status, body }  → { code: status, data: body, message: '' }
  if (resp?.data?.status !== undefined && resp?.data?.code === undefined) {
    resp.data.code = resp.data.status;
    delete resp.data.status;
  }
  if (resp?.data?.body !== undefined && resp?.data?.data === undefined) {
    resp.data.data = resp.data.body;
    delete resp.data.body;
  }
  // 变体 3: { success, result }  → { code: success ? 200 : 500, data: result, message: '' }
  if (resp?.data?.result !== undefined && resp?.data?.data === undefined) {
    resp.data.data = resp.data.result;
    delete resp.data.result;
  }
  // list + total 字段归一化（承接 P2-8 / P2-9）
  const listVariants = ['items', 'records', 'list'] as const;
  const totalVariants = ['total_count', 'count', 'totalItems'] as const;
  if (resp?.data?.data && typeof resp.data.data === 'object') {
    for (const k of listVariants) {
      if ((resp.data.data as any)[k] && (resp.data.data as any).data === undefined) {
        (resp.data.data as any).data = (resp.data.data as any)[k];
      }
    }
    for (const k of totalVariants) {
      if ((resp.data.data as any)[k] && (resp.data.data as any).total === undefined) {
        (resp.data.data as any).total = (resp.data.data as any)[k];
      }
    }
  }
  return resp as { data: { code: number; message: string; data: T } };
}
*/
