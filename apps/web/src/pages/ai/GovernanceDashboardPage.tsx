/**
 * AI 治理仪表盘页面
 *
 * 独立展示 AI 治理仪表盘，包括：
 * - 总体治理评分
 * - 风险评估
 * - 合规状态
 * - 成本分析
 * - 性能指标
 * - 安全事件
 * - 趋势数据
 * - 建议和改进项
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  Button,
  IconButton,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import { Grid } from '@/components/common';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RefreshIcon from '@mui/icons-material/Refresh';
import SecurityIcon from '@mui/icons-material/Security';
import GavelIcon from '@mui/icons-material/Gavel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

import { GovernanceDashboard } from '@/components/ai/business';
import { useGovernanceDashboard } from '@/hooks/features/ai/useGovernanceDashboard';
import { useTranslation } from 'react-i18next';
import type { TimeRange } from '@/api/ai/governanceDashboard';

// ============================================================================
// 页面组件
// ============================================================================

const GovernanceDashboardPage: React.FC = () => {
  const { t } = useTranslation();

  // 状态
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24h');

  // 使用治理仪表盘 Hook
  const {
    dashboard,
    isLoading,
    error,
    autoRefresh,
    lastRefreshed,
    loadDashboard,
    refresh,
    setTimeRange,
    setAutoRefresh,
    clearCacheAndRefresh,
    clearError,
  } = useGovernanceDashboard('24h', false, 300000);

  // 处理时间范围变化
  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    setTimeRange(range);
    loadDashboard(range);
  };

  // 时间范围选项
  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '1h', label: t('ai.governance_dashboard.range_1h') },
    { value: '24h', label: t('ai.governance_dashboard.range_24h') },
    { value: '7d', label: t('ai.governance_dashboard.range_7d') },
    { value: '30d', label: t('ai.governance_dashboard.range_30d') },
  ];

  // 渲染加载状态
  if (isLoading && !dashboard) {
    return (
      <Container
        maxWidth='xl'
        sx={{ py: 3 }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
          }}
        >
          <CircularProgress size={60} />
          <Typography
            variant='h6'
            sx={{ mt: 2 }}
          >
            {t('ai.governance_dashboard.loading')}
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <Container
      maxWidth='xl'
      sx={{ py: 3 }}
    >
      {/* 页面标题和控制栏 */}
      <Box sx={{ mb: 3 }}>
        <Grid
          container
          spacing={2}
          sx={{ alignItems: 'center' }}
        >
          <Grid
            xs={12}
            md={6}
          >
            <Typography
              variant='h4'
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <DashboardIcon
                color='primary'
                sx={{ fontSize: 40 }}
              />
              {t('ai.governance_dashboard.title')}
            </Typography>
            <Typography
              variant='body1'
              color='text.secondary'
            >
              {t('ai.governance_dashboard.subtitle')}
            </Typography>
          </Grid>
          <Grid
            xs={12}
            md={6}
          >
            <Stack
              direction='row'
              spacing={2}
              sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
            >
              {/* 时间范围选择 */}
              <FormControl
                size='small'
                sx={{ minWidth: 150 }}
              >
                <InputLabel>{t('ai.governance_dashboard.time_range')}</InputLabel>
                <Select
                  value={selectedTimeRange}
                  label={t('ai.governance_dashboard.time_range')}
                  onChange={(e) => handleTimeRangeChange(e.target.value as TimeRange)}
                >
                  {timeRangeOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* 自动刷新开关 */}
              <Button
                variant={autoRefresh ? 'contained' : 'outlined'}
                size='small'
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh
                  ? t('ai.governance_dashboard.auto_refreshing')
                  : t('ai.governance_dashboard.enable_auto_refresh')}
              </Button>

              {/* 刷新按钮 */}
              <Button
                variant='outlined'
                size='small'
                startIcon={<RefreshIcon />}
                onClick={refresh}
                disabled={isLoading}
              >
                {isLoading
                  ? t('ai.governance_dashboard.refreshing')
                  : t('ai.governance_dashboard.refresh')}
              </Button>

              {/* 清除缓存按钮 */}
              <Button
                variant='outlined'
                size='small'
                color='secondary'
                onClick={clearCacheAndRefresh}
              >
                {t('ai.governance_dashboard.clear_cache')}
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {/* 最后刷新时间 */}
        {lastRefreshed && (
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mt: 1 }}
          >
            {t('ai.governance_dashboard.last_updated', {
              time: lastRefreshed.toLocaleString('zh-CN'),
            })}
          </Typography>
        )}
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          action={
            <IconButton
              size='small'
              onClick={clearError}
            >
              <ErrorIcon fontSize='small' />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* 治理仪表盘组件 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <GovernanceDashboard data={dashboard} />
      </Paper>

      {/* 详细信息面板 */}
      {dashboard && (
        <Grid
          container
          spacing={3}
        >
          {/* 风险评估详情 */}
          <Grid
            xs={12}
            md={6}
          >
            <Card>
              <CardContent>
                <Typography
                  variant='h6'
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <SecurityIcon color='warning' />
                  {t('ai.governance_dashboard.risk_details')}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('ai.governance_dashboard.overall_risk_level')}
                    </Typography>
                    <Chip
                      label={dashboard.risk_assessment.overall_risk_level}
                      color={
                        dashboard.risk_assessment.overall_risk_level === 'low'
                          ? 'success'
                          : dashboard.risk_assessment.overall_risk_level === 'medium'
                            ? 'warning'
                            : 'error'
                      }
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('ai.governance_dashboard.risk_score', {
                        score: dashboard.risk_assessment.risk_score,
                      })}
                    </Typography>
                    <LinearProgress
                      variant='determinate'
                      value={dashboard.risk_assessment.risk_score}
                      color={
                        dashboard.risk_assessment.risk_score < 30
                          ? 'success'
                          : dashboard.risk_assessment.risk_score < 60
                            ? 'warning'
                            : 'error'
                      }
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* 合规状态详情 */}
          <Grid
            xs={12}
            md={6}
          >
            <Card>
              <CardContent>
                <Typography
                  variant='h6'
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <GavelIcon color='primary' />
                  {t('ai.governance_dashboard.compliance_details')}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('ai.governance_dashboard.overall_compliance_rate')}
                    </Typography>
                    <Typography
                      variant='h4'
                      color='primary'
                    >
                      {dashboard.compliance_status.overall_compliance_rate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Grid
                    container
                    spacing={2}
                  >
                    <Grid xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <CheckCircleIcon
                          color='success'
                          sx={{ fontSize: 32 }}
                        />
                        <Typography variant='h6'>
                          {dashboard.compliance_status.passed_checks}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {t('ai.governance_dashboard.passed')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <ErrorIcon
                          color='error'
                          sx={{ fontSize: 32 }}
                        />
                        <Typography variant='h6'>
                          {dashboard.compliance_status.failed_checks}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {t('ai.governance_dashboard.failed')}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid xs={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <InfoIcon
                          color='info'
                          sx={{ fontSize: 32 }}
                        />
                        <Typography variant='h6'>
                          {dashboard.compliance_status.pending_checks}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {t('ai.governance_dashboard.pending')}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* 成本分析详情 */}
          <Grid
            xs={12}
            md={6}
          >
            <Card>
              <CardContent>
                <Typography
                  variant='h6'
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <AttachMoneyIcon color='success' />
                  {t('ai.governance_dashboard.cost_details')}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('ai.governance_dashboard.total_cost')}
                    </Typography>
                    <Typography
                      variant='h4'
                      color='success.main'
                    >
                      ¥{dashboard.cost_analysis.total_cost.toFixed(2)}
                    </Typography>
                    <Chip
                      label={t('ai.governance_dashboard.trend', {
                        value: `${dashboard.cost_analysis.cost_trend_percent > 0 ? '+' : ''}${dashboard.cost_analysis.cost_trend_percent.toFixed(1)}%`,
                      })}
                      color={dashboard.cost_analysis.cost_trend_percent > 0 ? 'error' : 'success'}
                      size='small'
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('ai.governance_dashboard.budget_usage', {
                        percent: dashboard.cost_analysis.budget_usage.usage_percent.toFixed(1),
                      })}
                    </Typography>
                    <LinearProgress
                      variant='determinate'
                      value={Math.min(dashboard.cost_analysis.budget_usage.usage_percent, 100)}
                      color={
                        dashboard.cost_analysis.budget_usage.usage_percent < 70
                          ? 'success'
                          : dashboard.cost_analysis.budget_usage.usage_percent < 90
                            ? 'warning'
                            : 'error'
                      }
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* 性能指标详情 */}
          <Grid
            xs={12}
            md={6}
          >
            <Card>
              <CardContent>
                <Typography
                  variant='h6'
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <SpeedIcon color='info' />
                  {t('ai.governance_dashboard.performance_details')}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid
                  container
                  spacing={2}
                >
                  <Grid xs={6}>
                    <Box>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('ai.governance_dashboard.avg_response_time')}
                      </Typography>
                      <Typography variant='h6'>
                        {dashboard.performance_metrics.average_response_ms}ms
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid xs={6}>
                    <Box>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('ai.governance_dashboard.p95_response_time')}
                      </Typography>
                      <Typography variant='h6'>
                        {dashboard.performance_metrics.p95_response_ms}ms
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid xs={6}>
                    <Box>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('ai.governance_dashboard.throughput')}
                      </Typography>
                      <Typography variant='h6'>
                        {dashboard.performance_metrics.throughput}/s
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid xs={6}>
                    <Box>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('ai.governance_dashboard.error_rate')}
                      </Typography>
                      <Typography
                        variant='h6'
                        color={dashboard.performance_metrics.error_rate > 1 ? 'error' : 'success'}
                      >
                        {dashboard.performance_metrics.error_rate.toFixed(2)}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 建议和改进项 */}
      {dashboard && dashboard.recommendations.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography
            variant='h6'
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <LightbulbIcon color='warning' />
            {t('ai.governance_dashboard.suggestions')}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <List>
            {dashboard.recommendations.slice(0, 5).map((rec) => (
              <ListItem
                key={rec.recommendation_id}
                alignItems='flex-start'
              >
                <ListItemIcon>
                  <Avatar
                    sx={{
                      bgcolor:
                        rec.priority === 'critical'
                          ? 'error.main'
                          : rec.priority === 'high'
                            ? 'warning.main'
                            : rec.priority === 'medium'
                              ? 'info.main'
                              : 'success.main',
                    }}
                  >
                    {rec.priority === 'critical' ? (
                      <WarningIcon />
                    ) : rec.priority === 'high' ? (
                      <TrendingUpIcon />
                    ) : (
                      <LightbulbIcon />
                    )}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant='subtitle1'>{rec.title}</Typography>
                      <Chip
                        label={rec.priority}
                        size='small'
                      />
                      <Chip
                        label={rec.category}
                        size='small'
                        variant='outlined'
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {rec.description}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {t('ai.governance_dashboard.expected_benefit', {
                          benefit: rec.expected_benefit,
                          effort: rec.implementation_effort,
                        })}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Container>
  );
};

export default GovernanceDashboardPage;
