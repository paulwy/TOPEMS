import i18n from '@/i18n';

export type ResourceType =
  'script' | 'style' | 'image' | 'font' | 'video' | 'audio' | 'json' | 'other';

export interface CdnProvider {
  id: string;
  name: string;
  baseUrl: string;
  weight: number;
  healthy: boolean;
  latency: number;
  lastCheck: number;
  successCount: number;
  failCount: number;
  bandwidthScore: number;
}

export interface ResourceMetric {
  url: string;
  resourceType: ResourceType;
  providerId: string;
  duration: number;
  size: number;
  success: boolean;
  timestamp: number;
}

interface PendingResource {
  url: string;
  resourceType: ResourceType;
  priority: number;
  resolve: (value: boolean) => void;
}

export class ResourcePriorityScheduler {
  private pending: Map<string, PendingResource> = new Map();
  private active: Set<string> = new Set();
  private maxConcurrent: number;

  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
  }

  setPriority(url: string, priority: number): void {
    const resource = this.pending.get(url);
    if (resource) {
      resource.priority = priority;
    }
  }

  getNextResources(count: number): string[] {
    const sorted = Array.from(this.pending.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, count)
      .map((r) => r.url);
    return sorted;
  }

  onResourceComplete(url: string): void {
    this.active.delete(url);
    this.processNext();
  }

  private processNext(): void {
    const availableSlots = this.maxConcurrent - this.active.size;
    if (availableSlots <= 0) return;

    const nextUrls = this.getNextResources(availableSlots);
    for (const url of nextUrls) {
      const resource = this.pending.get(url);
      if (resource) {
        this.pending.delete(url);
        this.active.add(url);
        resource.resolve(true);
      }
    }
  }

  addResource(url: string, resourceType: ResourceType, priority = 0): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.active.size < this.maxConcurrent) {
        this.active.add(url);
        resolve(true);
      } else {
        this.pending.set(url, { url, resourceType, priority, resolve });
      }
    });
  }

  getStats(): { active: number; pending: number; maxConcurrent: number } {
    return {
      active: this.active.size,
      pending: this.pending.size,
      maxConcurrent: this.maxConcurrent,
    };
  }

  clear(): void {
    this.pending.clear();
    this.active.clear();
  }
}

export class CdnScheduler {
  private providers: Map<string, CdnProvider> = new Map();
  private metrics: ResourceMetric[] = [];
  private dnsPrefetched: Set<string> = new Set();
  private preconnected: Set<string> = new Set();
  private priorityScheduler: ResourcePriorityScheduler;
  private healthCheckTimer: number | null = null;
  private maxMetrics = 500;

  constructor(maxConcurrent = 6) {
    this.priorityScheduler = new ResourcePriorityScheduler(maxConcurrent);
  }

  registerProvider(provider: Omit<CdnProvider, 'lastCheck' | 'successCount' | 'failCount'>): void {
    const now = Date.now();
    this.providers.set(provider.id, {
      ...provider,
      lastCheck: now,
      successCount: 0,
      failCount: 0,
    });
    this.scheduleHealthCheck();
  }

  unregisterProvider(id: string): boolean {
    return this.providers.delete(id);
  }

  getOptimalUrl(path: string, resourceType: ResourceType = 'other'): string {
    const provider = this.selectOptimalProvider(resourceType);
    if (!provider) return path;
    return this.buildUrl(provider.baseUrl, path);
  }

  private selectOptimalProvider(resourceType: ResourceType): CdnProvider | null {
    const healthyProviders = Array.from(this.providers.values()).filter((p) => p.healthy);
    if (healthyProviders.length === 0) return null;

    healthyProviders.sort((a, b) => {
      const scoreA = this.calculateProviderScore(a, resourceType);
      const scoreB = this.calculateProviderScore(b, resourceType);
      return scoreB - scoreA;
    });

    return healthyProviders[0] || null;
  }

  private calculateProviderScore(provider: CdnProvider, _resourceType: ResourceType): number {
    const latencyScore = Math.max(0, 2000 - provider.latency) / 2000;
    const successRate =
      provider.successCount + provider.failCount > 0
        ? provider.successCount / (provider.successCount + provider.failCount)
        : 1;
    const weightScore = provider.weight / 100;
    const bandwidthScore = provider.bandwidthScore / 100;

    return latencyScore * 0.3 + successRate * 0.3 + weightScore * 0.2 + bandwidthScore * 0.2;
  }

