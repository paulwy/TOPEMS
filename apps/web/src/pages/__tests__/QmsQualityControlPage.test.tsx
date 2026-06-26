import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsQualityControlPage from '../qms/QmsQualityControlPage';
import { qmsApi } from '@/api/qms';
import { useAppStore } from '@/store';

vi.mock('@/api/qms');
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

const mockControls = [
  {
    id: 'QC001',
    control_no: 'QC-2024-001',
    control_name: '来料检验标准',
    category: 'incoming',
    status: 'active',
    version: 'V1.0',
  },
];

describe('QmsQualityControlPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue(mockAddNotification);
    (qmsApi.listControls as vi.Mock).mockResolvedValue({
      success: true,
      data: mockControls,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QmsQualityControlPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<QmsQualityControlPage />);
    await waitFor(() => {
      expect(screen.getByText('质量控制')).toBeInTheDocument();
    });
  });

  it('should render control table', async () => {
    renderWithProviders(<QmsQualityControlPage />);
    await waitFor(() => {
      expect(screen.getByText('QC-2024-001')).toBeInTheDocument();
      expect(screen.getByText('来料检验标准')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QmsQualityControlPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '来料' } });
    });
  });

  it('should handle create control', async () => {
    (qmsApi.createControl as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<QmsQualityControlPage />);
    await waitFor(() => {
      const addButton = screen.getByText(/新增/);
      fireEvent.click(addButton);
    });

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(qmsApi.createControl).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should handle API error', async () => {
    (qmsApi.listControls as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QmsQualityControlPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});