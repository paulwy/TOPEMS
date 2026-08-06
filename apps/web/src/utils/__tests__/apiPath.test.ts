import { describe, it, expect } from 'vitest';
import {
  buildApiPath,
  createServiceApi,
  API_VERSION,
  GROUP1_CORE_SERVICES,
  GROUP2_INDEPENDENT_SERVICES,
  SERVICE_CODES,
  API_PATHS,
} from '../apiPath';

// V64: /api/v1/ 前缀已废弃，统一使用 /api/（无版本前缀）
// 本测试已同步更新以匹配 apiPath.ts 的实际行为

describe('apiPath utils (V64 无版本前缀统一契约版)', () => {
  describe('分类正确性：Group1 / Group2 服务集合', () => {
    it('Group1 包含 iam/workflow/file/master/migration/core/help/doc/monitor/automation/plugin/tenant（K8s /api/core/* 转发到 unified-core:8000）', () => {
      [
        'iam',
        'workflow',
        'flow',
        'file',
        'master',
        'migration',
        'core',
        'help',
        'doc',
        'monitor',
        // V64: unified-core 承载的虚拟模块
        'automation',
        'plugin',
        'tenant',
      ].forEach((svc) => expect(GROUP1_CORE_SERVICES.has(svc)).toBe(true));
    });
    it('Group2 包含 erp/hrm/pm/mes/pdm/scm/wms/srm/qms/lims/ehs/rd/bi/analytics/portal/mobile/gis/integration/finance/ai/lowcode/oa/asset/master-data/search/communication/billing/ticket/feedback/mail/im/notification/comm（独立 K8s deployment）', () => {
      [
        'erp',
        'finance',
        'ai',
        'hrm',
        'pm',
        'crm',
        'mes',
        'pdm',
        'scm',
        'wms',
        'srm',
        'qms',
        'lims',
        'ehs',
        'rd',
        'bi',
        'analytics',
        'portal',
        'mobile',
        'gis',
        'integration',
        'lowcode',
        'oa',
        'asset',
        // 主数据（独立进程 8090）
        'master-data',
        // V66 扩展外迁服务（8082/8084-8088）
        'search',
        'communication',
        'billing',
        'ticket',
        'feedback',
        // communication 子模块（仍归 Group2）
        'mail',
        'im',
        'notification',
        'comm',
      ].forEach((svc) => expect(GROUP2_INDEPENDENT_SERVICES.has(svc)).toBe(true));
    });
    it('Group1 与 Group2 集合无交集', () => {
      GROUP1_CORE_SERVICES.forEach((svc) =>
        expect(GROUP2_INDEPENDENT_SERVICES.has(svc)).toBe(false)
      );
    });
  });

  describe('buildApiPath', () => {
    it('Group1 服务 (iam) 使用 /api/core/{svc} 前缀（无版本）', () => {
      const result = buildApiPath({ service: 'iam', path: '/auth/login' });
      expect(result).toBe('/api/core/iam/auth/login');
    });
    it('Group2 服务 (hrm) 使用 /api/{svc} 前缀（无版本）', () => {
      const result = buildApiPath({ service: 'hrm', path: '/employees' });
      expect(result).toBe('/api/hrm/employees');
    });
    it('add leading slash if missing', () => {
      expect(buildApiPath({ service: 'wms', path: 'inventory' })).toBe('/api/wms/inventory');
      expect(buildApiPath({ service: 'file', path: 'upload' })).toBe('/api/core/file/upload');
    });
    it('workflow/file/master/migration/help/doc 全属于 Group1（/api/core 前缀）；mail/im/notification/comm 外迁到 Group2（/api 前缀，无 core）', () => {
      expect(buildApiPath({ service: 'workflow', path: '/definitions' })).toBe(
        '/api/core/workflow/definitions'
      );
      expect(buildApiPath({ service: 'file', path: '/upload' })).toBe('/api/core/file/upload');
      // V66.1: mail/im/notification/comm 已外迁到 communication 独立服务（Group2，端口 8084）
      expect(buildApiPath({ service: 'mail', path: '/send' })).toBe('/api/mail/send');
      expect(buildApiPath({ service: 'im', path: '/messages' })).toBe('/api/im/messages');
      expect(buildApiPath({ service: 'notification', path: '/unread' })).toBe(
        '/api/notification/unread'
      );
      expect(buildApiPath({ service: 'comm', path: '/push' })).toBe('/api/comm/push');
      expect(buildApiPath({ service: 'help', path: '/faqs' })).toBe('/api/core/help/faqs');
      expect(buildApiPath({ service: 'doc', path: '/documents' })).toBe('/api/core/doc/documents');
    });
    it('handle complex paths', () => {
      expect(buildApiPath({ service: 'crm', path: '/customers/123/orders' })).toBe(
        '/api/crm/customers/123/orders'
      );
      expect(buildApiPath({ service: 'iam', path: '/users/42/roles' })).toBe(
        '/api/core/iam/users/42/roles'
      );
    });
  });

  describe('createServiceApi', () => {
    it('Group2 服务 (hrm) 使用 /api 前缀（无版本）', () => {
      const api = createServiceApi('hrm');
      expect(api.list('employees')).toBe('/api/hrm/employees');
      expect(api.get('employees', '123')).toBe('/api/hrm/employees/123');
      expect(api.create('employees')).toBe('/api/hrm/employees');
      expect(api.update('employees', '123')).toBe('/api/hrm/employees/123');
      expect(api.remove('employees', '123')).toBe('/api/hrm/employees/123');
    });
    it('Group1 服务 (iam) 使用 /api/core 前缀（无版本）', () => {
      const api = createServiceApi('iam');
      expect(api.list('users')).toBe('/api/core/iam/users');
      expect(api.get('users', '9')).toBe('/api/core/iam/users/9');
    });
    it('should create batch path', () => {
      const api = createServiceApi('wms');
      expect(api.batch('inventory', 'delete')).toBe('/api/wms/inventory/batch/delete');
    });
  });

  describe('API_PATHS（业务层路径常量）', () => {
    it('auth.* 全走 Group1：/api/core/iam/auth/*', () => {
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
    it('notification 使用 Group2（V66.1 已外迁到 communication 独立服务：/api/notification/*）', () => {
      const path = API_PATHS.notification.list(1, 20, 'alert');
      expect(path).toContain('notification_type=alert');
      expect(path).toContain('page=1');
      expect(path).toContain('pagesize=20');
      expect(path.startsWith('/api/notification/notifications')).toBe(true);
      expect(API_PATHS.notification.unreadCount).toBe(
        '/api/notification/notifications/unread-count'
      );
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
    it('API_VERSION 为空字符串（V64: 已移除版本前缀）', () => {
      expect(API_VERSION).toBe('');
    });
    it('SERVICE_CODES with all expected services', () => {
      expect(SERVICE_CODES.hrm).toBe('hrm');
      expect(SERVICE_CODES.wms).toBe('wms');
      expect(SERVICE_CODES.mes).toBe('mes');
      expect(SERVICE_CODES.crm).toBe('crm');
      expect(SERVICE_CODES.iam).toBe('iam');
      expect(SERVICE_CODES.workflow).toBe('workflow');
      expect(SERVICE_CODES.monitor).toBe('monitor');
      expect(SERVICE_CODES.lowcode).toBe('lowcode');
      expect(SERVICE_CODES.oa).toBe('oa');
      // V64: 新增模块
      expect(SERVICE_CODES.automation).toBe('automation');
      expect(SERVICE_CODES.ticket).toBe('ticket');
      expect(SERVICE_CODES.plugin).toBe('plugin');
      expect(SERVICE_CODES.billing).toBe('billing');
      expect(SERVICE_CODES.tenant).toBe('tenant');
      expect(SERVICE_CODES.asset).toBe('asset');
    });
  });
});
