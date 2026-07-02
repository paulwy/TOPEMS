import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportSubscriptionPage from '../report/ReportSubscriptionPage';
import { reportApi } from '@/api/report';
import { useAppStore } from '@/store';

vi.mock('@/api/report', () => ({
  reportApi: {
    listSubscriptions: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    deleteSubscription: vi.fn(),
    getSubscription: vi.fn(),
    listReports: vi.fn().mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['report:subscription:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['report:subscription:read'] },
          theme: 'light',
        }
  ),
}));

describe('ReportSubscriptionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <ReportSubscriptionPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have subscription API methods defined', () => {
    render(
      <BrowserRouter>
        <ReportSubscriptionPage />
      </BrowserRouter>
    );
    expect(reportApi.listSubscriptions).toBeDefined();
    expect(reportApi.createSubscription).toBeDefined();
    expect(reportApi.updateSubscription).toBeDefined();
  });

  it('should call listSubscriptions API on mount', () => {
    render(
      <BrowserRouter>
        <ReportSubscriptionPage />
      </BrowserRouter>
    );
    expect(reportApi.listSubscriptions).toHaveBeenCalled();
  });
});
