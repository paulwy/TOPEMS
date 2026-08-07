import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { automationDesignerApi, automationRulesApi } from '@/api/automation';
import type {
  AutomationDesignerCanvas,
  AutomationNodeType,
  AutomationRule,
} from '@/api/automation';
import {
  NODE_HEIGHT,
  NODE_TYPE_LABEL,
  NODE_WIDTH,
  type DesignerCanvasEdge,
  type DesignerMode,
  type DesignerNodeItem,
} from './shared';

export interface UseAutomationDesignerResult {
  rules: AutomationRule[];
  selectedRuleId: string;
  setSelectedRuleId: (id: string) => void;
  canvas: AutomationDesignerCanvas | null;
  nodes: DesignerNodeItem[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  validating: boolean;
  validationErrors: Array<{ node_id?: string; message: string; severity: 'error' | 'warning' }>;
  editNode: DesignerNodeItem | null;
  setEditNode: (n: DesignerNodeItem | null) => void;
  mode: DesignerMode;
  setMode: (m: DesignerMode) => void;
  selectedNodeId: string | null;
  configDraft: string;
  setConfigDraft: (v: string) => void;
  canvasZoom: number;
  canvasOffset: { x: number; y: number };
  viewport: { x: number; y: number; w: number; h: number };
  ZOOM_MIN: number;
  ZOOM_MAX: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  canvasViewportRef: React.RefObject<HTMLDivElement | null>;
  availableNodeTypes: AutomationNodeType[];
  edges: DesignerCanvasEdge[];
  selectedNode: DesignerNodeItem | null;
  handleAddNode: (type: AutomationNodeType) => void;
  handleAddNodeAt: (type: AutomationNodeType, x: number, y: number) => void;
  handleDeleteNode: (id: string) => void;
  handleSaveNode: (updated: DesignerNodeItem) => void;
  handleClear: () => void;
  handleNodeMouseDown: (e: React.MouseEvent, node: DesignerNodeItem) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleUpdateNodeName: (id: string, name: string) => void;
  handleUpdateNodePosition: (id: string, x: number, y: number) => void;
  handleToggleNextNode: (nodeId: string, nextId: string) => void;
  handleApplyConfig: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  handleZoomFit: () => void;
  handleCanvasWheel: (e: React.WheelEvent) => void;
  handleDuplicateNode: (id: string) => void;
  handleCanvasScroll: () => void;
  handleSave: () => Promise<void>;
  handleValidate: () => Promise<void>;
  handleSyncToRule: () => Promise<void>;
  loadCanvasById: (ruleId: string) => Promise<void>;
}

export function useAutomationDesigner(): UseAutomationDesignerResult {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [canvas, setCanvas] = useState<AutomationDesignerCanvas | null>(null);
  const [nodes, setNodes] = useState<DesignerNodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Array<{ node_id?: string; message: string; severity: 'error' | 'warning' }>
  >([]);
  const [editNode, setEditNode] = useState<DesignerNodeItem | null>(null);

  const [mode, setMode] = useState<DesignerMode>('canvas');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [configDraft, setConfigDraft] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);

  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 1.2;

