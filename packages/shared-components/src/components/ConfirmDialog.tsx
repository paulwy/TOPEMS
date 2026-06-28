/**
 * Enhanced ConfirmDialog – shared version
 *
 * No app-specific store dependency. Notification handling is delegated
 * to the consuming app via `onSuccess` / `onError` callbacks.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Box,
  Typography,
  Button,
  type SxProps,
  type Theme,
} from '@mui/material';
import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  X,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

// ============ Type definitions ============

export type DialogType = 'alert' | 'confirm' | 'prompt' | 'info' | 'success' | 'warning' | 'error';

export type DialogButtonType = 'primary' | 'secondary' | 'success' | 'warning' | 'error';

export type DialogSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface DialogButton {
  label: string;
  onClick: () => void;
  type?: DialogButtonType;
  primary?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export interface ConfirmDialogConfig {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Confirm callback (may be async) */
  onConfirm?: () => Promise<void> | void;
  /** Called after onConfirm succeeds */
  onSuccess?: () => void;
  /** Called when onConfirm throws */
  onError?: (error: Error) => void;
  /** Title */
  title: string;
  /** Message content */
  message: React.ReactNode;
  /** Dialog type */
  type?: DialogType;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Confirm button color */
  confirmColor?: DialogButtonType;
  /** Danger mode (red confirm button) */
  danger?: boolean;
  /** Size */
  size?: DialogSize;
  /** Disable confirm button */
  confirmDisabled?: boolean;
  /** Whether dialog can be closed */
  closable?: boolean;
  /** Show close (X) button */
  showCloseButton?: boolean;
  /** Enable drag */
  draggable?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Custom button list */
  buttons?: DialogButton[];
  /** Custom content */
  children?: React.ReactNode;
  /** Show title section */
  showTitle?: boolean;
  /** Show message section */
  showMessage?: boolean;
  /** Center vertically */
  centered?: boolean;
  /** Close on backdrop click */
  closeOnBackdropClick?: boolean;
  /** Show large centered icon */
  showSuccessIcon?: boolean;
  /** Custom styles */
  sx?: SxProps<Theme>;
}

// ============ Size map ============

const SIZE_MAP: Record<DialogSize, string> = {
  xs: '280px',
  sm: '360px',
  md: '480px',
  lg: '640px',
  xl: '800px',
};

const MAX_WIDTH_MAP: Record<DialogSize, 'xs' | 'sm' | 'md' | 'lg' | 'xl'> = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
};

// ============ Icon / color config ============

const TYPE_CONFIG: Record<DialogType, { icon: LucideIcon; color: string; bgColor: string }> = {
  alert: { icon: AlertCircle, color: 'warning.main', bgColor: 'warning.light' },
  confirm: { icon: HelpCircle, color: 'primary.main', bgColor: 'primary.light' },
  prompt: { icon: Info, color: 'info.main', bgColor: 'info.light' },
  info: { icon: Info, color: 'primary.main', bgColor: 'primary.light' },
  success: { icon: CheckCircle, color: 'success.main', bgColor: 'success.lighter' },
  warning: { icon: AlertTriangle, color: 'warning.main', bgColor: 'warning.light' },
  error: { icon: AlertCircle, color: 'error.main', bgColor: 'error.lighter' },
};

// ============ ConfirmDialog component ============

