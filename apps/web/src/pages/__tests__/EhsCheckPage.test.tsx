import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsCheckPage from '../ehs/EhsCheckPage';
import { ehsApi } from '@/api/ehs';
import { useAppStore } from '@/store';

vi.mock('@/api/ehs');
vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
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
    vi.useFakeTimers();
    (useAppStore as vi.Mock).mockImplementation(() => mockAddNotification);
    (ehsApi.listInspectionPlans as vi.Mock).mockResolvedValue({
      success: true,
      data: mockPlans,
    });
    (ehsApi.listInspectionRecords as vi.Mock).mockResolvedValue({
      success: true,
      data: mockRecords,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<EhsCheckPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title for plans tab', async () => {
    renderWithProviders(<EhsCheckPage />);
    await waitFor(() => {
      expect(screen.getByText('检查计划')).toBeInTheDocument();
    });
  });

  it('should render plan table', async () => {
    renderWithProviders(<EhsCheckPage />);
    await waitFor(() => {
      expect(screen.getByText('CH-2024-001')).toBeInTheDocument();
      expect(screen.getByText('消防安全检查')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<EhsCheckPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索计划编号或名称/);
      fireEvent.change(searchInput, { target: { value: '消防' } });
    });
  });

  it('should switch to records tab', async () => {
    renderWithProviders(<EhsCheckPage />);
    await waitFor(() => {
      const recordsTab = screen.getByText(/检查记录/);
      fireEvent.click(recordsTab);
    });
    await waitFor(() => {
      expect(screen.getByText('检查记录')).toBeInTheDocument();
    });
  });

  it('should handle create plan', async () => {
    (ehsApi.createInspectionPlan as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<EhsCheckPage />);

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增计划/i });
      fireEvent.click(addButton);
    });

    await act(async () => {
      const titleInput = screen.getByLabelText(/计划名称/);
      fireEvent.change(titleInput, { target: { value: '测试计划' } });
    });

    await act(async () => {
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(ehsApi.createInspectionPlan).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should handle API error', async () => {
    (ehsApi.listInspectionPlans as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<EhsCheckPage />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalled();
    });
  });
});