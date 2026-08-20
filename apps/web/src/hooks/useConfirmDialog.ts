/**
 * 确认对话框状态管理 hook
 *
 * 封装 ConfirmDialog 的 open + config + openConfirm + closeConfirm 状态，
 * 消除 100+ 文件中重复的 confirmDialogOpen / confirmDialogConfig 样板代码。
 *
 * @example
 * ```tsx
 * const { confirmOpen, confirmConfig, openConfirm, closeConfirm } = useConfirmDialog();
 *
 * const handleDelete = (id: string) => {
 *   openConfirm({
 *     title: '确认删除',
 *     message: '删除后无法恢复，确定要删除吗？',
 *     danger: true,
 *     onConfirm: () => deleteMutation.mutate(id),
 *   });
 * };
 *
 * // JSX
 * <ConfirmDialog
 *   isOpen={confirmOpen}
 *   onClose={closeConfirm}
 *   onConfirm={() => {
 *     confirmConfig?.onConfirm();
 *     closeConfirm();
 *   }}
 *   title={confirmConfig?.title || ''}
 *   message={confirmConfig?.message || ''}
 *   danger={confirmConfig?.danger}
 * />
 * ```
 */

import { useState, useCallback } from 'react';

export interface ConfirmDialogConfig {
  /** 对话框标题 */
  title: string;
  /** 对话框消息内容 */
  message: string;
  /** 确认回调 */
  onConfirm: () => void;
  /** 是否为危险操作（红色确认按钮） */
  danger?: boolean;
  /** 自定义确认按钮文本，默认"确认" */
  confirmText?: string;
  /** 自定义取消按钮文本，默认"取消" */
  cancelText?: string;
}

interface UseConfirmDialogResult {
  /** 对话框是否打开 */
  confirmOpen: boolean;
  /** 当前对话框配置（打开时非 null） */
  confirmConfig: ConfirmDialogConfig | null;
  /** 打开确认对话框 */
  openConfirm: (config: ConfirmDialogConfig) => void;
  /** 关闭确认对话框 */
  closeConfirm: () => void;
}

/**
 * 确认对话框状态管理 hook
 */
export function useConfirmDialog(): UseConfirmDialogResult {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmDialogConfig | null>(null);

  const openConfirm = useCallback((config: ConfirmDialogConfig) => {
    setConfirmConfig(config);
    setConfirmOpen(true);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  return {
    confirmOpen,
    confirmConfig,
    openConfirm,
    closeConfirm,
  };
}
