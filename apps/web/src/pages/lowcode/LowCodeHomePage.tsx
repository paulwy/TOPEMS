import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import { Database, FileText, Globe, Share2, LayoutGrid } from 'lucide-react';
import { lowcodeApi } from '@/api/lowcode';
import type { LowcodeDashboardStats } from '@/api/lowcode';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => (
  <Paper sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }} elevation={0} variant="outlined">
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

export const LowCodeHomePage: React.FC = () => {
  const [stats, setStats] = useState<LowcodeDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await lowcodeApi.getDashboardStats();
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
        低代码平台概览
      </Typography>
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}（后端 lowcode 服务未就绪时显示占位统计）
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="应用总数"
            value={stats?.total_apps ?? 0}
            icon={<LayoutGrid size={22} />}
            color="primary.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="已发布应用"
            value={stats?.published_apps ?? 0}
            icon={<LayoutGrid size={22} />}
            color="success.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="数据模型"
            value={stats?.total_data_models ?? 0}
            icon={<Database size={22} />}
            color="info.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="数据源"
            value={stats?.total_data_sources ?? 0}
            icon={<Database size={22} />}
            color="warning.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="表单"
            value={stats?.total_forms ?? 0}
            icon={<FileText size={22} />}
            color="secondary.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="页面"
            value={stats?.total_pages ?? 0}
            icon={<Globe size={22} />}
            color="primary.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="工作流"
            value={stats?.total_workflows ?? 0}
            icon={<Share2 size={22} />}
            color="info.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="近 7 天活跃"
            value={stats?.recent_active_apps ?? 0}
            icon={<LayoutGrid size={22} />}
            color="success.main"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default LowCodeHomePage;
