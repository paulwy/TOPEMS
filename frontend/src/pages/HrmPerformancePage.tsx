import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Award, Target, Users, Calendar,
  Search, Plus, ChevronLeft, Eye, Edit, CheckCircle,
  XCircle, Clock, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';
import { 
  performanceReviewApi, 
  performanceGoalApi, 
  employeeApi,
  departmentApi,
  type PerformanceReview as ApiPerformanceReview,
  type PerformanceGoal as ApiPerformanceGoal,
  type Employee
} from '../api/hrm';

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
  const [loading, setLoading] = useState(false);
  
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [rankings, setRankings] = useState<EmployeeScore[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载所有数据
      const [reviewsRes, goalsRes, employeesRes, departmentsRes] = await Promise.all([
        performanceReviewApi.list({ page_size: 100 }),
        performanceGoalApi.list({ page_size: 100 }),
        employeeApi.list({ page_size: 100 }),
        departmentApi.list({ page_size: 100 })
      ]);

      // 创建员工映射，方便查找
      const employeeMap: Record<string, Employee> = {};
      employeesRes.data?.items?.forEach(emp => {
        employeeMap[emp.id] = emp;
      });
      setEmployees(employeeMap);

      // 创建部门映射
      const departmentMap: Record<string, any> = {};
      (departmentsRes.data?.items || []).forEach(dept => {
        departmentMap[dept.id] = dept;
      });

      // 转换绩效评估数据
      const transformedReviews: PerformanceReview[] = (reviewsRes.data?.items || []).map(review => {
        const employee = employeeMap[review.employee_id];
        return {
          id: review.id,
          employee_name: employee?.name || '未知员工',
          employee_number: employee?.employee_number || '',
          department: '',
          position: employee?.position || '',
          review_period: review.review_period,
          review_type: 'quarterly',
          status: mapReviewStatus(review.status),
          self_score: review.self_rating,
          manager_score: review.manager_rating,
          final_score: review.final_rating,
          created_at: review.created_at
        };
      });
      setReviews(transformedReviews);

      // 转换绩效目标数据
      const transformedGoals: PerformanceGoal[] = (goalsRes.data?.items || []).map(goal => {
        const employee = employeeMap[goal.employee_id];
        return {
          id: goal.id,
          employee_name: employee?.name || '未知员工',
          goal_title: goal.title,
          goal_description: goal.description || '',
          weight: goal.weight,
          target_value: goal.target || '',
          current_value: goal.achieved?.toString(),
          progress: Math.min(goal.achieved || 0, 100),
          status: mapGoalStatus(goal.status),
          due_date: goal.due_date || ''
        };
      });
      setGoals(transformedGoals);

      // 基于实际绩效评分数据生成排名
      const rankings: EmployeeScore[] = transformedReviews
        .filter(r => r.final_score !== undefined)
        .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
        .map((review, index) => ({
          id: review.id,
          employee_name: review.employee_name,
          department: review.department,
          position: review.position,
          kpi_score: review.self_score || 0,
          capability_score: Math.max(0, (review.manager_score || 0) - 5),
          attitude_score: Math.min(100, (review.manager_score || 0) + 2),
          final_score: review.final_score || 0,
          rank: index + 1,
          review_period: review.review_period
        }));
      setRankings(rankings);

    } catch (err) {
      error('加载数据失败');
      console.error('Failed to load performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const mapReviewStatus = (status: string): PerformanceReview['status'] => {
    const statusMap: Record<string, PerformanceReview['status']> = {
      'pending': 'pending',
      'self_review': 'self_review',
      'manager_review': 'manager_review',
      'completed': 'completed'
    };
    return statusMap[status] || 'pending';
  };

  const mapGoalStatus = (status: string): PerformanceGoal['status'] => {
    const statusMap: Record<string, PerformanceGoal['status']> = {
      'not_started': 'not_started',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    return statusMap[status] || 'not_started';
  };

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
            <button 
              onClick={loadData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              刷新数据
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
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
                      {rankings.map((employee, index) => (
                        <tr key={employee.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-lg font-bold ${
                              index === 0 ? 'text-yellow-500' : 
                              index === 1 ? 'text-gray-400' : 
                              index === 2 ? 'text-orange-400' : 'text-gray-600'
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
          </>
        )}
      </div>
    </div>
  );
};

export default HrmPerformancePage;