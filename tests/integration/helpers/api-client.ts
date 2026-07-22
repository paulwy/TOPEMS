/**
 * Minimal HTTP client for TOPEMS Rust axum services.
 *
 * Uses native `fetch` so the suite has zero runtime dependencies beyond
 * Node.js and Vitest. All helpers assume JSON request/response bodies.
 */

function resolveBaseUrl(): string {
  const candidate = process.env.BASE_URL;
  if (candidate && candidate !== '/') {
    return candidate.replace(/\/$/, '');
  }
  return 'http://localhost:8000';
}

export const BASE_URL = resolveBaseUrl();

export interface ApiResponse<T = unknown> {
  status: number;
  headers: Headers;
  json(): Promise<T>;
  text(): Promise<string>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
}

const defaultHeaders: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = BASE_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

function wrapResponse(resp: Response): ApiResponse {
  return {
    status: resp.status,
    headers: resp.headers,
    json: <T>() => resp.json() as Promise<T>,
    text: () => resp.text(),
  };
}

export async function get<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const resp = await fetch(buildUrl(path), {
    method: 'GET',
    headers: { ...defaultHeaders, ...options.headers },
  });
  return wrapResponse(resp) as ApiResponse<T>;
}

export async function post<T = unknown>(
  path: string,
  body: unknown,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const resp = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { ...defaultHeaders, ...options.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return wrapResponse(resp) as ApiResponse<T>;
}

export async function put<T = unknown>(
  path: string,
  body: unknown,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const resp = await fetch(buildUrl(path), {
    method: 'PUT',
    headers: { ...defaultHeaders, ...options.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return wrapResponse(resp) as ApiResponse<T>;
}

export async function del<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const resp = await fetch(buildUrl(path), {
    method: 'DELETE',
    headers: { ...defaultHeaders, ...options.headers },
  });
  return wrapResponse(resp) as ApiResponse<T>;
}

export async function expectStatus(
  resp: ApiResponse,
  status: number
): Promise<void> {
  if (resp.status !== status) {
    const body = await resp.text();
    throw new Error(
      `Expected status ${status} but got ${resp.status}\nBody: ${body.slice(0, 500)}`
    );
  }
}

export async function expectJson<T = unknown>(resp: ApiResponse<T>): Promise<T> {
  return resp.json();
}

/**
 * Best-effort probe that returns `true` when the configured BASE_URL is reachable.
 * Useful for `beforeAll` guards that skip the suite when services are offline.
 */
export async function isApiReachable(): Promise<boolean> {
  try {
    const resp = await fetch(buildUrl('/api/core/iam/health'), {
      method: 'GET',
      signal: AbortSignal.timeout(3_000),
    });
    return resp.status < 600;
  } catch {
    return false;
  }
}
