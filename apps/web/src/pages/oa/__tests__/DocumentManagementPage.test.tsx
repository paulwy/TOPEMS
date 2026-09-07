import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import { DocumentManagementPage } from '../DocumentManagementPage';

vi.mock('@/api/erp/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/erp/core')>();
  return {
    ...actual,
    documentApi: {
      list: vi.fn().mockResolvedValue({
        success: true,
        code: 0,
        message: '',
        data: {
          items: [
            {
              id: 'DOC001',
              title: '采购合同',
              doc_type: 'contract',
              status: 'active',
              created_at: '2026-09-02T00:00:00Z',
              updated_at: '2026-09-02T00:00:00Z',
            },
          ],
          total: 1,
        },
      }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      remove: vi.fn(),
    },
  };
});

vi.mock('react-i18next', () => {
  const keys: Record<string, string> = {
    'oa.document_management_page.k0': '文档管理',
    'oa.document_management_page.k1': 'ID',
    'oa.document_management_page.k2': '标题',
    'oa.document_management_page.k3': '类型',
    'oa.document_management_page.k4': '状态',
    'oa.document_management_page.k5': '创建时间',
    'oa.document_management_page.k7': '暂无文档',
  };
  return {
    useTranslation: () => ({ t: (k: string) => keys[k] ?? k }),
  };
});

describe('DocumentManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and calls documentApi.list on mount', async () => {
    renderWithProviders(<DocumentManagementPage />);

    expect(screen.getByText('文档管理')).toBeInTheDocument();
    const { documentApi } = await import('@/api/erp/core');
    await waitFor(() => {
      expect(documentApi.list).toHaveBeenCalled();
    });
  });

  it('renders document rows from API response', async () => {
    renderWithProviders(<DocumentManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('采购合同')).toBeInTheDocument();
    });
  });
});
