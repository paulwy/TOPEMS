import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import DashboardPage from '../DashboardPage';

// DashboardTemplate 形态（§4B）：全局 mock 渲染 stat-card-<id> 及其 title/value span。
// LazyChart 未在 setup-mocks 中全局 mock，这里替换为占位。
vi.mock('@/components/charts', () => ({
  LazyChart: () => <div data-testid="lazy-chart" />,
}));

vi.mock('@/api/doc', () => ({
  docApi: {
    getDashboard: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        total_documents: 128,
        published_documents: 96,
        draft_documents: 20,
        archived_documents: 12,
        total_folders: 18,
        total_templates: 7,
        active_templates: 5,
        this_month_created: 23,
        this_month_updated: 41,
      },
    }),
    list: vi.fn(),
    get: vi.fn(),
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    listFolders: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    getVersions: vi.fn(),
    restoreVersion: vi.fn(),
  },
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat cards from mocked docApi.getDashboard', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // doc.documents.stat_files 在 doc.json 中是扁平 key，解析为"文件"
      expect(screen.getByTestId('stat-card-total-documents')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-total-documents')).toHaveTextContent('文件');
      expect(screen.getByTestId('stat-card-total-documents')).toHaveTextContent('128');
    });

    // doc.status.* / doc.menu.template 别名补全后解析为中文标题，value 来自 mock 数值
    expect(screen.getByTestId('stat-card-published-documents')).toHaveTextContent('已发布');
    expect(screen.getByTestId('stat-card-published-documents')).toHaveTextContent('96');
    expect(screen.getByTestId('stat-card-draft-documents')).toHaveTextContent('草稿');
    expect(screen.getByTestId('stat-card-draft-documents')).toHaveTextContent('20');
    expect(screen.getByTestId('stat-card-archived-documents')).toHaveTextContent('已归档');
    expect(screen.getByTestId('stat-card-archived-documents')).toHaveTextContent('12');
    expect(screen.getByTestId('stat-card-total-folders')).toHaveTextContent('文件夹');
    expect(screen.getByTestId('stat-card-total-folders')).toHaveTextContent('18');
    expect(screen.getByTestId('stat-card-templates')).toHaveTextContent('模板');
    expect(screen.getByTestId('stat-card-templates')).toHaveTextContent('7');
  });
});
