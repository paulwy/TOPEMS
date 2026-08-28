import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Input, Button, Tag, Tooltip, Empty, Spin } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, ReloadOutlined, FullscreenOutlined } from '@ant-design/icons';

// 知识图谱节点
export interface GraphNode {
  id: string;
  label: string;
  type: string;
  weight?: number;
  properties?: Record<string, any>;
  communityId?: string;
}

// 知识图谱关系
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  weight?: number;
}

// 知识图谱数据
export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeStatistics?: Record<string, number>;
  edgeStatistics?: Record<string, number>;
}

// 组件属性
interface KnowledgeGraphVisualizationProps {
  data?: KnowledgeGraphData;
  loading?: boolean;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  title?: string;
}

// 节点位置
interface NodePosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// 社区颜色
const COMMUNITY_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
  '#a0d911', '#2f54eb',
];

// 节点类型图标
const NODE_TYPE_ICONS: Record<string, string> = {
  concept: '💡',
  person: '👤',
  organization: '🏢',
  document: '📄',
  project: '📊',
  task: '✅',
  skill: '🎯',
  department: '🏛️',
  product: '📦',
  process: '⚙️',
  default: '📌',
};

const KnowledgeGraphVisualization: React.FC<KnowledgeGraphVisualizationProps> = ({
  data,
  loading = false,
  height = 500,
  onNodeClick,
  onEdgeClick,
  title = '知识图谱可视化',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 力导向布局计算
  const calculateLayout = useCallback(() => {
    if (!data || data.nodes.length === 0) return;

    const width = 800;
    const height_val = 600;
    const newPositions = new Map<string, NodePosition>();

    // 初始化位置（圆形布局）
    const centerX = width / 2;
    const centerY = height_val / 2;
    const radius = Math.min(width, height_val) / 3;

    data.nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / data.nodes.length;
      newPositions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      });
    });

    // 简单的力导向迭代
    const iterations = 100;
    const k = 50; // 弹簧常数
    const repulsion = 5000; // 排斥力
    const damping = 0.85; // 阻尼

    for (let iter = 0; iter < iterations; iter++) {
      // 计算力
      const forces = new Map<string, { fx: number; fy: number }>();

      data.nodes.forEach(node => {
        forces.set(node.id, { fx: 0, fy: 0 });
      });

      // 节点间排斥力
      for (let i = 0; i < data.nodes.length; i++) {
        for (let j = i + 1; j < data.nodes.length; j++) {
          const pos1 = newPositions.get(data.nodes[i].id)!;
          const pos2 = newPositions.get(data.nodes[j].id)!;
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          const f1 = forces.get(data.nodes[i].id)!;
          const f2 = forces.get(data.nodes[j].id)!;
          f1.fx -= fx;
          f1.fy -= fy;
          f2.fx += fx;
          f2.fy += fy;
        }
      }

      // 边的吸引力（胡克定律）
      data.edges.forEach(edge => {
        const pos1 = newPositions.get(edge.source);
        const pos2 = newPositions.get(edge.target);
        if (!pos1 || !pos2) return;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = k * (dist - 100);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        const f1 = forces.get(edge.source)!;
        const f2 = forces.get(edge.target)!;
        f1.fx += fx;
        f1.fy += fy;
        f2.fx -= fx;
        f2.fy -= fy;
      });

      // 更新位置
      data.nodes.forEach(node => {
        const pos = newPositions.get(node.id)!;
        const force = forces.get(node.id)!;
        pos.vx = (pos.vx + force.fx * 0.01) * damping;
        pos.vy = (pos.vy + force.fy * 0.01) * damping;
        pos.x += pos.vx;
        pos.y += pos.vy;

        // 边界限制
        pos.x = Math.max(50, Math.min(width - 50, pos.x));
        pos.y = Math.max(50, Math.min(height_val - 50, pos.y));
      });
    }

    setPositions(newPositions);
  }, [data]);

  useEffect(() => {
    calculateLayout();
  }, [calculateLayout]);

  // 过滤节点
  const filteredNodes = data?.nodes.filter(node =>
    !searchText ||
    node.label.toLowerCase().includes(searchText.toLowerCase()) ||
    node.type.toLowerCase().includes(searchText.toLowerCase())
  ) || [];

  // 获取节点颜色
  const getNodeColor = (node: GraphNode) => {
    if (node.communityId) {
      const index = parseInt(node.communityId.replace(/\D/g, '')) % COMMUNITY_COLORS.length;
      return COMMUNITY_COLORS[index] || '#1890ff';
    }
    return '#1890ff';
  };

  // 获取节点图标
  const getNodeIcon = (type: string) => {
    return NODE_TYPE_ICONS[type] || NODE_TYPE_ICONS.default;
  };

  // 处理节点点击
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    onNodeClick?.(node);
  };

  // 处理边点击
  const handleEdgeClick = (edge: GraphEdge) => {
    onEdgeClick?.(edge);
  };

  // 缩放控制
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    calculateLayout();
  };

  // 拖拽平移
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 渲染边
  const renderEdges = () => {
    return data?.edges.map(edge => {
      const sourcePos = positions.get(edge.source);
      const targetPos = positions.get(edge.target);
      if (!sourcePos || !targetPos) return null;

      const isHighlighted = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);

      return (
        <g key={edge.id} onClick={() => handleEdgeClick(edge)} style={{ cursor: 'pointer' }}>
          <line
            x1={sourcePos.x}
            y1={sourcePos.y}
            x2={targetPos.x}
            y2={targetPos.y}
            stroke={isHighlighted ? '#1890ff' : '#d9d9d9'}
            strokeWidth={isHighlighted ? 2 : 1}
            strokeOpacity={isHighlighted ? 1 : 0.6}
          />
          {(isHighlighted || zoom > 1.5) && (
            <text
              x={(sourcePos.x + targetPos.x) / 2}
              y={(sourcePos.y + targetPos.y) / 2}
              textAnchor="middle"
              fontSize="10"
              fill="#8c8c8c"
              style={{ pointerEvents: 'none' }}
            >
              {edge.label}
            </text>
          )}
        </g>
      );
    });
  };

  // 渲染节点
  const renderNodes = () => {
    return filteredNodes.map(node => {
      const pos = positions.get(node.id);
      if (!pos) return null;

      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode === node.id;
      const radius = (node.weight || 1) * 15 + 10;

      return (
        <g
          key={node.id}
          transform={`translate(${pos.x}, ${pos.y})`}
          onClick={() => handleNodeClick(node)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
          style={{ cursor: 'pointer' }}
        >
          <circle
            r={radius}
            fill={getNodeColor(node)}
            stroke={isSelected ? '#faad14' : isHovered ? '#fff' : 'none'}
            strokeWidth={isSelected ? 3 : isHovered ? 2 : 0}
            opacity={hoveredNode && !isHovered ? 0.3 : 1}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="14"
            style={{ pointerEvents: 'none' }}
          >
            {getNodeIcon(node.type)}
          </text>
          {(isHovered || isSelected || zoom > 1.2) && (
            <text
              y={radius + 12}
              textAnchor="middle"
              fontSize="11"
              fill="#333"
              style={{ pointerEvents: 'none' }}
            >
              {node.label.length > 10 ? node.label.slice(0, 10) + '...' : node.label}
            </text>
          )}
        </g>
      );
    });
  };

  if (loading) {
    return (
      <Card title={title} style={{ height }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin size="large" tip="加载知识图谱..." />
        </div>
      </Card>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <Card title={title} style={{ height }}>
        <Empty description="暂无知识图谱数据" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Tag color="blue">节点: {data.nodes.length}</Tag>
            <Tag color="green">关系: {data.edges.length}</Tag>
          </div>
        </div>
      }
      extra={
        <Input.Search
          placeholder="搜索节点..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
      }
      style={{ height }}
      bodyStyle={{ padding: 0, height: 'calc(100% - 57px)' }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: '#fafafa',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {renderEdges()}
            {renderNodes()}
          </g>
        </svg>

        {/* 控制面板 */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            background: '#fff',
            padding: 8,
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <Tooltip title="放大">
            <Button size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
          </Tooltip>
          <Tooltip title="缩小">
            <Button size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
          </Tooltip>
          <Tooltip title="重置">
            <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />
          </Tooltip>
        </div>

        {/* 缩放比例 */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            background: 'rgba(255,255,255,0.9)',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            color: '#666',
          }}
        >
          缩放: {Math.round(zoom * 100)}%
        </div>

        {/* 选中节点详情 */}
        {selectedNode && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              background: '#fff',
              padding: 12,
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              maxWidth: 280,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>{getNodeIcon(selectedNode.type)} {selectedNode.label}</strong>
              <Button size="small" type="text" onClick={() => setSelectedNode(null)}>×</Button>
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              <div>类型: <Tag color="blue">{selectedNode.type}</Tag></div>
              {selectedNode.weight && <div>权重: {selectedNode.weight.toFixed(2)}</div>}
              {selectedNode.communityId && <div>社区: {selectedNode.communityId}</div>}
              {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>属性:</div>
                  {Object.entries(selectedNode.properties).slice(0, 5).map(([key, value]) => (
                    <div key={key}>{key}: {String(value)}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default KnowledgeGraphVisualization;
