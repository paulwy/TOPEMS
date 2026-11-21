import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MailPage from '../MailPage';

// MailPage 是目录组件（index.tsx），驱动全在 useMailPage hook（@/components/im/MailPageHooks），
// 数据流经 emailApi。hook 对 api 失败有 try/catch 兜底（空态 + notification），
// 这里 mock @/api/mail 返回确定性数据，断言页面渲染的标题、按钮与邮件数据行。
vi.mock('@/api/mail', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    emailApi: {
      getStats: vi.fn().mockResolvedValue({
        success: true,
        code: 0,
        message: '',
        data: { total: 1, unread: 1, sent: 0, failed: 0, templates: 2 },
      }),
      list: vi.fn().mockResolvedValue({
        success: true,
        code: 0,
        message: '',
        data: {
          items: [
            {
              id: 'MAIL001',
              subject: 'Q3 质量复盘会议通知',
              to_addresses: ['zhangsan@topems.local'],
              cc_addresses: [],
              bcc_addresses: [],
              body: '会议时间 11-05 10:00',
              priority: 'normal',
              status: 'sent',
              created_at: '2026-11-03T09:00:00Z',
            },
          ],
          total: 1,
        },
      }),
      send: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      resend: vi.fn(),
    },
  };
});

describe('MailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and send button', () => {
    renderWithProviders(<MailPage />);

    // 页头标题（children 内 Typography h5）
    expect(screen.getByText('邮件管理')).toBeInTheDocument();
    // 发送按钮
    expect(screen.getByText('发送邮件')).toBeInTheDocument();
  });

  it('renders email rows from mocked emailApi.list data', async () => {
    renderWithProviders(<MailPage />);

    await waitFor(() => {
      expect(screen.getByText('Q3 质量复盘会议通知')).toBeInTheDocument();
    });
  });
});
