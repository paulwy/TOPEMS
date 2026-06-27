import React, { useState, useEffect } from 'react';
import { apiLogger } from '@/utils/logger';
import {
  BarChart3 as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  FlaskConical as ScienceIcon,
  Folder as FolderIcon,
} from 'lucide-react';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { apiClient } from '@/api/client';
import { PageContainer } from '@/components/common';

interface RsReportData {
  projects: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  experiments: {
    total: number;
    lab: number;
    pilot: number;
    scaleup: number;
    successRate: number;
  };
  formulas: {
    total: number;
    published: number;
    testing: number;
    draft: number;
  };
  monthlyProgress: Array<{ month: string; projects: number; experiments: number }>;
}

const RsReportPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<RsReportData>({
    projects: {
      total: 24,
      active: 12,
      completed: 8,
      cancelled: 4,
    },
    experiments: {
      total: 156,
      lab: 80,
      pilot: 50,
      scaleup: 26,
      successRate: 87.5,
    },
    formulas: {
      total: 45,
      published: 30,
      testing: 10,
      draft: 5,
    },
    monthlyProgress: [
      { month: '2024-01', projects: 2, experiments: 15 },
      { month: '2024-02', projects: 3, experiments: 20 },
      { month: '2024-03', projects: 4, experiments: 25 },
      { month: '2024-04', projects: 5, experiments: 30 },
      { month: '2024-05', projects: 4, experiments: 28 },
      { month: '2024-06', projects: 6, experiments: 38 },
    ],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.rs.get('/api/rs/reports/summary');
      if (response.success && response.data) {
        setReportData(response.data);
      }
    } catch (err: unknown) {
      apiLogger.error('加载研发报表数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      id: 'project-stats',
      title: '项目统计',
      value: reportData.projects.total,
      icon: <FolderIcon size={24} />,
      color: 'primary' as const,
      description: `进行中 ${reportData.projects.active} | 已完成 ${reportData.projects.completed}`,
    },
    {
      id: 'experiment-stats',
      title: '试验统计',
      value: reportData.experiments.total,
      icon: <ScienceIcon size={24} />,
      color: 'warning' as const,
      description: `成功率 ${reportData.experiments.successRate}%`,
      trend: {
        value: reportData.experiments.successRate,
        direction: 'up' as const,
        label: '成功率',
      },
    },
    {
      id: 'formula-stats',
      title: '配方统计',
      value: reportData.formulas.total,
      icon: <AnalyticsIcon size={24} />,
      color: 'info' as const,
      description: `已发布 ${reportData.formulas.published} | 测试中 ${reportData.formulas.testing}`,
    },
  ];

  const charts = [
    {
      id: 'experiment-phase-distribution',
      title: '试验阶段分布',
      type: 'pie' as const,
      dataKey: 'value',
      nameKey: 'name',
      data: [
        { name: '小试阶段', value: reportData.experiments.lab },
        { name: '中试阶段', value: reportData.experiments.pilot },
        { name: '放大试验', value: reportData.experiments.scaleup },
      ],
      colors: ['primary.main', 'warning.main', 'error.main'],
    },
    {
      id: 'monthly-progress-trend',
      title: '月度进展趋势',
      type: 'bar' as const,
      dataKey: 'projects',
      nameKey: 'month',
      data: reportData.monthlyProgress.map((item) => ({
        name: item.month,
        value: item.projects,
        experiments: item.experiments,
      })),
      colors: ['primary.main', 'success.main'],
    },
  ];

  const tables = [
    {
      id: 'experiment-phase-details',
      title: '试验阶段详情',
      columns: [
        { id: 'phase', label: '阶段' },
        { id: 'count', label: '数量' },
        {
          id: 'percentage',
          label: '占比',
          render: (value: number) => `${value.toFixed(1)}%`,
        },
      ],
      data: [
        {
          phase: '小试阶段',
          count: reportData.experiments.lab,
          percentage: (reportData.experiments.lab / reportData.experiments.total) * 100,
        },
        {
          phase: '中试阶段',
          count: reportData.experiments.pilot,
          percentage: (reportData.experiments.pilot / reportData.experiments.total) * 100,
        },
        {
          phase: '放大试验',
          count: reportData.experiments.scaleup,
          percentage: (reportData.experiments.scaleup / reportData.experiments.total) * 100,
        },
      ],
    },
    {
      id: 'monthly-progress-details',
      title: '月度进展详情',
      columns: [
        { id: 'month', label: '月份' },
        { id: 'projects', label: '项目数' },
        { id: 'experiments', label: '试验数' },
      ],
      data: reportData.monthlyProgress.map((item) => ({
        month: item.month,
        projects: item.projects,
        experiments: item.experiments,
      })),
    },
  ];

  const timeRangeOptions = [
    { label: '本周', value: 'week' },
    { label: '本月', value: 'month' },
    { label: '本季度', value: 'quarter' },
    { label: '本年', value: 'year' },
  ];

  const [timeRange, setTimeRange] = useState('month');

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <StatsPageTemplate
        title='研发报表分析'
        subtitle='研发项目统计分析、试验数据汇总、成果评估'
        statCards={statCards}
        statColumns={3}
        charts={charts}
        tables={tables}
        loading={loading}
        timeRangeOptions={timeRangeOptions}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={loadData}
        showTimeRange={true}
        showRefresh={true}
        showExport={true}
        showSearch={false}
        chartSectionTitle='数据分析'
        tableSectionTitle='详细数据'
      />
    </PageContainer>
  );
};

export default RsReportPage;
