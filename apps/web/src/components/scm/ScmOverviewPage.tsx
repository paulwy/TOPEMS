/**
 * SCM 供应链概览
 *
 * 数据来源：
 *  - GET /api/scm/dashboard/overview：供应商/采购/库存真实统计
 *  - GET /api/scm/mrp/suggestions：MRP 建议数
 *  - GET /api/scm/purchase-orders：最近采购订单
 * 原先写死的 128/56/13/8/92.5 与三张假趋势、五条示例动态已删除。
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, ShoppingCart, Clock, Calculator, Package, Truck } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { SCM_PATHS } from '@/module-configs/scm/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useTheme } from '@mui/material';
import { supplyChainDashboardApi, mrpPlanApi, purchaseOrderApi } from '@/api/scm';
import type { PurchaseOrder } from '@/api/scm/types';

interface ScmOverview {
  period?: { start_date?: string; end_date?: string };
  purchase?: {
    total_orders?: number;
    pending_orders?: number;
    approved_orders?: number;
    rejected_orders?: number;
    completed_orders?: number;
    total_amount?: number;
  };
  suppliers?: { active_count?: number };
  inventory?: { total_skus?: number; total_value?: number; low_stock_count?: number };
}

const ScmOverviewPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation('scm');
  const navigate = useNavigate();

  const overviewQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.SCM_DASHBOARD_BASE,
    queryFn: async () => {
      const res = await supplyChainDashboardApi.overview();
      return res.success && res.data ? (res.data as unknown as ScmOverview) : null;
    },
    staleTime: 60 * 1000,
  });

  const mrpQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.SCM_DASHBOARD_BASE, 'mrp'],
    queryFn: async () => {
      const res = await mrpPlanApi.list({ page: 1, pageSize: 1 });
      return res.success && res.data ? Number(res.data.total ?? 0) : 0;
    },
    staleTime: 60 * 1000,
  });

  const recentQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.SCM_DASHBOARD_BASE, 'recent-po'],
    queryFn: async () => {
      const res = await purchaseOrderApi.list({ page: 1, pageSize: 5 });
      return res.success && res.data ? (res.data.items ?? []) : [];
    },
    staleTime: 60 * 1000,
  });

  const loading = overviewQuery.isLoading || mrpQuery.isLoading || recentQuery.isLoading;
  const overview = overviewQuery.data;
  const purchase = overview?.purchase;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'supplier-total',
        title: i18n.t('scm.scm_overview_page.active_suppliers'),
        value: String(overview?.suppliers?.active_count ?? 0),
        icon: <Users size={24} />,
        color: 'primary',
      },
      {
        id: 'purchase-orders',
        title: i18n.t('scm.scm_overview_page.k2'),
        value: String(purchase?.total_orders ?? 0),
        icon: <ShoppingCart size={24} />,
        color: 'info',
      },
      {
        id: 'pending-approval',
        title: i18n.t('scm.scm_overview_page.k4'),
        value: String(purchase?.pending_orders ?? 0),
        icon: <Clock size={24} />,
        color: 'warning',
      },
      {
        id: 'mrp-plans',
        title: i18n.t('scm.mrp_plan_page.m3'),
        value: String(mrpQuery.data ?? 0),
        icon: <Calculator size={24} />,
        color: 'success',
      },
      {
        id: 'inventory-value',
        title: i18n.t('scm.scm_overview_page.inventory_value'),
        value: Number(overview?.inventory?.total_value ?? 0).toLocaleString('zh-CN', {
          maximumFractionDigits: 2,
        }),
        icon: <Package size={24} />,
        color: 'primary',
      },
    ],
    [overview, purchase, mrpQuery.data]
  );

  const statusData = useMemo(
    () => [
      { label: i18n.t('scm.scm_overview_page.status_pending'), value: purchase?.pending_orders ?? 0 },
      { label: i18n.t('scm.scm_overview_page.status_approved'), value: purchase?.approved_orders ?? 0 },
      { label: i18n.t('scm.scm_overview_page.status_rejected'), value: purchase?.rejected_orders ?? 0 },
      { label: i18n.t('scm.scm_overview_page.status_completed'), value: purchase?.completed_orders ?? 0 },
    ],
    [purchase]
  );

  const inventoryData = useMemo(
    () => [
      { label: i18n.t('scm.scm_overview_page.inventory_skus'), value: overview?.inventory?.total_skus ?? 0 },
      { label: i18n.t('scm.scm_overview_page.inventory_low'), value: overview?.inventory?.low_stock_count ?? 0 },
    ],
    [overview]
  );

  const charts: ChartCard[] = useMemo(
    () => [
      { id: 'po-status', title: i18n.t('scm.scm_overview_page.k39'), type: 'bar', data: statusData },
      { id: 'inventory', title: i18n.t('scm.scm_overview_page.k40'), type: 'pie', data: inventoryData },
    ],
    [statusData, inventoryData]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'supplier-manage',
        label: i18n.t('scm.scm_overview_page.k21'),
        icon: <Users size={20} />,
        onClick: () => navigate(SCM_PATHS.suppliers),
        color: theme.palette.primary.dark,
      },
      {
        id: 'purchase-order',
        label: i18n.t('scm.scm_overview_page.k22'),
        icon: <ShoppingCart size={20} />,
        onClick: () => navigate(SCM_PATHS.purchaseOrders),
        color: theme.palette.secondary[700],
      },
      {
        id: 'mrp-plan',
        label: i18n.t('scm.mrp_plan_page.m3'),
        icon: <Calculator size={20} />,
        onClick: () => navigate(SCM_PATHS.mrpPlan),
        color: theme.palette.success[700],
      },
      {
        id: 'supplier-eval',
        label: i18n.t('scm.scm_overview_page.k23'),
        icon: <Users size={20} />,
        onClick: () => navigate(SCM_PATHS.supplierEvaluation),
        color: theme.palette.warning[700],
      },
      {
        id: 'delivery-appointment',
        label: i18n.t('scm.scm_overview_page.k24'),
        icon: <Truck size={20} />,
        onClick: () => navigate(SCM_PATHS.deliveryAppointment),
        color: theme.palette.teal[700],
      },
    ],
    [navigate, theme]
  );

  const recentItems: RecentItem[] = useMemo(() => {
    const rows: PurchaseOrder[] = recentQuery.data ?? [];
    return rows.map((po) => ({
      id: po.id,
      title: po.order_number,
      description: po.total_amount != null ? `¥${Number(po.total_amount).toLocaleString('zh-CN')}` : '',
      time: po.order_date || '',
      icon: <ShoppingCart size={18} />,
      status:
        po.status === 'completed'
          ? ('success' as const)
          : po.status === 'pending'
            ? ('warning' as const)
            : po.status === 'rejected'
              ? ('error' as const)
              : ('info' as const),
      onClick: () => navigate(SCM_PATHS.purchaseOrders),
    }));
  }, [recentQuery.data, navigate]);

  return (
    <DashboardTemplate
      title={t('scm.scm_overview_page.k34')}
      breadcrumbs={[
        { label: t('scm.scm_overview_page.k36'), href: '/dashboard' },
        { label: t('scm.scm_overview_page.k35') },
      ]}
      stats={stats}
      charts={charts}
      recentItems={recentItems}
      recentTitle={t('scm.scm_overview_page.k37')}
      quickActions={quickActions}
      quickActionsTitle={t('scm.scm_overview_page.k38')}
      loading={loading}
    />
  );
};

export default ScmOverviewPage;
