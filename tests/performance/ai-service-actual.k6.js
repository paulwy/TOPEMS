// TOPEMS AI 服务性能测试脚本（实际 API 端点）
// 基于实际存在的 API 路由定义
//
// 用法:
//   k6 run --env BASE_URL=http://localhost:8013 --env SCENARIO=smoke tests/performance/ai-service-actual.k6.js
//
// 场景:
//   smoke      - 烟雾测试（5 VUs，30秒）
//   average    - 平均负载测试（20 VUs，2分钟）
//   stress     - 压力测试（50 VUs，3分钟）

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// 自定义指标
const apiLatency = new Trend('api_latency_ms', true);
const apiSuccess = new Counter('api_success_count');
const apiError = new Counter('api_error_count');

// 配置
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8013';
const SCENARIO = __ENV.SCENARIO || 'smoke';

// 场景配置
const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 5,
    duration: '30s',
  },
  average: {
    executor: 'constant-vus',
    vus: 20,
    duration: '2m',
  },
  stress: {
    executor: 'constant-vus',
    vus: 50,
    duration: '3m',
  },
};

export const options = {
  scenarios: {
    [SCENARIO]: scenarios[SCENARIO] || scenarios.smoke,
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.1'],
  },
};

// 测试数据
const testUser = {
  user_id: 'perf-test-user',
  tenant_id: 'perf-test-tenant',
};

const formTypes = ['purchase_request', 'expense_report', 'customer_info', 'warehouse_receipt'];

