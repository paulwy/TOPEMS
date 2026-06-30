import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportListPage from '../report/ReportListPage';
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

const mockReports = [
  {
    id: 'rpt-001',
    config: {
      title: '销售月报',
      report_type: 'srm_sales_stats',
      format: 'pdf',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rpt-002',
    config: {
      title: '生产日报',
      report_type: 'pdm_production_stats',
      format: 'excel',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('ReportListPage', () => {
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
    (reportApi.listReports as vi.Mock).mockResolvedValue({
      success: true,
      data: mockReports,
    });

    (reportApi.deleteReport as vi.Mock).mockResolvedValue({
      success: true,
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<ReportListPage />);
    await waitFor(() => {
      expect(screen.getByText('报表中心')).toBeInTheDocument();
    });
  });

  it('should render report list', async () => {
    renderWithProviders(<ReportListPage />);
    await waitFor(() => {
      expect(screen.getByText('销售月报')).toBeInTheDocument();
      expect(screen.getByText('生产日报')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<ReportListPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索报表/);
      fireEvent.change(searchInput, { target: { value: '销售' } });
    });
  });

  it('should handle API error', async () => {
    (reportApi.listReports as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<ReportListPage />);

    await waitFor(() => {
      expect(screen.getByText('报表中心')).toBeInTheDocument();
    });
  });
});
