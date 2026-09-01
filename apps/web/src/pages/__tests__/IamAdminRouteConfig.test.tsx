import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { iamModuleConfig } from '@/modules/iam/config';
import { adminModuleConfig } from '@/modules/admin/config';
import { coreModuleRoutes } from '@/routes/v2';

describe('IAM Module Route Configuration', () => {
  it('should have correct module configuration', () => {
    expect(iamModuleConfig.code).toBe('iam');
    expect(iamModuleConfig.name).toBe('身份与权限');
    expect(iamModuleConfig.path).toBe('/iam');
    expect(iamModuleConfig.permission).toBe('iam:dashboard:read');
    expect(iamModuleConfig.order).toBe(1);
  });
});

describe('Admin Module Route Configuration', () => {
  it('should have correct module configuration', () => {
    expect(adminModuleConfig.code).toBe('admin');
    expect(adminModuleConfig.name).toBe('系统管理');
    expect(adminModuleConfig.path).toBe('/admin');
    expect(adminModuleConfig.permission).toBe('admin:dashboard:read');
    expect(adminModuleConfig.order).toBe(2);
  });

  it('should have all required routes', () => {
    const routes = adminModuleConfig.routes;
    expect(routes.length).toBeGreaterThan(10);

    const routePaths = routes.map((r) => r.path);
    expect(routePaths).toContain('/admin/dashboard');
    expect(routePaths).toContain('/admin/tenant');
    expect(routePaths).toContain('/admin/dictionary');
    expect(routePaths).toContain('/admin/system');
    expect(routePaths).toContain('/admin/audit-log');
    expect(routePaths).toContain('/admin/monitor');
  });

  it('should NOT have IAM-specific routes', () => {
    const routes = adminModuleConfig.routes;
    const routePaths = routes.map((r) => r.path);

    expect(routePaths).not.toContain('/admin/user');
    expect(routePaths).not.toContain('/admin/role');
    expect(routePaths).not.toContain('/admin/permission');
    expect(routePaths).not.toContain('/admin/company-structure');
  });

  it('should be registered in core module routes', () => {
    const modules = coreModuleRoutes;
    const adminModule = modules.find((m) => m.code === 'admin');
    expect(adminModule).toBeDefined();
    expect(adminModule?.code).toBe('admin');
  });
});

describe('IAM and Admin Module Separation', () => {
  it('should have unique route paths between IAM and Admin', () => {
    const iamRoutes = iamModuleConfig.routes.map((r) => r.path);
    const adminRoutes = adminModuleConfig.routes.map((r) => r.path);

    const commonRoutes = iamRoutes.filter((route) => adminRoutes.includes(route));
    expect(commonRoutes).toHaveLength(0);
  });

  it('should have IAM module before Admin in core routes', () => {
    const modules = coreModuleRoutes;
    const iamIndex = modules.findIndex((m) => m.code === 'iam');
    const adminIndex = modules.findIndex((m) => m.code === 'admin');

    expect(iamIndex).toBeLessThan(adminIndex);
  });
});
