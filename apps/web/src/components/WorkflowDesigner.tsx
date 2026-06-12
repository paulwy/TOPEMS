import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Plus, Trash2, Save, ZoomIn, ZoomOut, Move } from "lucide-react";

// --- Types ---
type NodeType = "start" | "task" | "approval" | "condition" | "end";

interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  description?: string;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// --- Constants ---
const NODE_COLORS: Record<NodeType, string> = {
  start: "bg-green-100 border-green-500 text-green-800",
  task: "bg-blue-100 border-blue-500 text-blue-800",
  approval: "bg-purple-100 border-purple-500 text-purple-800",
  condition: "bg-yellow-100 border-yellow-500 text-yellow-800",
  end: "bg-red-100 border-red-500 text-red-800",
};

const NODE_ICONS: Record<NodeType, string> = {
  start: "▶",
  task: "📝",
  approval: "✓",
  condition: "🔀",
  end: "⏹",
};

// --- Component ---
interface WorkflowDesignerProps {
  initialNodes?: NodeData[];
  initialEdges?: EdgeData[];
  onSave?: (nodes: NodeData[], edges: EdgeData[]) => void;
}

export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  initialNodes = [
    { id: "node-1", type: "start", x: 100, y: 200, label: "开始" },
    { id: "node-2", type: "task", x: 300, y: 200, label: "任务" },
    { id: "node-3", type: "end", x: 500, y: 200, label: "结束" },
  ],
  initialEdges = [
    { id: "edge-1", source: "node-1", target: "node-2" },
    { id: "edge-2", source: "node-2", target: "node-3" },
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
    if ((e.target as HTMLElement).closest(".node")) return;
    if ((e.target as HTMLElement).closest(".edge")) return;

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
      id: generateId("node"),
      type,
      x: pan.x + 200,
      y: pan.y + 200,
      label: type === "start" ? "开始" : type === "end" ? "结束" : "新节点",
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
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
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
          (e.source === targetId && e.target === connectingFrom),
      );
      if (!exists) {
        const newEdge: EdgeData = {
          id: generateId("edge"),
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
    <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm z-10">
        <h2 className="font-bold text-lg mr-4 text-gray-800 dark:text-white">
          流程设计器
        </h2>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex gap-1">
          {(
            ["start", "task", "approval", "condition", "end"] as NodeType[]
          ).map((type) => (
            <Button
              key={type}
              onClick={() => addNode(type)}
              variant="secondary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              {type === "start"
                ? "开始"
                : type === "task"
                  ? "任务"
                  : type === "approval"
                    ? "审批"
                    : type === "condition"
                      ? "条件"
                      : "结束"}
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex gap-1">
          <Button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            variant="ghost"
            size="icon"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            variant="ghost"
            size="icon"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <Button onClick={() => onSave?.(nodes, edges)} className="ml-auto">
          <Save className="w-4 h-4 mr-2" /> 保存
        </Button>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          className="flex-1 bg-gray-100 dark:bg-gray-800 relative cursor-move"
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
            className="w-full h-full"
            onMouseDown={handleMouseDown}
          >
            {/* Grid Background */}
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Edges */}
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
                    key={edge.id}
                    className="edge cursor-pointer hover:opacity-80"
                  >
                    <path
                      d={`M ${s.x} ${s.y} C ${s.x + controlXOffset} ${s.y}, ${t.x - controlXOffset} ${t.y}, ${t.x} ${t.y}`}
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="2"
                    />
                    {/* Arrow Head */}
                    <polygon
                      points="0,-4 8,0 0,4"
                      fill="#64748b"
                      transform={`translate(${t.x - 8}, ${t.y}) rotate(0)`}
                    />
                  </g>
                );
              })}

              {/* Temporary Connection Line */}
              {connectingFrom && (
                <line
                  x1={
                    getNodeCenter(nodes.find((n) => n.id === connectingFrom)!).x
                  }
                  y1={
                    getNodeCenter(nodes.find((n) => n.id === connectingFrom)!).y
                  }
                  x2={dragStart.x} // Just using mouse pos roughly
                  y2={dragStart.y}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              )}

              {/* Nodes */}
              {nodes.map((node) => (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  className="node"
                >
                  <rect
                    width="140"
                    height="60"
                    rx="8"
                    className={`fill-white stroke-2 ${selectedNode?.id === node.id ? "stroke-blue-500 shadow-lg" : "stroke-gray-300"} transition-all`}
                  />
                  <rect
                    x="0"
                    y="0"
                    width="140"
                    height="60"
                    rx="8"
                    className="fill-current opacity-10"
                    style={{
                      fill: selectedNode?.id === node.id ? "#3b82f6" : "#000",
                    }}
                  />

                  {/* Label */}
                  <text
                    x="70"
                    y="25"
                    textAnchor="middle"
                    className="text-xs font-bold fill-gray-700"
                  >
                    {NODE_ICONS[node.type]} {node.label}
                  </text>
                  <text
                    x="70"
                    y="42"
                    textAnchor="middle"
                    className="text-[10px] fill-gray-500"
                  >
                    {node.type}
                  </text>

                  {/* Ports */}
                  {/* Left Port (Target) */}
                  <circle
                    cx="0"
                    cy="30"
                    r="6"
                    className="fill-white stroke-gray-400 hover:fill-blue-500 cursor-pointer"
                    onMouseUp={(e) => handlePortMouseUp(e, node.id)}
                  />
                  {/* Right Port (Source) */}
                  <circle
                    cx="140"
                    cy="30"
                    r="6"
                    className="fill-white stroke-gray-400 hover:fill-blue-500 cursor-pointer"
                    onMouseDown={(e) => handlePortMouseDown(e, node.id)}
                  />
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white">
              属性
            </h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">
                    节点 ID
                  </Label>
                  <Input
                    value={selectedNode.id}
                    disabled
                    className="mt-1 bg-gray-100 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">
                    类型
                  </Label>
                  <div className="mt-1 text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {selectedNode.type}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">
                    标签
                  </Label>
                  <Input
                    value={selectedNode.label}
                    onChange={(e) =>
                      updateNode(selectedNode.id, { label: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">
                    描述
                  </Label>
                  <Input
                    value={selectedNode.description || ""}
                    onChange={(e) =>
                      updateNode(selectedNode.id, {
                        description: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <Separator />
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> 删除节点
                </Button>
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-10">
                <Move className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>选择一个节点来编辑属性</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDesigner;
