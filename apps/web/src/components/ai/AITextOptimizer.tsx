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
import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, Wand2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

import { AIGenerateModal } from './AIGenerateModal';
import { useAIHelper } from '../../hooks/useAIHelper';
import type { TextOptimizeContext } from '@/types/ai';
import { logger } from '@/utils/logger';

export interface AITextOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
  context: TextOptimizeContext;
  originalText: string;
  onOptimized: (_text: string) => void;
}

const systemPromptTemplates: Record<string, string> = {
  description:
    '你是专业的企业文档助手。请根据提供的关键词或简短描述，生成一段专业、简洁、清晰的描述文本。字数控制在200-500字之间。',
  duty: '你是专业的HR助手。请根据部门名称和关键词，生成一段专业的部门职责描述。内容应包括：核心职能、主要工作范围、协作关系等。字数控制在300-600字之间。',
  profile:
    '你是专业的HR助手。请根据提供的信息，生成一段专业的个人简介。内容应正式、客观、突出重点。字数控制在200-400字之间。',
  clause:
    '你是专业的法务助手。请根据提供的信息，生成一段专业的合同条款描述。内容应严谨、规范、避免歧义。',
};

const textTypeLabels: Record<string, string> = {
  description: '描述优化',
  duty: '职责描述',
  profile: '个人简介',
  clause: '合同条款',
};

const optimizationStyles = [
  {
    value: 'professional',
    label: '专业正式',
    description: '使用专业术语，正式表达',
  },
  { value: 'concise', label: '简洁明了', description: '精简内容，突出重点' },
  { value: 'detailed', label: '详尽完整', description: '详细展开，全面覆盖' },
  { value: 'friendly', label: '亲切友好', description: '语气柔和，易于理解' },
];

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

  const { isLoading, error, generate, retry, retryCount } = useAIHelper({
    featureType: 'text',
    onSuccess: (result) => {
      if (result?.content) {
        setOptimizedText(result.content);
        setHistory((prev) => [...prev, result.content]);
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
    let prompt = systemPromptTemplates[textType] || systemPromptTemplates.description;

    const styleConfig = optimizationStyles.find((s) => s.value === optimizationStyle);
    if (styleConfig) {
      prompt += `\n\n风格要求：${styleConfig.label} - ${styleConfig.description}`;
    }

    prompt += '\n\n';

    if (name) {
      prompt += `主体名称: ${name}\n`;
    }
    if (keywords.length > 0) {
      prompt += `关键词: ${keywords.join(', ')}\n`;
    }
    if (originalText) {
      prompt += `现有描述: ${originalText}\n`;
    }

    prompt += '\n请生成优化后的文本:';
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
      title={`AI ${textTypeLabels[context.textType] || '文本优化'}`}
      description='AI 将根据上下文智能优化文本内容'
      isLoading={isLoading}
      onConfirm={optimizedText ? handleConfirm : undefined}
      confirmText='使用此文本'
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* 原始文本 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <InputLabel sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary' }}>
            原始文本
          </InputLabel>
          <TextField
            value={originalText}
            placeholder='暂无原始文本'
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
            <InputLabel sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary' }}>
              关键词（可选）
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
                  placeholder='输入关键词后按 Enter 添加'
                  size='small'
                  sx={{ flex: 1 }}
                />
                <Button
                  variant='outlined'
                  size='small'
                  onClick={handleAddKeyword}
                >
                  添加
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
          <InputLabel sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary' }}>
            优化风格
          </InputLabel>
          <Select
            value={optimizationStyle}
            onChange={(e) => setOptimizationStyle(e.target.value)}
            size='small'
          >
            {optimizationStyles.map((style) => (
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
                    sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 1 }}
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
                sx={{ fontSize: '0.875rem' }}
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
                  重试
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
            {isLoading ? '生成中...' : optimizedText ? '重新生成' : 'AI 优化'}
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
              <InputLabel sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'secondary.dark' }}>
                优化后的文本
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
                      sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
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
                  {copied ? '已复制' : '复制'}
                </Button>
              </Box>
            </Box>
            <TextField
              value={optimizedText}
              onChange={(e) => setOptimizedText(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'secondary.100' },
                  '&:hover fieldset': { borderColor: '#c4b5fd' },
                  '&.Mui-focused fieldset': { borderColor: '#c4b5fd' },
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
