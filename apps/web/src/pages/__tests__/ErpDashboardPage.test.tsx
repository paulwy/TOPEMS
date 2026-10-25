import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../erp/DashboardPage';
import { erpApi } from '@/api/erp';

// DashboardPage：useQuery 拉取 erpApi.getDashboard → 8 统计卡 + 2 图表 + 6 快捷操作。
// setup-mocks 的 DashboardTemplate mock 仅渲染 stat cards（title+value），图表/快捷操作不渲染。
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    exists: () => true,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// 部分 mock：importOriginal 保 QueryCache（lib/reactQuery 依赖），仅覆盖 useQuery
const mockUseQuery = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useQuery: mockUseQuery,
  };
});

vi.mock('@/components/charts', () => ({
  LazyChart: () => <div data-testid='lazy-chart' />,
}));

vi.mock('@/modules/erp/config', () => ({
  ERP_PATHS: {
    voucherManagement: '/erp/voucher',
    budgetManagement: '/erp/budget',
    purchaseOrder: '/erp/purchase-order',
    assetManagement: '/erp/asset',
    customerManagement: '/erp/customer',
    supplierManagement: '/erp/supplier',
  },
}));

vi.mock('@/api/erp', () => ({
  erpApi: {
    getDashboard: vi.fn(),
  },
}));

describe('DashboardPage（useQuery 统计 + 8 张统计卡）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('加载态：不渲染统计卡（stats=[]）', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true } as never);
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('stat-card-total-assets')).not.toBeInTheDocument();
  });

  it('数据态：渲染 8 张统计卡（金额/数量 toLocaleString 格式化）', () => {
    mockUseQuery.mockReturnValue({
      data: {
        total_assets: 1000000,
        active_assets: 800000,
        total_inventory: 5000,
        pending_orders: 12,
        total_customers: 300,
        total_suppliers: 45,
        total_vouchers: 1200,
        pending_vouchers: 7,
        total_orders: 500,
        low_stock_items: 3,
        active_suppliers: 40,
      },
      isPending: false,
    } as never);

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // 8 张统计卡 id 全存在
    [
      'total-assets',
      'active-assets',
      'inventory-total',
      'pending-orders',
      'total-customers',
      'total-suppliers',
      'total-vouchers',
      'pending-vouchers',
    ].forEach((id) => {
      expect(screen.getByTestId(`stat-card-${id}`)).toBeInTheDocument();
    });

    // value 断言（toLocaleString）
    expect(screen.getByText('1,000,000')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();
  });

  it('空数据态（data=null）：stats=[] 不渲染卡', () => {
    mockUseQuery.mockReturnValue({ data: null, isPending: false } as never);
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('stat-card-total-assets')).not.toBeInTheDocument();
  });

  it('queryFn 调 erpApi.getDashboard', async () => {
    const response = { success: true, data: { total_assets: 100 } };
    vi.mocked(erpApi.getDashboard).mockResolvedValueOnce(response as never);

    mockUseQuery.mockImplementation((opts: any) => {
      opts.queryFn();
      return { data: response.data, isPending: false } as never;
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await vi.waitFor(() => {
      expect(erpApi.getDashboard).toHaveBeenCalledTimes(1);
    });
  });
});
