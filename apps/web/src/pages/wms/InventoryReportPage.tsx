import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { BarChart3 } from 'lucide-react';
import { PageContainer, Grid } from '@/components/common';
import { wmsApi } from '@/api/wms';
import type { InventoryStatistics } from '@/api/wms';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { useTranslation } from 'react-i18next';

import InventoryReportFilters, { TabPanel } from './components/InventoryReportFilters';
import InventoryReportSummary from './components/InventoryReportSummary';
import { QUERY_KEYS } from '@/lib/reactQuery';

import {
  InventoryReportABCOverview,
  InventoryReportTurnoverSummary,
  InventoryReportValueDistribution,
} from './components/InventoryReportChart';
import i18n from '@/i18n';
import {
  InventoryReportABCTable,
  InventoryReportTurnoverTable,
  InventoryReportValueByWarehouseTable,
} from './components/InventoryReportTable';

const ct = designTokens.colors;

const InventoryReportPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const [currentTab, setCurrentTab] = useState(0);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');

  const warehousesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WMS_WAREHOUSES_BASE,
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
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
  }, [warehousesQuery.isError, warehousesQuery.error]);

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
  }, [statisticsQuery.isError, statisticsQuery.error, addNotification]);

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
    enabled: currentTab === 1,
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
  }, [abcAnalysisQuery.isError, abcAnalysisQuery.error, addNotification]);

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
    enabled: currentTab === 2,
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
  }, [turnoverQuery.isError, turnoverQuery.error, addNotification]);

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
    enabled: currentTab === 3,
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
  }, [valueByWarehouseQuery.isError, valueByWarehouseQuery.error, addNotification]);

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

  return (
    <PageContainer
      title={t('wms.inventory_report_page.title')}
      subtitle={t('wms.inventory_report_page.subtitle')}
      headerProps={{
        pageIcon: <BarChart3 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]}, ${ct.secondary[600]})`,
      }}
    >
      <Box sx={{ mb: 3 }}>
        <InventoryReportFilters
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          warehouseFilter={warehouseFilter}
          onWarehouseFilterChange={setWarehouseFilter}
          warehouses={warehouses}
        />
      </Box>

      <TabPanel
        value={currentTab}
        index={0}
      >
        <InventoryReportSummary
          statistics={statistics}
          formatNumber={formatNumber}
        />
      </TabPanel>
      <TabPanel
        value={currentTab}
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
        value={currentTab}
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
        value={currentTab}
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
    </PageContainer>
  );
};

export default InventoryReportPage;
