import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsAuditManagementPage from '../qms/QmsAuditManagementPage';
import { qmsApi } from '@/api/qms';
import { useAppStore } from '@/store';

vi.mock('@/api/qms', () => ({
  qmsApi: {
    listAuditPlans: vi.fn(),
    createAuditPlan: vi.fn(),
    getStatistics: vi.fn(),
  },
}));
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: mockAddNotification,
          notifications: [],
          user: null,
          theme: 'light',
        })
      : {
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

const mockAuditPlans = [
  {
    id: 'AU001',
    plan_no: 'AU-2024-001',
    title: '2024年内部审核',
    audit_type: 'internal',
    status: 'completed',
    auditor: '张三',
    start_date: '2024-01-15',
    departments: ['生产车间', '质量部'],
  },
];

describe('QmsAuditManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockImplementation((selector?: any) =>
      selector
        ? selector({
            addNotification: mockAddNotification,
            notifications: [],
            user: null,
            theme: 'light',
          })
        : {
            addNotification: mockAddNotification,
            notifications: [],
            user: null,
            theme: 'light',
          }
    );
    (qmsApi.listAuditPlans as vi.Mock).mockResolvedValue({
      success: true,
      data: mockAuditPlans,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
  });

  it('should render page title', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '审核管理' })).toBeInTheDocument();
    });
  });

  it('should render audit table', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('AU-2024-001')).toBeInTheDocument();
      expect(screen.getByText('2024年内部审核')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '2024' } });
    });
  });

  it('should render audit statistics', async () => {
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('审核总数')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (qmsApi.listAuditPlans as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QmsAuditManagementPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
