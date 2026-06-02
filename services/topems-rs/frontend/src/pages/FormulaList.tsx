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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: string; label: string }> = {
      draft: { variant: 'bg-gray-100 text-gray-700', label: '草稿' },
      pending_review: { variant: 'bg-yellow-100 text-yellow-700', label: '待审核' },
      approved: { variant: 'bg-green-100 text-green-700', label: '已批准' },
      rejected: { variant: 'bg-red-100 text-red-700', label: '已拒绝' },
      archived: { variant: 'bg-gray-100 text-gray-600', label: '已归档' },
    };
    const config = badges[status] || { variant: 'bg-gray-100 text-gray-700', label: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.variant}`}>
        {config.label}
      </span>
    );
  };

  const getIngredientCount = (ingredients: any[]) => {
    return ingredients?.length || 0;
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
              <h1 className="text-xl font-bold text-slate-900">配方管理</h1>
              <p className="text-xs text-slate-500">管理研发配方、版本和工艺参数</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="搜索配方名称或编号..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
                新建配方
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    配方名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    配方编号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    版本
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    成分数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    创建人
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formulas.map((formula) => (
                  <tr key={formula.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{formula.name}</div>
                      {formula.description && (
                        <div className="text-sm text-slate-500 truncate max-w-xs">{formula.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{formula.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">v{formula.version}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(formula.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{getIngredientCount(formula.ingredients)} 种</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{formula.created_by}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setSelectedFormula(formula);
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
                            setSelectedFormula(formula);
                            setShowAI(true);
                          }}
                          className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                          title="AI助手"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </button>
                        <button className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="查看">
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
                        <button className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="版本">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {formulas.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-500">暂无配方数据</p>
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

      {showAttachments && selectedFormula && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">配方附件管理</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedFormula.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAttachments(false);
                  setSelectedFormula(null);
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
                entityType="formula"
                entityId={selectedFormula.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}

      {showAI && selectedFormula && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">AI 智能助手</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedFormula.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAI(false);
                  setSelectedFormula(null);
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