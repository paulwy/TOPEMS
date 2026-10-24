import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import OpportunityDetailPage from '../crm/OpportunityDetailPage';
import { crmApi } from '@/api/crm';
import { apiLogger } from '@/utils/logger';

// 自绘详情页（DetailPageTemplate）：in-spec 捕获模板 props，断言按路由 id 加载
// 商机与关联客户、infoCard 渲染（名称/阶段/客户标签）、错误态、删除确认弹窗
// 与删除后导航；react-query 沿用 setup-mocks 的全局 useQuery（闭包冻结不影响
// 本页，因为 get/delete 的 id 均走调用参数 vars）。
const mockNavigate = vi.hoisted(() => vi.fn());
const mockDetailPageTemplateProps = vi.hoisted(() => vi.fn());

vi.mock('@/api/crm', () => ({
  crmApi: {
    opportunities: {
      get: vi.fn(),
      delete: vi.fn(),
    },
    customers: {
      get: vi.fn(),
    },
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'opp-1' }),
  };
});

vi.mock('@/components/templates', () => ({
  DetailPageTemplate: (props: Record<string, unknown>) => {
    mockDetailPageTemplateProps(props);
    return <div data-testid='detail-page-template' />;
  },
}));

vi.mock('@topems/shared-components', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 测试 mock 组件 props
  ConfirmDialog: ({ isOpen, onClose, onConfirm, title, message }: any) =>
    isOpen ? (
      <div role='dialog'>
        <span>{title}</span>
        <span>{message}</span>
        <button onClick={onClose}>close</button>
        <button onClick={onConfirm}>confirm</button>
      </div>
    ) : null,
}));

const opportunity = {
  id: 'opp-1',
  name: '华北集团一期',
  value: 50000,
  stage: 'proposal',
  customer_id: 'cust-1',
  close_date: '2026-12-31',
  win_rate: 60,
  notes: '重点跟进',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
};

const lastProps = () => {
  const calls = mockDetailPageTemplateProps.mock.calls;
  return calls[calls.length - 1][0] as Record<string, unknown>;
};

describe('OpportunityDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crmApi.opportunities.get).mockResolvedValue({
      success: true,
      data: opportunity,
    } as never);
    vi.mocked(crmApi.customers.get).mockResolvedValue({
      success: true,
      data: { id: 'cust-1', name: '石家庄钢铁' },
    } as never);
    vi.mocked(crmApi.opportunities.delete).mockResolvedValue({ success: true } as never);
  });

  it('loads opportunity by route id and renders infoCard with stage and customer', async () => {
    render(<OpportunityDetailPage />);

    await waitFor(() => expect(crmApi.opportunities.get).toHaveBeenCalledWith('opp-1'));
    await waitFor(() => expect(crmApi.customers.get).toHaveBeenCalledWith('cust-1'));

    await waitFor(() => {
      expect(lastProps().loading).toBe(false);
    });
    expect(lastProps().emptyState).toEqual({ show: false });
    expect(lastProps().infoCard).toMatchObject({
      title: '华北集团一期',
      subtitle: '方案报价',
      tags: ['石家庄钢铁'],
    });
  });

  it('shows translated error message and empty state when opportunity query fails', async () => {
    vi.mocked(crmApi.opportunities.get).mockRejectedValue(new Error('network'));

    render(<OpportunityDetailPage />);

    await waitFor(() => {
      expect(lastProps().emptyState).toEqual({ show: true });
    });
    expect(lastProps().error).toBe('加载商机信息失败');
  });

  it('opens delete confirm dialog, deletes with id and navigates to opportunity list', async () => {
    render(<OpportunityDetailPage />);
    await waitFor(() => expect(crmApi.opportunities.get).toHaveBeenCalledWith('opp-1'));

    (lastProps().onDelete as () => void)();

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('确认删除');

    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() => expect(crmApi.opportunities.delete).toHaveBeenCalledWith('opp-1'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/crm/opportunities'));
  });

  it('logs error and stays on page when delete rejects', async () => {
    vi.mocked(crmApi.opportunities.delete).mockRejectedValue(new Error('network'));

    render(<OpportunityDetailPage />);
    await waitFor(() => expect(crmApi.opportunities.get).toHaveBeenCalledWith('opp-1'));

    (lastProps().onDelete as () => void)();
    fireEvent.click(await screen.findByText('confirm'));

    await waitFor(() => expect(apiLogger.error).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to edit detail page when onEdit is invoked', async () => {
    render(<OpportunityDetailPage />);
    await waitFor(() => expect(crmApi.opportunities.get).toHaveBeenCalledWith('opp-1'));

    (lastProps().onEdit as () => void)();

    expect(mockNavigate).toHaveBeenCalledWith('/crm/opportunities/opp-1');
  });
});
