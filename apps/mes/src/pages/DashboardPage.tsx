import React, { useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Factory as FactoryIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  Speed as SpeedIcon,
  Science as ScienceIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useMesStore } from '../store/mesStore';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, suffix }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
            {value}
            {suffix && (
              <Typography component="span" variant="body2" color="text.secondary">
                {' '}
                {suffix}
              </Typography>
            )}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: `${color}.light`,
            color: `${color}.main`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const DashboardPage: React.FC = () => {
  const { mesDashboard, loading, error, loadMesDashboard } = useMesStore();

  useEffect(() => {
    loadMesDashboard();
  }, [loadMesDashboard]);

  if (loading && !mesDashboard) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          MES / LIMS / QMS 仪表盘
        </Typography>
        <Typography variant="body2" color="text.secondary">
          制造执行 / 实验室信息 / 质量安全管理数据概览
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        MES 生产概览
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="生产订单" value={mesDashboard?.total_orders ?? 0} icon={<AssignmentIcon />} color="primary" suffix="个" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="进行中" value={mesDashboard?.in_progress_orders ?? 0} icon={<FactoryIcon />} color="warning" suffix="个" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="工作站" value={mesDashboard?.active_workstations ?? 0} icon={<BuildIcon />} color="success" suffix="个" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="设备使用" value={mesDashboard?.equipment_in_use ?? 0} icon={<SpeedIcon />} color="info" suffix="台" />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="今日记录" value={mesDashboard?.today_records ?? 0} icon={<AssignmentIcon />} color="primary" suffix="条" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="月度产量" value={(mesDashboard?.total_output ?? 0).toLocaleString()} icon={<FactoryIcon />} color="success" suffix="件" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="合格率" value={mesDashboard?.quality_rate ?? 0} icon={<VerifiedIcon />} color="info" suffix="%" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="设备维护" value={mesDashboard?.equipment_maintenance ?? 0} icon={<BuildIcon />} color="warning" suffix="台" />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        LIMS / QMS / EHS 概览
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="样品总数" value={0} icon={<ScienceIcon />} color="primary" suffix="个" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="待检任务" value={0} icon={<AssignmentIcon />} color="warning" suffix="个" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="质量问题" value={0} icon={<WarningIcon />} color="error" suffix="个" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="安全检查" value={0} icon={<SecurityIcon />} color="success" suffix="次" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AssignmentIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>最近生产订单</Typography>
            </Box>
            {mesDashboard?.recent_orders && mesDashboard.recent_orders.length > 0 ? (
              <Box>
                {mesDashboard.recent_orders.slice(0, 5).map((order) => (
                  <Box key={order.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{order.order_number}</Typography>
                      <Typography variant="caption" color="text.secondary">{order.product_name}</Typography>
                    </Box>
                    <Chip label={order.status} size="small" color={order.status === 'completed' ? 'success' : 'default'} />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary" variant="body2">暂无最近订单数据</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FactoryIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>最近生产记录</Typography>
            </Box>
            {mesDashboard?.recent_records && mesDashboard.recent_records.length > 0 ? (
              <Box>
                {mesDashboard.recent_records.slice(0, 5).map((record) => (
                  <Box key={record.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>操作员: {record.operator}</Typography>
                      <Typography variant="caption" color="text.secondary">完工: {record.quantity_completed}</Typography>
                    </Box>
                    <Chip label={record.status} size="small" color={record.status === 'completed' ? 'success' : 'default'} />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary" variant="body2">暂无最近记录数据</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
