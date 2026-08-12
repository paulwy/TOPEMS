/**
 * @done V79 Phase 2 split
 * State + API calls extracted from InventoryReportPage.
 * Exposes all data + setters + helpers needed by the page and its sub-components.
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { wmsApi } from '@/api/wms';
import type {
  InventoryStatistics,
  ABCAnalysisItem,
  InventoryTurnoverData,
  InventoryValueByWarehouse,
  Warehouse,
} from '@/api/wms';
import { apiLogger } from '@/utils/logger';
import { useNotificationStore } from '@/store';


import { QUERY_KEYS } from '@/lib/reactQuery';

export interface UseInventoryReportReturn {
  currentTab: number;
  setCurrentTab: (tab: number) => void;
  warehouseFilter: string;
  setWarehouseFilter: (filter: string) => void;
  warehouses: Warehouse[];
  statistics: InventoryStatistics | undefined;
  statisticsLoading: boolean;
  abcAnalysis: ABCAnalysisItem[];
  abcTotalSku: number;
  abcTotalValue: number;
  abcLoading: boolean;
  turnoverData: InventoryTurnoverData[];
  turnoverLoading: boolean;
  valueByWarehouse: InventoryValueByWarehouse[];
  totalWarehouseValue: number;
  valueByWarehouseLoading: boolean;
  getABCCategoryColor: (category: string) => string;
  formatNumber: (num: number) => string;
}

export const useInventoryReport = (): UseInventoryReportReturn => {
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
      return;
    },
    staleTime: 5 * 60 * 1000,
  });
  const statistics = statisticsQuery.data;
  const statisticsLoading = statisticsQuery.isLoading;

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
  const abcTotalValue = abcAnalysisQuery.data?.total_value || 0;
  const abcLoading = abcAnalysisQuery.isLoading;

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
  const turnoverLoading = turnoverQuery.isLoading;

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
  const valueByWarehouseLoading = valueByWarehouseQuery.isLoading;

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
      return t('wms.inventory_report_page.unit_wan', { v0: (num / 10000).toFixed(2) });
    }
    return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  };

  return {
    currentTab,
    setCurrentTab,
    warehouseFilter,
    setWarehouseFilter,
    warehouses,
    statistics,
    statisticsLoading,
    abcAnalysis,
    abcTotalSku,
    abcTotalValue,
    abcLoading,
    turnoverData,
    turnoverLoading,
    valueByWarehouse,
    totalWarehouseValue,
    valueByWarehouseLoading,
    getABCCategoryColor,
    formatNumber,
  };
};
