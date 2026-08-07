import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle2 as CheckCircle2Icon,
  AlertTriangle as AlertIcon,
  RefreshCw as RefreshIcon,
  Plus as AddIcon,
  Trash2 as DeleteIcon,
  Eye as EyeIcon,
  Eraser as ClearIcon,
  Zap as ZapIcon,
  Workflow as WorkflowIcon,
  Plug as PlugIcon,
  Code as CodeIcon,
  Layout as LayoutIcon,
  Bell as BellIcon,
  Clock as ClockIcon,
  GitBranch as GitBranchIcon,
  XCircle as XCircleIcon,
  ListTree as FormModeIcon,
  Network as CanvasModeIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Maximize as FitIcon,
  RotateCcw as ResetIcon,
  Copy as DuplicateIcon,
} from 'lucide-react';
import { automationDesignerApi, automationRulesApi } from '@/api/automation';
import type {
  AutomationDesignerCanvas,
  AutomationDesignerNode,
  AutomationNodeType,
  AutomationRule,
} from '@/api/automation';
import { PageContainer } from '@/components/common';

const NODE_TYPE_LABEL: Record<AutomationNodeType, string> = {
  trigger: '触发器',
  workflow_action: '工作流动作',
  integration_action: '集成动作',
  api_action: 'API 动作',
  lowcode_action: '低代码动作',
  notification_action: '通知动作',
  condition: '条件分支',
  delay: '延时',
  success_hook: '成功钩子',
  error_hook: '失败钩子',
};

const NODE_TYPE_COLOR: Record<
  AutomationNodeType,
  'primary' | 'success' | 'warning' | 'error' | 'info' | 'default'
> = {
  trigger: 'primary',
  workflow_action: 'info',
  integration_action: 'info',
  api_action: 'info',
  lowcode_action: 'info',
  notification_action: 'success',
  condition: 'warning',
  delay: 'default',
  success_hook: 'success',
  error_hook: 'error',
};

const NODE_TYPE_ICON: Record<AutomationNodeType, React.ComponentType<{ size?: number }>> = {
  trigger: ZapIcon,
  workflow_action: WorkflowIcon,
  integration_action: PlugIcon,
  api_action: CodeIcon,
  lowcode_action: LayoutIcon,
  notification_action: BellIcon,
  condition: GitBranchIcon,
  delay: ClockIcon,
  success_hook: CheckCircle2Icon,
  error_hook: XCircleIcon,
};

const NODE_TYPE_BORDER_COLOR: Record<AutomationNodeType, string> = {
  trigger: 'primary.main',
  workflow_action: 'info.main',
  integration_action: 'info.main',
  api_action: 'info.main',
  lowcode_action: 'info.main',
  notification_action: 'success.main',
  condition: 'warning.main',
  delay: 'grey.400',
  success_hook: 'success.main',
  error_hook: 'error.main',
};

const NODE_WIDTH = 184;
const NODE_HEIGHT = 64;
const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 1600;

interface DesignerNodeItem extends AutomationDesignerNode {
  isNew?: boolean;
}

type DesignerMode = 'form' | 'canvas';

/** 计算从源节点右边中点到目标节点左边中点的三次贝塞尔曲线路径 */
function computeEdgePath(
  source: { x: number; y: number },
  target: { x: number; y: number }
): string {
  const sx = source.x + NODE_WIDTH;
  const sy = source.y + NODE_HEIGHT / 2;
  const tx = target.x;
  const ty = target.y + NODE_HEIGHT / 2;
  const dx = Math.max(40, Math.abs(tx - sx) / 2);
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
}

