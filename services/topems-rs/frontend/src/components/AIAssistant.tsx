import { useState } from 'react';
import { getEntityAnalyses, createAnalysis } from '../api/aiIntegration';

interface AiAnalysis {
  id: string;
  entity_type: string;
  entity_id: string;
  analysis_type: string;
  prompt: string;
  response: string;
  ai_service_url?: string;
  created_by: string;
  created_at: string;
}

interface AIAssistantProps {
  entityType: string;
  entityId: string;
  currentUser: string;
}

const AI_PROMPTS = [
  {
    type: 'data_analysis',
    label: '📊 数据分析',
    prompt: '请分析这个实验/项目的数据，给出关键洞察和改进建议。',
  },
  {
    type: 'formula_optimization',
    label: '⚗️ 配方优化',
    prompt: '基于当前配方，分析可能的优化方向，提出改进建议。',
  },
  {
    type: 'experiment_design',
    label: '🔬 实验设计',
    prompt: '基于当前实验内容，设计后续实验方案，包括变量控制和预期结果。',
  },
  {
    type: 'patent_search',
    label: '📚 专利检索',
    prompt: '检索相关专利，分析创新点，给出专利申请建议。',
  },
  {
    type: 'custom',
    label: '💬 自定义问题',
    prompt: '',
  },
];

export default function AIAssistant({ entityType, entityId, currentUser }: AIAssistantProps) {
  const [analyses, setAnalyses] = useState<AiAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('data_analysis');
  const [customPrompt, setCustomPrompt] = useState('');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleAnalysis = async () => {
    const promptTemplate = AI_PROMPTS.find((p) => p.type === selectedPrompt);
    const prompt = selectedPrompt === 'custom' ? customPrompt : promptTemplate?.prompt || '';

    if (!prompt.trim()) {
      setError('请输入问题内容');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await createAnalysis({
        entity_type: entityType,
        entity_id: entityId,
        analysis_type: selectedPrompt,
        prompt: prompt,
        created_by: currentUser,
      });

      if (response.success && response.data) {
        setAnalysisResult(response.data.response);
        loadHistory();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('AI分析失败，请稍后重试');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await getEntityAnalyses(entityType, entityId);
      if (response.success) {
        setAnalyses(response.data || []);
      }
    } catch (err) {
      console.error('加载历史记录失败', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🤖 AI 智能助手</h3>
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) loadHistory();
          }}
          className="text-blue-500 hover:text-blue-600 text-sm"
        >
          {showHistory ? '收起历史' : '查看历史'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {showHistory ? (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700">📜 分析历史</h4>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无历史记录</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {analyses.map((analysis) => (
                <div key={analysis.id} className="p-4 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                      {AI_PROMPTS.find((p) => p.type === analysis.analysis_type)?.label || analysis.analysis_type}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(analysis.created_at)}</span>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-gray-600 mb-1">问题：</p>
                    <p className="text-sm text-gray-800">{analysis.prompt}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">AI 回复：</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{analysis.response}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">选择分析类型</label>
            <div className="grid grid-cols-2 gap-2">
              {AI_PROMPTS.map((prompt) => (
                <button
                  key={prompt.type}
                  onClick={() => setSelectedPrompt(prompt.type)}
                  className={`p-3 rounded-md text-sm transition-colors ${
                    selectedPrompt === prompt.type
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>

          {selectedPrompt === 'custom' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">输入您的问题</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="请详细描述您的问题..."
              />
            </div>
          )}

          <button
            onClick={handleAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-md hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                AI 正在分析中...
              </span>
            ) : (
              '🚀 开始 AI 分析'
            )}
          </button>

          {analysisResult && (
            <div className="mt-6">
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  AI 分析结果
                </h4>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-md">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                    {analysisResult}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
