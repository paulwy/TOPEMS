import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
  Button,
  MenuItem,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  HowToReg,
  CallSplit,
  CallMerge,
  ChevronRight,
  Save,
  ZoomIn,
  ZoomOut,
  RestartAlt,
  Visibility,
} from '@mui/icons-material';

interface FlowNode {
  id: string;
  type: 'start' | 'end' | 'approval' | 'condition' | 'parallel';
  label: string;
  x: number;
  y: number;
  config?: Record<string, any>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

const nodeTypes = [
  { type: 'start' as const, label: '开始', icon: PlayArrow, color: '#2e7d32' },
  { type: 'end' as const, label: '结束', icon: Stop, color: '#c62828' },
  { type: 'approval' as const, label: '审批', icon: HowToReg, color: '#f57c00' },
  { type: 'condition' as const, label: '条件', icon: CallSplit, color: '#1565c0' },
  { type: 'parallel' as const, label: '并行', icon: CallMerge, color: '#7b1fa2' },
];

const initialNodes: FlowNode[] = [
  { id: 'start-1', type: 'start', label: '开始', x: 100, y: 200 },
  { id: 'approval-1', type: 'approval', label: '部门审批', x: 280, y: 200 },
  { id: 'condition-1', type: 'condition', label: '金额判断', x: 460, y: 200 },
  { id: 'approval-2', type: 'approval', label: '经理审批', x: 640, y: 100 },
  { id: 'approval-3', type: 'approval', label: '财务审批', x: 640, y: 300 },
  { id: 'end-1', type: 'end', label: '结束', x: 820, y: 200 },
];

const initialEdges: FlowEdge[] = [
  { id: 'e1', source: 'start-1', target: 'approval-1' },
  { id: 'e2', source: 'approval-1', target: 'condition-1' },
  { id: 'e3', source: 'condition-1', target: 'approval-2', label: '≤5000' },
  { id: 'e4', source: 'condition-1', target: 'approval-3', label: '>5000' },
  { id: 'e5', source: 'approval-2', target: 'end-1' },
  { id: 'e6', source: 'approval-3', target: 'end-1' },
];

export const FlowDesignerPage: React.FC = () => {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges] = useState<FlowEdge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const handleNodeClick = useCallback((node: FlowNode) => {
    setSelectedNode(node);
    setShowProperties(true);
  }, []);

  const handleSave = useCallback(() => {
    console.log('保存流程图', { nodes, edges });
  }, [nodes, edges]);