  private buildUrl(baseUrl: string, path: string): string {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return `${normalizedBase}${normalizedPath}`;
  }

  async preconnectToOptimal(resourceType?: ResourceType): Promise<void> {
    const provider = this.selectOptimalProvider(resourceType ?? 'other');
    if (provider && !this.preconnected.has(provider.baseUrl)) {
      this.preconnect(provider.baseUrl);
      this.preconnected.add(provider.baseUrl);
    }
  }

  private preconnect(url: string): void {
    if (typeof document === 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  prefetchDns(url: string): void {
    if (typeof document === 'undefined' || this.dnsPrefetched.has(url)) return;
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = url;
    document.head.appendChild(link);
    this.dnsPrefetched.add(url);
  }

  async checkProviderHealth(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) return false;

    try {
      const startTime = Date.now();
      const img = new Image();
      img.src = `${provider.baseUrl}/health-pixel.png?t=${Date.now()}`;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('health check failed'));
        setTimeout(() => reject(new Error('timeout')), 5000);
      });
      const latency = Date.now() - startTime;
      provider.latency = latency;
      provider.lastCheck = Date.now();
      provider.healthy = true;
      this.recordSuccess(providerId);
      return true;
    } catch {
      provider.lastCheck = Date.now();
      this.recordFailure(providerId);
      return false;
    }
  }

  recordResourceLoad(metric: Omit<ResourceMetric, 'timestamp'>): void {
    const fullMetric: ResourceMetric = {
      ...metric,
      timestamp: Date.now(),
    };
    this.metrics.push(fullMetric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    const provider = this.providers.get(metric.providerId);
    if (provider) {
      if (metric.success) {
        this.recordSuccess(metric.providerId);
      } else {
        this.recordFailure(metric.providerId);
      }
    }
  }

  private recordSuccess(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (!provider) return;
    provider.successCount++;
    provider.failCount = Math.max(0, provider.failCount - 1);
    if (!provider.healthy && provider.successCount >= 5) {
      provider.healthy = true;
    }
  }

  private recordFailure(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (!provider) return;
    provider.failCount++;
    provider.successCount = Math.max(0, provider.successCount - 1);
    if (provider.healthy && provider.failCount >= 3) {
      provider.healthy = false;
    }
  }

  private scheduleHealthCheck(): void {
    if (this.healthCheckTimer !== null) return;
    this.healthCheckTimer = window.setInterval(() => {
      this.providers.forEach((_, id) => {
        this.checkProviderHealth(id).catch(() => {});
      });
    }, 60 * 1000);
  }

  getProvider(id: string): CdnProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): CdnProvider[] {
    return Array.from(this.providers.values());
  }

  getMetrics(limit = 50): ResourceMetric[] {
    return this.metrics.slice(-limit);
  }

  getPriorityScheduler(): ResourcePriorityScheduler {
    return this.priorityScheduler;
  }

  destroy(): void {
    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    this.priorityScheduler.clear();
  }
}

const defaultCdnProviders: Array<Omit<CdnProvider, 'lastCheck' | 'successCount' | 'failCount'>> = [
  {
    id: 'cdn-jsdelivr',
    name: 'jsDelivr',
    baseUrl: 'https://cdn.jsdelivr.net',
    weight: 95,
    healthy: true,
    latency: 30,
    bandwidthScore: 90,
  },
  {
    id: 'cdn-unpkg',
    name: 'unpkg',
    baseUrl: 'https://unpkg.com',
    weight: 85,
    healthy: true,
    latency: 40,
    bandwidthScore: 85,
  },
  {
    id: 'cdn-cdnjs',
    name: 'cdnjs',
    baseUrl: 'https://cdnjs.cloudflare.com',
    weight: 90,
    healthy: true,
    latency: 35,
    bandwidthScore: 88,
  },
  {
    id: 'cdn-aliyun',
    name: i18n.t('shared.cdn-scheduler.cdn_0'),
    baseUrl: 'https://cdn.example-aliyun.com',
    weight: 100,
    healthy: true,
    latency: 15,
    bandwidthScore: 95,
  },
  {
    id: 'cdn-tencent',
    name: i18n.t('shared.cdn-scheduler.cdn_1'),
    baseUrl: 'https://cdn.example-tencent.com',
    weight: 98,
    healthy: true,
    latency: 18,
    bandwidthScore: 93,
  },
];

export const cdnScheduler = new CdnScheduler(8);

defaultCdnProviders.forEach((p) => {
  cdnScheduler.registerProvider(p);
});
