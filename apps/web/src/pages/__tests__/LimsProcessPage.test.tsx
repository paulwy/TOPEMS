import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LimsProcessPage from '../lims/LimsProcessPage';
import { limsApi } from '@/api/lims';
import { useAppStore } from '@/store';

vi.mock('@/api/lims');
vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockProcesses = [
  {
    id: 'PROC001',
    process_no: 'PROC-2024-001',
    process_name: '重金属检测流程',
    process_type: 'chemical',
    status: 'active',
  },
];

describe('LimsProcessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue(mockAddNotification);
    (limsApi.listProcesses as vi.Mock).mockResolvedValue({
      success: true,
      data: mockProcesses,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<LimsProcessPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<LimsProcessPage />);
    await waitFor(() => {
      expect(screen.getByText('检验流程')).toBeInTheDocument();
    });
  });

  it('should render process table', async () => {
    renderWithProviders(<LimsProcessPage />);
    await waitFor(() => {
      expect(screen.getByText('PROC-2024-001')).toBeInTheDocument();
      expect(screen.getByText('重金属检测流程')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<LimsProcessPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '重金属' } });
    });
  });

  it('should handle create process', async () => {
    (limsApi.createProcess as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<LimsProcessPage />);
    await waitFor(() => {
      const addButton = screen.getByText(/新增/);
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(limsApi.createProcess).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (limsApi.listProcesses as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<LimsProcessPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
