import React, { useMemo } from 'react';
import { Users, Award, ClipboardList, DollarSign, ScrollText, Building2 } from 'lucide-react';
import { StatsChart } from '@/components/bi/StatsChart';
import { srmApi } from '@/api/srm';
import type { SrmDetailedStatistics } from '@/api/srm';
import { DashboardTemplate, type StatCard, type ChartCard } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const SrmDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: statistics, isPending: loading } = useQuery({
    queryKey: QUERY_KEYS.SRM.STATISTICS,
    queryFn: async () => {
      const response = await srmApi.getDetailedStatistics();
      if (response.success && response.data) {
        return response.data as SrmDetailedStatistics;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const mapStatusToChinese = (status: string) => {
    const statusMap: Record<string, string> = {
      active: i18n.t('pages.srm_dashboard_page.k0'),
      inactive: i18n.t('pages.srm_dashboard_page.k1'),
      pending: i18n.t('pages.srm_dashboard_page.k2'),
      completed: i18n.t('pages.srm_dashboard_page.k3'),
      delivered: i18n.t('pages.srm_dashboard_page.k4'),
      cancelled: i18n.t('pages.srm_dashboard_page.k5'),
      processing: i18n.t('pages.srm_dashboard_page.k6'),
      draft: i18n.t('pages.srm_dashboard_page.k7'),
      expired: i18n.t('pages.srm_dashboard_page.k8'),
    };
    return statusMap[status] || status;
  };

  const stats: StatCard[] = useMemo(() => {
    if (!statistics) return [];
    return [
      {
        id: 'suppliers',
        title: t('srm.total_suppliers'),
        value: statistics.basic.total_suppliers ?? 0,
        icon: <Users size={24} />,
        subtitle: t('srm.active_suppliers_count', {
          count: statistics.basic.active_suppliers ?? 0,
        }),
        color: 'primary',
      },
      {
        id: 'avg-score',
        title: t('srm.average_rating'),
        value: (statistics.basic.avg_score ?? 0).toFixed(1),
        icon: <Award size={24} />,
        subtitle: t('srm.total_evaluations_count', {
          count: statistics.basic.total_evaluations ?? 0,
        }),
        color: 'warning',
      },
      {
        id: 'orders',
        title: t('srm.purchase_order'),
        value: statistics.basic.total_orders ?? 0,
        icon: <ClipboardList size={24} />,
        subtitle: t('srm.pending_orders_count', { count: statistics.basic.pending_orders ?? 0 }),
        color: 'success',
      },
      {
        id: 'order-amount',
        title: t('srm.total_order_amount'),
        value: `¥${(statistics.basic.total_order_amount ?? 0).toLocaleString()}`,
        icon: <DollarSign size={24} />,
        subtitle: t('srm.completed_orders_count', {
          count: statistics.basic.completed_orders ?? 0,
        }),
        color: 'info',
      },
      {
        id: 'contracts',
        title: t('srm.total_contracts'),
        value: statistics.basic.total_contracts ?? 0,
        icon: <ScrollText size={24} />,
        subtitle: t('srm.active_contracts_count', {
          count: statistics.basic.active_contracts ?? 0,
        }),
        color: 'secondary',
      },
      {
        id: 'categories',
        title: t('srm.supplier_category'),
        value: statistics.supplier_by_category?.length ?? 0,
        icon: <Building2 size={24} />,
        subtitle: t('srm.category_count'),
        color: 'primary',
      },
    ];
  }, [statistics, t]);

  const charts: ChartCard[] = useMemo(() => {
    if (!statistics) return [];
    const chartList: ChartCard[] = [
      {
        id: 'supplier-status',
        title: t('srm.supplier_status_distribution'),
        chart: (
          <StatsChart
            title={t('srm.supplier_status_distribution')}
            type='pie'
            data={(statistics.supplier_by_status ?? []).map((s) => ({
              name: mapStatusToChinese(s.status),
              value: s.count,
              color: s.status === 'active' ? 'success.main' : 'grey.500',
            }))}
            yKey='value'
            xKey='name'
          />
        ),
        height: 300,
        type: 'pie',
      },
      {
        id: 'order-status',
        title: t('srm.order_status_distribution'),
        chart: (
          <StatsChart
            title={t('srm.order_status_distribution')}
            type='pie'
            data={(statistics.order_by_status ?? []).map((s) => ({
              name: mapStatusToChinese(s.status),
              value: s.count,
            }))}
            yKey='value'
            xKey='name'
          />
        ),
        height: 300,
        type: 'pie',
      },
      {
        id: 'evaluation-score',
        title: t('srm.evaluation_score_distribution'),
        chart: (
          <StatsChart
            title={t('srm.evaluation_score_distribution')}
            type='bar'
            data={(statistics.evaluation_score_distribution ?? []).map((s) => ({
              name: s.range,
              value: s.count,
            }))}
            yKey='value'
            xKey='name'
          />
        ),
        height: 300,
        type: 'bar',
      },
      {
        id: 'monthly-trend',
        title: t('srm.monthly_order_trend'),
        chart: (
          <StatsChart
            title={t('srm.monthly_order_trend')}
            type='line'
            data={(statistics.monthly_order_trend ?? []).map((t) => ({
              name: t.month,
              value: t.order_count,
              amount: t.total_amount,
            }))}
            yKey='value'
            xKey='name'
          />
        ),
        height: 300,
        type: 'line',
      },
    ];

    if ((statistics.contract_by_status ?? []).length > 0) {
      chartList.push({
        id: 'contract-status',
        title: t('srm.contract_status_distribution'),
        chart: (
          <StatsChart
            title={t('srm.contract_status_distribution')}
            type='pie'
            data={statistics.contract_by_status.map((s) => ({
              name: mapStatusToChinese(s.status),
              value: s.count,
            }))}
            yKey='value'
            xKey='name'
          />
        ),
        height: 300,
        type: 'pie',
      });
    }

    return chartList;
  }, [statistics, t]);

  return (
    <PageContainer
      title={t('srm.title')}
      subtitle={t('srm.subtitle')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('srm.order.breadcrumb.home'), href: '/dashboard' },
          { label: 'SRM' },
        ]}
        stats={stats}
        charts={charts}
        loading={loading}
      />
    </PageContainer>
  );
};

export default SrmDashboardPage;
