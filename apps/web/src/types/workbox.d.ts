/**
 * Type declarations for Workbox service worker globals
 */

interface ServiceWorkerGlobalScope {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __WB_MANIFEST: Array<{
    url: string;
    revision?: string;
  }>;
}
