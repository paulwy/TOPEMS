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
