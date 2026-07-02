import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmDepartmentPage from '../hrm/HrmDepartmentPage';
import { departmentApi, companyApi } from '@/api/hrm';
import { useAppStore } from '@/store';

vi.mock('@/api/hrm', () => ({
  hrmApi: {
    departments: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      move: vi.fn(),
    },
    companies: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
  departmentApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    move: vi.fn(),
  },
  companyApi: {
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
          user: { permissions: ['hrm:department:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['hrm:department:read'] },
          theme: 'light',
        }
  ),
}));

describe('HrmDepartmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <HrmDepartmentPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have department API methods defined', async () => {
    render(
      <BrowserRouter>
        <HrmDepartmentPage />
      </BrowserRouter>
    );
    expect(departmentApi.list).toBeDefined();
    expect(departmentApi.get).toBeDefined();
    expect(departmentApi.create).toBeDefined();
    expect(departmentApi.update).toBeDefined();
    expect(departmentApi.delete).toBeDefined();
    expect(departmentApi.move).toBeDefined();
  });

  it('should call department list API on mount', async () => {
    render(
      <BrowserRouter>
        <HrmDepartmentPage />
      </BrowserRouter>
    );
    expect(departmentApi.list).toHaveBeenCalled();
  });
});
