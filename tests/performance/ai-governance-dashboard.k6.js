/**
 * AI 治理仪表盘 API - k6 性能测试
 *
 * 测试治理仪表盘 API 的性能和压力承受能力：
 * - 仪表盘数据获取
 * - 治理评分
 * - 风险评估
 * - 合规状态
 * - 成本分析
 * - 性能指标
 *
 * 运行方式：
 *   k6 run tests/performance/ai-governance-dashboard.k6.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ─── 自定义指标 ───
const governanceLatency = new Trend('governance_latency_ms', true);
const governanceSuccessRate = new Rate('governance_success_rate');
const governanceErrorCount = new Counter('governance_error_count');
const dashboardLatency = new Trend('dashboard_latency_ms', true);

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
    'governance_latency_ms': ['p(95)<1500', 'p(99)<3000'],
    'dashboard_latency_ms': ['p(95)<2000', 'p(99)<5000'],
    'governance_success_rate': ['rate>0.99'],
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_PREFIX = '/api/ai/governance';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const TIME_RANGES = ['1h', '24h', '7d', '30d'];

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getDashboard(timeRange) {
  const url = `${BASE_URL}${API_PREFIX}/dashboard?time_range=${timeRange}`;
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;

  dashboardLatency.add(latency);
  governanceLatency.add(latency);

  const success = check(response, {
    '仪表盘状态是 200': (r) => r.status === 200,
    '仪表盘返回 overall_score': (r) => {
      try { return r.json('data.overall_score') !== undefined; } catch (e) { return false; }
    },
  });

  governanceSuccessRate.add(success);
  if (!success) governanceErrorCount.add(1);
  return response;
}

function getScore(timeRange) {
  const url = `${BASE_URL}${API_PREFIX}/score?time_range=${timeRange}`;
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;
  governanceLatency.add(latency);

  const success = check(response, { '治理评分状态是 200': (r) => r.status === 200 });
  governanceSuccessRate.add(success);
  if (!success) governanceErrorCount.add(1);
  return response;
}

function getRisk(timeRange) {
  const url = `${BASE_URL}${API_PREFIX}/risk?time_range=${timeRange}`;
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;
  governanceLatency.add(latency);

  const success = check(response, { '风险评估状态是 200': (r) => r.status === 200 });
  governanceSuccessRate.add(success);
  if (!success) governanceErrorCount.add(1);
  return response;
}

function getCompliance(timeRange) {
  const url = `${BASE_URL}${API_PREFIX}/compliance?time_range=${timeRange}`;
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;
  governanceLatency.add(latency);

  const success = check(response, { '合规状态状态是 200': (r) => r.status === 200 });
  governanceSuccessRate.add(success);
  if (!success) governanceErrorCount.add(1);
  return response;
}

function getCost(timeRange) {
  const url = `${BASE_URL}${API_PREFIX}/cost?time_range=${timeRange}`;
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;
  governanceLatency.add(latency);

  const success = check(response, { '成本分析状态是 200': (r) => r.status === 200 });
  governanceSuccessRate.add(success);
  if (!success) governanceErrorCount.add(1);
  return response;
}

function getPerformance(timeRange) {
  const url = `${BASE_URL}${API_PREFIX}/performance?time_range=${timeRange}`;
  const params = { headers: getHeaders() };

  const startTime = Date.now();
  const response = http.get(url, params);
  const latency = Date.now() - startTime;
  governanceLatency.add(latency);

  const success = check(response, { '性能指标状态是 200': (r) => r.status === 200 });
  governanceSuccessRate.add(success);
  if (!success) governanceErrorCount.add(1);
  return response;
}

export function smokeTest() {
  group('治理仪表盘烟雾测试', () => {
    const timeRange = randomItem(TIME_RANGES);

    getDashboard(timeRange);
    getScore(timeRange);
    getRisk(timeRange);
    getCompliance(timeRange);
    getCost(timeRange);
    getPerformance(timeRange);

    sleep(1);
  });
}

export function averageLoadTest() {
  group('治理仪表盘平均负载测试', () => {
    // 模拟用户查看仪表盘的完整流程
    const timeRange = randomItem(TIME_RANGES);

    // 1. 首先获取完整仪表盘
    getDashboard(timeRange);

    // 2. 然后查看各个详情面板
    getScore(timeRange);
    sleep(0.3);
    getRisk(timeRange);
    sleep(0.3);
    getCompliance(timeRange);
    sleep(0.3);
    getCost(timeRange);
    sleep(0.3);
    getPerformance(timeRange);

    // 3. 切换时间范围
    const newTimeRange = randomItem(TIME_RANGES.filter(t => t !== timeRange));
    getDashboard(newTimeRange);

    sleep(1);
  });
}

export function stressTest() {
  group('治理仪表盘压力测试', () => {
    const timeRange = randomItem(TIME_RANGES);

    // 密集调用所有 API
    getDashboard(timeRange);
    getScore(timeRange);
    getRisk(timeRange);
    getCompliance(timeRange);
    getCost(timeRange);
    getPerformance(timeRange);

    // 再次调用仪表盘（模拟刷新）
    getDashboard(timeRange);

    sleep(0.3);
  });
}

export function setup() {
  console.log(`🚀 开始治理仪表盘 API 性能测试`);
  console.log(`📌 目标地址: ${BASE_URL}`);
  console.log(`📌 API 前缀: ${API_PREFIX}`);
  console.log(`📌 时间范围: ${TIME_RANGES.join(', ')}`);
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log(`✅ 治理仪表盘 API 性能测试完成`);
  console.log(`📌 开始时间: ${data.startTime}`);
  console.log(`📌 结束时间: ${new Date().toISOString()}`);
}
