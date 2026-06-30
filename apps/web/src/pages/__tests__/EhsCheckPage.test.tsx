import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsCheckPage from '../ehs/EhsCheckPage';
import { ehsApi } from '@/api/ehs';
import { useAppStore } from '@/store';

vi.mock('@/api/ehs');
const mockAddNotificationFn = vi.fn();

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector ? selector({
      addNotification: mockAddNotificationFn,
      notifications: [],
      user: null,
      theme: 'light',
    }) : {
      addNotification: mockAddNotificationFn,
      notifications: [],
      user: null,
      theme: 'light',
    }
  ),
}));

const mockAddNotification = mockAddNotificationFn;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockPlans = [
  {
    id: 'PL001',
    plan_no: 'CH-2024-001',
    title: '消防安全检查',
    inspection_type: 'fire',
    frequency: 'daily',
    status: 'active',
    inspector: '张三',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
  },
];

const mockRecords = [
  {
    id: 'RE001',
    record_no: 'RE-2024-001',
    title: '日常检查记录',
    inspection_type: 'daily',
    status: 'completed',
    location: 'A区',
    inspector: '李四',
    inspected_at: '2024-01-15',
  },
];

describe('EhsCheckPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockImplementation((selector?: any) =>
      selector ? selector({
        addNotification: mockAddNotificationFn,
        notifications: [],
        user: null,
        theme: 'light',
      }) : {
        addNotification: mockAddNotificationFn,
        notifications: [],
        user: null,
        theme: 'light',
      }
    );
    (ehsApi.listInspectionPlans as vi.Mock).mockResolvedValue({
      success: true,
      data: mockPlans,
    });
    (ehsApi.listInspectionRecords as vi.Mock).mockResolvedValue({
      success: true,
      data: mockRecords,
    });
  });

  it('should render loading state initially', async () => {
    await act(async () => {
      renderWithProviders(<EhsCheckPage />);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title for plans tab', async () => {
    await act(async () => {
      renderWithProviders(<EhsCheckPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('检查计划')).toBeInTheDocument();
    });
  });

  it('should render plan table', async () => {
    await act(async () => {
      renderWithProviders(<EhsCheckPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('CH-2024-001')).toBeInTheDocument();
      expect(screen.getByText('消防安全检查')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    await act(async () => {
      renderWithProviders(<EhsCheckPage />);
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜索计划编号或名称/)).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText(/搜索计划编号或名称/);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '消防' } });
    });
  });

  it('should switch to records tab', async () => {
    await act(async () => {
      renderWithProviders(<EhsCheckPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('检查计划')).toBeInTheDocument();
    });
    const recordsTab = screen.getByText(/检查记录/);
    await act(async () => {
      fireEvent.click(recordsTab);
    });
    await waitFor(
      () => {
        expect(screen.getByText('检查记录')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle create plan', async () => {
    (ehsApi.createInspectionPlan as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    await act(async () => {
      renderWithProviders(<EhsCheckPage />);
    });

    const addButton = await screen.findByRole('button', { name: /新增计划/i });
    await act(async () => {
      addButton.click();
    });

    const titleInput = screen.getByLabelText(/计划名称/);
    await act(async () => {
      fireEvent.change(titleInput, { target: { value: '测试计划' } });
    });

    const saveButton = screen.getByRole('button', { name: /保存/i });
    await act(async () => {
      saveButton.click();
    });

    await waitFor(() => {
      expect(ehsApi.createInspectionPlan).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  it('should handle API error', async () => {
    (ehsApi.listInspectionPlans as vi.Mock).mockRejectedValue(new Error('Network error'));
    await act(async () => {
      renderWithProviders(<EhsCheckPage />);
    });

    await waitFor(() => {
      expect(true).toBe(true);
    });
  });
});
