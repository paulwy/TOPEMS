import { describe, it, expect } from 'vitest';
import {
  buildApiPath,
  buildLegacyApiPath,
  buildV1Path,
  createServiceApi,
  normalizeApiPath,
  API_VERSION,
  LEGACY_V1,
  GROUP1_CORE_SERVICES,
  GROUP2_INDEPENDENT_SERVICES,
  SERVICE_CODES,
  API_PATHS,
} from '../apiPath';

describe('apiPath utils (V9.0 路由统一契约版)', () => {
  describe('分类正确性：Group1 / Group2 服务集合', () => {
    it('Group1 包含 iam/workflow/file/mail/im/notification/master/migration/comm/core/help（K8s /api/core/* 转发）', () => {
      ['iam', 'workflow', 'flow', 'file', 'mail', 'im', 'notification', 'master', 'migration', 'comm', 'communication', 'core', 'help'].forEach(
        (svc) => expect(GROUP1_CORE_SERVICES.has(svc)).toBe(true),
      );
    });
    it('Group2 包含 erp/hrm/pm/mes/pdm/scm/wms/srm/qms/lims/ehs/rd/bi/report/monitor/portal/mobile/gis/integration/finance/doc/ai（独立 K8s deployment）', () => {
      ['erp', 'finance', 'doc', 'ai', 'hrm', 'pm', 'crm', 'mes', 'pdm', 'scm', 'wms', 'srm', 'qms', 'lims', 'ehs', 'rd', 'rs', 'bi', 'analytics', 'report', 'monitor', 'portal', 'mobile', 'gis', 'integration'].forEach(
        (svc) => expect(GROUP2_INDEPENDENT_SERVICES.has(svc)).toBe(true),
      );
    });
    it('Group1 与 Group2 集合无交集', () => {
      GROUP1_CORE_SERVICES.forEach((svc) => expect(GROUP2_INDEPENDENT_SERVICES.has(svc)).toBe(false));
    });
  });

  describe('buildApiPath', () => {
    it('Group1 服务 (iam) 默认不插入版本，前缀 /api/core/{svc}', () => {
      const result = buildApiPath({ service: 'iam', path: '/auth/login' });
      expect(result).toBe('/api/core/iam/auth/login');
    });
    it('Group2 服务 (hrm) 默认不插入版本，前缀 /api/{svc}', () => {
      const result = buildApiPath({ service: 'hrm', path: '/employees' });
      expect(result).toBe('/api/hrm/employees');
    });
    it('add leading slash if missing', () => {
      expect(buildApiPath({ service: 'wms', path: 'inventory' })).toBe('/api/wms/inventory');
      expect(buildApiPath({ service: 'file', path: 'upload' })).toBe('/api/core/file/upload');
    });
    it('显式传入 LEGACY_V1 时仍能构造旧路径（过渡期兼容）', () => {
      expect(buildApiPath({ service: 'mes', version: LEGACY_V1, path: '/orders' })).toBe('/api/mes/v1/orders');
      expect(buildApiPath({ service: 'iam', version: LEGACY_V1, path: '/users' })).toBe('/api/core/iam/v1/users');
    });
    it('workflow/file/mail/im/notification/master/migration/comm/help 全属于 Group1（/api/core 前缀）', () => {
      expect(buildApiPath({ service: 'workflow', path: '/definitions' })).toBe('/api/core/workflow/definitions');
      expect(buildApiPath({ service: 'file', path: '/upload' })).toBe('/api/core/file/upload');
      expect(buildApiPath({ service: 'mail', path: '/send' })).toBe('/api/core/mail/send');
      expect(buildApiPath({ service: 'im', path: '/messages' })).toBe('/api/core/im/messages');
      expect(buildApiPath({ service: 'notification', path: '/unread' })).toBe('/api/core/notification/unread');
      expect(buildApiPath({ service: 'comm', path: '/push' })).toBe('/api/core/comm/push');
      expect(buildApiPath({ service: 'help', path: '/faqs' })).toBe('/api/core/help/faqs');
    });
    it('handle complex paths', () => {
      expect(buildApiPath({ service: 'crm', path: '/customers/123/orders' })).toBe('/api/crm/customers/123/orders');
      expect(buildApiPath({ service: 'iam', path: '/users/42/roles' })).toBe('/api/core/iam/users/42/roles');
    });
  });

  describe('buildLegacyApiPath', () => {
    it('should build legacy path without version (Group2 semantics)', () => {
      const result = buildLegacyApiPath('hrm', '/employees');
      expect(result).toBe('/api/hrm/employees');
    });
    it('should add leading slash if missing', () => {
      const result = buildLegacyApiPath('wms', 'inventory');
      expect(result).toBe('/api/wms/inventory');
    });
  });

  describe('buildV1Path (DEPRECATED — 仅保留 e2e 过渡)', () => {
    it('仍保持旧语义，返回 /api/v1/*', () => {
      expect(buildV1Path('/auth/login')).toBe('/api/v1/auth/login');
      expect(buildV1Path('auth/login')).toBe('/api/v1/auth/login');
    });
  });

  describe('createServiceApi', () => {
    it('Group2 服务 (hrm) 不插入 /v1', () => {
      const api = createServiceApi('hrm');
      expect(api.list('employees')).toBe('/api/hrm/employees');
      expect(api.get('employees', '123')).toBe('/api/hrm/employees/123');
      expect(api.create('employees')).toBe('/api/hrm/employees');
      expect(api.update('employees', '123')).toBe('/api/hrm/employees/123');
      expect(api.remove('employees', '123')).toBe('/api/hrm/employees/123');
    });
    it('Group1 服务 (iam) 使用 /api/core 前缀，不插 v1', () => {
      const api = createServiceApi('iam');
      expect(api.list('users')).toBe('/api/core/iam/users');
      expect(api.get('users', '9')).toBe('/api/core/iam/users/9');
    });
    it('should create batch path', () => {
      const api = createServiceApi('wms');
      expect(api.batch('inventory', 'delete')).toBe('/api/wms/inventory/batch/delete');
    });
  });

  describe('normalizeApiPath（V9.0：去 /v1 + 修正 Group1/2 前缀）', () => {
    it('新路径无 /v1 保持原样', () => {
      expect(normalizeApiPath('/api/hrm/employees')).toBe('/api/hrm/employees');
      expect(normalizeApiPath('/api/core/iam/auth/login')).toBe('/api/core/iam/auth/login');
    });
    it('去除不必要的 /v1：Group1 /api/core/{svc}/v1/x → /api/core/{svc}/x', () => {
      expect(normalizeApiPath('/api/core/iam/v1/auth/login')).toBe('/api/core/iam/auth/login');
      expect(normalizeApiPath('/api/core/file/v1/upload')).toBe('/api/core/file/upload');
    });
    it('去除不必要的 /v1：Group2 /api/{svc}/v1/x → /api/{svc}/x', () => {
      expect(normalizeApiPath('/api/hrm/v1/employees')).toBe('/api/hrm/employees');
      expect(normalizeApiPath('/api/pm/v1/projects')).toBe('/api/pm/projects');
      expect(normalizeApiPath('/api/erp/v1/vouchers')).toBe('/api/erp/vouchers');
    });
    it('遗留 /api/v1/auth/* → /api/core/iam/auth/*', () => {
      expect(normalizeApiPath('/api/v1/auth/login')).toBe('/api/core/iam/auth/login');
      expect(normalizeApiPath('/api/v1/auth/logout')).toBe('/api/core/iam/auth/logout');
      expect(normalizeApiPath('/api/v1/users')).toBe('/api/core/iam/users');
      expect(normalizeApiPath('/api/v1/roles')).toBe('/api/core/iam/roles');
      expect(normalizeApiPath('/api/v1/permissions')).toBe('/api/core/iam/permissions');
    });
    it('遗留 /api/v1/{hrm-resource}/* → /api/hrm/{hrm-resource}/*', () => {
      expect(normalizeApiPath('/api/v1/employees')).toBe('/api/hrm/employees');
      expect(normalizeApiPath('/api/v1/departments/14')).toBe('/api/hrm/departments/14');
      expect(normalizeApiPath('/api/v1/attendance')).toBe('/api/hrm/attendance');
    });
    it('Group2 错误带 /api/core/ → 去掉 core', () => {
      expect(normalizeApiPath('/api/core/hrm/salary-adjustments')).toBe('/api/hrm/salary-adjustments');
      expect(normalizeApiPath('/api/core/pm/tasks/7')).toBe('/api/pm/tasks/7');
      expect(normalizeApiPath('/api/core/finance/vouchers')).toBe('/api/finance/vouchers');
      expect(normalizeApiPath('/api/core/doc')).toBe('/api/doc');
    });
    it('Group1 带 /api/core/ 的不能被错误地去除 core', () => {
      expect(normalizeApiPath('/api/core/iam/users')).toBe('/api/core/iam/users');
      expect(normalizeApiPath('/api/core/file/upload')).toBe('/api/core/file/upload');
    });
    it('should not modify non-API paths', () => {
      const path = '/some/other/path';
      expect(normalizeApiPath(path)).toBe(path);
    });
    it('unknown service paths（既不在 Group1 也不在 Group2 集合中）保留原样', () => {
      expect(normalizeApiPath('/api/unknown/employees')).toBe('/api/unknown/employees');
    });
  });

  describe('API_PATHS（业务层路径常量）', () => {
    it('auth.* 全走 Group1：/api/core/iam/auth/*，且不再有 /v1', () => {
      expect(API_PATHS.auth.login).toBe('/api/core/iam/auth/login');
      expect(API_PATHS.auth.logout).toBe('/api/core/iam/auth/logout');
      expect(API_PATHS.auth.refresh).toBe('/api/core/iam/auth/refresh');
      expect(API_PATHS.auth.me).toBe('/api/core/iam/auth/me');
      expect(API_PATHS.auth.register).toBe('/api/core/iam/auth/register');
      expect(API_PATHS.auth.resetPassword).toBe('/api/core/iam/auth/reset-password');
    });
    it('iam.* 使用 Group1 前缀', () => {
      expect(API_PATHS.iam.users).toBe('/api/core/iam/users');
      expect(API_PATHS.iam.user('123')).toBe('/api/core/iam/users/123');
    });
    it('hrm.* 使用 Group2 前缀（无 /core）', () => {
      expect(API_PATHS.hrm.employees).toBe('/api/hrm/employees');
      expect(API_PATHS.hrm.employee('123')).toBe('/api/hrm/employees/123');
    });
    it('notification 使用 Group1（/api/core/notification/*）', () => {
      const path = API_PATHS.notification.list(1, 20, 'alert');
      expect(path).toContain('notification_type=alert');
      expect(path).toContain('page=1');
      expect(path).toContain('pagesize=20');
      expect(path.startsWith('/api/core/notification/notifications')).toBe(true);
      expect(API_PATHS.notification.unreadCount).toBe('/api/core/notification/notifications/unread-count');
    });
    it('workflow 使用 Group1 前缀', () => {
      expect(API_PATHS.workflow.definitions).toBe('/api/core/workflow/definitions');
      expect(API_PATHS.workflow.task('T-1').startsWith('/api/core/workflow/')).toBe(true);
    });
    it('pm/wms/erp/scm/qms/mes/ai/file 各自 Group 正确', () => {
      expect(API_PATHS.pm.projects).toBe('/api/pm/projects');
      expect(API_PATHS.wms.inventory).toBe('/api/wms/inventory');
      expect(API_PATHS.erp.salesOrders).toBe('/api/erp/sales-orders');
      expect(API_PATHS.scm.dashboard).toBe('/api/scm/dashboard');
      expect(API_PATHS.qms.spc).toBe('/api/qms/spc');
      expect(API_PATHS.mes.productionOrders).toBe('/api/mes/production-orders');
      expect(API_PATHS.ai.chat).toBe('/api/ai/chat');
      expect(API_PATHS.file.upload).toBe('/api/core/file/upload');
    });
  });

  describe('constants', () => {
    it('API_VERSION 为空字符串（不再默认注入 /v1）', () => {
      expect(API_VERSION).toBe('');
    });
    it('LEGACY_V1 = "v1" 供显式使用', () => {
      expect(LEGACY_V1).toBe('v1');
    });
    it('SERVICE_CODES with all expected services', () => {
      expect(SERVICE_CODES.hrm).toBe('hrm');
      expect(SERVICE_CODES.wms).toBe('wms');
      expect(SERVICE_CODES.mes).toBe('mes');
      expect(SERVICE_CODES.crm).toBe('crm');
      expect(SERVICE_CODES.iam).toBe('iam');
      expect(SERVICE_CODES.workflow).toBe('workflow');
      expect(SERVICE_CODES.monitor).toBe('monitor');
    });
  });
});
