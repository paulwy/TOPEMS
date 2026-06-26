import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WIPPage from '../mes/WIPPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    wips: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transfer: vi.fn(),
      getStatistics: vi.fn(),
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

const mockWIPData = [
  {
    id: 'WIP001',
    order_id: 'PO001',
    order_number: 'PO-2024-001',
    process_id: 'PROC001',
    process_name: '切割',
    work_station_id: 'WS001',
    work_station_name: '切割工位',
    quantity: 100,
    status: 'in_progress',
    created_at: '2024-01-15',
    updated_at: '2024-01-15',
  },
];

describe('WIPPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
    });
    (mesApi.wips.list as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        wips: mockWIPData,
        total: mockWIPData.length,
        page: 0,
        page_size: 10,
      },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<WIPPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<WIPPage />);
    await waitFor(() => {
      expect(screen.getByText('在制品管理')).toBeInTheDocument();
    });
  });

  it('should render WIP table', async () => {
    renderWithProviders(<WIPPage />);
    await waitFor(() => {
      expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('切割')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<WIPPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: 'PO-2024-001' } });
    });
    await waitFor(() => {
      expect(mesApi.wips.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'PO-2024-001' })
      );
    });
  });

  it('should handle API error', async () => {
    (mesApi.wips.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<WIPPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});