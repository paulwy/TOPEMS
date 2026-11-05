import { useCallback, useMemo, useState } from 'react';
import type { ColumnDef } from './types';

export interface UseTreeTableOptions<T> {
  /** 是否启用树形表格（已解析的最终值） */
  treeView: boolean;
  /** 原始数据 */
  data: T[];
  /** 子节点字段名 */
  treeChildrenField: string;
  /** 节点唯一标识字段名 */
  treeNodeKeyField: string;
  /** 默认展开的节点 */
  defaultExpandedKeys?: (string | number)[];
  /** 受控展开节点（透传 props.expandedKeys） */
  expandedKeysProp?: (string | number)[];
  /** 展开变化回调 */
  onExpandedKeysChange?: (keys: (string | number)[]) => void;
  /** 已解析的列定义 */
  resolvedColumns: ColumnDef<T>[];
}

export interface FlatTreeRow<T> {
  row: T;
  level: number;
  parentKey?: string | number;
}

export interface UseTreeTableResult<T> {
  resolvedExpandedKeys: (string | number)[];
  setExpandedKeys: (keys: (string | number)[]) => void;
  toggleExpand: (key: string | number) => void;
  flatData: FlatTreeRow<T>[];
  treeTableData: T[];
  getRowLevel: (rowId: string | number) => number;
  hasChildren: (row: T) => boolean;
  treeColumnId: string | number | undefined;
}

/**
 * 树形表格逻辑：展开状态（受控/非受控）、扁平化、层级与子节点判断、树列定位。
 * 从 ListPageTemplate 原样抽出，保持默认值与非受控行为一致。
 */
export function useTreeTable<T>({
  treeView,
  data,
  treeChildrenField,
  treeNodeKeyField,
  defaultExpandedKeys,
  expandedKeysProp,
  onExpandedKeysChange,
  resolvedColumns,
}: UseTreeTableOptions<T>): UseTreeTableResult<T> {
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<(string | number)[]>(
    defaultExpandedKeys ?? []
  );
  const resolvedExpandedKeys = expandedKeysProp ?? internalExpandedKeys;
  const setExpandedKeys = useCallback(
    (keys: (string | number)[]) => {
      if (expandedKeysProp === undefined) {
        setInternalExpandedKeys(keys);
      }
      onExpandedKeysChange?.(keys);
    },
    [expandedKeysProp, onExpandedKeysChange]
  );
  const toggleExpand = useCallback(
    (key: string | number) => {
      const isExpanded = resolvedExpandedKeys.includes(key);
      const newKeys = isExpanded
        ? resolvedExpandedKeys.filter((k) => k !== key)
        : [...resolvedExpandedKeys, key];
      setExpandedKeys(newKeys);
    },
    [resolvedExpandedKeys, setExpandedKeys]
  );
  // 扁平化树形数据为一维数组（用于渲染），并记录每个节点的层级
  const flatData = useMemo<FlatTreeRow<T>[]>(() => {
    if (!treeView) return data.map((row) => ({ row, level: 0 }));
    const result: FlatTreeRow<T>[] = [];
    const flatten = (items: T[], level: number, parentKey?: string | number) => {
      items.forEach((item) => {
        const key = (item as unknown as Record<string, unknown>)[treeNodeKeyField] as
          string | number;
        result.push({ row: item, level, parentKey });
        const children = (item as unknown as Record<string, unknown>)[treeChildrenField] as
          T[] | undefined;
        if (children && children.length > 0 && resolvedExpandedKeys.includes(key)) {
          flatten(children, level + 1, key);
        }
      });
    };
    flatten(data, 0);
    return result;
  }, [data, treeView, treeNodeKeyField, treeChildrenField, resolvedExpandedKeys]);
  // 树形表格的数据（用于表格渲染）
  const treeTableData = useMemo(() => {
    if (!treeView) return data;
    return flatData.map((item) => item.row);
  }, [treeView, flatData, data]);
  // 获取行的层级（树形表格用）
  const getRowLevel = useCallback(
    (rowId: string | number): number => {
      if (!treeView) return 0;
      const item = flatData.find(
        (f) => (f.row as unknown as Record<string, unknown>)[treeNodeKeyField] === rowId
      );
      return item?.level ?? 0;
    },
    [treeView, flatData, treeNodeKeyField]
  );
  // 检查行是否有子节点
  const hasChildren = useCallback(
    (row: T): boolean => {
      if (!treeView) return false;
      const children = (row as unknown as Record<string, unknown>)[treeChildrenField] as
        T[] | undefined;
      return !!(children && children.length > 0);
    },
    [treeView, treeChildrenField]
  );
  // 找到树节点列
  const treeColumnId = useMemo(() => {
    const treeCol = resolvedColumns.find((col) => col.treeColumn);
    return treeCol?.id || resolvedColumns[0]?.id;
  }, [resolvedColumns]);

  return {
    resolvedExpandedKeys,
    setExpandedKeys,
    toggleExpand,
    flatData,
    treeTableData,
    getRowLevel,
    hasChildren,
    treeColumnId,
  };
}
