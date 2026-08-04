import React, { useState, useEffect } from 'react';
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
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import {
  StatsPageTemplate,
  type ChartConfig,
  type StatCard,
} from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

const ct = designTokens.colors;

const PerformanceMonitorPage: React.FC = () => {
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
      title: '成功',
      message: '性能报告已导出',
      type: 'success',
    });
  };

  const handleClear = () => {
    clear();
    addNotification({
      title: '成功',
      message: '性能数据已清除',
      type: 'success',
    });
  };

  const statCards: StatCard[] = [
    {
      id: 'page-load-time',
      title: '页面加载时间',
      value: `${(metrics.pageLoadTime / 1000).toFixed(2)}s`,
      icon: <Clock size={24} />,
      color: metrics.pageLoadTime < 2000 ? 'success' : 'warning',
    },
    {
      id: 'api-avg-response',
      title: 'API 平均响应',
      value: `${avgResponseTime.toFixed(0)}ms`,
      icon: <TrendingUp size={24} />,
      color: avgResponseTime < 500 ? 'success' : avgResponseTime < 1000 ? 'warning' : 'error',
    },
    {
      id: 'api-success-rate',
      title: 'API 成功率',
      value: `${successRate.toFixed(1)}%`,
      icon: successRate >= 95 ? <CheckCircle size={24} /> : <XCircle size={24} />,
      color: successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'error',
    },
    {
      id: 'slow-api-calls',
      title: '慢 API 调用',
      value: slowCalls.length,
      icon: <AlertTriangle size={24} />,
      color: slowCalls.length === 0 ? 'success' : 'warning',
    },
  ];

  const charts: ChartConfig[] = [];

  const tables = [
    {
      id: 'api-call-history',
      title: 'API 调用历史',
      columns: [
        {
          id: 'timestamp',
          label: '时间',
          render: (value: unknown) => new Date(value as number).toLocaleTimeString(),
        },
        { id: 'endpoint', label: 'API 端点' },
        {
          id: 'duration',
          label: '响应时间',
          render: (value: unknown) => `${(value as number).toFixed(0)}ms`,
        },
        {
          id: 'status',
          label: '状态',
          render: (value: unknown) =>
            value === 'success' ? (
              <span style={{ color: ct.success[500], fontWeight: 500 }}>成功</span>
            ) : (
              <span style={{ color: ct.error.main, fontWeight: 500 }}>失败</span>
            ),
        },
      ],
      data: apiHistory.slice(-20).reverse() as unknown as Record<string, unknown>[],
    },
  ];

  const timeRangeOptions = [
    { label: '最近1小时', value: '1h' },
    { label: '最近6小时', value: '6h' },
    { label: '最近24小时', value: '24h' },
  ];

  const [timeRange, setTimeRange] = useState('1h');

  return (
    <PageContainer
      title='性能监控'
      subtitle='实时监控系统性能指标'
      headerProps={{
        backButton: {
          onClick: () => navigate(DASHBOARD_PATHS.dashboard),
        },
        pageIcon: <Activity style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]}, ${ct.secondary.main})`,
        actions: [
          {
            label: '导出报告',
            icon: <Download style={{ width: 16, height: 16 }} />,
            onClick: handleExport,
            variant: 'outlined',
          },
          {
            label: '清除数据',
            icon: <Trash2 style={{ width: 16, height: 16 }} />,
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
          backgroundColor: 'common.white',
          borderRadius: 8,
          padding: 24,
          marginBottom: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16 }}>页面性能指标</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: ct.grey[500], fontSize: '0.875rem' }}>首次绘制 (FP)</span>
            <span style={{ fontWeight: 500 }}>{metrics.firstPaint.toFixed(0)}ms</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: ct.grey[500], fontSize: '0.875rem' }}>首次内容绘制 (FCP)</span>
            <span style={{ fontWeight: 500 }}>{metrics.firstContentfulPaint.toFixed(0)}ms</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: ct.grey[500], fontSize: '0.875rem' }}>DOM 内容加载</span>
            <span style={{ fontWeight: 500 }}>{metrics.domContentLoaded.toFixed(0)}ms</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: ct.grey[500], fontSize: '0.875rem' }}>页面完全加载</span>
            <span style={{ fontWeight: 500 }}>{metrics.pageLoadTime.toFixed(0)}ms</span>
          </div>
        </div>
      </div>

      {/* 慢 API 调用 */}
      <div
        style={{
          backgroundColor: 'common.white',
          borderRadius: 8,
          padding: 24,
          marginBottom: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>慢 API 调用</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: ct.grey[500], fontSize: '0.875rem' }}>阈值:</span>
            <input
              type='number'
              value={slowCallThreshold}
              onChange={(e) => setSlowCallThreshold(Number(e.target.value))}
              style={{
                width: 80,
                padding: 4,
                fontSize: '0.875rem',
                borderRadius: 4,
                border: `1px solid ${ct.grey[300]}`,
              }}
            />
            <span style={{ color: ct.grey[500], fontSize: '0.875rem' }}>ms</span>
          </div>
        </div>
        {slowCalls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <CheckCircle
              style={{ width: 48, height: 48, color: ct.success[500], marginBottom: 8 }}
            />
            <p style={{ color: ct.grey[500] }}>没有慢 API 调用</p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 256,
              overflow: 'auto',
              marginTop: 16,
            }}
          >
            {slowCalls.map((call, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: 'warning.100',
                  borderRadius: 8,
                }}
              >
                <div>
                  <p style={{ fontWeight: 500, margin: 0 }}>{call.endpoint}</p>
                  <p style={{ fontSize: '0.75rem', color: ct.grey[500], margin: '4px 0 0' }}>
                    {new Date(call.timestamp).toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 500, color: ct.error.main, margin: 0 }}>
                    {(call.duration / 1000).toFixed(2)}s
                  </p>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      margin: '4px 0 0',
                      color: call.status === 'success' ? 'success.main' : 'error.main',
                    }}
                  >
                    {call.status === 'success' ? '成功' : '失败'}
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
        timeRangeOptions={timeRangeOptions}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={() => _setTrigger((prev) => prev + 1)}
        showTimeRange={true}
        showRefresh={true}
        showExport={false}
        showSearch={false}
        showStatCards={false}
        showCharts={false}
        tableSectionTitle='API 调用历史'
        customToolbar={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.875rem',
                color: 'grey.500',
              }}
            >
              <input
                type='checkbox'
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              自动刷新
            </label>
          </div>
        }
      />
    </PageContainer>
  );
};

export default PerformanceMonitorPage;
