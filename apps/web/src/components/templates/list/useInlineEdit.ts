import { useState, useCallback } from 'react';

interface UseInlineEditOptions<T> {
  /** 受控编辑行 id（未传则内部状态） */
  editingRowIdProp?: string | number | null;
  /** 编辑行 id 变化回调（受控模式） */
  onEditingRowIdChange?: (id: string | number | null) => void;
  /** 保存编辑（返回 Promise 可延迟关闭编辑态） */
  onInlineEditSave?: (row: T, changes: Partial<T>) => Promise<void> | void;
  /** 取消编辑 */
  onInlineEditCancel?: (row: T) => void;
  /** 行 id 提取函数 */
  getRowId?: (row: T) => string | number;
}

/**
 * 列表页行内编辑状态机（ListPageTemplate 拆分模块）：
 * 管理当前编辑行、编辑中数据与开始/取消/保存/字段更新动作。
 */
export function useInlineEdit<T>({
  editingRowIdProp,
  onEditingRowIdChange,
  onInlineEditSave,
  onInlineEditCancel,
  getRowId,
}: UseInlineEditOptions<T>) {
  const [internalEditingRowId, setInternalEditingRowId] = useState<string | number | null>(null);
  const [editingData, setEditingData] = useState<Partial<T> | null>(null);

  const resolvedEditingRowId = editingRowIdProp ?? internalEditingRowId;

  const setEditingRowId = useCallback(
    (id: string | number | null) => {
      if (editingRowIdProp === undefined) {
        setInternalEditingRowId(id);
      }
      onEditingRowIdChange?.(id);
    },
    [editingRowIdProp, onEditingRowIdChange]
  );

  // 开始编辑行
  const startEditing = useCallback(
    (row: T) => {
      const rowId =
        getRowId?.(row) ?? ((row as unknown as Record<string, unknown>).id as string | number);
      setEditingData({ ...row } as Partial<T>);
      setEditingRowId(rowId);
    },
    [getRowId, setEditingRowId]
  );

  // 取消编辑
  const cancelEditing = useCallback(
    (row: T) => {
      setEditingData(null);
      setEditingRowId(null);
      onInlineEditCancel?.(row);
    },
    [setEditingRowId, onInlineEditCancel]
  );

  // 保存编辑
  const saveEditing = useCallback(
    async (row: T) => {
      if (!editingData) return;
      const changes = editingData;
      try {
        await onInlineEditSave?.(row, changes);
        setEditingData(null);
        setEditingRowId(null);
      } catch {
        // 保存失败，保持编辑状态
      }
    },
    [editingData, onInlineEditSave, setEditingRowId]
  );

  // 更新编辑中的字段值
  const updateEditingField = useCallback((field: keyof T, value: unknown) => {
    setEditingData(
      (prev) =>
        ({
          ...prev,
          [field]: value,
        }) as Partial<T>
    );
  }, []);

  return {
    editingData,
    resolvedEditingRowId,
    setEditingRowId,
    startEditing,
    cancelEditing,
    saveEditing,
    updateEditingField,
  };
}
