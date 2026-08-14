import { Button } from '@mui/material';
import { Sparkles, Loader2 } from 'lucide-react';

import type { ButtonProps } from '@mui/material/Button';
import i18n from '@/i18n';

export interface AIHelperButtonProps {
  type: 'generate' | 'optimize' | 'validate' | 'complete';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
}

const typeLabels = {
  generate: i18n.t('components.ai_helper_button.ai_0'),
  optimize: i18n.t('components.ai_helper_button.ai_1'),
  validate: i18n.t('components.ai_helper_button.ai_2'),
  complete: i18n.t('components.ai_helper_button.ai_3'),
};

export function AIHelperButton({
  type,
  onClick,
  disabled = false,
  loading = false,
  label,
  size = 'medium',
  variant = 'contained',
}: AIHelperButtonProps) {
  const buttonLabel = label || typeLabels[type];

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      size={size}
      variant={variant}
    >
      {loading ? (
        <>
          <Loader2
            style={{ width: 16, height: 16, marginRight: 8 }}
            className='animate-spin'
          />
          {i18n.t('components.ai_helper_button.k0')}
        </>
      ) : (
        <>
          <Sparkles style={{ width: 16, height: 16, marginRight: 8 }} />
          {buttonLabel}
        </>
      )}
    </Button>
  );
}
