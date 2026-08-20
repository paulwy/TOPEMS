import React, { useCallback } from 'react';
import { IconButton, Button } from '@mui/material';
import { ArrowLeft, Home, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n from '@/i18n';

type BackButtonVariant = 'back' | 'home' | 'close' | 'text';
type BackButtonSize = 'small' | 'medium';

interface BackButtonProps {
  variant?: BackButtonVariant;
  size?: BackButtonSize;
  onClick?: () => void;
  label?: string;
  ariaLabel?: string;
  href?: string;
}

const VARIANT_CONFIG: Record<
  BackButtonVariant,
  {
    Icon: React.ComponentType<{ style?: React.CSSProperties }>;
    defaultLabel: string;
    defaultAriaLabel: string;
  }
> = {
  back: {
    Icon: ArrowLeft,
    defaultLabel: i18n.t('shared.back_button.k0'),
    defaultAriaLabel: i18n.t('shared.back_button.k1'),
  },
  home: {
    Icon: Home,
    defaultLabel: i18n.t('shared.back_button.k2'),
    defaultAriaLabel: i18n.t('shared.back_button.k3'),
  },
  close: {
    Icon: X,
    defaultLabel: i18n.t('shared.back_button.k4'),
    defaultAriaLabel: i18n.t('shared.back_button.k5'),
  },
  text: {
    Icon: ArrowLeft,
    defaultLabel: i18n.t('shared.back_button.k6'),
    defaultAriaLabel: i18n.t('shared.back_button.k7'),
  },
};

export const BackButton: React.FC<BackButtonProps> = ({
  variant = 'back',
  size = 'small',
  onClick,
  label,
  ariaLabel,
  href,
}) => {
  const navigate = useNavigate();
  const resolvedVariant: 'back' | 'home' | 'close' = variant === 'text' ? 'back' : variant;
  const { Icon, defaultLabel, defaultAriaLabel } = VARIANT_CONFIG[variant];

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }

    if (href) {
      navigate(href);
      return;
    }

    switch (resolvedVariant) {
      case 'back':
        navigate(-1);
        break;
      case 'home':
        navigate(DASHBOARD_PATHS.dashboard);
        break;
      case 'close':
        if (typeof window !== 'undefined' && window.history.length > 1) {
          navigate(-1);
        } else {
          navigate(DASHBOARD_PATHS.dashboard);
        }
        break;
    }
  }, [onClick, resolvedVariant, navigate, href]);

  const resolvedAriaLabel = ariaLabel || defaultAriaLabel;
  const resolvedLabel = label || defaultLabel;

  if (size === 'small') {
    return (
      <IconButton
        size='small'
        onClick={handleClick}
        aria-label={resolvedAriaLabel}
        sx={{
          width: 36,
          height: 36,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Icon style={{ width: 18, height: 18 }} />
      </IconButton>
    );
  }

  return (
    <Button
      variant='text'
      size='medium'
      startIcon={<Icon style={{ width: 18, height: 18 }} />}
      onClick={handleClick}
      aria-label={resolvedAriaLabel}
      sx={{
        textTransform: 'none',
        color: 'text.primary',
        px: 1.5,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {resolvedLabel}
    </Button>
  );
};

export default BackButton;
