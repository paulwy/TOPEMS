import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportSubscriptionPage from '../report/ReportSubscriptionPage';
import { reportApi } from '@/api/report';
import { useAppStore } from '@/store';

vi.mock('@/api/report');
vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockSubscriptions = [
  {
    id: 'sub-001',
    report_id: 'rpt-001',
    report_name: '销售日报',
    schedule: 'daily',
    enabled: true,
    created_at: '2024-01-15T10:00:00Z',
  },
];

describe('ReportSubscriptionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAppStore as vi.Mock).mockImplementation(() => mockAddNotification);

    (reportApi.listSubscriptions as vi.Mock).mockResolvedValue({
      success: true,
      data: mockSubscriptions,
    });

    (reportApi.createSubscription as vi.Mock).mockResolvedValue({
      success: true,
      data: { id: 'sub-002' },
    });

    (reportApi.deleteSubscription as vi.Mock).mockResolvedValue({
      success: true,
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<ReportSubscriptionPage />);
    await waitFor(() => {
      expect(screen.getByText('订阅管理')).toBeInTheDocument();
    });
  });

  it('should render subscription list', async () => {
    renderWithProviders(<ReportSubscriptionPage />);
    await waitFor(() => {
      expect(screen.getByText('销售日报')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (reportApi.listSubscriptions as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<ReportSubscriptionPage />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
