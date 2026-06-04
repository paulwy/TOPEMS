import { useState, useEffect } from 'react';
import { Activity, Clock } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { ActivityList } from './ActivityList';
import { ChartCard } from './ChartCard';
import type { EChartsOption } from 'echarts';
import {
  fetchSummaryDashboard,
  fetchDevelopmentAnalytics,
  fetchQualityAnalytics,
  fetchProductionAnalytics,
  fetchLaboratoryAnalytics,
} from '../api/client';
import type {
  SummaryDashboard,
  DevelopmentAnalytics,
  QualityAnalytics,
  ProductionAnalytics,
  LaboratoryAnalytics,
} from '../types';

function Dashboard() {
  const [summary, setSummary] = useState<SummaryDashboard | null>(null);
  const [development, setDevelopment] = useState<DevelopmentAnalytics | null>(null);
  const [quality, setQuality] = useState<QualityAnalytics | null>(null);
  const [production, setProduction] = useState<ProductionAnalytics | null>(null);
  const [laboratory, setLaboratory] = useState<LaboratoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [summaryRes, devRes, qualityRes, prodRes, labRes] = await Promise.all([
          fetchSummaryDashboard(),
          fetchDevelopmentAnalytics(),
          fetchQualityAnalytics(),
          fetchProductionAnalytics(),
          fetchLaboratoryAnalytics(),
        ]);

        if (summaryRes.success && summaryRes.data) {
          setSummary(summaryRes.data);
        }
        if (devRes.success && devRes.data) {
          setDevelopment(devRes.data);
        }
        if (qualityRes.success && qualityRes.data) {
          setQuality(qualityRes.data);
        }
        if (prodRes.success && prodRes.data) {
          setProduction(prodRes.data);
        }
        if (labRes.success && labRes.data) {
          setLaboratory(labRes.data);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const monthlyProjectsChart = development ? ({
    xAxis: {
      type: 'category' as const,
      data: development.monthly_new_projects.map((p) => p.month),
    },
    yAxis: {
      type: 'value' as const,
    },
    series: [
      {
        data: development.monthly_new_projects.map((p) => p.count),
        type: 'bar' as const,
        itemStyle: {
          color: '#3B82F6',
        },
      },
    ],
  } as EChartsOption) : null;

  const qualityTrendChart = quality ? ({
    xAxis: {
      type: 'category' as const,
      data: quality.quality_trend.map((q) => q.month),
    },
    yAxis: {
      type: 'value' as const,
      min: 90,
      max: 100,
    },
    series: [
      {
        data: quality.quality_trend.map((q) => q.pass_rate),
        type: 'line' as const,
        smooth: true,
        itemStyle: {
          color: '#10B981',
        },
      },
    ],
  } as EChartsOption) : null;

  const dailyOutputChart = production ? ({
    xAxis: {
      type: 'category' as const,
      data: production.daily_output.map((d) => d.date),
    },
    yAxis: {
      type: 'value' as const,
    },
    series: [
      {
        data: production.daily_output.map((d) => d.output),
        type: 'bar' as const,
        itemStyle: {
          color: '#F59E0B',
        },
      },
    ],
  } as EChartsOption) : null;

  const testTypeChart = laboratory ? ({
    series: [
      {
        type: 'pie' as const,
        data: [
          { value: laboratory.test_type_distribution.chemical, name: '化学检验' },
          { value: laboratory.test_type_distribution.physical, name: '物理检验' },
          { value: laboratory.test_type_distribution.microbiological, name: '微生物检验' },
          { value: laboratory.test_type_distribution.other, name: '其他' },
        ],
      },
    ],
  } as EChartsOption) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">数据大屏</h2>
          <p className="text-sm text-gray-500 mt-1">实时业务数据总览</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>最后更新: {summary?.generated_at ? new Date(summary.generated_at).toLocaleString('zh-CN') : '-'}</span>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Activity className="w-4 h-4" />
            刷新数据
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.key_metrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {monthlyProjectsChart && (
            <ChartCard title="月度新增项目" option={monthlyProjectsChart} height="300px" />
          )}
        </div>
        <div>
          {testTypeChart && (
            <ChartCard title="检验类型分布" option={testTypeChart} height="300px" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          {qualityTrendChart && (
            <ChartCard title="质量合格率趋势" option={qualityTrendChart} height="250px" />
          )}
        </div>
        <div>
          {dailyOutputChart && (
            <ChartCard title="日产量统计" option={dailyOutputChart} height="250px" />
          )}
        </div>
        <div>
          {summary && <ActivityList activities={summary.recent_activities} />}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;