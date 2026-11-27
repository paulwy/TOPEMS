/**
 * APS 高级计划排程概览
 *
 * 数据来源（全部 MES 真实端点，APS 无独立服务）：
 *  - GET /api/mes/production-plans：计划总数 / 目标总量 / 计划状态分布
 *  - GET /api/mes/schedules：排程总数 / 排程状态分布
 * 原先写死的 78.5%/92.3% 与两张 12/18/15… 假趋势图已删除：
 * 利用率、预测准确率后端无口径（无产能采集），改为计划/排程真实状态分布。
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CalendarCheck, Package, CalendarDays, ArrowRight } from 'lucide-react';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import i18n from '@/i18n';
import { APS_PATHS } from '@/module-configs/aps/config';
import { productionPlanApi, scheduleApi } from '@/api/aps';
import type { ProductionPlan, Schedule } from '@/api/aps';

const PAGE_SIZE = 200;

function groupByStatus<T extends { status?: string }>(
  rows: T[],
  labels?: Record<string, string>
): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const key = r.status || 'unknown';
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([k, v]) => ({
    label: labels?.[k] ?? k,
    value: v,
  }));
}

const ApsDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const plansQuery = useQuery({
    queryKey: ['aps-dashboard-plans', PAGE_SIZE],
    queryFn: async () => {
      const res = await productionPlanApi.list({ page: 1, pageSize: PAGE_SIZE });
      return res.success && res.data ? res.data : { plans: [], total: 0 };
    },
    staleTime: 60 * 1000,
  });

  const schedulesQuery = useQuery({
    queryKey: ['aps-dashboard-schedules', PAGE_SIZE],
    queryFn: async () => {
      const res = await scheduleApi.list({ page: 1, pageSize: PAGE_SIZE });
      return res.success && res.data ? res.data : { schedules: [], total: 0 };
    },
    staleTime: 60 * 1000,
  });

  const loading = plansQuery.isLoading || schedulesQuery.isLoading;

  const plans: ProductionPlan[] = (plansQuery.data as { plans?: ProductionPlan[] })?.plans ?? [];
  const schedules: Schedule[] =
    (schedulesQuery.data as { schedules?: Schedule[] })?.schedules ?? [];
  const plansTotal = Number((plansQuery.data as { total?: number })?.total ?? 0);
  const schedulesTotal = Number((schedulesQuery.data as { total?: number })?.total ?? 0);

  const targetQty = useMemo(
    () => plans.reduce((sum, p) => sum + (Number(p.target_quantity) || 0), 0),
    [plans]
  );

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'plans',
        title: i18n.t('aps.aps_dashboard_page.k12'),
        value: String(plansTotal),
        icon: <ClipboardList size={24} />,
        color: 'primary',
      },
      {
        id: 'schedules',
        title: i18n.t('aps.aps_dashboard_page.k14'),
        value: String(schedulesTotal),
        icon: <CalendarCheck size={24} />,
        color: 'info',
      },
      {
        id: 'target-qty',
        title: i18n.t('aps.aps_dashboard_page.target_quantity'),
        value: targetQty.toLocaleString('zh-CN'),
        icon: <Package size={24} />,
        color: 'success',
      },
      {
        id: 'plan-periods',
        title: i18n.t('aps.aps_dashboard_page.plan_periods'),
        value: String(new Set(plans.map((p) => p.start_date?.slice(0, 7)).filter(Boolean)).size),
        icon: <CalendarDays size={24} />,
        color: 'warning',
      },
    ],
    [plansTotal, schedulesTotal, targetQty, plans]
  );

  const planStatusLabels = useMemo(
    () => ({
      draft: i18n.t('aps.aps_dashboard_page.status_draft'),
      submitted: i18n.t('aps.aps_dashboard_page.status_submitted'),
      approved: i18n.t('aps.aps_dashboard_page.status_approved'),
      rejected: i18n.t('aps.aps_dashboard_page.status_rejected'),
      released: i18n.t('aps.aps_dashboard_page.status_released'),
      completed: i18n.t('aps.aps_dashboard_page.status_completed'),
    }),
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'plan-status',
        title: i18n.t('aps.aps_dashboard_page.k29'),
        type: 'pie',
        data: groupByStatus(plans, planStatusLabels),
      },
      {
        id: 'schedule-status',
        title: i18n.t('aps.aps_dashboard_page.k30'),
        type: 'bar',
        data: groupByStatus(schedules),
      },
    ],
    [plans, schedules, planStatusLabels]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'production-plans',
        label: i18n.t('aps.aps_dashboard_page.k22'),
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(APS_PATHS.productionPlans),
      },
      {
        id: 'schedules',
        label: i18n.t('aps.aps_dashboard_page.k23'),
        icon: <ArrowRight size={16} />,
        onClick: () => navigate(APS_PATHS.schedules),
      },
    ],
    [navigate]
  );

  return (
    <DashboardTemplate
      title={i18n.t('aps.aps_dashboard_page.k24')}
      subtitle={i18n.t('aps.aps_dashboard_page.k25')}
      breadcrumbs={[
        { label: i18n.t('aps.aps_dashboard_page.k26'), href: '/dashboard' },
        { label: i18n.t('aps.aps_dashboard_page.k27') },
      ]}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle={i18n.t('aps.aps_dashboard_page.k28')}
      loading={loading}
    />
  );
};

export default ApsDashboardPage;
