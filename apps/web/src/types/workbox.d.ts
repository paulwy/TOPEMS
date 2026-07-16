/**
 * Type declarations for Workbox service worker globals
 */

interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: Array<{
    url: string;
    revision?: string;
  }>;
}
