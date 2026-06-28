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
  LinearProgress,
} from '@mui/material';

import { usePmStore } from '../store/pmStore';
import { AlertTriangle, BarChart3, CalendarDays, ClipboardList, DollarSign, FileText, Flag, TrendingUp } from 'lucide-react';
const AssessmentIcon = BarChart3;
const AssignmentIcon = ClipboardList;
const DescriptionIcon = FileText;
const EventIcon = CalendarDays;
const FlagIcon = Flag;
const MonetizationOnIcon = DollarSign;
const TrendingUpIcon = TrendingUp;
const WarningIcon = AlertTriangle;

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
  const { dashboardSummary, loading, error, loadDashboardSummary } = usePmStore();

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
          PM 仪表盘
        </Typography>
        <Typography variant="body2" color="text.secondary">
          项目管理数据概览
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="项目总数"
            value={dashboardSummary?.total_projects ?? 0}
            icon={<AssignmentIcon />}
            color="primary"
            suffix="个"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="进行中项目"
            value={dashboardSummary?.active_projects ?? 0}
            icon={<TrendingUpIcon />}
            color="success"
            suffix="个"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="已完成项目"
            value={dashboardSummary?.completed_projects ?? 0}
            icon={<FlagIcon />}
            color="primary"
            suffix="个"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="待审批项目"
            value={dashboardSummary?.pending_projects ?? 0}
            icon={<AssignmentIcon />}
            color="warning"
            suffix="个"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="任务总数"
            value={dashboardSummary?.total_tasks ?? 0}
            icon={<AssignmentIcon />}
            color="info"
            suffix="个"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="已完成任务"
            value={dashboardSummary?.completed_tasks ?? 0}
            icon={<FlagIcon />}
            color="success"
            suffix="个"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="逾期任务"
            value={dashboardSummary?.overdue_tasks ?? 0}
            icon={<WarningIcon />}
            color="error"
            suffix="个"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="高风险"
            value={dashboardSummary?.high_risks ?? 0}
            icon={<WarningIcon />}
            color="error"
            suffix="项"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="合同总数"
            value={dashboardSummary?.total_contracts ?? 0}
            icon={<DescriptionIcon />}
            color="info"
            suffix="份"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="进行中合同"
            value={dashboardSummary?.active_contracts ?? 0}
            icon={<DescriptionIcon />}
            color="success"
            suffix="份"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="里程碑"
            value={dashboardSummary?.total_milestones ?? 0}
            icon={<EventIcon />}
            color="primary"
            suffix="个"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="即将到来里程碑"
            value={dashboardSummary?.upcoming_milestones ?? 0}
            icon={<EventIcon />}
            color="warning"
            suffix="个"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <MonetizationOnIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                预算概览
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  总预算
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {(dashboardSummary?.total_budget ?? 0).toLocaleString()} 元
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  已使用
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {(dashboardSummary?.spent_budget ?? 0).toLocaleString()} 元
                </Typography>
              </Box>
              {dashboardSummary && dashboardSummary.total_budget > 0 && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      100,
                      ((dashboardSummary.spent_budget ?? 0) / dashboardSummary.total_budget) * 100
                    )}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AssessmentIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                项目状态
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">进行中</Typography>
                <Chip
                  label={dashboardSummary?.active_projects ?? 0}
                  size="small"
                  color="success"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">已完成</Typography>
                <Chip
                  label={dashboardSummary?.completed_projects ?? 0}
                  size="small"
                  color="primary"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">待审批</Typography>
                <Chip
                  label={dashboardSummary?.pending_projects ?? 0}
                  size="small"
                  color="warning"
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
