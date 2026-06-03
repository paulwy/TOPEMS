import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface CorrectiveAction {
  id: string;
  issue_id: string;
  title: string;
  description: string;
  action_type: string;
  assignee: string;
  status: string;
  target_date: string;
  created_at: string;
}

const CorrectiveActionList: React.FC = () => {
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/corrective-actions');
      if (response.data.success && response.data.data) {
        setActions(response.data.data.actions || []);
      }
    } catch (err) {
      setError('获取纠正措施列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: '待执行', color: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: '执行中', color: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
      verified: { label: '已验证', color: 'bg-purple-100 text-purple-800' },
    };
    const config = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getActionTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      corrective: { label: '纠正', color: 'bg-orange-100 text-orange-800' },
      preventive: { label: '预防', color: 'bg-blue-100 text-blue-800' },
      improvement: { label: '改进', color: 'bg-green-100 text-green-800' },
    };
    const config = typeMap[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
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
          <h1 className="text-2xl font-semibold text-gray-900">纠正措施</h1>
          <p className="mt-2 text-sm text-gray-700">管理和跟踪纠正与预防措施</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            创建措施
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
                      标题
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      类型
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      负责人
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      状态
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      目标日期
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {actions.map((action) => (
                    <tr key={action.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="font-medium text-gray-900">{action.title}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {getActionTypeBadge(action.action_type)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {action.assignee || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {getStatusBadge(action.status)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {action.target_date ? new Date(action.target_date).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {actions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">暂无纠正措施数据</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrectiveActionList;
