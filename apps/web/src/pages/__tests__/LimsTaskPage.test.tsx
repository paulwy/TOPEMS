import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LimsTaskPage from '../lims/LimsTaskPage';
import { limsApi } from '@/api/lims';
import { useAppStore } from '@/store';

vi.mock('@/api/lims');
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

const mockTasks = [
  {
    id: 'TASK001',
    task_no: 'TASK-2024-001',
    sample_id: 'SMP001',
    sample_name: '土壤样本A',
    process_id: 'PROC001',
    current_step: 1,
    status: 'pending',
    inspector: '张三',
    started_at: '2024-01-15T10:00:00Z',
  },
];

describe('LimsTaskPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (useAppStore as vi.Mock).mockImplementation(() => mockAddNotification);
    (limsApi.listTasks as vi.Mock).mockResolvedValue({
      success: true,
      data: mockTasks,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<LimsTaskPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<LimsTaskPage />);
    await waitFor(() => {
      expect(screen.getByText('检验任务')).toBeInTheDocument();
    });
  });

  it('should render task table', async () => {
    renderWithProviders(<LimsTaskPage />);
    await waitFor(() => {
      expect(screen.getByText('TASK-2024-001')).toBeInTheDocument();
      expect(screen.getByText('土壤样本A')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<LimsTaskPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '土壤' } });
    });
  });

  it('should handle create task', async () => {
    (limsApi.createTask as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<LimsTaskPage />);

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增/i });
      fireEvent.click(addButton);
    });

    await act(async () => {
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(limsApi.createTask).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should handle API error', async () => {
    (limsApi.listTasks as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<LimsTaskPage />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalled();
    });
  });
});