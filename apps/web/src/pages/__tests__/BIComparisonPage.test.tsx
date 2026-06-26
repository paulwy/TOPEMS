import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BIComparisonPage from '../bi/BIComparisonPage';
import { biApi } from '@/api/bi';
import { useAppStore } from '@/store';

vi.mock('@/api/bi');
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

const mockComparisons = [
  {
    id: 'cmp-001',
    name: '月度销售对比',
    comparison_type: 'monthly_sales',
    created_at: '2024-01-15T10:00:00Z',
  },
];

describe('BIComparisonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAppStore as vi.Mock).mockImplementation(() => mockAddNotification);

    (biApi.listComparisons as vi.Mock).mockResolvedValue({
      success: true,
      data: mockComparisons,
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<BIComparisonPage />);
    await waitFor(() => {
      expect(screen.getByText('对比分析')).toBeInTheDocument();
    });
  });

  it('should render comparison list', async () => {
    renderWithProviders(<BIComparisonPage />);
    await waitFor(() => {
      expect(screen.getByText('月度销售对比')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (biApi.listComparisons as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<BIComparisonPage />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});
