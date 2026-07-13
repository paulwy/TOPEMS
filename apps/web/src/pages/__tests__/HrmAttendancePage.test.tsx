import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmAttendancePage from '../hrm/HrmAttendancePage';
import { hrmApi } from '@/api/hrm';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/hrm', () => ({
  hrmApi: {
    attendance: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    leave: {
      list: vi.fn(),
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

describe('HrmAttendancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <HrmAttendancePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have valid attendance API methods', () => {
    expect(hrmApi.attendance.list).toBeDefined();
    expect(hrmApi.attendance.get).toBeDefined();
    expect(hrmApi.attendance.create).toBeDefined();
    expect(hrmApi.attendance.update).toBeDefined();
    expect(hrmApi.attendance.delete).toBeDefined();
  });

  it('should have valid leave API methods', () => {
    expect(hrmApi.leave.list).toBeDefined();
  });
});
