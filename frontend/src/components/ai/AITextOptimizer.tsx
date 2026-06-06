import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, Wand2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AIGenerateModal } from './AIGenerateModal';
import { useAIHelper } from '../../hooks/useAIHelper';
import type { TextOptimizeContext } from '../../types/ai';

export interface AITextOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
  context: TextOptimizeContext;
  originalText: string;
  onOptimized: (text: string) => void;
}

const systemPromptTemplates: Record<string, string> = {
  description: '你是专业的企业文档助手。请根据提供的关键词或简短描述，生成一段专业、简洁、清晰的描述文本。字数控制在200-500字之间。',
  duty: '你是专业的HR助手。请根据部门名称和关键词，生成一段专业的部门职责描述。内容应包括：核心职能、主要工作范围、协作关系等。字数控制在300-600字之间。',
  profile: '你是专业的HR助手。请根据提供的信息，生成一段专业的个人简介。内容应正式、客观、突出重点。字数控制在200-400字之间。',
  clause: '你是专业的法务助手。请根据提供的信息，生成一段专业的合同条款描述。内容应严谨、规范、避免歧义。',
};

const textTypeLabels: Record<string, string> = {
  description: '描述优化',
  duty: '职责描述',
  profile: '个人简介',
  clause: '合同条款',
};

const optimizationStyles = [
  { value: 'professional', label: '专业正式', description: '使用专业术语，正式表达' },
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
        setHistory(prev => [...prev, result.content]);
        setHistoryIndex(prev => prev + 1);
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
    
    const styleConfig = optimizationStyles.find(s => s.value === optimizationStyle);
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
      setKeywords(prev => [...prev, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(prev => prev.filter(k => k !== keyword));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(optimizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
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
      setHistoryIndex(prev => prev - 1);
      setOptimizedText(history[historyIndex - 1]);
    }
  };

  const handleNextVersion = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setOptimizedText(history[historyIndex + 1]);
    }
  };

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI ${textTypeLabels[context.textType] || '文本优化'}`}
      description="AI 将根据上下文智能优化文本内容"
      isLoading={isLoading}
      onConfirm={optimizedText ? handleConfirm : undefined}
      confirmText="使用此文本"
    >
      <div className="space-y-4">
        {/* 原始文本 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">原始文本</Label>
          <Textarea
            value={originalText}
            readOnly
            placeholder="暂无原始文本"
            className="resize-none bg-gray-50"
            rows={3}
          />
        </div>

        {/* 关键词输入 */}
        <div className="space-y-2">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowKeywords(!showKeywords)}
          >
            <Label className="text-sm font-medium text-gray-600">关键词（可选）</Label>
            {showKeywords ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
          {showKeywords && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddKeyword();
                    }
                  }}
                  placeholder="输入关键词后按 Enter 添加"
                  className="flex-1"
                />
                <Button variant="secondary" size="sm" onClick={handleAddKeyword}>
                  添加
                </Button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100 hover:text-red-600"
                      onClick={() => handleRemoveKeyword(keyword)}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 优化风格选择 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">优化风格</Label>
          <Select value={optimizationStyle} onValueChange={setOptimizationStyle}>
            <SelectTrigger>
              <SelectValue placeholder="选择优化风格" />
            </SelectTrigger>
            <SelectContent>
              {optimizationStyles.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  <div>
                    <span className="font-medium">{style.label}</span>
                    <span className="text-gray-500 text-xs ml-2">{style.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 错误提示 */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-3 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error.message}</span>
              {retryCount < 2 && (
                <Button variant="secondary" size="sm" onClick={retry} className="ml-auto">
                  重试
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* 生成按钮 */}
        <div className="flex justify-center gap-2">
          <Button
            onClick={optimizedText ? handleGenerate : handleGenerate}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                {optimizedText ? '重新生成' : 'AI 优化'}
              </>
            )}
          </Button>
        </div>

        {/* 优化结果 */}
        {optimizedText && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-purple-700">优化后的文本</Label>
              <div className="flex items-center gap-2">
                {history.length > 1 && (
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handlePreviousVersion}
                      disabled={historyIndex <= 0}
                    >
                      ←
                    </Button>
                    <span className="text-xs text-gray-500">
                      {historyIndex + 1}/{history.length}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleNextVersion}
                      disabled={historyIndex >= history.length - 1}
                    >
                      →
                    </Button>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
            </div>
            <Textarea
              value={optimizedText}
              onChange={(e) => setOptimizedText(e.target.value)}
              className="resize-none border-purple-200 focus:border-purple-400"
              rows={6}
            />
          </div>
        )}
      </div>
    </AIGenerateModal>
  );
}
