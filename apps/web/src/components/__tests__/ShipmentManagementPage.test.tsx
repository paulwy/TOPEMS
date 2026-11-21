import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ShipmentManagementPage from '../tms/ShipmentManagementPage';
import { shipmentApi } from '@/api/tms';

// ShipmentManagementPage：ListPageTemplate（templates）crud.api=shipmentApi 直通（无归一化层）
// + 3 个状态流转 useMutation（dispatch/arrive/cancel → shipmentApi.* + invalidate）——按真实行为断言
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    exists: () => true,
  },
}));

const invalidateMock = vi.hoisted(() => vi.fn());

// 部分 mock：useMutation 保留 mutationFn 真实调用（mutate 透传 id → shipmentApi.*）
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useMutation: (opts: { mutationFn: (id: string) => unknown }) => ({
      mutate: (id: string) => {
        // 同步触发 mutationFn + onSuccess（照真实行为：成功后 invalidate）
        Promise.resolve(opts.mutationFn(id)).then(() => {
          if (opts.onSuccess) opts.onSuccess();
        });
      },
    }),
    useQueryClient: () => ({
      invalidateQueries: invalidateMock,
    }),
  };
});

const mockListPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/ListPageTemplate', () => {
  const MockListPage = (props: Record<string, unknown>) => {
    mockListPage(props);
    return <div data-testid='list-page-template'>list-page-template</div>;
  };
  return { default: MockListPage, ListPageTemplate: MockListPage };
});

vi.mock('@/api/tms', () => ({
  shipmentApi: {
    list: vi.fn().mockResolvedValue({ success: true, data: { items: [], total: 0 } }),
    create: vi.fn().mockResolvedValue({ success: true, data: {} }),
    update: vi.fn().mockResolvedValue({ success: true, data: {} }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    dispatch: vi.fn().mockResolvedValue({ success: true, data: {} }),
    arrive: vi.fn().mockResolvedValue({ success: true, data: {} }),
    cancel: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

describe('ShipmentManagementPage（ListPageTemplate + 状态流转 actions）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('经 ListPageTemplate 渲染（title/subtitle/columns/globalSearch/crud 配置）', () => {
    render(<ShipmentManagementPage />);

    expect(screen.getByTestId('list-page-template')).toBeInTheDocument();
    const props = mockListPage.mock.calls[0][0];
    expect(props.title).toBe('tms.shipment_management_page.k18');
    expect(props.crud).toEqual(
      expect.objectContaining({
        queryKey: 'tms-shipments',
        entityName: 'tms.shipment_management_page.k18',
        pageParamName: 'page',
        pageSizeParamName: 'pageSize',
        searchParamName: 'search',
      })
    );
    expect(props.columns.length).toBeGreaterThanOrEqual(5);
    expect(props.globalSearch.fields).toContain('shipment_no');
    // rowActions 在 crud 配置内（非顶层 props）
    expect(props.crud.rowActions).toHaveLength(3);
  });

  it('crud.api.list 直通 shipmentApi.list（无归一化——pageSize 原样透传）', async () => {
    render(<ShipmentManagementPage />);
    const props = mockListPage.mock.calls[0][0];

    await props.crud.api.list({ page: 2, pageSize: 20 });
    expect(shipmentApi.list).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
  });

  it('rowActions show 条件：dispatch 仅 pending、arrive 仅 in_transit、cancel pending|in_transit', () => {
    render(<ShipmentManagementPage />);
    const props = mockListPage.mock.calls[0][0];

    const [dispatch, arrive, cancel] = props.crud.rowActions;
    expect(dispatch.show({ status: 'pending' })).toBe(true);
    expect(dispatch.show({ status: 'in_transit' })).toBe(false);
    expect(arrive.show({ status: 'in_transit' })).toBe(true);
    expect(arrive.show({ status: 'pending' })).toBe(false);
    expect(cancel.show({ status: 'pending' })).toBe(true);
    expect(cancel.show({ status: 'in_transit' })).toBe(true);
    expect(cancel.show({ status: 'delivered' })).toBe(false);
  });

  it('dispatch onClick → shipmentApi.dispatch(id) + invalidate', async () => {
    render(<ShipmentManagementPage />);
    const props = mockListPage.mock.calls[0][0];

    await props.crud.rowActions[0].onClick({ id: 's1', status: 'pending' });
    await waitFor(() => expect(shipmentApi.dispatch).toHaveBeenCalledWith('s1'));
    expect(invalidateMock).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['tms-shipments'] })
    );
  });

  it('arrive onClick → shipmentApi.arrive(id)', async () => {
    render(<ShipmentManagementPage />);
    const props = mockListPage.mock.calls[0][0];

    await props.crud.rowActions[1].onClick({ id: 's1', status: 'in_transit' });
    await waitFor(() => expect(shipmentApi.arrive).toHaveBeenCalledWith('s1'));
  });

  it('cancel onClick → shipmentApi.cancel(id)', async () => {
    render(<ShipmentManagementPage />);
    const props = mockListPage.mock.calls[0][0];

    await props.crud.rowActions[2].onClick({ id: 's1', status: 'pending' });
    await waitFor(() => expect(shipmentApi.cancel).toHaveBeenCalledWith('s1'));
  });

  it('crud.api create/update/delete 直通委托', async () => {
    render(<ShipmentManagementPage />);
    const props = mockListPage.mock.calls[0][0];

    await props.crud.api.create({ shipment_no: 'S-001' });
    expect(shipmentApi.create).toHaveBeenCalledWith({ shipment_no: 'S-001' });
    await props.crud.api.update('s1', { status: 'in_transit' });
    expect(shipmentApi.update).toHaveBeenCalledWith('s1', { status: 'in_transit' });
    await props.crud.api.delete('s1');
    expect(shipmentApi.delete).toHaveBeenCalledWith('s1');
  });
});
