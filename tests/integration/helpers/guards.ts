import { get } from './api-client.js';

export async function isConnectionRefused(err: unknown): Promise<boolean> {
  const message = err instanceof Error ? err.message : String(err);
  return /fetch failed|ECONNREFUSED|ECONNRESET|ETIMEDOUT|socket hang up/i.test(
    message
  );
}

/**
 * Best-effort probe that returns `true` when the configured BASE_URL is reachable.
 * Useful for `describe.skipIf` guards that skip suites when services are offline.
 */
export async function isApiReachable(): Promise<boolean> {
  try {
    const resp = await get('/api/core/iam/health');
    return resp.status < 600;
  } catch (err) {
    return !(await isConnectionRefused(err));
  }
}
