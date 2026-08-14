import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  FileText,
  BarChart3,
  ClipboardList,
  Plus,
  BookOpen,
  AlertTriangle,
  LineChart,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { qmsApi } from '@/api/qms';
import type { QualityOverview } from '@/api/qms';
import { designTokens } from '@/theme/tokens';
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
import { QMS_PATHS } from '@/modules/qms/config';

const ct= designTokens.colors;

const QmsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: overview,
    isPending: loading,
    refetch: loadDashboardData,
  } = useQuery<QualityOverview | null>({
    queryKey: QUERY_KEYS.QMS.DASHBOARD,
    queryFn: async () => {
      const [overviewRes] = await Promise.all([
        qmsApi.getQualityOverview(),
        qmsApi.getStatistics(),
      ]);
      if (!overviewRes.success) {
        throw new Error(overviewRes.message || '加载质量概览失败');
      }
      return overviewRes.data ?? null;
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const stats: StatCard[] = [
    {
      id: 'total-inspections',
      title: '检验总数',
      value: overview?.totalInspections ?? 0,
      icon: <ClipboardCheck style={{ width: 24, height: 24 }} />,
      color: 'primary',
      change: overview?.totalInspections ? 5 : undefined,
      changeLabel: '较上月',
    },
    {
      id: 'pass-rate',
      title: '合格率',
      value: overview?.passRate != null ? `${overview.passRate.toFixed(1)}%` : '0%',
      icon: <CheckCircle style={{ width: 24, height: 24 }} />,
      color: 'success',
      change: overview?.passRate && overview.passRate >= 95 ? 1.2 : -0.3,
      changeLabel: '较上月',
    },
    {
      id: 'defect-count',
      title: '不合格品数',
      value: overview?.totalIssues ?? 0,
      icon: <XCircle style={{ width: 24, height: 24 }} />,
      color: 'error',
      change: overview?.totalIssues ? -2 : undefined,
      changeLabel: '较上月',
    },
    {
      id: 'eightd-count',
      title: '8D报告数',
      value: overview?.eightdCount ?? 0,
      icon: <FileText style={{ width: 24, height: 24 }} />,
      color: 'warning',
    },
    {
      id: 'spc-count',
      title: 'SPC图表数',
      value: overview?.spcChartCount ?? 0,
      icon: <BarChart3 style={{ width: 24, height: 24 }} />,
      color: 'info',
    },
    {
      id: 'audit-count',
      title: '审核计划数',
      value: overview?.auditPlanCount ?? 0,
      icon: <ClipboardList style={{ width: 24, height: 24 }} />,
      color: 'secondary',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'inspection-trend',
      title: '各月检验趋势',
      type: 'bar',
      height: 350,
      chart: (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? (
            <Skeleton
              variant='rectangular'
              width='100%'
              height='100%'
            />
          ) : overview?.trendData && overview.trendData.length > 0 ? (
            <Box sx={{ width: '100%', height: '100%', p: 2 }}>
              {overview.trendData.map((item, index) => (
                <Box
                  key={index}
                  sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mb: 1 }}
                >
                  <Typography
                    variant='caption'
                    sx={{ width: 80, flexShrink: 0 }}
                  >
                    {item.date}
                  </Typography>
                  <Box
                    sx={{
                      width: 20,
                      height: `${(item.passRate / 100) * 200}px`,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      minWidth: 20,
                    }}
                  />
                  <Typography variant='caption'>{item.passRate.toFixed(1)}%</Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color='text.secondary'>暂无趋势数据</Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'defect-distribution',
      title: '不合格类型分布',
      type: 'pie',
      height: 350,
      chart: (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? (
            <Skeleton
              variant='rectangular'
              width='100%'
              height='100%'
            />
          ) : overview?.topIssues && overview.topIssues.length > 0 ? (
            <Box sx={{ width: '100%', p: 2 }}>
              {overview.topIssues.map((item, index) => {
                const colors = [
                  ct.secondary[400],
                  ct.warning.main,
                  ct.error.main,
                  ct.success.main,
                  ct.secondary.main,
                ];
                return (
                  <Box
                    key={index}
                    sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: colors[index % colors.length],
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant='body2'
                      sx={{ flex: 1 }}
                    >
                      {item.category}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600 }}
                    >
                      {item.count}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      ({item.percentage.toFixed(1)}%)
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Typography color='text.secondary'>暂无分布数据</Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'spc-overview',
      title: 'SPC控制图概览',
      type: 'line',
      height: 350,
      chart: (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? (
            <Skeleton
              variant='rectangular'
              width='100%'
              height='100%'
            />
          ) : overview?.trendData && overview.trendData.length > 0 ? (
            <Box sx={{ width: '100%', p: 2 }}>
              <svg
                width='100%'
                height='200'
                viewBox='0 0 400 200'
                preserveAspectRatio='none'
              >
                {overview.trendData.map((item, index) => {
                  const x = (index / Math.max(overview!.trendData.length - 1, 1)) * 380 + 10;
                  const y = 200 - (item.passRate / 100) * 180 - 10;
                  return (
                    <React.Fragment key={index}>
                      <circle
                        cx={x}
                        cy={y}
                        r={4}
                        fill={ct.secondary[400]}
                      />
                      {index < overview!.trendData.length - 1 && (
                        <line
                          x1={x}
                          y1={y}
                          x2={
                            ((index + 1) / Math.max(overview!.trendData.length - 1, 1)) * 380 + 10
                          }
                          y2={200 - (overview!.trendData[index + 1].passRate / 100) * 180 - 10}
                          stroke={ct.secondary[400]}
                          strokeWidth={2}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
                <line
                  x1={10}
                  y1={10}
                  x2={390}
                  y2={10}
                  stroke='error.main'
                  strokeWidth={1}
                  strokeDasharray='4'
                />
                <text
                  x={392}
                  y={14}
                  fontSize={10}
                  fill='error.main'
                >
                  UCL
                </text>
                <line
                  x1={10}
                  y1={100}
                  x2={390}
                  y2={100}
                  stroke='success.main'
                  strokeWidth={1}
                  strokeDasharray='4'
                />
                <text
                  x={392}
                  y={104}
                  fontSize={10}
                  fill='success.main'
                >
                  CL
                </text>
                <line
                  x1={10}
                  y1={190}
                  x2={390}
                  y2={190}
                  stroke='error.main'
                  strokeWidth={1}
                  strokeDasharray='4'
                />
                <text
                  x={392}
                  y={194}
                  fontSize={10}
                  fill='error.main'
                >
                  LCL
                </text>
              </svg>
            </Box>
          ) : (
            <Typography color='text.secondary'>暂无SPC数据</Typography>
          )}
        </Box>
      ),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'new-inspection',
      label: '新建检验',
      icon: <Plus style={{ width: 20, height: 20 }} />,
      onClick: () => navigate(QMS_PATHS.inspection),
      color: ct.secondary[400],
    },
    {
      id: 'quality-standards',
      label: '质量标准',
      icon: <BookOpen style={{ width: 20, height: 20 }} />,
      onClick: () => navigate(QMS_PATHS.standards),
      color: 'success.main',
    },
    {
      id: 'nonconformance',
      label: '不合格品报告',
      icon: <AlertTriangle style={{ width: 20, height: 20 }} />,
      onClick: () => navigate(QMS_PATHS.nonconformance),
      color: 'error.main',
    },
    {
      id: 'spc-analysis',
      label: 'SPC分析',
      icon: <LineChart style={{ width: 20, height: 20 }} />,
      onClick: () => navigate(QMS_PATHS.spc),
      color: 'warning.main',
    },
    {
      id: 'audit-management',
      label: '审核管理',
      icon: <ShieldCheck style={{ width: 20, height: 20 }} />,
      onClick: () => navigate(QMS_PATHS.auditManagement),
      color: 'secondary.main',
    },
  ];

  const recentItems: RecentItem[] = [
    {
      id: 'recent-inspection',
      title: '最近检验任务',
      description: `${overview?.totalInspections ?? 0} 项检验进行中`,
      icon: <ClipboardCheck style={{ width: 16, height: 16 }} />,
      status: 'info',
      time: '今天',
      onClick: () => navigate(QMS_PATHS.inspection),
    },
    {
      id: 'recent-nonconformance',
      title: '最近不合格',
      description: `${overview?.totalIssues ?? 0} 项不合格记录`,
      icon: <XCircle style={{ width: 16, height: 16 }} />,
      status: 'warning',
      time: '今天',
      onClick: () => navigate(QMS_PATHS.nonconformance),
    },
    {
      id: 'recent-8d',
      title: '最近8D',
      description: `${overview?.eightdCount ?? 0} 份8D报告`,
      icon: <FileText style={{ width: 16, height: 16 }} />,
      status: 'default',
      time: '本周',
      onClick: () => navigate(QMS_PATHS.eightd),
    },
    {
      id: 'recent-audit',
      title: '最近审核',
      description: `${overview?.auditPlanCount ?? 0} 项审核计划`,
      icon: <ClipboardList style={{ width: 16, height: 16 }} />,
      status: 'info',
      time: '本周',
      onClick: () => navigate(QMS_PATHS.auditManagement),
    },
    {
      id: 'recent-apqp',
      title: '最近APQP',
      description: `${overview?.fmeaCount ?? 0} 项APQP项目`,
      icon: <BarChart3 style={{ width: 16, height: 16 }} />,
      status: 'default',
      time: '本月',
      onClick: () => navigate(QMS_PATHS.apqp),
    },
  ];

  return (
    <PageContainer>
      <DashboardTemplate
        title=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        recentItems={recentItems}
        recentTitle='最近事项'
        loading={loading}
        onRefresh={loadDashboardData}
      />
    </PageContainer>
  );
};

export default QmsDashboardPage;
