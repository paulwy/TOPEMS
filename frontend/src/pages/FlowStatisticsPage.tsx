import React, { useState, useEffect } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, Activity,
  Calendar, Users, CheckCircle, XCircle, Clock,
  Loader2, RefreshCw, Download, Filter,
  ArrowUpRight, ArrowDownRight, GitBranch,
  FileText, AlertCircle
} from 'lucide-react';
import { flowApi } from '../api/flow';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';

interface Statistics {
  total_workflows: number;
  active_workflows: number;
  total_instances: number;
  running_instances: number;
  completed_instances: number;
  rejected_instances: number;
  total_approvals: number;
  pending_approvals: number;
  approved_approvals: number;
  rejected_approvals: number;
  avg_approval_time: number;
  approval_rate: number;
  rejection_rate: number;
  workflow_stats: WorkflowStat[];
  monthly_data: MonthlyData[];
}

interface WorkflowStat {
  workflow_id: string;
  workflow_name: string;
  instance_count: number;
  completion_rate: number;
  avg_duration: number;
}

interface MonthlyData {
  month: string;
  instances_started: number;
  instances_completed: number;
  approvals_processed: number;
}

const FlowStatisticsPage: React.FC = () => {
  const { error: showError } = useNotification();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      const response = await flowApi.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        showError(response.message || '加载统计数据失败');
      }
    } catch (err) {
      console.error('加载统计数据失败:', err);
      showError('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const maxMonthlyInstances = stats?.monthly_data.reduce((max, m) => Math.max(max, m.instances_started), 0) || 1;
  const maxMonthlyApprovals = stats?.monthly_data.reduce((max, m) => Math.max(max, m.approvals_processed), 0) || 1;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <NotificationContainer notifications={[]} onClose={() => {}} />
      
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">统计分析报表</h1>
              <p className="text-sm text-gray-500">工作流数据统计和分析</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="quarter">本季度</option>
              <option value="year">本年</option>
            </select>
            <button
              onClick={loadStatistics}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新数据
            </button>
            <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              导出报表
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">工作流数量</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.total_workflows || 0}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  ({stats?.active_workflows || 0} 活跃)
                </span>
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">实例总数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.total_instances || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.running_instances || 0} 进行中 · {stats?.completed_instances || 0} 已完成
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">审批总数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.total_approvals || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.pending_approvals || 0} 待处理 · {stats?.approved_approvals || 0} 已通过
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均审批时长</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.avg_approval_time || 0}
                <span className="text-sm font-normal text-gray-500 ml-1">小时</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                通过率 {stats?.approval_rate || 0}% · 拒绝率 {stats?.rejection_rate || 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <div className="col-span-2 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">月度趋势</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">启动实例</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">完成实例</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">审批处理</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between space-x-4">
            {stats?.monthly_data.map((month, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center space-x-1 h-48">
                  <div 
                    className="w-8 bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 cursor-pointer"
                    style={{ height: `${(month.instances_started / maxMonthlyInstances) * 100}%` }}
                    title={`启动实例: ${month.instances_started}`}
                  ></div>
                  <div 
                    className="w-8 bg-green-500 rounded-t-lg transition-all hover:bg-green-600 cursor-pointer"
                    style={{ height: `${(month.instances_completed / maxMonthlyInstances) * 100}%` }}
                    title={`完成实例: ${month.instances_completed}`}
                  ></div>
                  <div 
                    className="w-8 bg-purple-500 rounded-t-lg transition-all hover:bg-purple-600 cursor-pointer"
                    style={{ height: `${(month.approvals_processed / maxMonthlyApprovals) * 100}%` }}
                    title={`审批处理: ${month.approvals_processed}`}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 mt-2">{month.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">实例状态分布</h2>
          
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeDasharray={`${((stats?.running_instances || 0) / (stats?.total_instances || 1)) * 251.2} 251.2`}
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${((stats?.completed_instances || 0) / (stats?.total_instances || 1)) * 251.2} 251.2`}
                  strokeDashoffset={-((stats?.running_instances || 0) / (stats?.total_instances || 1)) * 251.2}
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="12"
                  strokeDasharray={`${((stats?.rejected_instances || 0) / (stats?.total_instances || 1)) * 251.2} 251.2`}
                  strokeDashoffset={-(((stats?.running_instances || 0) + (stats?.completed_instances || 0)) / (stats?.total_instances || 1)) * 251.2}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{stats?.total_instances || 0}</span>
                <span className="text-xs text-gray-500">总计</span>
              </div>
            </div>
            
            <div className="w-full mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">进行中</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {stats?.running_instances || 0} ({(((stats?.running_instances || 0) / (stats?.total_instances || 1)) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">已完成</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {stats?.completed_instances || 0} ({(((stats?.completed_instances || 0) / (stats?.total_instances || 1)) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">已拒绝</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {stats?.rejected_instances || 0} ({(((stats?.rejected_instances || 0) / (stats?.total_instances || 1)) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Performance */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">工作流性能排行</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">工作流名称</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">实例数</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">完成率</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">平均时长</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">状态</th>
              </tr>
            </thead>
            <tbody>
              {stats?.workflow_stats.map((stat, index) => (
                <tr key={stat.workflow_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-700 mr-3">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{stat.workflow_name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gray-900 font-medium">{stat.instance_count}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden mr-3">
                        <div 
                          className={`h-full rounded-full ${stat.completion_rate >= 90 ? 'bg-green-500' : stat.completion_rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${stat.completion_rate}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-medium ${stat.completion_rate >= 90 ? 'text-green-600' : stat.completion_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {stat.completion_rate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-gray-900 font-medium">{stat.avg_duration}h</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${stat.completion_rate >= 90 ? 'bg-green-100 text-green-700' : stat.completion_rate >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {stat.completion_rate >= 90 ? '优秀' : stat.completion_rate >= 70 ? '良好' : '需优化'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Metrics */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">审批效率指标</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-gray-600">审批通过率</span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-green-600">{stats?.approval_rate || 0}%</span>
                <span className="ml-2 text-xs text-green-500 flex items-center">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +2.5%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-3" />
                <span className="text-gray-600">审批拒绝率</span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-red-600">{stats?.rejection_rate || 0}%</span>
                <span className="ml-2 text-xs text-red-500 flex items-center">
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                  -1.2%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-3" />
                <span className="text-gray-600">平均审批时长</span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">{stats?.avg_approval_time || 0}h</span>
                <span className="ml-2 text-xs text-green-500 flex items-center">
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                  -0.5h
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">待处理审批</h2>
          <div className="space-y-3">
            {stats?.pending_approvals && stats.pending_approvals > 0 ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">采购审批#{i * 100 + 12}</p>
                      <p className="text-xs text-gray-500">等待审批 · 2小时前</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                    待处理
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">暂无待处理审批</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowStatisticsPage;
