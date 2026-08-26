interface HasOptionalUuids {
  parentId?: string;
  company_id?: string;
  department_id?: string;
  responsible_id?: string;
}

export function cleanEmptyUuids<T extends Record<string, unknown> & HasOptionalUuids>(data: T): T {
  const result = { ...data };
  if (result.parentId === '') delete result.parentId;
  if (result.company_id === '') delete result.company_id;
  if (result.department_id === '') delete result.department_id;
  if (result.responsible_id === '') delete result.responsible_id;
  return result;
}
