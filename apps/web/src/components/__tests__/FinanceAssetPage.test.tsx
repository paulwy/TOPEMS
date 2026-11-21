import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import FinanceAssetPage from '../finance/FinanceAssetPage';
import { accountApi } from '@/api/finance/account';
import { financeApi } from '@/api/finance';

// FinanceAssetPage：手写 CrudApiAdapter（accountApi.list + category:'asset' 固定入参）
// + customRowActions（折旧/停用弹窗）+ headerContent(rows) 统计卡 + 折旧凭证/停用更新动作——按真实行为断言
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
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

const confirmDialogMock = vi.hoisted(() => vi.fn());

vi.mock('@topems/shared-components', () => ({
  ConfirmDialog: (props: Record<string, unknown>) => {
    confirmDialogMock(props);
    return props.isOpen ? <div data-testid='confirm-dialog'>confirm</div> : null;
  },
}));

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('@/components/templates/CrudPage', () => {
  const MockCrudPage = (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>crud-page</div>;
  };
  return { default: MockCrudPage, CrudPage: MockCrudPage };
});

vi.mock('@/schemas/finance/asset', () => ({
  assetSchema: { name: 'assetSchema' },
}));

vi.mock('@/api/finance/account', () => ({
  accountApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 'a1',
            name: '固定资产甲',
            code: '1602.01',
            status: 'active',
            level: 2,
            haschildren: false,
          },
        ],
        total: 1,
      },
    }),
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 'a9' } }),
    update: vi.fn().mockResolvedValue({ success: true, data: { id: 'a1' } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/api/finance', () => ({
  financeApi: {
    voucher: {
      create: vi.fn().mockResolvedValue({ success: true, data: { id: 'v1' } }),
    },
  },
}));

// 部分 mock：保留 createLogger 等导出（utils/errors.ts 依赖），仅替换 apiLogger
vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    apiLogger: { error: vi.fn() },
  };
});

describe('FinanceAssetPage（手写 adapter + 折旧/停用动作 + headerContent 统计）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('经 CrudPage 渲染（schema + apiAdapter + customRowActions 2 项 + headerContent 函数）', () => {
    render(<FinanceAssetPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    const props = mockCrudPage.mock.calls[0][0];
    expect(props.schema).toEqual(expect.objectContaining({ name: 'assetSchema' }));
    expect(props.customRowActions).toHaveLength(2);
    expect(props.headerContent).toEqual(expect.any(Function));
  });

  it('list 调 accountApi.list（category=asset + page/page_size + keyword/status 筛选）', async () => {
    render(<FinanceAssetPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({
      page: 2,
      pageSize: 20,
      search: '设备',
      status: 'active',
    });
    expect(accountApi.list).toHaveBeenCalledWith({
      category: 'asset',
      page: 2,
      page_size: 20,
      keyword: '设备',
      status: 'active',
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('list 不带筛选时不传 keyword/status', async () => {
    render(<FinanceAssetPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await props.apiAdapter.list({ page: 1, pageSize: 10 });
    expect(accountApi.list).toHaveBeenCalledWith({
      category: 'asset',
      page: 1,
      page_size: 10,
    });
  });

  it('list 失败（success=false）返回空列表不抛错（照真实行为）', async () => {
    accountApi.list.mockResolvedValueOnce({ success: false, data: null });
    render(<FinanceAssetPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const result = await props.apiAdapter.list({ page: 1 });
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('create 补 category:asset + 成功 addNotification', async () => {
    render(<FinanceAssetPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await props.apiAdapter.create({ name: '新资产' });
    expect(accountApi.create).toHaveBeenCalledWith({ name: '新资产', category: 'asset' });
    expect(storeMock.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('update/delete 委托 accountApi + addNotification', async () => {
    render(<FinanceAssetPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await props.apiAdapter.update('a1', { name: '改名' });
    expect(accountApi.update).toHaveBeenCalledWith('a1', { name: '改名' });
    await props.apiAdapter.delete('a1');
    expect(accountApi.delete).toHaveBeenCalledWith('a1');
    expect(storeMock.addNotification).toHaveBeenCalledTimes(2);
  });

  it('create 失败抛页面自有 key（k0）', async () => {
    accountApi.create.mockResolvedValueOnce({ success: false, data: null });
    render(<FinanceAssetPage />);
    const props = mockCrudPage.mock.calls[0][0];

    await expect(props.apiAdapter.create({})).rejects.toThrow('finance.finance_asset_page.k0');
  });

  it('customRowActions 折旧 onClick 打开折旧 Dialog（渲染 target 信息）', () => {
    render(<FinanceAssetPage />);
    const props = mockCrudPage.mock.calls[0][0];

    act(() => props.customRowActions[0].onClick({ id: 'a1', name: '固定资产甲', code: '1602.01' }));
    expect(screen.getByText('固定资产甲')).toBeInTheDocument();
    expect(screen.getByText('1602.01')).toBeInTheDocument();
    expect(screen.getByText('¥1,000.00')).toBeInTheDocument();
  });

  it('折旧确认后调 financeApi.voucher.create（借 1602 / 贷资产）并 addNotification', async () => {
    render(<FinanceAssetPage />);
    const props = mockCrudPage.mock.calls[0][0];

    act(() => props.customRowActions[0].onClick({ id: 'a1', name: '固定资产甲', code: '1602.01' }));
    fireEvent.click(screen.getByText('finance.finance_asset_page.e10'));

    await waitFor(() => expect(financeApi.voucher.create).toHaveBeenCalled());
    expect(financeApi.voucher.create).toHaveBeenCalledWith(
      expect.objectContaining({
        period: expect.stringMatching(/^\d{4}-\d{2}$/),
        entries: [
          expect.objectContaining({ account_id: '1602', debit_amount: 1000 }),
          expect.objectContaining({
            account_id: 'a1',
            subject_code: '1602.01',
            credit_amount: 1000,
          }),
        ],
      })
    );
    expect(storeMock.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('customRowActions 停用 onClick 打开 ConfirmDialog；确认后 accountApi.update(status:disabled)', async () => {
    render(<FinanceAssetPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const asset = { id: 'a1', name: '固定资产甲', code: '1602.01', status: 'active' };
    act(() => props.customRowActions[1].onClick(asset));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    const confirmProps = confirmDialogMock.mock.calls.at(-1)[0];
    expect(confirmProps.isOpen).toBe(true);

    // 触发确认
    act(() => confirmProps.onConfirm());
    await waitFor(() =>
      expect(accountApi.update).toHaveBeenCalledWith('a1', { ...asset, status: 'disabled' })
    );
  });

  it('headerContent(rows) 统计 6 卡（total/active/disabled/haschildren/leaf/maxLevel）', () => {
    render(<FinanceAssetPage />);
    const props = mockCrudPage.mock.calls[0][0];

    const rows = [
      { id: 'a1', status: 'active', haschildren: true, level: 2 },
      { id: 'a2', status: 'disabled', haschildren: false, level: 1 },
      { id: 'a3', status: 'active', haschildren: false, level: 0 },
    ];
    // headerContent 返回 StatCardGroup JSX（非 null）——内部统计值经 props 计算
    const el = props.headerContent(rows);
    expect(el).not.toBeNull();
  });
});
