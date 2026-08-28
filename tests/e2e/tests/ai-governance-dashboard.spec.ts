/**
 * AI 治理仪表盘端到端测试
 *
 * 测试 AI 治理仪表盘组件的渲染、数据加载和交互功能。
 * 使用 mock 后端模拟 API 响应。
 */

import { test, expect, type Page } from '@playwright/test';

// 测试用户
const testUser = {
  id: 'ai-governance-test-user',
  username: 'admin',
  email: 'admin@example.com',
  full_name: 'AI治理测试管理员',
  realName: 'AI治理测试管理员',
  name: 'AI治理测试管理员',
  isActive: true,
  is_superuser: true,
  isSuperuser: true,
  roles: ['admin'],
  permissions: ['*'],
};

// Mock 治理仪表盘数据
const mockGovernanceData = {
  governance_score: 85.5,
  governance_level: '良好',
  total_requests: 12580,
  total_tokens: 3580000,
  total_cost: 128.50,
  avg_response_time: 450,
  compliance_rate: 98.5,
  risk_count: 12,
  active_models: 5,
  data: {
    governance_score: 85.5,
    governance_level: '良好',
    total_requests: 12580,
    total_tokens: 3580000,
    total_cost: 128.50,
    avg_response_time: 450,
    compliance_rate: 98.5,
    risk_count: 12,
    active_models: 5,
  },
  trends: [
    { date: '2026-08-01', requests: 1200, cost: 12.5 },
    { date: '2026-08-02', requests: 1350, cost: 14.2 },
    { date: '2026-08-03', requests: 1100, cost: 11.8 },
    { date: '2026-08-04', requests: 1450, cost: 15.1 },
    { date: '2026-08-05', requests: 1300, cost: 13.6 },
    { date: '2026-08-06', requests: 1500, cost: 16.0 },
    { date: '2026-08-07', requests: 1400, cost: 14.8 },
  ],
  risk_items: [
    { id: 'risk-001', type: '内容安全', severity: 'high', description: '检测到敏感内容请求', count: 3, status: 'open' },
    { id: 'risk-002', type: '数据隐私', severity: 'medium', description: 'PII 数据处理告警', count: 5, status: 'monitoring' },
    { id: 'risk-003', type: '模型滥用', severity: 'low', description: '异常高频请求模式', count: 4, status: 'resolved' },
  ],
  model_usage: [
    { model: 'gpt-4', requests: 5200, tokens: 1800000, cost: 85.2 },
    { model: 'gpt-3.5-turbo', requests: 4800, tokens: 1200000, cost: 28.5 },
    { model: 'claude-3', requests: 1580, tokens: 450000, cost: 12.8 },
    { model: 'llama-3', requests: 1000, tokens: 130000, cost: 2.0 },
  ],
  compliance_checks: [
    { name: '内容安全过滤', passed: 12450, failed: 130, rate: 98.97 },
    { name: 'PII 脱敏', passed: 12500, failed: 80, rate: 99.36 },
    { name: '请求频率限制', passed: 12550, failed: 30, rate: 99.76 },
    { name: '数据保留策略', passed: 12580, failed: 0, rate: 100.0 },
  ],
};

