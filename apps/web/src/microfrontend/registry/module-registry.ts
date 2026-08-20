import i18n from '@/i18n';

export type ModuleStatus = 'active' | 'disabled' | 'deprecated' | 'error';

export type ModuleType = 'app' | 'component' | 'library' | 'utility';

export interface ModuleRegistration {
  id: string;
  name: string;
  description?: string;
  version: string;
  entryUrl: string;
  type: ModuleType;
  status: ModuleStatus;
  metadata: Record<string, unknown>;
  dependencies: string[];
  exposes: string[];
  remotes: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ModuleFilter {
  type?: ModuleType;
  status?: ModuleStatus;
  keyword?: string;
}

const STORAGE_KEY = 'topems_mf_module_registry';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<string, ModuleRegistration> = new Map();
  private listeners: Set<(modules: ModuleRegistration[]) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  private loadFromStorage(): void {
    const stored = readStorage<Record<string, ModuleRegistration>>(STORAGE_KEY, {});
    Object.values(stored).forEach((m) => {
      this.modules.set(m.id, m);
    });
  }

  private persist(): void {
    const data: Record<string, ModuleRegistration> = {};
    this.modules.forEach((m, key) => {
      data[key] = m;
    });
    writeStorage(STORAGE_KEY, data);
  }

  private notifyListeners(): void {
    const modules = this.listModules();
    this.listeners.forEach((l) => {
      try {
        l(modules);
      } catch {
        // ignore
      }
    });
  }

