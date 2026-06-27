import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BIDataSourcePage from '../bi/BIDataSourcePage';
import { biApi } from '@/api/bi';
import { useAppStore } from '@/store';

vi.mock('@/api/bi');
vi.mock('@/store', () => ({
  useAppStore: vi.fn(),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockDataSources = [
  {
    id: 'ds-001',
    name: 'MySQL数据库',
    source_type: 'mysql',
    connection_string: 'mysql://localhost:3306',
    status: 'connected',
    created_at: '2024-01-15T10:00:00Z',
  },
];

describe('BIDataSourcePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAppStore as vi.Mock).mockImplementation(() => mockAddNotification);

    (biApi.listDataSources as vi.Mock).mockResolvedValue({
      success: true,
      data: mockDataSources,
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<BIDataSourcePage />);
    await waitFor(() => {
      expect(screen.getByText('数据源管理')).toBeInTheDocument();
    });
  });

  it('should render data source list', async () => {
    renderWithProviders(<BIDataSourcePage />);
    await waitFor(() => {
      expect(screen.getByText('MySQL数据库')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (biApi.listDataSources as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<BIDataSourcePage />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
