import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import LocationPage from '../LocationPage';

// ListPageTemplate 包装页。crud.api = createListPageCrudApi(locationApiAdapter)，
// locationApiAdapter = createCrudPageAdapter(wmsApi.locations)（全局 identity mock）。
// 真实 wrapper 期望 apiAdapter.list 返回 { data: 数组, total }，再包成 { data:{ items } }。
const listMock = vi.fn();
vi.mock('@/api/wms', () => ({
  wmsApi: {
    locations: {
      list: (...args: unknown[]) => listMock(...args),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('LocationPage', () => {
  beforeEach(() => {
    listMock.mockResolvedValue({
      data: [
        {
          id: 'L001',
          code: 'A-01-01',
          name: 'A区1号库位',
          warehouse_id: 'WH01',
          zone_name: 'A区',
          location_type: 'storage',
          status: 'active',
          capacity: 100,
          occupied_quantity: 30,
        },
      ],
      total: 1,
    });
    vi.clearAllMocks();
  });

  it('renders page title（库位管理）', async () => {
    renderWithProviders(<LocationPage />);

    expect(await screen.findByText('库位管理')).toBeInTheDocument();
  });

  it('calls locations list API to load crud data', async () => {
    renderWithProviders(<LocationPage />);

    await waitFor(() => {
      expect(listMock).toHaveBeenCalled();
    });
  });
});
