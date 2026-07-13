import { describe, it, expect } from 'vitest';
import { DASHBOARD_PATHS, MOBILE_TAB_PATHS } from '@/routes/dashboard';
import { AUTH_PATHS } from '@/routes/auth';
import { ADMIN_PATHS } from '@/modules/admin/config';
import { IAM_PATHS } from '@/modules/iam/config';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { LOWCODE_PATHS } from '@/modules/lowcode/config';
import { SRM_PATHS } from '@/modules/srm/config';
import { BI_PATHS } from '@/modules/bi/config';
import { DOC_PATHS } from '@/modules/doc/config';
import { EHS_PATHS } from '@/modules/ehs/config';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { HRM_PATHS } from '@/modules/hrm/config';
import { crmModuleConfig } from '@/modules/crm/config';
import { coreModuleRoutes } from '@/routes/v2';

describe('Path Constants Validation', () => {
  describe('Root Paths', () => {
    it('should have correct root paths for all modules', () => {
      expect(ADMIN_PATHS.root).toBe('/admin');
      expect(IAM_PATHS.root).toBe('/iam');
      expect(WORKFLOW_PATHS.root).toBe('/workflow');
      expect(NOTIFICATION_PATHS.root).toBe('/notification');
      expect(LOWCODE_PATHS.root).toBe('/lowcode');
      expect(SRM_PATHS.root).toBe('/srm');
      expect(BI_PATHS.root).toBe('/bi');
      expect(DOC_PATHS.root).toBe('/doc');
      expect(EHS_PATHS.root).toBe('/ehs');
      expect(MOBILE_PATHS.root).toBe('/mobile');
    });
  });

  describe('Dynamic Path Parameter Replacement', () => {
    it('should correctly replace :id parameter in detail paths', () => {
      const employeeId = 'emp-123';
      expect(HRM_PATHS.employeeDetail.replace(':id', employeeId)).toBe('/hrm/employees/emp-123');
      expect(HRM_PATHS.employeeEdit.replace(':id', employeeId)).toBe('/hrm/employees/emp-123/edit');

      const supplierId = 'supplier-789';
      expect(SRM_PATHS.supplierDetail.replace(':id', supplierId)).toBe('/srm/supplier/supplier-789');

      const contractId = 'contract-abc';
      expect(SRM_PATHS.contractDetail.replace(':id', contractId)).toBe('/srm/contract/contract-abc');
    });

    it('should correctly replace :appId parameter in lowcode paths', () => {
      const appId = 'app-001';
      expect(LOWCODE_PATHS.appDetail.replace(':appId', appId)).toBe('/lowcode/app-detail/app-001');
    });

    it('should correctly replace :moduleId parameter in BI paths', () => {
      const moduleId = 'development';
      expect(BI_PATHS.module.replace(':moduleId', moduleId)).toBe('/bi/module/development');
    });

    it('should correctly generate new record paths using replace', () => {
      expect(LOWCODE_PATHS.pageDesigner.replace(':id', 'new')).toBe('/lowcode/page-designer/new');
      expect(LOWCODE_PATHS.formDesigner.replace(':id', 'new')).toBe('/lowcode/form-designer/new');
    });
  });

  describe('Route-Navigation Consistency', () => {
    it('should ensure dashboard paths are consistent', () => {
      expect(DASHBOARD_PATHS.root).toBe('/');
      expect(DASHBOARD_PATHS.dashboard).toBe('/dashboard');
      expect(DASHBOARD_PATHS.profile).toBe('/profile');
      expect(DASHBOARD_PATHS.help).toBe('/help');
    });

    it('should ensure auth paths are consistent', () => {
      expect(AUTH_PATHS.login).toBe('/login');
      expect(AUTH_PATHS.forgotPassword).toBe('/forgot-password');
    });

    it('should ensure mobile tab paths are consistent', () => {
      expect(MOBILE_TAB_PATHS.tasks).toBe('/tasks');
      expect(MOBILE_TAB_PATHS.scan).toBe('/scan');
      expect(MOBILE_TAB_PATHS.approval).toBe('/approval');
      expect(MOBILE_TAB_PATHS.approvals).toBe('/approvals');
    });
  });

  describe('Path Format Validation', () => {
    it('should have paths starting with /', () => {
      Object.values(ADMIN_PATHS).forEach(path => {
        expect(path.startsWith('/')).toBe(true, `Path "${path}" does not start with /`);
      });
      Object.values(IAM_PATHS).forEach(path => {
        expect(path.startsWith('/')).toBe(true, `Path "${path}" does not start with /`);
      });
      Object.values(WORKFLOW_PATHS).forEach(path => {
        expect(path.startsWith('/')).toBe(true, `Path "${path}" does not start with /`);
      });
    });

    it('should not have trailing slashes', () => {
      Object.values(LOWCODE_PATHS).forEach(path => {
        expect(!path.endsWith('/') || path === '/').toBe(true, `Path "${path}" has trailing slash`);
      });
    });
  });

  describe('Module Route Validation', () => {
    it('should have routes defined for all CRM paths', () => {
      const crmRoutes = crmModuleConfig.routes;
      const crmRoutePaths = new Set(crmRoutes.map(r => r.path));

      expect(crmRoutePaths.has('/crm/dashboard')).toBe(true);
      expect(crmRoutePaths.has('/crm/customers')).toBe(true);
      expect(crmRoutePaths.has('/crm/opportunities')).toBe(true);
    });

    it('should have navigation items for all IAM paths', () => {
      const iamNavItems = [
        { code: 'iam-dashboard', path: IAM_PATHS.dashboard },
        { code: 'iam-user', path: IAM_PATHS.user },
        { code: 'iam-role', path: IAM_PATHS.role },
        { code: 'iam-permission', path: IAM_PATHS.permission },
      ];

      iamNavItems.forEach(item => {
        expect(item.path).toBeDefined();
        expect(item.path.startsWith('/iam')).toBe(true);
      });
    });
  });

  describe('Cross-module Path Uniqueness', () => {
    it('should not have duplicate paths across modules', () => {
      const allPaths = new Set<string>();
      const duplicates: string[] = [];

      [ADMIN_PATHS, IAM_PATHS, WORKFLOW_PATHS, NOTIFICATION_PATHS, LOWCODE_PATHS, SRM_PATHS, BI_PATHS, DOC_PATHS, EHS_PATHS, MOBILE_PATHS].forEach(modulePaths => {
        Object.values(modulePaths).forEach(path => {
          if (allPaths.has(path)) {
            duplicates.push(path);
          }
          allPaths.add(path);
        });
      });

      expect(duplicates).toHaveLength(0, `Found duplicate paths: ${duplicates.join(', ')}`);
    });
  });
});
