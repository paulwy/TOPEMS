/**
 * useDesigner — 页面设计器核心状态管理
 *
 * 提供画布节点的增删改查、拖拽、撤销/重做、Schema 转换等能力。
 */

import { useCallback, useMemo, useState } from 'react';
import type { EntitySchema, SchemaField } from '@/schema';
import {
  type CanvasNode,
  type CanvasState,
  type PageDesignerOutput,
  canvasNodesToSchema,
  schemaToCanvasNodes,
} from './types';

const MAX_HISTORY = 50;

/** 生成唯一节点 ID */
function genNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 深拷贝节点 */
function cloneNodes(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map((n) => ({ ...n, children: n.children ? cloneNodes(n.children) : undefined }));
}

/** 递归查找节点 */
function findNode(nodes: CanvasNode[], id: string): CanvasNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** 递归更新节点 */
function updateNodeRecursive(
  nodes: CanvasNode[],
  id: string,
  updater: (node: CanvasNode) => CanvasNode
): CanvasNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    if (node.children) {
      return { ...node, children: updateNodeRecursive(node.children, id, updater) };
    }
    return node;
  });
}

/** 递归删除节点 */
function removeNodeRecursive(nodes: CanvasNode[], id: string): CanvasNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: node.children ? removeNodeRecursive(node.children, id) : undefined,
    }));
}

/** useDesigner 选项 */
export interface UseDesignerOptions {
  /** 初始 Schema（用于编辑现有页面） */
  initialSchema?: EntitySchema;
  /** 初始画布节点 */
  initialNodes?: CanvasNode[];
}

/** useDesigner 返回值 */
export interface UseDesignerResult {
  /** 画布状态 */
  state: CanvasState;
  /** 所有节点（扁平化） */
  nodes: CanvasNode[];
  /** 当前选中节点 */
  selectedNode: CanvasNode | null;
  /** 添加节点 */
  addNode: (node: Omit<CanvasNode, 'id'>, parentId?: string) => string;
  /** 更新节点属性 */
  updateNode: (id: string, props: Record<string, unknown>) => void;
  /** 更新节点标签 */
  updateNodeLabel: (id: string, label: string) => void;
  /** 删除节点 */
  removeNode: (id: string) => void;
  /** 选中节点 */
  selectNode: (id: string | null) => void;
  /** 移动节点 */
  moveNode: (id: string, direction: 'up' | 'down') => void;
  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;
  /** 是否可撤销 */
  canUndo: boolean;
  /** 是否可重做 */
  canRedo: boolean;
  /** 导出为 EntitySchema */
  exportSchema: (baseSchema: EntitySchema) => PageDesignerOutput;
  /** 从 EntitySchema 导入 */
  importSchema: (schema: EntitySchema) => void;
  /** 清空画布 */
  clear: () => void;
}

export function useDesigner(options: UseDesignerOptions = {}): UseDesignerResult {
  const initialNodes =
    options.initialNodes ??
    (options.initialSchema ? schemaToCanvasNodes(options.initialSchema.fields) : []);

  const [state, setState] = useState<CanvasState>({
    nodes: initialNodes,
    selectedNodeId: null,
    draggingType: null,
    history: [cloneNodes(initialNodes)],
    historyIndex: 0,
  });

  /** 推入历史记录 */
  const pushHistory = useCallback((nodes: CanvasNode[]) => {
    setState((prev) => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(cloneNodes(nodes));
      // 限制历史长度
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return {
        ...prev,
        nodes,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const addNode = useCallback(
    (node: Omit<CanvasNode, 'id'>, parentId?: string) => {
      const id = genNodeId();
      const newNode: CanvasNode = { ...node, id, parentId };

      setState((prev) => {
        let nodes: CanvasNode[];
        if (parentId) {
          nodes = updateNodeRecursive(prev.nodes, parentId, (n) => ({
            ...n,
            children: [...(n.children ?? []), newNode],
          }));
        } else {
          nodes = [...prev.nodes, newNode];
        }
        pushHistory(nodes);
        return { ...prev, nodes, selectedNodeId: id };
      });

      return id;
    },
    [pushHistory]
  );

  const updateNode = useCallback(
    (id: string, props: Record<string, unknown>) => {
      setState((prev) => {
        const nodes = updateNodeRecursive(prev.nodes, id, (node) => ({
          ...node,
          props: { ...node.props, ...props },
        }));
        pushHistory(nodes);
        return { ...prev, nodes };
      });
    },
    [pushHistory]
  );

  const updateNodeLabel = useCallback(
    (id: string, label: string) => {
      setState((prev) => {
        const nodes = updateNodeRecursive(prev.nodes, id, (node) => ({
          ...node,
          label,
          props: { ...node.props, label },
        }));
        pushHistory(nodes);
        return { ...prev, nodes };
      });
    },
    [pushHistory]
  );

  const removeNode = useCallback(
    (id: string) => {
      setState((prev) => {
        const nodes = removeNodeRecursive(prev.nodes, id);
        pushHistory(nodes);
        return {
          ...prev,
          nodes,
          selectedNodeId: prev.selectedNodeId === id ? null : prev.selectedNodeId,
        };
      });
    },
    [pushHistory]
  );

  const selectNode = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedNodeId: id }));
  }, []);

  const moveNode = useCallback(
    (id: string, direction: 'up' | 'down') => {
      setState((prev) => {
        const nodes = [...prev.nodes];
        const index = nodes.findIndex((n) => n.id === id);
        if (index === -1) return prev;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= nodes.length) return prev;

        [nodes[index], nodes[targetIndex]] = [nodes[targetIndex], nodes[index]];
        pushHistory(nodes);
        return { ...prev, nodes };
      });
    },
    [pushHistory]
  );

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        nodes: cloneNodes(prev.history[newIndex]),
        historyIndex: newIndex,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        nodes: cloneNodes(prev.history[newIndex]),
        historyIndex: newIndex,
      };
    });
  }, []);

  const exportSchema = useCallback(
    (baseSchema: EntitySchema): PageDesignerOutput => {
      const fields: SchemaField[] = canvasNodesToSchema(state.nodes);
      return {
        schema: { ...baseSchema, fields },
        canvas: cloneNodes(state.nodes),
        version: '1.0.0',
      };
    },
    [state.nodes]
  );

  const importSchema = useCallback((schema: EntitySchema) => {
    const nodes = schemaToCanvasNodes(schema.fields);
    setState({
      nodes,
      selectedNodeId: null,
      draggingType: null,
      history: [cloneNodes(nodes)],
      historyIndex: 0,
    });
  }, []);

  const clear = useCallback(() => {
    setState({
      nodes: [],
      selectedNodeId: null,
      draggingType: null,
      history: [[]],
      historyIndex: 0,
    });
  }, []);

  const selectedNode = useMemo(
    () => (state.selectedNodeId ? findNode(state.nodes, state.selectedNodeId) : null),
    [state.nodes, state.selectedNodeId]
  );

  return {
    state,
    nodes: state.nodes,
    selectedNode,
    addNode,
    updateNode,
    updateNodeLabel,
    removeNode,
    selectNode,
    moveNode,
    undo,
    redo,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    exportSchema,
    importSchema,
    clear,
  };
}
