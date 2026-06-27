import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsNonconformancePage from '../qms/QmsNonconformancePage';
import { qmsApi } from '@/api/qms';
import { useAppStore } from '@/store';

vi.mock('@/api/qms');
vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockNonconformances = [
  {
    id: 'NC001',
    nonconformance_no: 'NC-2024-001',
    product_name: '产品A',
    problem_description: '尺寸偏差',
    severity: 'major',
    status: 'open',
    reporter: '张三',
    reported_at: '2024-01-15',
  },
];

describe('QmsNonconformancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue(mockAddNotification);
    (qmsApi.listNonconformances as vi.Mock).mockResolvedValue({
      success: true,
      data: mockNonconformances,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QmsNonconformancePage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<QmsNonconformancePage />);
    await waitFor(() => {
      expect(screen.getByText('不合格品管理')).toBeInTheDocument();
    });
  });

  it('should render nonconformance table', async () => {
    renderWithProviders(<QmsNonconformancePage />);
    await waitFor(() => {
      expect(screen.getByText('NC-2024-001')).toBeInTheDocument();
      expect(screen.getByText('尺寸偏差')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QmsNonconformancePage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '产品A' } });
    });
  });

  it('should handle create nonconformance', async () => {
    (qmsApi.createNonconformance as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<QmsNonconformancePage />);
    await waitFor(() => {
      const addButton = screen.getByText(/新增/);
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(qmsApi.createNonconformance).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (qmsApi.listNonconformances as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QmsNonconformancePage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
