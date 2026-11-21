import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import PublicMasterDataPage from '../PublicMasterDataPage';

// useQuery queryFn 形状：(await materialApi.list(params)).data.data → { items, total }
// vi.mock 被提升到文件顶部，辅助函数必须用 vi.hoisted 才能在工厂内引用。
const listEnvelope = vi.hoisted(() => (items: unknown[]) => ({
  data: { success: true, code: 0, message: '', data: { items, total: items.length } },
}));

vi.mock('@/api/master/masterData', () => ({
  materialApi: {
    list: vi.fn().mockResolvedValue(
      listEnvelope([
        {
          id: 'M1',
          material_code: 'M-001',
          material_name: '不锈钢冷轧板',
          material_type: 'raw',
          unit: 'kg',
          status: 'active',
        },
      ])
    ),
    get: vi.fn(),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    remove: vi.fn().mockResolvedValue({ data: {} }),
  },
  uomApi: {
    list: vi.fn().mockResolvedValue(listEnvelope([])),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  sampleApi: {
    list: vi.fn().mockResolvedValue(listEnvelope([])),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('PublicMasterDataPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（公共主数据）', async () => {
    renderWithProviders(<PublicMasterDataPage />);
    expect(await screen.findByText('公共主数据')).toBeInTheDocument();
  });

  it('renders material rows from mocked API data', async () => {
    renderWithProviders(<PublicMasterDataPage />);
    await waitFor(() => {
      expect(screen.getByText('M-001')).toBeInTheDocument();
      expect(screen.getByText('不锈钢冷轧板')).toBeInTheDocument();
    });
  });
});
