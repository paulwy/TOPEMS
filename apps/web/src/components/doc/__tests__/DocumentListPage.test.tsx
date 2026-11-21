import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import DocumentListPage from '../DocumentListPage';

// CrudPage 包装页（§4A）：apiAdapter.list 内部调 docApi.list() 并做搜索/类型过滤。
// mock docApi.list 返回 { success, data: { files: [...] } }，adapter 消费后返回 { data, total }。
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
            name: '产品规格书.pdf',
            folder_id: null,
            size: 1024 * 200,
            content_type: 'application/pdf',
            created_at: '2026-10-01T08:00:00Z',
            updated_at: '2026-10-15T09:30:00Z',
            created_by: '张三',
          },
          {
            id: 'FILE002',
            name: '工艺指导书.docx',
            folder_id: 'FOLDER001',
            size: 1024 * 512,
            content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            created_at: '2026-09-20T08:00:00Z',
            updated_at: '2026-10-20T14:00:00Z',
            created_by: '李四',
          },
        ],
        total: 2,
      },
    }),
    get: vi.fn(),
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    listFolders: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    getVersions: vi.fn(),
    restoreVersion: vi.fn(),
    getDashboard: vi.fn(),
  },
}));

describe('DocumentListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CrudPage heading and rows from mocked docApi.list', async () => {
    renderWithProviders(<DocumentListPage />);

    // CrudPage mock 渲染 <h1>{schema.title}</h1>
    await waitFor(() => {
      expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    });

    // 行数据：apiAdapter.list → CrudPage mock 渲染 cell-<field>-<ri>
    await waitFor(() => {
      expect(screen.getByText('产品规格书.pdf')).toBeInTheDocument();
      expect(screen.getByText('工艺指导书.docx')).toBeInTheDocument();
    });

    // 自定义行操作按钮（打开/下载/分享）使用真实中文 i18n key，每行一组
    expect(screen.getAllByText('打开').length).toBeGreaterThan(0);
    expect(screen.getAllByText('下载').length).toBeGreaterThan(0);
    expect(screen.getAllByText('分享').length).toBeGreaterThan(0);
  });
});
