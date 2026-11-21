import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsSettingsPage from '../RsSettingsPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    getStatistics: vi.fn().mockResolvedValue({
      success: true,
      data: {
        total_projects: 12,
        total_experiments: 34,
        total_formulas: 56,
        total_tasks: 78,
      },
    }),
  },
}));

vi.mock('@/api/rd/settings', () => ({
  rdSettingsApi: {
    getSettings: vi.fn().mockResolvedValue({ success: true, data: { settings: { items: '[]' } } }),
    updateSettings: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

describe('RsSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders statistics cards and repo tab default data', async () => {
    renderWithProviders(<RsSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('系统统计')).toBeInTheDocument();
    });
    expect(screen.getByText('项目总数')).toBeInTheDocument();
    expect(screen.getByText('试验总数')).toBeInTheDocument();
    expect(screen.getByText('配方总数')).toBeInTheDocument();
    expect(screen.getByText('任务总数')).toBeInTheDocument();
    // repo tab default items
    expect(screen.getByText('仓库管理')).toBeInTheDocument();
    expect(screen.getByText('仓库列表')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('frontend-app')).toBeInTheDocument();
    });
  });
});
