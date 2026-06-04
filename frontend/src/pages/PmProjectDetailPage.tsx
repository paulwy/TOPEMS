import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  Target,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  FolderKanban,
  Briefcase,
  BarChart3,
  CheckSquare,
  FileText,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { pmApi, Project, ProjectPhase, ProjectMilestone, ProjectMember, ProjectDashboardResponse, ProjectResource, ProjectExpense, ProjectBenefit, ProjectApproval, BenefitAnalysis, Contract } from '../api/pm';

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  active: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-purple-100 text-purple-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const RISK_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};

const PmProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [dashboard, setDashboard] = useState<ProjectDashboardResponse | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [benefits, setBenefits] = useState<ProjectBenefit[]>([]);
  const [benefitAnalysis, setBenefitAnalysis] = useState<BenefitAnalysis | null>(null);
  const [approval, setApproval] = useState<ProjectApproval | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    setLoading(true);
    try {
      const [
        projectRes, 
        dashboardRes, 
        phasesRes, 
        milestonesRes, 
        membersRes,
        resourcesRes,
        expensesRes,
        benefitsRes,
        benefitAnalysisRes,
        approvalRes,
        contractsRes
      ] = await Promise.all([
        pmApi.projects.get(projectId),
        pmApi.projects.dashboard(projectId),
        pmApi.phases.list(projectId),
        pmApi.milestones.list(projectId),
        pmApi.members.list(projectId),
        pmApi.resources.list(projectId),
        pmApi.expenses.list(projectId),
        pmApi.benefits.list(projectId),
        pmApi.benefits.analysis(projectId).catch(() => ({ success: false, data: null })),
        pmApi.approval.get(projectId).catch(() => ({ success: false, data: null })),
        pmApi.contracts.projectContracts.list(projectId).catch(() => ({ success: false, data: [] })),
      ]);

      if (projectRes.success && projectRes.data) {
        setProject(projectRes.data);
      }
      if (dashboardRes.success && dashboardRes.data) {
        setDashboard(dashboardRes.data);
      }
      if (phasesRes.success && phasesRes.data) {
        setPhases(phasesRes.data);
      }
      if (milestonesRes.success && milestonesRes.data) {
        setMilestones(milestonesRes.data);
      }
      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data);
      }
      if (resourcesRes.success && resourcesRes.data) {
        setResources(resourcesRes.data);
      }
      if (expensesRes.success && expensesRes.data) {
        setExpenses(expensesRes.data);
      }
      if (benefitsRes.success && benefitsRes.data) {
        setBenefits(benefitsRes.data);
      }
      if (benefitAnalysisRes.success && benefitAnalysisRes.data) {
        setBenefitAnalysis(benefitAnalysisRes.data);
      }
      if (approvalRes.success && approvalRes.data) {
        setApproval(approvalRes.data);
      }
      if (contractsRes.success && contractsRes.data) {
        setContracts(contractsRes.data);
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个项目吗？')) return;
    if (!id) return;
    try {
      const response = await pmApi.projects.delete(id);
      if (response.success) {
        navigate('/pm/projects');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-gray-500">项目不存在</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/pm/projects')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-500">{project.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/pm/projects/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Edit className="w-4 h-4" />
              编辑
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <FolderKanban className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">项目状态</p>
                <span className={`inline-block px-2 py-1 text-sm rounded-full ${STATUS_COLORS[project.status] || STATUS_COLORS.draft}`}>
                  {STATUS_LABELS[project.status] || project.status}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">项目进度</p>
                <p className="text-xl font-bold text-gray-900">{project.progress}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">项目预算</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(project.budget)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${RISK_COLORS[project.risk_level || 'low'].replace('text-', 'bg-').replace('100', '200')}`}>
                <AlertTriangle className={`w-6 h-6 ${RISK_COLORS[project.risk_level || 'low'].split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">风险等级</p>
                <span className={`inline-block px-2 py-1 text-sm rounded-full ${RISK_COLORS[project.risk_level || 'low']}`}>
                  {RISK_LABELS[project.risk_level || 'low']}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">负责人</p>
              <p className="font-medium">{project.leader || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">开始日期</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formatDate(project.start_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">结束日期</p>
              <p className="font-medium flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                {formatDate(project.end_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">团队成员</p>
              <p className="font-medium flex items-center gap-1">
                <Users className="w-4 h-4 text-gray-400" />
                {members.length} 人
              </p>
            </div>
          </div>
          {project.description && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">项目描述</p>
              <p className="text-gray-700">{project.description}</p>
            </div>
          )}
          {project.tags && project.tags.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">标签</p>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex gap-1 flex-wrap">
              {[
                { key: 'dashboard', label: '仪表盘', icon: Activity },
                { key: 'phases', label: '阶段', icon: FolderKanban },
                { key: 'milestones', label: '里程碑', icon: Target },
                { key: 'members', label: '成员', icon: Users },
                { key: 'resources', label: '资源', icon: Briefcase },
                { key: 'expenses', label: '费用', icon: DollarSign },
                { key: 'benefits', label: '效益', icon: BarChart3 },
                { key: 'contracts', label: '合同', icon: FileText },
                { key: 'approval', label: '审批', icon: CheckSquare },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && dashboard && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">计划进度</p>
                        <p className="text-2xl font-bold text-blue-800">{dashboard.progress.planned}%</p>
                      </div>
                      <Activity className="w-8 h-8 text-blue-400" />
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${dashboard.progress.planned}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">实际进度</p>
                        <p className="text-2xl font-bold text-green-800">{dashboard.progress.actual}%</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      趋势: {dashboard.progress.trend === 'ahead' ? '领先计划' : dashboard.progress.trend === 'behind' ? '落后计划' : '正常'}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600">SPI</p>
                        <p className="text-2xl font-bold text-purple-800">{dashboard.benefits.spi?.toFixed(2) || '1.00'}</p>
                      </div>
                      <Target className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      进度绩效指数
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      阶段完成情况
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">已完成阶段</span>
                        <span className="font-medium">{dashboard.progress.completed_phases || 0} / {dashboard.progress.total_phases || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full"
                          style={{ width: `${((dashboard.progress.completed_phases || 0) / ((dashboard.progress.total_phases || 1))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      里程碑完成情况
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">已达成里程碑</span>
                        <span className="font-medium">{dashboard.benefits.milestones_achieved || 0} / {dashboard.benefits.total_milestones || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-purple-600 h-3 rounded-full"
                          style={{ width: `${((dashboard.benefits.milestones_achieved || 0) / ((dashboard.benefits.total_milestones || 1))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {dashboard.risks && dashboard.risks.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      风险预警
                    </h3>
                    <div className="space-y-3">
                      {dashboard.risks.map((risk, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            risk.level === 'high' || risk.level === 'critical' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                          }`}>
                            {risk.level}
                          </span>
                          <span className="text-gray-700">{risk.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'phases' && (
              <div className="space-y-4">
                {phases.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FolderKanban className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无阶段数据</p>
                  </div>
                ) : (
                  phases.map((phase) => (
                    <div
                      key={phase.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">#{phase.sequence_number}</span>
                            <h4 className="font-medium">{phase.name}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[phase.status] || STATUS_COLORS.draft}`}>
                              {STATUS_LABELS[phase.status] || phase.status}
                            </span>
                          </div>
                          {phase.description && (
                            <p className="text-sm text-gray-500 mt-1">{phase.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                            {phase.start_date && <span>{formatDate(phase.start_date)}</span>}
                            {phase.end_date && <span>→ {formatDate(phase.end_date)}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{phase.progress}%</p>
                          <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${phase.progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'milestones' && (
              <div className="space-y-4">
                {milestones.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无里程碑数据</p>
                  </div>
                ) : (
                  milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{milestone.name}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              milestone.status === 'achieved' ? 'bg-green-100 text-green-800' : STATUS_COLORS[milestone.status] || STATUS_COLORS.draft
                            }`}>
                              {milestone.status === 'achieved' ? '已达成' : STATUS_LABELS[milestone.status] || milestone.status}
                            </span>
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                          )}
                          {milestone.acceptance_criteria && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">验收标准</p>
                              <p className="text-sm text-gray-700">{milestone.acceptance_criteria}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">目标日期</p>
                          <p className="font-medium">{formatDate(milestone.date)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-4">
                {members.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无团队成员</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{member.user_id}</h4>
                            <p className="text-sm text-gray-500">{member.role}</p>
                            {member.responsibilities && (
                              <p className="text-sm text-gray-400 mt-1">{member.responsibilities}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-400">
                            {member.start_date && <p>{formatDate(member.start_date)}</p>}
                            {member.end_date && <p>至 {formatDate(member.end_date)}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="space-y-4">
                {resources.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无资源数据</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">资源类型</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">角色</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">分配比例</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">实际工时</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">实际成本</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">期间</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {resources.map((resource) => (
                          <tr key={resource.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{resource.resource_type}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{resource.role || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{resource.allocation_percent}%</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{resource.actual_hours}h</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(resource.actual_cost)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 text-xs rounded-full ${resource.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {resource.status === 'active' ? '使用中' : resource.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDate(resource.start_date)} - {formatDate(resource.end_date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="space-y-4">
                {expenses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无费用数据</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">费用类型</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">类别</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">金额</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">发生日期</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">描述</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {expenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{expense.expense_type}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{expense.category || '-'}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(expense.amount)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(expense.incurred_date)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                expense.status === 'approved' ? 'bg-green-100 text-green-800' :
                                expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {expense.status === 'approved' ? '已批准' : expense.status === 'pending' ? '待审批' : expense.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{expense.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'benefits' && (
              <div className="space-y-6">
                {benefitAnalysis && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600">成本绩效指数</p>
                      <p className="text-2xl font-bold text-blue-800">{benefitAnalysis.eva.cpi.toFixed(2)}</p>
                      <p className="text-xs mt-2 text-blue-600">{benefitAnalysis.trend.cpi_status}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600">进度绩效指数</p>
                      <p className="text-2xl font-bold text-green-800">{benefitAnalysis.eva.spi.toFixed(2)}</p>
                      <p className="text-xs mt-2 text-green-600">{benefitAnalysis.trend.spi_status}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600">投资回报率</p>
                      <p className="text-2xl font-bold text-purple-800">{(benefitAnalysis.eva.roi * 100).toFixed(2)}%</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-orange-600">完工估算</p>
                      <p className="text-2xl font-bold text-orange-800">{formatCurrency(benefitAnalysis.eva.eac)}</p>
                    </div>
                  </div>
                )}

                {benefits.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无效益分析数据</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">期间类型</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">期间日期</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">计划成本</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">实际成本</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">CPI</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SPI</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">ROI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {benefits.map((benefit) => (
                          <tr key={benefit.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{benefit.period_type}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(benefit.period_date)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(benefit.planned_cost)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(benefit.actual_cost)}</td>
                            <td className="px-4 py-3 text-sm">{benefit.cpi.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm">{benefit.spi.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm">{(benefit.roi * 100).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contracts' && (
              <div className="space-y-4">
                {contracts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无合同数据</p>
                    <button
                      onClick={() => id && pmApi.contracts.projectContracts.create(id, {
                        contract_code: `CT-${Date.now()}`,
                        contract_name: '新建合同',
                        contract_type: '服务合同',
                        amount: 0,
                      }).then(() => loadProjectData(id))}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      创建合同
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">合同编号</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">合同名称</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">合同类型</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">乙方</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">金额</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">状态</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">签署日期</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">到期日期</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {contracts.map((contract) => (
                          <tr key={contract.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-blue-600">{contract.contract_code}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{contract.contract_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{contract.contract_type}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{contract.party_b_name || '-'}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(contract.amount)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                contract.status === 'approved' ? 'bg-green-100 text-green-800' :
                                contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                contract.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {contract.status === 'approved' ? '已批准' :
                                 contract.status === 'pending' ? '待审批' :
                                 contract.status === 'rejected' ? '已拒绝' :
                                 contract.status === 'active' ? '执行中' :
                                 contract.status === 'completed' ? '已完成' : contract.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{contract.signing_date ? formatDate(contract.signing_date) : '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{contract.end_date ? formatDate(contract.end_date) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'approval' && (
              <div className="space-y-6">
                {!approval ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无审批流程</p>
                    <button
                      onClick={() => id && pmApi.approval.submit(id, { approver_id: 'user1' }).then(() => loadProjectData(id))}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      启动审批
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">审批状态</h3>
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          approval.status === 'approved' ? 'bg-green-100 text-green-800' :
                          approval.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          approval.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {approval.status === 'approved' ? '已批准' :
                           approval.status === 'rejected' ? '已拒绝' :
                           approval.status === 'pending' ? '审批中' : approval.status}
                        </span>
                      </div>

                      <div className="space-y-4">
                        {Array.from({ length: approval.total_steps }, (_, i) => i + 1).map((step) => (
                          <div key={step} className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              step < approval.current_step ? 'bg-green-500 text-white' :
                              step === approval.current_step ? 'bg-blue-500 text-white' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {step < approval.current_step ? '✓' : step}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">第 {step} 步</p>
                                {step < approval.current_step && (
                                  <span className="text-sm text-green-600">已完成</span>
                                )}
                                {step === approval.current_step && (
                                  <span className="text-sm text-blue-600">当前步骤</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {approval.comments && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <p className="text-sm text-gray-500 mb-2">审批意见</p>
                          <p className="text-gray-700">{approval.comments}</p>
                        </div>
                      )}

                      {approval.status === 'pending' && (
                        <div className="mt-6 flex gap-4">
                          <button
                            onClick={() => id && pmApi.approval.action(id, {
                              action: 'approve',
                              approver_id: 'current_user',
                              comment: '批准'
                            }).then(() => loadProjectData(id))}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            批准
                          </button>
                          <button
                            onClick={() => id && pmApi.approval.action(id, {
                              action: 'reject',
                              approver_id: 'current_user',
                              comment: '拒绝'
                            }).then(() => loadProjectData(id))}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PmProjectDetailPage;
