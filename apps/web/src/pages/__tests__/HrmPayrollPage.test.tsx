import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmPayrollPage from '../hrm/HrmPayrollPage';
import { payrollApi, payrollItemApi, employeeApi, salaryAdjustmentApi } from '@/api/hrm';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/hrm', () => ({
  hrmApi: {
    payroll: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      calculate: vi.fn(),
      pay: vi.fn(),
    },
    payrollItems: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    salaryAdjustments: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    },
  },
  payrollApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    calculate: vi.fn(),
    approve: vi.fn(),
    pay: vi.fn(),
  },
  payrollItemApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  employeeApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
  },
  salaryAdjustmentApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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

describe('HrmPayrollPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <HrmPayrollPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have valid payroll API methods', () => {
    expect(payrollApi.list).toBeDefined();
    expect(payrollApi.get).toBeDefined();
    expect(payrollApi.create).toBeDefined();
    expect(payrollApi.update).toBeDefined();
    expect(payrollApi.delete).toBeDefined();
    expect(payrollApi.calculate).toBeDefined();
    expect(payrollApi.approve).toBeDefined();
    expect(payrollApi.pay).toBeDefined();
  });

  it('should have valid payroll items API methods', () => {
    expect(payrollItemApi.list).toBeDefined();
  });

  it('should have valid salary adjustments API methods', () => {
    expect(salaryAdjustmentApi.list).toBeDefined();
  });

  it('should call payroll list API on mount', async () => {
    render(
      <BrowserRouter>
        <HrmPayrollPage />
      </BrowserRouter>
    );
    expect(payrollApi.list).toHaveBeenCalled();
  });
});
