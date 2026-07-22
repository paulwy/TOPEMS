import { describe, it, expect } from 'vitest';
import { get, post, del, BASE_URL } from '../helpers/api-client.js';
import { getAuthHeaders, isAuthAvailable } from '../helpers/auth.js';
import { isApiReachable } from '../helpers/guards.js';

interface Department {
  id?: string;
  name: string;
  code: string;
  description?: string;
}

const apiReachable = await isApiReachable();
const authAvailable = apiReachable && (await isAuthAvailable());

describe.skipIf(!apiReachable)('Cross-service flow', () => {
  it.skipIf(!authAvailable)('creates a department in HRM and reads it back', async () => {
    const headers = await getAuthHeaders();
    const createCandidates = [
      '/api/hrm/departments',
      '/api/v1/hrm/departments',
    ];

    let created: Department | undefined;
    let createPathUsed: string | undefined;

    for (const path of createCandidates) {
      try {
        const resp = await post<Department>(path, {
          name: 'Integration Test Department',
          code: `IT-DEPT-${Date.now()}`,
          description: 'Created by integration test suite',
        }, { headers });

        if (resp.status === 201 || resp.status === 200) {
          created = await resp.json();
          createPathUsed = path;
          break;
        }
        if (resp.status === 404) {
          continue;
        }
      } catch {
        // Try next candidate path.
      }
    }

    if (!created || !createPathUsed) {
      throw new Error(
        `Could not create department in HRM. ` +
          `Tried ${createCandidates.join(', ')}.`
      );
    }

    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Integration Test Department');

    // Read the department back using the same API version prefix.
    const basePath = createPathUsed.replace('/departments', '');
    const readCandidates = [
      `${basePath}/departments/${created.id}`,
      `/api/hrm/departments/${created.id}`,
      `/api/v1/hrm/departments/${created.id}`,
    ];

    let found: Department | undefined;
    for (const path of readCandidates) {
      try {
        const resp = await get<Department>(path, { headers });
        if (resp.status === 200) {
          found = await resp.json();
          break;
        }
      } catch {
        // Try next candidate path.
      }
    }

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
    expect(found?.code).toBe(created.code);

    // Best-effort cleanup.
    if (created.id) {
      for (const path of readCandidates) {
        try {
          await del(`${basePath}/departments/${created.id}`, { headers });
          break;
        } catch {
          // Ignore cleanup failures.
        }
      }
    }
  });

  it('BASE_URL is configured', () => {
    expect(BASE_URL).toMatch(/^https?:\/\//);
  });
});
