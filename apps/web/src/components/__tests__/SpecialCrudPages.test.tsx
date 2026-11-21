import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScmPurchaseItemPage from '../scm/ScmPurchaseItemPage';
import ScmIncomingNoticePage from '../scm/ScmIncomingNoticePage';
import FinanceReceiptPage from '../finance/FinanceReceiptPage';
import RsMilestonePage from '../rd/RsMilestonePage';
import { scmApi } from '@/api/scm';
import { financeApi } from '@/api/finance';
import { rdApi } from '@/api/rd';

// 与 CrmCrudPages 冻结范本同构；本文件覆盖自定义 adapter / no-op 桩 / 动态 schema 特殊形态
vi.unmock('@/schema-dsl/crudPageAdapter');

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => {
      const crudTranslations: Record<string, string> = {
        'schema:crud_page_adapter.k0': '加载列表失败',
        'schema:crud_page_adapter.k1': '创建失败',
        'schema:crud_page_adapter.k2': '更新失败',
        'schema:crud_page_adapter.k3': '删除失败',
        'schema:crud_page_adapter.k4': '记录不存在',
      };
      return crudTranslations[key] ?? key;
    },
    exists: () => true,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
  // RsMilestonePage 使用命名导入 import { CrudPage }
  CrudPage: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  },
}));

vi.mock('@/schemas/scm', () => ({
  purchaseItemSchema: { name: 'purchaseItemSchema' },
  incomingNoticeSchema: { name: 'incomingNoticeSchema' },
}));

vi.mock('@/schemas/finance', () => ({
  receiptSchema: { name: 'receiptSchema' },
}));

vi.mock('@/schemas/rd', () => ({
  getMilestoneSchema: () => ({ name: 'milestoneSchema' }),
}));

vi.mock('@/api/scm', () => ({
  scmApi: {
    purchaseItems: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [{ id: 'item-1', name: '采购项甲' }], total: 1 },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'item-2', name: '采购项乙' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'item-1', name: '采购项丙' },
      }),
    },
    incomingInspections: {
      listNotices: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [{ id: 'notice-1', name: '到货甲' }], total: 1 },
      }),
      createNotice: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'notice-2', name: '到货乙' },
      }),
      updateNotice: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'notice-1', name: '到货丙' },
      }),
    },
  },
}));

vi.mock('@/api/finance', () => ({
  financeApi: {
    receivablePayable: {
      listCollections: vi.fn().mockResolvedValue({
        success: true,
        data: { items: [{ id: 'col-1', amount: 100 }], total: 1 },
      }),
      createCollection: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'col-2', amount: 200 },
      }),
    },
  },
}));

vi.mock('@/api/rd', () => ({
  rdApi: {
    listBuilds: vi.fn().mockResolvedValue({
      success: true,
      data: {
        builds: [{ id: 'build-1', project_id: 'p1', status: 'success' }],
        total: 1,
      },
    }),
    createBuild: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'build-2', project_id: 'p1', status: 'running' },
    }),
  },
}));

describe('ScmPurchaseItemPage（自定义 adapter：透传 + 页面 key + delete 恒定抛）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('经 CrudPage 渲染（schema + breadcrumbs）', () => {
    render(<ScmPurchaseItemPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'purchaseItemSchema' },
        breadcrumbs: [{ label: 'SCM' }, { label: 'scm.scm_purchase_item_page.k4' }],
      })
    );
  });

  it('list 原样透传 + items 解包', async () => {
    render(<ScmPurchaseItemPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 2, pageSize: 20 });

    // 手写 adapter 无 createCrudPageAdapter 归一化层，params 原样透传
    expect(scmApi.purchaseItems.list).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
    expect(result).toEqual({ data: expect.any(Array), total: 1 });
  });

  it('create/update 委托 payload；delete 恒定抛"不支持删除"', async () => {
    render(<ScmPurchaseItemPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: '新采购项' })).resolves.toEqual({
      id: 'item-2',
      name: '采购项乙',
    });
    await expect(props.apiAdapter.update('item-1', { name: '改采购项' })).resolves.toEqual({
      id: 'item-1',
      name: '采购项丙',
    });
    await expect(props.apiAdapter.delete('item-1')).rejects.toThrow(
      'scm.scm_purchase_item_page.k3'
    );

    expect(scmApi.purchaseItems.create).toHaveBeenCalledWith({ name: '新采购项' });
    expect(scmApi.purchaseItems.update).toHaveBeenCalledWith('item-1', { name: '改采购项' });
  });

  it('list/create/update 失败抛页面自有 key', async () => {
    scmApi.purchaseItems.list.mockResolvedValueOnce({ success: false, data: null });
    scmApi.purchaseItems.create.mockResolvedValueOnce({ success: false, data: null });
    scmApi.purchaseItems.update.mockResolvedValueOnce({ success: false, data: null });

    render(<ScmPurchaseItemPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({ page: 1, pageSize: 10 })).rejects.toThrow(
      'scm.scm_purchase_item_page.k0'
    );
    await expect(props.apiAdapter.create({ name: 'x' })).rejects.toThrow(
      'scm.scm_purchase_item_page.k1'
    );
    await expect(props.apiAdapter.update('item-1', { name: 'x' })).rejects.toThrow(
      'scm.scm_purchase_item_page.k2'
    );
  });
});

