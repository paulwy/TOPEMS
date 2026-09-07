import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import { AnnouncementPage } from '../AnnouncementPage';

vi.mock('@/api/erp/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/erp/core')>();
  return {
    ...actual,
    announcementApi: {
      list: vi.fn().mockResolvedValue({
        success: true,
        code: 0,
        message: '',
        data: {
          items: [
            {
              id: 'ANN001',
              title: '国庆放假通知',
              content: '10 月 1 日至 7 日放假',
              author: '办公室',
              status: 'published',
              priority: 'high',
              created_at: '2026-09-03T00:00:00Z',
              updated_at: '2026-09-03T00:00:00Z',
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
      publish: vi.fn(),
      unpublish: vi.fn(),
    },
  };
});

vi.mock('react-i18next', () => {
  const keys: Record<string, string> = {
    'oa.announcement_page.k0': '公告管理',
    'oa.announcement_page.col_title': '标题',
    'oa.announcement_page.col_category': '分类',
    'oa.announcement_page.col_author': '作者',
    'oa.announcement_page.col_created_at': '发布时间',
    'oa.announcement_page.col_status': '状态',
    'pages.announcement_page.k0': '暂无公告',
  };
  return {
    useTranslation: () => ({ t: (k: string) => keys[k] ?? k }),
  };
});

describe('AnnouncementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and calls announcementApi.list on mount', async () => {
    renderWithProviders(<AnnouncementPage />);

    expect(screen.getByText('公告管理')).toBeInTheDocument();
    const { announcementApi } = await import('@/api/erp/core');
    await waitFor(() => {
      expect(announcementApi.list).toHaveBeenCalled();
    });
  });

  it('renders announcement rows from API response', async () => {
    renderWithProviders(<AnnouncementPage />);

    await waitFor(() => {
      expect(screen.getByText('国庆放假通知')).toBeInTheDocument();
      expect(screen.getByText('办公室')).toBeInTheDocument();
    });
  });
});
