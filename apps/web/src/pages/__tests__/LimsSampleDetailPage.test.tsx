import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LimsSampleDetailPage from '../lims/LimsSampleDetailPage';
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

const mockSampleDetail = {
  id: 'SMP001',
  sample_no: 'SMP-2024-001',
  sample_name: '土壤样本A',
  sample_type: 'soil',
  status: 'registered',
  storage_location: '冷藏柜A-01',
  description: '用于重金属检测',
};

describe('LimsSampleDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue(mockAddNotification);
    (limsApi.getSample as vi.Mock).mockResolvedValue({
      success: true,
      data: mockSampleDetail,
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<LimsSampleDetailPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<LimsSampleDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('样本详情')).toBeInTheDocument();
    });
  });

  it('should render sample details', async () => {
    renderWithProviders(<LimsSampleDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('SMP-2024-001')).toBeInTheDocument();
      expect(screen.getByText('土壤样本A')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (limsApi.getSample as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<LimsSampleDetailPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
