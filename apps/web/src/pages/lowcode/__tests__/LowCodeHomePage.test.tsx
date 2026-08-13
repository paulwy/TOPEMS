import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import LowCodeHomePage from '../LowCodeHomePage';

const mockGetDashboardStats = vi.fn();

vi.mock('@/api/lowcode', () => ({
  lowcodeApi: {
    getDashboardStats: (...args: any[]) => mockGetDashboardStats(...args),
  },
  LowcodeDashboardStats: {},
}));


vi.mock('@/components/common', () => ({
  PageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid='page-container'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const sampleStats = {
  total_apps: 12,
  published_apps: 8,
  total_data_models: 24,
  total_data_sources: 5,
  total_forms: 36,
  total_pages: 42,
  total_workflows: 9,
  recent_active_apps: 6,
};

describe('LowCodeHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    let resolvePromise: ((v: any) => void) | undefined;
    mockGetDashboardStats.mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      })
    );

    renderWithProviders(<LowCodeHomePage />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolvePromise?.({ data: sampleStats });
  });

  it('renders all stat cards when stats load', async () => {
    mockGetDashboardStats.mockResolvedValue({ data: sampleStats });

    renderWithProviders(<LowCodeHomePage />);

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    expect(screen.getByText('低代码平台概览')).toBeInTheDocument();
    expect(screen.getByText('应用总数')).toBeInTheDocument();
    expect(screen.getByText('已发布应用')).toBeInTheDocument();
    expect(screen.getByText('数据模型')).toBeInTheDocument();
    expect(screen.getByText('数据源')).toBeInTheDocument();
    expect(screen.getByText('表单')).toBeInTheDocument();
    expect(screen.getByText('页面')).toBeInTheDocument();
    expect(screen.getByText('工作流')).toBeInTheDocument();
    expect(screen.getByText('近 7 天活跃')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('shows zero values when backend returns no data', async () => {
    mockGetDashboardStats.mockResolvedValue({ data: null });

    renderWithProviders(<LowCodeHomePage />);

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
  });

  it('shows warning alert when API errors', async () => {
    mockGetDashboardStats.mockRejectedValue(new Error('lowcode 服务未就绪'));

    renderWithProviders(<LowCodeHomePage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/lowcode 服务未就绪/)).toBeInTheDocument();
  });
});
