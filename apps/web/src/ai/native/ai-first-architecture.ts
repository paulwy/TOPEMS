import i18n from '@/i18n';

export type AICapabilityType =
  | 'reasoning'
  | 'generation'
  | 'classification'
  | 'routing'
  | 'adaptation'
  | 'prediction'
  | 'optimization'
  | 'monitoring';

export type CapabilityStatus = 'active' | 'inactive' | 'degraded' | 'error';

export interface AICapability {
  id: string;
  name: string;
  type: AICapabilityType;
  config: Record<string, unknown>;
  status: CapabilityStatus;
  description?: string;
  version?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlatformConfig {
  ai_enabled: boolean;
  auto_optimize: boolean;
  intelligent_routing: boolean;
  adaptive_ui: boolean;
  learning_rate: number;
  max_concurrent_capabilities: number;
  fallback_on_error: boolean;
  telemetry_enabled: boolean;
  config_version: string;
}

export interface MiddlewareContext {
  timestamp: number;
  requestId: string;
  source: string;
  metadata: Record<string, unknown>;
}

export interface MiddlewareResult {
  success: boolean;
  data?: unknown;
  error?: string;
  latency: number;
}

export type MiddlewareHandler = (
  context: MiddlewareContext,
  next: () => Promise<MiddlewareResult>
) => Promise<MiddlewareResult>;

export interface AIPlatformStatus {
  initialized: boolean;
  config: PlatformConfig;
  capabilities: {
    total: number;
    active: number;
    inactive: number;
    degraded: number;
  };
  middleware: {
    total: number;
    healthy: number;
  };
  uptime: number;
  lastCheck: number;
}

const DEFAULT_CONFIG: PlatformConfig = {
  ai_enabled: true,
  auto_optimize: true,
  intelligent_routing: true,
  adaptive_ui: true,
  learning_rate: 0.01,
  max_concurrent_capabilities: 10,
  fallback_on_error: true,
  telemetry_enabled: true,
  config_version: '54.0.0',
};

const BUILTIN_CAPABILITIES: Omit<AICapability, 'createdAt' | 'updatedAt' | 'status' | 'enabled'>[] =
  [
    {
      id: 'cap-reasoning',
      name: i18n.t('ai.ai-first-architecture.ai_0'),
      type: 'reasoning',
      config: { model: 'default', max_tokens: 2048, temperature: 0.7 },
      description: i18n.t('ai.ai-first-architecture.k0'),
      version: '54.0',
    },
    {
      id: 'cap-generation',
      name: i18n.t('ai.ai-first-architecture.k1'),
      type: 'generation',
      config: { format: 'text', max_length: 500 },
      description: i18n.t('ai.ai-first-architecture.k2'),
      version: '54.0',
    },
    {
      id: 'cap-classification',
      name: i18n.t('ai.ai-first-architecture.k3'),
      type: 'classification',
      config: { categories: 20, confidence_threshold: 0.8 },
      description: i18n.t('ai.ai-first-architecture.k4'),
      version: '54.0',
    },
    {
      id: 'cap-routing',
      name: i18n.t('ai.ai-first-architecture.k5'),
      type: 'routing',
      config: { strategy: 'hybrid', learning_enabled: true },
      description: i18n.t('ai.ai-first-architecture.k6'),
      version: '54.0',
    },
    {
      id: 'cap-adaptation',
      name: i18n.t('ai.ai-first-architecture.ui_7'),
      type: 'adaptation',
      config: { personalization_depth: 3, context_window: 50 },
      description: i18n.t('ai.ai-first-architecture.k8'),
      version: '54.0',
    },
    {
      id: 'cap-prediction',
      name: i18n.t('ai.ai-first-architecture.k9'),
      type: 'prediction',
      config: { horizon: 'short', features: ['recency', 'frequency', 'duration'] },
      description: i18n.t('ai.ai-first-architecture.k10'),
      version: '54.0',
    },
    {
      id: 'cap-optimization',
      name: i18n.t('ai.ai-first-architecture.k11'),
      type: 'optimization',
      config: { target: 'latency', auto_tune: true },
      description: i18n.t('ai.ai-first-architecture.k12'),
      version: '54.0',
    },
    {
      id: 'cap-monitoring',
      name: i18n.t('ai.ai-first-architecture.ai_1'),
      type: 'monitoring',
      config: { interval_ms: 5000, alert_threshold: 0.9 },
      description: i18n.t('ai.ai-first-architecture.ai_13'),
      version: '54.0',
    },
  ];

class AIFirstPlatformImpl {
  private static instance: AIFirstPlatformImpl | null = null;
  private config: PlatformConfig;
  private capabilities: Map<string, AICapability>;
  private middlewareChain: MiddlewareHandler[];
  private initialized: boolean;
  private startTime: number;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.capabilities = new Map();
    this.middlewareChain = [];
    this.initialized = false;
    this.startTime = Date.now();
    this.init();
  }

