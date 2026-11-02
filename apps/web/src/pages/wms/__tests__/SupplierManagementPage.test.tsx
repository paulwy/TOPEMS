import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import SupplierManagementPage from '../SupplierManagementPage';

// ListPageTemplate 包装页，api 来自 @/api/scm → scmApi.suppliers。
const listMock = vi.fn();
vi.mock('@/api/scm', () => ({
  scmApi: {
    suppliers: {
      list: (...args: unknown[]) => listMock(...args),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('SupplierManagementPage', () => {
  beforeEach(() => {
    listMock.mockResolvedValue({
      data: [
        {
          id: 'S001',
          name: '上海原材料有限公司',
          short_name: '上海原材',
          contact_name: '李四',
          contact_phone: '13800000000',
          email: 'contact@example.com',
          status: 'active',
        },
      ],
      total: 1,
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
