import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectApi, Project } from '../api/project';
import { FileAttachments, AIAssistant, AdvancedSearch, BatchActions } from '../components';
import { FilterOption } from '../components/AdvancedSearch';

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string | boolean>>({});
  const pageSize = 10;

  const projectFilters: FilterOption[] = [
    {
      id: 'status',
      label: '项目状态',
      type: 'select',
      options: [
        { value: 'draft', label: '草稿' },
        { value: 'active', label: '进行中' },
        { value: 'paused', label: '已暂停' },
        { value: 'completed', label: '已完成' },
        { value: 'archived', label: '已归档' },
      ],
    },
    {
      id: 'project_type',
      label: '项目类型',
      type: 'select',
      options: [
        { value: 'research', label: '研发项目' },
        { value: 'product', label: '产品项目' },
        { value: 'process', label: '工艺项目' },
      ],
    },
    {
      id: 'leader',
      label: '负责人',
      type: 'text',
      placeholder: '输入负责人姓名',
    },
    {
      id: 'start_date_from',
      label: '开始日期（起）',
      type: 'date',
    },
    {
      id: 'start_date_to',
      label: '开始日期（止）',
      type: 'date',
    },
  ];

  useEffect(() => {
    fetchProjects();
  }, [page, search]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
      });
      if (response.success && response.data) {
        setProjects(response.data.projects);
        setTotal(response.data.total);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedSearch = (filters: Record<string, string | boolean>) => {
    setAdvancedFilters(filters);
    setSearch(filters['q'] as string || '');
    setPage(1);
  };

  const handleResetSearch = () => {
    setAdvancedFilters({});
    setSearch('');
    setPage(1);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === projects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.map((p) => p.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个项目吗？`)) return;
    
    try {
      for (const id of selectedIds) {
        await projectApi.delete(id);
      }
      setSelectedIds([]);
      fetchProjects();
    } catch (err) {
      console.error('批量删除失败:', err);
    }
  };

  const handleBatchExport = () => {
    const selectedProjects = projects.filter((p) => selectedIds.includes(p.id));
    const csv = [
      '项目名称,项目编号,项目类型,状态,负责人,进度,开始日期',
      ...selectedProjects.map((p) =>
        `${p.name},${p.code},${p.project_type},${p.status},${p.leader},${p.progress}%,${p.start_date}`
      ),
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projects_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">项目管理</h1>
              <p className="text-xs text-slate-500">管理科研项目、跟踪进度和团队协作</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <AdvancedSearch
          filters={projectFilters}
          onSearch={handleAdvancedSearch}
          onReset={handleResetSearch}
          initialValues={advancedFilters}
        />

        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-blue-700">
              已选择 <strong>{selectedIds.length}</strong> 个项目
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBatchExport}
                className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-colors"
              >
                导出选中
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                批量删除
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-800 transition-colors"
              >
                取消选择
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === projects.length && projects.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    项目名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    项目编号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    项目类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    负责人
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    进度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((project) => (
                  <tr key={project.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(project.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(project.id)}
                        onChange={() => handleSelectOne(project.id)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{project.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{project.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{project.project_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(project.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{project.leader}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setSelectedProject(project);
                            setShowAttachments(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="附件"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProject(project);
                            setShowAI(true);
                          }}
                          className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                          title="AI助手"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </button>
                        <button onClick={() => navigate(`/projects/${project.id}`)} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="查看详情">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="编辑">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {projects.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-500">暂无项目数据</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
            <div className="text-sm text-slate-500">
              共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize) || 1} 页
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </main>

      {showAttachments && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">项目附件管理</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedProject.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAttachments(false);
                  setSelectedProject(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <FileAttachments
                entityType="project"
                entityId={selectedProject.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}

      {showAI && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">AI 智能助手</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedProject.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAI(false);
                  setSelectedProject(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <AIAssistant
                entityType="project"
                entityId={selectedProject.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;