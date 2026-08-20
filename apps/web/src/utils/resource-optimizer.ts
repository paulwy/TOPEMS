type PreloadAs =
  | 'script'
  | 'style'
  | 'image'
  | 'font'
  | 'video'
  | 'audio'
  | 'fetch'
  | 'document'
  | 'embed'
  | 'object'
  | 'track'
  | 'worker';

interface ConnectionPoolStats {
  total: number;
  active: number;
  idle: number;
  maxConnections: number;
}

class ConnectionPool {
  private maxConnections: number;
  private active = new Set<string>();
  private queue: Array<{ id: string; resolve: () => void }> = [];

  constructor(maxConnections = 6) {
    this.maxConnections = maxConnections;
  }

  acquire(id: string): Promise<void> {
    if (this.active.size < this.maxConnections) {
      this.active.add(id);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push({ id, resolve });
    });
  }

  release(id: string): void {
    this.active.delete(id);
    if (this.queue.length > 0 && this.active.size < this.maxConnections) {
      const next = this.queue.shift();
      if (next) {
        this.active.add(next.id);
        next.resolve();
      }
    }
  }

  getStats(): ConnectionPoolStats {
    return {
      total: this.maxConnections,
      active: this.active.size,
      idle: this.maxConnections - this.active.size,
      maxConnections: this.maxConnections,
    };
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    this.active.clear();
    this.queue = [];
  }
}

class ResourceOptimizer {
  private static preconnectedUrls = new Set<string>();
  private static dnsPrefetchedUrls = new Set<string>();
  private static preloadedUrls = new Set<string>();
  private static prefetchedUrls = new Set<string>();
  private static modulePreloadedUrls = new Set<string>();
  private static connectionPool = new ConnectionPool(8);

  static preconnect(url: string, options?: { crossOrigin?: string }): void {
    if (typeof document === 'undefined') return;
    if (this.preconnectedUrls.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    if (options?.crossOrigin) {
      link.crossOrigin = options.crossOrigin;
    }
    document.head.appendChild(link);
    this.preconnectedUrls.add(url);
  }

  static dnsPrefetch(url: string): void {
    if (typeof document === 'undefined') return;
    if (this.dnsPrefetchedUrls.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = url;
    document.head.appendChild(link);
    this.dnsPrefetchedUrls.add(url);
  }

  static preload(
    url: string,
    as: PreloadAs,
    options?: {
      media?: string;
      type?: string;
      crossOrigin?: string;
      importance?: 'auto' | 'high' | 'low';
    }
  ): void {
    if (typeof document === 'undefined') return;
    if (this.preloadedUrls.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    if (options?.media) link.media = options.media;
    if (options?.type) link.type = options.type;
    if (options?.crossOrigin) link.crossOrigin = options.crossOrigin;
    if (options?.importance) {
      (link as HTMLLinkElement & { importance: string }).importance = options.importance;
    }
    document.head.appendChild(link);
    this.preloadedUrls.add(url);
  }

  static prefetch(url: string, options?: { as?: PreloadAs; crossOrigin?: string }): void {
    if (typeof document === 'undefined') return;
    if (this.prefetchedUrls.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    if (options?.as) link.as = options.as;
    if (options?.crossOrigin) link.crossOrigin = options.crossOrigin;
    document.head.appendChild(link);
    this.prefetchedUrls.add(url);
  }

  static modulePreload(url: string): void {
    if (typeof document === 'undefined') return;
    if (this.modulePreloadedUrls.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = url;
    document.head.appendChild(link);
    this.modulePreloadedUrls.add(url);
  }

  static prioritizeRequests(
    requests: Array<{ url: string; priority: number; type?: PreloadAs }>
  ): void {
    const sorted = [...requests].sort((a, b) => b.priority - a.priority);
    sorted.forEach((req, index) => {
      const importance = index < 2 ? 'high' : index < 5 ? 'auto' : 'low';
      if (req.type) {
        this.preload(req.url, req.type, { importance });
      } else {
        this.preload(req.url, 'fetch', { importance });
      }
    });
  }

  static getConnectionPool(): ConnectionPool {
    return this.connectionPool;
  }

  static getStats(): {
    preconnected: number;
    dnsPrefetched: number;
    preloaded: number;
    prefetched: number;
    modulePreloaded: number;
    connectionPool: ConnectionPoolStats;
  } {
    return {
      preconnected: this.preconnectedUrls.size,
      dnsPrefetched: this.dnsPrefetchedUrls.size,
      preloaded: this.preloadedUrls.size,
      prefetched: this.prefetchedUrls.size,
      modulePreloaded: this.modulePreloadedUrls.size,
      connectionPool: this.connectionPool.getStats(),
    };
  }

  static reset(): void {
    this.preconnectedUrls.clear();
    this.dnsPrefetchedUrls.clear();
    this.preloadedUrls.clear();
    this.prefetchedUrls.clear();
    this.modulePreloadedUrls.clear();
    this.connectionPool.clear();
  }
}

let navPreloadSupported: boolean | null = null;

function setupNavigationPreload(registration?: ServiceWorkerRegistration): boolean {
  if (typeof registration === 'undefined') {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return false;
    return false;
  }

  if (navPreloadSupported !== null) return navPreloadSupported;

  try {
    if ('navigationPreload' in registration) {
      registration.navigationPreload.enable().catch(() => {});
      navPreloadSupported = true;
      return true;
    }
    navPreloadSupported = false;
    return false;
  } catch {
    navPreloadSupported = false;
    return false;
  }
}

function triggerNavPreload(url: string): void {
  if (typeof document === 'undefined') return;
  ResourceOptimizer.preload(url, 'document');
}

function preloadOnIdle(url: string, as: PreloadAs = 'fetch'): void {
  if (typeof window === 'undefined') return;

  const load = () => {
    ResourceOptimizer.preload(url, as);
  };

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
      load
    );
  } else {
    setTimeout(load, 1000);
  }
}

function preloadOnVisible(url: string, as: PreloadAs = 'fetch'): void {
  if (typeof document === 'undefined') return;

  const load = () => {
    ResourceOptimizer.preload(url, as);
  };

  if (document.visibilityState === 'visible') {
    load();
  } else {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        load();
        document.removeEventListener('visibilitychange', handler);
      }
    };
    document.addEventListener('visibilitychange', handler);
  }
}

export function prefetchOnIdle(url: string): void {
  if (typeof window === 'undefined') return;

  const load = () => {
    ResourceOptimizer.prefetch(url);
  };

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
      load
    );
  } else {
    setTimeout(load, 2000);
  }
}

function preloadCriticalResources(
  resources: Array<{ url: string; as: PreloadAs; priority?: number }>
): void {
  const sorted = [...resources].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  sorted.forEach((res) => {
    ResourceOptimizer.preload(res.url, res.as);
  });
}
