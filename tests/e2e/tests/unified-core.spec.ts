import { test, expect } from '@playwright/test';
import { buildApiContext, apiGet, apiPost, apiPut, apiDelete } from '../helpers/api';

test.describe('Unified Core - IAM User Management', () => {
  let ctx: ReturnType<typeof buildApiContext> extends Promise<infer T> ? T : never;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    if (ctx) await ctx.dispose();
  });

  test('GET /api/core/iam/users returns paginated users', async () => {
    const res = await ctx.get('/api/core/iam/users', { params: { page: 1, page_size: 10 } });
    expect(res.ok(), `GET /users -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('data');
    expect(Array.isArray(json.data?.users ?? json.data?.items)).toBeTruthy();
  });

  test('POST /api/core/iam/users creates a new user', async () => {
    const username = `e2e-test-${Date.now()}`;
    const res = await ctx.post('/api/core/iam/users', {
      data: {
        username,
        email: `${username}@topems.local`,
        password: 'Test@123456',
        full_name: 'E2E Test User',
      },
    });
    expect(res.ok(), `POST /users -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    expect(json.data).toHaveProperty('id');
    expect(json.data?.username).toBe(username);
  });

  test('GET /api/core/iam/users/{id} returns user detail', async () => {
    const listRes = await ctx.get('/api/core/iam/users', { params: { page: 1, page_size: 1 } });
    expect(listRes.ok()).toBeTruthy();
    const listJson = await listRes.json();
    const user = listJson.data?.users?.[0] ?? listJson.data?.items?.[0];
    expect(user).toBeDefined();
    const detailRes = await ctx.get(`/api/core/iam/users/${user.id}`);
    expect(detailRes.ok(), `GET /users/${user.id} -> ${detailRes.status()}`).toBeTruthy();
    const detailJson = await detailRes.json();
    expect(detailJson.data?.id).toBe(user.id);
  });
});

test.describe('Unified Core - Flow Task Management', () => {
  let ctx: ReturnType<typeof buildApiContext> extends Promise<infer T> ? T : never;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    if (ctx) await ctx.dispose();
  });

  test('GET /api/core/flow/tasks returns paginated tasks', async () => {
    const res = await ctx.get('/api/core/flow/tasks', { params: { page: 1, page_size: 10 } });
    expect(res.ok(), `GET /tasks -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('data');
  });

  test('GET /api/core/flow/tasks/my returns user tasks', async () => {
    const res = await ctx.get('/api/core/flow/tasks/my');
    expect(res.ok(), `GET /tasks/my -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });

  test('GET /api/core/flow/workflows returns workflows', async () => {
    const res = await ctx.get('/api/core/flow/workflows', { params: { page: 1, page_size: 10 } });
    expect(res.ok(), `GET /workflows -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('data');
  });

  test('GET /api/core/flow/instances returns instances', async () => {
    const res = await ctx.get('/api/core/flow/instances', { params: { page: 1, page_size: 10 } });
    expect(res.ok(), `GET /instances -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('data');
  });
});

test.describe('Unified Core - File Management', () => {
  let ctx: ReturnType<typeof buildApiContext> extends Promise<infer T> ? T : never;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    if (ctx) await ctx.dispose();
  });

  test('GET /api/core/file/files returns files', async () => {
    const res = await ctx.get('/api/core/file/files', { params: { page: 1, page_size: 10 } });
    expect(res.ok(), `GET /files -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('data');
  });

  test('GET /api/core/file/folders returns folders', async () => {
    const res = await ctx.get('/api/core/file/folders');
    expect(res.ok(), `GET /folders -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });
});

test.describe('Unified Core - Tenant Management', () => {
  let ctx: ReturnType<typeof buildApiContext> extends Promise<infer T> ? T : never;

  test.beforeAll(async () => {
    ctx = await buildApiContext();
  });

  test.afterAll(async () => {
    if (ctx) await ctx.dispose();
  });

  test('GET /api/core/tenant/tenants returns tenants', async () => {
    const res = await ctx.get('/api/core/tenant/tenants', { params: { page: 1, page_size: 10 } });
    expect(res.ok(), `GET /tenants -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('data');
  });
});

test.describe('Unified Core - Health Check', () => {
  test('GET /api/core/health returns healthy status', async ({ request }) => {
    const res = await request.get(`${process.env.API_BASE_URL ?? 'http://localhost:8080'}/api/core/health`);
    expect(res.ok(), `GET /health -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe('healthy');
  });

  test('GET /health returns basic health', async ({ request }) => {
    const res = await request.get(`${process.env.API_BASE_URL ?? 'http://localhost:8080'}/health`);
    expect(res.ok(), `GET /health (root) -> ${res.status()}`).toBeTruthy();
  });
});

test.describe('Unified Core - API Info', () => {
  test('GET /api returns API info', async ({ request }) => {
    const res = await request.get(`${process.env.API_BASE_URL ?? 'http://localhost:8080'}/api`);
    expect(res.ok(), `GET /api -> ${res.status()}`).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('service_name');
    expect(json).toHaveProperty('versions');
  });

  test('GET /api/info returns API info', async ({ request }) => {
    const res = await request.get(`${process.env.API_BASE_URL ?? 'http://localhost:8080'}/api/info`);
    expect(res.ok(), `GET /api/info -> ${res.status()}`).toBeTruthy();
  });
});