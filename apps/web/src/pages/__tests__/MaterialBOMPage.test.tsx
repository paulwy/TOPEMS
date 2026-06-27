import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MaterialBOMPage from '../mes/MaterialBOMPage';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';

vi.mock('@/api/mes', () => ({
  mesApi: {
    boms: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockBOMs = [
  {
    id: 'BOM001',
    product_code: 'PROD-001',
    product_name: '产品A',
    version: 'V1.0',
    status: 'active',
    created_at: '2024-01-10',
    updated_at: '2024-01-10',
  },
];

describe('MaterialBOMPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockReturnValue({
      addNotification: mockAddNotification,
    });
    (mesApi.boms.list as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        boms: mockBOMs,
        total: mockBOMs.length,
        page: 0,
        page_size: 10,
      },
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<MaterialBOMPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render page title', async () => {
    renderWithProviders(<MaterialBOMPage />);
    await waitFor(() => {
      expect(screen.getByText('物料BOM')).toBeInTheDocument();
    });
  });

  it('should render BOM table', async () => {
    renderWithProviders(<MaterialBOMPage />);
    await waitFor(() => {
      expect(screen.getByText('产品A')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<MaterialBOMPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '产品A' } });
    });
    await waitFor(() => {
      expect(mesApi.boms.list).toHaveBeenCalledWith(expect.objectContaining({ search: '产品A' }));
    });
  });

  it('should handle create BOM', async () => {
    (mesApi.boms.create as vi.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    renderWithProviders(<MaterialBOMPage />);
    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /新增/i });
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /保存/i });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mesApi.boms.create).toHaveBeenCalled();
    });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('should handle API error', async () => {
    (mesApi.boms.list as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<MaterialBOMPage />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