  const handlePreview = useCallback(() => {
    console.log('预览流程');
  }, []);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault();
      setDraggedNode(nodeId);
    },
    []
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedNode) return;
      const canvas = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - canvas.left) / (zoom / 100) - 50;
      const y = (e.clientY - canvas.top) / (zoom / 100) - 20;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggedNode ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n
        )
      );
    },
    [draggedNode, zoom]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  const handleNodeLabelChange = useCallback(
    (value: string) => {
      if (!selectedNode) return;
      setNodes((prev) =>
        prev.map((n) => (n.id === selectedNode.id ? { ...n, label: value } : n))
      );
      setSelectedNode((prev) => (prev ? { ...prev, label: value } : null));
    },
    [selectedNode]
  );

  const getNodeColor = (type: FlowNode['type']) => {
    const found = nodeTypes.find((n) => n.type === type);
    return found?.color || '#757575';
  };

  const getNodeIcon = (type: FlowNode['type']) => {
    const found = nodeTypes.find((n) => n.type === type);
    return found?.icon || PlayArrow;
  };

  const renderEdgePath = (edge: FlowEdge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return null;

    const sourceX = sourceNode.x + 100;
    const sourceY = sourceNode.y + 20;
    const targetX = targetNode.x;
    const targetY = targetNode.y + 20;
    const midX = (sourceX + targetX) / 2;

    const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
    return { path, midX: (sourceX + targetX) / 2, midY: (sourceY + targetY) / 2 };
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
      <Card sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        <CardContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                流程设计器
              </Typography>
              <Typography variant="body2" color="text.secondary">
                设计工作流程和审批节点
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<RestartAlt fontSize="small" />}
                onClick={() => setZoom(100)}
              >
                重置
              </Button>
              <Button
                size="small"
                startIcon={<ZoomOut fontSize="small" />}
                onClick={() => setZoom(Math.max(50, zoom - 10))}
              >
                缩小
              </Button>
              <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center', alignSelf: 'center' }}>
                {zoom}%
              </Typography>
              <Button
                size="small"
                startIcon={<ZoomIn fontSize="small" />}
                onClick={() => setZoom(Math.min(200, zoom + 10))}
              >
                放大
              </Button>
              <Button size="small" startIcon={<Visibility fontSize="small" />} onClick={handlePreview}>
                预览
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<Save fontSize="small" />}
                onClick={handleSave}
              >
                保存
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Card sx={{ width: 220, borderRadius: 0, borderRight: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              流程节点
            </Typography>
            <Stack spacing={1}>
              {nodeTypes.map((nodeType) => {
                const Icon = nodeType.icon;
                return (
                  <Box
                    key={nodeType.type}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      cursor: 'grab',
                      '&:hover': {
                        borderColor: 'primary.light',
                        bgcolor: 'grey.50',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        bgcolor: nodeType.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon sx={{ color: 'white', fontSize: 18 }} />
                    </Box>
                    <Typography variant="body2">{nodeType.label}</Typography>
                  </Box>
                );
              })}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              操作提示
            </Typography>
            <Typography variant="body2" color="text.secondary">
              拖拽节点可调整位置，点击节点可编辑属性
            </Typography>
          </CardContent>
        </Card>

        <Box
          sx={{
            flex: 1,
            bgcolor: 'grey.100',
            overflow: 'auto',
            position: 'relative',
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          <svg
            width="1200"
            height="600"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
            }}
          >
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {edges.map((edge) => {
              const result = renderEdgePath(edge);
              if (!result) return null;
              return (
                <g key={edge.id}>
                  <path
                    d={result.path}
                    fill="none"
                    stroke="#9e9e9e"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                  {edge.label && (
                    <text
                      x={result.midX}
                      y={result.midY - 5}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#616161"
                      style={{ userSelect: 'none' }}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#9e9e9e" />
              </marker>
            </defs>

            {nodes.map((node) => {
              const Icon = getNodeIcon(node.type);
              const isSelected = selectedNode?.id === node.id;
              const color = getNodeColor(node.type);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleNodeClick(node)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  style={{ cursor: 'move' }}
                >
                  <rect
                    x="0"
                    y="0"
                    width="100"
                    height="40"
                    rx="4"
                    fill={node.type === 'start' || node.type === 'end' ? color : 'white'}
                    stroke={isSelected ? '#1976d2' : color}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <g transform="translate(10, 10)">
                    <Icon
                      style={{
                        fontSize: 20,
                        color: node.type === 'start' || node.type === 'end' ? 'white' : color,
                      }}
                    />
                  </g>
                  <text
                    x="50"
                    y="25"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="12"
                    fill={node.type === 'start' || node.type === 'end' ? 'white' : '#424242'}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </Box>

        <Drawer
          anchor="right"
          open={showProperties}
          onClose={() => setShowProperties(false)}
          PaperProps={{ sx: { width: 320 } }}
        >
          <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                属性配置
              </Typography>
              <IconButton onClick={() => setShowProperties(false)}>
                <ChevronRight />
              </IconButton>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {selectedNode && (
              <Stack spacing={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    节点ID
                  </Typography>
                  <Typography variant="body1">{selectedNode.id}</Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    节点类型
                  </Typography>
                  <Typography variant="body1">
                    {nodeTypes.find((n) => n.type === selectedNode.type)?.label}
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  label="节点名称"
                  value={selectedNode.label}
                  onChange={(e) => handleNodeLabelChange(e.target.value)}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="节点描述"
                  multiline
                  rows={3}
                  defaultValue=""
                />

                {selectedNode.type === 'approval' && (
                  <>
                    <TextField fullWidth size="small" label="审批人" defaultValue="" />
                    <TextField
                      fullWidth
                      size="small"
                      label="审批类型"
                      select
                      defaultValue="single"
                    >
                      <MenuItem value="single">单人审批</MenuItem>
                      <MenuItem value="counter">会签审批</MenuItem>
                      <MenuItem value="or">或签审批</MenuItem>
                    </TextField>
                    <TextField
                      fullWidth
                      size="small"
                      label="超时时间（小时）"
                      type="number"
                      defaultValue={24}
                    />
                  </>
                )}

                {selectedNode.type === 'condition' && (
                  <TextField
                    fullWidth
                    size="small"
                    label="条件表达式"
                    placeholder="例如: amount > 5000"
                    defaultValue=""
                  />
                )}

                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" fullWidth>
                    取消
                  </Button>
                  <Button variant="contained" fullWidth>
                    保存
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        </Drawer>
      </Box>
    </Box>
  );
};
