/**
 * AI 业务 Copilot API - k6 性能测试
 *
 * 测试业务 Copilot API 的性能和压力承受能力：
 * - 会话管理（创建/获取/删除）
 * - 消息发送（同步/流式）
 * - 意图识别
 * - 模块配置
 * - FAQ 搜索
 *
 * 运行方式：
 *   k6 run tests/performance/ai-business-copilot.k6.js
 *   k6 run --vus 50 --duration 2m tests/performance/ai-business-copilot.k6.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ─── 自定义指标 ───
const copilotLatency = new Trend('copilot_latency_ms', true);
const copilotSuccessRate = new Rate('copilot_success_rate');
const copilotErrorCount = new Counter('copilot_error_count');
const messageLatency = new Trend('message_latency_ms', true);
const sessionCreationLatency = new Trend('session_creation_latency_ms', true);

// ─── 测试配置 ───
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },
    average_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'average_load' },
      exec: 'averageLoadTest',
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest',
    },
  },

  thresholds: {
    'copilot_latency_ms': ['p(95)<2000', 'p(99)<5000'],
    'message_latency_ms': ['p(95)<3000', 'p(99)<8000'],
    'session_creation_latency_ms': ['p(95)<1000', 'p(99)<2000'],
    'copilot_success_rate': ['rate>0.99'],
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<3000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_PREFIX = '/api/ai/dsh/copilot';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const TEST_MODULES = ['erp', 'finance', 'crm', 'wms', 'hr', 'oa', 'general'];
const TEST_MESSAGES = [
  '查询本月采购订单统计',
  '创建新的采购申请',
  '分析供应商付款情况',
  '查询客户信息',
  '生成本月销售报告',
  '查询库存状态',
  '创建入库单',
  '分析员工绩效',
];

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function createSession(module) {
  const url = `${BASE_URL}${API_PREFIX}/sessions`;
  const payload = JSON.stringify({ module });
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const latency = Date.now() - startTime;

  sessionCreationLatency.add(latency);
  copilotLatency.add(latency);

  const success = check(response, {
    '会话创建状态是 200 或 201': (r) => r.status === 200 || r.status === 201,
    '会话创建返回 session_id': (r) => {
      try { return r.json('data.session_id') !== undefined; } catch (e) { return false; }
    },
  });

  copilotSuccessRate.add(success);
  if (!success) copilotErrorCount.add(1);
  return response;
}

function sendMessage(sessionId, module, message) {
  const url = `${BASE_URL}${API_PREFIX}/sessions/${sessionId}/messages`;
  const payload = JSON.stringify({
    session_id: sessionId,
    user_input: message,
    module: module,
    stream: false,
  });
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const latency = Date.now() - startTime;

  messageLatency.add(latency);
  copilotLatency.add(latency);

  const success = check(response, {
    '消息发送状态是 200': (r) => r.status === 200,
    '消息发送返回 reply': (r) => {
      try { return r.json('data.reply') !== undefined; } catch (e) { return false; }
    },
  });

  copilotSuccessRate.add(success);
  if (!success) copilotErrorCount.add(1);
  return response;
}

function getSession(sessionId) {
  const url = `${BASE_URL}${API_PREFIX}/sessions/${sessionId}`;
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;
  copilotLatency.add(latency);

  const success = check(response, { '获取会话状态是 200': (r) => r.status === 200 });
  copilotSuccessRate.add(success);
  if (!success) copilotErrorCount.add(1);
  return response;
}

function deleteSession(sessionId) {
  const url = `${BASE_URL}${API_PREFIX}/sessions/${sessionId}`;
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.del(url, null, params);
  const latency = Date.now() - startTime;
  copilotLatency.add(latency);

  const success = check(response, { '删除会话状态是 200 或 204': (r) => r.status === 200 || r.status === 204 });
  copilotSuccessRate.add(success);
  if (!success) copilotErrorCount.add(1);
  return response;
}

function recognizeIntent(module, message) {
  const url = `${BASE_URL}${API_PREFIX}/intent/recognize`;
  const payload = JSON.stringify({ module, user_input: message });
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const latency = Date.now() - startTime;
  copilotLatency.add(latency);

  const success = check(response, { '意图识别状态是 200': (r) => r.status === 200 });
  copilotSuccessRate.add(success);
  if (!success) copilotErrorCount.add(1);
  return response;
}

function getModuleConfig(module) {
  const url = `${BASE_URL}${API_PREFIX}/modules/${module}/config`;
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;
  copilotLatency.add(latency);

  const success = check(response, { '获取模块配置状态是 200': (r) => r.status === 200 });
  copilotSuccessRate.add(success);
  if (!success) copilotErrorCount.add(1);
  return response;
}

function searchFAQ(module, query) {
  const url = `${BASE_URL}${API_PREFIX}/faq/search?module=${module}&query=${encodeURIComponent(query)}`;
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;
  copilotLatency.add(latency);

  const success = check(response, { 'FAQ 搜索状态是 200': (r) => r.status === 200 });
  copilotSuccessRate.add(success);
  if (!success) copilotErrorCount.add(1);
  return response;
}

export function smokeTest() {
  group('业务 Copilot 烟雾测试', () => {
    const module = randomItem(TEST_MODULES);
    const createResponse = createSession(module);
    let sessionId = null;
    try { sessionId = createResponse.json('data.session_id'); } catch (e) {}

    if (sessionId) {
      getSession(sessionId);
      sendMessage(sessionId, module, randomItem(TEST_MESSAGES));
      deleteSession(sessionId);
    }

    recognizeIntent(module, randomItem(TEST_MESSAGES));
    getModuleConfig(module);
    searchFAQ(module, '采购');
    sleep(1);
  });
}

export function averageLoadTest() {
  group('业务 Copilot 平均负载测试', () => {
    const module = randomItem(TEST_MODULES);
    const createResponse = createSession(module);
    let sessionId = null;
    try { sessionId = createResponse.json('data.session_id'); } catch (e) {}

    if (sessionId) {
      for (let i = 0; i < 3; i++) {
        sendMessage(sessionId, module, randomItem(TEST_MESSAGES));
        sleep(0.5);
      }
      getSession(sessionId);
      deleteSession(sessionId);
    }

    recognizeIntent(module, randomItem(TEST_MESSAGES));
    getModuleConfig(module);
    searchFAQ(module, randomItem(['采购', '销售', '库存', '客户']));
    sleep(1);
  });
}

export function stressTest() {
  group('业务 Copilot 压力测试', () => {
    const module = randomItem(TEST_MODULES);
    const createResponse = createSession(module);
    let sessionId = null;
    try { sessionId = createResponse.json('data.session_id'); } catch (e) {}

    if (sessionId) {
      for (let i = 0; i < 5; i++) {
        sendMessage(sessionId, module, randomItem(TEST_MESSAGES));
      }
      deleteSession(sessionId);
    }

    recognizeIntent(module, randomItem(TEST_MESSAGES));
    getModuleConfig(module);
    searchFAQ(module, '测试');
    sleep(0.3);
  });
}

export function setup() {
  console.log(`🚀 开始业务 Copilot API 性能测试`);
  console.log(`📌 目标地址: ${BASE_URL}`);
  console.log(`📌 API 前缀: ${API_PREFIX}`);
  console.log(`📌 测试模块: ${TEST_MODULES.join(', ')}`);
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log(`✅ 业务 Copilot API 性能测试完成`);
  console.log(`📌 开始时间: ${data.startTime}`);
  console.log(`📌 结束时间: ${new Date().toISOString()}`);
}
