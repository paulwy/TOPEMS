import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  FileText,
  Wallet,
  Package,
  BarChart3,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import { erpApi } from '@/api/erp';
import type { ErpDashboardStats } from '@/api/erp';

const iconMap: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp size={24} />,
  FileText: <FileText size={24} />,
  Wallet: <Wallet size={24} />,
  Package: <Package size={24} />,
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: statsData, isLoading: loading } = useQuery<ErpDashboardStats | null>({
    queryKey: ['erp-dashboard'],
    queryFn: async () => {
      const response = await erpApi.getDashboard();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats: StatCard[] = useMemo(() => {
    if (!statsData) return [];
    return [
      {
        id: 'total-assets',
        title: '总资产',
        value: statsData.total_assets.toLocaleString(),
        icon: iconMap.TrendingUp,
        change: 0,
        changeLabel: '% vs 上周期',
        color: 'success',
      },
      {
        id: 'active-assets',
        title: '在用资产',
        value: statsData.active_assets.toLocaleString(),
        icon: iconMap.Wallet,
        change: 0,
        changeLabel: '% vs 上周期',
        color: 'info',
      },
      {
        id: 'inventory-total',
        title: '库存总量',
        value: statsData.total_inventory.toLocaleString(),
        icon: iconMap.Package,
        change: 0,
        changeLabel: '% vs 上周期',
        color: 'warning',
      },
      {
        id: 'pending-orders',
        title: '待处理订单',
        value: statsData.pending_orders.toLocaleString(),
        icon: iconMap.FileText,
        change: 0,
        changeLabel: 'vs 上周期',
        color: 'primary',
      },
    ];
  }, [statsData]);

  const charts: ChartCard[] = useMemo(() => {
    if (!statsData) return [];
    const barData = [
      { name: '总订单', value: statsData.total_orders },
      { name: '待处理', value: statsData.pending_orders },
      { name: '供应商', value: statsData.total_suppliers },
      { name: '客户', value: statsData.total_customers },
      { name: '资产', value: statsData.total_assets },
      { name: '凭证', value: statsData.total_vouchers },
    ];
    const lineData = [
      { name: '资产', value: statsData.total_assets },
      { name: '在用', value: statsData.active_assets },
      { name: '库存', value: statsData.total_inventory },
      { name: '低库存', value: statsData.low_stock_items },
      { name: '待审批', value: statsData.pending_vouchers },
      { name: '供应商', value: statsData.active_suppliers },
    ];
    return [
      {
        id: 'data-overview',
        title: '数据概览',
        chart: (
          <BarChartComponent
            data={barData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'trend-analysis',
        title: '趋势分析',
        chart: (
          <LineChartComponent
            data={lineData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
    ];
  }, [statsData]);

  const quickActions: QuickAction[] = [];

  return (
    <PageContainer
      title='企业资源管理'
      subtitle={`${getGreeting()}，财务管理与库存概览`}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