describe('ScmIncomingNoticePage（自定义 adapter：listNotices 透传 + delete 恒定抛）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('经 CrudPage 渲染（schema + breadcrumbs）', () => {
    render(<ScmIncomingNoticePage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'incomingNoticeSchema' },
        breadcrumbs: [{ label: 'SCM' }, { label: 'scm.scm_incoming_notice_page.k4' }],
      })
    );
  });

  it('list 原样透传 + items 解包', async () => {
    render(<ScmIncomingNoticePage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 2, pageSize: 20 });

    expect(scmApi.incomingInspections.listNotices).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
    });
    expect(result).toEqual({ data: expect.any(Array), total: 1 });
  });

  it('create/update 委托 payload；delete 恒定抛（后端无 DELETE 路由）', async () => {
    render(<ScmIncomingNoticePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ name: '新到货' })).resolves.toEqual({
      id: 'notice-2',
      name: '到货乙',
    });
    await expect(props.apiAdapter.update('notice-1', { name: '改到货' })).resolves.toEqual({
      id: 'notice-1',
      name: '到货丙',
    });
    await expect(props.apiAdapter.delete('notice-1')).rejects.toThrow(
      'scm.scm_incoming_notice_page.k3'
    );

    expect(scmApi.incomingInspections.createNotice).toHaveBeenCalledWith({ name: '新到货' });
    expect(scmApi.incomingInspections.updateNotice).toHaveBeenCalledWith('notice-1', {
      name: '改到货',
    });
  });

  it('list/create/update 失败抛页面自有 key', async () => {
    scmApi.incomingInspections.listNotices.mockResolvedValueOnce({ success: false, data: null });
    scmApi.incomingInspections.createNotice.mockResolvedValueOnce({ success: false, data: null });
    scmApi.incomingInspections.updateNotice.mockResolvedValueOnce({ success: false, data: null });

    render(<ScmIncomingNoticePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({ page: 1, pageSize: 10 })).rejects.toThrow(
      'scm.scm_incoming_notice_page.k0'
    );
    await expect(props.apiAdapter.create({ name: 'x' })).rejects.toThrow(
      'scm.scm_incoming_notice_page.k1'
    );
    await expect(props.apiAdapter.update('notice-1', { name: 'x' })).rejects.toThrow(
      'scm.scm_incoming_notice_page.k2'
    );
  });
});

describe('FinanceReceiptPage（createCrudPageAdapter + update/delete no-op 桩）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('经 CrudPage 渲染（schema + breadcrumbs）', () => {
    render(<FinanceReceiptPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'receiptSchema' },
        breadcrumbs: [
          { label: 'finance.finance_receipt_page.k1' },
          { label: 'finance.finance_receipt_page.k0' },
        ],
      })
    );
  });

  it('list 参数归一化 + 响应解包', async () => {
    render(<FinanceReceiptPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 2, pageSize: 20 });

    expect(financeApi.receivablePayable.listCollections).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
    });
    expect(result).toEqual({ data: expect.any(Array), total: 1 });
  });

  it('create 委托；update 原样返回 data（no-op 桩）；delete 返回 undefined', async () => {
    render(<FinanceReceiptPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ amount: 300 })).resolves.toEqual({
      id: 'col-2',
      amount: 200,
    });
    // update 为 no-op 桩：自定义 update 返回 data 原样（无 ApiResponse 信封），
    // 经 createCrudPageAdapter 包装后 raw.data 缺失 → 返回 {}（照真实行为）
    await expect(props.apiAdapter.update('col-1', { amount: 999 })).resolves.toEqual({});
    await expect(props.apiAdapter.delete('col-1')).resolves.toBeUndefined();

    expect(financeApi.receivablePayable.createCollection).toHaveBeenCalledWith({ amount: 300 });
  });

  it('list/create 失败抛 crud 翻译（无 message 时）', async () => {
    financeApi.receivablePayable.listCollections.mockResolvedValueOnce({
      success: false,
      data: null,
    });
    financeApi.receivablePayable.createCollection.mockResolvedValueOnce({
      success: false,
      data: null,
    });

    render(<FinanceReceiptPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({ page: 1, pageSize: 10 })).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({ amount: 1 })).rejects.toThrow('创建失败');
  });
});

describe('RsMilestonePage（动态 schema + 手写 adapter：固定 create payload / update/delete 恒定抛）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('经 CrudPage 渲染（动态 schema + breadcrumbs）', () => {
    render(<RsMilestonePage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'milestoneSchema' },
        breadcrumbs: [
          { label: 'rd.rs_milestone_page.k5', href: '/rd' },
          { label: 'rd.rs_milestone_page.k4' },
        ],
      })
    );
  });

  it('list 参数归一化 + builds 解包', async () => {
    render(<RsMilestonePage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 2, pageSize: 20, search: '甲' });

    expect(rdApi.listBuilds).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: '甲',
    });
    expect(result).toEqual({ data: expect.any(Array), total: 1 });
  });

  it('create 固定 payload 委托；update/delete 恒定抛', async () => {
    render(<RsMilestonePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({})).resolves.toEqual(expect.any(Object));
    expect(rdApi.createBuild).toHaveBeenCalledWith({
      project_id: 'default',
      branch: 'main',
      commit_hash: 'HEAD',
      build_type: 'manual',
    });

    await expect(props.apiAdapter.update('build-1', {})).rejects.toThrow('rd.rs_milestone_page.k2');
    await expect(props.apiAdapter.delete('build-1')).rejects.toThrow('rd.rs_milestone_page.k3');
  });

  it('list 失败抛页面自有 key', async () => {
    rdApi.listBuilds.mockResolvedValueOnce({ success: false, data: null });

    render(<RsMilestonePage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({ page: 1, pageSize: 10 })).rejects.toThrow(
      'rd.rs_milestone_page.k0'
    );
  });
});
