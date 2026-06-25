import React, { useState, useRef, type ChangeEvent } from 'react';
import { Box, Typography, TextField, FormLabel, Divider, Paper } from '@mui/material';
import { Button } from '@mui/material';
import { Plus, Trash2, Save, ZoomIn, ZoomOut, Move } from 'lucide-react';

// --- Types ---
type NodeType = 'start' | 'task' | 'approval' | 'condition' | 'end';

interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  description?: string;
  approvers?: string[];
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// --- Constants ---
const NODE_ICONS: Record<NodeType, string> = {
  start: '▶',
  task: '📝',
  approval: '✓',
  condition: '🔀',
  end: '⏹',
};

// --- Component ---
interface WorkflowDesignerProps {
  initialNodes?: NodeData[];
  initialEdges?: EdgeData[];
  onSave?: (_nodes: NodeData[], _edges: EdgeData[]) => void;
}

export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  initialNodes = [
    { id: 'node-1', type: 'start', x: 100, y: 200, label: '开始' },
    { id: 'node-2', type: 'task', x: 300, y: 200, label: '任务' },
    { id: 'node-3', type: 'end', x: 500, y: 200, label: '结束' },
  ],
  initialEdges = [
    { id: 'edge-1', source: 'node-1', target: 'node-2' },
    { id: 'edge-2', source: 'node-2', target: 'node-3' },
  ],
  onSave,
}) => {
  // --- State ---
  const [nodes, setNodes] = useState<NodeData[]>(initialNodes);
  const [edges, setEdges] = useState<EdgeData[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // --- Helpers ---
  const getNodeCenter = (node: NodeData) => {
    const width = 140;
    const height = 60;
    return {
      x: node.x + width / 2,
      y: node.y + height / 2,
    };
  };

  const generateId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // --- Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node')) return;
    if ((e.target as HTMLElement).closest('.edge')) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setSelectedNode(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const addNode = (type: NodeType) => {
    const newNode: NodeData = {
      id: generateId('node'),
      type,
      x: pan.x + 200,
      y: pan.y + 200,
      label: type === 'start' ? '开始' : type === 'end' ? '结束' : '新节点',
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.source !== id && e.target !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  const updateNode = (id: string, updates: Partial<NodeData>) => {
    setNodes(nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    if (selectedNode?.id === id) {
      setSelectedNode({ ...selectedNode, ...updates });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: NodeData) => {
    e.stopPropagation();
    setSelectedNode(node);

    const startX = e.clientX - node.x;
    const startY = e.clientY - node.y;

    const handleMove = (me: MouseEvent) => {
      const newX = me.clientX - startX;
      const newY = me.clientY - startY;
      updateNode(node.id, { x: newX, y: newY });
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFrom(nodeId);
  };

  const handlePortMouseUp = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (connectingFrom && connectingFrom !== targetId) {
      const exists = edges.some(
        (e) =>
          (e.source === connectingFrom && e.target === targetId) ||
          (e.source === targetId && e.target === connectingFrom)
      );
      if (!exists) {
        const newEdge: EdgeData = {
          id: generateId('edge'),
          source: connectingFrom,
          target: targetId,
        };
        setEdges([...edges, newEdge]);
      }
    }
    setConnectingFrom(null);
  };

  const handleCanvasMouseUp = () => {
    setConnectingFrom(null);
  };

  // --- Render ---
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        backgroundColor: 'grey.50',
      }}
    >
      {/* Toolbar */}
      <Paper
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 4,
          backgroundColor: 'white',
          borderBottom: '1px solid grey.200',
          boxShadow: 1,
          zIndex: 10,
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '1.125rem',
            mr: 4,
            color: 'grey.800',
          }}
        >
          流程设计器
        </Typography>

        <Divider
          orientation='vertical'
          sx={{ height: 24, mx: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1 }}>
          {(['start', 'task', 'approval', 'condition', 'end'] as NodeType[]).map((type) => (
            <Button
              key={type}
              onClick={() => addNode(type)}
              variant='outlined'
              size='small'
              startIcon={<Plus style={{ width: 16, height: 16 }} />}
            >
              {type === 'start'
                ? '开始'
                : type === 'task'
                  ? '任务'
                  : type === 'approval'
                    ? '审批'
                    : type === 'condition'
                      ? '条件'
                      : '结束'}
            </Button>
          ))}
        </Box>

        <Divider
          orientation='vertical'
          sx={{ height: 24, mx: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            variant='text'
            size='small'
          >
            <ZoomOut style={{ width: 16, height: 16 }} />
          </Button>
          <Typography sx={{ fontSize: 12, width: 48, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Typography>
          <Button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            variant='text'
            size='small'
          >
            <ZoomIn style={{ width: 16, height: 16 }} />
          </Button>
        </Box>

        <Divider
          orientation='vertical'
          sx={{ height: 24, mx: 2 }}
        />

        <Button
          onClick={() => onSave?.(nodes, edges)}
          sx={{ ml: 'auto' }}
        >
          <Save style={{ width: 16, height: 16, marginRight: 8 }} /> 保存
        </Button>
      </Paper>

      {/* Main Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: 'grey.100',
            position: 'relative',
            cursor: 'move',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={() => {
            handleMouseUp();
            handleCanvasMouseUp();
          }}
          onMouseLeave={() => {
            handleMouseUp();
            handleCanvasMouseUp();
          }}
        >
          <svg
            ref={svgRef}
            style={{ width: '100%', height: '100%' }}
            onMouseDown={handleMouseDown}
          >
            {/* Grid Background */}
            <defs>
              <pattern
                id='grid'
                width='20'
                height='20'
                patternUnits='userSpaceOnUse'
              >
                <path
                  d='M 20 0 L 0 0 0 20'
                  fill='none'
                  stroke='grey.200'
                  strokeWidth='1'
                />
              </pattern>
            </defs>
            <rect
              width='100%'
              height='100%'
              fill='url(#grid)'
            />

            {/* Edges and Nodes Container */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const s = getNodeCenter(sourceNode);
                const t = getNodeCenter(targetNode);

                // Simple cubic bezier for visual flair
                const dx = t.x - s.x;
                const controlXOffset = dx * 0.5;

                return (
                  <g
                    key={`edge-${edge.id}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <path
                      d={`M ${s.x} ${s.y} C ${s.x + controlXOffset} ${s.y}, ${t.x - controlXOffset} ${t.y}, ${t.x} ${t.y}`}
                      fill='none'
                      stroke='grey.500'
                      strokeWidth='2'
                    />
                    {/* Arrow Head */}
                    <polygon
                      points='0,-4 8,0 0,4'
                      fill='grey.500'
                      transform={`translate(${t.x - 8}, ${t.y}) rotate(0)`}
                    />
                  </g>
                );
              })}

              {/* Temporary Connection Line */}
              {connectingFrom && (
                <line
                  x1={getNodeCenter(nodes.find((n) => n.id === connectingFrom)!).x}
                  y1={getNodeCenter(nodes.find((n) => n.id === connectingFrom)!).y}
                  x2={dragStart.x}
                  y2={dragStart.y}
                  stroke='primary.main'
                  strokeWidth='2'
                  strokeDasharray='5,5'
                />
              )}

              {/* Nodes */}
              {nodes.map((node) => (
                <g
                  key={`node-${node.id}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  className='node'
                >
                  <rect
                    width='140'
                    height='60'
                    rx='8'
                    fill='white'
                    stroke={selectedNode?.id === node.id ? 'primary.main' : 'grey.300'}
                    strokeWidth='2'
                    style={{
                      transition: 'all',
                      filter:
                        selectedNode?.id === node.id
                          ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
                          : 'none',
                    }}
                  />
                  <rect
                    x='0'
                    y='0'
                    width='140'
                    height='60'
                    rx='8'
                    fill={selectedNode?.id === node.id ? 'primary.main' : 'black'}
                    opacity={0.1}
                  />

                  {/* Label */}
                  <text
                    x='70'
                    y='25'
                    textAnchor='middle'
                    style={{ fontSize: 12, fontWeight: 700, fill: 'grey.700' }}
                  >
                    {NODE_ICONS[node.type]} {node.label}
                  </text>
                  <text
                    x='70'
                    y='42'
                    textAnchor='middle'
                    style={{ fontSize: 10, fill: 'text.secondary' }}
                  >
                    {node.type}
                  </text>

                  {/* Ports */}
                  {/* Left Port (Target) */}
                  <circle
                    cx='0'
                    cy='30'
                    r='6'
                    fill='white'
                    stroke='text.disabled'
                    strokeWidth='2'
                    style={{ cursor: 'pointer' }}
                    onMouseUp={(e) => handlePortMouseUp(e, node.id)}
                  />
                  {/* Right Port (Source) */}
                  <circle
                    cx='140'
                    cy='30'
                    r='6'
                    fill='white'
                    stroke='text.disabled'
                    strokeWidth='2'
                    style={{ cursor: 'pointer' }}
                    onMouseDown={(e) => handlePortMouseDown(e, node.id)}
                  />
                </g>
              ))}
            </g>
          </svg>
        </Box>

        {/* Properties Panel */}
        <Paper
          sx={{
            width: 320,
            backgroundColor: 'white',
            borderLeft: '1px solid grey.200',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 4, borderBottom: '1px solid grey.200' }}>
            <Typography sx={{ fontWeight: 600, color: 'grey.800' }}>属性</Typography>
          </Box>
          <Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}>
            {selectedNode ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Box>
                  <FormLabel sx={{ color: 'text.secondary' }}>节点 ID</FormLabel>
                  <TextField
                    value={selectedNode.id}
                    disabled
                    sx={{
                      mt: 1,
                      backgroundColor: 'grey.100',
                    }}
                    fullWidth
                  />
                </Box>
                <Box>
                  <FormLabel sx={{ color: 'text.secondary' }}>类型</FormLabel>
                  <Box
                    sx={{
                      mt: 2,
                      fontSize: 14,
                      p: '4px 8px',
                      borderRadius: 1,
                      backgroundColor: 'grey.100',
                    }}
                  >
                    {selectedNode.type}
                  </Box>
                </Box>
                <Box>
                  <FormLabel sx={{ color: 'text.secondary' }}>标签</FormLabel>
                  <TextField
                    value={selectedNode.label}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateNode(selectedNode.id, { label: e.target.value })
                    }
                    sx={{ mt: 1 }}
                    fullWidth
                  />
                </Box>
                <Box>
                  <FormLabel sx={{ color: 'text.secondary' }}>描述</FormLabel>
                  <TextField
                    value={selectedNode.description || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateNode(selectedNode.id, {
                        description: e.target.value,
                      })
                    }
                    sx={{ mt: 1 }}
                    fullWidth
                  />
                </Box>
                {(selectedNode.type === 'approval' || selectedNode.type === 'task') && (
                  <>
                    <Divider />
                    <Box>
                      <FormLabel sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                        审批人
                      </FormLabel>
                      <TextField
                        value={(selectedNode.approvers || []).join(', ')}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const approvers = e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0);
                          updateNode(selectedNode.id, { approvers });
                        }}
                        sx={{ mt: 1 }}
                        fullWidth
                        placeholder='输入用户ID，多个用逗号分隔'
                        size='small'
                      />
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        多个审批人用逗号分隔
                      </Typography>
                    </Box>
                  </>
                )}
                <Divider />
                <Button
                  variant='contained'
                  color='error'
                  fullWidth
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 style={{ width: 16, height: 16, marginRight: 8 }} /> 删除节点
                </Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 10 }}>
                <Move
                  style={{
                    width: 40,
                    height: 40,
                    margin: '0 auto 8px',
                    opacity: 0.5,
                  }}
                />
                <Typography>选择一个节点来编辑属性</Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default WorkflowDesigner;
