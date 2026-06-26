export function cleanEmptyUuids<T extends Record<string, any>>(data: T): T {
  const result = { ...data };
  if (result.parent_id === '') delete (result as any).parent_id;
  if (result.company_id === '') delete (result as any).company_id;
  if (result.department_id === '') delete (result as any).department_id;
  if (result.responsible_id === '') delete (result as any).responsible_id;
  return result;
}
