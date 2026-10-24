import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkOrderPage from '../mes/WorkOrderPage';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';

// WorkOrderPage 在模块加载时即调用 createCrudPageAdapter(mesApi.workOrders, { itemsField: 'work_orders' })，
// setup-mocks 将其 mock 为直通(api)=>api，这里恢复真实实现以验证
// 参数归一化(pageSize→page_size)/itemsField 响应解包/错误翻译。
vi.unmock('@/schema/crudPageAdapter');

// 真实适配器直接用全局 i18n.t（非 react-i18next hook），显式提供 crud_page_adapter
// 翻译表（与 locales/zh/schema.json 一致），避免 t() 返回原始 key。
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

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/mes', () => ({
  workOrderSchema: { name: 'workOrderSchema' },
}));

vi.mock('@/api/mes', () => ({
  mesApi: {
    workOrders: {
      list: vi.fn().mockResolvedValue({
        success: true,
        data: {
          work_orders: [{ id: 'wo-1', order_no: 'WO-001', status: 'pending' }],
          total: 1,
        },
      }),
      create: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'wo-2', order_no: 'WO-002', status: 'pending' },
      }),
      update: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'wo-1', order_no: 'WO-001', status: 'in_progress' },
      }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      start: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'wo-1', status: 'in_progress' },
      }),
      pause: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'wo-1', status: 'paused' },
      }),
      complete: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'wo-1', status: 'completed' },
      }),
      cancel: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'wo-1', status: 'cancelled' },
      }),
      resume: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'wo-1', status: 'in_progress' },
      }),
    },
  },
}));

const addNotification = () =>
  (
    useNotificationStore as unknown as {
      getState: () => { addNotification: ReturnType<typeof vi.fn> };
    }
  ).getState().addNotification;

describe('WorkOrderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders through CrudPage with work order schema, MES breadcrumbs and five row actions', () => {
    render(<WorkOrderPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(mockCrudPage).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: { name: 'workOrderSchema' },
        breadcrumbs: [{ label: 'MES' }, { label: 'mes.work_order_page.k10' }],
      })
    );
    const props = mockCrudPage.mock.calls[0][0];
    expect(props.customRowActions).toHaveLength(5);
    expect(props.customRowActions.map((a: { label: string }) => a.label)).toEqual([
      'mes.work_order_page.k5',
      'mes.work_order_page.k6',
      'mes.work_order_page.k7',
      'mes.work_order_page.k8',
      'mes.work_order_page.k9',
    ]);
  });

  it('normalizes list params (pageSize→page_size) and unpacks work_orders response', async () => {
    render(<WorkOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: 'WO',
      status: 'pending',
    });

    expect(mesApi.workOrders.list).toHaveBeenCalledWith({
      page: 2,
      page_size: 20,
      search: 'WO',
      status: 'pending',
    });
    expect(result).toEqual({
      data: [{ id: 'wo-1', order_no: 'WO-001', status: 'pending' }],
      total: 1,
    });
  });

  it('delegates create, update and delete with payload and unpacks returned data', async () => {
    render(<WorkOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({ order_no: 'WO-002' })).resolves.toEqual({
      id: 'wo-2',
      order_no: 'WO-002',
      status: 'pending',
    });
    await expect(props.apiAdapter.update('wo-1', { status: 'in_progress' })).resolves.toEqual({
      id: 'wo-1',
      order_no: 'WO-001',
      status: 'in_progress',
    });
    await expect(props.apiAdapter.delete('wo-1')).resolves.toBeUndefined();

    expect(mesApi.workOrders.create).toHaveBeenCalledWith({ order_no: 'WO-002' });
    expect(mesApi.workOrders.update).toHaveBeenCalledWith('wo-1', { status: 'in_progress' });
    expect(mesApi.workOrders.delete).toHaveBeenCalledWith('wo-1');
  });

  it('throws translated errors when work order API operations fail', async () => {
    vi.mocked(mesApi.workOrders.list).mockResolvedValueOnce({ success: false, data: null });
    vi.mocked(mesApi.workOrders.create).mockResolvedValueOnce({ success: false });
    vi.mocked(mesApi.workOrders.update).mockResolvedValueOnce({ success: false });
    vi.mocked(mesApi.workOrders.delete).mockResolvedValueOnce({ success: false });

    render(<WorkOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({})).rejects.toThrow('加载列表失败');
    await expect(props.apiAdapter.create({})).rejects.toThrow('创建失败');
    await expect(props.apiAdapter.update('wo-1', {})).rejects.toThrow('更新失败');
    await expect(props.apiAdapter.delete('wo-1')).rejects.toThrow('删除失败');
  });

  it('start row action calls workOrders.start(id), notifies success and invalidates queries', async () => {
    render(<WorkOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await props.customRowActions[0].onClick({ id: 'wo-1' });

    expect(mesApi.workOrders.start).toHaveBeenCalledWith('wo-1');
    expect(addNotification()).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    expect(useQueryClient().invalidateQueries).toHaveBeenCalled();
  });

  it('row action failure shows error notification without invalidating queries', async () => {
    vi.mocked(mesApi.workOrders.complete).mockResolvedValueOnce({
      success: false,
      message: '状态错误',
    });

    render(<WorkOrderPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await props.customRowActions[2].onClick({ id: 'wo-1' });

    expect(mesApi.workOrders.complete).toHaveBeenCalledWith('wo-1');
    expect(addNotification()).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: '状态错误' })
    );
    expect(useQueryClient().invalidateQueries).not.toHaveBeenCalled();
  });
});
