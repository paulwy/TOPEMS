import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmEmployeePage from '../hrm/HrmEmployeePage';
import { employeeApi, departmentApi, positionApi } from '@/api/hrm';
import { useAppStore } from '@/store';

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
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  },
  departmentApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn(),
  },
  positionApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
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
      <BrowserRouter>
        <HrmEmployeePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have employee API methods defined', async () => {
    render(
      <BrowserRouter>
        <HrmEmployeePage />
      </BrowserRouter>
    );
    expect(employeeApi.list).toBeDefined();
    expect(employeeApi.get).toBeDefined();
    expect(employeeApi.create).toBeDefined();
    expect(employeeApi.update).toBeDefined();
    expect(employeeApi.delete).toBeDefined();
    expect(employeeApi.enable).toBeDefined();
    expect(employeeApi.disable).toBeDefined();
  });

  it('should call employee list API on mount', async () => {
    render(
      <BrowserRouter>
        <HrmEmployeePage />
      </BrowserRouter>
    );
    expect(employeeApi.list).toHaveBeenCalled();
  });
});
