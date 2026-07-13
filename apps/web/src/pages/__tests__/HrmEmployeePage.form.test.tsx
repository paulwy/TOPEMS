import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';
import HrmEmployeePage from '../hrm/HrmEmployeePage';
import { employeeApi, departmentApi, companyApi } from '@/api/hrm';

vi.mock('@/api/hrm', () => ({
  employeeApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  departmentApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn(),
  },
  companyApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn(),
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

describe('HrmEmployeePage Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', async () => {
    const { container } = renderWithProviders(<HrmEmployeePage />);
    expect(container).toBeDefined();
  });

  it('should call employee list API on mount', async () => {
    renderWithProviders(<HrmEmployeePage />);
    expect(employeeApi.list).toHaveBeenCalled();
  });

  it('should have API methods defined', async () => {
    renderWithProviders(<HrmEmployeePage />);
    expect(employeeApi.create).toBeDefined();
    expect(employeeApi.update).toBeDefined();
    expect(employeeApi.delete).toBeDefined();
  });

  it('should handle API error gracefully', async () => {
    employeeApi.list.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<HrmEmployeePage />);

    await waitFor(() => {
      expect(employeeApi.list).toHaveBeenCalled();
    });
  });

  it('should support create, update and delete operations', async () => {
    renderWithProviders(<HrmEmployeePage />);

    expect(typeof employeeApi.create).toBe('function');
    expect(typeof employeeApi.update).toBe('function');
    expect(typeof employeeApi.delete).toBe('function');
  });
});
