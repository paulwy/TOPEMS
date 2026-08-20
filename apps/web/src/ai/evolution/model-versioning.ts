// V58.0 平台 AI 演进 - 模型版本管理

export type VersionStatus = 'Active' | 'Deprecated' | 'Archived';

export interface ModelVersion {
  id: string;
  modelId: string;
  version: string;
  status: VersionStatus;
  metrics: Record<string, number>;
  createdAt: number;
}

export interface Model {
  id: string;
  name: string;
  type: string;
  description: string;
  versions: ModelVersion[];
  owner: string;
}

export interface VersionCompareResult {
  added: string[];
  removed: string[];
  changed: string[];
  metricDeltas: Record<string, number>;
}

type Listener = () => void;

const generateId = () => `mv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

