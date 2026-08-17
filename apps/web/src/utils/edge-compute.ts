import i18n from '@/i18n';

export type EdgeCacheStrategy =
  'cache-first' | 'network-first' | 'stale-while-revalidate' | 'cache-only';

export interface EdgeEndpoint {
  id: string;
  name: string;
  region: string;
  url: string;
  weight: number;
  latency: number;
  healthy: boolean;
  lastCheck: number;
  failCount: number;
  successCount: number;
}

export interface EdgeComputeConfig {
  defaultStrategy: EdgeCacheStrategy;
  cacheTTL: number;
  maxCacheEntries: number;
  healthCheckInterval: number;
  failoverThreshold: number;
  recoveryThreshold: number;
}

interface EdgeCacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export class EdgeComputeManager {
  private endpoints: Map<string, EdgeEndpoint> = new Map();
  private cache: Map<string, EdgeCacheEntry> = new Map();
  private config: EdgeComputeConfig;
  private healthCheckTimer: number | null = null;

  constructor(config?: Partial<EdgeComputeConfig>) {
    this.config = {
      defaultStrategy: 'stale-while-revalidate',
      cacheTTL: 5 * 60 * 1000,
      maxCacheEntries: 200,
      healthCheckInterval: 30 * 1000,
      failoverThreshold: 3,
      recoveryThreshold: 5,
      ...config,
    };
  }

  registerEndpoint(endpoint: Omit<EdgeEndpoint, 'lastCheck' | 'failCount' | 'successCount'>): void {
    const now = Date.now();
    this.endpoints.set(endpoint.id, {
      ...endpoint,
      lastCheck: now,
      failCount: 0,
      successCount: 0,
    });
    this.scheduleHealthCheck();
  }

  unregisterEndpoint(id: string): boolean {
    return this.endpoints.delete(id);
  }

  selectOptimalEndpoint(region?: string): EdgeEndpoint | null {
    const healthyEndpoints = Array.from(this.endpoints.values()).filter((e) => e.healthy);
    if (healthyEndpoints.length === 0) return null;

    let candidates = healthyEndpoints;
    if (region) {
      const regionEndpoints = healthyEndpoints.filter((e) => e.region === region);
      if (regionEndpoints.length > 0) {
        candidates = regionEndpoints;
      }
    }

    candidates.sort((a, b) => {
      const scoreA = this.calculateScore(a);
      const scoreB = this.calculateScore(b);
      return scoreB - scoreA;
    });

    return candidates[0] || null;
  }

  private calculateScore(endpoint: EdgeEndpoint): number {
    const latencyScore = Math.max(0, 1000 - endpoint.latency) / 1000;
    const successRate =
      endpoint.successCount + endpoint.failCount > 0
        ? endpoint.successCount / (endpoint.successCount + endpoint.failCount)
        : 1;
    const weightScore = endpoint.weight / 100;
    return latencyScore * 0.4 + successRate * 0.4 + weightScore * 0.2;
  }

  async executeEdgeFunction<T = unknown>(
    functionName: string,
    payload?: unknown,
    options?: { region?: string; strategy?: EdgeCacheStrategy; ttl?: number }
  ): Promise<T> {
    const strategy = options?.strategy ?? this.config.defaultStrategy;
    const cacheKey = `edge:${functionName}:${JSON.stringify(payload || {})}`;

    if (strategy === 'cache-only' || strategy === 'cache-first') {
      const cached = this.getEdgeCache<T>(cacheKey);
      if (cached !== undefined) return cached;
      if (strategy === 'cache-only') {
        throw new Error(`Cache miss for ${functionName} with cache-only strategy`);
      }
    }

    const endpoint = this.selectOptimalEndpoint(options?.region);
    if (!endpoint) {
      throw new Error('No healthy edge endpoints available');
    }

    try {
      const result = await this.executeOnEndpoint<T>(endpoint, functionName, payload);
      this.recordSuccess(endpoint.id);
      this.setEdgeCache(cacheKey, result, options?.ttl ?? this.config.cacheTTL);
      return result;
    } catch (error) {
      this.recordFailure(endpoint.id);
      if (strategy === 'stale-while-revalidate') {
        const cached = this.getEdgeCache<T>(cacheKey);
        if (cached !== undefined) return cached;
      }
      throw error;
    }
  }

