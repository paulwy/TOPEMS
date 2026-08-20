import i18n from '@/i18n';

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

function createMockSuccessResponse<T>(
  data: T,
  code = 200,
  message = i18n.t('shared.utils.k0')
) {
  return {
    success: true,
    data,
    message,
    code,
    timestamp: new Date().toISOString(),
  };
}

function createMockErrorResponse(message: string, code = 400) {
  return {
    success: false,
    data: undefined,
    message,
    code,
    timestamp: new Date().toISOString(),
  };
}
