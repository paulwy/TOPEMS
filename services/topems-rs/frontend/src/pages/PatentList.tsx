import React, { useState, useEffect } from 'react';
import { patentApi, Patent } from '../api/patent';
import { FileAttachments, AIAssistant } from '../components';

const PatentList: React.FC = () => {
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedPatent, setSelectedPatent] = useState<Patent | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    fetchPatents();
  }, [page, search]);

  const fetchPatents = async () => {
    try {
      setLoading(true);
      const response = await patentApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
      });
      if (response.success && response.data) {
        setPatents(response.data.items);
        setTotal(response.data.total);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('获取专利列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      invalid: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || colors.pending;
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '申请中',
      accepted: '已受理',
      published: '已公开',
      rejected: '已驳回',
      invalid: '无效',
    };
    return texts[status] || status;
  };

  const getTypeText = (type: string) => {
    const texts: Record<string, string> = {
      invention: '发明专利',
      utility_model: '实用新型',
      design: '外观设计',
    };
    return texts[type] || type;
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
        <h1 className="text-2xl font-bold text-gray-900">专利成果管理</h1>
        <p className="text-gray-500 mt-1">管理专利申请、跟踪专利状态</p>
      </div>

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="搜索专利名称或申请号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          新增专利
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                专利名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                专利类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                申请号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                发明人
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                所属项目
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                申请日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {patents.map((patent) => (
              <tr key={patent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{patent.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{getTypeText(patent.patent_type)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{patent.application_no}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{patent.inventor}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      patent.status
                    )}`}
                  >
                    {getStatusText(patent.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{patent.project_name || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {patent.application_date ? new Date(patent.application_date).toLocaleDateString() : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button 
                    onClick={() => {
                      setSelectedPatent(patent);
                      setShowAttachments(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    附件
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedPatent(patent);
                      setShowAI(true);
                    }}
                    className="text-purple-600 hover:text-purple-900 mr-3"
                  >
                    AI助手
                  </button>
                  <button className="text-blue-600 hover:text-blue-900 mr-3">查看</button>
                  <button className="text-gray-600 hover:text-gray-900">编辑</button>
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

      {showAttachments && selectedPatent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">专利附件管理</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedPatent.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAttachments(false);
                  setSelectedPatent(null);
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
                entityType="patent"
                entityId={selectedPatent.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}

      {showAI && selectedPatent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI 智能助手</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedPatent.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAI(false);
                  setSelectedPatent(null);
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
                entityType="patent"
                entityId={selectedPatent.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatentList;
