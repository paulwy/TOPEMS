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
    expect(iamModuleConfig.permission).toBe('iam:read');
    expect(iamModuleConfig.order).toBe(1);
  });

  it('should have all required routes', () => {
    const routes = iamModuleConfig.routes;
    expect(routes.length).toBe(5);

    const routePaths = routes.map((r) => r.path);
    expect(routePaths).toContain('/iam/dashboard');
    expect(routePaths).toContain('/iam/user');
    expect(routePaths).toContain('/iam/role');
    expect(routePaths).toContain('/iam/permission');
    expect(routePaths).toContain('/iam/company-structure');
  });

  it('should have correct permissions for each route', () => {
    const routes = iamModuleConfig.routes;

    const dashboardRoute = routes.find((r) => r.path === '/iam/dashboard');
    expect(dashboardRoute?.requiredPermissions).toEqual(['iam:read']);

    const userRoute = routes.find((r) => r.path === '/iam/user');
    expect(userRoute?.requiredPermissions).toEqual(['iam:user:read']);

    const roleRoute = routes.find((r) => r.path === '/iam/role');
    expect(roleRoute?.requiredPermissions).toEqual(['iam:role:read']);

    const permissionRoute = routes.find((r) => r.path === '/iam/permission');
    expect(permissionRoute?.requiredPermissions).toEqual(['iam:permission:read']);

    const companyStructureRoute = routes.find((r) => r.path === '/iam/company-structure');
    expect(companyStructureRoute?.requiredPermissions).toEqual(['iam:structure:read']);
  });

  it('should be registered in core module routes', () => {
    const modules = coreModuleRoutes;
    const iamModule = modules.find((m) => m.code === 'iam');
    expect(iamModule).toBeDefined();
    expect(iamModule?.code).toBe('iam');
  });
});

describe('Admin Module Route Configuration', () => {
  it('should have correct module configuration', () => {
    expect(adminModuleConfig.code).toBe('admin');
    expect(adminModuleConfig.name).toBe('系统管理');
    expect(adminModuleConfig.path).toBe('/admin');
    expect(adminModuleConfig.permission).toBe('admin:read');
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
