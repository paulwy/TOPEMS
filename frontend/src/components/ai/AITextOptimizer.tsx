import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
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

export function AITextOptimizer({
  isOpen,
  onClose,
  context,
  originalText,
  onOptimized,
}: AITextOptimizerProps) {
  const [optimizedText, setOptimizedText] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { isLoading, generate } = useAIHelper({
    featureType: 'text',
    onSuccess: (result) => {
      if (result?.content) {
        setOptimizedText(result.content);
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      setOptimizedText('');
      setCopied(false);
    }
  }, [isOpen]);

  const buildPrompt = () => {
    const { textType, name, keywords } = context;
    let prompt = systemPromptTemplates[textType] || systemPromptTemplates.description;
    prompt += '\n\n';
    
    if (name) {
      prompt += `主体名称: ${name}\n`;
    }
    if (keywords?.length) {
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
    const result = await generate(prompt);
  };

  const handleRegenerate = async () => {
    await handleGenerate();
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

  const textTypeLabels: Record<string, string> = {
    description: '描述优化',
    duty: '职责描述',
    profile: '个人简介',
    clause: '合同条款',
  };

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI ${textTypeLabels[context.textType] || '文本优化'}`}
      description="AI 将根据上下文智能优化文本内容"
      isLoading={isLoading}
      onConfirm={handleConfirm}
      confirmText="使用此文本"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>原始文本</Label>
          <Textarea
            value={originalText}
            readOnly
            placeholder="暂无原始文本"
            className="resize-none"
            rows={4}
          />
        </div>

        <div className="flex justify-center">
          <Button
            onClick={optimizedText ? handleRegenerate : handleGenerate}
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
                <Sparkles className="w-4 h-4" />
                {optimizedText ? '重新生成' : 'AI 优化'}
              </>
            )}
          </Button>
        </div>

        {optimizedText && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>优化后的文本</Label>
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
            <Textarea
              value={optimizedText}
              onChange={(e) => setOptimizedText(e.target.value)}
              className="resize-none"
              rows={6}
            />
          </div>
        )}
      </div>
    </AIGenerateModal>
  );
}
