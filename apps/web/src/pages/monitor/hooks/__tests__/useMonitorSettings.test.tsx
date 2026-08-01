import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMonitorSettings } from '../useMonitorSettings';

const storeMock = vi.hoisted(() => ({ addNotification: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({ addNotification: storeMock.addNotification })
      : { addNotification: storeMock.addNotification }
  ),
}));

vi.mock('lucide-react', () => ({
  Settings: () => null,
  AlertTriangle: () => null,
  Bell: () => null,
  Database: () => null,
  Shield: () => null,
  Plug: () => null,
}));

describe('useMonitorSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMock.addNotification.mockClear();
  });

  it('should render and return default general settings', () => {
    const { result } = renderHook(() => useMonitorSettings());
    expect(result.current).toBeDefined();
    expect(result.current.generalSettings.monitoringEnabled).toBe(true);
    expect(result.current.generalSettings.dataRetentionDays).toBe(30);
    expect(result.current.generalSettings.sampleRate).toBe(100);
    expect(result.current.generalSettings.heartbeatInterval).toBe(60);
  });

  it('should return default alert and notification settings', () => {
    const { result } = renderHook(() => useMonitorSettings());
    expect(result.current.alertSettings.defaultAlertStrategy).toBe('threshold');
    expect(result.current.alertSettings.enableAutoRecover).toBe(true);
    expect(result.current.alertSettings.escalationEnabled).toBe(true);
    expect(result.current.notificationSettings.emailEnabled).toBe(true);
    expect(result.current.notificationSettings.defaultTemplate).toBe('standard');
  });

  it('should return default datasource, permission and integration settings', () => {
    const { result } = renderHook(() => useMonitorSettings());
    expect(result.current.datasourceSettings.primaryDatasource).toBe('prometheus');
    expect(result.current.datasourceSettings.enableSsl).toBe(true);
    expect(result.current.permissionSettings.enableRoleBased).toBe(true);
    expect(result.current.permissionSettings.monitorAdminRole).toBe('monitor_admin');
    expect(result.current.integrationSettings.prometheusEnabled).toBe(true);
    expect(result.current.integrationSettings.grafanaUrl).toBe('http://localhost:3000');
  });

  it('should return 6 settings tabs', () => {
    const { result } = renderHook(() => useMonitorSettings());
    expect(Array.isArray(result.current.tabs)).toBe(true);
    expect(result.current.tabs).toHaveLength(6);
    expect(result.current.tabs.map((tab) => tab.id)).toEqual([
      'general',
      'alert',
      'notification',
      'datasource',
      'permission',
      'integration',
    ]);
  });

  it('each tab should contain sections and fields', () => {
    const { result } = renderHook(() => useMonitorSettings());
    for (const tab of result.current.tabs) {
      expect(Array.isArray(tab.sections)).toBe(true);
      expect(tab.sections.length).toBeGreaterThan(0);
      for (const section of tab.sections) {
        expect(Array.isArray(section.fields)).toBe(true);
        expect(section.fields.length).toBeGreaterThan(0);
      }
    }
  });

  it('setGeneralSettings should update general settings directly', () => {
    const { result } = renderHook(() => useMonitorSettings());
    act(() => {
      result.current.setGeneralSettings((prev) => ({ ...prev, dataRetentionDays: 60 }));
    });
    expect(result.current.generalSettings.dataRetentionDays).toBe(60);
  });

  it('handleSave should update corresponding settings by prefix and notify', async () => {
    const { result } = renderHook(() => useMonitorSettings());
    expect(result.current.generalSettings.monitoringEnabled).toBe(true);
    await act(async () => {
      await result.current.handleSave({
        general_monitoringEnabled: false,
        alert_escalationLevels: 5,
        notification_smsEnabled: true,
        datasource_batchSize: 200,
        permission_allowExportData: false,
        integration_apiRateLimit: 2000,
      });
    });
    expect(result.current.generalSettings.monitoringEnabled).toBe(false);
    expect(result.current.alertSettings.escalationLevels).toBe(5);
    expect(result.current.notificationSettings.smsEnabled).toBe(true);
    expect(result.current.datasourceSettings.batchSize).toBe(200);
    expect(result.current.permissionSettings.allowExportData).toBe(false);
    expect(result.current.integrationSettings.apiRateLimit).toBe(2000);
    expect(storeMock.addNotification).toHaveBeenCalled();
  });

  it('handleSave should not affect known settings when handling unknown prefix', async () => {
    const { result } = renderHook(() => useMonitorSettings());
    const before = result.current.generalSettings;
    await act(async () => {
      await result.current.handleSave({ unknown_field: 'x' } as any);
    });
    expect(result.current.generalSettings).toEqual(before);
    expect(storeMock.addNotification).toHaveBeenCalled();
  });

  it('should expose all setter functions', () => {
    const { result } = renderHook(() => useMonitorSettings());
    expect(typeof result.current.setGeneralSettings).toBe('function');
    expect(typeof result.current.setAlertSettings).toBe('function');
    expect(typeof result.current.setNotificationSettings).toBe('function');
    expect(typeof result.current.setDatasourceSettings).toBe('function');
    expect(typeof result.current.setPermissionSettings).toBe('function');
    expect(typeof result.current.setIntegrationSettings).toBe('function');
    expect(typeof result.current.handleSave).toBe('function');
  });
});
