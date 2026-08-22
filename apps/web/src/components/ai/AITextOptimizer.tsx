import { designTokens } from '@topems/tokens';
import {
  TextField,
  InputLabel,
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, Wand2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

import { AIGenerateModal } from './AIGenerateModal';
import { useAIHelper } from '../../hooks/useAIHelper';
import type { TextOptimizeContext } from '@/types/ai';
import { logger } from '@/utils/logger';

interface AITextOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
  context: TextOptimizeContext;
  originalText: string;
  onOptimized: (_text: string) => void;
}

function getSystemPromptTemplates(): Record<string, string> {
  return {
    description: i18n.t('components.ai_text_optimizer.k0'),
    duty: i18n.t('components.ai_text_optimizer.k1'),
    profile: i18n.t('components.ai_text_optimizer.k2'),
    clause: i18n.t('components.ai_text_optimizer.k3'),
  };
}

function getTextTypeLabels(): Record<string, string> {
  return {
    description: i18n.t('components.ai_text_optimizer.k4'),
    duty: i18n.t('components.ai_text_optimizer.k5'),
    profile: i18n.t('components.ai_text_optimizer.k6'),
    clause: i18n.t('components.ai_text_optimizer.k7'),
  };
}

function getOptimizationStyles() {
  return [
    {
      value: 'professional',
      label: i18n.t('components.ai_text_optimizer.k8'),
      description: i18n.t('components.ai_text_optimizer.k9'),
    },
    {
      value: 'concise',
      label: i18n.t('components.ai_text_optimizer.k11'),
      description: i18n.t('components.ai_text_optimizer.k10'),
    },
    {
      value: 'detailed',
      label: i18n.t('components.ai_text_optimizer.k13'),
      description: i18n.t('components.ai_text_optimizer.k12'),
    },
    {
      value: 'friendly',
      label: i18n.t('components.ai_text_optimizer.k15'),
      description: i18n.t('components.ai_text_optimizer.k14'),
    },
  ];
}

