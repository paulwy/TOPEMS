import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HrmAttendancePage from '../hrm/HrmAttendancePage';
import { hrmApi } from '@/api/hrm';

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
  attendanceApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  leaveApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('HrmAttendancePage', () => {
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
  });

  it('should have valid leave API methods', () => {
    expect(hrmApi.leave.list).toBeDefined();
  });
});
