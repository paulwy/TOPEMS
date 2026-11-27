import React, { useState, useEffect } from 'react';
import styles from './PerformanceMonitorPage.module.css';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store';
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Download,
  Trash2,
} from 'lucide-react';
import i18n from '@/i18n';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import {
  StatsPageTemplate,
  type ChartConfig,
  type StatCard,
} from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { adminApi } from '@/api/admin';
import { useTheme } from '@mui/material';

const PerformanceMonitorPage: React.FC = () => {
  const theme = useTheme();
  const {} = useQuery({
    queryKey: ['admin', 'performanceMonitor'],
    queryFn: async () => {
      try {
        return await adminApi.monitoring.getSystemHealth();
      } catch {
        return {};
      }
    },
  });
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const {
    metrics,
    getApiCallHistory,
    getAverageApiResponseTime,
    getApiSuccessRate,
    getSlowApiCalls,
    exportReport,
    clear,
  } = usePerformanceMonitor();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [slowCallThreshold, setSlowCallThreshold] = useState(1000);
  const [_trigger, _setTrigger] = useState(0);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      _setTrigger((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);
  const slowCalls = getSlowApiCalls(slowCallThreshold);
  const successRate = getApiSuccessRate();
  const avgResponseTime = getAverageApiResponseTime();
  const apiHistory = getApiCallHistory();
  const handleExport = () => {
    const report = exportReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification({
      title: i18n.t('admin.performance_monitor_page.notification_success'),
      message: i18n.t('admin.performance_monitor_page.export_success_message'),
      type: 'success',
    });
  };
  const handleClear = () => {
    clear();
    addNotification({
      title: i18n.t('admin.performance_monitor_page.notification_success'),
      message: i18n.t('admin.performance_monitor_page.clear_success_message'),
      type: 'success',
    });
  };
  const statCards: StatCard[] = [
    {
      id: 'page-load-time',
      title: i18n.t('admin.performance_monitor_page.page_load_time'),
      value: `${(metrics.pageLoadTime / 1000).toFixed(2)}s`,
      icon: <Clock size={24} />,
      color: metrics.pageLoadTime < 2000 ? 'success' : 'warning',
    },
    {
      id: 'api-avg-response',
      title: i18n.t('admin.performance_monitor_page.api_avg_response'),
      value: `${avgResponseTime.toFixed(0)}ms`,
      icon: <TrendingUp size={24} />,
      color: avgResponseTime < 500 ? 'success' : avgResponseTime < 1000 ? 'warning' : 'error',
    },
    {
      id: 'api-success-rate',
      title: i18n.t('admin.performance_monitor_page.api_success_rate'),
      value: `${successRate.toFixed(1)}%`,
      icon: successRate >= 95 ? <CheckCircle size={24} /> : <XCircle size={24} />,
      color: successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'error',
    },
    {
      id: 'slow-api-calls',
      title: i18n.t('admin.performance_monitor_page.slow_api_calls'),
      value: slowCalls.length,
      icon: <AlertTriangle size={24} />,
      color: slowCalls.length === 0 ? 'success' : 'warning',
    },
  ];
  const charts: ChartConfig[] = [];
  const tables = [
    {
      id: 'api-call-history',
      title: i18n.t('admin.performance_monitor_page.api_call_history'),
      columns: [
        {
          id: 'timestamp',
          label: i18n.t('admin.performance_monitor_page.column_time'),
          render: (value: unknown) => new Date(value as number).toLocaleTimeString(),
        },
        { id: 'endpoint', label: i18n.t('admin.performance_monitor_page.column_endpoint') },
        {
          id: 'duration',
          label: i18n.t('admin.performance_monitor_page.column_response_time'),
          render: (value: unknown) => `${(value as number).toFixed(0)}ms`,
        },
        {
          id: 'status',
          label: i18n.t('admin.performance_monitor_page.column_status'),
          render: (value: unknown) =>
            value === 'success' ? (
              <span
                style={{
                  color:
                    theme.palette.mode === 'dark'
                      ? theme.palette.success[400]
                      : theme.palette.success[700],
                  fontWeight: 500,
                }}
              >
                {i18n.t('admin.performance_monitor_page.status_success')}
              </span>
            ) : (
              <span style={{ color: theme.palette.error.main, fontWeight: 500 }}>
                {i18n.t('admin.performance_monitor_page.status_fail')}
              </span>
            ),
        },
      ],
      data: apiHistory.slice(-20).reverse() as unknown as Record<string, unknown>[],
    },
  ];
  // 时间范围控件已撤：本页指标来自前端内存采集，后端无按周期查询的接口。
  return (
    <PageContainer
      title={i18n.t('admin.performance_monitor_page.title')}
      subtitle={i18n.t('admin.performance_monitor_page.subtitle')}
      headerProps={{
        backButton: {
          onClick: () => navigate(DASHBOARD_PATHS.dashboard),
        },
        pageIcon: <Activity className={styles.il1} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.secondary[400]}, ${theme.palette.secondary.main})`,
        actions: [
          {
            label: i18n.t('admin.performance_monitor_page.action_export'),
            icon: <Download className={styles.il2} />,
            onClick: handleExport,
            variant: 'outlined',
          },
          {
            label: i18n.t('admin.performance_monitor_page.action_clear'),
            icon: <Trash2 className={styles.il3} />,
            onClick: handleClear,
            variant: 'contained',
            color: 'error',
          },
        ],
      }}
    >
      {/* 页面性能指标 */}
      <div
        style={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 8,
          padding: 24,
          marginBottom: 12,
          boxShadow: designTokens.shadows.sm,
        }}
      >
        <h3
          style={{
            fontSize: designTokens.typography.fontSize.scale['1.125rem'],
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          {i18n.t('admin.performance_monitor_page.section_page_metrics')}
        </h3>
        <div className={styles.il4}>
          <div className={styles.il5}>
            <span
              style={{
                color: theme.palette.text.secondary,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {i18n.t('admin.performance_monitor_page.first_paint')}
            </span>
            <span className={styles.il6}>{metrics.firstPaint.toFixed(0)}ms</span>
          </div>
          <div className={styles.il7}>
            <span
              style={{
                color: theme.palette.text.secondary,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {i18n.t('admin.performance_monitor_page.first_contentful_paint')}
            </span>
            <span className={styles.il8}>{metrics.firstContentfulPaint.toFixed(0)}ms</span>
          </div>
          <div className={styles.il9}>
            <span
              style={{
                color: theme.palette.text.secondary,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {i18n.t('admin.performance_monitor_page.dom_content_loaded')}
            </span>
            <span className={styles.il10}>{metrics.domContentLoaded.toFixed(0)}ms</span>
          </div>
          <div className={styles.il11}>
            <span
              style={{
                color: theme.palette.text.secondary,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {i18n.t('admin.performance_monitor_page.page_fully_loaded')}
            </span>
            <span className={styles.il12}>{metrics.pageLoadTime.toFixed(0)}ms</span>
          </div>
        </div>
      </div>
      {/* 慢 API 调用 */}
      <div
        style={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 8,
          padding: 24,
          marginBottom: 12,
          boxShadow: designTokens.shadows.sm,
        }}
      >
        <div className={styles.il13}>
          <h3
            style={{
              fontSize: designTokens.typography.fontSize.scale['1.125rem'],
              fontWeight: 600,
              margin: 0,
            }}
          >
            {i18n.t('admin.performance_monitor_page.section_slow_api')}
          </h3>
          <div className={styles.il14}>
            <span
              style={{
                color: theme.palette.text.secondary,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {i18n.t('admin.performance_monitor_page.threshold')}
            </span>
            <input
              type='number'
              value={slowCallThreshold}
              onChange={(e) => setSlowCallThreshold(Number(e.target.value))}
              style={{
                width: 80,
                padding: 4,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                borderRadius: 4,
                border: `1px solid ${theme.palette.grey[300]}`,
              }}
            />
            <span
              style={{
                color: theme.palette.text.secondary,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              ms
            </span>
          </div>
        </div>
        {slowCalls.length === 0 ? (
          <div className={styles.il15}>
            <CheckCircle
              style={{
                width: 48,
                height: 48,
                color:
                  theme.palette.mode === 'dark'
                    ? theme.palette.success[400]
                    : theme.palette.success[700],
                marginBottom: 8,
              }}
            />
            <p style={{ color: theme.palette.text.secondary }}>
              {i18n.t('admin.performance_monitor_page.no_slow_api')}
            </p>
          </div>
        ) : (
          <div className={styles.il16}>
            {slowCalls.map((call, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: 8,
                }}
              >
                <div>
                  <p className={styles.il17}>{call.endpoint}</p>
                  <p
                    style={{
                      fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                      color: theme.palette.text.secondary,
                      margin: `${designTokens.spacing.xs} 0 0`,
                    }}
                  >
                    {new Date(call.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className={styles.il18}>
                  <p style={{ fontWeight: 500, color: theme.palette.error.main, margin: 0 }}>
                    {(call.duration / 1000).toFixed(2)}s
                  </p>
                  <p
                    style={{
                      fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                      margin: `${designTokens.spacing.xs} 0 0`,
                      color:
                        call.status === 'success'
                          ? theme.palette.success.main
                          : theme.palette.error.main,
                    }}
                  >
                    {call.status === 'success'
                      ? i18n.t('admin.performance_monitor_page.status_success')
                      : i18n.t('admin.performance_monitor_page.status_fail')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <StatsPageTemplate
        title=''
        subtitle=''
        statCards={statCards}
        charts={charts}
        tables={tables}
        loading={false}
        onRefresh={() => _setTrigger((prev) => prev + 1)}
        showTimeRange={false}
        showRefresh={true}
        showExport={false}
        showSearch={false}
        showStatCards={false}
        showCharts={false}
        tableSectionTitle={i18n.t('admin.performance_monitor_page.api_call_history')}
        customToolbar={
          <div className={styles.il19}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                color: 'var(--text-secondary)',
              }}
            >
              <input
                type='checkbox'
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className={styles.il20}
              />
              {i18n.t('admin.performance_monitor_page.auto_refresh')}
            </label>
          </div>
        }
      />
    </PageContainer>
  );
};
export default PerformanceMonitorPage;
