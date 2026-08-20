/**
 * FormDialog - 表单对话框公共组件
 *
 * 统一 Dialog + Form 提交模式，消除各模块重复的 Dialog 结构代码。
 *
 * 特性：
 * - 基于 Dialog 组件，提供表单专用的 API
 * - 内置 loading 状态（提交按钮自动 disabled + 显示 CircularProgress）
 * - 支持 Enter 键提交表单
 * - 支持自定义确认/取消按钮文案
 * - 支持自定义尺寸（xs/sm/md/lg/xl）
 *
 * @example
 * ```tsx
 * <FormDialog
 *   open={open}
 *   title="新增用户"
 *   onClose={handleClose}
 *   onSubmit={handleSubmit}
 *   loading={submitting}
 *   confirmText="保存"
 * >
 *   <TextField label="姓名" value={name} onChange={...} />
 * </FormDialog>
 * ```
 */
import React from 'react';
import { Dialog, type DialogSize } from './Dialog';
import i18n from '@/i18n';

// ============ 类型定义 ============

interface FormDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 标题 */
  title: string;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交回调 */
  onSubmit: () => void;
  /** 表单内容 */
  children?: React.ReactNode;
  /** 提交中状态（显示加载指示器并禁用按钮） */
  loading?: boolean;
  /** 尺寸 */
  maxWidth?: DialogSize;
  /** 确认按钮文案 */
  confirmText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 是否禁用提交按钮 */
  disableSubmit?: boolean;
  /** 点击外部是否关闭 */
  closeOnBackdropClick?: boolean;
  /** 是否显示分隔线 */
  showDivider?: boolean;
  /** 隐藏取消按钮 */
  hideCancelButton?: boolean;
  /** 自定义内容样式 */
  contentSx?: React.CSSProperties;
}

// ============ FormDialog 组件 ============

export const FormDialog = React.memo(function FormDialog({
  open,
  title,
  onClose,
  onSubmit,
  children,
  loading = false,
  maxWidth = 'sm',
  confirmText = i18n.t('shared.form_dialog.k0'),
  cancelText = i18n.t('shared.form_dialog.k1'),
  disableSubmit = false,
  closeOnBackdropClick = false,
  showDivider = true,
  hideCancelButton = false,
  contentSx,
}: FormDialogProps) {
  // 处理 Enter 键提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading && !disableSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      showDivider={showDivider}
      closeOnBackdropClick={closeOnBackdropClick}
      contentSx={contentSx}
      cancelButton={hideCancelButton ? undefined : { label: cancelText, onClick: onClose }}
      confirmButton={{
        label: confirmText,
        onClick: onSubmit,
        disabled: loading || disableSubmit,
        loading,
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form
        onKeyDown={handleKeyDown}
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && !disableSubmit) onSubmit();
        }}
      >
        {children}
        {/* 隐藏的提交按钮以支持原生 form 提交 */}
        <input
          type='submit'
          style={{ display: 'none' }}
          disabled={loading || disableSubmit}
        />
      </form>
    </Dialog>
  );
});

export default FormDialog;
