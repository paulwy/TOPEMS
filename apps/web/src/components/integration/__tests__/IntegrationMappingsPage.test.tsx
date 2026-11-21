import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import IntegrationMappingsPage from '../IntegrationMappingsPage';

// CrudPage 包装页：apiAdapter.list 调用 @/api/integration/mapping 的 mappingApi.listMappings，
// 响应 res.data 为 ErpMapping[]，经 erpMappingToMapping 适配为页面 Mapping。
vi.mock('@/api/integration/mapping', () => ({
  mappingApi: {
    listMappings: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'M1',
          local_code: 'CUST',
          local_name: '客户主数据映射',
          external_code: 'customer',
          mapping_type: 'customer',
          isactive: true,
          condition: 'a,b',
          updated_at: '2026-11-01T00:00:00',
        },
      ],
    }),
    createMapping: vi.fn(),
    updateMapping: vi.fn(),
    deleteMapping: vi.fn(),
  },
}));

describe('IntegrationMappingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schema title heading（数据映射）', () => {
    renderWithProviders(<IntegrationMappingsPage />);
    expect(screen.getByRole('heading', { name: '数据映射' })).toBeInTheDocument();
  });

  it('renders mapping row adapted from mocked API', async () => {
    renderWithProviders(<IntegrationMappingsPage />);
    await waitFor(() => {
      expect(screen.getByText('客户主数据映射')).toBeInTheDocument();
    });
  });
});
