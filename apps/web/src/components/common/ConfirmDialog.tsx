/**
 * 增强版ConfirmDialog组件
 * 支持多种对话框类型、图标、自定义按钮、拖拽等功能
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
import { useAppStore } from '@/store';

// ============ 类型定义 ============

/**
 * 对话框类型
 */
export type DialogType = 'alert' | 'confirm' | 'prompt' | 'info' | 'success' | 'warning' | 'error';

/**
 * 按钮类型
 */
export type DialogButtonType = 'primary' | 'secondary' | 'success' | 'warning' | 'error';

/**
 * 对话框尺寸
 */
export type DialogSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 按钮配置
 */
export interface DialogButton {
  /** 按钮标签 */
  label: string;
  /** 点击回调 */
  onClick: () => void;
  /** 按钮类型 */
  type?: DialogButtonType;
  /** 是否为主要按钮 */
  primary?: boolean;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 对话框配置接口
 */
export interface ConfirmDialogConfig {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 确认回调 */
  onConfirm?: () => Promise<void> | void;
  /** 标题 */
  title: string;
  /** 消息内容 */
  message: React.ReactNode;
  /** 对话框类型 */
  type?: DialogType;
  /** 确认按钮标签 */
  confirmLabel?: string;
  /** 取消按钮标签 */
  cancelLabel?: string;
  /** 确认按钮颜色 */
  confirmColor?: DialogButtonType;
  /** 是否为危险操作 */
  danger?: boolean;
  /** 尺寸 */
  size?: DialogSize;
  /** 确认按钮是否禁用 */
  disabled?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 是否支持拖拽 */
  draggable?: boolean;
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 自定义按钮列表 */
  buttons?: DialogButton[];
  /** 自定义内容 */
  children?: React.ReactNode;
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 是否显示消息 */
  showMessage?: boolean;
  /** 是否居中显示 */
  centered?: boolean;
  /** 点击外部是否关闭 */
  closeOnBackdropClick?: boolean;
  /** 是否显示成功图标 */
  showSuccessIcon?: boolean;
  /** 自定义样式 */
  sx?: SxProps<Theme>;
}

// ============ 尺寸配置 ============

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

// ============ 图标配置 ============

const TYPE_CONFIG: Record<DialogType, { icon: LucideIcon; color: string; bgColor: string }> = {
  alert: { icon: AlertCircle, color: 'warning.main', bgColor: 'warning.light' },
  confirm: { icon: HelpCircle, color: 'primary.main', bgColor: 'primary.light' },
  prompt: { icon: Info, color: 'info.main', bgColor: 'info.light' },
  info: { icon: Info, color: 'primary.main', bgColor: 'primary.light' },
  success: { icon: CheckCircle, color: 'success.main', bgColor: 'success.lighter' },
  warning: { icon: AlertTriangle, color: 'warning.main', bgColor: 'warning.light' },
  error: { icon: AlertCircle, color: 'error.main', bgColor: 'error.lighter' },
};

// ============ ConfirmDialog组件 ============

/**
 * 增强版ConfirmDialog组件
 * 支持多种对话框类型、图标、自定义按钮、拖拽等功能
 *
 * @example
 * ```tsx
 * // 基础确认对话框
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onConfirm={handleConfirm}
 *   title="确认删除"
 *   message="确定要删除这条记录吗？"
 *   danger
 * />
 *
 * // 成功提示对话框
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="操作成功"
 *   message="数据已成功保存"
 *   type="success"
 *   showSuccessIcon
 * />
 *
 * // 自定义按钮
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="自定义对话框"
 *   message="请选择操作"
 *   buttons={[
 *     { label: "选项A", onClick: handleOptionA, primary: true },
 *     { label: "选项B", onClick: handleOptionB },
 *     { label: "取消", onClick: handleClose }
 *   ]}
 * />
 * ```
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmLabel = '确认',
  cancelLabel = '取消',
  confirmColor = 'primary',
  danger = false,
  size = 'md',
  disabled = false,
  closable = true,
  showCloseButton = false,
  draggable = false,
  icon,
  buttons,
  children,
  showTitle = true,
  showMessage = true,
  centered = true,
  closeOnBackdropClick = true,
  showSuccessIcon = false,
  sx,
}: ConfirmDialogConfig) {
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const paperRef = useRef<HTMLDivElement>(null);
  const addNotification = useAppStore((state) => state.addNotification);

  const config = TYPE_CONFIG[type];
  const IconComponent = config.icon;

  const handleConfirm = useCallback(async () => {
    if (!onConfirm) return;

    setIsLoading(true);
    try {
      await onConfirm();
      if (type === 'success') {
        addNotification({
          title: '操作成功',
          message: '操作已成功完成',
          type: 'success',
        });
      }
    } catch (error: unknown) {
      addNotification({
        title: '操作失败',
        message: error instanceof Error ? error.message : '操作过程中发生错误',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
  }, [onConfirm, onClose, type, addNotification]);

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
    [draggable, position]
  );

  const updatePaperPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      setPosition({
        x: dragRef.current.startLeft + clientX - dragRef.current.startX,
        y: dragRef.current.startTop + clientY - dragRef.current.startY,
      });
    },
    [isDragging]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      updatePaperPosition(e.clientX, e.clientY);
    },
    [updatePaperPosition]
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
    return;
  }, [isDragging, updatePaperPosition, handleMouseUp]);

  React.useEffect(() => {
    if (!isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const paperSx = {
    width: SIZE_MAP[size],
    maxWidth: '95vw',
    transform: isDragging ? `translate(${position.x}px, ${position.y}px)` : undefined,
    cursor: draggable ? 'move' : 'default',
    ...((sx as Record<string, unknown>)?.paper || {}),
  };

  return (
    <Dialog
      open={isOpen}
      onClose={closable && !isLoading ? onClose : undefined}
      maxWidth={MAX_WIDTH_MAP[size]}
      PaperComponent={({ children: dialogChildren, ...paperProps }) => (
        <Box
          component="div"
          ref={paperRef}
          onMouseDown={handleMouseDown}
          {...paperProps}
          sx={{ ...paperSx, ...((paperProps as Record<string, unknown>).sx as SxProps<Theme> || {}) }}
        >
          {dialogChildren}
        </Box>
      )}
      sx={{
        '& .MuiDialog-container': {
          alignItems: centered ? 'center' : 'flex-start',
        },
        ...sx,
      }}
    >
      {/* 自定义图标区域 */}
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
                aria-hidden='true'
              />
            )}
          </Box>
        </Box>
      )}

      {/* 标题区域 */}
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
                  aria-hidden='true'
                />
              ))}
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {title}
            </Typography>
          </Box>
        )}
        {showCloseButton && closable && (
          <IconButton
            size='small'
            onClick={onClose}
            disabled={isLoading}
            sx={{ ml: 'auto' }}
            aria-label='关闭'
          >
            <X size={20} />
          </IconButton>
        )}
      </DialogTitle>

      {/* 内容区域 */}
      <DialogContent sx={{ px: showSuccessIcon ? 6 : undefined }}>
        {showMessage && <Typography variant='body1'>{message}</Typography>}
        {children}
      </DialogContent>

      {/* 操作区域 */}
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
                <CircularProgress
                  size={20}
                  color='inherit'
                />
              ) : (
                button.label
              )}
            </Button>
          ))
        ) : (
          <>
            {type !== 'alert' && type !== 'success' && (
              <Button
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              variant='contained'
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
              disabled={disabled || isLoading}
              sx={{
                ...(danger
                  ? { bgcolor: 'error.dark', '&:hover': { bgcolor: 'error.darker' } }
                  : {}),
              }}
            >
              {isLoading ? (
                <CircularProgress
                  size={20}
                  color='inherit'
                />
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

// ============ 便捷组件导出 ============

/**
 * 警告对话框
 */
export const AlertDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog
    {...props}
    type='alert'
  />
);

/**
 * 信息对话框
 */
export const InfoDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog
    {...props}
    type='info'
  />
);

/**
 * 成功对话框
 */
export const SuccessDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog
    {...props}
    type='success'
    showSuccessIcon
  />
);

/**
 * 警告对话框
 */
export const WarningDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog
    {...props}
    type='warning'
  />
);

/**
 * 错误对话框
 */
export const ErrorDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog
    {...props}
    type='error'
  />
);

/**
 * 确认对话框（默认）
 */
export const ConfirmationDialog: React.FC<Omit<ConfirmDialogConfig, 'type'>> = (props) => (
  <ConfirmDialog
    {...props}
    type='confirm'
  />
);
