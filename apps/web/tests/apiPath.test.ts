import { describe, it, expect } from 'vitest';
import {
  buildApiPath,
  buildUnifiedApiPath,
  createServiceApi,
  GROUP1_CORE_SERVICES,
  GROUP2_INDEPENDENT_SERVICES,
  SERVICE_CODES,
} from '@/utils/apiPath';

describe('utils/apiPath - buildApiPath', () => {
  it('Group1 服务 (iam) 路径应为 /api/core/{svc}/{path}', () => {
    expect(buildApiPath({ service: 'iam', path: '/auth/login' })).toBe('/api/core/iam/auth/login');
  });

  it('Group1 服务 (flow) workfl 别名', () => {
    expect(buildApiPath({ service: 'flow', path: '/definitions' })).toBe('/api/core/flow/definitions');
  });

  it('Group2 服务 (erp) 路径应为 /api/{svc}/{path}', () => {
    expect(buildApiPath({ service: 'erp', path: '/customers' })).toBe('/api/erp/customers');
  });

  it('Group2 服务 (hrm) 无首斜杠 path 会自动补全', () => {
    expect(buildApiPath({ service: 'hrm', path: 'employees' })).toBe('/api/hrm/employees');
  });

  it('buildUnifiedApiPath 等价于 buildApiPath', () => {
    expect(buildUnifiedApiPath('bi', '/dashboards')).toBe(buildApiPath({ service: 'bi', path: '/dashboards' }));
  });

  it('GROUP1_CORE_SERVICES 应包含 iam/flow/file/doc', () => {
    expect(GROUP1_CORE_SERVICES.has('iam')).toBe(true);
    expect(GROUP1_CORE_SERVICES.has('flow')).toBe(true);
    expect(GROUP1_CORE_SERVICES.has('file')).toBe(true);
    expect(GROUP1_CORE_SERVICES.has('doc')).toBe(true);
  });

  it('GROUP2_INDEPENDENT_SERVICES 应包含 erp/hrm/pm', () => {
    expect(GROUP2_INDEPENDENT_SERVICES.has('erp')).toBe(true);
    expect(GROUP2_INDEPENDENT_SERVICES.has('hrm')).toBe(true);
    expect(GROUP2_INDEPENDENT_SERVICES.has('pm')).toBe(true);
  });

  it('SERVICE_CODES 别名应正确映射', () => {
    expect(SERVICE_CODES.workflow).toBe('flow');
    expect(SERVICE_CODES.master).toBe('master-data');
    expect(SERVICE_CODES.iam).toBe('iam');
  });
});

describe('utils/apiPath - createServiceApi', () => {
  it('createServiceApi().list 应返回 /{resource} 路径', () => {
    const svc = createServiceApi('pdm');
    expect(svc.list('projects')).toBe('/api/pdm/projects');
  });

  it('createServiceApi().get 应返回 /{resource}/{id}', () => {
    const svc = createServiceApi('iam');
    expect(svc.get('users', '123')).toBe('/api/core/iam/users/123');
  });

  it('createServiceApi().create 应返回 list 等价路径', () => {
    const svc = createServiceApi('crm');
    expect(svc.create('opportunities')).toBe(svc.list('opportunities'));
  });

  it('createServiceApi().update 与 .remove 等价', () => {
    const svc = createServiceApi('wms');
    expect(svc.update('orders', 'id1')).toBe(svc.remove('orders', 'id1'));
  });

  it('createServiceApi().batch 正确拼接 action', () => {
    const svc = createServiceApi('srm');
    expect(svc.batch('suppliers', 'import')).toBe('/api/srm/suppliers/batch/import');
  });
});
