import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
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
} from 'recharts';
import { fetchAnalyticsOverview } from '../api/bi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ChartCard } from '../components/ChartCard';
import { BIChartColors } from '../components/charts/chartTheme';
import OrganizationFilter, { type OrganizationFilterValue } from '../components/ui/OrganizationFilter';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const ModuleCard = ({
  id,
  name,
  icon,
  stats,
  trend,
  onSelect,
  color,
}: {
  id: string;
  name: string;
  icon: string;
  stats: any;
  trend: 'up' | 'down' | 'stable';
  onSelect: (id: string) => void;
  color: string;
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className='w-4 h-4 text-emerald-500' />;
    if (trend === 'down') return <TrendingDown className='w-4 h-4 text-rose-500' />;
    return <Minus className='w-4 h-4 text-slate-400' />;
  };

  const getTrendValue = () => {
    if (trend === 'up') return '+12.5%';
    if (trend === 'down') return '-3.2%';
    return '0%';
  };

  return (
    <div
      onClick={() => onSelect(id)}
      className='group relative bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-slate-300/80 hover:scale-[1.02] overflow-hidden'
    >
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-24 h-24 opacity-5`}>
        <div
          className={`w-full h-full bg-gradient-to-br ${color} rounded-full blur-3xl transform translate-x-8 -translate-y-8`}
        />
      </div>

      <div className='relative z-10'>
        <div className='flex items-center justify-between mb-5'>
          <div className='flex items-center gap-3'>
            <span className='text-3xl'>{icon}</span>
            <div>
              <h4 className='font-semibold text-slate-900'>{name}</h4>
              <div className='flex items-center gap-1.5 mt-0.5'>
                {getTrendIcon()}
                <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`}>
                  {getTrendValue()}
                </span>
              </div>
            </div>
          </div>
          <ArrowRight className='w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all duration-300' />
        </div>

        <div className='grid grid-cols-3 gap-4 pt-4 border-t border-slate-100'>
          {Object.entries(stats).slice(0, 3).map(([key, value]) => (
            <div key={key} className='text-center'>
              <div className='text-lg font-bold text-slate-900'>
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
              </div>
              <div className='text-xs text-slate-500 mt-0.5'>{key}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BIAnalyticsPage = () => {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilterValue>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const res = await fetchAnalyticsOverview();
        if (res.success && res.data) {
          setOverview(res.data);
        }
      } catch (e) {
        console.error('Failed to load overview:', e);
      } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, []);

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50/50 p-6'>
        <div className='space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <Skeleton className='h-8 w-32 mb-2' />
              <Skeleton className='h-4 w-24' />
            </div>
          </div>
          <Skeleton className='h-16 w-full rounded-xl' />
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <Skeleton className='lg:col-span-2 h-80 rounded-2xl' />
            <Skeleton className='h-80 rounded-2xl' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className='h-40 rounded-2xl' />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const modules = [
    { id: 'development', name: '研发管理', icon: '🔬', stats: { 项目总数: 120, 进行中: 45, 完成率: '85%' }, trend: 'up' as const, color: 'from-blue-500 to-cyan-500' },
    { id: 'quality', name: '质量管理', icon: '✅', stats: { 检验总数: 3250, 合格率: '97.8%', 待处理: 70 }, trend: 'up' as const, color: 'from-emerald-500 to-teal-500' },
    { id: 'production', name: '生产数据', icon: '🏭', stats: { 批次总数: 450, 完成: 415, 效率: '92%' }, trend: 'stable' as const, color: 'from-amber-500 to-orange-500' },
    { id: 'laboratory', name: '实验室', icon: '🧪', stats: { 样品总数: 2450, 完成检验: 2150, 仪器使用率: '87.5%' }, trend: 'up' as const, color: 'from-violet-500 to-purple-500' },
    { id: 'ehs', name: '安全环保', icon: '🛡️', stats: { 风险总数: 125, 高风险: 15, 安全事件: 18 }, trend: 'down' as const, color: 'from-rose-500 to-pink-500' },
    { id: 'srm', name: '供应链', icon: '📦', stats: { 供应商总数: 280, 合格: 220, 平均评分: 4.5 }, trend: 'up' as const, color: 'from-cyan-500 to-blue-500' },
  ];

  const moduleData = overview?.modules || {};

  const chartData = Object.entries(moduleData).map(([key, module]: [string, any]) => ({
    name: module.name || key,
    value:
      module.total_projects ||
      module.total_samples ||
      module.total_inspections ||
      module.total_risks ||
      module.total_suppliers ||
      module.total_batches ||
      0,
  }));

  const fallbackChartData = modules.map((m) => ({
    name: m.name,
    value: Object.values(m.stats)[0] as number || 0,
  }));

  const finalChartData = chartData.length > 0 ? chartData : fallbackChartData;

  const handleModuleSelect = (moduleId: string) => {
    navigate(`/bi/module/${moduleId}`);
  };

  return (
    <div className='min-h-screen bg-slate-50/50 p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-slate-900'>概览分析</h2>
          <p className='text-sm text-slate-500 mt-1'>各业务模块数据总览</p>
        </div>
      </div>

      {/* Filters */}
      <div className='bg-white rounded-xl shadow-sm border border-slate-200/60 p-4'>
        <OrganizationFilter
          value={organizationFilter}
          onChange={setOrganizationFilter}
          showCompany={true}
          showDepartment={true}
          showEmployee={true}
        />
      </div>

      {/* Charts */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <ChartCard
            title='各业务模块数据统计'
            subtitle='模块数据量对比'
            height={300}
            showChartType
            activeChartType='bar'
          >
            <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
              <BarChart data={finalChartData}>
                <CartesianGrid strokeDasharray='3 3' stroke='#E2E8F0' />
                <XAxis dataKey='name' tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey='value' radius={[4, 4, 0, 0]}>
                  {finalChartData.map((entry, index) => (
                    <rect key={`cell-${index}`} fill={BIChartColors.series[index % BIChartColors.series.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div>
          <ChartCard
            title='业务模块占比'
            subtitle='数据分布概览'
            height={300}
            showChartType
            activeChartType='pie'
          >
            <ResponsiveContainer width='100%' height='100%' minWidth={0} minHeight={0}>
              <RechartsPieChart>
                <Pie
                  data={finalChartData}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  innerRadius={50}
                  dataKey='value'
                >
                  {finalChartData.map((entry, index) => (
                    <rect key={`cell-${index}`} fill={BIChartColors.series[index % BIChartColors.series.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Module Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            id={module.id}
            name={module.name}
            icon={module.icon}
            stats={module.stats}
            trend={module.trend}
            onSelect={handleModuleSelect}
            color={module.color}
          />
        ))}
      </div>

      {/* System Status */}
      <div className='bg-white rounded-xl shadow-sm border border-slate-200/60 p-6'>
        <h3 className='text-lg font-semibold text-slate-800 mb-4'>系统状态</h3>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div className='flex items-center justify-between py-3'>
            <span className='text-slate-600'>数据更新时间</span>
            <span className='text-sm font-medium text-slate-900'>{new Date().toLocaleString('zh-CN')}</span>
          </div>
          <div className='flex items-center justify-between py-3 border-t border-slate-100'>
            <span className='text-slate-600'>系统状态</span>
            <span className='px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full'>正常运行</span>
          </div>
          <div className='flex items-center justify-between py-3 border-t border-slate-100'>
            <span className='text-slate-600'>数据源连接</span>
            <span className='px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full'>已连接</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BIAnalyticsPage;
