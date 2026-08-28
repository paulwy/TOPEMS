/**
 * AI 业务智能 - 综合性能测试
 *
 * 测试所有 AI 业务智能 API 的综合性能：
 * - 业务 Copilot API
 * - 智能表单 API
 * - 文档智能 API
 * - 治理仪表盘 API
 *
 * 运行方式：
 *   k6 run tests/performance/ai-business-intelligence-comprehensive.k6.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ─── 自定义指标 ───
const totalLatency = new Trend('ai_total_latency_ms', true);
const totalSuccessRate = new Rate('ai_success_rate');
const totalErrorCount = new Counter('ai_error_count');

const copilotLatency = new Trend('copilot_api_latency_ms', true);
const formLatency = new Trend('form_api_latency_ms', true);
const documentLatency = new Trend('document_api_latency_ms', true);
const governanceLatency = new Trend('governance_api_latency_ms', true);

// ─── 测试配置 ───
export const options = {
  scenarios: {
    // 场景 1: 烟雾测试
    smoke: {
      executor: 'constant-vus',
      vus: 3,
      duration: '20s',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },
    // 场景 2: 混合负载测试（模拟真实用户行为）
    mixed_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '2m', target: 30 },
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'mixed_load' },
      exec: 'mixedLoadTest',
    },
    // 场景 3: 峰值测试（模拟高峰期）
    peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'peak' },
      exec: 'peakTest',
    },
    // 场景 4: 稳定性测试（长时间运行）
    soak: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      tags: { test_type: 'soak' },
      exec: 'soakTest',
    },
  },

  thresholds: {
    'ai_total_latency_ms': ['p(95)<2500', 'p(99)<6000'],
    'ai_success_rate': ['rate>0.98'],
    'http_req_failed': ['rate<0.02'],
    'http_req_duration': ['p(95)<3000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const COPILOT_PREFIX = '/api/ai/dsh/copilot';
const FORM_PREFIX = '/api/ai/dsh/forms';
const DOC_PREFIX = '/api/ai/dsh/documents';
const GOV_PREFIX = '/api/ai/governance';

const MODULES = ['erp', 'finance', 'crm', 'wms'];
const FORM_TYPES = ['purchase_request', 'expense_report', 'customer_info', 'warehouse_receipt'];
const TIME_RANGES = ['1h', '24h', '7d', '30d'];
const MESSAGES = [
  '查询本月采购订单',
  '创建采购申请',
  '分析销售数据',
  '查询客户信息',
  '生成库存报告',
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

function measureLatency(startTime, type) {
  const latency = Date.now() - startTime;
  totalLatency.add(latency);
  if (type === 'copilot') copilotLatency.add(latency);
  else if (type === 'form') formLatency.add(latency);
  else if (type === 'document') documentLatency.add(latency);
  else if (type === 'governance') governanceLatency.add(latency);
  return latency;
}

function checkResponse(response, name, type) {
  const success = check(response, {
    [`${name} 状态是 200`]: (r) => r.status === 200,
  });
  totalSuccessRate.add(success);
  if (!success) totalErrorCount.add(1);
  return success;
}

// ─── Copilot API ───
function testCopilotCreateSession() {
  const module = randomItem(MODULES);
  const url = `${BASE_URL}${COPILOT_PREFIX}/sessions`;
  const payload = JSON.stringify({ module });
  const startTime = Date.now();
  const response = http.post(url, payload, { headers: getHeaders() });
  measureLatency(startTime, 'copilot');
  checkResponse(response, '创建会话', 'copilot');
  return response;
}

function testCopilotSendMessage(sessionId) {
  const module = randomItem(MODULES);
  const url = `${BASE_URL}${COPILOT_PREFIX}/sessions/${sessionId}/messages`;
  const payload = JSON.stringify({
    session_id: sessionId,
    user_input: randomItem(MESSAGES),
    module,
    stream: false,
  });
  const startTime = Date.now();
  const response = http.post(url, payload, { headers: getHeaders() });
  measureLatency(startTime, 'copilot');
  checkResponse(response, '发送消息', 'copilot');
  return response;
}

function testCopilotRecognizeIntent() {
  const module = randomItem(MODULES);
  const url = `${BASE_URL}${COPILOT_PREFIX}/intent/recognize`;
  const payload = JSON.stringify({ module, user_input: randomItem(MESSAGES) });
  const startTime = Date.now();
  const response = http.post(url, payload, { headers: getHeaders() });
  measureLatency(startTime, 'copilot');
  checkResponse(response, '意图识别', 'copilot');
  return response;
}

// ─── 表单 API ───
function testGetFormDefinition() {
  const formType = randomItem(FORM_TYPES);
  const url = `${BASE_URL}${FORM_PREFIX}/definitions/${formType}`;
  const startTime = Date.now();
  const response = http.get(url, { headers: getHeaders() });
  measureLatency(startTime, 'form');
  checkResponse(response, '获取表单定义', 'form');
  return response;
}

function testValidateForm() {
  const formType = randomItem(FORM_TYPES);
  const url = `${BASE_URL}${FORM_PREFIX}/validate`;
  const payload = JSON.stringify({
    form_type: formType,
    data: { title: '测试', amount: 1000 },
  });
  const startTime = Date.now();
  const response = http.post(url, payload, { headers: getHeaders() });
  measureLatency(startTime, 'form');
  checkResponse(response, '验证表单', 'form');
  return response;
}

// ─── 文档 API ───
function testDocumentList() {
  const url = `${BASE_URL}${DOC_PREFIX}/documents?page=1&page_size=10`;
  const startTime = Date.now();
  const response = http.get(url, { headers: getHeaders() });
  measureLatency(startTime, 'document');
  checkResponse(response, '文档列表', 'document');
  return response;
}

function testDocumentSearch() {
  const url = `${BASE_URL}${DOC_PREFIX}/search?query=测试&page=1&page_size=10`;
  const startTime = Date.now();
  const response = http.get(url, { headers: getHeaders() });
  measureLatency(startTime, 'document');
  checkResponse(response, '文档搜索', 'document');
  return response;
}

// ─── 治理 API ───
function testGovernanceDashboard() {
  const timeRange = randomItem(TIME_RANGES);
  const url = `${BASE_URL}${GOV_PREFIX}/dashboard?time_range=${timeRange}`;
  const startTime = Date.now();
  const response = http.get(url, { headers: getHeaders() });
  measureLatency(startTime, 'governance');
  checkResponse(response, '治理仪表盘', 'governance');
  return response;
}

function testGovernanceScore() {
  const timeRange = randomItem(TIME_RANGES);
  const url = `${BASE_URL}${GOV_PREFIX}/score?time_range=${timeRange}`;
  const startTime = Date.now();
  const response = http.get(url, { headers: getHeaders() });
  measureLatency(startTime, 'governance');
  checkResponse(response, '治理评分', 'governance');
  return response;
}

// ─── 测试场景 ───

export function smokeTest() {
  group('综合烟雾测试', () => {
    // Copilot
    const createResp = testCopilotCreateSession();
    let sessionId = null;
    try { sessionId = createResp.json('data.session_id'); } catch (e) {}
    if (sessionId) testCopilotSendMessage(sessionId);
    testCopilotRecognizeIntent();

    // 表单
    testGetFormDefinition();
    testValidateForm();

    // 文档
    testDocumentList();
    testDocumentSearch();

    // 治理
    testGovernanceDashboard();
    testGovernanceScore();

    sleep(1);
  });
}

export function mixedLoadTest() {
  group('混合负载测试', () => {
    // 模拟用户行为：70% Copilot，15% 表单，10% 文档，5% 治理
    const rand = Math.random();

    if (rand < 0.7) {
      // Copilot 对话流程
      const createResp = testCopilotCreateSession();
      let sessionId = null;
      try { sessionId = createResp.json('data.session_id'); } catch (e) {}
      if (sessionId) {
        for (let i = 0; i < 2; i++) {
          testCopilotSendMessage(sessionId);
          sleep(0.3);
        }
      }
      testCopilotRecognizeIntent();
    } else if (rand < 0.85) {
      // 表单流程
      testGetFormDefinition();
      sleep(0.2);
      testValidateForm();
    } else if (rand < 0.95) {
      // 文档流程
      testDocumentList();
      sleep(0.2);
      testDocumentSearch();
    } else {
      // 治理流程
      testGovernanceDashboard();
      sleep(0.2);
      testGovernanceScore();
    }

    sleep(0.5);
  });
}

export function peakTest() {
  group('峰值测试', () => {
    // 高峰期：密集调用所有 API
    testCopilotCreateSession();
    testCopilotRecognizeIntent();
    testGetFormDefinition();
    testDocumentList();
    testGovernanceDashboard();

    sleep(0.2);
  });
}

export function soakTest() {
  group('稳定性测试', () => {
    // 长时间稳定运行：中等频率调用
    const rand = Math.random();

    if (rand < 0.5) {
      const createResp = testCopilotCreateSession();
      let sessionId = null;
      try { sessionId = createResp.json('data.session_id'); } catch (e) {}
      if (sessionId) testCopilotSendMessage(sessionId);
    } else if (rand < 0.7) {
      testGetFormDefinition();
      testValidateForm();
    } else if (rand < 0.9) {
      testDocumentList();
      testDocumentSearch();
    } else {
      testGovernanceDashboard();
      testGovernanceScore();
    }

    sleep(1);
  });
}

export function setup() {
  console.log(`🚀 开始 AI 业务智能综合性能测试`);
  console.log(`📌 目标地址: ${BASE_URL}`);
  console.log(`📌 测试场景: 烟雾测试 + 混合负载 + 峰值测试 + 稳定性测试`);
  console.log(`📌 测试模块: Copilot + 表单 + 文档 + 治理`);
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log(`✅ AI 业务智能综合性能测试完成`);
  console.log(`📌 开始时间: ${data.startTime}`);
  console.log(`📌 结束时间: ${new Date().toISOString()}`);
}
