import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BIDashboardPage from '../bi/BIDashboardPage';
import {
  fetchDashboards,
  createDashboard,
  deleteDashboard,
  cloneDashboard,
  updateDashboard,
  fetchDashboardTemplates,
  createDashboardFromTemplate,
} from '@/api/bi';

vi.mock('@/api/bi');

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

const mockDashboards = [
  {
    id: 'dash-001',
    name: '销售仪表盘',
    description: '展示销售数据概览',
    owner_id: 'user-001',
    is_public: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'dash-002',
    name: '生产监控仪表盘',
    description: '实时生产数据监控',
    owner_id: 'user-001',
    is_public: false,
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
];

const mockTemplates = [
  {
    id: 'tpl-001',
    name: '标准仪表盘模板',
    description: '包含常用图表的标准模板',
    layout: {},
    category: 'standard',
    tags: ['标准', '图表'],
    is_active: true,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
  },
];

describe('BIDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (fetchDashboards as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        items: mockDashboards,
        total: 2,
      },
    });

    (fetchDashboardTemplates as vi.Mock).mockResolvedValue({
      success: true,
      data: mockTemplates,
    });

    (createDashboard as vi.Mock).mockResolvedValue({
      success: true,
      data: { id: 'dash-003', name: '新仪表盘' },
    });

    (deleteDashboard as vi.Mock).mockResolvedValue({
      success: true,
    });

    (cloneDashboard as vi.Mock).mockResolvedValue({
      success: true,
      data: { id: 'dash-004', name: '克隆仪表盘' },
    });

    (updateDashboard as vi.Mock).mockResolvedValue({
      success: true,
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<BIDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('自定义仪表盘')).toBeInTheDocument();
    });
  });

  it('should render dashboard list', async () => {
    renderWithProviders(<BIDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('销售仪表盘')).toBeInTheDocument();
      expect(screen.getByText('生产监控仪表盘')).toBeInTheDocument();
    });
  });

  it('should switch to templates tab', async () => {
    renderWithProviders(<BIDashboardPage />);
    await waitFor(() => {
      const templatesTab = screen.getByText('模板');
      fireEvent.click(templatesTab);
    });
    await waitFor(() => {
      expect(screen.getByText('标准仪表盘模板')).toBeInTheDocument();
    });
  });

  it('should handle search', async () => {
    renderWithProviders(<BIDashboardPage />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      fireEvent.change(searchInput, { target: { value: '销售' } });
    });
  });

  it('should handle API error', async () => {
    (fetchDashboards as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<BIDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('自定义仪表盘')).toBeInTheDocument();
    });
  });
});
