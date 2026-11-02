import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import FileDetailPage from '../FileDetailPage';

// §4C 详情页：mock useParams 提供 id，mock docApi.get 返回确定性数据。
// 全局 DetailPageTemplate 是 children-only stub（吞掉 props），在测试内覆盖该模板 mock，
// 渲染 detailItemName / tabs / sections，使页面计算出的详情内容进入 DOM。
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useParams: () => ({ id: 'FILE001' }),
  };
});

vi.mock('@/api/doc', () => ({
  docApi: {
    get: vi.fn().mockResolvedValue({
      success: true,
      code: 200,
      message: '',
      data: {
        id: 'FILE001234567890',
        name: '年度财务决算.xlsx',
        folder_id: 'FOLDER-FIN',
        size: 1024 * 2048,
        content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-10-25T16:30:00Z',
        created_by: '王会计',
      },
    }),
    list: vi.fn(),
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn().mockResolvedValue({ success: true, code: 200 }),
    listFolders: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    getVersions: vi.fn(),
    restoreVersion: vi.fn(),
    getDashboard: vi.fn(),
  },
}));

vi.mock('@/components/templates', () => ({
  DetailPageTemplate: ({
    detailItemName,
    tabs,
    sections,
    loading,
    error,
  }: {
    detailItemName?: string;
    tabs?: Array<{ id: string; label: string; content: React.ReactNode }>;
    sections?: Array<{ id: string; title?: string; content: React.ReactNode }>;
    loading?: boolean;
    error?: string;
  }) => (
    <div>
      <h1>{detailItemName}</h1>
      {loading ? <div data-testid='loading'>Loading...</div> : null}
      {error ? <div data-testid='error'>{error}</div> : null}
      {tabs?.map((t) => (
        <div
          key={t.id}
          data-testid={`tab-${t.id}`}
        >
          <h3>{t.label}</h3>
          <div>{t.content}</div>
        </div>
      ))}
      {sections?.map((s) => (
        <section
          key={s.id}
          data-testid={`section-${s.id}`}
        >
          {s.title ? <h3>{s.title}</h3> : null}
          <div>{s.content}</div>
        </section>
      ))}
    </div>
  ),
}));

describe('FileDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches file by route id and renders detail item name', async () => {
    renderWithProviders(<FileDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '年度财务决算.xlsx' })).toBeInTheDocument();
    });
  });

  it('renders basic info tab with file metadata', async () => {
    renderWithProviders(<FileDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-basic')).toBeInTheDocument();
    });

    // 标签来自 i18n（pages.file_detail_page.k6/k7/k8/k9/k11）
    // 文件名同时出现在 h1 与 tab-basic 中，限定在 tab-basic 内断言
    const basic = screen.getByTestId('tab-basic');
    expect(basic).toHaveTextContent('文件名称');
    expect(basic).toHaveTextContent('年度财务决算.xlsx');
    expect(basic).toHaveTextContent('文件类型');
    expect(basic).toHaveTextContent(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(basic).toHaveTextContent('文件大小');
    expect(basic).toHaveTextContent('创建者');
    expect(basic).toHaveTextContent('王会计');
  });

  it('renders time info tab and footer section', async () => {
    renderWithProviders(<FileDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('tab-time')).toBeInTheDocument();
    });
    expect(screen.getByText('创建时间')).toBeInTheDocument();
    expect(screen.getByText('更新时间')).toBeInTheDocument();

    // footer section: pages.file_detail_page.k15 = 其他信息
    await waitFor(() => {
      expect(screen.getByTestId('section-footer')).toBeInTheDocument();
    });
    expect(screen.getByText('其他信息')).toBeInTheDocument();
  });
});
