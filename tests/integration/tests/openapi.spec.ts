import { describe, it, expect } from 'vitest';
import type { TaskContext } from 'vitest';
import { get, BASE_URL } from '../helpers/api-client.js';
import { isApiReachable } from '../helpers/guards.js';
import { getAuthHeaders, isAuthAvailable } from '../helpers/auth.js';

interface OpenApiDocument {
  openapi: string;
  info?: { title?: string; version?: string };
  paths?: Record<string, unknown>;
}

const apiReachable = await isApiReachable();

describe.skipIf(!apiReachable)('OpenAPI docs', () => {
  it('serves /api-docs/openapi.json from the core service', async (ctx: TaskContext) => {
    const candidates = [
      '/api-docs/openapi.json',
      '/api/core/api-docs/openapi.json',
      '/api/v1/core/api-docs/openapi.json',
    ];

    let lastStatus = 0;
    let lastError: unknown;
    let headers: { Authorization: string } | undefined;

    for (const path of candidates) {
      try {
        let resp = await get<OpenApiDocument>(path);
        lastStatus = resp.status;
        if (resp.status === 200) {
          const doc = await resp.json();
          expect(doc.openapi).toMatch(/^3\.\d\.\d$/);
          expect(doc.info?.title).toBeTruthy();
          return;
        }
        if (resp.status === 401) {
          if (!(await isAuthAvailable())) {
            ctx.skip();
            return;
          }
          headers ??= await getAuthHeaders();
          resp = await get<OpenApiDocument>(path, { headers });
          lastStatus = resp.status;
          if (resp.status === 200) {
            const doc = await resp.json();
            expect(doc.openapi).toMatch(/^3\.\d\.\d$/);
            expect(doc.info?.title).toBeTruthy();
            return;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      `OpenAPI document not found. ` +
        `Tried ${candidates.join(', ')}; last status: ${lastStatus}; ` +
        `last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  });

  it('exposes an OpenAPI endpoint for IAM', async (ctx: TaskContext) => {
    const candidates = [
      '/api/core/iam/api-docs/openapi.json',
      '/api/iam/api-docs/openapi.json',
      '/api/v1/iam/api-docs/openapi.json',
    ];

    let lastStatus = 0;
    let lastError: unknown;
    let headers: { Authorization: string } | undefined;

    for (const path of candidates) {
      try {
        let resp = await get<OpenApiDocument>(path);
        lastStatus = resp.status;
        if (resp.status === 200) {
          const doc = await resp.json();
          expect(doc.openapi).toMatch(/^3\.\d\.\d$/);
          return;
        }
        if (resp.status === 401) {
          if (!(await isAuthAvailable())) {
            ctx.skip();
            return;
          }
          headers ??= await getAuthHeaders();
          resp = await get<OpenApiDocument>(path, { headers });
          lastStatus = resp.status;
          if (resp.status === 200) {
            const doc = await resp.json();
            expect(doc.openapi).toMatch(/^3\.\d\.\d$/);
            return;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      `IAM OpenAPI document not found. ` +
        `Tried ${candidates.join(', ')}; last status: ${lastStatus}; ` +
        `last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  });

  it('BASE_URL is configured', () => {
    expect(BASE_URL).toMatch(/^https?:\/\//);
  });
});
