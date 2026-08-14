import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Zap, CheckCircle2, XCircle, Activity, Clock, TrendingUp } from 'lucide-react';
import { automationApi } from '@/api/automation';
import type { AutomationDashboardStats, AutomationRunStatus } from '@/api/automation';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => (
  <Paper
    sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}
    elevation={0}
    variant='outlined'
  >
    <Box sx={{ color, display: 'flex' }}>{icon}</Box>
    <Box>
      <Typography
        variant='h5'
        component='div'
        sx={{ fontWeight: 600 }}
      >
        {value}
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {label}
      </Typography>
    </Box>
  </Paper>
);

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

const RUN_STATUS_LABEL: Record<AutomationRunStatus, string> = {
  success: i18n.t('automation.automation_dashboard_page.k0'),
  failed: i18n.t('automation.automation_dashboard_page.k1'),
  running: i18n.t('automation.automation_dashboard_page.k2'),
  pending: i18n.t('automation.automation_dashboard_page.k3'),
  cancelled: i18n.t('automation.automation_dashboard_page.k4'),
  timeout: i18n.t('automation.automation_dashboard_page.k5'),
};

export const AutomationDashboardPage: React.FC = () => {
  const { t } = useTranslation('automation');
  const [stats, setStats] = useState<AutomationDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await automationApi.getDashboardStats();
        if (!cancelled && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t('automation.automation_dashboard_page.k6')
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer title={t('automation.automation_dashboard_page.k7')}>
      <Box sx={{ p: 3 }}>
        <Typography
          variant='h5'
          sx={{ mb: 3 }}
        >
          自动化总览
        </Typography>
        {error && (
          <Alert
            severity='warning'
            sx={{ mb: 2 }}
          >
            {error}（后端 automation 服务未就绪时显示占位统计）
          </Alert>
        )}

        <Grid
          container
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <StatCard
              label={t('automation.automation_dashboard_page.k8')}
              value={stats?.total_rules ?? 0}
              icon={<Zap size={22} />}
              color='primary.main'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <StatCard
              label={t('automation.automation_dashboard_page.k9')}
              value={stats?.enabled_rules ?? 0}
              icon={<Zap size={22} />}
              color='success.main'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <StatCard
              label='24h 运行次数'
              value={stats?.runs_last_24h ?? 0}
              icon={<Activity size={22} />}
              color='info.main'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <StatCard
              label='24h 成功率'
              value={`${stats?.success_rate_24h ?? 0}%`}
              icon={<TrendingUp size={22} />}
              color={Number(stats?.success_rate_24h ?? 0) >= 90 ? 'success.main' : 'warning.main'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <StatCard
              label='24h 成功'
              value={stats?.success_last_24h ?? 0}
              icon={<CheckCircle2 size={22} />}
              color='success.main'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <StatCard
              label='24h 失败'
              value={stats?.failed_last_24h ?? 0}
              icon={<XCircle size={22} />}
              color='error.main'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <StatCard
              label={t('automation.automation_dashboard_page.k10')}
              value={`${stats?.avg_duration_ms ?? 0}ms`}
              icon={<Clock size={22} />}
              color='info.main'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <StatCard
              label={t('automation.automation_dashboard_page.k11')}
              value={stats?.disabled_rules ?? 0}
              icon={<Zap size={22} />}
              color='text.disabled'
            />
          </Grid>
        </Grid>

        {stats?.daily_stats && stats.daily_stats.length > 0 && (
          <Paper
            variant='outlined'
            sx={{ p: 2, mb: 3 }}
          >
            <Typography
              variant='subtitle1'
              sx={{ mb: 1 }}
            >
              近 7 天运行趋势
            </Typography>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('automation.automation_dashboard_page.k12')}</TableCell>
                    <TableCell align='right'>
                      {t('automation.automation_dashboard_page.k13')}
                    </TableCell>
                    <TableCell align='right'>
                      {t('automation.automation_dashboard_page.k14')}
                    </TableCell>
                    <TableCell align='right'>
                      {t('automation.automation_dashboard_page.k15')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.daily_stats.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell align='right'>{d.total}</TableCell>
                      <TableCell
                        align='right'
                        sx={{ color: 'success.main' }}
                      >
                        {d.success}
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ color: 'error.main' }}
                      >
                        {d.failed}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {stats?.recent_runs && stats.recent_runs.length > 0 && (
          <Paper
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='subtitle1'
              sx={{ mb: 1 }}
            >
              最近运行
            </Typography>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('automation.automation_dashboard_page.k16')}</TableCell>
                    <TableCell>{t('automation.automation_dashboard_page.k17')}</TableCell>
                    <TableCell>{t('automation.automation_dashboard_page.k18')}</TableCell>
                    <TableCell>{t('automation.automation_dashboard_page.k19')}</TableCell>
                    <TableCell align='right'>
                      {t('automation.automation_dashboard_page.k20')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.recent_runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{run.rule_name ?? run.rule_code ?? run.rule_id}</TableCell>
                      <TableCell>{run.trigger_type}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          color={RUN_STATUS_COLOR[run.status]}
                          label={RUN_STATUS_LABEL[run.status]}
                        />
                      </TableCell>
                      <TableCell>{run.started_at}</TableCell>
                      <TableCell align='right'>
                        {run.duration_ms ? `${run.duration_ms}ms` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    </PageContainer>
  );
};

export default AutomationDashboardPage;
