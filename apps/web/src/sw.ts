/// <reference lib="webworker" />
import type { PrecacheEntry } from 'workbox-precaching';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';
// V24.0 模块 D: PWA 缓存版本（用于强制更新缓存）
// V37.0 Phase 7: 升级缓存版本，新增远程模块入口缓存 + 智能预加载
const CACHE_VERSION = 'v37.0';
const CACHE_NAME = {
  PRECACHE: `topems-precache-${CACHE_VERSION}`,
  API: `topems-api-${CACHE_VERSION}`,
  STATIC: `topems-static-${CACHE_VERSION}`,
  IMAGES: `topems-images-${CACHE_VERSION}`,
  FONT: `topems-fonts-${CACHE_VERSION}`,
  CDN: `topems-cdn-${CACHE_VERSION}`,
  SYNC_QUEUE: `topems-sync-queue-${CACHE_VERSION}`,
  RUNTIME: `topems-runtime-${CACHE_VERSION}`,
  // V37.0: 微前端远程模块入口缓存
  REMOTE_ENTRIES: `topems-remote-entries-${CACHE_VERSION}`,
  // V37.0: GraphQL 响应缓存
  GRAPHQL: `topems-graphql-${CACHE_VERSION}`,
} as const;
// V26.0：性能优化 - 智能预缓存关键路由
// 根据业务优先级排序：登录 > 仪表盘 > 高频业务页面
const PRECACHE_ROUTES = [
  '/',
  '/login',
  '/dashboard',
  '/offline.html',
  '/manifest.json',
  // 高频业务页面
  '/mes/dashboard',
  '/production',
  '/inventory',
];
/**
 * V26.0 性能优化：缓存命中率统计
 * 用于监控缓存策略效果
 */
