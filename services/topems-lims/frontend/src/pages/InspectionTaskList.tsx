import React, { useEffect, useState } from 'react';
import { inspectionTaskApi, InspectionTask } from '../api/inspectionTask';
import { FileAttachments, AIAnalysis } from '../components';

const InspectionTaskList: React.FC = () => {
  const [tasks, setTasks] = useState<InspectionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await inspectionTaskApi.list();
      if (response.success && response.data) {
        setTasks(response.data.tasks || response.data || []);
      }
    } catch (err) {
      setError('获取检验任务列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: '待开始', color: 'bg-gray-100 text-gray-800' },
      in_progress: { label: '进行中', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
      cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
    };
    const config = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">检验任务管理</h1>
          <p className="mt-2 text-sm text-gray-700">管理实验室检验任务和进度</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            创建任务
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      样品 ID
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      当前步骤
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      状态
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      检验员
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      开始时间
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="font-medium text-gray-900">{task.sample_id.substring(0, 8)}...</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        第 {task.current_step} 步
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {task.inspector}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {task.started_at ? new Date(task.started_at).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button 
                          onClick={() => {
                            setSelectedTask(task);
                            setShowAttachments(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          附件
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedTask(task);
                            setShowAI(true);
                          }}
                          className="text-purple-600 hover:text-purple-900 mr-2"
                        >
                          AI分析
                        </button>
                        <button className="text-blue-600 hover:text-blue-900 mr-2">查看</button>
                        <button className="text-green-600 hover:text-green-900">完成步骤</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {tasks.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">暂无检验任务数据</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAttachments && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">检验任务附件管理</h2>
                <p className="text-sm text-gray-500 mt-1">任务ID: {selectedTask.id.substring(0, 8)}...</p>
              </div>
              <button
                onClick={() => {
                  setShowAttachments(false);
                  setSelectedTask(null);
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
                entityType="inspection_task"
                entityId={selectedTask.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}

      {showAI && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI 智能分析</h2>
                <p className="text-sm text-gray-500 mt-1">任务ID: {selectedTask.id.substring(0, 8)}...</p>
              </div>
              <button
                onClick={() => {
                  setShowAI(false);
                  setSelectedTask(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <AIAnalysis
                entityType="inspection_task"
                entityId={selectedTask.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionTaskList;
