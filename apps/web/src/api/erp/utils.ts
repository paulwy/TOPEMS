export function cleanEmptyUuids<T extends Record<string, any>>(data: T): T {
  const result = { ...data };
  if (result.parent_id === '') delete (result as any).parent_id;
  if (result.company_id === '') delete (result as any).company_id;
  if (result.department_id === '') delete (result as any).department_id;
  if (result.responsible_id === '') delete (result as any).responsible_id;
  return result;
}

export function createMockSuccessResponse<T>(data: T, code = 200, message = '操作成功') {
  return {
    success: true,
    data,
    message,
    code,
    timestamp: new Date().toISOString(),
  };
}

export function createMockErrorResponse(message: string, code = 400) {
  return {
    success: false,
    data: undefined,
    message,
    code,
    timestamp: new Date().toISOString(),
  };
}
