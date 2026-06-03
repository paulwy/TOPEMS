import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi, experimentApi, Project, Experiment } from '../api';
import { Timeline, FileAttachments, AIAssistant, LogViewer, ImagePreview } from '../components';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'experiments' | 'timeline' | 'files' | 'logs'>('overview');

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
      active: { variant: 'bg-green-100 text-green-700', label: '进行中' },
      paused: { variant: 'bg-yellow-100 text-yellow-700', label: '已暂停' },
      completed: { variant: 'bg-blue-100 text-blue-700', label: '已完成' },
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
                开始实验
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6">
              {([
                { key: 'overview', label: '概览' },
                { key: 'experiments', label: '实验', count: experiments.length },
                { key: 'timeline', label: '时间线' },
                { key: 'files', label: '附件' },
                { key: 'logs', label: '日志' },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`relative px-1 py-4 text-sm font-medium transition-colors ${
                    activeTab === key
                      ? 'text-primary-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                  {count !== undefined && count > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-slate-100 rounded-full">
                      {count}
                    </span>
                  )}
                  {activeTab === key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">项目信息</h3>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <span className="w-24 text-sm text-slate-500 flex-shrink-0">项目类型</span>
                        <span className="text-sm text-slate-900">{project.project_type}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-24 text-sm text-slate-500 flex-shrink-0">状态</span>
                        {getStatusBadge(project.status)}
                      </div>
                      <div className="flex items-start">
                        <span className="w-24 text-sm text-slate-500 flex-shrink-0">项目负责人</span>
                        <span className="text-sm text-slate-900">{project.leader}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-24 text-sm text-slate-500 flex-shrink-0">团队成员</span>
                        <div className="flex flex-wrap gap-2">
                          {project.team_members.map((member, idx) => (
                            <span key={idx} className="px-2 py-1 bg-slate-100 text-sm rounded">
                              {member}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-start">
                        <span className="w-24 text-sm text-slate-500 flex-shrink-0">开始日期</span>
                        <span className="text-sm text-slate-900">{project.start_date}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-24 text-sm text-slate-500 flex-shrink-0">预计结束</span>
                        <span className="text-sm text-slate-900">{project.end_date || '未设置'}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-24 text-sm text-slate-500 flex-shrink-0">预算</span>
                        <span className="text-sm text-slate-900">
                          {project.budget ? `${project.budget.toLocaleString()} 元` : '未设置'}
                        </span>
                      </div>
                      {project.description && (
                        <div className="flex items-start">
                          <span className="w-24 text-sm text-slate-500 flex-shrink-0">项目描述</span>
                          <p className="text-sm text-slate-900">{project.description}</p>
                        </div>
                      )}
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
                        <div className="text-xs text-slate-500">已完成实验</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">
                          {experiments.filter(e => e.status === 'completed').length}
                        </div>
                        <div className="text-xs text-slate-500">完成率</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'experiments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">实验列表</h3>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
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

            {activeTab === 'timeline' && (
              <Timeline projectId={project.id} />
            )}

            {activeTab === 'files' && (
              <FileAttachments resourceId={project.id} resourceType="project" />
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