  validateModule(moduleConfig: Partial<ModuleRegistration>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!moduleConfig.id) {
      errors.push(i18n.t('microfrontend.module-registry.id_0'));
    } else if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(moduleConfig.id)) {
      errors.push(i18n.t('microfrontend.module-registry.k1'));
    }

    if (!moduleConfig.name) {
      errors.push(i18n.t('microfrontend.module-registry.k2'));
    }

    if (!moduleConfig.version) {
      errors.push(i18n.t('microfrontend.module-registry.k3'));
    }

    if (!moduleConfig.entryUrl) {
      errors.push(i18n.t('microfrontend.module-registry.url_4'));
    } else if (
      !/^https?:\/\//.test(moduleConfig.entryUrl) &&
      !moduleConfig.entryUrl.startsWith('/')
    ) {
      errors.push(i18n.t('microfrontend.module-registry.url_5'));
    }

    if (!moduleConfig.type) {
      errors.push(i18n.t('microfrontend.module-registry.k6'));
    } else if (!['app', 'component', 'library', 'utility'].includes(moduleConfig.type)) {
      errors.push(i18n.t('microfrontend.module-registry.k7'));
    }

    if (!moduleConfig.status) {
      errors.push(i18n.t('microfrontend.module-registry.k8'));
    } else if (!['active', 'disabled', 'deprecated', 'error'].includes(moduleConfig.status)) {
      errors.push(i18n.t('microfrontend.module-registry.k9'));
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  registerModule(
    moduleConfig: Omit<
      ModuleRegistration,
      'createdAt' | 'updatedAt' | 'metadata' | 'dependencies' | 'exposes' | 'remotes'
    > &
      Partial<ModuleRegistration>
  ): ModuleRegistration {
    const existing = this.modules.get(moduleConfig.id);
    if (existing) {
      throw new Error(
        `${i18n.t('microfrontend.module-registry.k0')}${moduleConfig.id}${i18n.t('microfrontend.module-registry.k1')}`
      );
    }

    const validation = this.validateModule(moduleConfig);
    if (!validation.valid) {
      throw new Error(
        `${i18n.t('microfrontend.module-registry.k2')}${validation.errors.join(', ')}`
      );
    }

    const now = Date.now();
    const module: ModuleRegistration = {
      id: moduleConfig.id,
      name: moduleConfig.name,
      description: moduleConfig.description || '',
      version: moduleConfig.version,
      entryUrl: moduleConfig.entryUrl,
      type: moduleConfig.type,
      status: moduleConfig.status,
      metadata: moduleConfig.metadata || {},
      dependencies: moduleConfig.dependencies || [],
      exposes: moduleConfig.exposes || [],
      remotes: moduleConfig.remotes || [],
      createdAt: now,
      updatedAt: now,
    };

    this.modules.set(module.id, module);
    this.persist();
    this.notifyListeners();

    return module;
  }

  unregisterModule(moduleId: string): boolean {
    const existed = this.modules.has(moduleId);
    if (existed) {
      this.modules.delete(moduleId);
      this.persist();
      this.notifyListeners();
    }
    return existed;
  }

  getModule(moduleId: string): ModuleRegistration | undefined {
    return this.modules.get(moduleId);
  }

  listModules(filter?: ModuleFilter): ModuleRegistration[] {
    let result = Array.from(this.modules.values());

    if (filter) {
      if (filter.type) {
        result = result.filter((m) => m.type === filter.type);
      }
      if (filter.status) {
        result = result.filter((m) => m.status === filter.status);
      }
      if (filter.keyword) {
        const kw = filter.keyword.toLowerCase();
        result = result.filter(
          (m) =>
            m.id.toLowerCase().includes(kw) ||
            m.name.toLowerCase().includes(kw) ||
            (m.description && m.description.toLowerCase().includes(kw))
        );
      }
    }

    return result.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  updateModuleMetadata(
    moduleId: string,
    metadata: Partial<ModuleRegistration>
  ): ModuleRegistration | undefined {
    const module = this.modules.get(moduleId);
    if (!module) return undefined;

    const updated: ModuleRegistration = {
      ...module,
      ...metadata,
      id: module.id,
      createdAt: module.createdAt,
      updatedAt: Date.now(),
    };

    this.modules.set(moduleId, updated);
    this.persist();
    this.notifyListeners();

    return updated;
  }

  getModuleDependencies(moduleId: string): ModuleRegistration[] {
    const module = this.modules.get(moduleId);
    if (!module) return [];

    return module.dependencies
      .map((depId) => this.modules.get(depId))
      .filter((m): m is ModuleRegistration => !!m);
  }

  getModuleDependents(moduleId: string): ModuleRegistration[] {
    return Array.from(this.modules.values()).filter((m) => m.dependencies.includes(moduleId));
  }

  checkCircularDependencies(): { hasCircular: boolean; cycles: string[][] } {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[][] = [];
    const path: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const module = this.modules.get(nodeId);
      if (module) {
        for (const dep of module.dependencies) {
          if (!visited.has(dep)) {
            if (dfs(dep)) {
              return true;
            }
          } else if (recStack.has(dep)) {
            const cycleStartIdx = path.indexOf(dep);
            if (cycleStartIdx !== -1) {
              const cycle = path.slice(cycleStartIdx);
              cycle.push(dep);
              cycles.push([...cycle]);
            }
            return true;
          }
        }
      }

      path.pop();
      recStack.delete(nodeId);
      return false;
    };

    for (const moduleId of this.modules.keys()) {
      if (!visited.has(moduleId)) {
        dfs(moduleId);
      }
    }

    return {
      hasCircular: cycles.length > 0,
      cycles,
    };
  }

  topologicalSort(): string[] {
    const { hasCircular } = this.checkCircularDependencies();
    if (hasCircular) {
      throw new Error(i18n.t('microfrontend.module-registry.k10'));
    }

    const inDegree = new Map<string, number>();
    this.modules.forEach((_, id) => inDegree.set(id, 0));

    this.modules.forEach((module) => {
      module.dependencies.forEach((dep) => {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      });
    });

    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const module = this.modules.get(node);
      if (module) {
        module.dependencies.forEach((dep) => {
          const newDegree = (inDegree.get(dep) || 0) - 1;
          inDegree.set(dep, newDegree);
          if (newDegree === 0) {
            queue.push(dep);
          }
        });
      }
    }

    return result;
  }

  subscribe(listener: (modules: ModuleRegistration[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.modules.clear();
    this.persist();
    this.notifyListeners();
  }

  get size(): number {
    return this.modules.size;
  }
}

export const moduleRegistry = ModuleRegistry.getInstance();
export default moduleRegistry;