  static getInstance(): AIFirstPlatformImpl {
    if (!AIFirstPlatformImpl.instance) {
      AIFirstPlatformImpl.instance = new AIFirstPlatformImpl();
    }
    return AIFirstPlatformImpl.instance;
  }

  private init(): void {
    const now = Date.now();
    for (const cap of BUILTIN_CAPABILITIES) {
      this.capabilities.set(cap.id, {
        ...cap,
        status: 'active',
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    this.initialized = true;
  }

  getConfig(): PlatformConfig {
    return { ...this.config };
  }

  configurePlatform(partial: Partial<PlatformConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  enableCapability(id: string): boolean {
    const cap = this.capabilities.get(id);
    if (!cap) return false;
    cap.enabled = true;
    cap.status = 'active';
    cap.updatedAt = Date.now();
    return true;
  }

  disableCapability(id: string): boolean {
    const cap = this.capabilities.get(id);
    if (!cap) return false;
    cap.enabled = false;
    cap.status = 'inactive';
    cap.updatedAt = Date.now();
    return true;
  }

  getCapabilities(filter?: {
    type?: AICapabilityType;
    status?: CapabilityStatus;
    enabled?: boolean;
  }): AICapability[] {
    let result = Array.from(this.capabilities.values());
    if (filter?.type) result = result.filter((c) => c.type === filter.type);
    if (filter?.status) result = result.filter((c) => c.status === filter.status);
    if (filter?.enabled !== undefined) result = result.filter((c) => c.enabled === filter.enabled);
    return result;
  }

  getCapability(id: string): AICapability | undefined {
    return this.capabilities.get(id);
  }

  registerCapability(cap: Omit<AICapability, 'createdAt' | 'updatedAt'>): AICapability {
    const now = Date.now();
    const fullCap: AICapability = {
      ...cap,
      createdAt: now,
      updatedAt: now,
    };
    this.capabilities.set(cap.id, fullCap);
    return fullCap;
  }

  updateCapability(id: string, updates: Partial<AICapability>): boolean {
    const cap = this.capabilities.get(id);
    if (!cap) return false;
    Object.assign(cap, updates, { updatedAt: Date.now() });
    return true;
  }

  addMiddleware(handler: MiddlewareHandler): void {
    this.middlewareChain.push(handler);
  }

  removeMiddleware(index: number): boolean {
    if (index < 0 || index >= this.middlewareChain.length) return false;
    this.middlewareChain.splice(index, 1);
    return true;
  }

  getMiddlewareChain(): MiddlewareHandler[] {
    return [...this.middlewareChain];
  }

  async executeThroughMiddleware(context: MiddlewareContext): Promise<MiddlewareResult> {
    const chain = [...this.middlewareChain];
    let idx = 0;
    const start = performance.now();

    const next = async (): Promise<MiddlewareResult> => {
      if (idx >= chain.length) {
        return { success: true, latency: performance.now() - start };
      }
      const handler = chain[idx++];
      try {
        return await handler(context, next);
      } catch (err) {
        if (this.config.fallback_on_error) {
          return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            latency: performance.now() - start,
          };
        }
        throw err;
      }
    };

    return next();
  }

  discoverCapabilities(query?: string): AICapability[] {
    const all = this.getCapabilities();
    if (!query) return all;
    const lower = query.toLowerCase();
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.type.toLowerCase().includes(lower) ||
        (c.description?.toLowerCase().includes(lower) ?? false)
    );
  }

  getPlatformStatus(): AIPlatformStatus {
    const caps = this.getCapabilities();
    const counts = {
      total: caps.length,
      active: caps.filter((c) => c.status === 'active').length,
      inactive: caps.filter((c) => c.status === 'inactive').length,
      degraded: caps.filter((c) => c.status === 'degraded').length,
    };
    return {
      initialized: this.initialized,
      config: { ...this.config },
      capabilities: counts,
      middleware: {
        total: this.middlewareChain.length,
        healthy: this.middlewareChain.length,
      },
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      lastCheck: Date.now(),
    };
  }

  reset(): void {
    this.capabilities.clear();
    this.middlewareChain = [];
    this.config = { ...DEFAULT_CONFIG };
    this.startTime = Date.now();
    this.init();
  }
}

export const AIFirstPlatform = AIFirstPlatformImpl;
export const aiFirstPlatform = AIFirstPlatformImpl.getInstance();

export default aiFirstPlatform;
