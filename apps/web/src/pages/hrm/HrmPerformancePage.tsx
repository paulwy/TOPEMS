import React, { useState, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { Award, Target, BarChart3, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useNotification } from '@/hooks/useNotification';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';
import {
  performanceReviewApi,
  performanceGoalApi,
  employeeApi,
  departmentApi,
  type Employee,
} from '@/api/hrm';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface PerformanceReview {
  id: string;
  employee_name: string;
  employee_no: string;
  department: string;
  position: string;
  review_period: string;
  review_type: 'quarterly' | 'annual' | 'probation';
  status: 'pending' | 'self_review' | 'manager_review' | 'completed';
  self_score?: number;
  manager_score?: number;
  final_score?: number;
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
  const { error } = useNotification();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'reviews' | 'goals' | 'rankings'>('reviews');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['hrm-performance-reviews'],
    queryFn: async () => {
      try {
        const [reviewsRes, employeesRes] = await Promise.all([
          performanceReviewApi.list({ pagesize: 100 }),
          employeeApi.list({ pagesize: 100 }),
        ]);

        const employeeMap: Record<string, Employee> = {};
        employeesRes.data?.items?.forEach((emp) => {
          employeeMap[emp.id] = emp;
        });

        const transformedReviews: PerformanceReview[] = (reviewsRes.data?.items || []).map(
          (review) => {
            const employee = employeeMap[review.employee_id];
            return {
              id: review.id,
              employee_name: employee?.name || '未知员工',
              employee_no: employee?.employee_no || '',
              department: '',
              position: employee?.position || '',
              review_period: review.review_period,
              review_type: 'quarterly',
              status: mapReviewStatus(review.status),
              self_score: review.self_rating,
              manager_score: review.manager_rating,
              final_score: review.final_rating,
              created_at: review.created_at,
            };
          }
        );
        return transformedReviews;
      } catch (err: unknown) {
        error('加载数据失败');
        apiLogger.error('Failed to load performance reviews:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['hrm-performance-goals'],
    queryFn: async () => {
      try {
        const [goalsRes, employeesRes] = await Promise.all([
          performanceGoalApi.list({ pagesize: 100 }),
          employeeApi.list({ pagesize: 100 }),
        ]);

        const employeeMap: Record<string, Employee> = {};
        employeesRes.data?.items?.forEach((emp) => {
          employeeMap[emp.id] = emp;
        });

        const transformedGoals: PerformanceGoal[] = (goalsRes.data?.items || []).map((goal) => {
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
            due_date: goal.due_date || '',
          };
        });
        return transformedGoals;
      } catch (err: unknown) {
        error('加载数据失败');
        apiLogger.error('Failed to load performance goals:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = reviewsLoading || goalsLoading;

  const rankings = useMemo(() => {
    const reviewList = reviews || [];
    return reviewList
      .filter((r) => r.final_score !== undefined)
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
        review_period: review.review_period,
      }));
  }, [reviews]);

  const mapReviewStatus = (status: string): PerformanceReview['status'] => {
    const statusMap: Record<string, PerformanceReview['status']> = {
      pending: 'pending',
      self_review: 'self_review',
      manager_review: 'manager_review',
      completed: 'completed',
    };
    return statusMap[status] || 'pending';
  };

  const mapGoalStatus = (status: string): PerformanceGoal['status'] => {
    const statusMap: Record<string, PerformanceGoal['status']> = {
      not_started: 'not_started',
      in_progress: 'in_progress',
      completed: 'completed',
      cancelled: 'cancelled',
    };
    return statusMap[status] || 'not_started';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待开始',
      self_review: '自评中',
      manager_review: '待上级评价',
      completed: '已完成',
      not_started: '未开始',
      in_progress: '进行中',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success.main';
    if (score >= 80) return 'primary.main';
    if (score >= 70) return 'warning.main';
    return 'error.main';
  };

  const reviewList = reviews || [];
  const goalList = goals || [];

  const performanceStats = useMemo(() => {
    const totalReviews = reviewList.length;
    const completedReviews = reviewList.filter((r) => r.status === 'completed').length;
    const pendingReviews = reviewList.filter((r) => r.status !== 'completed').length;
    const avgScore =
      reviewList.length > 0
        ? reviewList
            .filter((r) => r.final_score !== undefined)
            .reduce((sum, r) => sum + (r.final_score || 0), 0) /
          reviewList.filter((r) => r.final_score !== undefined).length
        : 0;

    const totalGoals = goalList.length;
    const completedGoals = goalList.filter((g) => g.status === 'completed').length;
    const inProgressGoals = goalList.filter((g) => g.status === 'in_progress').length;
    const avgGoalProgress =
      goalList.length > 0 ? goalList.reduce((sum, g) => sum + g.progress, 0) / goalList.length : 0;

    return {
      totalReviews,
      completedReviews,
      pendingReviews,
      avgScore: Math.round(avgScore * 10) / 10,
      totalGoals,
      completedGoals,
      inProgressGoals,
      avgGoalProgress: Math.round(avgGoalProgress),
    };
  }, [reviewList, goalList]);

  const reviewStatusData = useMemo(
    () => [
      { name: '已完成', value: reviewList.filter((r) => r.status === 'completed').length },
      { name: '待开始', value: reviewList.filter((r) => r.status === 'pending').length },
      { name: '自评中', value: reviewList.filter((r) => r.status === 'self_review').length },
      { name: '待上级评价', value: reviewList.filter((r) => r.status === 'manager_review').length },
    ],
    [reviewList]
  );

  const goalStatusData = useMemo(
    () => [
      { name: '已完成', value: goalList.filter((g) => g.status === 'completed').length },
      { name: '进行中', value: goalList.filter((g) => g.status === 'in_progress').length },
      { name: '未开始', value: goalList.filter((g) => g.status === 'not_started').length },
      { name: '已取消', value: goalList.filter((g) => g.status === 'cancelled').length },
    ],
    [goalList]
  );

  const departmentScoreData = [
    { name: '研发部', value: 85 },
    { name: '产品部', value: 88 },
    { name: '销售部', value: 82 },
    { name: '财务部', value: 90 },
    { name: '人事部', value: 86 },
  ];

  const filteredReviews = reviewList.filter(
    (r) =>
      r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { label: '绩效评估', value: 'reviews', icon: <Award size={18} /> },
    { label: '目标管理', value: 'goals', icon: <Target size={18} /> },
    { label: '绩效排名', value: 'rankings', icon: <BarChart3 size={18} /> },
  ];

  const statCards =
    activeTab === 'rankings'
      ? [
          {
            id: 'total-reviews',
            title: '绩效评估总数',
            value: performanceStats.totalReviews,
            icon: <Award size={24} />,
            color: 'primary' as const,
          },
          {
            id: 'completed-reviews',
            title: '已完成评估',
            value: performanceStats.completedReviews,
            icon: <CheckCircle size={24} />,
            color: 'success' as const,
          },
          {
            id: 'pending-reviews',
            title: '待完成评估',
            value: performanceStats.pendingReviews,
            icon: <Clock size={24} />,
            color: 'warning' as const,
          },
          {
            id: 'avg-score',
            title: '平均绩效得分',
            value: performanceStats.avgScore,
            icon: <TrendingUp size={24} />,
            color: 'info' as const,
          },
          {
            id: 'total-goals',
            title: '绩效目标总数',
            value: performanceStats.totalGoals,
            icon: <Target size={24} />,
            color: 'primary' as const,
          },
          {
            id: 'in-progress-goals',
            title: '进行中目标',
            value: performanceStats.inProgressGoals,
            icon: <Clock size={24} />,
            color: 'warning' as const,
          },
        ]
      : [];

  const charts =
    activeTab === 'rankings'
      ? [
          {
            id: 'review-status-distribution',
            title: '绩效评估状态分布',
            type: 'pie' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: reviewStatusData.filter((d) => d.value > 0),
          },
          {
            id: 'goal-status-distribution',
            title: '绩效目标状态分布',
            type: 'pie' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: goalStatusData.filter((d) => d.value > 0),
          },
          {
            id: 'department-scores',
            title: '部门平均绩效得分',
            type: 'bar' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: departmentScoreData,
          },
        ]
      : [];

  const tables = (() => {
    switch (activeTab) {
      case 'reviews':
        return [
          {
            id: 'performance-reviews',
            title: '绩效评估列表',
            columns: [
              { id: 'employee_name', label: '员工姓名', field: 'employee_name' },
              { id: 'department', label: '部门/岗位', field: 'department' },
              { id: 'position', label: '岗位', field: 'position' },
              { id: 'review_period', label: '考核周期', field: 'review_period' },
              { id: 'self_score', label: '自评分', field: 'self_score' },
              { id: 'manager_score', label: '上级评分', field: 'manager_score' },
              { id: 'final_score', label: '最终得分', field: 'final_score' },
              {
                id: 'status',
                label: '状态',
                field: 'status',
                render: (value: unknown) => getStatusLabel(value as string),
              },
            ],
            data: filteredReviews.map((r) => ({
              ...r,
              department: `${r.department} / ${r.position}`,
              self_score: r.self_score ?? '-',
              manager_score: r.manager_score ?? '-',
              final_score: r.final_score ?? '-',
            })),
          },
        ];
      case 'goals':
        return [
          {
            id: 'performance-goals',
            title: '绩效目标列表',
            columns: [
              { id: 'employee_name', label: '员工姓名', field: 'employee_name' },
              { id: 'goal_title', label: '目标名称', field: 'goal_title' },
              { id: 'progress', label: '进度(%)', field: 'progress' },
              { id: 'weight', label: '权重(%)', field: 'weight' },
              { id: 'target_value', label: '目标值', field: 'target_value' },
              { id: 'current_value', label: '当前值', field: 'current_value' },
              { id: 'due_date', label: '截止日期', field: 'due_date' },
              {
                id: 'status',
                label: '状态',
                field: 'status',
                render: (value: unknown) => getStatusLabel(value as string),
              },
            ],
            data: goalList.map((g) => ({
              ...g,
              current_value: g.current_value ?? '-',
            })),
          },
        ];
      case 'rankings':
        return [
          {
            id: 'employee-rankings',
            title: '绩效排名',
            columns: [
              { id: 'rank', label: '排名', field: 'rank' },
              { id: 'employee_name', label: '员工姓名', field: 'employee_name' },
              { id: 'department', label: '部门', field: 'department' },
              { id: 'position', label: '岗位', field: 'position' },
              { id: 'kpi_score', label: 'KPI得分', field: 'kpi_score' },
              { id: 'capability_score', label: '能力得分', field: 'capability_score' },
              { id: 'attitude_score', label: '态度得分', field: 'attitude_score' },
              { id: 'final_score', label: '最终得分', field: 'final_score' },
            ],
            data: rankings as unknown as Record<string, unknown>[],
          },
        ];
      default:
        return [];
    }
  })();

  return (
    <PageContainer
      maxWidth='xl'
      title='绩效管理'
      subtitle='管理员工绩效评估、目标设定和绩效考核'
      autoTitle
      autoBreadcrumbs
    >
      <StatsPageTemplate
        title=''
        subtitle=''
        statCards={statCards}
        statColumns={4}
        charts={charts}
        chartColumns={{ xs: 1, md: 2, lg: 3 }}
        tables={tables}
        loading={isLoading}
        timeRangeOptions={[
          { label: '本周', value: 'week' },
          { label: '本月', value: 'month' },
          { label: '本季度', value: 'quarter' },
          { label: '本年', value: 'year' },
        ]}
        timeRange='month'
        search={{ value: searchQuery, onChange: setSearchQuery, placeholder: '搜索员工/部门...' }}
        tabs={tabs}
        tabValue={activeTab}
        onTabChange={(value) => setActiveTab(value as typeof activeTab)}
        showTimeRange={true}
        showSearch={true}
        showExport={true}
        showRefresh={true}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['hrm-performance-reviews'] });
          queryClient.invalidateQueries({ queryKey: ['hrm-performance-goals'] });
        }}
        showStatCards={activeTab === 'rankings'}
        showCharts={activeTab === 'rankings'}
        showTables={true}
      />
    </PageContainer>
  );
};

export default HrmPerformancePage;
