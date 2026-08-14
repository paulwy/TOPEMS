import { APIRequestContext, request, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8080';
const DEFAULT_USERNAME = process.env.E2E_USERNAME ?? 'admin';
const DEFAULT_PASSWORD = process.env.E2E_PASSWORD ?? 'admin123';

interface ApiEnvelope<T> {
  success: boolean;
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

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
 * Authenticates against the IAM service and returns a bearer token.
 *
 * Hits `POST /api/core/iam/v1/auth/login` by default. Falls back to other
 * known paths if the service returns 404, so tests stay resilient during
 * the ongoing API refactor (see /docs/CHANGELOG.md).
 */
export async function loginAsApiUser(
  ctx: APIRequestContext,
  username: string = DEFAULT_USERNAME,
  password: string = DEFAULT_PASSWORD
): Promise<LoginResponse> {
  const candidates = [
    '/api/core/iam/auth/login',
    '/api/core/iam/v1/auth/login',
    '/api/iam/auth/login',
    '/api/auth/login',
  ];

  let lastError: unknown;
  for (const path of candidates) {
    const res = await ctx.post(`${API_BASE_URL}${path}`, {
      data: { username, password },
    });
    if (res.ok()) {
      const envelope = (await res.json()) as ApiEnvelope<LoginResponse>;
      if (envelope.success && envelope.data?.access_token) {
        return envelope.data;
      }
      return envelope as unknown as LoginResponse;
    }
    if (res.status() === 404) {
      lastError = `404 at ${path}`;
      continue;
    }
    // 401/400 are meaningful — surface them
    const text = await res.text();
    throw new Error(
      `Login failed at ${path} (${res.status()}): ${text.slice(0, 200)}`
    );
  }
  throw new Error(`No login endpoint responded OK. Last: ${lastError}`);
}

/**
 * Build a fully authenticated APIRequestContext bound to a user.
 */
export async function buildApiContext(
  username?: string,
  password?: string
): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: API_BASE_URL });
  const login = await loginAsApiUser(ctx, username, password);
  const token = login.access_token;
  // Re-create context with the bearer token attached
  const authed = await request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': login.user?.tenant_id ?? 'default',
    },
  });
  await ctx.dispose();
  return authed;
}

/**
 * Convenience wrapper: GET a JSON resource and assert 2xx.
 */
export async function apiGet<T>(
  ctx: APIRequestContext,
  path: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  const res = await ctx.get(`${API_BASE_URL}${path}`, { params });
  expect(res.ok(), `GET ${path} -> ${res.status()}`).toBeTruthy();
  const json = await res.json();
  if (json?.success === true && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

/**
 * Convenience wrapper: POST JSON and assert 2xx.
 */
export async function apiPost<T>(
  ctx: APIRequestContext,
  path: string,
  body: unknown
): Promise<T> {
  const res = await ctx.post(`${API_BASE_URL}${path}`, { data: body });
  expect(res.ok(), `POST ${path} -> ${res.status()}`).toBeTruthy();
  const json = await res.json();
  if (json?.success === true && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

/**
 * Convenience wrapper: PUT JSON and assert 2xx.
 */
export async function apiPut<T>(
  ctx: APIRequestContext,
  path: string,
  body: unknown
): Promise<T> {
  const res = await ctx.put(`${API_BASE_URL}${path}`, { data: body });
  expect(res.ok(), `PUT ${path} -> ${res.status()}`).toBeTruthy();
  const json = await res.json();
  if (json?.success === true && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

/**
 * Convenience wrapper: DELETE and assert 2xx (or 204).
 */
export async function apiDelete(
  ctx: APIRequestContext,
  path: string
): Promise<void> {
  const res = await ctx.delete(`${API_BASE_URL}${path}`);
  expect(
    res.ok() || res.status() === 204,
    `DELETE ${path} -> ${res.status()}`
  ).toBeTruthy();
}

export async function apiDeleteExpectError(
  ctx: APIRequestContext,
  path: string,
  expectedStatus: number = 404
): Promise<void> {
  const res = await ctx.delete(`${API_BASE_URL}${path}`);
  expect(res.status(), `DELETE ${path} -> expected ${expectedStatus}`).toBe(expectedStatus);
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Fetches a paginated list and returns the first item, asserting that the
 * call returned at least one record.
 */
export async function fetchFirst<T>(
  ctx: APIRequestContext,
  path: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  const res = await apiGet<PaginatedResponse<T>>(ctx, path, params);
  expect(res.items?.length ?? 0, `expected at least one record from ${path}`).toBeGreaterThan(0);
  return (res.items as T[])[0];
}

export const API_PATHS = {
  auth: {
    login: '/api/core/iam/auth/login',
    refresh: '/api/core/iam/auth/refresh',
    me: '/api/core/iam/auth/me',
  },
  mes: {
    productionOrder: '/api/mes/production-orders',
    workOrder: '/api/mes/work-orders',
    equipment: '/api/mes/equipment',
    workStation: '/api/mes/work-stations',
    team: '/api/mes/teams',
    processRoute: '/api/mes/process-routes',
    materialRequirement: '/api/mes/material-requirements',
    productionSchedule: '/api/mes/production-schedules',
    wip: '/api/mes/wip',
    qualityInspection: '/api/mes/quality-inspections',
  },
  scm: {
    purchaseOrder: '/api/scm/purchase-orders',
    purchaseRequest: '/api/scm/purchase-requests',
    supplier: '/api/scm/suppliers',
    purchaseContract: '/api/scm/purchase-contracts',
  },
  finance: {
    voucher: '/api/finance/vouchers',
    account: '/api/finance/accounts',
    period: '/api/finance/periods',
    expenseApproval: '/api/finance/expense-approvals',
  },
  qms: {
    fmea: '/api/qms/fmea',
    spc: '/api/qms/spc/charts',
    qualityIssue: '/api/qms/quality-issues',
    inspection: '/api/qms/inspections',
  },
  srm: {
    supplier: '/api/srm/suppliers',
    inquiry: '/api/srm/inquiries',
  },
  hrm: {
    employee: '/api/hrm/employees',
    organization: '/api/hrm/organizations',
    department: '/api/hrm/departments',
    position: '/api/hrm/positions',
    contract: '/api/hrm/contracts',
    attendance: '/api/hrm/attendance',
    leave: '/api/hrm/leaves',
    recruitment: '/api/hrm/recruitment',
    training: '/api/hrm/training',
    performance: '/api/hrm/performance',
    payroll: '/api/hrm/payroll',
  },
  crm: {
    customer: '/api/crm/customers',
    contact: '/api/crm/contacts',
    opportunity: '/api/crm/opportunities',
    interaction: '/api/crm/interactions',
    billing: '/api/crm/billing',
    returns: '/api/crm/returns',
  },
  pdm: {
    productCategory: '/api/pdm/product-categories',
  },
  wms: {
    area: '/api/wms/areas',
  },
} as const;
