/**
 * FormDrawer - 表单抽屉公共组件
 *
 * 统一 Drawer + Form 提交模式，适用于表单内容较多或移动端场景，
 * 提供比 Dialog 更好的阅读和编辑体验。
 *
 * 特性：
 * - 基于 Drawer 组件，提供表单专用的 API
 * - 内置 loading 状态（提交按钮自动 disabled + 显示加载状态）
 * - 支持 Enter 键提交表单
 * - 支持自定义确认/取消按钮文案
 * - 支持从右侧滑出（默认），也支持左侧
 *
 * @example
 * ```tsx
 * <FormDrawer
 *   open={open}
 *   title="编辑用户"
 *   onClose={handleClose}
 *   onSubmit={handleSubmit}
 *   loading={submitting}
 *   confirmText="保存"
 *   width={480}
 * >
 *   <TextField label="姓名" value={name} onChange={...} />
 * </FormDrawer>
 * ```
 */
import React from 'react';
import { Drawer, type DrawerAnchor } from './Drawer';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

// ============ 类型定义 ============

interface FormDrawerProps {
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
  /** 提交中状态（禁用提交按钮） */
  loading?: boolean;
  /** 抽屉宽度（左右方向时），默认 480px */
  width?: number | string;
  /** 滑出方向，默认右侧 */
  anchor?: DrawerAnchor;
  /** 确认按钮文案 */
  confirmText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 是否禁用提交按钮 */
  disableSubmit?: boolean;
  /** 点击背景是否关闭 */
  closeOnBackdropClick?: boolean;
  /** 自定义内容样式 */
  contentSx?: React.CSSProperties;
}

// ============ FormDrawer 组件 ============

export const FormDrawer = React.memo(function FormDrawer({
  open,
  title,
  onClose,
  onSubmit,
  children,
  loading = false,
  width = 480,
  anchor = 'right',
  confirmText = i18n.t('shared.form_drawer.k0'),
  cancelText = i18n.t('shared.form_drawer.k1'),
  disableSubmit = false,
  closeOnBackdropClick = false,
  contentSx,
}: FormDrawerProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading && !disableSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const footerContent = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
      }}
    >
      <button
        type='button'
        onClick={onClose}
        disabled={loading}
        style={{
          padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}px`,
          borderRadius: 4,
          border: `1px solid ${designTokens.colors.grey[300]}`,
          backgroundColor: 'common.white',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 14,
          color: 'grey.800',
        }}
      >
        {cancelText}
      </button>
      <button
        type='button'
        onClick={onSubmit}
        disabled={loading || disableSubmit}
        style={{
          padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}px`,
          borderRadius: 4,
          border: 'none',
          backgroundColor:
            loading || disableSubmit
              ? designTokens.colors.info[200]
              : designTokens.colors.primary.dark,
          cursor: loading || disableSubmit ? 'not-allowed' : 'pointer',
          fontSize: 14,
          color: 'common.white',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {loading && (
          <span
            style={{
              width: 14,
              height: 14,
              border: `2px solid ${designTokens.colors.cyber.metal.topLight}`,
              borderTopColor: 'common.white',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              display: 'inline-block',
            }}
          />
        )}
        {confirmText}
      </button>
    </div>
  );

  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      anchor={anchor}
      width={width}
      closeOnBackdropClick={closeOnBackdropClick}
      footerContent={footerContent}
      contentSx={contentSx}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <form
        onKeyDown={handleKeyDown}
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && !disableSubmit) onSubmit();
        }}
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {children}
        <input
          type='submit'
          style={{ display: 'none' }}
          disabled={loading || disableSubmit}
        />
      </form>
    </Drawer>
  );
});

export default FormDrawer;
