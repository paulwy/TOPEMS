import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HrmEmployeePage from '../hrm/HrmEmployeePage';
import { employeeApi, departmentApi, positionApi, companyApi } from '@/api/hrm';
import { useAppStore } from '@/store';

const queryClient = new QueryClient();

vi.mock('@/api/hrm', () => ({
  hrmApi: {
    employees: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
    },
    departments: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    positions: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
  employeeApi: {
    list: vi
      .fn()
      .mockResolvedValue({ code: 200, data: { items: [], total: 0, page: 1, pagesize: 10 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  },
  departmentApi: {
    list: vi.fn().mockResolvedValue({ code: 200, data: { items: [], total: 0 } }),
    get: vi.fn(),
  },
  positionApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn(),
  },
  companyApi: {
    list: vi.fn().mockResolvedValue({ code: 200, data: { items: [], total: 0 } }),
    get: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['hrm:employee:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['hrm:employee:read'] },
          theme: 'light',
        }
  ),
}));

describe('HrmEmployeePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HrmEmployeePage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(container).toBeDefined();
  });

  it('should have employee API methods defined', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HrmEmployeePage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(employeeApi.list).toBeDefined();
    expect(employeeApi.get).toBeDefined();
    expect(employeeApi.create).toBeDefined();
    expect(employeeApi.update).toBeDefined();
    expect(employeeApi.delete).toBeDefined();
    expect(employeeApi.enable).toBeDefined();
    expect(employeeApi.disable).toBeDefined();
  });

  it('should have correct query key for employees', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HrmEmployeePage />
        </BrowserRouter>
      </QueryClientProvider>
    );
    const queryKeys = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);
    expect(queryKeys.some((key) => key[0] === 'hrm-employees')).toBe(true);
  });
});
