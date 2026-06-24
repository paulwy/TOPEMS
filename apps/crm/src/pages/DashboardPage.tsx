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
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  MonetizationOn as MonetizationOnIcon,
  Receipt as ReceiptIcon,
  Event as EventIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useCrmStore } from '../store/crmStore';

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
  const { dashboardSummary, loading, error, loadDashboardSummary } = useCrmStore();

  useEffect(() => {
    loadDashboardSummary();
  }, [loadDashboardSummary]);

  if (loading && !dashboardSummary) {
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
          CRM 仪表盘
        </Typography>
        <Typography variant="body2" color="text.secondary">
          客户关系管理数据概览
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="客户总数"
            value={dashboardSummary?.total_customers ?? 0}
            icon={<PeopleIcon />}
            color="primary"
            suffix="个"
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="活跃客户"
            value={dashboardSummary?.active_customers ?? 0}
            icon={<PeopleIcon />}
            color="success"
            suffix="个"
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="销售机会"
            value={dashboardSummary?.total_opportunities ?? 0}
            icon={<TrendingUpIcon />}
            color="warning"
            suffix="个"
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="管道价值"
            value={(dashboardSummary?.total_pipeline_value ?? 0).toLocaleString()}
            icon={<MonetizationOnIcon />}
            color="info"
            suffix="元"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="总收入"
            value={(dashboardSummary?.total_revenue ?? 0).toLocaleString()}
            icon={<MonetizationOnIcon />}
            color="success"
            suffix="元"
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="待回款"
            value={dashboardSummary?.pending_billing ?? 0}
            icon={<ReceiptIcon />}
            color="warning"
            suffix="笔"
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="逾期账单"
            value={dashboardSummary?.overdue_billing ?? 0}
            icon={<ReceiptIcon />}
            color="error"
            suffix="笔"
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard
            title="近期互动"
            value={dashboardSummary?.recent_interactions ?? 0}
            icon={<EventIcon />}
            color="info"
            suffix="次"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AssessmentIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                重点客户
              </Typography>
            </Box>
            {dashboardSummary?.top_customers && dashboardSummary.top_customers.length > 0 ? (
              <Box>
                {dashboardSummary.top_customers.slice(0, 5).map((customer) => (
                  <Box
                    key={customer.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {customer.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {customer.industry || '未分类'}
                      </Typography>
                    </Box>
                    <Chip
                      label={customer.rating || '未评级'}
                      size="small"
                      color={customer.rating === 'A' ? 'success' : 'default'}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary" variant="body2">
                暂无重点客户数据
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EventIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                即将到来的互动
              </Typography>
            </Box>
            {dashboardSummary?.upcoming_interactions &&
            dashboardSummary.upcoming_interactions.length > 0 ? (
              <Box>
                {dashboardSummary.upcoming_interactions.slice(0, 5).map((interaction) => (
                  <Box
                    key={interaction.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {interaction.subject || interaction.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {interaction.scheduled_at
                          ? new Date(interaction.scheduled_at).toLocaleString('zh-CN')
                          : '未排期'}
                      </Typography>
                    </Box>
                    <Chip
                      label={interaction.status}
                      size="small"
                      color={interaction.status === 'completed' ? 'success' : 'default'}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary" variant="body2">
                暂无即将到来的互动
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
