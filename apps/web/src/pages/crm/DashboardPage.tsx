import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, CardHeader, Grid, useTheme } from '@mui/material';
import {
  TrendingUp,
  Users,
  FileText,
  ArrowRight,
  Target,
  CheckCircle,
  TrendingDown,
  Activity,
} from 'lucide-react';
import BarChartComponent from '../../components/charts/BarChart';
import { useNotificationStore } from '@/store';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainer';
import { crmApi } from '@/api/crm';
import { logger } from '@/utils/logger';
import type { FunnelStage, OpportunityStats } from '@/api/crm';
import { CRM_PATHS } from '@/modules/crm/config';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  TrendingUp,
  Users,
  FileText,
  Target,
  CheckCircle,
};

export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const statsQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.OPPORTUNITY_STATS,
    queryFn: async (): Promise<OpportunityStats | null> => {
      try {
        const response = await crmApi.opportunities.getStats();
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 401) {
          logger.warn('CRM 服务需要认证，请先登录');
        } else if (status === 503) {
          logger.warn('CRM 服务暂不可用，显示示例数据');
        } else {
          logger.error('加载仪表盘数据失败:', error);
        }
        return null;
      }
    },
  });

  const funnelQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.OPPORTUNITY_FUNNEL,
    queryFn: async (): Promise<FunnelStage[]> => {
      try {
        const response = await crmApi.opportunities.getFunnel();
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 401) {
          logger.warn('CRM 服务需要认证，请先登录');
        } else if (status === 503) {
          logger.warn('CRM 服务暂不可用，显示示例数据');
        } else {
          logger.error('加载仪表盘数据失败:', error);
        }
        return [];
      }
    },
  });

  const stats = statsQuery.data ?? null;
  const funnelData = funnelQuery.data ?? [];
  const loading = statsQuery.isLoading || funnelQuery.isLoading;

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const funnelBarData = funnelData.map((item) => ({
    name: item.stage_label,
    value: item.count,
  }));

  const funnelValueData = funnelData.map((item) => ({
    name: item.stage_label,
    value: item.total_value || 0,
  }));

  const wonRate =
    stats && stats.total_count > 0 ? Math.round((stats.won_count / stats.total_count) * 100) : 0;

  const statsCards: StatCard[] = [
    {
      id: 'customer-total',
      title: '商机总数',
      value: (stats?.total_count || 89).toString(),
      change: 12,
      changeLabel: 'vs 上周期',
      icon: <Target size={24} />,
      color: 'primary',
    },
    {
      id: 'opportunity-count',
      title: '总金额',
      value: `¥${(stats?.total_value || 5680000).toLocaleString()}`,
      change: 15,
      changeLabel: 'vs 上周期',
      icon: <TrendingUp size={24} />,
      color: 'info',
    },
    {
      id: 'monthly-deals',
      title: '赢单数量',
      value: (stats?.won_count || 15).toString(),
      change: 3,
      changeLabel: 'vs 上周期',
      icon: <CheckCircle size={24} />,
      color: 'success',
    },
    {
      id: 'sales-amount',
      title: '赢单率',
      value: `${wonRate}%`,
      change: wonRate > 50 ? 5 : -3,
      changeLabel: 'vs 上周期',
      icon: <Activity size={24} />,
      color: wonRate > 50 ? 'success' : 'warning',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'funnel-count',
      title: '销售漏斗 - 商机数量',
      height: 300,
      chart: (
        <BarChartComponent
          data={funnelBarData}
          xKey='name'
          yKey='value'
        />
      ),
    },
    {
      id: 'funnel-value',
      title: '销售漏斗 - 金额分布',
      height: 300,
      chart: (
        <BarChartComponent
          data={funnelValueData}
          xKey='name'
          yKey='value'
        />
      ),
    },
    {
      id: 'conversion-rate',
      title: '商机阶段占比',
      height: 300,
      chart: (
        <PieChartComponent
          data={funnelData.map((item) => ({
            name: item.stage_label,
            value: item.count,
          }))}
        />
      ),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'add-customer',
      label: '新增客户',
      icon: <ArrowRight size={20} />,
      href: CRM_PATHS.customerCreate,
      color: 'primary.main',
    },
    {
      id: 'create-opportunity',
      label: '创建商机',
      icon: <ArrowRight size={20} />,
      href: CRM_PATHS.opportunities,
      color: 'success.main',
    },
    {
      id: 'customer-scoring',
      label: '客户评分',
      icon: <ArrowRight size={20} />,
      href: CRM_PATHS.customerScoring,
      color: 'secondary.main',
    },
    {
      id: 'sales-report',
      label: '销售预测',
      icon: <ArrowRight size={20} />,
      href: CRM_PATHS.salesForecast,
      color: 'warning.main',
    },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ fontSize: '1.125rem', color: 'grey.600' }}>加载中...</Typography>
      </Box>
    );
  }

  return (
    <PageContainer
      title='客户关系仪表盘'
      subtitle={`${getGreeting()}，客户管理与销售分析`}
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
    >
      <Card sx={{ mb: 3 }}>
        <CardHeader>
          <Typography
            variant='h6'
            sx={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <TrendingUp style={{ width: 20, height: 20 }} />
            销售漏斗概览
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500' }}
          >
            各阶段商机转化情况
          </Typography>
        </CardHeader>
        <CardContent>
          <Grid
            container
            spacing={2}
          >
            {funnelData.map((item, index) => {
              const widthPercent = 100 - index * 10;
              const stageColors: Record<string, string> = {
                prospecting: 'text.disabled',
                qualified: 'primary.main',
                proposal: 'secondary.main',
                negotiation: 'warning.main',
                closed_won: 'success.main',
                closed_lost: 'error.main',
              };
              return (
                <Grid
                  size={{ xs: 12 }}
                  key={item.stage}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 60,
                        textAlign: 'right',
                        fontSize: '0.875rem',
                      }}
                    >
                      {item.stage_label}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <div
                        style={{
                          height: 24,
                          backgroundColor: theme.palette.grey[100],
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: stageColors[item.stage] || theme.palette.grey[500],
                            width: `${widthPercent}%`,
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: 8,
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                          }}
                        >
                          {item.count} ({(item.total_value || 0).toLocaleString()})
                        </div>
                      </div>
                    </Box>
                    <Box
                      sx={{
                        width: 80,
                        textAlign: 'right',
                        fontSize: '0.875rem',
                      }}
                    >
                      {item.avg_probability ? `${item.avg_probability.toFixed(0)}%` : '-'}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '客户关系' }]}
        stats={statsCards}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
      />
    </PageContainer>
  );
};

export default DashboardPage;