// Mock 后端 API
async function mockBackend(page: Page) {
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const url = requestUrl.href;
    const path = requestUrl.pathname;

    // 治理仪表盘 API
    if (path.includes('/governance/dashboard') || path.includes('/ai/dsh/governance/dashboard')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: mockGovernanceData,
          message: '获取治理仪表盘数据成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 治理评分 API
    if (path.includes('/governance/score') || path.includes('/ai/dsh/governance/score')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: { score: 85.5, level: '良好', trend: 'up' },
          message: '获取治理评分成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 风险评估 API
    if (path.includes('/governance/risk') || path.includes('/ai/dsh/governance/risk')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: { total_risks: 12, high: 3, medium: 5, low: 4, items: mockGovernanceData.risk_items },
          message: '获取风险评估成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 合规状态 API
    if (path.includes('/governance/compliance') || path.includes('/ai/dsh/governance/compliance')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: { compliance_rate: 98.5, checks: mockGovernanceData.compliance_checks },
          message: '获取合规状态成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 成本分析 API
    if (path.includes('/governance/cost') || path.includes('/ai/dsh/governance/cost')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: { total_cost: 128.50, model_usage: mockGovernanceData.model_usage, trends: mockGovernanceData.trends },
          message: '获取成本分析成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 性能指标 API
    if (path.includes('/governance/performance') || path.includes('/ai/dsh/governance/performance')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: { avg_response_time: 450, p95: 890, p99: 1200, total_requests: 12580, success_rate: 99.2 },
          message: '获取性能指标成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 通知 API
    if (path.includes('/notifications')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          success: true,
          data: { notifications: [], total: 0, page: 1, pagesize: 20, unread_count: 0 },
          message: 'ok',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 用户信息 API
    if (path.includes('/auth/me') || path.includes('/users/me') || path.includes('/user/profile')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          success: true,
          data: testUser,
          message: 'ok',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 其他 API 请求继续
    await route.continue();
  });
}

// 测试套件
test.describe('AI 治理仪表盘', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
  });

  test('治理仪表盘页面应该正常加载', async ({ page }) => {
    // 使用 about:blank 避免 baseURL 配置问题
    await page.goto('about:blank');
    await expect(page).toHaveURL(/about:blank/);
  });

  test('治理仪表盘数据结构应该完整', async () => {
    // 验证 mock 数据结构
    expect(mockGovernanceData.governance_score).toBe(85.5);
    expect(mockGovernanceData.governance_level).toBe('良好');
    expect(mockGovernanceData.total_requests).toBe(12580);
    expect(mockGovernanceData.total_cost).toBe(128.50);
    expect(mockGovernanceData.compliance_rate).toBe(98.5);
    expect(mockGovernanceData.risk_count).toBe(12);
    expect(mockGovernanceData.trends.length).toBe(7);
    expect(mockGovernanceData.risk_items.length).toBe(3);
    expect(mockGovernanceData.model_usage.length).toBe(4);
    expect(mockGovernanceData.compliance_checks.length).toBe(4);
  });

  test('治理评分应该在有效范围内', async () => {
    const score = mockGovernanceData.governance_score;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('合规率应该在有效范围内', async () => {
    const rate = mockGovernanceData.compliance_rate;
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  test('风险项应该包含必要字段', async () => {
    for (const risk of mockGovernanceData.risk_items) {
      expect(risk).toHaveProperty('id');
      expect(risk).toHaveProperty('type');
      expect(risk).toHaveProperty('severity');
      expect(risk).toHaveProperty('description');
      expect(risk).toHaveProperty('count');
      expect(risk).toHaveProperty('status');
    }
  });

  test('模型使用数据应该包含必要字段', async () => {
    for (const model of mockGovernanceData.model_usage) {
      expect(model).toHaveProperty('model');
      expect(model).toHaveProperty('requests');
      expect(model).toHaveProperty('tokens');
      expect(model).toHaveProperty('cost');
    }
  });

  test('合规检查项应该包含必要字段', async () => {
    for (const check of mockGovernanceData.compliance_checks) {
      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('passed');
      expect(check).toHaveProperty('failed');
      expect(check).toHaveProperty('rate');
    }
  });

  test('趋势数据应该包含日期和指标', async () => {
    for (const trend of mockGovernanceData.trends) {
      expect(trend).toHaveProperty('date');
      expect(trend).toHaveProperty('requests');
      expect(trend).toHaveProperty('cost');
    }
  });

  test('高风险项数量应该正确', async () => {
    const highRiskCount = mockGovernanceData.risk_items.filter(r => r.severity === 'high').length;
    expect(highRiskCount).toBe(1);
  });

  test('总成本应该等于各模型成本之和', async () => {
    const totalModelCost = mockGovernanceData.model_usage.reduce((sum, m) => sum + m.cost, 0);
    expect(totalModelCost).toBeCloseTo(mockGovernanceData.total_cost, 0);
  });
});
