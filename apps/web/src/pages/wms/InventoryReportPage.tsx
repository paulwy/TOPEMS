import React, { useState, useEffect, useMemo } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { BarChart3, Warehouse as WarehouseIcon } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { StatsPageTemplate, type TabItem } from '@/components/templates/StatsPageTemplate';
import { wmsApi } from '@/api/wms';
import type { InventoryStatistics, Warehouse } from '@/api/wms';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { useTranslation } from 'react-i18next';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

import { TabPanel } from './components/InventoryReportFilters';
import InventoryReportSummary from './components/InventoryReportSummary';
import {
  InventoryReportABCOverview,
  InventoryReportTurnoverSummary,
  InventoryReportValueDistribution,
} from './components/InventoryReportChart';
import {
  InventoryReportABCTable,
  InventoryReportTurnoverTable,
  InventoryReportValueByWarehouseTable,
} from './components/InventoryReportTable';

const ct = designTokens.colors;

const TAB_VALUES = {
  statistics: 'statistics',
  abc: 'abc',
  turnover: 'turnover',
  warehouse: 'warehouse',
} as const;

type TabValue = (typeof TAB_VALUES)[keyof typeof TAB_VALUES];

function WarehouseFilter({
  value,
  onChange,
  warehouses,
}: {
  value: string;
  onChange: (value: string) => void;
  warehouses: Warehouse[];
}) {
  const { t } = useTranslation();
  return (
    <FormControl
      size='small'
      sx={{ minWidth: 200 }}
    >
      <InputLabel>{t('wms.inventory_report_page.filter_warehouse_label')}</InputLabel>
      <Select
        value={value}
        label={t('wms.inventory_report_page.filter_warehouse')}
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value=''>{t('wms.inventory_report_page.all_warehouses')}</MenuItem>
        {warehouses.map((w) => (
          <MenuItem
            key={w.id}
            value={w.id}
          >
            {w.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const InventoryReportPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const [currentTab, setCurrentTab] = useState<TabValue>(TAB_VALUES.statistics);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');

  const warehousesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WMS_WAREHOUSES_BASE,
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, page_size: 100 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const warehouses = warehousesQuery.data || [];

  useEffect(() => {
    if (warehousesQuery.isError && warehousesQuery.error) {
      apiLogger.error(t('wms.inventory_report_page.list'), warehousesQuery.error);
    }
  }, [warehousesQuery.isError, warehousesQuery.error, t]);

  const statisticsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.WMS_INVENTORY_STATISTICS_BASE, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      const response = await wmsApi.inventoryStats.getStatistics(
        params as unknown as Record<string, unknown>
      );
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const statistics: InventoryStatistics | undefined = statisticsQuery.data ?? undefined;

  useEffect(() => {
    if (statisticsQuery.isError && statisticsQuery.error) {
      apiLogger.error(t('wms.inventory_report_page.fail'), statisticsQuery.error);
      addNotification({
        type: 'error',
        title: t('wms.inventory_report_page.fail_1'),
        message: t('wms.inventory_report_page.text_d6c5e2'),
      });
    }
  }, [statisticsQuery.isError, statisticsQuery.error, addNotification, t]);

  const abcAnalysisQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.WMS_ABC_ANALYSIS_BASE, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      const response = await wmsApi.inventoryStats.getABCAnalysis(
        params as unknown as Record<string, unknown>
      );
      if (response.success && response.data) {
        return {
          items: response.data.items || [],
          total_sku: response.data.total_sku || 0,
          total_value: response.data.total_value || 0,
        };
      }
      return { items: [], total_sku: 0, total_value: 0 };
    },
    staleTime: 5 * 60 * 1000,
    enabled: currentTab === TAB_VALUES.abc,
  });
  const abcAnalysis = abcAnalysisQuery.data?.items || [];
  const abcTotalSku = abcAnalysisQuery.data?.total_sku || 0;

  useEffect(() => {
    if (abcAnalysisQuery.isError && abcAnalysisQuery.error) {
      apiLogger.error(t('wms.inventory_report_page.fail_2'), abcAnalysisQuery.error);
      addNotification({
        type: 'error',
        title: t('wms.inventory_report_page.fail_1'),
        message: t('wms.inventory_report_page.text_cb3845'),
      });
    }
  }, [abcAnalysisQuery.isError, abcAnalysisQuery.error, addNotification, t]);

  const turnoverQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.WMS_TURNOVER_ANALYSIS_BASE, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        period_type: 'month',
        periods: 12,
      };
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      const response = await wmsApi.inventoryStats.getTurnover(
        params as unknown as Record<string, unknown>
      );
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: currentTab === TAB_VALUES.turnover,
  });
  const turnoverData = turnoverQuery.data || [];

  useEffect(() => {
    if (turnoverQuery.isError && turnoverQuery.error) {
      apiLogger.error(t('wms.inventory_report_page.fail_3'), turnoverQuery.error);
      addNotification({
        type: 'error',
        title: t('wms.inventory_report_page.fail_1'),
        message: t('wms.inventory_report_page.text_898624'),
      });
    }
  }, [turnoverQuery.isError, turnoverQuery.error, addNotification, t]);

  const valueByWarehouseQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.WMS_VALUE_BY_WAREHOUSE_BASE, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (warehouseFilter) params.category_id = warehouseFilter;
      const response = await wmsApi.inventoryStats.getValueByWarehouse(
        params as unknown as Record<string, unknown>
      );
      if (response.success && response.data) {
        return {
          items: response.data.items || [],
          total_value: response.data.total_value || 0,
        };
      }
      return { items: [], total_value: 0 };
    },
    staleTime: 5 * 60 * 1000,
    enabled: currentTab === TAB_VALUES.warehouse,
  });
  const valueByWarehouse = valueByWarehouseQuery.data?.items || [];
  const totalWarehouseValue = valueByWarehouseQuery.data?.total_value || 0;

  useEffect(() => {
    if (valueByWarehouseQuery.isError && valueByWarehouseQuery.error) {
      apiLogger.error(t('wms.inventory_report_page.fail_4'), valueByWarehouseQuery.error);
      addNotification({
        type: 'error',
        title: t('wms.inventory_report_page.fail_1'),
        message: t('wms.inventory_report_page.warehouse'),
      });
    }
  }, [valueByWarehouseQuery.isError, valueByWarehouseQuery.error, addNotification, t]);

  const getABCCategoryColor = (category: string) => {
    switch (category) {
      case 'A':
        return 'error';
      case 'B':
        return 'warning';
      case 'C':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(2)}${i18n.t('pages.inventory_report_page.k0')}`;
    }
    return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  };

  const tabs: TabItem[] = useMemo(
    () => [
      { label: t('wms.inventory_report_page.tab_statistics'), value: TAB_VALUES.statistics },
      { label: t('wms.inventory_report_page.tab_abc'), value: TAB_VALUES.abc },
      { label: t('wms.inventory_report_page.tab_turnover'), value: TAB_VALUES.turnover },
      { label: t('wms.inventory_report_page.tab_warehouse'), value: TAB_VALUES.warehouse },
    ],
    [t]
  );

  const tabIndex = useMemo(() => {
    const idx = tabs.findIndex((tab) => tab.value === currentTab);
    return idx === -1 ? 0 : idx;
  }, [currentTab, tabs]);

  const isLoading =
    (currentTab === TAB_VALUES.statistics && statisticsQuery.isLoading) ||
    (currentTab === TAB_VALUES.abc && abcAnalysisQuery.isLoading) ||
    (currentTab === TAB_VALUES.turnover && turnoverQuery.isLoading) ||
    (currentTab === TAB_VALUES.warehouse && valueByWarehouseQuery.isLoading);

  const handleRefresh = () => {
    warehousesQuery.refetch();
    statisticsQuery.refetch();
    abcAnalysisQuery.refetch();
    turnoverQuery.refetch();
    valueByWarehouseQuery.refetch();
  };

  return (
    <PageContainer
      title={t('wms.inventory_report_page.title')}
      subtitle={t('wms.inventory_report_page.subtitle')}
      headerProps={{
        pageIcon: <BarChart3 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]}, ${ct.secondary[600]})`,
      }}
    >
      <StatsPageTemplate
        title={t('wms.inventory_report_page.title')}
        subtitle={t('wms.inventory_report_page.subtitle')}
        tabs={tabs}
        tabValue={currentTab}
        onTabChange={(value) => setCurrentTab(value as TabValue)}
        showSearch={false}
        showTimeRange={false}
        showExport={false}
        showRefresh={true}
        onRefresh={handleRefresh}
        loading={isLoading}
        customToolbar={
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <WarehouseFilter
              value={warehouseFilter}
              onChange={setWarehouseFilter}
              warehouses={warehouses}
            />
          </Box>
        }
        statCards={
          currentTab === TAB_VALUES.statistics && statistics
            ? [
                {
                  id: 'warehouse_count',
                  title: t('wms.inventory_report_page.field_warehouse_count'),
                  value: statistics.warehouse_count || 0,
                  icon: <WarehouseIcon size={24} />,
                  color: 'secondary',
                },
                {
                  id: 'total_sku_count',
                  title: t('wms.inventory_report_page.field_material_types'),
                  value: statistics.total_sku_count || 0,
                  color: 'success',
                },
                {
                  id: 'total_quantity',
                  title: t('wms.inventory_report_page.field_total_quantity'),
                  value: formatNumber(statistics.total_quantity || 0),
                  color: 'warning',
                },
                {
                  id: 'total_value',
                  title: t('wms.inventory_report_page.field_total_value'),
                  value: `¥${formatNumber(statistics.total_value || 0)}`,
                  color: 'secondary',
                },
              ]
            : undefined
        }
        showStatCards={currentTab === TAB_VALUES.statistics}
      >
        <TabPanel
          value={tabIndex}
          index={0}
        >
          <InventoryReportSummary
            statistics={statistics}
            formatNumber={formatNumber}
          />
        </TabPanel>
        <TabPanel
          value={tabIndex}
          index={1}
        >
          <InventoryReportABCOverview
            abcAnalysis={abcAnalysis}
            abcTotalSku={abcTotalSku}
          />
          <InventoryReportABCTable
            abcAnalysis={abcAnalysis}
            formatNumber={formatNumber}
            getABCCategoryColor={getABCCategoryColor}
          />
        </TabPanel>
        <TabPanel
          value={tabIndex}
          index={2}
        >
          <InventoryReportTurnoverSummary
            turnoverData={turnoverData}
            formatNumber={formatNumber}
          />
          <InventoryReportTurnoverTable
            turnoverData={turnoverData}
            formatNumber={formatNumber}
          />
        </TabPanel>
        <TabPanel
          value={tabIndex}
          index={3}
        >
          <InventoryReportValueDistribution
            valueByWarehouse={valueByWarehouse}
            totalWarehouseValue={totalWarehouseValue}
            formatNumber={formatNumber}
          />
          <InventoryReportValueByWarehouseTable
            valueByWarehouse={valueByWarehouse}
            totalWarehouseValue={totalWarehouseValue}
            formatNumber={formatNumber}
          />
        </TabPanel>
      </StatsPageTemplate>
    </PageContainer>
  );
};

export default InventoryReportPage;
