import { designTokens } from '@topems/tokens';
import React from 'react';
import styles from './QmsDashboardPage.module.css';
import { Box, Typography, Skeleton, useTheme } from '@mui/material';
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
import i18n from '@/i18n';
import { useNavigate } from 'react-router-dom';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
  type RecentItem,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { qmsApi, useQmsMock, type QualityOverview, type QmsMockShape } from '@/api/qms';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { QMS_PATHS } from '@/module-configs/qms/config';

const QmsDashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: mockData, mockEnabled } = useQmsMock<QmsMockShape>();
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
        throw new Error(overviewRes.message || i18n.t('qms.qms_dashboard_page.k0'));
      }
      return overviewRes.data ?? null;
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
    initialData: mockEnabled ? (mockData?.qualityOverview ?? null) : undefined,
    enabled: !mockEnabled,
  });
  const effectiveOverview = mockEnabled ? (mockData?.qualityOverview ?? null) : overview;
  const effectiveLoading = mockEnabled ? false : loading;
  const stats: StatCard[] = [
    {
      id: 'total-inspections',
      title: i18n.t('qms.qms_dashboard_page.k1'),
      value: effectiveOverview?.totalInspections ?? 0,
      icon: <ClipboardCheck className={styles.il1} />,
      color: 'primary',
      change: effectiveOverview?.totalInspections ? 5 : undefined,
      changeLabel: i18n.t('qms.qms_dashboard_page.k2'),
    },
    {
      id: 'pass-rate',
      title: i18n.t('qms.qms_dashboard_page.k3'),
      value:
        effectiveOverview?.passRate != null ? `${effectiveOverview.passRate.toFixed(1)}%` : '0%',
      icon: <CheckCircle className={styles.il2} />,
      color: 'success',
      change: effectiveOverview?.passRate && effectiveOverview.passRate >= 95 ? 1.2 : -0.3,
      changeLabel: i18n.t('qms.qms_dashboard_page.k4'),
    },
    {
      id: 'defect-count',
      title: i18n.t('qms.qms_dashboard_page.k5'),
      value: effectiveOverview?.totalIssues ?? 0,
      icon: <XCircle className={styles.il3} />,
      color: 'error',
      change: effectiveOverview?.totalIssues ? -2 : undefined,
      changeLabel: i18n.t('qms.qms_dashboard_page.k6'),
    },
    {
      id: 'eightd-count',
      title: i18n.t('pages.qms_dashboard_page.8d_0'),
      value: effectiveOverview?.eightdCount ?? 0,
      icon: <FileText className={styles.il4} />,
      color: 'warning',
    },
    {
      id: 'spc-count',
      title: i18n.t('pages.qms_dashboard_page.spc_1'),
      value: effectiveOverview?.spcChartCount ?? 0,
      icon: <BarChart3 className={styles.il5} />,
      color: 'info',
    },
    {
      id: 'audit-count',
      title: i18n.t('qms.qms_dashboard_page.k7'),
      value: effectiveOverview?.auditPlanCount ?? 0,
      icon: <ClipboardList className={styles.il6} />,
      color: 'secondary',
    },
  ];
  const charts: ChartCard[] = [
    {
      id: 'inspection-trend',
      title: i18n.t('qms.qms_dashboard_page.k8'),
      type: 'bar',
      height: 350,
      chart: (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {effectiveLoading ? (
            <Skeleton
              variant='rectangular'
              width='100%'
              height='100%'
            />
          ) : effectiveOverview?.trendData && effectiveOverview.trendData.length > 0 ? (
            <Box sx={{ width: '100%', height: '100%', p: 2 }}>
              {effectiveOverview.trendData.map((item, index) => (
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
            <Typography color='text.secondary'>{i18n.t('qms.qms_dashboard_page.k9')}</Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'defect-distribution',
      title: i18n.t('qms.qms_dashboard_page.k10'),
      type: 'pie',
      height: 350,
      chart: (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {effectiveLoading ? (
            <Skeleton
              variant='rectangular'
              width='100%'
              height='100%'
            />
          ) : effectiveOverview?.topIssues && effectiveOverview.topIssues.length > 0 ? (
            <Box sx={{ width: '100%', p: 2 }}>
              {effectiveOverview.topIssues.map((item, index) => {
                const colors = [
                  theme.palette.secondary[400],
                  theme.palette.warning.main,
                  theme.palette.error.main,
                  theme.palette.success.main,
                  theme.palette.secondary.main,
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
            <Typography color='text.secondary'>{i18n.t('qms.qms_dashboard_page.k11')}</Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'spc-overview',
      title: i18n.t('pages.qms_dashboard_page.spc_2'),
      type: 'line',
      height: 350,
      chart: (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {effectiveLoading ? (
            <Skeleton
              variant='rectangular'
              width='100%'
              height='100%'
            />
          ) : effectiveOverview?.trendData && effectiveOverview.trendData.length > 0 ? (
            <Box sx={{ width: '100%', p: 2 }}>
              <svg
                width='100%'
                height='200'
                viewBox='0 0 400 200'
                preserveAspectRatio='none'
              >
                {effectiveOverview.trendData.map((item, index) => {
                  const x =
                    (index / Math.max(effectiveOverview!.trendData.length - 1, 1)) * 380 + 10;
                  const y = 200 - (item.passRate / 100) * 180 - 10;
                  return (
                    <React.Fragment key={index}>
                      <circle
                        cx={x}
                        cy={y}
                        r={4}
                        fill={theme.palette.secondary[400]}
                      />
                      {index < effectiveOverview!.trendData.length - 1 && (
                        <line
                          x1={x}
                          y1={y}
                          x2={
                            ((index + 1) / Math.max(effectiveOverview!.trendData.length - 1, 1)) *
                              380 +
                            10
                          }
                          y2={
                            200 -
                            (effectiveOverview!.trendData[index + 1].passRate / 100) * 180 -
                            10
                          }
                          stroke={theme.palette.secondary[400]}
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
                  fill={designTokens.colors.error.main}
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
                  fill={designTokens.colors.success.main}
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
                  fill={designTokens.colors.error.main}
                >
                  LCL
                </text>
              </svg>
            </Box>
          ) : (
            <Typography color='text.secondary'>
              {i18n.t('qms.qms_dashboard_page.spc_12')}
            </Typography>
          )}
        </Box>
      ),
    },
  ];
  const quickActions: QuickAction[] = [
    {
      id: 'new-inspection',
      label: i18n.t('qms.qms_dashboard_page.k13'),
      icon: <Plus className={styles.il7} />,
      onClick: () => navigate(QMS_PATHS.inspection),
      color: theme.palette.secondary[400],
    },
    {
      id: 'quality-standards',
      label: i18n.t('qms.qms_dashboard_page.k14'),
      icon: <BookOpen className={styles.il8} />,
      onClick: () => navigate(QMS_PATHS.standards),
      color: 'success.main',
    },
    {
      id: 'nonconformance',
      label: i18n.t('qms.qms_dashboard_page.k15'),
      icon: <AlertTriangle className={styles.il9} />,
      onClick: () => navigate(QMS_PATHS.nonconformance),
      color: 'error.main',
    },
    {
      id: 'spc-analysis',
      label: i18n.t('pages.qms_dashboard_page.spc_3'),
      icon: <LineChart className={styles.il10} />,
      onClick: () => navigate(QMS_PATHS.spc),
      color: 'warning.main',
    },
    {
      id: 'audit-management',
      label: i18n.t('qms.qms_dashboard_page.k16'),
      icon: <ShieldCheck className={styles.il11} />,
      onClick: () => navigate(QMS_PATHS.auditManagement),
      color: 'secondary.main',
    },
  ];
  const recentItems: RecentItem[] = [
    {
      id: 'recent-inspection',
      title: i18n.t('qms.qms_dashboard_page.k17'),
      description: `${effectiveOverview?.totalInspections ?? 0}${i18n.t('pages.qms_dashboard_page.k4')}`,
      icon: <ClipboardCheck className={styles.il12} />,
      status: 'info',
      time: i18n.t('qms.qms_dashboard_page.k18'),
      onClick: () => navigate(QMS_PATHS.inspection),
    },
    {
      id: 'recent-nonconformance',
      title: i18n.t('qms.qms_dashboard_page.k19'),
      description: `${effectiveOverview?.totalIssues ?? 0}${i18n.t('pages.qms_dashboard_page.k5')}`,
      icon: <XCircle className={styles.il13} />,
      status: 'warning',
      time: i18n.t('qms.qms_dashboard_page.k20'),
      onClick: () => navigate(QMS_PATHS.nonconformance),
    },
    {
      id: 'recent-8d',
      title: i18n.t('qms.qms_dashboard_page.8d_21'),
      description: `${effectiveOverview?.eightdCount ?? 0}${i18n.t('pages.qms_dashboard_page.8d_6')}`,
      icon: <FileText className={styles.il14} />,
      status: 'default',
      time: i18n.t('qms.qms_dashboard_page.k22'),
      onClick: () => navigate(QMS_PATHS.eightd),
    },
    {
      id: 'recent-audit',
      title: i18n.t('qms.qms_dashboard_page.k23'),
      description: `${effectiveOverview?.auditPlanCount ?? 0}${i18n.t('pages.qms_dashboard_page.k7')}`,
      icon: <ClipboardList className={styles.il15} />,
      status: 'info',
      time: i18n.t('qms.qms_dashboard_page.k24'),
      onClick: () => navigate(QMS_PATHS.auditManagement),
    },
    {
      id: 'recent-apqp',
      title: i18n.t('qms.qms_dashboard_page.apqp_25'),
      description: `${effectiveOverview?.fmeaCount ?? 0}${i18n.t('pages.qms_dashboard_page.apqp_8')}`,
      icon: <BarChart3 className={styles.il16} />,
      status: 'default',
      time: i18n.t('qms.qms_dashboard_page.k26'),
      onClick: () => navigate(QMS_PATHS.apqp),
    },
  ];
  return (
    <PageContainer>
      <DashboardTemplate
        autoTitle={false}
        title=''
        emptyState={{ show: !effectiveLoading && !effectiveOverview }}
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={i18n.t('qms.qms_dashboard_page.k27')}
        recentItems={recentItems}
        recentTitle={i18n.t('qms.qms_dashboard_page.k28')}
        loading={effectiveLoading}
        onRefresh={loadDashboardData}
      />
    </PageContainer>
  );
};
export default QmsDashboardPage;
