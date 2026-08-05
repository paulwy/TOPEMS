import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  FileText,
  Wallet,
  Package,
  CreditCard,
  Landmark,
  Target,
  Banknote,
  Users,
  Building2,
  ShoppingCart,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import { erpApi } from '@/api/erp';
import type { ErpDashboardStats } from '@/api/erp';
import { ERP_PATHS } from '@/modules/erp/config';

const iconMap: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp size={24} />,
  FileText: <FileText size={24} />,
  Wallet: <Wallet size={24} />,
  Package: <Package size={24} />,
  CreditCard: <CreditCard size={24} />,
  Landmark: <Landmark size={24} />,
  Target: <Target size={24} />,
  Banknote: <Banknote size={24} />,
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
        icon: iconMap.Landmark,
        change: 8.5,
        changeLabel: '% vs 上月',
        color: 'success',
      },
      {
        id: 'active-assets',
        title: '在用资产',
        value: statsData.active_assets.toLocaleString(),
        icon: iconMap.Wallet,
        change: 2.3,
        changeLabel: '% vs 上月',
        color: 'info',
      },
      {
        id: 'inventory-total',
        title: '库存总量',
        value: statsData.total_inventory.toLocaleString(),
        icon: iconMap.Package,
        change: -3.2,
        changeLabel: '% vs 上月',
        color: 'warning',
      },
      {
        id: 'pending-orders',
        title: '待处理订单',
        value: statsData.pending_orders.toLocaleString(),
        icon: iconMap.FileText,
        change: 12.8,
        changeLabel: 'vs 上周',
        color: 'primary',
      },
      {
        id: 'total-customers',
        title: '客户总数',
        value: statsData.total_customers.toLocaleString(),
        icon: iconMap.TrendingUp,
        change: 5.6,
        changeLabel: '% vs 上月',
        color: 'success',
      },
      {
        id: 'total-suppliers',
        title: '供应商总数',
        value: statsData.total_suppliers.toLocaleString(),
        icon: iconMap.CreditCard,
        change: 3.1,
        changeLabel: '% vs 上月',
        color: 'info',
      },
      {
        id: 'total-vouchers',
        title: '凭证总数',
        value: statsData.total_vouchers.toLocaleString(),
        icon: iconMap.Banknote,
        change: 15.2,
        changeLabel: '% vs 上月',
        color: 'primary',
      },
      {
        id: 'pending-vouchers',
        title: '待审批凭证',
        value: statsData.pending_vouchers.toLocaleString(),
        icon: iconMap.Target,
        change: -8.7,
        changeLabel: '% vs 上周',
        color: 'warning',
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

  const quickActions: QuickAction[] = [
    {
      id: 'create-voucher',
      label: '新增凭证',
      icon: <FileText size={18} />,
      color: 'primary',
      onClick: () => navigate(ERP_PATHS.voucherManagement),
    },
    {
      id: 'create-budget',
      label: '新增预算',
      icon: <Target size={18} />,
      color: 'success',
      onClick: () => navigate(ERP_PATHS.budgetManagement),
    },
    {
      id: 'create-purchase',
      label: '采购订单',
      icon: <ShoppingCart size={18} />,
      color: 'info',
      onClick: () => navigate(ERP_PATHS.purchaseOrder),
    },
    {
      id: 'create-asset',
      label: '资产管理',
      icon: <Landmark size={18} />,
      color: 'warning',
      onClick: () => navigate(ERP_PATHS.assetManagement),
    },
    {
      id: 'customer-management',
      label: '客户管理',
      icon: <Users size={18} />,
      color: 'primary',
      onClick: () => navigate(ERP_PATHS.customerManagement),
    },
    {
      id: 'supplier-management',
      label: '供应商管理',
      icon: <Building2 size={18} />,
      color: 'info',
      onClick: () => navigate(ERP_PATHS.supplierManagement),
    },
  ];

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
