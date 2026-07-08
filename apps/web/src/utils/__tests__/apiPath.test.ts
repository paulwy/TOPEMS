import { describe, it, expect } from 'vitest';
import {
  buildApiPath,
  buildLegacyApiPath,
  buildV1Path,
  createServiceApi,
  normalizeApiPath,
  API_VERSION,
  SERVICE_CODES,
  API_PATHS,
} from '../apiPath';

describe('apiPath utils', () => {
  describe('buildApiPath', () => {
    it('should build versioned API path', () => {
      const result = buildApiPath({ service: 'hrm', path: '/employees' });
      expect(result).toBe('/api/hrm/v1/employees');
    });

    it('should add leading slash if missing', () => {
      const result = buildApiPath({ service: 'wms', path: 'inventory' });
      expect(result).toBe('/api/wms/v1/inventory');
    });

    it('should use custom version', () => {
      const result = buildApiPath({ service: 'mes', version: 'v2', path: '/orders' });
      expect(result).toBe('/api/mes/v2/orders');
    });

    it('should handle complex paths', () => {
      const result = buildApiPath({ service: 'crm', path: '/customers/123/orders' });
      expect(result).toBe('/api/crm/v1/customers/123/orders');
    });
  });

  describe('buildLegacyApiPath', () => {
    it('should build legacy path without version', () => {
      const result = buildLegacyApiPath('hrm', '/employees');
      expect(result).toBe('/api/hrm/employees');
    });

    it('should add leading slash if missing', () => {
      const result = buildLegacyApiPath('wms', 'inventory');
      expect(result).toBe('/api/wms/inventory');
    });
  });

  describe('buildV1Path', () => {
    it('should build v1 path', () => {
      const result = buildV1Path('/auth/login');
      expect(result).toBe('/api/v1/auth/login');
    });

    it('should add leading slash if missing', () => {
      const result = buildV1Path('auth/login');
      expect(result).toBe('/api/v1/auth/login');
    });
  });

  describe('createServiceApi', () => {
    it('should create service API helpers', () => {
      const api = createServiceApi('hrm');
      expect(api.list('employees')).toBe('/api/hrm/v1/employees');
      expect(api.get('employees', '123')).toBe('/api/hrm/v1/employees/123');
      expect(api.create('employees')).toBe('/api/hrm/v1/employees');
      expect(api.update('employees', '123')).toBe('/api/hrm/v1/employees/123');
      expect(api.remove('employees', '123')).toBe('/api/hrm/v1/employees/123');
    });

    it('should create batch path', () => {
      const api = createServiceApi('wms');
      expect(api.batch('inventory', 'delete')).toBe('/api/wms/v1/inventory/batch/delete');
    });
  });

  describe('normalizeApiPath', () => {
    it('should keep versioned paths as-is', () => {
      const path = '/api/hrm/v1/employees';
      expect(normalizeApiPath(path)).toBe(path);
    });

    it('should add version to legacy paths', () => {
      const result = normalizeApiPath('/api/hrm/employees');
      expect(result).toBe('/api/hrm/v1/employees');
    });

    it('should not modify unknown service paths', () => {
      const result = normalizeApiPath('/api/unknown/employees');
      expect(result).toBe('/api/unknown/employees');
    });

    it('should not modify non-API paths', () => {
      const path = '/some/other/path';
      expect(normalizeApiPath(path)).toBe(path);
    });
  });

  describe('API_PATHS', () => {
    it('should have auth paths', () => {
      expect(API_PATHS.auth.login).toBe('/api/v1/auth/login');
      expect(API_PATHS.auth.logout).toBe('/api/v1/auth/logout');
    });

    it('should have hrm paths with functions', () => {
      expect(API_PATHS.hrm.employees).toBe('/api/hrm/employees');
      expect(API_PATHS.hrm.employee('123')).toBe('/api/hrm/employees/123');
    });

    it('should have notification paths with query params', () => {
      const path = API_PATHS.notification.list(1, 20);
      expect(path).toContain('page=1');
      expect(path).toContain('pagesize=20');
    });

    it('should have notification paths with type filter', () => {
      const path = API_PATHS.notification.list(1, 20, 'alert');
      expect(path).toContain('notification_type=alert');
    });
  });

  describe('constants', () => {
    it('should have API_VERSION', () => {
      expect(API_VERSION).toBe('v1');
    });

    it('should have SERVICE_CODES with all services', () => {
      expect(SERVICE_CODES.hrm).toBe('hrm');
      expect(SERVICE_CODES.wms).toBe('wms');
      expect(SERVICE_CODES.mes).toBe('mes');
      expect(SERVICE_CODES.crm).toBe('crm');
    });
  });
});
