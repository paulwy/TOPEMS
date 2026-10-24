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
