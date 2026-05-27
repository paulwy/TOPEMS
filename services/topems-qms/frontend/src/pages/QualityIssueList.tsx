import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';

const QualityIssueList: React.FC = () => {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/issues');
      if (response.data.success && response.data.data) {
        setIssues(response.data.data.issues || []);
      }
    } catch (err) {
      setError('获取质量问题列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { label: string; color: string }> = {
      critical: { label: '严重', color: 'bg-red-100 text-red-800' },
      high: { label: '高', color: 'bg-orange-100 text-orange-800' },
      medium: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
      low: { label: '低', color: 'bg-blue-100 text-blue-800' },
    };
    const config = severityMap[severity] || { label: severity, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      open: { label: '开放', color: 'bg-red-100 text-red-800' },
      in_progress: { label: '处理中', color: 'bg-yellow-100 text-yellow-800' },
      resolved: { label: '已解决', color: 'bg-green-100 text-green-800' },
      closed: { label: '已关闭', color: 'bg-gray-100 text-gray-800' },
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
          <h1 className="text-2xl font-semibold text-gray-900">质量问题</h1>
          <p className="mt-2 text-sm text-gray-700">跟踪和管理所有质量问题</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            报告问题
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
                      严重性
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      状态
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      来源
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="font-medium text-gray-900">{issue.title}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {getSeverityBadge(issue.severity)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {getStatusBadge(issue.status)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {issue.source || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {issues.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">暂无质量问题数据</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityIssueList;
