/**
 * Shared BackButton component
 *
 * - Accepts optional `onBack` callback; if provided, uses it directly
 * - Otherwise tries react-router-dom `useNavigate` (optional peer dep)
 * - Falls back to `window.history.back()` / `window.location.href`
 * - Does NOT depend on any app-specific hooks or stores
 */
import React, { useCallback, Component, type ReactNode, useEffect, useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import { ArrowLeft } from 'lucide-react';

// ============ Error boundary for missing Router context ============

interface _EBProps {
  children: ReactNode;
  fallback: ReactNode;
}
interface _EBState {
  hasError: boolean;
}

class _RouterBoundary extends Component<_EBProps, _EBState> {
  state: _EBState = { hasError: false };

  static getDerivedStateFromError(): _EBState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ============ Props ============

export interface BackButtonProps {
  /** Custom back handler – if provided, router navigation is skipped */
  onBack?: () => void;
  /** Click handler - alias for onBack */
  onClick?: () => void;
  /** Navigation path when used with router / fallback to `window.location.href` */
  href?: string;
  /** Display text */
  label?: string;
  /** Variant: icon only / text button / outlined */
  variant?: 'icon' | 'text' | 'outlined';
  /** Size */
  size?: 'small' | 'medium' | 'large';
  /** Color */
  color?: 'inherit' | 'primary' | 'secondary' | 'default';
  /** Custom MUI sx */
  sx?: Record<string, unknown>;
  /** Tooltip text (icon variant only) */
  tooltip?: string;
  /** Fallback text when router context is missing */
  fallback?: string;
}

// ============ Shared render helper ============

function renderButton(
  onClick: () => void,
  {
    variant = 'icon',
    size = 'medium',
    color = 'inherit',
    label = '返回',
    sx,
    tooltip,
  }: Pick<BackButtonProps, 'variant' | 'size' | 'color' | 'label' | 'sx' | 'tooltip'>,
) {
  if (variant === 'icon') {
    return (
      <Tooltip title={tooltip || label} arrow>
        <IconButton
          onClick={onClick}
          size={size}
          color={color}
          sx={sx}
          aria-label="返回"
        >
          <ArrowLeft size={size === 'small' ? 18 : 22} />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={variant === 'outlined' ? 'outlined' : 'text'}
      onClick={onClick}
      size={size}
      color={color === 'default' ? 'inherit' : color}
      startIcon={<ArrowLeft size={size === 'small' ? 16 : 18} />}
      sx={sx}
    >
      {label}
    </Button>
  );
}

// ============ Inner: router-aware ============

interface _RouterButtonProps extends BackButtonProps {
  useNavigateFn: () => (to: string | number) => void;
}

function _BackButtonRouter({ useNavigateFn, ...props }: _RouterButtonProps) {
  const navigate = useNavigateFn();

  const handleClick = useCallback(() => {
    if (props.onClick) {
      props.onClick();
      return;
    }
    if (props.onBack) {
      props.onBack();
      return;
    }
    if (props.href) {
      navigate(props.href);
      return;
    }
    navigate(-1);
  }, [props.onClick, props.onBack, props.href, navigate]);

  return renderButton(handleClick, props);
}

// ============ Inner: fallback (no router) ============

function _BackButtonFallback(props: BackButtonProps) {
  const handleClick = useCallback(() => {
    if (props.onClick) {
      props.onClick();
      return;
    }
    if (props.onBack) {
      props.onBack();
      return;
    }
    if (props.href) {
      window.location.href = props.href;
      return;
    }
    window.history.back();
  }, [props.onClick, props.onBack, props.href]);

  return renderButton(handleClick, props);
}

// ============ Router detector hook ============

function useRouterDetector() {
  const [useNavigateFn, setUseNavigateFn] = useState<(() => (to: string | number) => void) | null>(null);

  useEffect(() => {
    import('react-router-dom').then((mod) => {
      if (mod.useNavigate) {
        setUseNavigateFn(() => mod.useNavigate);
      }
    }).catch(() => {
      /* react-router-dom is not installed – that is fine */
    });
  }, []);

  return useNavigateFn;
}

// ============ Main exported component ============

/**
 * Unified BackButton for cross-app reuse.
 *
 * Priority:
 * 1. `onBack` callback (explicit control)
 * 2. react-router-dom `useNavigate` (if installed & Router present)
 * 3. `window.history.back()` / `window.location.href` (universal fallback)
 */
export const BackButton: React.FC<BackButtonProps> = (props) => {
  const useNavigateFn = useRouterDetector();

  if (props.onBack) {
    return <_BackButtonFallback {...props} />;
  }

  if (useNavigateFn) {
    return (
      <_RouterBoundary
        fallback={renderButton(() => window.history.back(), props)}
      >
        <_BackButtonRouter {...props} useNavigateFn={useNavigateFn} />
      </_RouterBoundary>
    );
  }

  return <_BackButtonFallback {...props} />;
};

export default BackButton;