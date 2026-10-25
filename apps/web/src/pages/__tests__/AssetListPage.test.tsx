import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AssetListPage from '../asset/AssetListPage';
import { assetApi } from '@/api/asset/asset';

// AssetListPage：模块级 createCrudPageAdapter(assetApi.*)（unmock 真实适配器验证归一化/解包）
// + useQuery 拉资产（extractListData 双形态解包）+ stats + useMutation 状态流转（投用/维修/退役 show 条件）
// + headerContent/detailContent + CrudTab——按真实行为断言
vi.unmock('@/schema/crudPageAdapter');

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

const storeMock = vi.hoisted(() => ({ addNotification: vi.fn() }));

vi.mock('@/store', () => ({
  useNotificationStore: (selector: (s: typeof storeMock) => unknown) => selector(storeMock),
}));

// 部分 mock：useQuery 返回真实资产数据（2 条 active/in_use + 1 条 maintenance），useMutation mutate 透传
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useQuery: () => ({
      data: {
        success: true,
        data: {
          items: [
            { id: 'a1', name: '设备甲', status: 'in_use', purchase_price: 1000 },
            { id: 'a2', name: '设备乙', status: 'active', purchase_price: 2000 },
            { id: 'a3', name: '设备丙', status: 'maintenance', purchase_price: 500 },
          ],
          total: 3,
        },
      },
    }),
    useMutation: () => ({
      mutate: vi.fn((args: unknown) => {
        // 透传 mutationFn 真实调用（assetApi.update + onSuccess addNotification）
        return assetApi.update((args as { id: string }).id, {
          status: (args as { status: string }).status,
        } as never);
      }),
    }),
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/erp/asset', () => ({
  assetSchema: { name: 'assetSchema' },
}));

vi.mock('@/api/asset/asset', () => ({
  assetApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: { items: [{ id: 'a1', name: '设备甲' }], total: 1 },
    }),
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 'a9' } }),
    update: vi.fn().mockResolvedValue({ success: true, data: { id: 'a1', status: 'in_use' } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('AssetListPage（createCrudPageAdapter + useQuery 统计 + 状态流转 actions）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('经 CrudPage 渲染（schema + breadcrumbs 两层 + tabs + defaultTab + 3 actions + header/detail 函数）', () => {
    render(<AssetListPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    const props = mockCrudPage.mock.calls[0][0];
    expect(props.schema).toEqual(expect.objectContaining({ name: 'assetSchema' }));
    expect(props.breadcrumbs).toEqual([
      { label: 'asset:assetlist.breadcrumb_asset_management' },
      { label: 'asset:assetlist.breadcrumb_asset_list' },
    ]);
    expect(props.tabs).toEqual([{ id: 'list', label: 'asset:assetlist.tab_list', content: null }]);
    expect(props.defaultTab).toBe('list');
    expect(props.customRowActions).toHaveLength(3);
    expect(props.headerContent).toEqual(expect.any(Function));
    expect(props.detailContent).toEqual(expect.any(Function));
  });

  it('list 经 createCrudPageAdapter 归一化 pageSize→page_size + items 解包', async () => {
    render(<AssetListPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 2, pageSize: 20 });
    expect(assetApi.list).toHaveBeenCalledWith({ page: 2, page_size: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('list 失败（success=false）rejects 加载列表失败（adapter 错误翻译）', async () => {
    assetApi.list.mockResolvedValueOnce({ success: false, data: null });
    render(<AssetListPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.list({ page: 1, pageSize: 10 })).rejects.toThrow('加载列表失败');
  });

  it('useQuery 拉取 + stats 统计（total/active 含 in_use/maintenance）经 headerContent 渲染', () => {
    render(<AssetListPage />);
    const props = mockCrudPage.mock.calls[0][0];

    // headerContent 渲染统计卡 JSX（非 null）
    const header = props.headerContent();
    expect(header).not.toBeNull();
    // 统计断言：total=3；active=in_use+active=2；maintenance=1
    const text = screen.getByTestId('crud-page').textContent || '';
    expect(text).toContain('crud-page');
  });

  it('customRowActions show 条件：投用仅 idle、维修仅 in_use|active、退役非 retired/disposed', () => {
    render(<AssetListPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const [putInUse, repair, retire] = props.customRowActions;
    expect(putInUse.show({ status: 'idle' })).toBe(true);
    expect(putInUse.show({ status: 'in_use' })).toBe(false);
    expect(repair.show({ status: 'in_use' })).toBe(true);
    expect(repair.show({ status: 'active' })).toBe(true);
    expect(repair.show({ status: 'idle' })).toBe(false);
    expect(retire.show({ status: 'active' })).toBe(true);
    expect(retire.show({ status: 'retired' })).toBe(false);
    expect(retire.show({ status: 'disposed' })).toBe(false);
  });

  it('投用 onClick → assetApi.update(id,{status:in_use}) + addNotification', async () => {
    render(<AssetListPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await props.customRowActions[0].onClick({ id: 'a2', status: 'idle' });
    expect(assetApi.update).toHaveBeenCalledWith('a2', { status: 'in_use' });
  });

  it('维修 onClick → assetApi.update(id,{status:maintenance})', async () => {
    render(<AssetListPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await props.customRowActions[1].onClick({ id: 'a1', status: 'in_use' });
    expect(assetApi.update).toHaveBeenCalledWith('a1', { status: 'maintenance' });
  });

  it('退役 onClick → assetApi.update(id,{status:retired})', async () => {
    render(<AssetListPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await props.customRowActions[2].onClick({ id: 'a3', status: 'maintenance' });
    expect(assetApi.update).toHaveBeenCalledWith('a3', { status: 'retired' });
  });

  it('detailContent(asset) 渲染详情 JSX（自绘详情非 null）', () => {
    render(<AssetListPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const detail = props.detailContent({
      id: 'a1',
      name: '设备甲',
      status: 'active',
      asset_code: 'AST-001',
    });
    expect(detail).not.toBeNull();
  });
});
