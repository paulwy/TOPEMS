// TOPEMS AI DSH 服务性能测试脚本（正确 API 端点路径）
//
// 用法:
//   k6 run --env BASE_URL=http://localhost:8013 --env SCENARIO=smoke tests/performance/ai-dsh-service.k6.js
//
// 场景:
//   smoke      - 烟雾测试（5 VUs，30秒）
//   average    - 平均负载测试（20 VUs，2分钟）
//   stress     - 压力测试（50 VUs，3分钟）

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// 自定义指标
const apiLatency = new Trend('dsh_api_latency_ms', true);
const apiSuccess = new Counter('dsh_api_success_count');
const apiError = new Counter('dsh_api_error_count');

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
  // 连接配置优化
  discardResponseBodies: true,
  noVUConnectionReuse: true,
};

// 公共请求头
const publicHeaders = {
  'Content-Type': 'application/json',
};

const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token-for-performance-testing';
const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

export default function () {
  // === 公共端点测试 ===
  
  // 健康检查
  let res = http.get(`${BASE_URL}/health`, { headers: publicHeaders });
  check(res, {
    '健康检查状态是 200': (r) => r.status === 200,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);
  
  sleep(0.5);
  
  // 插件信息
  res = http.get(`${BASE_URL}/api/plugins/info`, { headers: publicHeaders });
  check(res, {
    '插件信息状态是 200': (r) => r.status === 200,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200) apiSuccess.add(1); else apiError.add(1);
  
  sleep(0.5);
  
  // === DSH Agent 端点测试 ===
  
  // Agent 工具列表
  res = http.get(`${BASE_URL}/api/ai/dsh/agent/tools`, { headers: authHeaders });
  check(res, {
    'Agent工具列表状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  if (res.status !== 200 && res.status !== 401) {
    console.error(`Agent工具列表: status=${res.status}, error_code=${res.error_code}, error=${res.error}`);
  }
  apiLatency.add(res.timings.duration);
  if (res.status === 200 || res.status === 401) apiSuccess.add(1); else apiError.add(1);
  
  sleep(0.5);
  
  // Agent 活跃会话
  res = http.get(`${BASE_URL}/api/ai/dsh/agent/active-sessions`, { headers: authHeaders });
  check(res, {
    'Agent活跃会话状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200 || res.status === 401) apiSuccess.add(1); else apiError.add(1);
  
  sleep(0.5);
  
  // === 性能监控端点测试 ===
  
  // 性能指标
  res = http.get(`${BASE_URL}/api/ai/dsh/agent/performance/metrics`, { headers: authHeaders });
  check(res, {
    '性能指标状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200 || res.status === 401) apiSuccess.add(1); else apiError.add(1);
  
  sleep(0.5);
  
  // Prometheus 指标
  res = http.get(`${BASE_URL}/api/ai/dsh/agent/performance/prometheus`, { headers: authHeaders });
  check(res, {
    'Prometheus指标状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200 || res.status === 401) apiSuccess.add(1); else apiError.add(1);
  
  sleep(0.5);
  
  // === 知识图谱端点测试 ===
  
  // 知识图谱实体列表
  res = http.get(`${BASE_URL}/api/ai/dsh/kg/entities`, { headers: authHeaders });
  check(res, {
    '知识图谱实体列表状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200 || res.status === 401) apiSuccess.add(1); else apiError.add(1);
  
  sleep(0.5);
  
  // === 业务 Copilot 端点测试 ===
  
  // 业务模块列表
  res = http.get(`${BASE_URL}/api/ai/dsh/copilot/modules`, { headers: authHeaders });
  check(res, {
    '业务模块列表状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200 || res.status === 401) apiSuccess.add(1); else apiError.add(1);
  
  sleep(0.5);
  
  // 创建会话
  const createSessionPayload = JSON.stringify({
    user_id: 'perf-test-user',
    module: 'General',
  });
  res = http.post(`${BASE_URL}/api/ai/dsh/copilot/sessions`, createSessionPayload, { headers: authHeaders });
  check(res, {
    '创建会话状态是 200/201 或 401': (r) => r.status === 200 || r.status === 201 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200 || res.status === 201 || res.status === 401) apiSuccess.add(1); else apiError.add(1);
  
  sleep(0.5);
  
  // === 治理仪表盘端点测试 ===
  
  // 治理仪表盘
  res = http.get(`${BASE_URL}/api/ai/dsh/governance/dashboard`, { headers: authHeaders });
  check(res, {
    '治理仪表盘状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200 || res.status === 401) apiSuccess.add(1); else apiError.add(1);
  
  sleep(0.5);
  
  // 治理评分
  res = http.get(`${BASE_URL}/api/ai/dsh/governance/score`, { headers: authHeaders });
  check(res, {
    '治理评分状态是 200 或 401': (r) => r.status === 200 || r.status === 401,
  });
  apiLatency.add(res.timings.duration);
  if (res.status === 200 || res.status === 401) apiSuccess.add(1); else apiError.add(1);
  
  sleep(1);
}
