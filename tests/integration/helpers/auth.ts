import { post, type ApiResponse } from './api-client.js';

const DEFAULT_USERNAME = process.env.TEST_USERNAME ?? 'admin';
const DEFAULT_PASSWORD = process.env.TEST_PASSWORD ?? 'admin123';

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: {
    id: string;
    username: string;
    tenant_id?: string;
    roles?: string[];
  };
}

/**
 * Attempts to authenticate against the IAM service and returns a bearer token.
 *
 * Tries the new `/api/core/iam/auth/login` path first, then falls back to the
 * legacy `/api/v1/iam/auth/login` path. If `TEST_TOKEN` is provided in the
 * environment it is returned immediately (useful for CI or local mocking).
 */
export async function getAuthToken(
  username: string = DEFAULT_USERNAME,
  password: string = DEFAULT_PASSWORD
): Promise<string> {
  if (process.env.TEST_TOKEN) {
    return process.env.TEST_TOKEN;
  }

  const candidates = [
    '/api/core/iam/auth/login',
    '/api/v1/iam/auth/login',
  ];

  let lastError: unknown;
  for (const path of candidates) {
    let resp: ApiResponse<LoginResponse>;
    try {
      resp = await post<LoginResponse>(path, { username, password });
    } catch (err) {
      lastError = err;
      continue;
    }

    if (resp.status >= 200 && resp.status < 300) {
      const body = await resp.json();
      if (body.access_token) {
        return body.access_token;
      }
      lastError = `Login succeeded but no access_token in response from ${path}`;
      continue;
    }

    if (resp.status === 404) {
      lastError = `404 at ${path}`;
      continue;
    }

    const text = await resp.text();
    throw new Error(
      `Login failed at ${path} (${resp.status}): ${text.slice(0, 200)}`
    );
  }

  throw new Error(`No login endpoint responded OK. Last: ${lastError}`);
}

/**
 * Returns authorization headers for use with the API client helpers.
 */
export async function getAuthHeaders(
  username?: string,
  password?: string
): Promise<{ Authorization: string; 'X-Tenant-Id'?: string }> {
  const token = await getAuthToken(username, password);
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Returns `true` if authentication is expected to work in this environment.
 * Checks for a pre-shared `TEST_TOKEN` or a successful login call.
 */
export async function isAuthAvailable(): Promise<boolean> {
  if (process.env.TEST_TOKEN) {
    return true;
  }
  try {
    await getAuthToken();
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronous variant that uses a pre-shared token. Throws if `TEST_TOKEN` is
 * not set; useful when tests must avoid an async login round-trip.
 */
export function getStaticAuthHeaders(): { Authorization: string } {
  if (!process.env.TEST_TOKEN) {
    throw new Error('TEST_TOKEN is required for static auth headers');
  }
  return { Authorization: `Bearer ${process.env.TEST_TOKEN}` };
}
