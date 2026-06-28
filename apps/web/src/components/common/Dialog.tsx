/**
 * 统一 Dialog 组件
 * 基于 ConfirmDialog，提供更简洁的 API
 */
import React from 'react';
import {
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Button,
} from '@mui/material';
import { X } from 'lucide-react';

// ============ 类型定义 ============

/**
 * Dialog 尺寸
 */
export type DialogSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;

/**
 * Dialog 配置接口
 */
export interface DialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title?: string;
  /** 内容 */
  children?: React.ReactNode;
  /** 尺寸 */
  maxWidth?: DialogSize;
  /** 是否全宽 */
  fullWidth?: boolean;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 点击外部是否关闭 */
  closeOnBackdropClick?: boolean;
  /** 操作按钮列表 */
  actions?: React.ReactNode;
  /** 确认按钮配置 */
  confirmButton?: {
    label?: string;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  };
  /** 取消按钮配置 */
  cancelButton?: {
    label?: string;
    onClick?: () => void;
    disabled?: boolean;
  };
  /** 自定义样式 */
  sx?: any;
  /** 是否居中显示 */
  centered?: boolean;
  /** 是否显示分隔线 */
  showDivider?: boolean;
  /** 内容区域样式 */
  contentSx?: any;
  /** 标题区域样式 */
  titleSx?: any;
  /** 操作区域样式 */
  actionsSx?: any;
}

// ============ Dialog 组件 ============

/**
 * 统一 Dialog 组件
 * 提供简洁的 API，支持自定义内容、按钮、样式等
 *
 * @example
 * ```tsx
 * // 基础用法
 * <Dialog
 *   open={isOpen}
 *   onClose={handleClose}
 *   title="提示"
 * >
 *   <Typography>这是一个对话框</Typography>
 * </Dialog>
 *
 * // 带确认和取消按钮
 * <Dialog
 *   open={isOpen}
 *   onClose={handleClose}
 *   title="确认操作"
 *   confirmButton={{ label: "确认", onClick: handleConfirm }}
 *   cancelButton={{ label: "取消" }}
 * >
 *   <Typography>确定要执行此操作吗？</Typography>
 * </Dialog>
 *
 * // 自定义按钮
 * <Dialog
 *   open={isOpen}
 *   onClose={handleClose}
 *   title="自定义按钮"
 *   actions={
 *     <Box sx={{ display: 'flex', gap: 1 }}>
 *       <Button onClick={handleOptionA}>选项A</Button>
 *       <Button onClick={handleOptionB}>选项B</Button>
 *       <Button variant="contained" onClick={handleConfirm}>确认</Button>
 *     </Box>
 *   }
 * >
 *   <Typography>请选择操作</Typography>
 * </Dialog>
 * ```
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'sm',
  fullWidth = true,
  showCloseButton = true,
  closable = true,
  closeOnBackdropClick = true,
  actions,
  confirmButton,
  cancelButton,
  sx,
  centered = false,
  showDivider = false,
  contentSx,
  titleSx,
  actionsSx,
}) => {
  // 处理关闭
  const handleClose = () => {
    if (closable) {
      onClose();
    }
  };

  // 渲染默认按钮
  const renderDefaultButtons = () => {
    if (actions) return actions;

    const buttons = [];

    // 取消按钮
    if (cancelButton) {
      buttons.push(
        <Button
          key='cancel'
          onClick={cancelButton.onClick || handleClose}
          disabled={cancelButton.disabled}
        >
          {cancelButton.label || '取消'}
        </Button>
      );
    }

    // 确认按钮
    if (confirmButton) {
      buttons.push(
        <Button
          key='confirm'
          variant='contained'
          color={confirmButton.color || 'primary'}
          onClick={confirmButton.onClick}
          disabled={confirmButton.disabled || confirmButton.loading}
        >
          {confirmButton.loading ? '处理中...' : confirmButton.label || '确认'}
        </Button>
      );
    }

    return buttons.length > 0 ? buttons : null;
  };

  return (
    <MuiDialog
      open={open}
      onClose={closeOnBackdropClick && closable ? handleClose : undefined}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      sx={{
        '& .MuiDialog-container': {
          alignItems: centered ? 'center' : 'flex-start',
        },
        ...sx,
      }}
    >
      {/* 标题区域 */}
      {title && (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: showDivider ? 1 : 2,
            ...titleSx,
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {title}
          </Typography>
          {showCloseButton && closable && (
            <IconButton
              size='small'
              onClick={handleClose}
              sx={{ ml: 'auto' }}
            >
              <X size={20} />
            </IconButton>
          )}
        </DialogTitle>
      )}

      {/* 内容区域 */}
      <DialogContent sx={{ ...contentSx }}>{children}</DialogContent>

      {/* 操作区域 */}
      {renderDefaultButtons() && (
        <DialogActions sx={{ px: 3, pb: 2, ...actionsSx }}>{renderDefaultButtons()}</DialogActions>
      )}
    </MuiDialog>
  );
};

export default Dialog;
