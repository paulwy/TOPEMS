import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, ShoppingCart, Clock, Calculator, Award, Truck, Star } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { SCM_PATHS } from '@/modules/scm/config';
import { LazyChart } from '@/components/charts';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

const ScmOverviewPage: React.FC = () => {
  const { t } = useTranslation('scm');
  const navigate = useNavigate();

  const loadingQuery = useQuery<boolean>({
    queryKey: QUERY_KEYS.AD_HOC.SCM_DASHBOARD_BASE,
    queryFn: async () => true,
    staleTime: Infinity,
  });
  const loading = loadingQuery.isLoading;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'supplier-total',
        title: i18n.t('scm.scm_overview_page.k0'),
        value: '128',
        icon: <Users size={24} />,
        change: 8,
        changeLabel: i18n.t('scm.scm_overview_page.k1'),
        color: 'primary',
      },
      {
        id: 'purchase-orders',
        title: i18n.t('scm.scm_overview_page.k2'),
        value: '56',
        icon: <ShoppingCart size={24} />,
        change: 12,
        changeLabel: i18n.t('scm.scm_overview_page.k3'),
        color: 'info',
      },
      {
        id: 'pending-approval',
        title: i18n.t('scm.scm_overview_page.k4'),
        value: '13',
        icon: <Clock size={24} />,
        change: 5,
        changeLabel: i18n.t('scm.scm_overview_page.k5'),
        color: 'warning',
      },
      {
        id: 'mrp-plans',
        title: 'MRP计划',
        value: '8',
        icon: <Calculator size={24} />,
        change: 3,
        changeLabel: i18n.t('scm.scm_overview_page.k6'),
        color: 'success',
      },
      {
        id: 'supplier-rating',
        title: i18n.t('scm.scm_overview_page.k7'),
        value: '92.5',
        icon: <Award size={24} />,
        change: 1.2,
        changeLabel: i18n.t('scm.scm_overview_page.k8'),
        color: 'primary',
      },
    ],
    []
  );

  const orderTrendData = [
    { name: '1月', value: 32 },
    { name: '2月', value: 28 },
    { name: '3月', value: 45 },
    { name: '4月', value: 38 },
    { name: '5月', value: 52 },
    { name: '6月', value: 56 },
  ];

  const supplierRatingData = [
    { name: t('scm.scm_overview_page.a_9'), value: 45 },
    { name: t('scm.scm_overview_page.b_10'), value: 35 },
    { name: t('scm.scm_overview_page.c_11'), value: 15 },
    { name: t('scm.scm_overview_page.d_12'), value: 5 },
  ];

  const mrpStatusData = [
    { name: t('scm.scm_overview_page.1_13'), value: 5 },
    { name: t('scm.scm_overview_page.2_14'), value: 8 },
    { name: t('scm.scm_overview_page.3_15'), value: 6 },
    { name: t('scm.scm_overview_page.4_16'), value: 10 },
    { name: t('scm.scm_overview_page.5_17'), value: 7 },
    { name: t('scm.scm_overview_page.6_18'), value: 12 },
  ];

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'order-trend',
        title: i18n.t('scm.scm_overview_page.k19'),
        chart: (
          <LazyChart
            type='bar'
            data={orderTrendData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'supplier-rating',
        title: i18n.t('scm.scm_overview_page.k20'),
        chart: (
          <LazyChart
            type='pie'
            data={supplierRatingData}
          />
        ),
        height: 300,
      },
      {
        id: 'mrp-suggestion',
        title: 'MRP建议状态',
        chart: (
          <LazyChart
            type='line'
            data={mrpStatusData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'supplier-manage',
        label: i18n.t('scm.scm_overview_page.k21'),
        icon: <Users size={20} />,
        onClick: () => navigate(SCM_PATHS.suppliers),
        color: ct.primary.dark,
      },
      {
        id: 'purchase-order',
        label: i18n.t('scm.scm_overview_page.k22'),
        icon: <ShoppingCart size={20} />,
        onClick: () => navigate(SCM_PATHS.purchaseOrders),
        color: ct.secondary[700],
      },
      {
        id: 'mrp-plan',
        label: 'MRP计划',
        icon: <Calculator size={20} />,
        onClick: () => navigate(SCM_PATHS.mrpPlan),
        color: ct.success[700],
      },
      {
        id: 'supplier-eval',
        label: i18n.t('scm.scm_overview_page.k23'),
        icon: <Award size={20} />,
        onClick: () => navigate(SCM_PATHS.supplierEvaluation),
        color: ct.warning[700],
      },
      {
        id: 'delivery-appointment',
        label: i18n.t('scm.scm_overview_page.k24'),
        icon: <Truck size={20} />,
        onClick: () => navigate(SCM_PATHS.deliveryAppointment),
        color: ct.teal[700],
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = useMemo(
    () => [
      {
        id: 'po1',
        title: 'PO-2026-0098',
        description: i18n.t('scm.scm_overview_page.a_25'),
        time: '2026-06-29 09:00',
        icon: <ShoppingCart size={18} />,
        status: 'warning',
        tags: [{ label: i18n.t('scm.scm_overview_page.k26'), color: ct.warning[700] }],
        onClick: () => navigate(SCM_PATHS.purchaseOrders),
      },
      {
        id: 'sup1',
        title: i18n.t('scm.scm_overview_page.b_27'),
        description: '综合评分: A (95分)',
        time: '2026-06-28 16:30',
        icon: <Star size={18} />,
        status: 'success',
        onClick: () => navigate(SCM_PATHS.supplierEvaluation),
      },
      {
        id: 'mrp1',
        title: 'MRP-2026-0012',
        description: '7月生产物料需求计划',
        time: '2026-06-28 14:00',
        icon: <Calculator size={18} />,
        status: 'info',
        tags: [{ label: i18n.t('scm.scm_overview_page.k28'), color: ct.primary.dark }],
        onClick: () => navigate(SCM_PATHS.mrpPlan),
      },
      {
        id: 'po2',
        title: 'PO-2026-0097',
        description: i18n.t('scm.scm_overview_page.k29'),
        time: '2026-06-28 11:20',
        icon: <ShoppingCart size={18} />,
        status: 'success',
        tags: [{ label: i18n.t('scm.scm_overview_page.k30'), color: ct.success[700] }],
        onClick: () => navigate(SCM_PATHS.purchaseOrders),
      },
      {
        id: 'del1',
        title: i18n.t('scm.scm_overview_page.dl20260035_31'),
        description: i18n.t('scm.scm_overview_page.c630_32'),
        time: '2026-06-27 10:00',
        icon: <Truck size={18} />,
        status: 'default',
        tags: [{ label: i18n.t('scm.scm_overview_page.k33'), color: ct.grey[600] }],
        onClick: () => navigate(SCM_PATHS.deliveryAppointment),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title={t('scm.scm_overview_page.k34')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
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
    </PageContainer>
  );
};

export default ScmOverviewPage;
