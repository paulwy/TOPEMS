import { useState, useEffect } from 'react';
import { Activity, Clock, TrendingUp, TrendingDown, BarChart3, PieChart, LineChart, ArrowUpRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  Legend,
} from 'recharts';
import {
  fetchSummaryDashboard,
  fetchDevelopmentAnalytics,
  fetchQualityAnalytics,
  fetchProductionAnalytics,
  fetchLaboratoryAnalytics,
  type SummaryDashboard,
  type DevelopmentAnalytics,
  type QualityAnalytics,
  type ProductionAnalytics,
  type LaboratoryAnalytics,
} from '../api/bi';
import { LoadingSpinner } from '../components/LoadingSpinner';

const MetricCard = ({
  title,
  value,
  unit,
  change,
  change_type,
  icon: Icon,
}: {
  title: string;
  value: number;
  unit: string;
  change: number;
  change_type: 'increase' | 'decrease';
  icon: any;
}) => {
  const isIconComponent = typeof Icon === 'function' || (Icon && typeof Icon === 'object' && Icon.$$typeof);

  return (
    <div className='bg-white rounded-xl shadow-sm p-6 border border-gray-100'>
      <div className='flex items-center justify-between mb-4'>
        <div className='p-2 bg-blue-50 rounded-lg'>
          {isIconComponent ? (
            <Icon className='w-6 h-6 text-blue-600' />
          ) : (
            <span className='text-xl text-blue-600'>{Icon}</span>
          )}
        </div>
        <div className={`flex items-center gap-1 ${change_type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
          {change_type === 'increase' ? <TrendingUp className='w-4 h-4' /> : <TrendingDown className='w-4 h-4' />}
          <span className='text-sm font-medium'>{change}%</span>
        </div>
      </div>
      <h3 className='text-sm text-gray-500 mb-1'>{title}</h3>
      <div className='flex items-baseline gap-1'>
        <span className='text-2xl font-bold text-gray-800'>{value}</span>
        <span className='text-sm text-gray-500'>{unit}</span>
      </div>
    </div>
  );
};

const ChartCard = ({
  title,
  children,
  height = 300,
}: {
  title: string;
  children: React.ReactNode;
  height?: number;
}) => {
  return (
    <div className='bg-white rounded-xl shadow-sm p-6 border border-gray-100'>
      <h3 className='text-lg font-semibold text-gray-800 mb-4'>{title}</h3>
      <div style={{ height }}>{children}</div>
    </div>
  );
};

const ActivityList = ({ activities }: { activities: any[] }) => {
  return (
    <div className='bg-white rounded-xl shadow-sm p-6 border border-gray-100'>
      <h3 className='text-lg font-semibold text-gray-800 mb-4'>最近活动</h3>
      <div className='space-y-4'>
        {activities.map((activity) => (
          <div key={activity.id} className='flex items-center gap-4 p-3 bg-gray-50 rounded-lg'>
            <div className='flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center'>
              <Activity className='w-5 h-5 text-blue-600' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-gray-800 truncate'>{activity.title}</p>
              <p className='text-xs text-gray-500'>{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BIDashboardPage = () => {
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
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <LoadingSpinner size='lg' />
          <p className='mt-4 text-gray-500'>加载中...</p>
        </div>
      </div>
    );
  }

  const defaultMetrics = [
    { title: '生产效率', value: 85.5, unit: '%', change: 2.3, change_type: 'increase', icon: ArrowUpRight },
    { title: '质量合格率', value: 98.2, unit: '%', change: 0.8, change_type: 'increase', icon: ArrowUpRight },
    { title: '设备稼动率', value: 92.3, unit: '%', change: -1.2, change_type: 'decrease', icon: ArrowUpRight },
    { title: '交付准时率', value: 96.8, unit: '%', change: 1.5, change_type: 'increase', icon: ArrowUpRight },
  ];

  const defaultActivities = [
    { id: 1, type: 'production', title: '完成生产订单 PO-2024-001', time: '10分钟前' },
    { id: 2, type: 'quality', title: '质量检验完成，批次 B-001', time: '25分钟前' },
    { id: 3, type: 'maintenance', title: '设备维护完成：生产线A', time: '1小时前' },
  ];

  const testTypeData = laboratory
    ? [
        { name: '化学检验', value: laboratory.test_type_distribution.chemical },
        { name: '物理检验', value: laboratory.test_type_distribution.physical },
        { name: '微生物检验', value: laboratory.test_type_distribution.microbiological },
        { name: '其他', value: laboratory.test_type_distribution.other },
      ]
    : [
        { name: '化学检验', value: 40 },
        { name: '物理检验', value: 30 },
        { name: '微生物检验', value: 20 },
        { name: '其他', value: 10 },
      ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-800'>数据大屏</h2>
          <p className='text-sm text-gray-500 mt-1'>实时业务数据总览</p>
        </div>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2 text-sm text-gray-500'>
            <Clock className='w-4 h-4' />
            <span>最后更新: {new Date().toLocaleString('zh-CN')}</span>
          </div>
          <button className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2'>
            <Activity className='w-4 h-4' />
            刷新数据
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {(summary?.key_metrics || defaultMetrics).map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <ChartCard title='月度新增项目'>
            <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
              <BarChart
                data={
                  development?.monthly_new_projects || [
                    { month: '1月', count: 25 },
                    { month: '2月', count: 30 },
                    { month: '3月', count: 28 },
                    { month: '4月', count: 35 },
                    { month: '5月', count: 42 },
                    { month: '6月', count: 38 },
                  ]
                }
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='month' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='count' fill='#3B82F6' />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div>
          <ChartCard title='检验类型分布'>
            <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
              <RechartsPieChart>
                <Pie
                  data={testTypeData}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill='#8884d8'
                  dataKey='value'
                >
                  {testTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div>
          <ChartCard title='质量合格率趋势'>
            <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
              <RechartsLineChart
                data={
                  quality?.quality_trend || [
                    { month: '1月', pass_rate: 96.5 },
                    { month: '2月', pass_rate: 97.2 },
                    { month: '3月', pass_rate: 97.8 },
                    { month: '4月', pass_rate: 98.1 },
                    { month: '5月', pass_rate: 97.6 },
                    { month: '6月', pass_rate: 97.8 },
                  ]
                }
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='month' />
                <YAxis domain={[90, 100]} />
                <Tooltip />
                <Line type='monotone' dataKey='pass_rate' stroke='#10B981' strokeWidth={2} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div>
          <ChartCard title='日产量统计'>
            <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
              <BarChart
                data={
                  production?.daily_output || [
                    { date: '1日', output: 1850 },
                    { date: '2日', output: 2100 },
                    { date: '3日', output: 1980 },
                    { date: '4日', output: 2350 },
                    { date: '5日', output: 2200 },
                    { date: '6日', output: 2420 },
                  ]
                }
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='date' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='output' fill='#F59E0B' />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div>
          <ActivityList activities={summary?.recent_activities || defaultActivities} />
        </div>
      </div>
    </div>
  );
};

export default BIDashboardPage;
