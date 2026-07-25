import { describe, it, expect } from 'vitest';
import type { TaskContext } from 'vitest';
import { get, BASE_URL } from '../helpers/api-client.js';
import { isConnectionRefused } from '../helpers/guards.js';
import { getAuthHeaders, isAuthAvailable } from '../helpers/auth.js';

const SERVICES = [
  'core',
  'ai',
  'analytics',
  'crm',
  'doc',
  'ehs',
  'erp',
  'finance',
  'gis',
  'hrm',
  'integration',
  'lims',
  'mes',
  'mobile',
  'monitor',
  'pdm',
  'pm',
  'portal',
  'qms',
  'rd',
  'scm',
  'srm',
  'wms',
  // V63.3: 新增外迁服务（2026-07-25）
  'billing',
  'ticket',
  'feedback',
  'communication',
  'master-data',
  'search',
] as const;

async function probeService(
  service: string
): Promise<{ reachable: boolean; paths: string[] }> {
  const paths =
    service === 'core'
      ? [
          '/api/core/health',
          '/api/iam/health',
          '/api/v1/core/health',
          '/api/v1/iam/health',
        ]
      : [`/api/${service}/health`, `/api/v1/${service}/health`];

  for (const path of paths) {
    try {
      const resp = await get(path, {
        headers: { 'X-Probe': 'true' },
      });
      // Any HTTP response means the service is reachable.
      if (resp.status < 600) {
        return { reachable: true, paths };
      }
    } catch (err) {
      if (!(await isConnectionRefused(err))) {
        // Non-connection errors still mean something answered.
        return { reachable: true, paths };
      }
    }
  }
  return { reachable: false, paths };
}

const reachability = await Promise.all(
  SERVICES.map(async (service) => {
    const probe = await probeService(service);
    return { service, ...probe };
  })
);

const reachableMap = new Map(reachability.map((r) => [r.service, r.reachable]));
const pathsMap = new Map(reachability.map((r) => [r.service, r.paths]));

describe.skipIf(
  reachability.every((r) => !r.reachable)
)('Health checks', () => {
  it(`BASE_URL is configured as ${BASE_URL}`, () => {
    expect(BASE_URL).toMatch(/^https?:\/\//);
  });

  for (const service of SERVICES) {
    it.skipIf(!reachableMap.get(service))(
      `returns 200 for /api/{service}/health (${service})`,
      async (ctx: TaskContext) => {
        const paths = pathsMap.get(service) ?? [];
        let lastStatus = 0;
        let lastError: unknown;

        for (const path of paths) {
          try {
            let resp = await get(path);
            lastStatus = resp.status;
            if (resp.status === 200) {
              return;
            }
            if (resp.status === 401) {
              if (!(await isAuthAvailable())) {
                ctx.skip();
                return;
              }
              const headers = await getAuthHeaders();
              resp = await get(path, { headers });
              lastStatus = resp.status;
              if (resp.status === 200) {
                return;
              }
            }
          } catch (err) {
            lastError = err;
          }
        }

        throw new Error(
          `Health check failed for ${service}. ` +
            `Tried ${paths.join(', ')}; last status: ${lastStatus}; ` +
            `last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
        );
      }
    );
  }
});