class CacheStatsCollector {
  private stats = {
    precache: { hits: 0, misses: 0 },
    api: { hits: 0, misses: 0 },
    static: { hits: 0, misses: 0 },
    images: { hits: 0, misses: 0 },
    runtime: { hits: 0, misses: 0 },
  };
  recordHit(cache: keyof typeof this.stats): void {
    this.stats[cache].hits++;
  }
  recordMiss(cache: keyof typeof this.stats): void {
    this.stats[cache].misses++;
  }
  getStats() {
    return { ...this.stats };
  }
  getHitRate(cache: keyof typeof this.stats): number {
    const s = this.stats[cache];
    const total = s.hits + s.misses;
    return total > 0 ? s.hits / total : 0;
  }
}
const cacheStats = new CacheStatsCollector();
declare const self: ServiceWorkerGlobalScope & {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __WB_MANIFEST: PrecacheEntry[];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __STATS?: CacheStatsCollector;
};
self.__STATS = cacheStats;
precacheAndRoute(self.__WB_MANIFEST);
// SPA 导航路由（V24.0 模块 D：失败时回退到 offline.html）
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  allowlist: [/^\/(?!api\/)/],
});
registerRoute(navigationRoute);
// 导航请求的离线回退链：网络 → SPA → offline.html
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    (async () => {
      try {
        // 1. 优先尝试网络（捕获在线状态）
        const networkResponse = await fetch(event.request);
        // 成功获取时，同时更新预缓存（用于离线访问）
        if (networkResponse.ok && event.request.method === 'GET') {
          const cache = await caches.open(CACHE_NAME.PRECACHE);
          cache.put(event.request, networkResponse.clone()).catch(() => {
            // 静默失败
          });
        }
        return networkResponse;
      } catch {
        // 2. 网络失败，尝试 SPA 入口
        try {
          const cache = await caches.open(CACHE_NAME.PRECACHE);
          const spaResponse = await cache.match('/index.html');
          if (spaResponse) return spaResponse;
          // 3. SPA 不可用，回退到 offline.html
          const offlineResponse = await cache.match('/offline.html');
          if (offlineResponse) return offlineResponse;
          // 4. 全部失败，返回 503
          return new Response('Service Unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        } catch {
          return new Response('Service Unavailable', { status: 503 });
        }
      }
    })()
  );
});
// API 请求 - Stale-While-Revalidate（5min TTL）
registerRoute(
  ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: CACHE_NAME.API,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 5 * 60,
        maxEntries: 200,
      }),
    ],
  })
);
// 静态资源（CSS/JS） - Cache First
registerRoute(
  ({ request }: { request: Request }) =>
    request.destination === 'style' || request.destination === 'script',
  new CacheFirst({
    cacheName: CACHE_NAME.STATIC,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxEntries: 100,
      }),
    ],
  })
);
// 图片 - Cache First（60天）
registerRoute(
  ({ request }: { request: Request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE_NAME.IMAGES,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 24 * 60 * 60,
        maxEntries: 200,
      }),
    ],
  })
);
// 字体 - Cache First（1年）
registerRoute(
  ({ url }: { url: URL }) =>
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.otf'),
  new CacheFirst({
    cacheName: CACHE_NAME.FONT,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 365 * 24 * 60 * 60,
        maxEntries: 50,
      }),
    ],
  })
);
// V24.0 模块 D 增强：CDN 资源（Google Fonts/Material Icons 等）- Cache First
registerRoute(
  ({ url }: { url: URL }) =>
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'unpkg.com',
  new CacheFirst({
    cacheName: CACHE_NAME.CDN,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxEntries: 100,
      }),
    ],
  })
);
// V37.0 Phase 7: 微前端远程模块入口缓存（Stale-While-Revalidate）
// 远程入口 JS 文件（remoteEntry.js）缓存后支持离线加载微前端模块
registerRoute(
  ({ url }: { url: URL }) =>
    url.pathname.includes('remoteEntry') ||
    url.pathname.includes('/microfrontend/') ||
    url.pathname.endsWith('/remote.js'),
  new StaleWhileRevalidate({
    cacheName: CACHE_NAME.REMOTE_ENTRIES,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 24 * 60 * 60, // 24 小时
        maxEntries: 50,
      }),
    ],
  })
);
// V37.0 Phase 7: GraphQL GET 请求缓存（基于 ETag 的条件请求）
// POST 请求不缓存（可能包含敏感变量），仅缓存 GET 查询
registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    url.pathname === '/api/portal/graphql' && request.method === 'GET',
  new NetworkFirst({
    cacheName: CACHE_NAME.GRAPHQL,
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 60, // 60 秒（与后端 Cache-Control 一致）
        maxEntries: 30,
      }),
    ],
  })
);
// V24.0 模块 D 增强：GET 请求的 NetworkFirst（关键 API 数据，如用户信息/权限）
registerRoute(
  ({ url, request }: { url: URL; request: Request }) =>
    url.pathname.startsWith('/api/') &&
    request.method === 'GET' &&
    (url.pathname.includes('/auth/') ||
      url.pathname.includes('/permission') ||
      url.pathname.includes('/profile')),
  new NetworkFirst({
    cacheName: CACHE_NAME.RUNTIME,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60, // 1 小时
        maxEntries: 50,
      }),
    ],
  })
);
// 后台同步：失败请求队列重放
interface SyncRequest {
  request: Request;
  timestamp: number;
}
self.addEventListener('sync', (event) => {
  const syncEvent = event as unknown as {
    tag: string;
    waitUntil: (promise: Promise<unknown>) => void;
  };
  if (syncEvent.tag === 'sync-data') {
    syncEvent.waitUntil(syncData());
  }
});
async function syncData(): Promise<void> {
  const queue = await caches.open(CACHE_NAME.SYNC_QUEUE);
  const requests = await queue.keys();
  for (const request of requests) {
    try {
      const cachedResponse = await queue.match(request);
      if (cachedResponse) {
        const syncRequest: SyncRequest = await cachedResponse.json();
        const response = await fetch(syncRequest.request);
        if (response.ok) {
          await queue.delete(request);
          logger.info('Sync successful:', request.url);
        }
      }
    } catch (error: unknown) {
      logger.error('Sync failed:', error);
    }
  }
}
// 推送通知处理（V24.0 模块 D 增强：支持 actions/vibrate/requireInteraction）
self.addEventListener('push', (event) => {
  const pushEvent = event as unknown as {
    data: {
      json: () => unknown;
    };
    waitUntil: (promise: Promise<unknown>) => void;
  };
  const payload =
    (pushEvent.data?.json() as {
      title?: string;
      body?: string;
      data?: Record<string, unknown>;
      icon?: string;
      badge?: string;
      tag?: string;
      actions?: Array<{
        action: string;
        title: string;
        icon?: string;
      }>;
      requireInteraction?: boolean;
      vibrate?: number[];
    }) || {};
  const title = payload.title || i18n.t('sw.notification.k0');
  // TS 6.x lib.dom.d.ts 中 NotificationOptions 未声明 vibrate，但 Web Notifications 规范支持该字段
  // 通过扩展类型声明保留运行时行为，同时通过类型校验
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-72x72.png',
    data: payload.data || {},
    tag: payload.tag || 'topems-notification',
    requireInteraction: payload.requireInteraction ?? false,
    vibrate: payload.vibrate ?? [200, 100, 200],
    actions: payload.actions,
  } as NotificationOptions & {
    vibrate?: number[];
  };
  pushEvent.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', (event) => {
  const notificationEvent = event as unknown as {
    notification: Notification & {
      data?: Record<string, unknown>;
    };
    action?: string;
    waitUntil: (promise: Promise<unknown>) => void;
  };
  notificationEvent.notification.close();
  // V24.0 模块 D 增强：支持 action 按钮
  const action = notificationEvent.action;
  const data = notificationEvent.notification.data || {};
  let url: string;
  if (action && data.actionUrls && typeof data.actionUrls === 'object') {
    url = (data.actionUrls as Record<string, string>)[action] || '/dashboard';
  } else {
    url = (data.url as string) || '/dashboard';
  }
  notificationEvent.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        self.clients.openWindow(url);
      }
    })
  );
});
// 消息处理（来自客户端）
self.addEventListener('message', (event) => {
  const messageEvent = event as unknown as {
    data: {
      type: string;
      payload?: unknown;
    };
    source: Client;
  };
  switch (messageEvent.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_URLS':
      if (messageEvent.data.payload) {
        const urls = messageEvent.data.payload as string[];
        caches.open(CACHE_NAME.PRECACHE).then((cache) => cache.addAll(urls));
      }
      break;
    case 'CLEAR_CACHE':
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((name) => caches.delete(name));
      });
      break;
    case 'ADD_TO_SYNC_QUEUE':
      if (messageEvent.data.payload) {
        const syncRequest: SyncRequest = messageEvent.data.payload as SyncRequest;
        caches.open(CACHE_NAME.SYNC_QUEUE).then((cache) => {
          cache.put(
            new Request(`/sync/${Date.now()}`, { method: 'POST' }),
            new Response(JSON.stringify(syncRequest), {
              headers: { 'Content-Type': 'application/json' },
            })
          );
        });
      }
      break;
    case 'PRECACHE_ROUTES':
      // V24.0 模块 D：客户端可主动触发关键路由预缓存
      caches
        .open(CACHE_NAME.PRECACHE)
        .then((cache) => cache.addAll(PRECACHE_ROUTES))
        .catch((err) => logger.error('Precache routes failed:', err));
      break;
    // V26.0：返回缓存统计信息
    case 'GET_CACHE_STATS':
      messageEvent.source?.postMessage({
        type: 'CACHE_STATS',
        payload: cacheStats.getStats(),
      });
      break;
    // V37.0 Phase 7: 记录用户导航历史（用于智能预加载）
    case 'RECORD_NAVIGATION':
      if (messageEvent.data.payload) {
        recordNavigation(messageEvent.data.payload as string);
      }
      break;
    // V37.0 Phase 7: 智能预加载（基于导航历史预测下一个可能访问的路由）
    case 'PREFETCH_INTELLIGENT':
      prefetchIntelligent(messageEvent.source);
      break;
    // V37.0 Phase 7: 预缓存远程模块入口
    case 'PREFETCH_REMOTE_ENTRIES':
      if (messageEvent.data.payload) {
        const entries = messageEvent.data.payload as string[];
        caches.open(CACHE_NAME.REMOTE_ENTRIES).then((cache) => {
          entries.forEach((url) => {
            cache.add(url).catch(() => {
              // 静默失败
            });
          });
        });
      }
      break;
    default:
      break;
  }
});
// ==================== V37.0 Phase 7: 智能预加载策略 ====================
/**
 * 导航历史记录（用于预测用户下一步访问的路由）
 * 保留最近 50 条导航记录，基于马尔可夫链模型预测下一个路由
 */
