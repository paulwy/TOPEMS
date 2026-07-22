import { describe, it, expect } from 'vitest';
import { post, get, BASE_URL } from '../helpers/api-client.js';
import {
  getAuthToken,
  getAuthHeaders,
  isAuthAvailable,
} from '../helpers/auth.js';
import { isApiReachable } from '../helpers/guards.js';

const apiReachable = await isApiReachable();
const authAvailable = apiReachable && (await isAuthAvailable());

describe.skipIf(!apiReachable)('Auth flow', () => {
  it.skipIf(!authAvailable)(
    'returns a bearer token for valid credentials',
    async () => {
      const token = await getAuthToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    }
  );

  it.skipIf(!authAvailable)(
    'rejects invalid credentials with 400 or 401',
    async () => {
      const candidates = [
        '/api/core/iam/auth/login',
        '/api/v1/iam/auth/login',
      ];

      let lastStatus = 0;
      let lastError: unknown;

      for (const path of candidates) {
        try {
          const resp = await post(path, {
            username: 'admin',
            password: 'definitely-wrong-password',
          });
          lastStatus = resp.status;
          if (resp.status === 404) {
            continue;
          }
          expect([400, 401]).toContain(resp.status);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      throw new Error(
        `Invalid credential test failed. ` +
          `Tried ${candidates.join(', ')}; last status: ${lastStatus}; ` +
          `last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
      );
    }
  );

  it.skipIf(!authAvailable)(
    'can call a protected endpoint with the token',
    async () => {
      const headers = await getAuthHeaders();
      const candidates = ['/api/core/iam/auth/me', '/api/v1/iam/auth/me'];

      let lastStatus = 0;
      let lastError: unknown;

      for (const path of candidates) {
        try {
          const resp = await get(path, { headers });
          lastStatus = resp.status;
          if (resp.status === 200) {
            const body = await resp.json();
            expect(body).toBeDefined();
            return;
          }
          if (resp.status === 404) {
            continue;
          }
        } catch (err) {
          lastError = err;
        }
      }

      throw new Error(
        `Protected endpoint test failed. ` +
          `Tried ${candidates.join(', ')}; last status: ${lastStatus}; ` +
          `last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
      );
    }
  );

  it('BASE_URL is configured', () => {
    expect(BASE_URL).toMatch(/^https?:\/\//);
  });
});
