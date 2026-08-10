import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import type {
  ABCAnalysisItem,
  InventoryStatistics,
  InventoryTurnoverData,
  InventoryValueByWarehouse,
  Warehouse,
} from '@/api/wms';
import {
  InventoryReportABCOverview,
  InventoryReportTurnoverSummary,
  InventoryReportValueDistribution,
} from '../InventoryReportChart';
import InventoryReportFilters, {
  InventoryReportFilterHint,
  TabPanel,
} from '../InventoryReportFilters';
import InventoryReportSummary from '../InventoryReportSummary';
import {
  InventoryReportABCTable,
  InventoryReportEmptyState,
  InventoryReportTurnoverTable,
  InventoryReportValueByWarehouseTable,
} from '../InventoryReportTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

vi.mock('lucide-react', () => ({
  AlertTriangle: () => <svg data-testid='icon-alert' />,
  BarChart3: () => <svg data-testid='icon-bar-chart' />,
  Clock: () => <svg data-testid='icon-clock' />,
  Package: () => <svg data-testid='icon-package' />,
  TrendingDown: () => <svg data-testid='icon-trending-down' />,
  TrendingUp: () => <svg data-testid='icon-trending-up' />,
  Warehouse: () => <svg data-testid='icon-warehouse' />,
}));

vi.mock('@/components/common', () => ({
  Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const formatNumber = (num: number) => num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
const getABCCategoryColor = (category: string) =>
  category === 'A' ? 'error' : category === 'B' ? 'warning' : 'success';

const statistics: InventoryStatistics = {
  total_quantity: 128000,
  total_value: 3560000,
  totalitems: 1200,
  total_sku_count: 320,
  warehouse_count: 4,
  location_count: 80,
  low_stockitems: 12,
  out_of_stockitems: 3,
  over_stockitems: 5,
  average_turnover_days: 42,
  turnover_rate: 8.6,
};

const warehouses: Warehouse[] = [
  {
    id: 'w1',
    name: '华东仓',
    code: 'WH-EAST',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'w2',
    name: '华南仓',
    code: 'WH-SOUTH',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

const abcAnalysis: ABCAnalysisItem[] = [
  {
    category: 'A',
    sku_count: 10,
    sku_percentage: 0.1,
    total_value: 2000000,
    value_percentage: 0.72,
    cumulative_value_percentage: 0.72,
  },
  {
    category: 'B',
    sku_count: 30,
    sku_percentage: 0.3,
    total_value: 600000,
    value_percentage: 0.2,
    cumulative_value_percentage: 0.92,
  },
  {
    category: 'C',
    sku_count: 60,
    sku_percentage: 0.6,
    total_value: 220000,
    value_percentage: 0.08,
    cumulative_value_percentage: 1,
  },
];

const turnoverData: InventoryTurnoverData[] = [
  {
    period: '2026-01',
    turnover_rate: 4.25,
    turnover_days: 85,
    cost_of_goods_sold: 450000,
    average_inventory_value: 105000,
  },
  {
    period: '2026-02',
    turnover_rate: 5.5,
    turnover_days: 66,
    cost_of_goods_sold: 520000,
    average_inventory_value: 125000,
  },
];

const valueByWarehouse: InventoryValueByWarehouse[] = [
  {
    warehouse_id: 'w1',
    warehouse_name: '华东仓',
    total_quantity: 80000,
    total_value: 2400000,
    sku_count: 180,
  },
  {
    warehouse_id: 'w2',
    warehouse_name: '华南仓',
    total_quantity: 48000,
    total_value: 1200000,
    sku_count: 140,
  },
];

describe('InventoryReport 组件渲染测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('汇总卡片渲染库存统计和告警概览', () => {
    renderWithProviders(
      <InventoryReportSummary
        statistics={statistics}
        formatNumber={formatNumber}
      />
    );

    expect(screen.getByText('wms.inventory_report_page.field_warehouse_count')).toBeInTheDocument();
    expect(screen.getByText('wms.inventory_report_page.field_material_types')).toBeInTheDocument();
    expect(screen.getByText('128,000')).toBeInTheDocument();
    expect(screen.getByText('¥3,560,000')).toBeInTheDocument();
    expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('wms.inventory_report_page.alert_attention')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('汇总卡片在统计为空时渲染默认 0', () => {
    renderWithProviders(
      <InventoryReportSummary
        statistics={undefined}
        formatNumber={formatNumber}
      />
    );

    expect(
      screen.getByText('wms.inventory_report_page.section_alert_overview')
    ).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(6);
  });

  it('筛选器渲染 Tabs 和仓库下拉，并触发回调', () => {
    const onTabChange = vi.fn();
    const onWarehouseFilterChange = vi.fn();

    renderWithProviders(
      <InventoryReportFilters
        currentTab={0}
        onTabChange={onTabChange}
        warehouseFilter=''
        onWarehouseFilterChange={onWarehouseFilterChange}
        warehouses={warehouses}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'wms.inventory_report_page.tab_abc' }));
    expect(onTabChange).toHaveBeenCalledWith(1);

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: '华南仓' }));
    expect(onWarehouseFilterChange).toHaveBeenCalledWith('w2');
  });

  it('TabPanel 只显示当前激活面板内容，辅助提示正常渲染', () => {
    renderWithProviders(
      <>
        <TabPanel
          value={1}
          index={1}
        >
          激活内容
        </TabPanel>
        <TabPanel
          value={1}
          index={2}
        >
          隐藏内容
        </TabPanel>
        <InventoryReportFilterHint text='筛选提示' />
      </>
    );

    expect(screen.getByText('激活内容')).toBeInTheDocument();
    expect(screen.queryByText('隐藏内容')).not.toBeInTheDocument();
    expect(screen.getByText('筛选提示')).toBeInTheDocument();
  });

  it('ABC 概览渲染 A/B/C 分类数量和总 SKU', () => {
    renderWithProviders(
      <InventoryReportABCOverview
        abcAnalysis={abcAnalysis}
        abcTotalSku={100}
      />
    );

    expect(screen.getByText('wms.inventory_report_page.abc_overview_title')).toBeInTheDocument();
    expect(screen.getByText('wms.inventory_report_page.abc_a_label')).toBeInTheDocument();
    expect(screen.getByText('wms.inventory_report_page.abc_b_label')).toBeInTheDocument();
    expect(screen.getByText('wms.inventory_report_page.abc_c_label')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(3);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('周转汇总使用最新一期数据，空数据时回退默认值', () => {
    const { rerender } = renderWithProviders(
      <InventoryReportTurnoverSummary
        turnoverData={turnoverData}
        formatNumber={formatNumber}
      />
    );

    expect(screen.getByText('wms.inventory_report_page.turnover_title')).toBeInTheDocument();
    expect(screen.getByText('5.50')).toBeInTheDocument();
    expect(screen.getByText('66')).toBeInTheDocument();
    expect(screen.getByText('¥125,000')).toBeInTheDocument();

    rerender(
      <InventoryReportTurnoverSummary
        turnoverData={[]}
        formatNumber={formatNumber}
      />
    );
    expect(screen.getByText('0.00')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  it('仓库价值分布渲染占比和空态', () => {
    const { rerender } = renderWithProviders(
      <InventoryReportValueDistribution
        valueByWarehouse={valueByWarehouse}
        totalWarehouseValue={3600000}
        formatNumber={formatNumber}
      />
    );

    expect(
      screen.getByText('wms.inventory_report_page.value_distribution_title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('wms.inventory_report_page.total_value_currency:3,600,000')
    ).toBeInTheDocument();
    expect(screen.getByText('华东仓')).toBeInTheDocument();
    expect(screen.getByText('¥2,400,000 (66.7%)')).toBeInTheDocument();
    expect(screen.getByText('SKU: 180')).toBeInTheDocument();
    expect(screen.getByText('wms.inventory_report_page.quantity_label:80,000')).toBeInTheDocument();

    rerender(
      <InventoryReportValueDistribution
        valueByWarehouse={[]}
        totalWarehouseValue={0}
        formatNumber={formatNumber}
      />
    );
    expect(screen.getByText('wms.inventory_report_page.empty_data')).toBeInTheDocument();
  });

  it('ABC 明细表渲染百分比、金额和空态', () => {
    const { rerender } = renderWithProviders(
      <InventoryReportABCTable
        abcAnalysis={abcAnalysis}
        formatNumber={formatNumber}
        getABCCategoryColor={getABCCategoryColor}
      />
    );

    expect(screen.getByText('wms.inventory_report_page.abc_detail_title')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('10.00%')).toBeInTheDocument();
    expect(screen.getByText('¥2,000,000')).toBeInTheDocument();
    expect(screen.getAllByText('72.00%')).toHaveLength(2);
    expect(screen.getByText('100.00%')).toBeInTheDocument();

    rerender(
      <InventoryReportABCTable
        abcAnalysis={[]}
        formatNumber={formatNumber}
        getABCCategoryColor={getABCCategoryColor}
      />
    );
    expect(screen.getByText('wms.inventory_report_page.empty_data')).toBeInTheDocument();
  });

  it('周转明细表渲染周期数据和空态', () => {
    const { rerender } = renderWithProviders(
      <InventoryReportTurnoverTable
        turnoverData={turnoverData}
        formatNumber={formatNumber}
      />
    );

    expect(screen.getByText('wms.inventory_report_page.turnover_detail_title')).toBeInTheDocument();
    expect(screen.getByText('2026-01')).toBeInTheDocument();
    expect(screen.getByText('4.25')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('¥450,000')).toBeInTheDocument();

    rerender(
      <InventoryReportTurnoverTable
        turnoverData={[]}
        formatNumber={formatNumber}
      />
    );
    expect(screen.getByText('wms.inventory_report_page.empty_data')).toBeInTheDocument();
  });

  it('仓库价值表和通用空态正常渲染', () => {
    const { rerender } = renderWithProviders(
      <InventoryReportValueByWarehouseTable
        valueByWarehouse={valueByWarehouse}
        totalWarehouseValue={3600000}
        formatNumber={formatNumber}
      />
    );

    expect(
      screen.getByText('wms.inventory_report_page.warehouse_inventory_detail')
    ).toBeInTheDocument();
    expect(screen.getByText('华东仓')).toBeInTheDocument();
    expect(screen.getByText('66.67%')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('33.33%')).toBeInTheDocument();

    rerender(
      <InventoryReportValueByWarehouseTable
        valueByWarehouse={[]}
        totalWarehouseValue={0}
        formatNumber={formatNumber}
      />
    );
    expect(screen.getByText('wms.inventory_report_page.empty_data')).toBeInTheDocument();

    rerender(<InventoryReportEmptyState />);
    expect(screen.getByText('wms.inventory_report_page.empty_data')).toBeInTheDocument();
  });
});
