import React, { useState, useEffect } from 'react';
import { formulaApi, Formula } from '../api/formula';
import { FileAttachments, AIAssistant } from '../components';

const FormulaList: React.FC = () => {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    fetchFormulas();
  }, [page, search]);

  const fetchFormulas = async () => {
    try {
      setLoading(true);
      const response = await formulaApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
      });
      if (response.success && response.data) {
        setFormulas(response.data.formulas);
        setTotal(response.data.total);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('获取配方列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-600',
    };
    return colors[status] || colors.draft;
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      draft: '草稿',
      pending_review: '待审核',
      approved: '已批准',
      rejected: '已拒绝',
      archived: '已归档',
    };
    return texts[status] || status;
  };

  const getIngredientCount = (ingredients: any[]) => {
    return ingredients?.length || 0;
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
        <h1 className="text-2xl font-bold text-gray-900">配方管理</h1>
        <p className="text-gray-500 mt-1">管理研发配方、版本和工艺参数</p>
      </div>

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="搜索配方名称或编号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          新建配方
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                配方名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                配方编号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                版本
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                成分数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建人
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {formulas.map((formula) => (
              <tr key={formula.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formula.name}
                  </div>
                  {formula.description && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {formula.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{formula.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">v{formula.version}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      formula.status
                    )}`}
                  >
                    {getStatusText(formula.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {getIngredientCount(formula.ingredients)} 种
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{formula.created_by}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button 
                    onClick={() => {
                      setSelectedFormula(formula);
                      setShowAttachments(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    附件
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedFormula(formula);
                      setShowAI(true);
                    }}
                    className="text-purple-600 hover:text-purple-900 mr-3"
                  >
                    AI助手
                  </button>
                  <button className="text-blue-600 hover:text-blue-900 mr-3">
                    查看
                  </button>
                  <button className="text-gray-600 hover:text-gray-900 mr-3">
                    编辑
                  </button>
                  <button className="text-gray-600 hover:text-gray-900">
                    版本
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {formulas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无配方数据
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize) || 1} 页
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

      {showAttachments && selectedFormula && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">配方附件管理</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedFormula.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAttachments(false);
                  setSelectedFormula(null);
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
                entityType="formula"
                entityId={selectedFormula.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}

      {showAI && selectedFormula && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI 智能助手</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedFormula.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAI(false);
                  setSelectedFormula(null);
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
                entityType="formula"
                entityId={selectedFormula.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaList;
