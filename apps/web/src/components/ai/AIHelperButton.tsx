import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

export interface AIHelperButtonProps {
  type: 'generate' | 'optimize' | 'validate' | 'complete';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
}

const typeLabels = {
  generate: 'AI 生成',
  optimize: 'AI 优化',
  validate: 'AI 校验',
  complete: 'AI 补全',
};

export function AIHelperButton({
  type,
  onClick,
  disabled = false,
  loading = false,
  label,
  size = 'default',
  variant = 'default',
}: AIHelperButtonProps) {
  const buttonLabel = label || typeLabels[type];

  return (
    <Button onClick={onClick} disabled={disabled || loading} size={size} variant={variant}>
      {loading ? (
        <>
          <Loader2 className='w-4 h-4 mr-2 animate-spin' />
          处理中...
        </>
      ) : (
        <>
          <Sparkles className='w-4 h-4 mr-2' />
          {buttonLabel}
        </>
      )}
    </Button>
  );
}
