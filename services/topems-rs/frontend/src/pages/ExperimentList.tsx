import React, { useState, useEffect } from 'react';
import { experimentApi, Experiment } from '../api/experiment';
import { FileAttachments, AIAssistant } from '../components';

const ExperimentList: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activePhase, setActivePhase] = useState<string>('all');
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    fetchExperiments();
  }, [page, search, activePhase]);

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      let response;
      if (activePhase === 'all') {
        response = await experimentApi.list({
          page,
          page_size: pageSize,
          search: search || undefined,
        });
      } else if (activePhase === 'lab') {
        response = await experimentApi.listLabExperiments({
          page,
          page_size: pageSize,
          search: search || undefined,
        });
      } else if (activePhase === 'pilot') {
        response = await experimentApi.listPilotExperiments({
          page,
          page_size: pageSize,
          search: search || undefined,
        });
      } else {
        response = await experimentApi.listScaleupExperiments({
          page,
          page_size: pageSize,
          search: search || undefined,
        });
      }
      if (response.success && response.data) {
        setExperiments(response.data.experiments);
        setTotal(response.data.total);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('获取试验列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancePhase = async (experimentId: string) => {
    try {
      const response = await experimentApi.advancePhase(experimentId);
      if (response.success) {
        fetchExperiments();
      } else {
        alert(response.message);
      }
    } catch (err) {
      alert('推进阶段失败');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.planned;
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      planned: '已计划',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return texts[status] || status;
  };

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      lab: 'bg-yellow-100 text-yellow-800',
      pilot: 'bg-purple-100 text-purple-800',
      scaleup: 'bg-orange-100 text-orange-800',
      production: 'bg-green-100 text-green-800',
    };
    return colors[phase] || colors.lab;
  };

  const getPhaseText = (phase: string) => {
    const texts: Record<string, string> = {
      lab: '小试',
      pilot: '中试',
      scaleup: '放大试验',
      production: '生产',
    };
    return texts[phase] || phase;
  };

  const getTypeText = (type: string) => {
    const texts: Record<string, string> = {
      performance: '性能测试',
      stability: '稳定性测试',
      safety: '安全性测试',
      quality: '质量检验',
    };
    return texts[type] || type;
  };

  const canAdvancePhase = (experiment: Experiment) => {
    return experiment.status === 'completed' && experiment.phase !== 'production';
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
        <h1 className="text-2xl font-bold text-gray-900">试验管理</h1>
        <p className="text-gray-500 mt-1">管理研发试验、记录和结果分析</p>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="flex gap-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'lab', label: '小试' },
            { key: 'pilot', label: '中试' },
            { key: 'scaleup', label: '放大试验' },
          ].map((phase) => (
            <button
              key={phase.key}
              onClick={() => {
                setActivePhase(phase.key);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg ${
                activePhase === phase.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {phase.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="搜索试验名称或编号..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          新建试验
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                试验名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                试验编号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                阶段
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                试验员
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                批次/规模
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {experiments.map((experiment) => (
              <tr key={experiment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {experiment.name}
                  </div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {experiment.objective}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{experiment.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPhaseColor(
                      experiment.phase
                    )}`}
                  >
                    {getPhaseText(experiment.phase)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {getTypeText(experiment.experiment_type)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      experiment.status
                    )}`}
                  >
                    {getStatusText(experiment.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{experiment.experimenter}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {experiment.batch_number || '-'}
                    {experiment.scale && (
                      <span className="ml-2">
                        ({experiment.scale} {experiment.scale_unit || 'kg'})
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button 
                    onClick={() => {
                      setSelectedExperiment(experiment);
                      setShowAttachments(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    附件
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedExperiment(experiment);
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
                  <button className="text-gray-600 hover:text-gray-900 mr-3">
                    记录
                  </button>
                  {canAdvancePhase(experiment) && (
                    <button
                      onClick={() => handleAdvancePhase(experiment.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      推进阶段
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {experiments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无试验数据
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

      {showAttachments && selectedExperiment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">试验附件管理</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedExperiment.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAttachments(false);
                  setSelectedExperiment(null);
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
                entityType="experiment"
                entityId={selectedExperiment.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}

      {showAI && selectedExperiment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI 智能助手</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedExperiment.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAI(false);
                  setSelectedExperiment(null);
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
                entityType="experiment"
                entityId={selectedExperiment.id}
                currentUser="current_user"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperimentList;