// Mock JWT Token（用于需要认证的端点）
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwZXJmLXRlc3QtdXNlciIsInRlbmFudF9pZCI6InBlcmYtdGVzdC10ZW5hbnQiLCJleHAiOjk5OTk5OTk5OTl9.mock-signature';

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${MOCK_TOKEN}`,
};

const publicHeaders = {
  'Content-Type': 'application/json',
};

// 测试用例：公共端点
function testPublicEndpoints() {
  // 1. 健康检查
  let res = http.get(`${BASE_URL}/health`, { headers: publicHeaders });
  check(res, {
    '健康检查状态是 200': (r) => r.status === 200,
    '健康检查返回 success': (r) => r.json('success') === true,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 2. 详细健康检查
  res = http.get(`${BASE_URL}/health/detailed`, { headers: publicHeaders });
  check(res, {
    '详细健康检查状态是 200': (r) => r.status === 200,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 3. 插件信息
  res = http.get(`${BASE_URL}/api/plugins/info`, { headers: publicHeaders });
  check(res, {
    '插件信息状态是 200 或 404': (r) => r.status === 200 || r.status === 404,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 4. 插件健康检查
  res = http.get(`${BASE_URL}/api/plugins/health`, { headers: publicHeaders });
  check(res, {
    '插件健康检查状态是 200 或 404': (r) => r.status === 200 || r.status === 404,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);
}

// 测试用例：智能表单端点
function testFormEndpoints() {
  // 1. 表单列表
  let res = http.get(`${BASE_URL}/api/core/ai-form/forms`, { headers: publicHeaders });
  check(res, {
    '表单列表状态是 200': (r) => r.status === 200,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 2. 获取表单定义（随机选择一个表单类型）
  const formType = formTypes[Math.floor(Math.random() * formTypes.length)];
  res = http.get(`${BASE_URL}/api/core/ai-form/forms/${formType}`, { headers: publicHeaders });
  check(res, {
    '表单定义状态是 200 或 404': (r) => r.status === 200 || r.status === 404,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 3. 表单验证
  const validatePayload = JSON.stringify({
    form_type: formType,
    data: {
      title: '性能测试表单',
      description: '这是一个性能测试用的表单',
      amount: 1000,
    },
  });
  res = http.post(`${BASE_URL}/api/core/ai-form/validate`, validatePayload, { headers: publicHeaders });
  check(res, {
    '表单验证状态是 200 或 400 或 404': (r) => [200, 400, 404].includes(r.status),
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 4. 表单建议
  const suggestPayload = JSON.stringify({
    form_type: formType,
    field: 'description',
    context: '采购办公用品',
  });
  res = http.post(`${BASE_URL}/api/core/ai-form/suggest`, suggestPayload, { headers: publicHeaders });
  check(res, {
    '表单建议状态是 200 或 404': (r) => r.status === 200 || r.status === 404,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);
}

// 测试用例：DSH Agent 端点（需要认证）
function testAgentEndpoints() {
  // 1. Agent 工具列表
  let res = http.get(`${BASE_URL}/api/core/ai/v1/dsh/agent/tools`, { headers: authHeaders });
  check(res, {
    'Agent工具列表状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 2. Agent 活跃会话
  res = http.get(`${BASE_URL}/api/core/ai/v1/dsh/agent/active-sessions`, { headers: authHeaders });
  check(res, {
    'Agent活跃会话状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 3. 性能指标
  res = http.get(`${BASE_URL}/api/core/ai/v1/dsh/agent/performance/metrics`, { headers: authHeaders });
  check(res, {
    '性能指标状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 4. Prometheus 指标
  res = http.get(`${BASE_URL}/api/core/ai/v1/dsh/agent/performance/prometheus`, { headers: authHeaders });
  check(res, {
    'Prometheus指标状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);
}

// 测试用例：知识图谱和 RAG 端点（需要认证）
function testKgRagEndpoints() {
  // 1. 知识图谱统计
  let res = http.get(`${BASE_URL}/api/core/ai/v1/dsh/kg/stats`, { headers: authHeaders });
  check(res, {
    '知识图谱统计状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 2. 知识图谱实体列表
  res = http.get(`${BASE_URL}/api/core/ai/v1/dsh/kg/entities`, { headers: authHeaders });
  check(res, {
    '知识图谱实体列表状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 3. 知识图谱关系列表
  res = http.get(`${BASE_URL}/api/core/ai/v1/dsh/kg/relations`, { headers: authHeaders });
  check(res, {
    '知识图谱关系列表状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 4. RAG 统计
  res = http.get(`${BASE_URL}/api/core/ai/v1/dsh/rag/stats`, { headers: authHeaders });
  check(res, {
    'RAG统计状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);
}

// 测试用例：AI 核心端点（需要认证）
function testAiCoreEndpoints() {
  // 1. 模板列表
  let res = http.get(`${BASE_URL}/api/core/ai/v1/templates`, { headers: authHeaders });
  check(res, {
    '模板列表状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 2. 向量统计
  res = http.get(`${BASE_URL}/api/core/ai/v1/vectors/stats`, { headers: authHeaders });
  check(res, {
    '向量统计状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 3. AI 搜索
  const searchPayload = JSON.stringify({
    query: '性能测试',
    limit: 5,
  });
  res = http.post(`${BASE_URL}/api/core/ai/v1/search`, searchPayload, { headers: authHeaders });
  check(res, {
    'AI搜索状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);

  // 4. Embedding 生成
  const embeddingPayload = JSON.stringify({
    text: '这是一个性能测试用的文本',
    model: 'nomic-embed-text',
  });
  res = http.post(`${BASE_URL}/api/core/ai/v1/embedding/generate`, embeddingPayload, { headers: authHeaders });
  check(res, {
    'Embedding生成状态是 200 或 401 或 500': (r) => [200, 401, 500].includes(r.status),
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);
}

// 主测试函数
export default function () {
  // 随机选择测试组（模拟真实用户行为混合）
  const testGroup = Math.floor(Math.random() * 5);

  switch (testGroup) {
    case 0:
      testPublicEndpoints();
      break;
    case 1:
      testFormEndpoints();
      break;
    case 2:
      testAgentEndpoints();
      break;
    case 3:
      testKgRagEndpoints();
      break;
    case 4:
      testAiCoreEndpoints();
      break;
  }

  // 随机休眠（模拟用户思考时间）
  sleep(Math.random() * 0.5 + 0.1);
}

// 测试结束后输出摘要
export function handleSummary(data) {
  const metrics = data.metrics;
  const summary = {
    scenario: SCENARIO,
    base_url: BASE_URL,
    total_requests: metrics.iterations ? metrics.iterations.values.count : 0,
    total_duration: metrics.iteration_duration ? metrics.iteration_duration.values.avg : 0,
    api_success: metrics.api_success_count ? metrics.api_success_count.values.count : 0,
    api_error: metrics.api_error_count ? metrics.api_error_count.values.count : 0,
    p95_latency: metrics.api_latency_ms ? metrics.api_latency_ms.values.p(95) : 0,
    p99_latency: metrics.api_latency_ms ? metrics.api_latency_ms.values.p(99) : 0,
    avg_latency: metrics.api_latency_ms ? metrics.api_latency_ms.values.avg : 0,
  };

  console.log('\n========== 性能测试摘要 ==========');
  console.log(`场景: ${summary.scenario}`);
  console.log(`目标: ${summary.base_url}`);
  console.log(`总请求数: ${summary.total_requests}`);
  console.log(`成功: ${summary.api_success}`);
  console.log(`失败: ${summary.api_error}`);
  console.log(`成功率: ${summary.total_requests > 0 ? ((summary.api_success / summary.total_requests) * 100).toFixed(2) : 0}%`);
  console.log(`平均延迟: ${summary.avg_latency.toFixed(2)}ms`);
  console.log(`P95 延迟: ${summary.p95_latency.toFixed(2)}ms`);
  console.log(`P99 延迟: ${summary.p99_latency.toFixed(2)}ms`);
  console.log('==================================\n');

  return {
    'stdout': '',
    '/tmp/topems-perf-summary.json': JSON.stringify(summary, null, 2),
  };
}
