import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BIDataSourcePage from '../bi/BIDataSourcePage';
import { listDataSources, deleteDataSource, testDataSource, refreshDataSource } from '@/api/bi';
import { useAppStore } from '@/store';

vi.mock('@/api/bi');
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: mockAddNotification,
          notifications: [],
          user: null,
          theme: 'light',
        })
      : {
          addNotification: mockAddNotification,
          notifications: [],
          user: null,
          theme: 'light',
        }
  ),
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
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
  },
];

describe('BIDataSourcePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockImplementation((selector?: any) =>
      selector
        ? selector({
            addNotification: mockAddNotification,
            notifications: [],
            user: null,
            theme: 'light',
          })
        : {
            addNotification: mockAddNotification,
            notifications: [],
            user: null,
            theme: 'light',
          }
    );
    (listDataSources as vi.Mock).mockResolvedValue({
      success: true,
      data: mockDataSources,
    });
    (deleteDataSource as vi.Mock).mockResolvedValue({ success: true });
    (testDataSource as vi.Mock).mockResolvedValue({ success: true });
    (refreshDataSource as vi.Mock).mockResolvedValue({ success: true });
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
    (listDataSources as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<BIDataSourcePage />);

    await waitFor(() => {
      expect(screen.getByText('数据源管理')).toBeInTheDocument();
    });
  });
});
