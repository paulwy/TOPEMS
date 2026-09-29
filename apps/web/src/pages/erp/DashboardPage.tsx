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
import i18n from '@/i18n';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { erpApi } from '@/api/erp';
import type { ErpDashboardStats } from '@/api/erp';
import { ERP_PATHS } from '@/modules/erp/config';
import { LazyChart } from '@/components/charts';
import { QUERY_KEYS } from '@/lib/reactQuery';

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
  if (hour < 12) return i18n.t('erp.dashboard_page.k0');
  if (hour < 18) return i18n.t('erp.dashboard_page.k1');
  return i18n.t('erp.dashboard_page.k2');
};
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: statsData, isPending: loading } = useQuery<ErpDashboardStats | null>({
    queryKey: QUERY_KEYS.AD_HOC.ERP_DASHBOARD_BASE,
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
        title: i18n.t('erp.dashboard_page.k3'),
        value: (statsData.total_assets || 0).toLocaleString(),
        icon: iconMap.Landmark,
        change: 8.5,
        changeLabel: i18n.t('pages.dashboard_page.vs_0'),
        color: 'success',
      },
      {
        id: 'active-assets',
        title: i18n.t('erp.dashboard_page.k4'),
        value: (statsData.active_assets || 0).toLocaleString(),
        icon: iconMap.Wallet,
        change: 2.3,
        changeLabel: i18n.t('pages.dashboard_page.vs_1'),
        color: 'info',
      },
      {
        id: 'inventory-total',
        title: i18n.t('erp.dashboard_page.k5'),
        value: (statsData.total_inventory || 0).toLocaleString(),
        icon: iconMap.Package,
        change: -3.2,
        changeLabel: i18n.t('pages.dashboard_page.vs_2'),
        color: 'warning',
      },
      {
        id: 'pending-orders',
        title: i18n.t('erp.dashboard_page.k6'),
        value: (statsData.pending_orders || 0).toLocaleString(),
        icon: iconMap.FileText,
        change: 12.8,
        changeLabel: i18n.t('pages.dashboard_page.vs_3'),
        color: 'primary',
      },
      {
        id: 'total-customers',
        title: i18n.t('erp.dashboard_page.k7'),
        value: (statsData.total_customers || 0).toLocaleString(),
        icon: iconMap.TrendingUp,
        change: 5.6,
        changeLabel: i18n.t('pages.dashboard_page.vs_4'),
        color: 'success',
      },
      {
        id: 'total-suppliers',
        title: i18n.t('erp.dashboard_page.k8'),
        value: (statsData.total_suppliers || 0).toLocaleString(),
        icon: iconMap.CreditCard,
        change: 3.1,
        changeLabel: i18n.t('pages.dashboard_page.vs_5'),
        color: 'info',
      },
      {
        id: 'total-vouchers',
        title: i18n.t('erp.dashboard_page.k9'),
        value: (statsData.total_vouchers || 0).toLocaleString(),
        icon: iconMap.Banknote,
        change: 15.2,
        changeLabel: i18n.t('pages.dashboard_page.vs_6'),
        color: 'primary',
      },
      {
        id: 'pending-vouchers',
        title: i18n.t('erp.dashboard_page.k10'),
        value: (statsData.pending_vouchers || 0).toLocaleString(),
        icon: iconMap.Target,
        change: -8.7,
        changeLabel: i18n.t('pages.dashboard_page.vs_7'),
        color: 'warning',
      },
    ];
  }, [statsData]);
  const charts: ChartCard[] = useMemo(() => {
    if (!statsData) return [];
    const barData = [
      { name: i18n.t('erp.dashboard_page.k11'), value: statsData.total_orders },
      { name: i18n.t('erp.dashboard_page.k12'), value: statsData.pending_orders },
      { name: i18n.t('erp.dashboard_page.k13'), value: statsData.total_suppliers },
      { name: i18n.t('erp.dashboard_page.k14'), value: statsData.total_customers },
      { name: i18n.t('erp.dashboard_page.k15'), value: statsData.total_assets },
      { name: i18n.t('erp.dashboard_page.k16'), value: statsData.total_vouchers },
    ];
    const lineData = [
      { name: i18n.t('erp.dashboard_page.k17'), value: statsData.total_assets },
      { name: i18n.t('erp.dashboard_page.k18'), value: statsData.active_assets },
      { name: i18n.t('erp.dashboard_page.k19'), value: statsData.total_inventory },
      { name: i18n.t('erp.dashboard_page.k20'), value: statsData.low_stock_items },
      { name: i18n.t('erp.dashboard_page.k21'), value: statsData.pending_vouchers },
      { name: i18n.t('erp.dashboard_page.k22'), value: statsData.active_suppliers },
    ];
    return [
      {
        id: 'data-overview',
        title: i18n.t('erp.dashboard_page.k23'),
        chart: (
          <LazyChart
            type='bar'
            data={barData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'trend-analysis',
        title: i18n.t('erp.dashboard_page.k24'),
        chart: (
          <LazyChart
            type='line'
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
      label: i18n.t('erp.dashboard_page.k25'),
      icon: <FileText size={18} />,
      color: 'primary',
      onClick: () => navigate(ERP_PATHS.voucherManagement),
    },
    {
      id: 'create-budget',
      label: i18n.t('erp.dashboard_page.k26'),
      icon: <Target size={18} />,
      color: 'success',
      onClick: () => navigate(ERP_PATHS.budgetManagement),
    },
    {
      id: 'create-purchase',
      label: i18n.t('erp.dashboard_page.k27'),
      icon: <ShoppingCart size={18} />,
      color: 'info',
      onClick: () => navigate(ERP_PATHS.purchaseOrder),
    },
    {
      id: 'create-asset',
      label: i18n.t('erp.dashboard_page.k28'),
      icon: <Landmark size={18} />,
      color: 'warning',
      onClick: () => navigate(ERP_PATHS.assetManagement),
    },
    {
      id: 'customer-management',
      label: i18n.t('erp.dashboard_page.k29'),
      icon: <Users size={18} />,
      color: 'primary',
      onClick: () => navigate(ERP_PATHS.customerManagement),
    },
    {
      id: 'supplier-management',
      label: i18n.t('erp.dashboard_page.k30'),
      icon: <Building2 size={18} />,
      color: 'info',
      onClick: () => navigate(ERP_PATHS.supplierManagement),
    },
  ];
  return (
    <PageContainer
      title={i18n.t('erp.dashboard_page.k31')}
      subtitle={`${getGreeting()}${i18n.t('pages.dashboard_page.k8')}`}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={i18n.t('erp.dashboard_page.k32')}
        loading={loading}
      />
    </PageContainer>
  );
};
export default DashboardPage;
