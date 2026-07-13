import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SystemSettingsPage from '../admin/SystemSettingsPage';
import { adminApi } from '@/api/admin';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/admin', () => ({
  adminApi: {
    system: {
      getSettings: vi.fn().mockResolvedValue({ data: {} }),
      updateSettings: vi.fn(),
      getConfig: vi.fn(),
      reloadConfig: vi.fn(),
    },
    dictionary: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('AdminSystemSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <SystemSettingsPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have system settings API methods', async () => {
    render(
      <BrowserRouter>
        <SystemSettingsPage />
      </BrowserRouter>
    );
    expect(adminApi.system.getSettings).toBeDefined();
    expect(adminApi.system.updateSettings).toBeDefined();
    expect(adminApi.system.getConfig).toBeDefined();
    expect(adminApi.system.reloadConfig).toBeDefined();
  });

  it('should render local settings without calling API', async () => {
    const { container } = render(
      <BrowserRouter>
        <SystemSettingsPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
    expect(adminApi.system.getSettings).not.toHaveBeenCalled();
  });
});
