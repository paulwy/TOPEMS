import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardContent, LinearProgress, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, Users, Target, DollarSign } from 'lucide-react';
import { useAppStore } from '../../store';
import { StatsPageTemplate, type StatsStatCard, type ChartConfig } from '@/components/templates';
import apiClient from '@/api/client';
import { PageContainer } from '@/components/common';

interface FunnelStage {
  stage: string;
  count: number;
  total_value: number;
  avg_value: number;
  probability?: number;
}

interface FunnelMetrics {
  total_opportunities: number;
  total_value: number;
  avg_value: number;
  conversion_rate: number;
  weighted_value: number;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

const stageLabelMap: Record<string, string> = {
  lead: '潜在客户',
  qualified: '意向确认',
  proposal: '方案提交',
  negotiation: '商务谈判',
  closed_won: '赢单',
  closed_lost: '输单',
};

const CRMSalesFunnelPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFunnel = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsRes, stagesRes] = await Promise.allSettled([
        apiClient.crm.get('/sales-funnel/metrics'),
        apiClient.crm.get('/sales-funnel'),
      ]);
      if (metricsRes.status === 'fulfilled' && metricsRes.value.success) {
        setMetrics(metricsRes.value.data as FunnelMetrics);
      }
      if (stagesRes.status === 'fulfilled' && stagesRes.value.success) {
        const data = (stagesRes.value.data as { stages?: FunnelStage[] }) || {};
        setStages(data.stages || []);
      }
    } catch (error: unknown) {
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载销售漏斗数据',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadFunnel();
  }, [loadFunnel]);

  const stats: StatsStatCard[] = [
    {
      id: 'total',
      title: '商机总数',
      value: metrics?.total_opportunities ?? 0,
      icon: <Users size={20} />,
      color: 'primary',
    },
    {
      id: 'value',
      title: '总价值',
      value: `¥${Math.round(Number(metrics?.total_value ?? 0)).toLocaleString()}`,
      icon: <DollarSign size={20} />,
      color: 'success',
    },
    {
      id: 'avg',
      title: '平均价值',
      value: `¥${Math.round(Number(metrics?.avg_value ?? 0)).toLocaleString()}`,
      icon: <Target size={20} />,
      color: 'info',
    },
    {
      id: 'conversion',
      title: '转化率',
      value: `${(metrics?.conversion_rate ?? 0).toFixed(1)}%`,
      icon: <TrendingUp size={20} />,
      color: 'warning',
    },
  ];

  const charts: ChartConfig[] = [
    {
      id: 'stage-distribution',
      title: '各阶段商机数',
      type: 'bar' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: stages.flatMap((stage) => [
        {
          name: `${stageLabelMap[stage.stage] || stage.stage}-商机数`,
          value: stage.count,
          color: 'primary.main',
        },
        {
          name: `${stageLabelMap[stage.stage] || stage.stage}-总价值(万)`,
          value: Math.round(Number(stage.total_value) / 10000),
          color: 'success.main',
        },
      ]),
    },
  ];

  return (
    <PageContainer
      title='销售漏斗'
      subtitle='可视化销售机会的阶段性转化'
      maxWidth='xl'
      autoTitle
      autoBreadcrumbs
    >
      <StatsPageTemplate
        title='漏斗分析'
        statCards={stats}
        charts={charts}
        loading={loading}
        onRefresh={loadFunnel}
        timeRangeOptions={[
          { value: 'month', label: '本月' },
          { value: 'quarter', label: '本季' },
          { value: 'year', label: '本年' },
          { value: 'all', label: '全部' },
        ]}
      />

      {/* 漏斗阶段详情 */}
      <Box sx={{ mt: 4 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          各阶段详情
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {stages.map((stage, idx) => {
            const max = Math.max(...stages.map((s) => s.count), 1);
            return (
              <Card
                key={stage.stage}
                variant='outlined'
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        阶段 {idx + 1}
                      </Typography>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600 }}
                      >
                        {stageLabelMap[stage.stage] || stage.stage}
                      </Typography>
                    </Box>
                    {stage.probability !== undefined && (
                      <Chip
                        label={`${Math.round(Number(stage.probability))}%`}
                        color='primary'
                        size='small'
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700 }}
                      color='primary.main'
                    >
                      {stage.count}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      个商机
                    </Typography>
                  </Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    总价值: ¥{Math.round(Number(stage.total_value)).toLocaleString()}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2 }}
                  >
                    平均价值: ¥{Math.round(Number(stage.avg_value)).toLocaleString()}
                  </Typography>
                  <LinearProgress
                    variant='determinate'
                    value={(stage.count / max) * 100}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>
    </PageContainer>
  );
};

export default CRMSalesFunnelPage;
