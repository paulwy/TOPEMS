import { useState, useCallback } from 'react';

export interface ConfirmConfig {
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface UseCrudDialogsOptions<T> {
  // 无
}

/**
 * CrudPage 对话框状态管理 hook
 * 管理创建 / 编辑 / 详情 / 删除 / 确认对话框
 */
export function useCrudDialogs<T = unknown>(options: UseCrudDialogsOptions<T> = {}) {
  // 创建对话框
  const [createOpen, setCreateOpen] = useState(false);
  const [createFormValues, setCreateFormValues] = useState<Record<string, unknown>>({});

  // 编辑对话框
  const [editTarget, setEditTarget] = useState<T | null>(null);
  const [editFormValues, setEditFormValues] = useState<Record<string, unknown>>({});

  // 详情对话框
  const [detailTarget, setDetailTarget] = useState<T | null>(null);

  // 删除对话框
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  // 确认对话框
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

  // 动作
  const openCreate = useCallback((initialValues?: Record<string, unknown>) => {
    setCreateFormValues(initialValues ?? {});
    setCreateOpen(true);
  }, []);

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setCreateFormValues({});
  }, []);

  const openEdit = useCallback((target: T, values?: Record<string, unknown>) => {
    setEditTarget(target);
    setEditFormValues(values ?? {});
  }, []);

  const closeEdit = useCallback(() => {
    setEditTarget(null);
    setEditFormValues({});
  }, []);

  const openDetail = useCallback((target: T) => {
    setDetailTarget(target);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailTarget(null);
  }, []);

  const openDelete = useCallback((target: T) => {
    setDeleteTarget(target);
  }, []);

  const closeDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const openConfirm = useCallback((config: ConfirmConfig) => {
    setConfirmConfig(config);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmConfig(null);
  }, []);

  const closeAll = useCallback(() => {
    closeCreate();
    closeEdit();
    closeDetail();
    closeDelete();
    closeConfirm();
  }, [closeCreate, closeEdit, closeDetail, closeDetail, closeDelete, closeConfirm]);

  return {
    // 创建
    createOpen,
    setCreateOpen,
    createFormValues,
    setCreateFormValues,
    openCreate,
    closeCreate,
    // 编辑
    editTarget,
    setEditTarget,
    editFormValues,
    setEditFormValues,
    openEdit,
    closeEdit,
    // 详情
    detailTarget,
    setDetailTarget,
    openDetail,
    closeDetail,
    // 删除
    deleteTarget,
    setDeleteTarget,
    openDelete,
    closeDelete,
    // 确认
    confirmConfig,
    setConfirmConfig,
    openConfirm,
    closeConfirm,
    // 批量
    closeAll,
  };
}
