import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LimsSampleDetailPage from '../lims/LimsSampleDetailPage';
import { limsApi } from '@/api/lims';
import { useAppStore } from '@/store';

vi.mock('@/api/lims');
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
  return render(
    <MemoryRouter initialEntries={['/lims/samples/SMP001']}>
      <Routes>
        <Route
          path='/lims/samples/:id'
          element={ui}
        />
      </Routes>
    </MemoryRouter>
  );
};

const mockSampleDetail = {
  id: 'SMP001',
  sample_no: 'SMP-2024-001',
  name: '土壤样本A',
  sample_name: '土壤样本A',
  sample_type: 'soil',
  status: 'registered',
  storage_location: '冷藏柜A-01',
  description: '用于重金属检测',
};

describe('LimsSampleDetailPage', () => {
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
    (limsApi.getSample as vi.Mock).mockResolvedValue({
      success: true,
      data: mockSampleDetail,
    });
    (limsApi.listTasksBySample as vi.Mock).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<LimsSampleDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<LimsSampleDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('土壤样本A')).toBeInTheDocument();
    });
  });

  it('should render sample details', async () => {
    renderWithProviders(<LimsSampleDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('SMP-2024-001')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (limsApi.getSample as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<LimsSampleDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('样品不存在或已被删除')).toBeInTheDocument();
    });
  });
});
