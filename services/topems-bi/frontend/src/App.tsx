import { useState, useEffect } from 'react';
import { MetricCard } from './components/MetricCard';
import { ActivityList } from './components/ActivityList';
import { ChartCard } from './components/ChartCard';
import {
  fetchSummaryDashboard,
  fetchDevelopmentAnalytics,
  fetchQualityAnalytics,
  fetchProductionAnalytics,
  fetchLaboratoryAnalytics,
} from './api/client';
import type {
  SummaryDashboard,
  DevelopmentAnalytics,
  QualityAnalytics,
  ProductionAnalytics,
  LaboratoryAnalytics,
} from './types';

function App() {
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

  const monthlyProjectsChart = development ? {
    xAxis: {
      type: 'category',
      data: development.monthly_new_projects.map((p) => p.month),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: development.monthly_new_projects.map((p) => p.count),
        type: 'bar',
        itemStyle: {
          color: '#3B82F6',
        },
      },
    ],
  } : null;

  const qualityTrendChart = quality ? {
    xAxis: {
      type: 'category',
      data: quality.quality_trend.map((q) => q.month),
    },
    yAxis: {
      type: 'value',
      min: 90,
      max: 100,
    },
    series: [
      {
        data: quality.quality_trend.map((q) => q.pass_rate),
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#10B981',
        },
      },
    ],
  } : null;

  const dailyOutputChart = production ? {
    xAxis: {
      type: 'category',
      data: production.daily_output.map((d) => d.date),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: production.daily_output.map((d) => d.output),
        type: 'bar',
        itemStyle: {
          color: '#F59E0B',
        },
      },
    ],
  } : null;

  const testTypeChart = laboratory ? {
    series: [
      {
        type: 'pie',
        data: [
          { value: laboratory.test_type_distribution.chemical, name: '化学检验' },
          { value: laboratory.test_type_distribution.physical, name: '物理检验' },
          { value: laboratory.test_type_distribution.microbiological, name: '微生物检验' },
          { value: laboratory.test_type_distribution.other, name: '其他' },
        ],
      },
    ],
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">TOPEMS BI</h1>
              <p className="text-sm text-gray-500">数据大屏报表中台</p>
            </div>
            <div className="text-sm text-gray-400">
              最后更新: {summary?.generated_at || new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {summary.key_metrics.map((metric, index) => (
              <MetricCard key={index} metric={metric} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            {monthlyProjectsChart && (
              <ChartCard title="月度新增项目" option={monthlyProjectsChart} />
            )}
          </div>
          <div>
            {testTypeChart && (
              <ChartCard title="检验类型分布" option={testTypeChart} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            {qualityTrendChart && (
              <ChartCard title="质量合格率趋势" option={qualityTrendChart} />
            )}
          </div>
          <div>
            {dailyOutputChart && (
              <ChartCard title="日产量统计" option={dailyOutputChart} />
            )}
          </div>
          <div>
            {summary && <ActivityList activities={summary.recent_activities} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
