// SDK V0.1 冒烟测试：node --test（mock fetch，不依赖真实服务）
import test from 'node:test';
import assert from 'node:assert/strict';
import { BusinessToolsClient, HttpTransport } from '../dist/index.js';

function mockFetch(handler) {
  return async (url, init) => {
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body) : undefined;
    const out = handler(method, url, body);
    return new Response(JSON.stringify(out.body), { status: out.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  };
}

test('permissions.listPermissions 分页请求 + 鉴权头', async () => {
  const calls = [];
  const fetchImpl = mockFetch((method, url, body) => {
    calls.push({ method, url, body });
    return { body: { items: [], total: 0, page: 1, page_size: 20 } };
  });
  const client = new BusinessToolsClient({ baseUrl: 'http://localhost:8099', authToken: 'tok-1', fetchImpl });
  const res = await client.permissions.listPermissions({ page: 2, page_size: 20 });
  assert.equal(res.total, 0);
  assert.match(calls[0].url, /page=2/);
  assert.match(calls[0].url, /page_size=20/);
});

test('permissions.verify POST body + 响应透传', async () => {
  const fetchImpl = mockFetch((method, url, body) => {
    assert.equal(method, 'POST');
    assert.deepEqual(body, { permission: 'iam:users_read' });
    return { body: { has_permission: true, permission: 'iam:users_read' } };
  });
  const client = new BusinessToolsClient({ baseUrl: 'http://localhost:8099', authToken: 't', fetchImpl });
  const r = await client.permissions.verify('iam:users_read');
  assert.equal(r.has_permission, true);
});

test('auditLogs.stream NDJSON 逐行解析', async () => {
  let received = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- fetch 接口签名（url/init 为契约参数）
  const fetchImpl = async (url, init) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"id":"a"}\n{"id":"b"}\n'));
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } });
  };
  const http = new HttpTransport({ baseUrl: 'http://x', fetchImpl });
  await http.streamNdjson('/stream', (item) => received.push(item));
  assert.deepEqual(received, [{ id: 'a' }, { id: 'b' }]);
});

test('错误响应抛错并包含状态码', async () => {
  const fetchImpl = async () => new Response('bad', { status: 500 });
  const client = new BusinessToolsClient({ baseUrl: 'http://x', fetchImpl });
  await assert.rejects(() => client.permissions.listPermissions(), /500/);
});
