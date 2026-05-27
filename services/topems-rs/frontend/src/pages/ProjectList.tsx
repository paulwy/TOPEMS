import React, { useState, useEffect } from 'react';
import { projectApi, Project } from '../api/project';
import { FileAttachments, AIAssistant } from '../components';

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const pageSize = 10;

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      archived: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || colors.draft;
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      draft: '草稿',
      active: '进行中',
      paused: '已暂停',
      completed: '已完成',
      archived: '已归档',
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
        <p className="text-gray-500 mt-1">管理科研项目、跟踪进度和团队协作</p>
      </div>

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="搜索项目名称或编号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          新建项目
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                项目名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                项目编号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                项目类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                负责人
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                进度
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {project.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{project.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {project.project_type}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {getStatusText(project.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{project.leader}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {project.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button 
                    onClick={() => {
                      setSelectedProject(project);
                      setShowAttachments(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    附件
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedProject(project);
                      setShowAI(true);
                    }}
                    className="text-purple-600 hover:text-purple-900 mr-3"
                  >
                    AI助手
                  </button>
                  <button className="text-blue-600 hover:text-blue-900 mr-3">
                    查看
                  </button>
                  <button className="text-gray-600 hover:text-gray-900">
                    编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            上一页
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      {showAttachments && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">项目附件管理</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedProject.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAttachments(false);
                  setSelectedProject(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI 智能助手</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedProject.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAI(false);
                  setSelectedProject(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
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
