import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Save,
  RotateCcw,
  Brain,
  MessageSquare,
  BookOpen,
  Sliders,
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  responseLength: 'short' | 'medium' | 'long';
  enableKnowledgeBase: boolean;
  similarityThreshold: number;
  maxContextMessages: number;
}

const AI_SETTINGS_KEY = 'topems_ai_settings';

const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AIConfig>({
    model: 'qwen2.5:7b-instruct',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: '你是一个专业的企业知识库助手，擅长回答关于公司产品、服务和流程的问题。',
    responseLength: 'medium',
    enableKnowledgeBase: true,
    similarityThreshold: 0.7,
    maxContextMessages: 10,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = () => {
    try {
      const savedConfig = localStorage.getItem(AI_SETTINGS_KEY);
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (err) {
      console.error('加载AI设置失败:', err);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('保存AI设置失败:', err);
      setErrors({ save: '保存设置失败' });
    }
  };

  const resetToDefaults = () => {
    const defaultConfig: AIConfig = {
      model: 'qwen2.5:7b-instruct',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: '你是一个专业的企业知识库助手，擅长回答关于公司产品、服务和流程的问题。',
      responseLength: 'medium',
      enableKnowledgeBase: true,
      similarityThreshold: 0.7,
      maxContextMessages: 10,
    };
    setConfig(defaultConfig);
    setErrors({});
  };

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (config.temperature < 0 || config.temperature > 2) {
      newErrors.temperature = '温度值应在 0-2 之间';
    }

    if (config.maxTokens < 100 || config.maxTokens > 8000) {
      newErrors.maxTokens = '最大令牌数应在 100-8000 之间';
    }

    if (!config.systemPrompt.trim()) {
      newErrors.systemPrompt = '系统提示词不能为空';
    }

    if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
      newErrors.similarityThreshold = '相似度阈值应在 0-1 之间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateSettings()) {
      saveSettings();
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Header */}
        <div className='bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <Settings className='w-6 h-6' />
              <h2 className='text-2xl font-bold'>AI 设置</h2>
            </div>
            <button onClick={onClose} className='p-2 hover:bg-white/20 rounded-lg transition-colors'>
              <X className='w-6 h-6' />
            </button>
          </div>
          <p className='text-purple-100 text-sm mt-2'>配置 AI 助手的行为和参数</p>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          {/* Model Settings */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-gray-900 flex items-center'>
              <Brain className='w-5 h-5 mr-2 text-purple-600' />
              模型配置
            </h3>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>AI 模型</label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
                  className='w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                >
                  <option value='qwen2.5:7b-instruct'>Qwen 2.5 7B Instruct</option>
                  <option value='qwen2.5:14b-instruct'>Qwen 2.5 14B Instruct</option>
                  <option value='llama2:7b-chat'>Llama2 7B Chat</option>
                  <option value='llama2:13b-chat'>Llama2 13B Chat</option>
                  <option value='mistral:7b-instruct'>Mistral 7B Instruct</option>
                </select>
                <p className='text-xs text-gray-500 mt-1'>选择用于生成回答的AI模型</p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>响应长度</label>
                <select
                  value={config.responseLength}
                  onChange={(e) => setConfig((prev) => ({ ...prev, responseLength: e.target.value as any }))}
                  className='w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                >
                  <option value='short'>简短</option>
                  <option value='medium'>中等</option>
                  <option value='long'>详细</option>
                </select>
                <p className='text-xs text-gray-500 mt-1'>控制回答的详细程度</p>
              </div>
            </div>
          </div>

          {/* Generation Parameters */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-gray-900 flex items-center'>
              <Sliders className='w-5 h-5 mr-2 text-blue-600' />
              生成参数
            </h3>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Temperature (创造性) <span className='text-red-500'>*</span>
                </label>
                <div className='space-y-2'>
                  <input
                    type='range'
                    min='0'
                    max='2'
                    step='0.1'
                    value={config.temperature}
                    onChange={(e) => setConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className='w-full'
                  />
                  <div className='flex justify-between text-xs text-gray-500'>
                    <span>0 (精确)</span>
                    <span className='font-medium text-purple-600'>{config.temperature}</span>
                    <span>2 (创造性)</span>
                  </div>
                </div>
                {errors.temperature && (
                  <p className='text-red-500 text-xs mt-1 flex items-center'>
                    <AlertCircle className='w-3 h-3 mr-1' />
                    {errors.temperature}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Max Tokens (最大令牌数) <span className='text-red-500'>*</span>
                </label>
                <input
                  type='number'
                  min='100'
                  max='8000'
                  step='100'
                  value={config.maxTokens}
                  onChange={(e) => setConfig((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.maxTokens ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.maxTokens && (
                  <p className='text-red-500 text-xs mt-1 flex items-center'>
                    <AlertCircle className='w-3 h-3 mr-1' />
                    {errors.maxTokens}
                  </p>
                )}
                <p className='text-xs text-gray-500 mt-1'>控制单次回答的最大长度</p>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-gray-900 flex items-center'>
              <MessageSquare className='w-5 h-5 mr-2 text-green-600' />
              系统提示词 <span className='text-red-500'>*</span>
            </h3>

            <div>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, systemPrompt: e.target.value }));
                  setErrors((prev) => ({ ...prev, systemPrompt: '' }));
                }}
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.systemPrompt ? 'border-red-500' : 'border-gray-200'
                }`}
                placeholder='定义AI助手的角色和行为...'
              />
              {errors.systemPrompt && (
                <p className='text-red-500 text-xs mt-1 flex items-center'>
                  <AlertCircle className='w-3 h-3 mr-1' />
                  {errors.systemPrompt}
                </p>
              )}
              <p className='text-xs text-gray-500 mt-1'>定义AI助手的基本角色、知识范围和回答风格</p>
            </div>
          </div>

          {/* Knowledge Base Settings */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-gray-900 flex items-center'>
              <BookOpen className='w-5 h-5 mr-2 text-orange-600' />
              知识库配置
            </h3>

            <div className='space-y-4'>
              <div className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'>
                <div className='flex-1'>
                  <div className='font-medium text-gray-900'>启用知识库</div>
                  <div className='text-sm text-gray-500'>基于企业知识库生成回答</div>
                </div>
                <label className='relative inline-flex items-center cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={config.enableKnowledgeBase}
                    onChange={(e) => setConfig((prev) => ({ ...prev, enableKnowledgeBase: e.target.checked }))}
                    className='sr-only peer'
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {config.enableKnowledgeBase && (
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      相似度阈值 <span className='text-red-500'>*</span>
                    </label>
                    <div className='space-y-2'>
                      <input
                        type='range'
                        min='0'
                        max='1'
                        step='0.05'
                        value={config.similarityThreshold}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, similarityThreshold: parseFloat(e.target.value) }))
                        }
                        className='w-full'
                      />
                      <div className='flex justify-between text-xs text-gray-500'>
                        <span>0 (宽松)</span>
                        <span className='font-medium text-orange-600'>{config.similarityThreshold.toFixed(2)}</span>
                        <span>1 (严格)</span>
                      </div>
                    </div>
                    {errors.similarityThreshold && (
                      <p className='text-red-500 text-xs mt-1 flex items-center'>
                        <AlertCircle className='w-3 h-3 mr-1' />
                        {errors.similarityThreshold}
                      </p>
                    )}
                    <p className='text-xs text-gray-500 mt-1'>控制知识匹配的严格程度</p>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>最大上下文消息数</label>
                    <input
                      type='number'
                      min='1'
                      max='50'
                      value={config.maxContextMessages}
                      onChange={(e) => setConfig((prev) => ({ ...prev, maxContextMessages: parseInt(e.target.value) }))}
                      className='w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                    />
                    <p className='text-xs text-gray-500 mt-1'>用于理解对话历史的最多消息数</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='bg-gray-50 px-6 py-4 border-t border-gray-200'>
          {saved && (
            <div className='mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700 text-sm'>
              <CheckCircle className='w-4 h-4 mr-2' />
              设置已成功保存
            </div>
          )}
          {errors.save && (
            <div className='mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700 text-sm'>
              <AlertCircle className='w-4 h-4 mr-2' />
              {errors.save}
            </div>
          )}
          <div className='flex items-center justify-between'>
            <button
              onClick={resetToDefaults}
              className='flex items-center px-4 py-2 text-gray-600 hover:text-gray-700 transition-colors'
            >
              <RotateCcw className='w-4 h-4 mr-2' />
              恢复默认
            </button>
            <div className='flex space-x-3'>
              <button
                onClick={onClose}
                className='px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors'
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className='flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors'
              >
                <Save className='w-4 h-4 mr-2' />
                保存设置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettingsModal;