export function AITextOptimizer({
  isOpen,
  onClose,
  context,
  originalText,
  onOptimized,
}: AITextOptimizerProps) {
  const [optimizedText, setOptimizedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [optimizationStyle, setOptimizationStyle] = useState('professional');
  const [showKeywords, setShowKeywords] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const { isLoading, error, generate, retry, retryCount } = useAIHelper<{ content: string }>({
    featureType: 'text',
    onSuccess: (result) => {
      const data = result as { content: string };
      if (data?.content) {
        setOptimizedText(data.content);
        setHistory((prev) => [...prev, data.content]);
        setHistoryIndex((prev) => prev + 1);
      }
    },
    maxRetries: 2,
  });

  useEffect(() => {
    if (isOpen) {
      setOptimizedText('');
      setCopied(false);
      setKeywords([]);
      setKeywordInput('');
      setHistory([]);
      setHistoryIndex(-1);
      setShowKeywords(true);
      // 从 context.keywords 初始化
      if (context.keywords?.length) {
        setKeywords(context.keywords);
      }
    }
  }, [isOpen, context.keywords]);

  const buildPrompt = () => {
    const { textType, name } = context;
    let prompt = getSystemPromptTemplates()[textType] || getSystemPromptTemplates().description;

    const styleConfig = getOptimizationStyles().find((s) => s.value === optimizationStyle);
    if (styleConfig) {
      prompt += `${i18n.t('components.ai_text_optimizer.nn_0')}${styleConfig.label} - ${styleConfig.description}`;
    }

    prompt += '\n\n';

    if (name) {
      prompt += `${i18n.t('components.ai_text_optimizer.k1')} ${name}\n`;
    }
    if (keywords.length > 0) {
      prompt += `${i18n.t('components.ai_text_optimizer.k2')} ${keywords.join(', ')}\n`;
    }
    if (originalText) {
      prompt += `${i18n.t('components.ai_text_optimizer.k3')} ${originalText}\n`;
    }

    prompt += i18n.t('components.ai_text_optimizer.n_4');
    return prompt;
  };

  const handleGenerate = async () => {
    const prompt = buildPrompt();
    await generate(prompt);
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords((prev) => [...prev, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(optimizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e: unknown) {
      logger.error('Copy failed', e);
    }
  };

  const handleConfirm = () => {
    if (optimizedText) {
      onOptimized(optimizedText);
      onClose();
    }
  };

  const handlePreviousVersion = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setOptimizedText(history[historyIndex - 1]);
    }
  };

  const handleNextVersion = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setOptimizedText(history[historyIndex + 1]);
    }
  };

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI ${getTextTypeLabels()[context.textType] || i18n.t('components.ai_text_optimizer.k16')}`}
      description={i18n.t('components.ai_text_optimizer.k5')}
      isLoading={isLoading}
      onConfirm={optimizedText ? handleConfirm : undefined}
      confirmText={i18n.t('components.ai_text_optimizer.k17')}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* 原始文本 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <InputLabel sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'], fontWeight: 500, color: 'text.secondary' }}>
            {i18n.t('components.ai_text_optimizer.k6')}
          </InputLabel>
          <TextField
            value={originalText}
            placeholder={i18n.t('components.ai_text_optimizer.k18')}
            disabled
            sx={{ bgcolor: 'grey.50' }}
            multiline
            rows={3}
          />
        </Box>

        {/* 关键词输入 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => setShowKeywords(!showKeywords)}
          >
            <InputLabel sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'], fontWeight: 500, color: 'text.secondary' }}>
              {i18n.t('components.ai_text_optimizer.k7')}
            </InputLabel>
            {showKeywords ? (
              <ChevronUp style={{ width: 16, height: 16 }} />
            ) : (
              <ChevronDown style={{ width: 16, height: 16 }} />
            )}
          </Box>
          {showKeywords && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddKeyword();
                    }
                  }}
                  placeholder={i18n.t('components.ai_text_optimizer.enter_19')}
                  size='small'
                  sx={{ flex: 1 }}
                />
                <Button
                  variant='outlined'
                  size='small'
                  onClick={handleAddKeyword}
                >
                  {i18n.t('components.ai_text_optimizer.k8')}
                </Button>
              </Box>
              {keywords.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {keywords.map((keyword, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        cursor: 'pointer',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: 'grey.100',
                        '&:hover': { bgcolor: 'error.light', color: 'error.darker' },
                      }}
                      onClick={() => handleRemoveKeyword(keyword)}
                    >
                      {keyword} ×
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* 优化风格选择 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <InputLabel sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'], fontWeight: 500, color: 'text.secondary' }}>
            {i18n.t('components.ai_text_optimizer.k9')}
          </InputLabel>
          <Select
            value={optimizationStyle}
            onChange={(e) => setOptimizationStyle(e.target.value)}
            size='small'
          >
            {getOptimizationStyles().map((style) => (
              <MenuItem
                key={style.value}
                value={style.value}
              >
                <Box>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {style.label}
                  </Box>
                  <Box
                    component='span'
                    sx={{ fontSize: designTokens.typography.fontSize.scale['0.75rem'], color: 'text.secondary', ml: 1 }}
                  >
                    {style.description}
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* 错误提示 */}
        {error && (
          <Card sx={{ borderColor: 'error.light', bgcolor: 'error.light' }}>
            <CardContent
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'error.darker',
              }}
            >
              <AlertCircle style={{ width: 16, height: 16 }} />
              <Box
                component='span'
                sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
              >
                {error.message}
              </Box>
              {retryCount < 2 && (
                <Button
                  variant='outlined'
                  size='small'
                  onClick={retry}
                  sx={{ ml: 'auto' }}
                >
                  {i18n.t('components.ai_text_optimizer.k10')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* 生成按钮 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            startIcon={
              isLoading ? (
                <RefreshCw style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Wand2 style={{ width: 16, height: 16 }} />
              )
            }
          >
            {isLoading
              ? i18n.t('components.ai_text_optimizer.k11')
              : optimizedText
                ? i18n.t('components.ai_text_optimizer.k20')
                : i18n.t('components.ai_text_optimizer.ai_12')}
          </Button>
        </Box>

        {/* 优化结果 */}
        {optimizedText && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <InputLabel sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'], fontWeight: 500, color: 'secondary.dark' }}>
                {i18n.t('components.ai_text_optimizer.k13')}
              </InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {history.length > 1 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Button
                      variant='text'
                      size='small'
                      onClick={handlePreviousVersion}
                      disabled={historyIndex <= 0}
                    >
                      ←
                    </Button>
                    <Box
                      component='span'
                      sx={{ fontSize: designTokens.typography.fontSize.scale['0.75rem'], color: 'text.secondary' }}
                    >
                      {historyIndex + 1}/{history.length}
                    </Box>
                    <Button
                      variant='text'
                      size='small'
                      onClick={handleNextVersion}
                      disabled={historyIndex >= history.length - 1}
                    >
                      →
                    </Button>
                  </Box>
                )}
                <Button
                  variant='outlined'
                  size='small'
                  onClick={handleCopy}
                  startIcon={
                    copied ? (
                      <Check style={{ width: 12, height: 12 }} />
                    ) : (
                      <Copy style={{ width: 12, height: 12 }} />
                    )
                  }
                >
                  {copied
                    ? i18n.t('components.ai_text_optimizer.k22')
                    : i18n.t('components.ai_text_optimizer.k21')}
                </Button>
              </Box>
            </Box>
            <TextField
              value={optimizedText}
              onChange={(e) => setOptimizedText(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'secondary.100' },
                  '&:hover fieldset': { borderColor: 'secondary.300' },
                  '&.Mui-focused fieldset': { borderColor: 'secondary.300' },
                },
                '& .MuiInputBase-input': { resize: 'none' },
              }}
              multiline
              rows={6}
            />
          </Box>
        )}
      </Box>
    </AIGenerateModal>
  );
}