/**
 * Enhanced ConfirmDialog without app-specific dependencies.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onConfirm={handleDelete}
 *   onSuccess={() => showToast('Deleted')}
 *   onError={(err) => showToast(err.message)}
 *   title="确认删除"
 *   message="确定要删除这条记录吗？"
 *   danger
 * />
 * ```
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  onSuccess,
  onError,
  title,
  message,
  type = 'confirm',
  confirmLabel = '确认',
  cancelLabel = '取消',
  confirmColor = 'primary',
  danger = false,
  size = 'md',
  confirmDisabled = false,
  closable = true,
  showCloseButton = false,
  draggable = false,
  icon,
  buttons,
  children,
  showTitle = true,
  showMessage = true,
  centered = true,
  showSuccessIcon = false,
  sx,
}: ConfirmDialogConfig) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const paperRef = useRef<HTMLDivElement>(null);

  const config = TYPE_CONFIG[type];
  const IconComponent = config.icon;

  // ---- Confirm handler ----
  const handleConfirm = useCallback(async () => {
    if (!onConfirm) return;

    setIsLoading(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      await onConfirm();
      setStatus('success');
      onSuccess?.();
      setIsLoading(false);
      onClose();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      setStatus('error');
      setErrorMsg(err.message);
      onError?.(err);
      setIsLoading(false);
      // Keep dialog open on error so the user can see the message
    }
  }, [onConfirm, onClose, onSuccess, onError]);

  // ---- Drag handlers ----
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!draggable || e.target instanceof HTMLButtonElement) return;
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: position.x,
        startTop: position.y,
      };
    },
    [draggable, position],
  );

  const updatePaperPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      setPosition({
        x: dragRef.current.startLeft + clientX - dragRef.current.startX,
        y: dragRef.current.startTop + clientY - dragRef.current.startY,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      const onMouseMove = (e: MouseEvent) => updatePaperPosition(e.clientX, e.clientY);
      const onMouseUp = () => handleMouseUp();
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }
    return undefined;
  }, [isDragging, updatePaperPosition, handleMouseUp]);

  React.useEffect(() => {
    if (!isOpen) {
      setPosition({ x: 0, y: 0 });
      setStatus('idle');
      setErrorMsg('');
    }
  }, [isOpen]);

  const paperSx = {
    width: SIZE_MAP[size],
    maxWidth: '95vw',
    transform: isDragging ? `translate(${position.x}px, ${position.y}px)` : undefined,
    cursor: draggable ? 'move' : 'default',
    ...(typeof sx === 'object' && sx != null && 'paper' in sx
      ? ((sx as Record<string, unknown>).paper as Record<string, unknown>)
      : {}),
  };

  // ---- Render ----
  return (
    <Dialog
      open={isOpen}
      onClose={closable && !isLoading ? onClose : undefined}
      maxWidth={MAX_WIDTH_MAP[size]}
      PaperComponent={({ children: dialogChildren, ...paperProps }) => (
        <div
          ref={paperRef}
          onMouseDown={handleMouseDown}
          {...paperProps}
          style={{
            ...paperSx,
            ...(((paperProps as Record<string, unknown>).sx as Record<string, unknown>) || {}),
          } as React.CSSProperties}
        >
          {dialogChildren}
        </div>
      )}
      sx={{
        '& .MuiDialog-container': {
          alignItems: centered ? 'center' : 'flex-start',
        },
        ...sx,
      }}
    >
      {/* Large centered icon */}
      {showSuccessIcon && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pt: 4,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: config.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 20px ${config.color}30`,
            }}
          >
            {icon || (
              <IconComponent
                size={40}
                style={{ color: config.color }}
                aria-hidden="true"
              />
            )}
          </Box>
        </Box>
      )}

      {/* Title */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: showSuccessIcon ? 3 : undefined,
          pt: showSuccessIcon ? 2 : undefined,
        }}
      >
        {showTitle && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!showSuccessIcon &&
              (icon || (
                <IconComponent
                  size={20}
                  style={{ color: config.color }}
                  aria-hidden="true"
                />
              ))}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>
        )}
        {showCloseButton && closable && (
          <IconButton
            size="small"
            onClick={onClose}
            disabled={isLoading}
            sx={{ ml: 'auto' }}
            aria-label="关闭"
          >
            <X size={20} />
          </IconButton>
        )}
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ px: showSuccessIcon ? 6 : undefined }}>
        {showMessage && <Typography variant="body1">{message}</Typography>}

        {/* Inline error message */}
        {status === 'error' && errorMsg && (
          <Typography
            variant="body2"
            sx={{ mt: 1, color: 'error.main' }}
          >
            {errorMsg}
          </Typography>
        )}

        {/* Inline success message */}
        {status === 'success' && (
          <Typography
            variant="body2"
            sx={{ mt: 1, color: 'success.main' }}
          >
            操作成功
          </Typography>
        )}

        {children}
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {buttons && buttons.length > 0 ? (
          buttons.map((button, index) => (
            <Button
              key={index}
              variant={button.primary ? 'contained' : 'outlined'}
              color={
                button.type === 'success'
                  ? 'success'
                  : button.type === 'warning'
                    ? 'warning'
                    : button.type === 'error'
                      ? 'error'
                      : 'primary'
              }
              onClick={button.onClick}
              disabled={button.disabled || button.loading || isLoading}
              sx={{
                ...(button.primary ? {} : { color: 'text.primary' }),
              }}
            >
              {button.loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                button.label
              )}
            </Button>
          ))
        ) : (
          <>
            {type !== 'alert' && type !== 'success' && (
              <Button onClick={onClose} disabled={isLoading}>
                {cancelLabel}
              </Button>
            )}
            <Button
              variant="contained"
              color={
                danger
                  ? 'error'
                  : confirmColor === 'success'
                    ? 'success'
                    : confirmColor === 'warning'
                      ? 'warning'
                      : confirmColor === 'error'
                        ? 'error'
                        : 'primary'
              }
              onClick={handleConfirm}
              disabled={confirmDisabled || isLoading}
              sx={{
                ...(danger
                  ? { bgcolor: 'error.dark', '&:hover': { bgcolor: 'error.darker' } }
                  : {}),
              }}
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                confirmLabel
              )}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ============ Convenience exports ============

export const AlertDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog {...props} type="alert" />
);

export const InfoDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog {...props} type="info" />
);

export const SuccessDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog {...props} type="success" showSuccessIcon />
);

export const WarningDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog {...props} type="warning" />
);

export const ErrorDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog {...props} type="error" />
);

export const ConfirmationDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog {...props} type="confirm" />
);
