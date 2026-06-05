import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight 
} from 'lucide-react';
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
  Cell
} from 'recharts';
import { 
  fetchAnalyticsOverview, 
  fetchModuleAnalytics 
} from '../api/bi';
import { LoadingSpinner } from '../components/LoadingSpinner';

const ChartCard = ({ title, children, height = 300 
}: { 
  title: string;
  children: React.ReactNode;
  height?: number;
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div style={{ height }}>
        {children}
      </div>
    </div>
  );
};

const ModuleCard = ({ 
  id, 
  name, 
  icon, 
  stats, 
  onSelect 
}: { 
  id: string; 
  name: string; 
  icon: string; 
  stats: any; 
  onSelect: (id: string) => void;
}) => {
  return (
    <div 
      onClick={() => onSelect(id)}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{icon}</span>
        <h4 className="font-semibold text-gray-800">{name}</h4>
      </div>
      <div className="space-y-2">
        {Object.entries(stats).map(([key, value]) => (
        <div key={key} className="flex justify-between text-sm">
          <span className="text-gray-500">{key}</span>
          <span className="font-medium text-gray-900">{String(value)}</span>
        </div>
      ))}
      </div>
    </div>
  );
};

const BIAnalyticsPage = () => {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const modules = [
    { id: 'development', name: '研发管理', icon: '🔬', stats: { 项目总数: 120, 进行中: 45, 完成率: '85%' } },
    { id: 'quality', name: '质量管理', icon: '✅', stats: { 检验总数: 3250, 合格率: '97.8%', 待处理: 70 } },
    { id: 'production', name: '生产数据', icon: '🏭', stats: { 批次总数: 450, 完成: 415, 效率: '92%' } },
    { id: 'laboratory', name: '实验室', icon: '🧪', stats: { 样品总数: 2450, 完成检验: 2150, 仪器使用率: '87.5%' } },
    { id: 'ehs', name: '安全环保', icon: '🛡️', stats: { 风险总数: 125, 高风险: 15, 安全事件: 18 } },
    { id: 'srm', name: '供应链', icon: '📦', stats: { 供应商总数: 280, 合格: 220, 平均评分: 4.5 } },
  ];

  const moduleData = overview?.modules || {};

  const chartData = Object.entries(moduleData).map(([key, module]: [string, any]) => ({
    name: module.name || key,
    value: module.total_projects || module.total_samples || module.total_inspections || module.total_risks || module.total_suppliers || module.total_batches || 0
  }));

  const getModuleValue = (stats: any) => {
    const keys = Object.keys(stats);
    if (keys.length > 0) {
      const firstValue = stats[keys[0]];
      return typeof firstValue === 'number' ? firstValue : 0;
    }
    return 0;
  };

  const fallbackChartData = modules.map(m => ({
    name: m.name,
    value: getModuleValue(m.stats)
  }));

  const finalChartData = chartData.length > 0 ? chartData : fallbackChartData;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const handleModuleSelect = (moduleId: string) => {
    console.log('Selected module:', moduleId);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">概览分析</h2>
          <p className="text-sm text-gray-500 mt-1">各业务模块数据总览</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="各业务模块数据统计">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6">
                  {finalChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <div>
          <ChartCard title="业务模块占比">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={finalChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {finalChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            {...module}
            onSelect={handleModuleSelect}
          />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">系统状态</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-600">数据更新时间</span>
            <span className="text-sm font-medium text-slate-900">
              {new Date().toLocaleString('zh-CN')}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <span className="text-slate-600">系统状态</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
              正常运行
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BIAnalyticsPage;
