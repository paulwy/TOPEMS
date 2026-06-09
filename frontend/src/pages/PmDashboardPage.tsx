import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  Calendar,
  DollarSign,
  Plus,
  ArrowRight,
  ChevronRight,
  BarChart3,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Project, Contract, PmStatistics } from '../api/pm';
import { pmApi } from '../api/pm';
import { MetricCard } from '../components/MetricCard';
import { StatsChart } from '../components/StatsChart';

const PmDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PmStatistics>({
    total_projects: 0,
    draft_projects: 0,
    pending_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    cancelled_projects: 0,
    total_contracts: 0,
    pending_contracts: 0,
    active_contracts: 0,
    completed_contracts: 0,
    total_budget: 0,
    spent_budget: 0,
    budget_usage_rate: 0,
    on_time_projects: 0,
    delayed_projects: 0,
    average_progress: 0,
    high_risk_projects: 0,
    medium_risk_projects: 0,
    low_risk_projects: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await pmApi.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        pmApi.projects.list().then((res) => {
          if (res.success && res.data) {
            setProjects(res.data.projects || []);
          }
        }),
        pmApi.contracts.list().then((res) => {
          if (res.success && res.data) {
            setContracts(res.data.contracts || []);
          }
        }),
        loadStatistics(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProjectStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'pending':
        return '待审批';
      case 'cancelled':
        return '已取消';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const quickActions = [
    {
      title: '项目管理',
      description: '查看和管理所有项目',
      icon: FolderKanban,
      color: 'bg-blue-500',
      path: '/pm/projects',
    },
    {
      title: '合同管理',
      description: '管理项目相关合同',
      icon: FileCheck,
      color: 'bg-purple-500',
      path: '/pm/contracts',
    },
    {
      title: '预算管理',
      description: '管理项目预算和支出',
      icon: DollarSign,
      color: 'bg-green-500',
      path: '/pm/projects',
    },
    {
      title: '项目报告',
      description: '查看项目统计报表',
      icon: BarChart3,
      color: 'bg-orange-500',
      path: '/pm/projects',
    },
  ];

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>项目管理中心</h1>
        <p className='text-gray-500 mt-1'>统一管理所有项目、合同和相关资源</p>
      </div>

      {/* 统计卡片区域 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8'>
        <MetricCard
          title='项目总数'
          value={stats.total_projects}
          icon={<FolderKanban className='w-6 h-6' />}
          gradient={['#8B5CF6', '#7C3AED']}
          subtitle={`进行中: ${stats.active_projects}`}
          trend={stats.active_projects > 0 ? 'up' : 'neutral'}
        />
        <MetricCard
          title='已完成项目'
          value={stats.completed_projects}
          icon={<CheckCircle2 className='w-6 h-6' />}
          gradient={['#00C897', '#00A878']}
          trend='up'
        />
        <MetricCard
          title='合同总数'
          value={stats.total_contracts}
          icon={<FileCheck className='w-6 h-6' />}
          gradient={['#6366F1', '#4F46E5']}
          subtitle={`进行中: ${stats.active_contracts}`}
          trend={stats.active_contracts > 0 ? 'up' : 'neutral'}
        />
        <MetricCard
          title='预算使用'
          value={stats.budget_usage_rate}
          icon={<DollarSign className='w-6 h-6' />}
          gradient={['#F59E0B', '#D97706']}
          subtitle={`已用: ${(stats.spent_budget / 10000).toFixed(1)}万 / ${(stats.total_budget / 10000).toFixed(1)}万`}
          trend='neutral'
          suffix='%'
        />
        <MetricCard
          title='项目进度'
          value={stats.average_progress}
          icon={<TrendingUp className='w-6 h-6' />}
          gradient={['#14B8A6', '#0D9488']}
          subtitle={`准时: ${stats.on_time_projects} 个`}
          trend='up'
          suffix='%'
        />
        <MetricCard
          title='高风险项目'
          value={stats.high_risk_projects}
          icon={<AlertTriangle className='w-6 h-6' />}
          gradient={['#EF4444', '#DC2626']}
          subtitle={`中: ${stats.medium_risk_projects} 低: ${stats.low_risk_projects}`}
          trend={stats.high_risk_projects > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* 数据可视化图表区域 */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
        <StatsChart
          title='项目状态分布'
          type='pie'
          data={[
            { name: '草稿', value: stats.draft_projects, color: '#6B7280' },
            { name: '待审批', value: stats.pending_projects, color: '#F59E0B' },
            { name: '进行中', value: stats.active_projects, color: '#3B82F6' },
            { name: '已完成', value: stats.completed_projects, color: '#10B981' },
            { name: '已取消', value: stats.cancelled_projects, color: '#EF4444' },
          ].filter((d) => d.value > 0)}
          dataKey='value'
          nameKey='name'
        />
        <StatsChart
          title='项目进度对比'
          type='pie'
          data={[
            { name: '准时', value: stats.on_time_projects, color: '#10B981' },
            { name: '延迟', value: stats.delayed_projects, color: '#EF4444' },
          ].filter((d) => d.value > 0)}
          dataKey='value'
          nameKey='name'
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-gray-900'>快速操作</h2>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left'
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                    <Icon className='w-5 h-5 text-white' />
                  </div>
                  <h3 className='font-medium text-gray-900 mb-1'>{action.title}</h3>
                  <p className='text-sm text-gray-500'>{action.description}</p>
                </button>
              );
            })}
          </div>
          <div className='mt-4'>
            <button
              onClick={() => navigate('/pm/projects/create')}
              className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              <Plus className='w-5 h-5' />
              创建新项目
            </button>
          </div>
        </div>

        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-gray-900'>最新项目</h2>
            <button
              onClick={() => navigate('/pm/projects')}
              className='text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1'
            >
              查看全部 <ArrowRight className='w-4 h-4' />
            </button>
          </div>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            </div>
          ) : projects.length === 0 ? (
            <div className='text-center py-12 text-gray-500'>暂无项目</div>
          ) : (
            <div className='space-y-4'>
              {projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/pm/projects/${project.id}`)}
                  className='flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors'
                >
                  <div className='flex-1'>
                    <h3 className='font-medium text-gray-900'>{project.name}</h3>
                    <p className='text-sm text-gray-500'>{project.code}</p>
                  </div>
                  <div className='text-right mr-4'>
                    <div className='flex items-center gap-2 mb-1'>
                      <span className={`px-2 py-1 text-xs rounded-full ${getProjectStatusColor(project.status)}`}>
                        {getProjectStatusLabel(project.status)}
                      </span>
                    </div>
                    <div className='w-20 bg-gray-200 rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full ${project.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'}`}
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <Calendar className='w-5 h-5 text-gray-400' />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-gray-900'>项目进度概览</h2>
          </div>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            </div>
          ) : (
            <div className='space-y-4'>
              {projects.slice(0, 5).map((project) => (
                <div key={project.id} className='p-4 border border-gray-200 rounded-lg'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='font-medium text-gray-900 text-sm'>{project.name}</span>
                    <span className='text-sm text-gray-500'>{project.progress}%</span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div
                      className={`h-2 rounded-full ${project.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'}`}
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <div className='mt-2 text-xs text-gray-500'>
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-gray-900'>最新合同</h2>
            <button
              onClick={() => navigate('/pm/contracts')}
              className='text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1'
            >
              查看全部 <ArrowRight className='w-4 h-4' />
            </button>
          </div>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            </div>
          ) : contracts.length === 0 ? (
            <div className='text-center py-12 text-gray-500'>暂无合同</div>
          ) : (
            <div className='space-y-4'>
              {contracts.slice(0, 5).map((contract) => (
                <div
                  key={contract.id}
                  onClick={() => navigate(`/pm/contracts/${contract.id}`)}
                  className='flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors'
                >
                  <div className='flex-1'>
                    <h3 className='font-medium text-gray-900'>{contract.contract_name}</h3>
                    <p className='text-sm text-gray-500'>{contract.contract_code}</p>
                  </div>
                  <div className='text-right mr-4'>
                    <p className='font-medium text-gray-900'>
                      {contract.amount
                        ? new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(contract.amount)
                        : '-'}
                    </p>
                    <p className='text-xs text-gray-500'>{formatDate(contract.signing_date)}</p>
                  </div>
                  <FileCheck className='w-5 h-5 text-gray-400' />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PmDashboardPage;
