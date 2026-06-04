import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi, experimentApi, Project, Experiment } from '../api';
import { Timeline, FileAttachments, AIAssistant, LogViewer, ImagePreview } from '../components';

type TabKey = 'overview' | 'gantt' | 'budget' | 'expenses' | 'team' | 'equipment' | 'experiments' | 'documents' | 'benefits' | 'acceptance' | 'logs';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (id) {
      fetchProject(id);
      fetchExperiments(id);
    }
  }, [id]);

  const fetchProject = async (projectId: string) => {
    try {
      setLoading(true);
      const response = await projectApi.get(projectId);
      if (response.success && response.data) {
        setProject(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('获取项目详情失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchExperiments = async (projectId: string) => {
    try {
      const response = await experimentApi.list({
        project_id: projectId,
        page: 1,
        page_size: 50,
      });
      if (response.success && response.data) {
        setExperiments(response.data.experiments);
      }
    } catch (err) {
      console.error('获取实验列表失败:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: string; label: string }> = {
      draft: { variant: 'bg-gray-100 text-gray-700', label: '草稿' },
      pending_approval: { variant: 'bg-yellow-100 text-yellow-700', label: '待审批' },
      active: { variant: 'bg-green-100 text-green-700', label: '进行中' },
      paused: { variant: 'bg-yellow-100 text-yellow-700', label: '已暂停' },
      completed: { variant: 'bg-blue-100 text-blue-700', label: '已完成' },
      cancelled: { variant: 'bg-red-100 text-red-700', label: '已取消' },
      archived: { variant: 'bg-gray-100 text-gray-600', label: '已归档' },
    };
    const config = badges[status] || { variant: 'bg-gray-100 text-gray-700', label: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.variant}`}>
        {config.label}
      </span>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProjectTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      research: '科研项目',
      production: '生产项目',
      construction: '施工项目',
      design: '设计项目',
      service: '服务项目',
      RD: '研发项目',
    };
    return types[type] || type;
  };

  const getRiskLevelBadge = (level?: string) => {
    if (!level) return null;
    const badges: Record<string, { variant: string; label: string }> = {
      low: { variant: 'bg-green-100 text-green-700', label: '低风险' },
      medium: { variant: 'bg-yellow-100 text-yellow-700', label: '中风险' },
      high: { variant: 'bg-orange-100 text-orange-700', label: '高风险' },
      critical: { variant: 'bg-red-100 text-red-700', label: '严重风险' },
    };
    const config = badges[level.toLowerCase()] || { variant: 'bg-gray-100 text-gray-700', label: level };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.variant}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-red-500">{error || '项目不存在'}</div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: '概览', icon: '📊' },
    { key: 'gantt', label: '甘特图', icon: '📅' },
    { key: 'budget', label: '预算', icon: '💰' },
    { key: 'expenses', label: '费用', icon: '💳' },
    { key: 'team', label: '团队', icon: '👥' },
    { key: 'equipment', label: '设备', icon: '⚙️' },
    { key: 'experiments', label: '实验', icon: '🔬' },
    { key: 'documents', label: '文档', icon: '📄' },
    { key: 'benefits', label: '效益分析', icon: '📈' },
    { key: 'acceptance', label: '验收', icon: '✅' },
    { key: 'logs', label: '日志', icon: '📝' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/projects')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
                <p className="text-sm text-slate-500">项目编号: {project.code}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                编辑
              </button>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                提交审批
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="px-6 overflow-x-auto">
              <nav className="flex space-x-1 py-1 min-w-max">
                {tabs.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTab === key
                        ? 'text-primary-600'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="mr-1.5">{icon}</span>
                    {label}
                    {key === 'experiments' && experiments.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-slate-100 rounded-full">
                        {experiments.length}
                      </span>
                    )}
                    {activeTab === key && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-600 rounded-full" />
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{project.name}</h2>
                        <p className="text-sm text-slate-600 mt-1">{project.code}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(project.status)}
                        {getRiskLevelBadge(project.risk_level || undefined)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">项目类型</div>
                        <div className="text-sm font-medium text-slate-900">{getProjectTypeLabel(project.project_type)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">负责人</div>
                        <div className="text-sm font-medium text-slate-900">{project.leader}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">开始日期</div>
                        <div className="text-sm font-medium text-slate-900">
                          {project.start_date ? new Date(project.start_date).toLocaleDateString('zh-CN') : '未设置'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">预计结束</div>
                        <div className="text-sm font-medium text-slate-900">
                          {project.end_date ? new Date(project.end_date).toLocaleDateString('zh-CN') : '未设置'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">项目进度</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">整体进度</span>
                        <span className="text-sm font-medium text-slate-900">{project.progress}%</span>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(project.progress)} transition-all duration-500`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">项目信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start">
                        <span className="w-24 text-sm text-slate-500 flex-shrink-0">预算</span>
                        <span className="text-sm text-slate-900">
                          {project.budget ? `${project.budget.toLocaleString()} 元` : '未设置'}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-24 text-sm text-slate-500 flex-shrink-0">优先级</span>
                        <span className="text-sm text-slate-900">
                          {project.priority ? ['', '最高', '高', '中', '低', '最低'][project.priority] : '中'}
                        </span>
                      </div>
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex items-start md:col-span-2">
                          <span className="w-24 text-sm text-slate-500 flex-shrink-0">标签</span>
                          <div className="flex flex-wrap gap-2">
                            {project.tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 text-sm rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {project.description && (
                        <div className="flex items-start md:col-span-2">
                          <span className="w-24 text-sm text-slate-500 flex-shrink-0">项目描述</span>
                          <p className="text-sm text-slate-900">{project.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-primary-800 mb-2">AI 助手</h3>
                    <p className="text-sm text-primary-700 mb-4">
                      点击下方按钮，让AI帮您分析项目数据
                    </p>
                    <AIAssistant projectId={project.id} />
                  </div>

                  <div className="bg-slate-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">快速统计</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{experiments.length}</div>
                        <div className="text-xs text-slate-500">实验总数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">
                          {experiments.filter(e => e.status === 'completed').length}
                        </div>
                        <div className="text-xs text-slate-500">已完成</div>
                      </div>
                    </div>
                  </div>

                  {project.parent_id && (
                    <div className="border border-slate-200 rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-slate-800 mb-2">上级项目</h3>
                      <p className="text-sm text-slate-600">
                        本项目属于项目群的子项目
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'gantt' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">项目甘特图</h3>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
                      导出图片
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                      编辑阶段
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-6 min-h-[400px] flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <div className="text-4xl mb-4">📅</div>
                    <p>甘特图组件开发中...</p>
                    <p className="text-sm mt-2">即将支持阶段拖拽、依赖关系可视化等功能</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'budget' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">预算管理</h3>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    调整预算
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5">
                    <div className="text-xs text-blue-500 mb-1">总预算</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {project.budget ? `${project.budget.toLocaleString()}` : '0'} 元
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5">
                    <div className="text-xs text-green-500 mb-1">已使用</div>
                    <div className="text-2xl font-bold text-green-700">0 元</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5">
                    <div className="text-xs text-yellow-500 mb-1">剩余预算</div>
                    <div className="text-2xl font-bold text-yellow-700">
                      {project.budget ? `${project.budget.toLocaleString()}` : '0'} 元
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5">
                    <div className="text-xs text-purple-500 mb-1">使用比例</div>
                    <div className="text-2xl font-bold text-purple-700">0%</div>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">预算分配明细</h4>
                  <div className="text-center py-12 text-slate-400">暂无预算分配记录</div>
                </div>
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">费用管理</h3>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    新增费用
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">本月费用</div>
                    <div className="text-xl font-bold text-slate-900">0 元</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">待审批</div>
                    <div className="text-xl font-bold text-yellow-600">0 元</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-1">已报销</div>
                    <div className="text-xl font-bold text-green-600">0 元</div>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="text-center py-12 text-slate-400">暂无费用记录</div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">项目团队</h3>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    添加成员
                  </button>
                </div>
                {project.team_members && project.team_members.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {project.team_members.map((member, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {typeof member === 'string' ? member.charAt(0) : '?'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {typeof member === 'string' ? member : member.name || '未知'}
                            </div>
                            <div className="text-sm text-slate-500">成员</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">暂无团队成员</div>
                )}
              </div>
            )}

            {activeTab === 'equipment' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">设备管理</h3>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    关联设备
                  </button>
                </div>
                <div className="text-center py-12 text-slate-400">
                  <div className="text-4xl mb-4">⚙️</div>
                  <p>暂无关联设备</p>
                  <p className="text-sm mt-2">点击上方按钮关联项目设备</p>
                </div>
              </div>
            )}

            {activeTab === 'experiments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">实验列表</h3>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    创建实验
                  </button>
                </div>
                {experiments.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">暂无实验记录</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {experiments.map((exp) => (
                      <div key={exp.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-slate-900">{exp.name}</h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            exp.status === 'completed' ? 'bg-green-100 text-green-700' :
                            exp.status === 'running' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {exp.status === 'completed' ? '已完成' : exp.status === 'running' ? '进行中' : '待执行'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">{exp.description}</p>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>创建时间: {exp.created_at}</span>
                          <button className="text-primary-600 hover:text-primary-700">查看详情</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <FileAttachments resourceId={project.id} resourceType="project" />
            )}

            {activeTab === 'benefits' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">效益分析</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-5">
                    <div className="text-xs text-cyan-500 mb-1">CPI (成本绩效)</div>
                    <div className="text-2xl font-bold text-cyan-700">1.00</div>
                    <div className="text-xs text-cyan-600 mt-1">目标: 1.00</div>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-5">
                    <div className="text-xs text-teal-500 mb-1">SPI (进度绩效)</div>
                    <div className="text-2xl font-bold text-teal-700">1.00</div>
                    <div className="text-xs text-teal-600 mt-1">目标: 1.00</div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5">
                    <div className="text-xs text-emerald-500 mb-1">ROI (投资回报)</div>
                    <div className="text-2xl font-bold text-emerald-700">0%</div>
                    <div className="text-xs text-emerald-600 mt-1">目标: 0%</div>
                  </div>
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-5">
                    <div className="text-xs text-violet-500 mb-1">EAC (完工估算)</div>
                    <div className="text-2xl font-bold text-violet-700">
                      {project.budget ? `${project.budget.toLocaleString()}` : '0'} 元
                    </div>
                    <div className="text-xs text-violet-600 mt-1">预算: {project.budget?.toLocaleString()} 元</div>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">趋势分析</h4>
                  <div className="text-center py-8 text-slate-400">趋势图表开发中...</div>
                </div>
              </div>
            )}

            {activeTab === 'acceptance' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">项目验收</h3>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    提交验收申请
                  </button>
                </div>
                <div className="bg-slate-50 rounded-xl p-6">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">验收状态</h4>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-slate-600">立项通过</span>
                    </div>
                    <div className="w-8 h-px bg-slate-300"></div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-slate-600">预算审批</span>
                    </div>
                    <div className="w-8 h-px bg-slate-300"></div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-slate-600">项目实施</span>
                    </div>
                    <div className="w-8 h-px bg-slate-300"></div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                      <span className="text-sm text-slate-400">验收准备</span>
                    </div>
                    <div className="w-8 h-px bg-slate-300"></div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                      <span className="text-sm text-slate-400">最终验收</span>
                    </div>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">里程碑验收</h4>
                  <div className="text-center py-8 text-slate-400">暂无里程碑验收记录</div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <LogViewer resourceId={project.id} resourceType="project" />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectDetail;
