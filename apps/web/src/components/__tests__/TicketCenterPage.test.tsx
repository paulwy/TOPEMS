import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TicketCenterPage from '../ticket/TicketCenterPage';
import { ticketApi } from '@/api/ticket';

// TicketCenterPage 使用手写 adapter（非 createCrudPageAdapter），无需 unmock；
// 全局 i18n.t 用于 delete 抛错文案，未登记 key 原样返回便于断言。
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    exists: () => false,
  },
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// TicketCenterPage 以命名导入使用 CrudPage
vi.mock('@/components/templates/CrudPage', () => ({
  CrudPage: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schemas/ticket', () => ({
  ticketSchema: { name: 'ticketSchema' },
}));

vi.mock('@/api/ticket', () => ({
  ticketApi: {
    listTickets: vi.fn().mockResolvedValue({
      data: {
        items: [
          { id: 'tk-1', subject: '登录失败', status: 'open', severity: 'high' },
          { id: 'tk-2', subject: '报表导出慢', status: 'in_progress', severity: 'medium' },
        ],
        total: 2,
      },
    }),
    createTicket: vi.fn().mockResolvedValue({
      data: { id: 'tk-9', subject: '新工单' },
    }),
    updateTicket: vi.fn().mockResolvedValue({
      data: { id: 'tk-1', status: 'in_progress' },
    }),
    getStats: vi.fn().mockResolvedValue({
      data: {
        total: 5,
        open: 2,
        in_progress: 1,
        pending: 0,
        resolved: 1,
        closed: 1,
        sla_breached: 0,
      },
    }),
    getComments: vi.fn().mockResolvedValue({ data: [] }),
    getTicketSla: vi.fn().mockResolvedValue({ data: null }),
    addComment: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('TicketCenterPage（批次4）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with ticket schema, breadcrumbs, row actions and detail content', () => {
    render(<TicketCenterPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'ticketSchema' },
        breadcrumbs: [
          { label: 'ticket:breadcrumb.home', href: '/dashboard' },
          { label: 'ticket:page.title' },
        ],
        customRowActions: expect.any(Array),
        headerContent: expect.any(Function),
        detailContent: expect.any(Function),
      })
    );
  });

  it('fetches ticket stats once on mount for header stat cards', async () => {
    render(<TicketCenterPage />);

    await waitFor(() => expect(ticketApi.getStats).toHaveBeenCalledTimes(1));
  });

  it('maps list params to ticket query shape and unwraps paginated response', async () => {
    render(<TicketCenterPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      status: 'open',
      ticket_type: 'bug',
      severity: 'high',
    });

    expect(ticketApi.listTickets).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      status: 'open',
      ticket_type: 'bug',
      severity: 'high',
    });
    expect(result).toEqual({
      data: [
        { id: 'tk-1', subject: '登录失败', status: 'open', severity: 'high' },
        { id: 'tk-2', subject: '报表导出慢', status: 'in_progress', severity: 'medium' },
      ],
      total: 2,
    });
  });

  it('delegates create and update to ticket API', async () => {
    render(<TicketCenterPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ subject: '新工单' })).resolves.toEqual({
      id: 'tk-9',
      subject: '新工单',
    });
    await expect(props.apiAdapter.update('tk-1', { status: 'in_progress' })).resolves.toEqual({
      id: 'tk-1',
      status: 'in_progress',
    });

    expect(ticketApi.createTicket).toHaveBeenCalledWith({ subject: '新工单' });
    expect(ticketApi.updateTicket).toHaveBeenCalledWith('tk-1', { status: 'in_progress' });
  });

  it('rejects delete with explicit not-supported error (ticket 不支持删除)', async () => {
    render(<TicketCenterPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.delete('tk-1')).rejects.toThrow(
      'ticket:errors.deleteNotSupported'
    );
  });
});
