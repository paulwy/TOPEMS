import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { navigationRegistryV2 } from '@/lib/navigation/NavigationRegistryV2';
import { coreModuleNavConfigs } from '@/lib/navigation/modules';
import { useAppStore } from '@/store';

vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockUseAppStore = useAppStore as vi.Mock;

describe('Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppStore.mockReturnValue({
      user: {
        roles: ['admin'],
        permissions: ['iam:read', 'workflow:read', 'hrm:read', 'document:read', 'notification:read'],
      },
    });
    coreModuleNavConfigs.forEach(config => {
      navigationRegistryV2.registerModule(config);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register all core modules', () => {
    const modules = navigationRegistryV2.getAllModules();
    expect(modules.length).toBeGreaterThan(0);
    expect(modules.some(m => m.code === 'iam')).toBe(true);
    expect(modules.some(m => m.code === 'workflow')).toBe(true);
    expect(modules.some(m => m.code === 'notification')).toBe(true);
    expect(modules.some(m => m.code === 'document')).toBe(true);
    expect(modules.some(m => m.code === 'hrm')).toBe(true);
    expect(modules.some(m => m.code === 'finance')).toBe(true);
    expect(modules.some(m => m.code === 'crm')).toBe(true);
    expect(modules.some(m => m.code === 'mes')).toBe(true);
    expect(modules.some(m => m.code === 'qms')).toBe(true);
    expect(modules.some(m => m.code === 'scm')).toBe(true);
    expect(modules.some(m => m.code === 'erp')).toBe(true);
    expect(modules.some(m => m.code === 'wms')).toBe(true);
    expect(modules.some(m => m.code === 'pm')).toBe(true);
  });

  it('should get nav items for a specific module', () => {
    const erpNavItems = navigationRegistryV2.getSidebarNavItems('erp');
    expect(erpNavItems.length).toBeGreaterThan(0);
    expect(erpNavItems.some(item => item.code === 'erp-dashboard')).toBe(true);
  });

  it('should get CRM nav items', () => {
    const crmNavItems = navigationRegistryV2.getSidebarNavItems('crm');
    expect(crmNavItems.length).toBeGreaterThan(0);
    expect(crmNavItems.some(item => item.code === 'crm-dashboard')).toBe(true);
    expect(crmNavItems.some(item => item.code === 'crm-customers')).toBe(true);
    expect(crmNavItems.some(item => item.code === 'crm-opportunities')).toBe(true);
  });

  it('should get Document nav items', () => {
    const documentNavItems = navigationRegistryV2.getSidebarNavItems('document');
    expect(documentNavItems.length).toBeGreaterThan(0);
    expect(documentNavItems.some(item => item.code === 'document-dashboard')).toBe(true);
    expect(documentNavItems.some(item => item.code === 'document-list')).toBe(true);
    expect(documentNavItems.some(item => item.code === 'document-knowledge-base')).toBe(true);
  });

  it('should get Notification nav items', () => {
    const notificationNavItems = navigationRegistryV2.getSidebarNavItems('notification');
    expect(notificationNavItems.length).toBeGreaterThan(0);
    expect(notificationNavItems.some(item => item.code === 'notification-dashboard')).toBe(true);
    expect(notificationNavItems.some(item => item.code === 'notification-list')).toBe(true);
  });

  it('should filter nav items by permission', () => {
    const filtered = navigationRegistryV2.getSidebarNavItems('erp', (perm) => perm === 'erp:read');
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('should get module by code', () => {
    const pmModule = navigationRegistryV2.getModule('pm');
    expect(pmModule).not.toBeNull();
    expect(pmModule?.code).toBe('pm');
    expect(pmModule?.name).toBe('项目管理');
  });

  it('should return undefined for non-existent module', () => {
    const nonExistent = navigationRegistryV2.getModule('nonexistent');
    expect(nonExistent).toBeUndefined();
  });

  it('should find module by path', () => {
    const module = navigationRegistryV2.findModuleByPath('/erp/dashboard');
    expect(module?.code).toBe('erp');
  });

  it('should find Document module by path', () => {
    const module = navigationRegistryV2.findModuleByPath('/document/list');
    expect(module?.code).toBe('document');
  });

  it('should get top nav items', () => {
    const items = navigationRegistryV2.getTopNavItems();
    expect(items.length).toBeGreaterThan(0);
  });
});