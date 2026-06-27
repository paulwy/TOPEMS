import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsInspectionPage from '../qms/QmsInspectionPage';
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
    (useAppStore as vi.Mock).mockReturnValue(mockAddNotification);
    (qmsApi.listChecks as vi.Mock).mockResolvedValue({
      success: true,
      data: mockInspections,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QmsInspectionPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<QmsInspectionPage />);
    await waitFor(() => {
      expect(screen.getByText('质量检验')).toBeInTheDocument();
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
      const addButton = screen.getByText(/新建/);
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByText('保存');
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
