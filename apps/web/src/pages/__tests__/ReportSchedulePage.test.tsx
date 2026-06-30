import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportSchedulePage from '../report/ReportSchedulePage';
import { reportApi } from '@/api/report';
import { useAppStore } from '@/store';

vi.mock('@/api/report');
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector ? selector({
      addNotification: mockAddNotification,
      notifications: [],
      user: null,
      theme: 'light',
    }) : {
      addNotification: mockAddNotification,
      notifications: [],
      user: null,
      theme: 'light',
    }
  ),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockSchedules = [
  {
    id: 'sch-001',
    report_id: 'rpt-001',
    report_name: '销售月报',
    schedule_type: 'monthly',
    cron_expression: '0 0 1 * *',
    enabled: true,
    next_run_time: '2024-02-01T00:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
  },
];

describe('ReportSchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockImplementation((selector?: any) =>
      selector ? selector({
        addNotification: mockAddNotification,
        notifications: [],
        user: null,
        theme: 'light',
      }) : {
        addNotification: mockAddNotification,
        notifications: [],
        user: null,
        theme: 'light',
      }
    );
    (reportApi.listSchedules as vi.Mock).mockResolvedValue({
      success: true,
      data: mockSchedules,
    });

    (reportApi.createSchedule as vi.Mock).mockResolvedValue({
      success: true,
      data: { id: 'sch-002' },
    });

    (reportApi.deleteSchedule as vi.Mock).mockResolvedValue({
      success: true,
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<ReportSchedulePage />);
    await waitFor(() => {
      expect(screen.getByText('定时任务')).toBeInTheDocument();
    });
  });

  it('should render schedule list', async () => {
    renderWithProviders(<ReportSchedulePage />);
    await waitFor(() => {
      expect(screen.getByText('销售月报')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (reportApi.listSchedules as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<ReportSchedulePage />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
