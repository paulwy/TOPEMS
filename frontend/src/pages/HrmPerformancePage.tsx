import React, { useState } from 'react';
import { 
  TrendingUp, Award, Target, Users, Calendar,
  Search, Plus, ChevronLeft, Eye, Edit, CheckCircle,
  XCircle, Clock, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';

interface PerformanceReview {
  id: string;
  employee_name: string;
  employee_number: string;
  department: string;
  position: string;
  review_period: string;
  review_type: 'quarterly' | 'annual' | 'probation';
  status: 'pending' | 'self_review' | 'manager_review' | 'completed';
  self_score?: number;
  manager_score?: number;
  final_score?: number;
  self_review_date?: string;
  manager_review_date?: string;
  created_at: string;
}

interface PerformanceGoal {
  id: string;
  employee_name: string;
  goal_title: string;
  goal_description: string;
  weight: number;
  target_value: string;
  current_value?: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string;
}

interface EmployeeScore {
  id: string;
  employee_name: string;
  department: string;
  position: string;
  kpi_score: number;
  capability_score: number;
  attitude_score: number;
  final_score: number;
  rank: number;
  review_period: string;
}

const HrmPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();
  
  const [activeTab, setActiveTab] = useState<'reviews' | 'goals' | 'rankings'>('reviews');
  const [searchQuery, setSearchQuery] = useState('');

  const [reviews] = useState<PerformanceReview[]>([
    {
      id: '1',
      employee_name: '张伟',
      employee_number: 'EMP001',
      department: '研发部',
      position: '高级工程师',
      review_period: '2026-Q1',
      review_type: 'quarterly',
      status: 'completed',
      self_score: 85,
      manager_score: 88,
      final_score: 86.5,
      self_review_date: '2026-04-01',
      manager_review_date: '2026-04-05',
      created_at: '2026-03-25'
    },
    {
      id: '2',
      employee_name: '李娜',
      employee_number: 'EMP002',
      department: '产品部',
      position: '产品经理',
      review_period: '2026-Q1',
      review_type: 'quarterly',
      status: 'manager_review',
      self_score: 90,
      manager_score: undefined,
      created_at: '2026-03-25'
    },
    {
      id: '3',
      employee_name: '王强',
      employee_number: 'EMP003',
      department: '销售部',
      position: '销售经理',
      review_period: '2026-Q1',
      review_type: 'quarterly',
      status: 'self_review',
      self_score: undefined,
      created_at: '2026-03-25'
    },
  ]);

  const [goals] = useState<PerformanceGoal[]>([
    {
      id: '1',
      employee_name: '张伟',
      goal_title: '完成用户中心重构',
      goal_description: '完成用户中心模块的架构重构，提升系统性能30%',
      weight: 30,
      target_value: '性能提升30%',
      current_value: '性能提升25%',
      progress: 83,
      status: 'in_progress',
      due_date: '2026-06-30'
    },
    {
      id: '2',
      employee_name: '张伟',
      goal_title: '优化接口响应时间',
      goal_description: '优化核心接口，将平均响应时间降低至200ms以内',
      weight: 25,
      target_value: '响应时间≤200ms',
      current_value: '响应时间220ms',
      progress: 90,
      status: 'in_progress',
      due_date: '2026-05-31'
    },
    {
      id: '3',
      employee_name: '李娜',
      goal_title: '完成产品路线图规划',
      goal_description: '制定2026年产品路线图，包含3个重大版本规划',
      weight: 40,
      target_value: '3个版本规划',
      current_value: '已完成规划',
      progress: 100,
      status: 'completed',
      due_date: '2026-04-15'
    },
  ]);

  const [rankings] = useState<EmployeeScore[]>([
    { id: '1', employee_name: '张伟', department: '研发部', position: '高级工程师', kpi_score: 88, capability_score: 90, attitude_score: 85, final_score: 87.7, rank: 1, review_period: '2026-Q1' },
    { id: '2', employee_name: '李娜', department: '产品部', position: '产品经理', kpi_score: 85, capability_score: 88, attitude_score: 90, final_score: 87.3, rank: 2, review_period: '2026-Q1' },
    { id: '3', employee_name: '王强', department: '销售部', position: '销售经理', kpi_score: 82, capability_score: 80, attitude_score: 88, final_score: 82.8, rank: 3, review_period: '2026-Q1' },
  ]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      pending: <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">待开始</span>,
      self_review: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">自评中</span>,
      manager_review: <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">待上级评价</span>,
      completed: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">已完成</span>,
      not_started: <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">未开始</span>,
      in_progress: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">进行中</span>,
      cancelled: <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已取消</span>,
    };
    return badges[status] || <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{status}</span>;
  };

  const filteredReviews = reviews.filter(r => 
    r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer notifications={notifications} onClose={hideNotification} />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <TrendingUp className="w-7 h-7 mr-3 text-orange-600" />
                  绩效管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理员工绩效评估、目标设定和绩效考核
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'reviews' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Award className="w-5 h-5" />
            <span>绩效评估</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'goals' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Target className="w-5 h-5" />
            <span>目标管理</span>
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'rankings' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>绩效排名</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索员工/部门..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              新建评估
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">员工姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">部门/岗位</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">考核周期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">自评分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上级评分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最终得分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReviews.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{review.employee_name}</div>
                        <div className="text-sm text-gray-500">{review.employee_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{review.department}</div>
                        <div className="text-sm text-gray-500">{review.position}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{review.review_period}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {review.self_score !== undefined ? (
                          <span className={getScoreColor(review.self_score)}>{review.self_score}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {review.manager_score !== undefined ? (
                          <span className={getScoreColor(review.manager_score)}>{review.manager_score}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {review.final_score !== undefined ? (
                          <span className={`text-lg font-bold ${getScoreColor(review.final_score)}`}>
                            {review.final_score}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(review.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800">查看</button>
                          {review.status !== 'completed' && (
                            <button className="text-blue-600 hover:text-blue-800">编辑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{goal.goal_title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{goal.employee_name}</p>
                  </div>
                  {getStatusBadge(goal.status)}
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{goal.goal_description}</p>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">目标进度</span>
                    <span className="font-medium text-blue-600">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">权重：</span>
                    <span className="font-medium">{goal.weight}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">截止日期：</span>
                    <span className="font-medium">{goal.due_date}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">目标值：{goal.target_value}</span>
                  </div>
                  {goal.current_value && (
                    <div className="mt-1 text-sm">
                      <span className="text-gray-600">当前值：{goal.current_value}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'rankings' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">员工姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">部门/岗位</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KPI得分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">能力得分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">态度得分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">综合得分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">考核周期</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rankings.map((employee, idx) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-lg font-bold ${
                          idx === 0 ? 'text-yellow-500' : 
                          idx === 1 ? 'text-gray-400' : 
                          idx === 2 ? 'text-orange-400' : 'text-gray-600'
                        }`}>
                          #{employee.rank}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.employee_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.department}</div>
                        <div className="text-sm text-gray-500">{employee.position}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.kpi_score}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.capability_score}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.attitude_score}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-lg font-bold ${getScoreColor(employee.final_score)}`}>
                          {employee.final_score}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.review_period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HrmPerformancePage;
