import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsInspectionPage from '../qms/QmsInspectionPage';
import { qmsApi } from '@/api/qms';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/qms', () => ({
  qmsApi: {
    listChecks: vi.fn(),
    getCheck: vi.fn(),
    createCheck: vi.fn(),
    updateCheck: vi.fn(),
    deleteCheck: vi.fn(),
    assignCheck: vi.fn(),
    submitCheckResult: vi.fn(),
    auditCheck: vi.fn(),
    reworkCheck: vi.fn(),
    getCheckResults: vi.fn(),
    getCheckAudits: vi.fn(),
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

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockInspections = [
  {
    id: 'QC001',
    inspection_no: 'QC-2024-001',
    inspection_type: 'incoming',
    product_name: '零部件A',
    quantity: 100,
    qualified_quantity: 98,
    unqualified_quantity: 2,
    qualification_rate: 98.0,
    assignee: '张三',
    inspector: '李四',
    inspected_at: '2024-01-15',
    status: 'completed',
    result: '合格',
    memo: '',
  },
];

describe('QmsInspectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNotificationStore as vi.Mock).mockImplementation((selector?: any) =>
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
    (qmsApi.listChecks as vi.Mock).mockResolvedValue({
      success: true,
      data: mockInspections,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QmsInspectionPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should render inspection statistics after loading', async () => {
    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      expect(screen.getByText('检验总数')).toBeInTheDocument();
    });
  });

  it('should render inspection table', async () => {
    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      expect(screen.getByText('QC-2024-001')).toBeInTheDocument();
      expect(screen.getByText('零部件A')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '零部件A' } });
    });
    await waitFor(() => {
      expect(screen.getByText('QC-2024-001')).toBeInTheDocument();
    });
  });

  it('should handle create inspection', async () => {
    (qmsApi.createCheck as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新建/ });
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(qmsApi.createCheck).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (qmsApi.listChecks as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
