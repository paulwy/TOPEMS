import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import SupplierManagementPage from '../SupplierManagementPage';

// ListPageTemplate 包装页，api 切 MDM 权威源（2026-11-07）：
// 从 @/api/scm → @/api/master-data（masterDataApi.suppliers）。
// mdm list 信封为 { items, total, page, page_size }，行字段名为 mdm 原生 snake_case。
const listMock = vi.fn();
vi.mock('@/api/master-data', () => ({
  masterDataApi: {
    suppliers: {
      list: (...args: unknown[]) => listMock(...args),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    supplierCategories: {
      list: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
  },
}));

describe('SupplierManagementPage', () => {
  beforeEach(() => {
    listMock.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'S001',
            supplier_no: 'S001',
            name: '上海原材料有限公司',
            short_name: '上海原材',
            contact_person: '李四',
            phone: '13800000000',
            email: 'contact@example.com',
            status: 'active',
          },
        ],
        total: 1,
        page: 1,
        page_size: 10,
      },
    });
    vi.clearAllMocks();
  });

  it('renders page title（供应商管理）', async () => {
    renderWithProviders(<SupplierManagementPage />);

    expect(await screen.findByText('供应商管理')).toBeInTheDocument();
  });

  it('calls suppliers list API to load crud data', async () => {
    renderWithProviders(<SupplierManagementPage />);

    await waitFor(() => {
      expect(listMock).toHaveBeenCalled();
    });
  });
});
