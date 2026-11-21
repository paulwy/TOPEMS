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
});