  const loadRules = useCallback(async () => {
    try {
      const res = await automationRulesApi.list({ page: 1, pageSize: 100 });
      setRules(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载规则列表失败');
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const loadCanvasById = useCallback(async (ruleId: string) => {
    if (!ruleId) return;
    setLoading(true);
    setError(null);
    setValidationErrors([]);
    try {
      const res = await automationDesignerApi.getCanvas(ruleId);
      if (res.data) {
        setCanvas(res.data);
        setNodes(res.data.nodes);
        setCanvasZoom(res.data.zoom ?? 1);
        setCanvasOffset(res.data.offset ?? { x: 0, y: 0 });
      } else {
        setCanvas(null);
        setNodes([]);
        setCanvasZoom(1);
        setCanvasOffset({ x: 0, y: 0 });
      }
    } catch (err) {
      try {
        const syncRes = await automationDesignerApi.syncFromRule(ruleId);
        if (syncRes.data) {
          setCanvas(syncRes.data);
          setNodes(syncRes.data.nodes);
          setCanvasZoom(syncRes.data.zoom ?? 1);
          setCanvasOffset(syncRes.data.offset ?? { x: 0, y: 0 });
        }
      } catch (syncErr) {
        setError(
          syncErr instanceof Error
            ? syncErr.message
            : err instanceof Error
              ? err.message
              : '加载画布失败'
        );
        setCanvas(null);
        setNodes([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRuleId) {
      loadCanvasById(selectedRuleId);
    } else {
      setCanvas(null);
      setNodes([]);
    }
    setSelectedNodeId(null);
  }, [selectedRuleId, loadCanvasById]);

  const availableNodeTypes = useMemo<AutomationNodeType[]>(
    () => [
      'trigger',
      'workflow_action',
      'integration_action',
      'api_action',
      'lowcode_action',
      'notification_action',
      'condition',
      'delay',
      'success_hook',
      'error_hook',
    ],
    []
  );

  const edges = useMemo<DesignerCanvasEdge[]>(() => {
    const result: DesignerCanvasEdge[] = [];
    for (const node of nodes) {
      for (const nextId of node.next_nodes ?? []) {
        const target = nodes.find((n) => n.id === nextId);
        if (target) {
          result.push({
            id: `e_${node.id}_${nextId}`,
            source: node.id,
            target: nextId,
            sourcePos: node.position,
            targetPos: target.position,
          });
        }
      }
    }
    return result;
  }, [nodes]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  useEffect(() => {
    if (selectedNode) {
      setConfigDraft(JSON.stringify(selectedNode.config ?? {}, null, 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left) / canvasZoom;
      const mouseY = (e.clientY - rect.top) / canvasZoom;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === dragging.id
            ? {
                ...n,
                position: {
                  x: Math.max(0, mouseX - dragging.offsetX),
                  y: Math.max(0, mouseY - dragging.offsetY),
                },
              }
            : n
        )
      );
    };
    const handleMouseUp = () => setDragging(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, canvasZoom]);

  const handleAddNode = useCallback((type: AutomationNodeType) => {
    const newNode: DesignerNodeItem = {
      id: `node_${Date.now()}`,
      type,
      name: NODE_TYPE_LABEL[type],
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 100 },
      config: {},
      isNew: true,
    };
    setNodes((prev) => [...prev, newNode]);
    setEditNode(newNode);
  }, []);

  const handleAddNodeAt = useCallback((type: AutomationNodeType, x: number, y: number) => {
    const newNode: DesignerNodeItem = {
      id: `node_${Date.now()}`,
      type,
      name: NODE_TYPE_LABEL[type],
      position: { x: Math.max(0, x), y: Math.max(0, y) },
      config: {},
      isNew: true,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  }, []);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((prev) =>
      prev
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          next_nodes: (n.next_nodes ?? []).filter((x) => x !== id),
        }))
    );
    setSelectedNodeId((prev) => (prev === id ? null : prev));
  }, []);

  const handleSaveNode = useCallback((updated: DesignerNodeItem) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? { ...updated, isNew: false } : n)));
    setEditNode(null);
  }, []);

  const handleClear = useCallback(() => {
    setNodes([]);
    setSelectedNodeId(null);
    setValidationErrors([]);
    setCanvasZoom(1);
    setCanvasOffset({ x: 0, y: 0 });
  }, []);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, node: DesignerNodeItem) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left) / canvasZoom;
      const mouseY = (e.clientY - rect.top) / canvasZoom;
      setDragging({
        id: node.id,
        offsetX: mouseX - node.position.x,
        offsetY: mouseY - node.position.y,
      });
      setSelectedNodeId(node.id);
    },
    [canvasZoom]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/node-type') as AutomationNodeType;
      if (!type) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / canvasZoom - NODE_WIDTH / 2;
      const y = (e.clientY - rect.top) / canvasZoom - NODE_HEIGHT / 2;
      handleAddNodeAt(type, x, y);
    },
    [canvasZoom, handleAddNodeAt]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleUpdateNodeName = useCallback((id: string, name: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, name } : n)));
  }, []);

  const handleUpdateNodePosition = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, position: { x: Math.max(0, x), y: Math.max(0, y) } } : n
      )
    );
  }, []);

  const handleToggleNextNode = useCallback((nodeId: string, nextId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const current = n.next_nodes ?? [];
        const next = current.includes(nextId)
          ? current.filter((x) => x !== nextId)
          : [...current, nextId];
        return { ...n, next_nodes: next };
      })
    );
  }, []);

  const handleApplyConfig = useCallback(() => {
    if (!selectedNode) return;
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(configDraft);
    } catch {
      // keep empty config
    }
    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, config } : n)));
  }, [selectedNode, configDraft]);

  const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

  const handleZoomIn = useCallback(() => {
    setCanvasZoom((z) => clampZoom(Number((z * ZOOM_STEP).toFixed(3))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCanvasZoom((z) => clampZoom(Number((z / ZOOM_STEP).toFixed(3))));
  }, []);

  const handleZoomReset = useCallback(() => {
    setCanvasZoom(1);
    setCanvasOffset({ x: 0, y: 0 });
    if (canvasViewportRef.current) {
      canvasViewportRef.current.scrollTo({ left: 0, top: 0 });
    }
  }, []);

  const handleZoomFit = useCallback(() => {
    if (nodes.length === 0) {
      handleZoomReset();
      return;
    }
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const minY = Math.min(...nodes.map((n) => n.position.y));
    const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_WIDTH));
    const maxY = Math.max(...nodes.map((n) => n.position.y + NODE_HEIGHT));
    const bboxW = Math.max(1, maxX - minX);
    const bboxH = Math.max(1, maxY - minY);
    const vp = canvasViewportRef.current;
    const vpW = vp?.clientWidth ?? 700;
    const vpH = vp?.clientHeight ?? 600;
    const scale = Math.min(vpW / bboxW, vpH / bboxH, ZOOM_MAX) * 0.8;
    const newZoom = clampZoom(Number(scale.toFixed(3)));
    setCanvasZoom(newZoom);
    const scrollX = Math.max(0, minX * newZoom - (vpW - bboxW * newZoom) / 2);
    const scrollY = Math.max(0, minY * newZoom - (vpH - bboxH * newZoom) / 2);
    vp?.scrollTo({ left: scrollX, top: scrollY });
  }, [nodes, handleZoomReset]);

  const handleCanvasWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    },
    [handleZoomIn, handleZoomOut]
  );

  const handleDuplicateNode = useCallback(
    (id: string) => {
      const source = nodes.find((n) => n.id === id);
      if (!source) return;
      const newNode: DesignerNodeItem = {
        ...source,
        id: `node_${Date.now()}`,
        name: `${source.name} (副本)`,
        position: {
          x: source.position.x + 40,
          y: source.position.y + 40,
        },
        next_nodes: [],
        branches: source.branches,
        isNew: true,
      };
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
    },
    [nodes]
  );

  useEffect(() => {
    if (mode !== 'canvas') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (!selectedNodeId) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateNode(selectedNodeId);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteNode(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, selectedNodeId, handleDuplicateNode]);

  const handleCanvasScroll = useCallback(() => {
    const vp = canvasViewportRef.current;
    if (!vp) return;
    setViewport({
      x: vp.scrollLeft / canvasZoom,
      y: vp.scrollTop / canvasZoom,
      w: vp.clientWidth / canvasZoom,
      h: vp.clientHeight / canvasZoom,
    });
  }, [canvasZoom]);

  useEffect(() => {
    handleCanvasScroll();
  }, [handleCanvasScroll, canvasZoom]);

  const buildSavePayload = useCallback(
    () => ({
      nodes: nodes.map(({ id, type, name, position, config, next_nodes, branches }) => ({
        id,
        type,
        name,
        position,
        config,
        next_nodes,
        branches,
      })),
      edges: edges.map(({ id, source, target }) => ({ id, source, target })),
      zoom: canvasZoom,
      offset: canvasOffset,
    }),
    [nodes, edges, canvasZoom, canvasOffset]
  );

  const handleSave = useCallback(async () => {
    if (!selectedRuleId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await automationDesignerApi.saveCanvas(selectedRuleId, buildSavePayload());
      if (res.data) {
        setCanvas(res.data);
        setNodes(res.data.nodes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存画布失败');
    } finally {
      setSaving(false);
    }
  }, [selectedRuleId, buildSavePayload]);

  const handleValidate = useCallback(async () => {
    if (!selectedRuleId) return;
    setValidating(true);
    setError(null);
    try {
      const res = await automationDesignerApi.validate(selectedRuleId, buildSavePayload());
      setValidationErrors(res.data?.errors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '校验画布失败');
    } finally {
      setValidating(false);
    }
  }, [selectedRuleId, buildSavePayload]);

  const handleSyncToRule = useCallback(async () => {
    if (!selectedRuleId) return;
    try {
      await automationDesignerApi.syncToRule(selectedRuleId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步到规则失败');
    }
  }, [selectedRuleId]);

  return {
    rules,
    selectedRuleId,
    setSelectedRuleId,
    canvas,
    nodes,
    loading,
    error,
    saving,
    validating,
    validationErrors,
    editNode,
    setEditNode,
    mode,
    setMode,
    selectedNodeId,
    configDraft,
    setConfigDraft,
    canvasZoom,
    canvasOffset,
    viewport,
    ZOOM_MIN,
    ZOOM_MAX,
    canvasRef,
    canvasViewportRef,
    availableNodeTypes,
    edges,
    selectedNode,
    handleAddNode,
    handleAddNodeAt,
    handleDeleteNode,
    handleSaveNode,
    handleClear,
    handleNodeMouseDown,
    handleDrop,
    handleDragOver,
    handleUpdateNodeName,
    handleUpdateNodePosition,
    handleToggleNextNode,
    handleApplyConfig,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomFit,
    handleCanvasWheel,
    handleDuplicateNode,
    handleCanvasScroll,
    handleSave,
    handleValidate,
    handleSyncToRule,
    loadCanvasById,
  };
}

export default useAutomationDesigner;
