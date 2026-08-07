import React from 'react';
import {
  Zap as ZapIcon,
  Workflow as WorkflowIcon,
  Plug as PlugIcon,
  Code as CodeIcon,
  Layout as LayoutIcon,
  Bell as BellIcon,
  GitBranch as GitBranchIcon,
  Clock as ClockIcon,
  CheckCircle2 as CheckCircle2Icon,
  XCircle as XCircleIcon,
} from 'lucide-react';
import type { AutomationDesignerNode, AutomationNodeType } from '@/api/automation';

export const NODE_TYPE_LABEL: Record<AutomationNodeType, string> = {
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

export const NODE_TYPE_COLOR: Record<
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

export const NODE_TYPE_ICON: Record<AutomationNodeType, React.ComponentType<{ size?: number }>> = {
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

export const NODE_TYPE_BORDER_COLOR: Record<AutomationNodeType, string> = {
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

export const NODE_WIDTH = 184;
export const NODE_HEIGHT = 64;
export const CANVAS_WIDTH = 2400;
export const CANVAS_HEIGHT = 1600;

export interface DesignerNodeItem extends AutomationDesignerNode {
  isNew?: boolean;
}

export interface DesignerCanvasEdge {
  id: string;
  source: string;
  target: string;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
}

export type DesignerMode = 'form' | 'canvas';

export function computeEdgePath(
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
