import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, BarChart3, PieChart, LineChart, TrendingUp, 
  TrendingDown, Calendar, Users, Activity, Clock
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
  Cell,
  LineChart as RechartsLineChart,
  Line,
  Legend
} from 'recharts';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { fetchModuleDetailData } from '../api/bi';

const moduleConfig = {
  rs: { name: '研发管理', icon: '🔬', color: '#3B82F6' },
  lims: { name: '实验室管理', icon: '🧪', color: '#10B981' },
  qms: { name: '质量管理', icon: '✅', color: '#F59E0B' },
  ehs: { name: '安全环保', icon: '🛡️', color: '#EF4444' },
  srm: { name: '供应链管理', icon: '📦', color: '#8B5CF6' },
  pdm: { name: '生产数据', icon: '🏭', color: '#06B6D4' },
};

const BIModuleDetailPage = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [moduleData, setModuleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const config = moduleConfig[moduleId as keyof typeof moduleConfig] || {
    name: '未知模块',
    icon: '📊',
    color: '#6B7280',
  };

  useEffect(() => {
    loadModuleData();
  }, [moduleId]);

  const loadModuleData = async () => {
    setLoading(true);
    try {
      const res = await fetchModuleDetailData(moduleId || '');
      if (res.success && res.data) {
        setModuleData(res.data);
      } else {
        // 使用模拟数据
        setModuleData(getMockData(moduleId || ''));
      }
    } catch (error) {
      console.error('Failed to load module data:', error);
      setModuleData(getMockData(moduleId || ''));
    } finally {
      setLoading(false);
    }
  };

  const getMockData = (module: string) => {
    switch (module) {
      case 'rs':
        return {
          summary: {
            total_projects: 120,
            active_projects: 45,
            completed_projects: 75,
            avg_duration: 45.5,
          },
          timeline: [
            { month: '1月', count: 25 },
            { month: '2月', count: 30 },
            { month: '3月', count: 28 },
            { month: '4月', count: 35 },
            { month: '5月', count: 42 },
            { month: '6月', count: 38 },
          ],
          success_rate: [
            { month: '1月', rate: 85 },
            { month: '2月', rate: 88 },
            { month: '3月', rate: 90 },
            { month: '4月', rate: 87 },
            { month: '5月', rate: 92 },
            { month: '6月', rate: 95 },
          ],
          distribution: [
            { name: '研发', value: 60 },
            { name: '改进', value: 30 },
            { name: '创新', value: 10 },
          ],
        };
      case 'lims':
        return {
          summary: {
            total_samples: 2450,
            completed_tests: 2150,
            pending_tests: 180,
            avg_turnaround: 48,
          },
          timeline: [
            { month: '1月', count: 420 },
            { month: '2月', count: 380 },
            { month: '3月', count: 450 },
            { month: '4月', count: 520 },
            { month: '5月', count: 480 },
            { month: '6月', count: 550 },
          ],
          pass_rate: [
            { month: '1月', rate: 96.5 },
            { month: '2月', rate: 97.2 },
            { month: '3月', rate: 97.8 },
            { month: '4月', rate: 98.1 },
            { month: '5月', rate: 97.6 },
            { month: '6月', rate: 98.5 },
          ],
          distribution: [
            { name: '化学检验', value: 40 },
            { name: '物理检验', value: 30 },
            { name: '微生物检验', value: 20 },
            { name: '其他', value: 10 },
          ],
        };
      case 'qms':
        return {
          summary: {
            total_inspections: 3250,
            passed: 3180,
            failed: 70,
            pass_rate: 97.8,
          },
          timeline: [
            { month: '1月', count: 520 },
            { month: '2月', count: 480 },
            { month: '3月', count: 550 },
            { month: '4月', count: 620 },
            { month: '5月', count: 580 },
            { month: '6月', count: 650 },
          ],
          quality_trend: [
            { month: '1月', rate: 96.5 },
            { month: '2月', rate: 97.2 },
            { month: '3月', rate: 97.8 },
            { month: '4月', rate: 98.1 },
            { month: '5月', rate: 97.6 },
            { month: '6月', rate: 97.8 },
          ],
          distribution: [
            { name: '合格', value: 97.8 },
            { name: '不合格', value: 2.2 },
          ],
        };
      case 'ehs':
        return {
          summary: {
            total_risks: 125,
            high_risks: 15,
            incidents: 18,
            resolved: 110,
          },
          timeline: [
            { month: '1月', count: 15 },
            { month: '2月', count: 12 },
            { month: '3月', count: 18 },
            { month: '4月', count: 8 },
            { month: '5月', count: 10 },
            { month: '6月', count: 15 },
          ],
          incident_trend: [
            { month: '1月', count: 3 },
            { month: '2月', count: 2 },
            { month: '3月', count: 4 },
            { month: '4月', count: 1 },
            { month: '5月', count: 2 },
            { month: '6月', count: 3 },
          ],
          distribution: [
            { name: '高风险', value: 15 },
            { name: '中风险', value: 45 },
            { name: '低风险', value: 65 },
          ],
        };
      case 'srm':
        return {
          summary: {
            total_suppliers: 280,
            qualified: 220,
            avg_rating: 4.5,
            pending_orders: 35,
          },
          timeline: [
            { month: '1月', count: 220 },
            { month: '2月', count: 235 },
            { month: '3月', count: 240 },
            { month: '4月', count: 245 },
            { month: '5月', count: 250 },
            { month: '6月', count: 280 },
          ],
          order_trend: [
            { month: '1月', count: 120 },
            { month: '2月', count: 135 },
            { month: '3月', count: 140 },
            { month: '4月', count: 155 },
            { month: '5月', count: 160 },
            { month: '6月', count: 180 },
          ],
          distribution: [
            { name: '合格', value: 220 },
            { name: '待审核', value: 45 },
            { name: '不合格', value: 15 },
          ],
        };
      case 'pdm':
        return {
          summary: {
            total_batches: 450,
            completed: 415,
            in_progress: 28,
            efficiency: 92.5,
          },
          timeline: [
            { month: '1月', count: 1850 },
            { month: '2月', count: 2100 },
            { month: '3月', count: 1980 },
            { month: '4月', count: 2350 },
            { month: '5月', count: 2200 },
            { month: '6月', count: 2420 },
          ],
          production_trend: [
            { month: '1月', rate: 88 },
            { month: '2月', count: 90 },
            { month: '3月', count: 92 },
            { month: '4月', count: 95 },
            { month: '5月', count: 93 },
            { month: '6月', count: 92.5 },
          ],
          distribution: [
            { name: '已完成', value: 415 },
            { name: '进行中', value: 28 },
            { name: '已取消', value: 7 },
          ],
        };
      default:
        return {
          summary: {},
          timeline: [],
          distribution: [],
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/bi/analytics">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{config.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{config.name}</h2>
              <p className="text-sm text-gray-500 mt-1">详细数据分析</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>最后更新: {new Date().toLocaleString('zh-CN')}</span>
          </div>
          <Button variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            刷新数据
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {moduleData?.summary && Object.entries(moduleData.summary).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{key}</span>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {moduleData?.timeline && (
          <Card>
            <CardHeader>
              <CardTitle>月度趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={moduleData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={config.color} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {moduleData?.distribution && (
          <Card>
            <CardHeader>
              <CardTitle>分布占比</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={moduleData.distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {moduleData.distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {moduleData?.success_rate && (
        <Card>
          <CardHeader>
            <CardTitle>成功率趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={moduleData.success_rate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[80, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke={config.color} strokeWidth={2} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BIModuleDetailPage;