export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'gateway' | 'subprocess';
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  config?: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  condition?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  code: string;
  version: number;
  status: 'draft' | 'active' | 'disabled';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  definitionVersion: number;
  status: 'running' | 'completed' | 'cancelled';
  currentNodeId: string;
  initiatorId: string;
  variables: Record<string, any>;
}

export interface WorkflowTask {
  id: string;
  instanceId: string;
  nodeId: string;
  nodeName: string;
  assigneeId?: string;
  candidateUsers?: string[];
  candidateRoles?: string[];
  status: 'pending' | 'completed' | 'rejected';
  action?: string;
  comment?: string;
  dueDate?: string;
}
