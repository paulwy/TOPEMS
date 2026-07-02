import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsNonconformancePage from '../qms/QmsNonconformancePage';
import { qmsApi } from '@/api/qms';
import { useAppStore } from '@/store';

vi.mock('@/api/qms', () => ({
  qmsApi: {
    listIssues: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
    createIssue: vi.fn(),
    updateIssue: vi.fn(),
    deleteIssue: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['qms:nonconformance:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['qms:nonconformance:read'] },
          theme: 'light',
        }
  ),
}));

describe('QmsNonconformancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <QmsNonconformancePage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have nonconformance API methods defined', () => {
    expect(qmsApi.listIssues).toBeDefined();
    expect(qmsApi.createIssue).toBeDefined();
    expect(qmsApi.updateIssue).toBeDefined();
    expect(qmsApi.deleteIssue).toBeDefined();
  });
});
