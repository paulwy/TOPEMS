import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import DocumentsPage from '../DocumentsPage';

// 目录组件（§4D 手写 MUI 页）：CardListTemplate 全局 mock 为 children-only stub，
// 页面自己渲染 header h5 / 搜索框 / 上传按钮 / DocumentTree / DocumentList。
// mock docApi.listFolders 与 docApi.list 返回确定性数据。
vi.mock('@/api/doc', () => ({
  docApi: {
    listFolders: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        folders: [
          {
            id: 'FOLDER001',
            name: '项目文档',
            parentId: null,
            created_at: '2026-09-01T00:00:00Z',
            updated_at: '2026-10-01T00:00:00Z',
            created_by: '张三',
          },
        ],
        total: 1,
      },
    }),
    list: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        files: [
          {
            id: 'FILE001',
            name: '需求规格说明书.pdf',
            folder_id: null,
            size: 204800,
            content_type: 'application/pdf',
            created_at: '2026-10-01T08:00:00Z',
            updated_at: '2026-10-15T09:30:00Z',
            created_by: '张三',
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

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header, search box and upload button', () => {
    renderWithProviders(<DocumentsPage />);

    // header h5 标题：doc.nav.doc-documents → 我的文档
    expect(screen.getByRole('heading', { level: 5 })).toHaveTextContent('我的文档');
    // 搜索框（TextField input）
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    // 上传按钮：doc.documents.upload → 上传（未上传态）
    expect(screen.getByRole('button', { name: '上传' })).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5);
  });

  it('renders folders and files from mocked API data', async () => {
    renderWithProviders(<DocumentsPage />);

    await waitFor(() => {
      // 文件夹名同时出现在侧栏树与主区域，用 getAllByText
      expect(screen.getAllByText('项目文档').length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(screen.getByText('需求规格说明书.pdf')).toBeInTheDocument();
    });
  });
});
