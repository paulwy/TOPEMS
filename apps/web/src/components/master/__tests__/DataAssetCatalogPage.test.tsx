import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import DataAssetCatalogPage from '../DataAssetCatalogPage';

// 手写 MUI 页面：直接消费 dataAssetCatalogApiV66（非模板），
// listAssets 取 res.data.items / res.data.total；getDashboard 取 res.data。
vi.mock('@/api/master/dataAssetCatalogV66', () => ({
  dataAssetCatalogApiV66: {
    listAssets: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'A1',
            name: '客户主数据宽表',
            type: 'table',
            owner: '张三',
            database: 'pg_core',
            schema: 'dbo',
            table_name: 'dim_customer',
            updated_at: '2026-11-01T08:00:00Z',
            category: 'CRM',
            description: '统一客户主数据',
            tags: ['crm', 'master'],
            row_count: 100000,
            column_count: 32,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
      },
    }),
    getDashboard: vi.fn().mockResolvedValue({
      success: true,
      data: { total_assets: 42, active_assets: 30, deprecated_assets: 5, unassigned_assets: 7 },
    }),
    getAsset: vi.fn().mockResolvedValue({ success: true, data: null }),
    getLineageImpact: vi.fn().mockResolvedValue({ success: true, data: null }),
    getLifecycleStage: vi.fn().mockResolvedValue({ success: true, data: { stage: 'active' } }),
    getLifecycleHistory: vi.fn().mockResolvedValue({ success: true, data: [] }),
    transitionLifecycleStage: vi.fn().mockResolvedValue({ success: true }),
    deleteAsset: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('DataAssetCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（数据资产目录）', async () => {
    renderWithProviders(<DataAssetCatalogPage />);
    expect(await screen.findByText('数据资产目录')).toBeInTheDocument();
  });

  it('renders dashboard stat total（总资产数=42）', async () => {
    renderWithProviders(<DataAssetCatalogPage />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('renders asset row from mocked API data', async () => {
    renderWithProviders(<DataAssetCatalogPage />);
    await waitFor(() => {
      expect(screen.getByText('客户主数据宽表')).toBeInTheDocument();
      expect(screen.getByText('dim_customer')).toBeInTheDocument();
    });
  });
});
