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
import i18n from '@/i18n';
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
    systemPrompt: i18n.t('components.ai_settings_modal.k0'),
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
      logger.error(i18n.t('components.ai_settings_modal.ai_0'), err);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      logger.error(i18n.t('components.ai_settings_modal.ai_1'), err);
      setErrors({ save: i18n.t('components.ai_settings_modal.k1') });
    }
  };

  const resetToDefaults = () => {
    const defaultConfig: AIConfig = {
      model: 'qwen2.5:7b-instruct',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: i18n.t('components.ai_settings_modal.k2'),
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
      newErrors.temperature = i18n.t('components.ai_settings_modal.02_3');
    }

    if (config.maxTokens < 100 || config.maxTokens > 8000) {
      newErrors.maxTokens = i18n.t('components.ai_settings_modal.1008000_4');
    }

    if (!config.systemPrompt.trim()) {
      newErrors.systemPrompt = i18n.t('components.ai_settings_modal.k5');
    }

    if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
      newErrors.similarityThreshold = i18n.t('components.ai_settings_modal.01_6');
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
          borderRadius: 'lg',
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
            padding: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Settings sx={{ width: 24, height: 24 }} />
              <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{i18n.t('ai:ai_settings_modal.ai_8')}</h2>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: 2,
                borderRadius: 'md',
                border: 'none',
                background: 'action.disabledBackground',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              <X sx={{ width: 24, height: 24 }} />
            </button>
          </div>
          <p style={{ color: 'secondary.200', fontSize: '14px', marginTop: 2 }}>
            {i18n.t('components.ai_settings_modal.ai_2')}
          </p>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {/* Model Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
              {i18n.t('components.ai_settings_modal.k3')}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 4,
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
                    marginBottom: 2,
                  }}
                >
                  {i18n.t('components.ai_settings_modal.ai_4')}
                </label>
                <select
                  id='ai-model'
                  value={config.model}
                  onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: '1px solid grey.200',
                    borderRadius: 'md',
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
                    marginTop: 1,
                  }}
                >
                  {i18n.t('components.ai_settings_modal.ai_5')}
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
                    marginBottom: 2,
                  }}
                >
                  {i18n.t('components.ai_settings_modal.k6')}
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
                    borderRadius: 'md',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value='short'>{i18n.t('components.ai_settings_modal.k7')}</option>
                  <option value='medium'>{i18n.t('components.ai_settings_modal.k8')}</option>
                  <option value='long'>{i18n.t('components.ai_settings_modal.k9')}</option>
                </select>
                <p
                  style={{
                    fontSize: '12px',
                    color: theme.palette.text.secondary,
                    marginTop: 1,
                  }}
                >
                  {i18n.t('components.ai_settings_modal.k7')}
                </p>
              </div>
            </div>
          </div>

          {/* Generation Parameters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
              {i18n.t('components.ai_settings_modal.k8')}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 4,
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
                    marginBottom: 2,
                  }}
                >{i18n.t('ai:ai_settings_modal.temperature_7')}<span style={{ color: theme.palette.error.dark }}>*</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
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
                    <span>{i18n.t('ai:ai_settings_modal.k6')}</span>
                    <span style={{ fontWeight: 500, color: theme.palette.secondary.dark }}>
                      {config.temperature}
                    </span>
                    <span>{i18n.t('ai:ai_settings_modal.k5')}</span>
                  </div>
                </div>
                {errors.temperature && (
                  <p
                    style={{
                      color: theme.palette.error.dark,
                      fontSize: '12px',
                      marginTop: 1,
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
                    marginBottom: 2,
                  }}
                >{i18n.t('ai:ai_settings_modal.maxtokens_4')}<span style={{ color: theme.palette.error.dark }}>*</span>
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
                    borderRadius: 'md',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                {errors.maxTokens && (
                  <p
                    style={{
                      color: theme.palette.error.dark,
                      fontSize: '12px',
                      marginTop: 1,
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
                    marginTop: 1,
                  }}
                >
                  {i18n.t('components.ai_settings_modal.k9')}
                </p>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
              />{i18n.t('ai:ai_settings_modal.k3')}<span style={{ color: theme.palette.error.dark }}>*</span>
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
                  borderRadius: 'md',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                }}
                placeholder={i18n.t('components.ai_settings_modal.ai_10')}
              />
              {errors.systemPrompt && (
                <p
                  style={{
                    color: theme.palette.error.dark,
                    fontSize: '12px',
                    marginTop: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <AlertCircle sx={{ width: 12, height: 12, marginRight: 0.5 }} />
                  {errors.systemPrompt}
                </p>
              )}
              <p
                style={{ fontSize: '12px', color: theme.palette.text.secondary, marginTop: 1 }}
              >
                {i18n.t('components.ai_settings_modal.k11')}
              </p>
            </div>
          </div>

          {/* Knowledge Base Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
              {i18n.t('components.ai_settings_modal.k12')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 4,
                  backgroundColor: theme.palette.grey[50],
                  borderRadius: 'md',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: theme.palette.text.primary }}>
                    {i18n.t('components.ai_settings_modal.k13')}
                  </div>
                  <div style={{ fontSize: '14px', color: theme.palette.text.secondary }}>
                    {i18n.t('components.ai_settings_modal.k14')}
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
                    aria-label={i18n.t('components.ai_settings_modal.k10')}
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
                      borderRadius: 'full',
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
                        borderRadius: 'full',
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
                    gap: 4,
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
                        marginBottom: 2,
                      }}
                    >{i18n.t('ai:ai_settings_modal.k2')}<span style={{ color: theme.palette.error.dark }}>*</span>
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
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
                        <span>{i18n.t('ai:ai_settings_modal.k1')}</span>
                        <span style={{ fontWeight: 500, color: 'orange.600' }}>
                          {config.similarityThreshold.toFixed(2)}
                        </span>
                        <span>{i18n.t('ai:ai_settings_modal.k0')}</span>
                      </div>
                    </div>
                    {errors.similarityThreshold && (
                      <p
                        style={{
                          color: theme.palette.error.dark,
                          fontSize: '12px',
                          marginTop: 1,
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
                        marginTop: 1,
                      }}
                    >
                      {i18n.t('components.ai_settings_modal.k15')}
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
                        marginBottom: 2,
                      }}
                    >
                      {i18n.t('components.ai_settings_modal.k16')}
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
                        borderRadius: 'md',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    <p
                      style={{
                        fontSize: '12px',
                        color: theme.palette.text.secondary,
                        marginTop: 1,
                      }}
                    >
                      {i18n.t('components.ai_settings_modal.k17')}
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
                marginBottom: 3,
                padding: 3,
                backgroundColor: theme.palette.success.light,
                border: '1px solid #bbf7d0',
                borderRadius: 'md',
                display: 'flex',
                alignItems: 'center',
                color: 'success.700',
                fontSize: '14px',
              }}
            >
              <CheckCircle sx={{ width: 16, height: 16, marginRight: 1 }} />
              {i18n.t('components.ai_settings_modal.k18')}
            </div>
          )}
          {errors.save && (
            <div
              style={{
                marginBottom: 3,
                padding: 3,
                backgroundColor: theme.palette.error.light,
                border: '1px solid #fecaca',
                borderRadius: 'md',
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
              {i18n.t('components.ai_settings_modal.k19')}
            </button>
            <div style={{ display: 'flex', gap: 3 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 24px',
                  border: '1px solid grey.300',
                  color: theme.palette.grey[700],
                  borderRadius: 'md',
                  cursor: 'pointer',
                  background: 'common.white',
                  transition: 'background-color 0.2s',
                }}
              >
                {i18n.t('components.ai_settings_modal.k20')}
              </button>
              <button
                onClick={handleSave}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 24px',
                  backgroundColor: theme.palette.secondary.dark,
                  color: 'common.white',
                  borderRadius: 'md',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <Save sx={{ width: 16, height: 16, marginRight: 1 }} />
                {i18n.t('components.ai_settings_modal.k21')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettingsModal;
