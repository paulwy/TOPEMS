import React from "react";
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
interface WorkflowDesignerProps {
    initialNodes?: NodeData[];
    initialEdges?: EdgeData[];
    onSave?: (_nodes: NodeData[], _edges: EdgeData[]) => void;
}
export declare const WorkflowDesigner: React.FC<WorkflowDesignerProps>;
export default WorkflowDesigner;
