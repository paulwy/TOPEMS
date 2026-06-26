import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QualityTraceabilityPage from '../mes/QualityTraceabilityPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    traceability: {
      getTraceChain: vi.fn(),
      forwardTraceability: vi.fn(),
      backwardTraceability: vi.fn(),
      listQualityRecords: vi.fn(),
    },
  },
}));

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

const mockQualityRecords = [
  {
    id: 'QR001',
    batch_no: 'BATCH-001',
    product_code: 'PROD-001',
    product_name: '产品A',
    inspection_type: 'final',
    quantity: 100,
    qualified_quantity: 98,
    unqualified_quantity: 2,
    qualification_rate: 98.0,
    status: 'passed',
    created_at: '2024-01-15',
  },
];

describe('QualityTraceabilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
    });
    (mesApi.traceability.listQualityRecords as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        records: mockQualityRecords,
        total: mockQualityRecords.length,
        page: 0,
        page_size: 10,
      },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<QualityTraceabilityPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<QualityTraceabilityPage />);
    await waitFor(() => {
      expect(screen.getByText('质量追溯')).toBeInTheDocument();
    });
  });

  it('should render traceability table', async () => {
    renderWithProviders(<QualityTraceabilityPage />);
    await waitFor(() => {
      expect(screen.getByText('BATCH-001')).toBeInTheDocument();
      expect(screen.getByText('产品A')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<QualityTraceabilityPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: 'BATCH-001' } });
    });
    await waitFor(() => {
      expect(mesApi.traceability.listQualityRecords).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'BATCH-001' })
      );
    });
  });

  it('should handle API error', async () => {
    (mesApi.traceability.listQualityRecords as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<QualityTraceabilityPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});