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

class ModelVersionManagerImpl {
  private models: Map<string, Model> = new Map();
  private listeners: Set<Listener> = new Set();

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  register_model(name: string, type: string, description: string, owner: string): Model {
    const id = generateId();
    const model: Model = {
      id,
      name,
      type,
      description,
      versions: [],
      owner,
    };
    this.models.set(id, model);
    this.notify();
    return model;
  }

  publish_version(modelId: string, version: string, metrics: Record<string, number>): ModelVersion {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    const existing = model.versions.find((v) => v.version === version);
    if (existing) throw new Error(`Version ${version} already exists for model ${modelId}`);

    const mv: ModelVersion = {
      id: generateId(),
      modelId,
      version,
      status: 'Active',
      metrics,
      createdAt: Date.now(),
    };

    model.versions.push(mv);
    this.notify();
    return mv;
  }

  activate_version(modelId: string, versionId: string): void {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    const target = model.versions.find((v) => v.id === versionId);
    if (!target) throw new Error(`Version not found: ${versionId}`);

    model.versions.forEach((v) => {
      if (v.status === 'Active') v.status = 'Deprecated';
    });
    target.status = 'Active';
    this.notify();
  }

  deprecate_version(modelId: string, versionId: string): void {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    const target = model.versions.find((v) => v.id === versionId);
    if (!target) throw new Error(`Version not found: ${versionId}`);

    target.status = 'Deprecated';
    this.notify();
  }

  archive_version(modelId: string, versionId: string): void {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    const target = model.versions.find((v) => v.id === versionId);
    if (!target) throw new Error(`Version not found: ${versionId}`);

    target.status = 'Archived';
    this.notify();
  }

  get_model_versions(modelId: string): ModelVersion[] {
    const model = this.models.get(modelId);
    return model ? [...model.versions].sort((a, b) => b.createdAt - a.createdAt) : [];
  }

  get_active_model(modelId: string): ModelVersion | null {
    const model = this.models.get(modelId);
    if (!model) return null;
    return model.versions.find((v) => v.status === 'Active') ?? null;
  }

  get_model(modelId: string): Model | null {
    return this.models.get(modelId) ?? null;
  }

  list_models(): Model[] {
    return Array.from(this.models.values());
  }

  compare_versions(modelId: string, versionAId: string, versionBId: string): VersionCompareResult {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);

    const va = model.versions.find((v) => v.id === versionAId);
    const vb = model.versions.find((v) => v.id === versionBId);
    if (!va) throw new Error(`Version not found: ${versionAId}`);
    if (!vb) throw new Error(`Version not found: ${versionBId}`);

    const keysA = Object.keys(va.metrics);
    const keysB = Object.keys(vb.metrics);
    const keysBSet = new Set(keysB);
    const keysASet = new Set(keysA);

    const added = keysB.filter((k) => !keysASet.has(k));
    const removed = keysA.filter((k) => !keysBSet.has(k));
    const changed: string[] = [];
    const metricDeltas: Record<string, number> = {};

    keysA.forEach((key) => {
      if (keysBSet.has(key)) {
        const delta = vb.metrics[key] - va.metrics[key];
        metricDeltas[key] = delta;
        if (Math.abs(delta) > 0.001) changed.push(key);
      }
    });

    return { added, removed, changed, metricDeltas };
  }

  seed(): void {
    if (this.models.size > 0) return;

    const m1 = this.register_model('TOPEMS-NLU', 'nlu', 'TOPEMS 自然语言理解模型', 'ai-team');
    this.publish_version(m1.id, 'v1.0.0', { accuracy: 0.82, latency: 120, f1: 0.78 });
    this.publish_version(m1.id, 'v1.1.0', { accuracy: 0.85, latency: 110, f1: 0.81 });
    this.publish_version(m1.id, 'v2.0.0', { accuracy: 0.9, latency: 95, f1: 0.87 });
    const activeV = this.get_active_model(m1.id);
    if (activeV) this.activate_version(m1.id, activeV.id);

    const m2 = this.register_model(
      'TOPEMS-Copilot',
      'copilot',
      'TOPEMS Copilot 助手模型',
      'ai-team'
    );
    this.publish_version(m2.id, 'v1.0.0', { accuracy: 0.88, latency: 80, satisfaction: 0.82 });
    this.publish_version(m2.id, 'v1.1.0', { accuracy: 0.91, latency: 72, satisfaction: 0.86 });

    const m3 = this.register_model('TOPEMS-Ops', 'ops', 'TOPEMS 智能运维模型', 'ops-team');
    this.publish_version(m3.id, 'v1.0.0', { anomalyRate: 0.05, mttr: 12, precision: 0.88 });
    this.publish_version(m3.id, 'v1.0.1', { anomalyRate: 0.03, mttr: 10, precision: 0.91 });
  }
}

export const modelVersionManager = new ModelVersionManagerImpl();
export { ModelVersionManagerImpl as ModelVersionManager };
