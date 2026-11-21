import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import { VehicleManagementPage } from '../VehicleManagementPage';

vi.mock('@/api/erp/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/erp/core')>();
  return {
    ...actual,
    vehicleApi: {
      list: vi.fn().mockResolvedValue({
        success: true,
        code: 0,
        message: '',
        data: {
          items: [
            {
              id: 'V001',
              plate_number: '冀A12345',
              brand: '丰田',
              model: '凯美瑞',
              status: 'available',
              driver: '张三',
              created_at: '2026-09-01T00:00:00Z',
              updated_at: '2026-09-01T00:00:00Z',
            },
          ],
          total: 1,
        },
      }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      remove: vi.fn(),
    },
  };
});

vi.mock('react-i18next', () => {
  const keys: Record<string, string> = {
    'oa.vehicle_management_page.k0': '车辆管理',
    'oa.vehicle_management_page.k1': 'ID',
    'oa.vehicle_management_page.k2': '车牌号',
    'oa.vehicle_management_page.k3': '品牌',
    'oa.vehicle_management_page.k4': '型号',
    'oa.vehicle_management_page.k5': '状态',
    'oa.vehicle_management_page.k6': '驾驶员',
    'oa.vehicle_management_page.k8': '暂无车辆',
  };
  return {
    useTranslation: () => ({ t: (k: string) => keys[k] ?? k }),
  };
});

describe('VehicleManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and calls vehicleApi.list on mount', async () => {
    renderWithProviders(<VehicleManagementPage />);

    expect(screen.getByText('车辆管理')).toBeInTheDocument();
    const { vehicleApi } = await import('@/api/erp/core');
    await waitFor(() => {
      expect(vehicleApi.list).toHaveBeenCalled();
    });
  });

  it('renders vehicle rows from API response', async () => {
    renderWithProviders(<VehicleManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('冀A12345')).toBeInTheDocument();
      expect(screen.getByText('凯美瑞')).toBeInTheDocument();
    });
  });
});
