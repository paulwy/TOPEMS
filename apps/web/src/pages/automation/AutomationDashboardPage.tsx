import React, { useEffect, useState, useCallback } from 'react';
import { Box, Alert, CircularProgress, Chip } from '@mui/material';
import { Zap, CheckCircle2, XCircle, Activity, Clock, TrendingUp } from 'lucide-react';
import { automationApi } from '@/api/automation';
import type { AutomationDashboardStats, AutomationRunStatus } from '@/api/automation';
import {
  StatsPageTemplate,
  type StatCard,
  type DataTable,
} from '@/components/templates/StatsPageTemplate';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const RUN_STATUS_COLOR: Record<
  AutomationRunStatus,
  'success' | 'error' | 'warning' | 'info' | 'default'
> = {
  success: 'success',
  failed: 'error',
  running: 'info',
  pending: 'warning',
  cancelled: 'default',
  timeout: 'error',
};

function getRunStatusLabel(): Record<AutomationRunStatus, string> {
  return {
    success: i18n.t('automation.automation_dashboard_page.k0'),
    failed: i18n.t('automation.automation_dashboard_page.k1'),
    running: i18n.t('automation.automation_dashboard_page.k2'),
    pending: i18n.t('automation.automation_dashboard_page.k3'),
    cancelled: i18n.t('automation.automation_dashboard_page.k4'),
    timeout: i18n.t('automation.automation_dashboard_page.k5'),
  };
}

export const AutomationDashboardPage: React.FC = () => {
  const { t } = useTranslation('automation');
  const [stats, setStats] = useState<AutomationDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await automationApi.getDashboardStats();
        if (signal?.aborted) return;
        setStats(res.data ?? null);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : t('automation.automation_dashboard_page.k6'));
      } finally {
        if (signal?.aborted) return;
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const statCards: StatCard[] = [
    {
      id: 'total-rules',
      title: t('automation.automation_dashboard_page.k8'),
      value: stats?.total_rules ?? 0,
      icon: <Zap size={24} />,
      color: 'primary',
    },
    {
      id: 'enabled-rules',
      title: t('automation.automation_dashboard_page.k9'),
      value: stats?.enabled_rules ?? 0,
      icon: <Zap size={24} />,
      color: 'success',
    },
    {
      id: 'runs-last-24h',
      title: t('automation.automation_dashboard_page.m1'),
      value: stats?.runs_last_24h ?? 0,
      icon: <Activity size={24} />,
      color: 'info',
    },
    {
      id: 'success-rate-24h',
      title: t('automation.automation_dashboard_page.m2'),
      value: stats?.success_rate_24h ?? 0,
      suffix: '%',
      icon: <TrendingUp size={24} />,
      color: Number(stats?.success_rate_24h ?? 0) >= 90 ? 'success' : 'warning',
    },
    {
      id: 'success-last-24h',
      title: t('automation.automation_dashboard_page.m3'),
      value: stats?.success_last_24h ?? 0,
      icon: <CheckCircle2 size={24} />,
      color: 'success',
    },
    {
      id: 'failed-last-24h',
      title: t('automation.automation_dashboard_page.m4'),
      value: stats?.failed_last_24h ?? 0,
      icon: <XCircle size={24} />,
      color: 'error',
    },
    {
      id: 'avg-duration',
      title: t('automation.automation_dashboard_page.k10'),
      value: stats?.avg_duration_ms ?? 0,
      suffix: 'ms',
      icon: <Clock size={24} />,
      color: 'info',
    },
    {
      id: 'disabled-rules',
      title: t('automation.automation_dashboard_page.k11'),
      value: stats?.disabled_rules ?? 0,
      icon: <Zap size={24} />,
      color: 'secondary',
    },
  ];

  const tables: DataTable[] = [
    {
      id: 'daily-stats',
      title: t('automation.automation_dashboard_page.e2'),
      columns: [
        { id: 'date', label: t('automation.automation_dashboard_page.k12'), field: 'date' },
        {
          id: 'total',
          label: t('automation.automation_dashboard_page.k13'),
          field: 'total',
          align: 'right',
        },
        {
          id: 'success',
          label: t('automation.automation_dashboard_page.k14'),
          field: 'success',
          align: 'right',
          render: (value) => (
            <Box
              component='span'
              sx={{ color: 'success.main' }}
            >
              {String(value ?? '')}
            </Box>
          ),
        },
        {
          id: 'failed',
          label: t('automation.automation_dashboard_page.k15'),
          field: 'failed',
          align: 'right',
          render: (value) => (
            <Box
              component='span'
              sx={{ color: 'error.main' }}
            >
              {String(value ?? '')}
            </Box>
          ),
        },
      ],
      data: (stats?.daily_stats ?? []) as unknown as Record<string, unknown>[],
    },
    {
      id: 'recent-runs',
      title: t('automation.automation_dashboard_page.e3'),
      columns: [
        {
          id: 'rule',
          label: t('automation.automation_dashboard_page.k16'),
          field: 'rule_name',
          render: (value, row) =>
            (value ??
              (row as { rule_code?: string; rule_id?: string }).rule_code ??
              (row as { rule_id?: string }).rule_id) as string,
        },
        {
          id: 'trigger',
          label: t('automation.automation_dashboard_page.k17'),
          field: 'trigger_type',
        },
        {
          id: 'status',
          label: t('automation.automation_dashboard_page.k18'),
          field: 'status',
          render: (value) => (
            <Chip
              size='small'
              color={RUN_STATUS_COLOR[value as AutomationRunStatus]}
              label={getRunStatusLabel()[value as AutomationRunStatus]}
            />
          ),
        },
        {
          id: 'started',
          label: t('automation.automation_dashboard_page.k19'),
          field: 'started_at',
        },
        {
          id: 'duration',
          label: t('automation.automation_dashboard_page.k20'),
          field: 'duration_ms',
          align: 'right',
          render: (value) => (value ? `${value}ms` : '-'),
        },
      ],
      data: (stats?.recent_runs ?? []) as unknown as Record<string, unknown>[],
    },
  ];

  return (
    <StatsPageTemplate
      title={t('automation.automation_dashboard_page.k7')}
      subtitle={t('automation.automation_dashboard_page.e1')}
      statCards={statCards}
      tables={tables}
      showRefresh={true}
      onRefresh={() => load()}
      showTimeRange={false}
      showSearch={false}
      showExport={false}
      showCharts={false}
      customToolbar={
        error ? (
          <Alert severity='warning'>
            {t('automation.automation_dashboard_page.l1', { v1: error })}
          </Alert>
        ) : undefined
      }
    />
  );
};

export default AutomationDashboardPage;