export const AutomationDesignerPage: React.FC = () => {
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

  // 画布模式相关状态
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

  // 画布缩放/平移（DAG UX 补强 V66.4）
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // minimap 视口指示器：记录当前滚动位置（canvas 坐标系，未缩放）
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

  const loadCanvas = useCallback(async (ruleId: string) => {
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
      // 画布不存在时尝试从规则同步
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
      loadCanvas(selectedRuleId);
    } else {
      setCanvas(null);
      setNodes([]);
    }
    setSelectedNodeId(null);
  }, [selectedRuleId, loadCanvas]);

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

  // 由节点的 next_nodes 派生可视化连线（同时用于保存）
  const edges = useMemo(() => {
    const result: Array<{
      id: string;
      source: string;
      target: string;
      sourcePos: { x: number; y: number };
      targetPos: { x: number; y: number };
    }> = [];
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

  // 切换选中节点时同步配置草稿
  useEffect(() => {
    if (selectedNode) {
      setConfigDraft(JSON.stringify(selectedNode.config ?? {}, null, 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  // 拖拽节点：在 window 上监听 mousemove/mouseup，保证鼠标移出画布也能继续拖动
  // 注意：canvasRef 指向被 scale 变换的内部 Box，rect 已是视觉尺寸，需除以 zoom 还原画布坐标
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

  const handleAddNode = (type: AutomationNodeType) => {
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
  };

  const handleAddNodeAt = (type: AutomationNodeType, x: number, y: number) => {
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
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) =>
      prev
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          next_nodes: (n.next_nodes ?? []).filter((x) => x !== id),
        }))
    );
    setSelectedNodeId((prev) => (prev === id ? null : prev));
  };

  const handleSaveNode = (updated: DesignerNodeItem) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? { ...updated, isNew: false } : n)));
    setEditNode(null);
  };

  const handleClear = () => {
    setNodes([]);
    setSelectedNodeId(null);
    setValidationErrors([]);
    setCanvasZoom(1);
    setCanvasOffset({ x: 0, y: 0 });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: DesignerNodeItem) => {
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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/node-type') as AutomationNodeType;
    if (!type) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / canvasZoom - NODE_WIDTH / 2;
    const y = (e.clientY - rect.top) / canvasZoom - NODE_HEIGHT / 2;
    handleAddNodeAt(type, x, y);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleUpdateNodeName = (id: string, name: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, name } : n)));
  };

  const handleUpdateNodePosition = (id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, position: { x: Math.max(0, x), y: Math.max(0, y) } } : n
      )
    );
  };

  const handleToggleNextNode = (nodeId: string, nextId: string) => {
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
  };

  const handleApplyConfig = () => {
    if (!selectedNode) return;
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(configDraft);
    } catch {
      // keep empty config
    }
    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, config } : n)));
  };

  // ===== DAG UX 补强：缩放控制 =====
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

  // Fit：计算所有节点的包围盒，按 80% 视口占比反算缩放，并滚动到居中
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
    // 滚动使包围盒居中（留 10% 边距）
    const scrollX = Math.max(0, minX * newZoom - (vpW - bboxW * newZoom) / 2);
    const scrollY = Math.max(0, minY * newZoom - (vpH - bboxH * newZoom) / 2);
    vp?.scrollTo({ left: scrollX, top: scrollY });
  }, [nodes, handleZoomReset]);

  // 滚轮缩放（按住 Ctrl/Cmd 滚轮缩放，普通滚动为平移）
  const handleCanvasWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    },
    [handleZoomIn, handleZoomOut]
  );

  // ===== DAG UX 补强：节点复制 =====
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

  // ===== DAG UX 补强：键盘快捷键 =====
  // Delete/Backspace：删除选中节点；Ctrl/Cmd+D：复制选中节点
  useEffect(() => {
    if (mode !== 'canvas') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // 输入框/文本域/contenteditable 中不拦截
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

  // ===== DAG UX 补强：Minimap 视口跟踪 =====
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
    // 初始化视口尺寸
    handleCanvasScroll();
  }, [handleCanvasScroll, canvasZoom]);

  const buildSavePayload = () => ({
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
  });

  const handleSave = async () => {
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
  };

  const handleValidate = async () => {
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
  };

  const handleSyncToRule = async () => {
    if (!selectedRuleId) return;
    try {
      await automationDesignerApi.syncToRule(selectedRuleId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步到规则失败');
    }
  };

  return (
    <PageContainer title='自动化设计器'>
      <Box sx={{ p: 3 }}>
        {/* 顶部工具栏 */}
        <Stack
          direction='row'
          spacing={2}
          sx={{
            mb: 2,
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Stack
            direction='row'
            spacing={2}
            sx={{ alignItems: 'center' }}
          >
            <Typography variant='h5'>可视化编排</Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, value: DesignerMode | null) => value && setMode(value)}
              size='small'
            >
              <ToggleButton value='canvas'>
                <CanvasModeIcon
                  size={16}
                  style={{ marginRight: 4 }}
                />
                画布模式
              </ToggleButton>
              <ToggleButton value='form'>
                <FormModeIcon
                  size={16}
                  style={{ marginRight: 4 }}
                />
                表单模式
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => selectedRuleId && loadCanvas(selectedRuleId)}
              size='small'
              disabled={!selectedRuleId || loading}
            >
              重载
            </Button>
            <Button
              startIcon={<EyeIcon />}
              onClick={handleValidate}
              size='small'
              disabled={!selectedRuleId || validating || nodes.length === 0}
            >
              {validating ? '预览中…' : '预览'}
            </Button>
            <Button
              startIcon={<ClearIcon />}
              onClick={handleClear}
              size='small'
              color='warning'
              disabled={nodes.length === 0}
            >
              清空
            </Button>
            <Button
              startIcon={<SaveIcon />}
              onClick={handleSave}
              size='small'
              variant='contained'
              disabled={!selectedRuleId || saving || nodes.length === 0}
            >
              {saving ? '保存中…' : '保存'}
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Typography
            color='error'
            variant='body2'
            sx={{ mb: 1 }}
          >
            {error}
          </Typography>
        )}

        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, alignItems: 'center' }}
        >
          <TextField
            select
            label='选择规则'
            value={selectedRuleId}
            onChange={(e) => setSelectedRuleId(e.target.value)}
            size='small'
            sx={{ minWidth: 300 }}
          >
            <MenuItem value=''>
              <em>请选择</em>
            </MenuItem>
            {rules.map((r) => (
              <MenuItem
                key={r.id}
                value={r.id}
              >
                {r.name} ({r.code})
              </MenuItem>
            ))}
          </TextField>
          <Button
            size='small'
            onClick={handleSyncToRule}
            disabled={!selectedRuleId}
            variant='outlined'
          >
            同步到规则
          </Button>
        </Stack>

        {validationErrors.length > 0 && (
          <Paper
            variant='outlined'
            sx={{ p: 1.5, mb: 2, bgcolor: 'warning.lighter' }}
          >
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center', mb: 0.5 }}
            >
              <AlertIcon size={16} />
              <Typography variant='subtitle2'>校验结果</Typography>
            </Stack>
            {validationErrors.map((e, idx) => (
              <Typography
                key={idx}
                variant='body2'
                color={e.severity === 'error' ? 'error.main' : 'warning.main'}
              >
                [{e.severity}] {e.node_id ? `[${e.node_id}] ` : ''}
                {e.message}
              </Typography>
            ))}
          </Paper>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : !selectedRuleId ? (
          <Paper
            variant='outlined'
            sx={{ p: 4, textAlign: 'center' }}
          >
            <Typography color='text.secondary'>请先选择一个规则以加载或创建画布</Typography>
          </Paper>
        ) : mode === 'form' ? (
          /* ===== 表单模式（原有编辑器） ===== */
          <Box>
            <Paper
              variant='outlined'
              sx={{ p: 1, mb: 2 }}
            >
              <Stack
                direction='row'
                spacing={1}
                sx={{ flexWrap: 'wrap' }}
              >
                {availableNodeTypes.map((t) => (
                  <Button
                    key={t}
                    size='small'
                    startIcon={<AddIcon />}
                    onClick={() => handleAddNode(t)}
                  >
                    {NODE_TYPE_LABEL[t]}
                  </Button>
                ))}
              </Stack>
            </Paper>

            <Paper
              variant='outlined'
              sx={{ p: 2, minHeight: 400 }}
            >
              {nodes.length === 0 ? (
                <Typography
                  color='text.secondary'
                  sx={{ textAlign: 'center', mt: 4 }}
                >
                  画布为空，请从上方添加节点
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {nodes.map((node) => (
                    <Paper
                      key={node.id}
                      variant='outlined'
                      sx={{
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        borderStyle: node.isNew ? 'dashed' : 'solid',
                      }}
                    >
                      <Chip
                        size='small'
                        color={NODE_TYPE_COLOR[node.type]}
                        label={NODE_TYPE_LABEL[node.type]}
                      />
                      <Typography
                        variant='body2'
                        sx={{ flex: 1 }}
                      >
                        {node.name}
                        {node.isNew && (
                          <Typography
                            component='span'
                            color='warning.main'
                            sx={{ ml: 1 }}
                          >
                            (未保存)
                          </Typography>
                        )}
                      </Typography>
                      <Button
                        size='small'
                        onClick={() => setEditNode(node)}
                      >
                        编辑
                      </Button>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => handleDeleteNode(node.id)}
                        aria-label='删除'
                      >
                        <DeleteIcon size={18} />
                      </IconButton>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </Box>
        ) : (
          /* ===== 画布模式（DAG 可视化） ===== */
          <Grid
            container
            spacing={2}
          >
            {/* 左侧：节点类型面板 */}
            <Grid size={{ xs: 12, md: 2 }}>
              <Paper
                variant='outlined'
                sx={{ p: 1.5, height: '100%', minHeight: 600 }}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 1 }}
                >
                  节点类型
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Stack spacing={1}>
                  {availableNodeTypes.map((t) => {
                    const Icon = NODE_TYPE_ICON[t];
                    return (
                      <Tooltip
                        key={t}
                        title='拖拽到画布或点击添加'
                        placement='right'
                      >
                        <Paper
                          variant='outlined'
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/node-type', t);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          onClick={() =>
                            handleAddNodeAt(
                              t,
                              120 + (nodes.length % 6) * 30,
                              120 + (nodes.length % 6) * 30
                            )
                          }
                          sx={{
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            cursor: 'grab',
                            borderColor: NODE_TYPE_BORDER_COLOR[t],
                            '&:hover': { boxShadow: 2 },
                            '&:active': { cursor: 'grabbing' },
                          }}
                        >
                          {Icon && <Icon size={16} />}
                          <Typography variant='body2'>{NODE_TYPE_LABEL[t]}</Typography>
                        </Paper>
                      </Tooltip>
                    );
                  })}
                </Stack>
              </Paper>
            </Grid>

            {/* 中间：DAG 画布 */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper
                ref={canvasViewportRef}
                onScroll={handleCanvasScroll}
                onWheel={handleCanvasWheel}
                variant='outlined'
                sx={{
                  position: 'relative',
                  height: 600,
                  overflow: 'auto',
                  bgcolor: 'grey.50',
                  backgroundImage: 'radial-gradient(circle, #e0e0e0 1px, transparent 1px)',
                  backgroundSize: `${20 * canvasZoom}px ${20 * canvasZoom}px`,
                }}
              >
                {/* 尺寸容器：用缩放后的视觉尺寸撑开可滚动区域 */}
                <Box
                  sx={{
                    position: 'relative',
                    width: CANVAS_WIDTH * canvasZoom,
                    height: CANVAS_HEIGHT * canvasZoom,
                  }}
                >
                  {/* 画布逻辑层：transform 缩放，逻辑坐标保持不变 */}
                  <Box
                    ref={canvasRef}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: CANVAS_WIDTH,
                      height: CANVAS_HEIGHT,
                      transform: `scale(${canvasZoom})`,
                      transformOrigin: '0 0',
                    }}
                  >
                    {/* SVG 连线层 */}
                    <svg
                      width={CANVAS_WIDTH}
                      height={CANVAS_HEIGHT}
                      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                    >
                      <defs>
                        <marker
                          id='dag-arrowhead'
                          markerWidth='10'
                          markerHeight='7'
                          refX='9'
                          refY='3.5'
                          orient='auto'
                        >
                          <polygon
                            points='0 0, 10 3.5, 0 7'
                            fill='#9e9e9e'
                          />
                        </marker>
                      </defs>
                      {edges.map((edge) => {
                        const path = computeEdgePath(edge.sourcePos, edge.targetPos);
                        return (
                          <path
                            key={edge.id}
                            d={path}
                            stroke='#9e9e9e'
                            strokeWidth={2}
                            fill='none'
                            markerEnd='url(#dag-arrowhead)'
                          />
                        );
                      })}
                    </svg>

                    {/* 节点层 */}
                    {nodes.map((node) => {
                      const Icon = NODE_TYPE_ICON[node.type];
                      const isSelected = selectedNodeId === node.id;
                      return (
                        <Paper
                          key={node.id}
                          elevation={isSelected ? 4 : 1}
                          onMouseDown={(e) => handleNodeMouseDown(e, node)}
                          sx={{
                            position: 'absolute',
                            left: node.position.x,
                            top: node.position.y,
                            width: NODE_WIDTH,
                            minHeight: NODE_HEIGHT,
                            p: 1,
                            cursor: 'move',
                            border: isSelected ? 2 : 1,
                            borderColor: isSelected
                              ? 'primary.main'
                              : NODE_TYPE_BORDER_COLOR[node.type],
                            bgcolor: 'background.paper',
                            zIndex: isSelected ? 2 : 1,
                            userSelect: 'none',
                          }}
                        >
                          <Stack
                            direction='row'
                            spacing={1}
                            sx={{ mb: 0.5, alignItems: 'center' }}
                          >
                            {Icon && <Icon size={18} />}
                            <Typography
                              variant='body2'
                              noWrap
                              sx={{ flex: 1, fontWeight: isSelected ? 600 : 400 }}
                            >
                              {node.name}
                            </Typography>
                          </Stack>
                          <Stack
                            direction='row'
                            spacing={0.5}
                            sx={{ alignItems: 'center' }}
                          >
                            <Chip
                              size='small'
                              color={NODE_TYPE_COLOR[node.type]}
                              label={NODE_TYPE_LABEL[node.type]}
                              sx={{ height: 18, fontSize: 10 }}
                            />
                            {node.isNew && (
                              <Typography
                                variant='caption'
                                color='warning.main'
                              >
                                未保存
                              </Typography>
                            )}
                          </Stack>
                        </Paper>
                      );
                    })}

                    {nodes.length === 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <CanvasModeIcon
                          size={48}
                          style={{ opacity: 0.3 }}
                        />
                        <Typography
                          color='text.secondary'
                          sx={{ mt: 1 }}
                        >
                          画布为空，从左侧拖拽节点类型到此处
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* 缩放控制工具栏（右下角悬浮，不随滚动移动） */}
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    alignItems: 'center',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.92)',
                    boxShadow: 1,
                    zIndex: 10,
                  }}
                >
                  <Tooltip title='放大 (Ctrl+滚轮)'>
                    <IconButton
                      size='small'
                      onClick={handleZoomIn}
                      disabled={canvasZoom >= ZOOM_MAX}
                    >
                      <ZoomInIcon size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='缩小 (Ctrl+滚轮)'>
                    <IconButton
                      size='small'
                      onClick={handleZoomOut}
                      disabled={canvasZoom <= ZOOM_MIN}
                    >
                      <ZoomOutIcon size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='适配视图'>
                    <IconButton
                      size='small'
                      onClick={handleZoomFit}
                      disabled={nodes.length === 0}
                    >
                      <FitIcon size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='重置 (100%)'>
                    <IconButton
                      size='small'
                      onClick={handleZoomReset}
                    >
                      <ResetIcon size={18} />
                    </IconButton>
                  </Tooltip>
                  <Typography
                    variant='caption'
                    sx={{ minWidth: 38, textAlign: 'center' }}
                  >
                    {Math.round(canvasZoom * 100)}%
                  </Typography>
                </Stack>

                {/* Minimap 缩略图（右上角悬浮） */}
                {nodes.length > 0 && (
                  <Paper
                    elevation={2}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      p: 0.5,
                      bgcolor: 'rgba(255,255,255,0.92)',
                      pointerEvents: 'none',
                    }}
                  >
                    <svg
                      width={168}
                      height={112}
                      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                      preserveAspectRatio='xMidYMid meet'
                    >
                      {edges.map((edge) => {
                        const sx = edge.sourcePos.x + NODE_WIDTH;
                        const sy = edge.sourcePos.y + NODE_HEIGHT / 2;
                        const tx = edge.targetPos.x;
                        const ty = edge.targetPos.y + NODE_HEIGHT / 2;
                        return (
                          <line
                            key={edge.id}
                            x1={sx}
                            y1={sy}
                            x2={tx}
                            y2={ty}
                            stroke='#bdbdbd'
                            strokeWidth={6}
                          />
                        );
                      })}
                      {nodes.map((node) => {
                        const isSelected = selectedNodeId === node.id;
                        return (
                          <rect
                            key={node.id}
                            x={node.position.x}
                            y={node.position.y}
                            width={NODE_WIDTH}
                            height={NODE_HEIGHT}
                            rx={8}
                            fill={isSelected ? '#1976d2' : '#9e9e9e'}
                          />
                        );
                      })}
                      {/* 当前视口指示框 */}
                      <rect
                        x={Math.max(0, viewport.x)}
                        y={Math.max(0, viewport.y)}
                        width={Math.min(CANVAS_WIDTH, viewport.w)}
                        height={Math.min(CANVAS_HEIGHT, viewport.h)}
                        fill='none'
                        stroke='#1976d2'
                        strokeWidth={24}
                        strokeDasharray='48 24'
                      />
                    </svg>
                    <Typography
                      variant='caption'
                      sx={{ display: 'block', textAlign: 'center', lineHeight: 1, fontSize: 9 }}
                    >
                      缩略图
                    </Typography>
                  </Paper>
                )}
              </Paper>
            </Grid>

            {/* 右侧：节点属性配置面板 */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper
                variant='outlined'
                sx={{ p: 2, height: '100%', minHeight: 600 }}
              >
                {selectedNode ? (
                  <Stack spacing={2}>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Typography
                        variant='subtitle2'
                        sx={{ flex: 1 }}
                      >
                        节点属性
                      </Typography>
                      <Tooltip title='复制节点 (Ctrl/Cmd+D)'>
                        <IconButton
                          size='small'
                          onClick={() => handleDuplicateNode(selectedNode.id)}
                          aria-label='复制'
                        >
                          <DuplicateIcon size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='删除节点 (Delete)'>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDeleteNode(selectedNode.id)}
                          aria-label='删除'
                        >
                          <DeleteIcon size={18} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Divider />
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        节点 ID
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {selectedNode.id}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ mb: 0.5, display: 'block' }}
                      >
                        节点类型
                      </Typography>
                      <Chip
                        size='small'
                        color={NODE_TYPE_COLOR[selectedNode.type]}
                        label={NODE_TYPE_LABEL[selectedNode.type]}
                      />
                    </Box>
                    <TextField
                      label='节点名称'
                      value={selectedNode.name}
                      onChange={(e) => handleUpdateNodeName(selectedNode.id, e.target.value)}
                      size='small'
                      fullWidth
                    />
                    <Stack
                      direction='row'
                      spacing={1}
                    >
                      <TextField
                        label='X 坐标'
                        type='number'
                        value={Math.round(selectedNode.position.x)}
                        onChange={(e) =>
                          handleUpdateNodePosition(
                            selectedNode.id,
                            Number(e.target.value),
                            selectedNode.position.y
                          )
                        }
                        size='small'
                        fullWidth
                      />
                      <TextField
                        label='Y 坐标'
                        type='number'
                        value={Math.round(selectedNode.position.y)}
                        onChange={(e) =>
                          handleUpdateNodePosition(
                            selectedNode.id,
                            selectedNode.position.x,
                            Number(e.target.value)
                          )
                        }
                        size='small'
                        fullWidth
                      />
                    </Stack>
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ mb: 0.5, display: 'block' }}
                      >
                        节点配置（JSON）
                      </Typography>
                      <TextField
                        value={configDraft}
                        onChange={(e) => setConfigDraft(e.target.value)}
                        multiline
                        rows={6}
                        size='small'
                        fullWidth
                        sx={{ fontFamily: 'monospace' }}
                      />
                      <Button
                        size='small'
                        onClick={handleApplyConfig}
                        sx={{ mt: 0.5 }}
                      >
                        应用配置
                      </Button>
                    </Box>
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ mb: 0.5, display: 'block' }}
                      >
                        下游节点（连线）
                      </Typography>
                      <Stack spacing={0.5}>
                        {nodes
                          .filter((n) => n.id !== selectedNode.id)
                          .map((n) => {
                            const checked = (selectedNode.next_nodes ?? []).includes(n.id);
                            return (
                              <Stack
                                key={n.id}
                                direction='row'
                                spacing={1}
                                sx={{
                                  p: 0.5,
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  alignItems: 'center',
                                  '&:hover': { bgcolor: 'action.hover' },
                                }}
                                onClick={() => handleToggleNextNode(selectedNode.id, n.id)}
                              >
                                <Chip
                                  size='small'
                                  variant={checked ? 'filled' : 'outlined'}
                                  color={checked ? 'primary' : 'default'}
                                  label={checked ? '✓' : '○'}
                                  sx={{ height: 18, minWidth: 24 }}
                                />
                                <Typography
                                  variant='body2'
                                  noWrap
                                >
                                  {n.name}
                                </Typography>
                              </Stack>
                            );
                          })}
                        {nodes.filter((n) => n.id !== selectedNode.id).length === 0 && (
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            暂无其他节点可连接
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                ) : (
                  <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Typography color='text.secondary'>点击画布中的节点查看并编辑属性</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        <NodeEditDialog
          node={editNode}
          onClose={() => setEditNode(null)}
          onSave={handleSaveNode}
        />
      </Box>
    </PageContainer>
  );
};

const NodeEditDialog: React.FC<{
  node: DesignerNodeItem | null;
  onClose: () => void;
  onSave: (node: DesignerNodeItem) => void;
}> = ({ node, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [configText, setConfigText] = useState('{}');
  const [nextNodes, setNextNodes] = useState('');

  useEffect(() => {
    if (node) {
      setName(node.name);
      setConfigText(JSON.stringify(node.config ?? {}, null, 2));
      setNextNodes((node.next_nodes ?? []).join(','));
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(configText);
    } catch {
      // keep empty config
    }
    onSave({
      ...node,
      name,
      config,
      next_nodes: nextNodes
        ? nextNodes
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    });
  };

  return (
    <Dialog
      open={Boolean(node)}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>编辑节点</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
        >
          <TextField
            label='节点名称'
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label='节点配置（JSON）'
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            fullWidth
            multiline
            rows={6}
          />
          <TextField
            label='下游节点 ID（逗号分隔）'
            value={nextNodes}
            onChange={(e) => setNextNodes(e.target.value)}
            fullWidth
            helperText='多个节点用英文逗号分隔'
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          onClick={handleSave}
          variant='contained'
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutomationDesignerPage;
