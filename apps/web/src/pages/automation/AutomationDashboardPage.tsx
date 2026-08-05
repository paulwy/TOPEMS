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
import {
  Zap,
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { automationApi } from '@/api/automation';
import type { AutomationDashboardStats, AutomationRunStatus } from '@/api/automation';

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
    variant="outlined"
  >
    <Box sx={{ color, display: 'flex' }}>{icon}</Box>
    <Box>
      <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  </Paper>
);

const RUN_STATUS_COLOR: Record<AutomationRunStatus, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  success: 'success',
  failed: 'error',
  running: 'info',
  pending: 'warning',
  cancelled: 'default',
  timeout: 'error',
};

const RUN_STATUS_LABEL: Record<AutomationRunStatus, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
  pending: '等待',
  cancelled: '已取消',
  timeout: '超时',
};

export const AutomationDashboardPage: React.FC = () => {
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
          setError(err instanceof Error ? err.message : '加载统计数据失败');
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        自动化总览
      </Typography>
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}（后端 automation 服务未就绪时显示占位统计）
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="规则总数"
            value={stats?.total_rules ?? 0}
            icon={<Zap size={22} />}
            color="primary.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="启用规则"
            value={stats?.enabled_rules ?? 0}
            icon={<Zap size={22} />}
            color="success.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="24h 运行次数"
            value={stats?.runs_last_24h ?? 0}
            icon={<Activity size={22} />}
            color="info.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="24h 成功率"
            value={`${stats?.success_rate_24h ?? 0}%`}
            icon={<TrendingUp size={22} />}
            color={Number(stats?.success_rate_24h ?? 0) >= 90 ? 'success.main' : 'warning.main'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="24h 成功"
            value={stats?.success_last_24h ?? 0}
            icon={<CheckCircle2 size={22} />}
            color="success.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="24h 失败"
            value={stats?.failed_last_24h ?? 0}
            icon={<XCircle size={22} />}
            color="error.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="平均耗时"
            value={`${stats?.avg_duration_ms ?? 0}ms`}
            icon={<Clock size={22} />}
            color="info.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="禁用规则"
            value={stats?.disabled_rules ?? 0}
            icon={<Zap size={22} />}
            color="text.disabled"
          />
        </Grid>
      </Grid>

      {stats?.daily_stats && stats.daily_stats.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            近 7 天运行趋势
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>日期</TableCell>
                  <TableCell align="right">总数</TableCell>
                  <TableCell align="right">成功</TableCell>
                  <TableCell align="right">失败</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.daily_stats.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell>{d.date}</TableCell>
                    <TableCell align="right">{d.total}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {d.success}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
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
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            最近运行
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>规则</TableCell>
                  <TableCell>触发方式</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>开始时间</TableCell>
                  <TableCell align="right">耗时</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.recent_runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{run.rule_name ?? run.rule_code ?? run.rule_id}</TableCell>
                    <TableCell>{run.trigger_type}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={RUN_STATUS_COLOR[run.status]}
                        label={RUN_STATUS_LABEL[run.status]}
                      />
                    </TableCell>
                    <TableCell>{run.started_at}</TableCell>
                    <TableCell align="right">
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
  );
};

export default AutomationDashboardPage;