const NAVIGATION_HISTORY_MAX = 50;
const navigationHistory: string[] = [];
/**
 * 记录用户导航
 * 客户端在路由变化时发送当前路径，Service Worker 据此学习导航模式
 */
function recordNavigation(path: string): void {
  navigationHistory.push(path);
  if (navigationHistory.length > NAVIGATION_HISTORY_MAX) {
    navigationHistory.shift();
  }
}
/**
 * 基于导航历史预测下一个可能访问的路由
 * 使用简单的马尔可夫链：统计从当前路由到其他路由的转移频率
 */
function predictNextRoutes(currentPath: string, topN = 3): string[] {
  const transitions: Record<string, number> = {};
  // 统计从 currentPath 到下一个路径的转移次数
  for (let i = 0; i < navigationHistory.length - 1; i++) {
    if (navigationHistory[i] === currentPath) {
      const next = navigationHistory[i + 1];
      transitions[next] = (transitions[next] || 0) + 1;
    }
  }
  // 按转移频率排序，取前 N 个
  return Object.entries(transitions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([path]) => path);
}
/**
 * 执行智能预加载
 * 根据当前路由预测下一个可能访问的路由，提前缓存对应的远程模块入口
 */
async function prefetchIntelligent(client: Client | undefined): Promise<void> {
  const currentPath = navigationHistory[navigationHistory.length - 1];
  if (!currentPath) return;
  const predictedRoutes = predictNextRoutes(currentPath);
  if (predictedRoutes.length === 0) {
    // 无历史数据时，回退到预缓存所有核心路由
    return;
  }
  logger.info('[SW] 智能预加载预测路由:', predictedRoutes);
  // 预缓存预测的路由页面
  const cache = await caches.open(CACHE_NAME.PRECACHE);
  for (const route of predictedRoutes) {
    try {
      const response = await fetch(route, { credentials: 'same-origin' });
      if (response.ok) {
        await cache.put(route, response);
      }
    } catch {
      // 静默失败
    }
  }
  // 通知客户端预加载结果
  client?.postMessage({
    type: 'PREFETCH_INTELLIGENT_RESULT',
    payload: { predictedRoutes, currentPath },
  });
}
// Activate 事件 - 清理旧版本缓存
self.addEventListener('activate', (event) => {
  const activateEvent = event as unknown as {
    waitUntil: (promise: Promise<unknown>) => void;
  };
  const currentCaches = Object.values(CACHE_NAME) as string[];
  activateEvent.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 清理非当前版本的缓存（强制更新）
            if (!currentCaches.includes(cacheName)) {
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});
// V24.0 模块 D：安装时预缓存关键路由
self.addEventListener('install', (event) => {
  const installEvent = event as unknown as {
    waitUntil: (promise: Promise<unknown>) => void;
  };
  installEvent.waitUntil(
    caches
      .open(CACHE_NAME.PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_ROUTES))
      .catch((err) => logger.error('Install precache failed:', err))
  );
});
