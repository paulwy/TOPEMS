import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import {
  Settings,
  X,
  Save,
  RotateCcw,
  Brain,
  MessageSquare,
  BookOpen,
  Sliders,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { logger } from '@/utils/logger';

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
  const theme = useTheme();
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
    } catch (err: unknown) {
      logger.error('加载AI设置失败:', err);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      logger.error('保存AI设置失败:', err);
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'action.active',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: 'common.white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1024px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(to right, secondary.dark, primary.dark)',
            color: 'common.white',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Settings sx={{ width: 24, height: 24 }} />
              <h2 style={{ fontSize: '24px', fontWeight: 700 }}>AI 设置</h2>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: 'action.disabledBackground',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              <X sx={{ width: 24, height: 24 }} />
            </button>
          </div>
          <p style={{ color: 'secondary.200', fontSize: '14px', marginTop: '8px' }}>
            配置 AI 助手的行为和参数
          </p>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Model Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: theme.palette.text.primary,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Brain
                sx={{
                  width: 20,
                  height: 20,
                  marginRight: 1,
                  color: 'secondary.dark',
                }}
              />
              模型配置
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
              }}
            >
              <div>
                <label
                  htmlFor='ai-model'
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: theme.palette.grey[700],
                    marginBottom: '8px',
                  }}
                >
                  AI 模型
                </label>
                <select
                  id='ai-model'
                  value={config.model}
                  onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: '1px solid grey.200',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value='qwen2.5:7b-instruct'>Qwen 2.5 7B Instruct</option>
                  <option value='qwen2.5:14b-instruct'>Qwen 2.5 14B Instruct</option>
                  <option value='llama2:7b-chat'>Llama2 7B Chat</option>
                  <option value='llama2:13b-chat'>Llama2 13B Chat</option>
                  <option value='mistral:7b-instruct'>Mistral 7B Instruct</option>
                </select>
                <p
                  style={{
                    fontSize: '12px',
                    color: theme.palette.text.secondary,
                    marginTop: '4px',
                  }}
                >
                  选择用于生成回答的AI模型
                </p>
              </div>

              <div>
                <label
                  htmlFor='ai-response-length'
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: theme.palette.grey[700],
                    marginBottom: '8px',
                  }}
                >
                  响应长度
                </label>
                <select
                  id='ai-response-length'
                  value={config.responseLength}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      responseLength: e.target.value as 'short' | 'medium' | 'long',
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: '1px solid grey.200',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value='short'>简短</option>
                  <option value='medium'>中等</option>
                  <option value='long'>详细</option>
                </select>
                <p
                  style={{
                    fontSize: '12px',
                    color: theme.palette.text.secondary,
                    marginTop: '4px',
                  }}
                >
                  控制回答的详细程度
                </p>
              </div>
            </div>
          </div>

          {/* Generation Parameters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: theme.palette.text.primary,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Sliders
                sx={{
                  width: 20,
                  height: 20,
                  marginRight: 1,
                  color: 'primary.dark',
                }}
              />
              生成参数
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
              }}
            >
              <div>
                <label
                  htmlFor='ai-temperature'
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: theme.palette.grey[700],
                    marginBottom: '8px',
                  }}
                >
                  Temperature (创造性) <span style={{ color: theme.palette.error.dark }}>*</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <input
                    id='ai-temperature'
                    type='range'
                    min='0'
                    max='2'
                    step='0.1'
                    value={config.temperature}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        temperature: parseFloat(e.target.value),
                      }))
                    }
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: theme.palette.text.secondary,
                    }}
                  >
                    <span>0 (精确)</span>
                    <span style={{ fontWeight: 500, color: theme.palette.secondary.dark }}>
                      {config.temperature}
                    </span>
                    <span>2 (创造性)</span>
                  </div>
                </div>
                {errors.temperature && (
                  <p
                    style={{
                      color: theme.palette.error.dark,
                      fontSize: '12px',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <AlertCircle sx={{ width: 12, height: 12, marginRight: 0.5 }} />
                    {errors.temperature}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor='ai-max-tokens'
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: theme.palette.grey[700],
                    marginBottom: '8px',
                  }}
                >
                  Max Tokens (最大令牌数) <span style={{ color: theme.palette.error.dark }}>*</span>
                </label>
                <input
                  id='ai-max-tokens'
                  type='number'
                  min='100'
                  max='8000'
                  step='100'
                  value={config.maxTokens}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maxTokens: parseInt(e.target.value),
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: errors.maxTokens ? '1px solid error.dark' : '1px solid grey.200',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                {errors.maxTokens && (
                  <p
                    style={{
                      color: theme.palette.error.dark,
                      fontSize: '12px',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <AlertCircle sx={{ width: 12, height: 12, marginRight: 0.5 }} />
                    {errors.maxTokens}
                  </p>
                )}
                <p
                  style={{
                    fontSize: '12px',
                    color: theme.palette.text.secondary,
                    marginTop: '4px',
                  }}
                >
                  控制单次回答的最大长度
                </p>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: theme.palette.text.primary,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <MessageSquare
                sx={{
                  width: 20,
                  height: 20,
                  marginRight: 1,
                  color: 'success.dark',
                }}
              />
              系统提示词 <span style={{ color: theme.palette.error.dark }}>*</span>
            </h3>

            <div>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => {
                  setConfig((prev) => ({
                    ...prev,
                    systemPrompt: e.target.value,
                  }));
                  setErrors((prev) => ({ ...prev, systemPrompt: '' }));
                }}
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: errors.systemPrompt ? '1px solid error.dark' : '1px solid grey.200',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                }}
                placeholder='定义AI助手的角色和行为...'
              />
              {errors.systemPrompt && (
                <p
                  style={{
                    color: theme.palette.error.dark,
                    fontSize: '12px',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <AlertCircle sx={{ width: 12, height: 12, marginRight: 0.5 }} />
                  {errors.systemPrompt}
                </p>
              )}
              <p
                style={{ fontSize: '12px', color: theme.palette.text.secondary, marginTop: '4px' }}
              >
                定义AI助手的基本角色、知识范围和回答风格
              </p>
            </div>
          </div>

          {/* Knowledge Base Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: theme.palette.text.primary,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <BookOpen
                sx={{
                  width: 20,
                  height: 20,
                  marginRight: 1,
                  color: 'warning.600',
                }}
              />
              知识库配置
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: theme.palette.grey[50],
                  borderRadius: '8px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: theme.palette.text.primary }}>
                    启用知识库
                  </div>
                  <div style={{ fontSize: '14px', color: theme.palette.text.secondary }}>
                    基于企业知识库生成回答
                  </div>
                </div>
                <label
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type='checkbox'
                    aria-label='启用知识库'
                    checked={config.enableKnowledgeBase}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        enableKnowledgeBase: e.target.checked,
                      }))
                    }
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      width: '44px',
                      height: '24px',
                      backgroundColor: theme.palette.grey[200],
                      borderRadius: '9999px',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div
                      style={{
                        content: "''",
                        position: 'absolute',
                        top: '2px',
                        left: config.enableKnowledgeBase ? '22px' : '2px',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'common.white',
                        borderRadius: '9999px',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>
                </label>
              </div>

              {config.enableKnowledgeBase && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                  }}
                >
                  <div>
                    <label
                      htmlFor='ai-similarity-threshold'
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: theme.palette.grey[700],
                        marginBottom: '8px',
                      }}
                    >
                      相似度阈值 <span style={{ color: theme.palette.error.dark }}>*</span>
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <input
                        id='ai-similarity-threshold'
                        type='range'
                        min='0'
                        max='1'
                        step='0.05'
                        value={config.similarityThreshold}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            similarityThreshold: parseFloat(e.target.value),
                          }))
                        }
                        style={{ width: '100%' }}
                      />
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          color: theme.palette.text.secondary,
                        }}
                      >
                        <span>0 (宽松)</span>
                        <span style={{ fontWeight: 500, color: 'orange.600' }}>
                          {config.similarityThreshold.toFixed(2)}
                        </span>
                        <span>1 (严格)</span>
                      </div>
                    </div>
                    {errors.similarityThreshold && (
                      <p
                        style={{
                          color: theme.palette.error.dark,
                          fontSize: '12px',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <AlertCircle sx={{ width: 12, height: 12, marginRight: 0.5 }} />
                        {errors.similarityThreshold}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: '12px',
                        color: theme.palette.text.secondary,
                        marginTop: '4px',
                      }}
                    >
                      控制知识匹配的严格程度
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor='ai-max-context'
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: theme.palette.grey[700],
                        marginBottom: '8px',
                      }}
                    >
                      最大上下文消息数
                    </label>
                    <input
                      id='ai-max-context'
                      type='number'
                      min='1'
                      max='50'
                      value={config.maxContextMessages}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          maxContextMessages: parseInt(e.target.value),
                        }))
                      }
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        border: '1px solid grey.200',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    <p
                      style={{
                        fontSize: '12px',
                        color: theme.palette.text.secondary,
                        marginTop: '4px',
                      }}
                    >
                      用于理解对话历史的最多消息数
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: theme.palette.grey[50],
            padding: '16px 24px',
            borderTop: '1px solid grey.200',
          }}
        >
          {saved && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: theme.palette.success.light,
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                color: 'success.700',
                fontSize: '14px',
              }}
            >
              <CheckCircle sx={{ width: 16, height: 16, marginRight: 1 }} />
              设置已成功保存
            </div>
          )}
          {errors.save && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: theme.palette.error.light,
                border: '1px solid #fecaca',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                color: 'error.darker',
                fontSize: '14px',
              }}
            >
              <AlertCircle sx={{ width: 16, height: 16, marginRight: 1 }} />
              {errors.save}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              onClick={resetToDefaults}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                color: theme.palette.text.secondary,
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                transition: 'color 0.2s',
              }}
            >
              <RotateCcw sx={{ width: 16, height: 16, marginRight: 1 }} />
              恢复默认
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 24px',
                  border: '1px solid grey.300',
                  color: theme.palette.grey[700],
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: 'common.white',
                  transition: 'background-color 0.2s',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 24px',
                  backgroundColor: theme.palette.secondary.dark,
                  color: 'common.white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <Save sx={{ width: 16, height: 16, marginRight: 1 }} />
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
