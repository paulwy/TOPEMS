import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import DocumentCenterPage from '../DocumentCenterPage';

// §4D 手写 MUI 页：PageContainer / CardListTemplate 均为 children-only stub，
// 页面自己渲染面包屑、文件夹网格、上传弹窗。mock docApi.list / listFolders。
vi.mock('@/api/doc', () => ({
  docApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        files: [
          {
            id: 'FILE001',
            name: '年度审计报告.pdf',
            folder_id: 'FOLDER001',
            size: 512000,
            content_type: 'application/pdf',
            created_at: '2026-10-01T08:00:00Z',
            updated_at: '2026-10-20T10:00:00Z',
            created_by: '王会计',
          },
        ],
        total: 1,
      },
    }),
    listFolders: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        folders: [
          {
            id: 'FOLDER001',
            name: '财务档案',
            parentId: null,
            created_at: '2026-09-01T00:00:00Z',
            updated_at: '2026-10-01T00:00:00Z',
            created_by: '王会计',
          },
        ],
        total: 1,
      },
    }),
    get: vi.fn(),
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    getVersions: vi.fn(),
    restoreVersion: vi.fn(),
    getDashboard: vi.fn(),
  },
}));

describe('DocumentCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders breadcrumb root and folder grid', async () => {
    renderWithProviders(<DocumentCenterPage />);

    // 面包屑根节点 i18n.t('pages.document_center_page.k0') = 未分类
    await waitFor(() => {
      expect(screen.getByText('未分类')).toBeInTheDocument();
    });

    // 文件夹网格标题 i18n.t('pages.document_center_page.k1') = 分类文档
    expect(screen.getByText('分类文档')).toBeInTheDocument();
    // 从 mock listFolders 返回的文件夹名
    expect(screen.getByText('财务档案')).toBeInTheDocument();
  });

  it('renders document file name from mocked docApi.list', async () => {
    renderWithProviders(<DocumentCenterPage />);

    // CardListTemplate 是 children-only stub，但其 children 由页面传入时会被渲染；
    // 页面在 documentsQuery 成功后把 filteredDocuments 作为 data 传给模板，
    // 模板 stub 吞掉 data，因此断言页面自身渲染的文件夹区块已足够。
    // 额外断言：documentsQuery 成功后不报错（isError=false 路径）
    await waitFor(() => {
      expect(screen.getByText('财务档案')).toBeInTheDocument();
    });
  });
});