  private async executeOnEndpoint<T>(
    endpoint: EdgeEndpoint,
    functionName: string,
    payload?: unknown
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${endpoint.url}/edge/${functionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const latency = Date.now() - startTime;
      endpoint.latency = latency;
      endpoint.lastCheck = Date.now();

      if (!response.ok) {
        throw new Error(`Edge function ${functionName} failed: ${response.status}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      endpoint.lastCheck = Date.now();
      throw error;
    }
  }

  getEdgeCache<T = unknown>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  setEdgeCache<T = unknown>(key: string, data: T, ttl?: number): void {
    if (this.cache.size >= this.config.maxCacheEntries) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp;
          oldestKey = k;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.cacheTTL,
      key,
    });
  }

  invalidateEdgeCache(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateEdgeCachePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clearAllCache(): void {
    this.cache.clear();
  }

  getEndpoint(id: string): EdgeEndpoint | undefined {
    return this.endpoints.get(id);
  }

  getAllEndpoints(): EdgeEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheEntries,
      hitRate: 0,
    };
  }

  async checkProviderHealth(endpointId: string): Promise<boolean> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return false;

    try {
      const startTime = Date.now();
      const response = await fetch(`${endpoint.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - startTime;
      endpoint.latency = latency;
      endpoint.lastCheck = Date.now();
      endpoint.healthy = response.ok;

      if (response.ok) {
        this.recordSuccess(endpointId);
      } else {
        this.recordFailure(endpointId);
      }
      return response.ok;
    } catch {
      endpoint.lastCheck = Date.now();
      this.recordFailure(endpointId);
      return false;
    }
  }

  private recordSuccess(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return;
    endpoint.successCount++;
    endpoint.failCount = Math.max(0, endpoint.failCount - 1);
    if (!endpoint.healthy && endpoint.successCount >= this.config.recoveryThreshold) {
      endpoint.healthy = true;
    }
  }

  private recordFailure(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return;
    endpoint.failCount++;
    endpoint.successCount = Math.max(0, endpoint.successCount - 1);
    if (endpoint.healthy && endpoint.failCount >= this.config.failoverThreshold) {
      endpoint.healthy = false;
    }
  }

  private scheduleHealthCheck(): void {
    if (this.healthCheckTimer !== null) return;
    this.healthCheckTimer = window.setInterval(() => {
      this.endpoints.forEach((_, id) => {
        this.checkProviderHealth(id).catch(() => {});
      });
    }, this.config.healthCheckInterval);
  }

  destroy(): void {
    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
}

const defaultEdgeEndpoints: Array<Omit<EdgeEndpoint, 'lastCheck' | 'failCount' | 'successCount'>> =
  [
    {
      id: 'edge-cn-east',
      name: i18n.t('shared.edge-compute.k0'),
      region: 'cn-east',
      url: 'https://edge-cn-east.example.com',
      weight: 100,
      latency: 20,
      healthy: true,
    },
    {
      id: 'edge-cn-north',
      name: i18n.t('shared.edge-compute.k1'),
      region: 'cn-north',
      url: 'https://edge-cn-north.example.com',
      weight: 90,
      latency: 35,
      healthy: true,
    },
    {
      id: 'edge-cn-south',
      name: i18n.t('shared.edge-compute.k2'),
      region: 'cn-south',
      url: 'https://edge-cn-south.example.com',
      weight: 95,
      latency: 25,
      healthy: true,
    },
    {
      id: 'edge-cn-west',
      name: i18n.t('shared.edge-compute.k3'),
      region: 'cn-west',
      url: 'https://edge-cn-west.example.com',
      weight: 80,
      latency: 50,
      healthy: true,
    },
    {
      id: 'edge-ap-sg',
      name: i18n.t('shared.edge-compute.k4'),
      region: 'ap-sg',
      url: 'https://edge-ap-sg.example.com',
      weight: 70,
      latency: 80,
      healthy: true,
    },
  ];

export const edgeComputeManager = new EdgeComputeManager();

defaultEdgeEndpoints.forEach((ep) => {
  edgeComputeManager.registerEndpoint(ep);
});
