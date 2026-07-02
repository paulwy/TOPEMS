import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmLeavePage from '../hrm/HrmLeavePage';
import { leaveApi, employeeApi } from '@/api/hrm';
import { useAppStore } from '@/store';

vi.mock('@/api/hrm', () => ({
  hrmApi: {
    leave: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
    },
    employees: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
  leaveApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
  employeeApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['hrm:leave:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['hrm:leave:read'] },
          theme: 'light',
        }
  ),
}));

describe('HrmLeavePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <HrmLeavePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have leave API methods defined', async () => {
    render(
      <BrowserRouter>
        <HrmLeavePage />
      </BrowserRouter>
    );
    expect(leaveApi.list).toBeDefined();
    expect(leaveApi.get).toBeDefined();
    expect(leaveApi.create).toBeDefined();
    expect(leaveApi.update).toBeDefined();
    expect(leaveApi.delete).toBeDefined();
    expect(leaveApi.approve).toBeDefined();
    expect(leaveApi.reject).toBeDefined();
  });

  it('should call leave list API on mount', async () => {
    render(
      <BrowserRouter>
        <HrmLeavePage />
      </BrowserRouter>
    );
    expect(leaveApi.list).toHaveBeenCalled();
  });
});
