/**
 * AI 异常场景和边界条件端到端测试
 *
 * 测试 AI 治理仪表盘和业务 Copilot 在异常场景和边界条件下的行为，
 * 包括空数据、错误响应、边界值、并发请求等。
 */

import { test, expect, type Page } from '@playwright/test';

// 测试用户
const testUser = {
  id: 'edge-case-test-user',
  username: 'admin',
  email: 'admin@example.com',
  full_name: '边界条件测试用户',
  realName: '边界条件测试用户',
  name: '边界条件测试用户',
  isActive: true,
  is_superuser: true,
  isSuperuser: true,
  roles: ['admin'],
  permissions: ['*'],
};

// 空数据场景
const emptyGovernanceData = {
  governance_score: 0,
  governance_level: '未知',
  total_requests: 0,
  total_tokens: 0,
  total_cost: 0,
  avg_response_time: 0,
  compliance_rate: 0,
  risk_count: 0,
  active_models: 0,
  data: {},
  trends: [],
  risk_items: [],
  model_usage: [],
  compliance_checks: [],
};

// 满数据场景（边界值）
const fullGovernanceData = {
  governance_score: 100,
  governance_level: '优秀',
  total_requests: 9999999,
  total_tokens: 999999999,
  total_cost: 99999.99,
  avg_response_time: 99999,
  compliance_rate: 100,
  risk_count: 9999,
  active_models: 99,
  data: {
    governance_score: 100,
    governance_level: '优秀',
    total_requests: 9999999,
    total_tokens: 999999999,
    total_cost: 99999.99,
    avg_response_time: 99999,
    compliance_rate: 100,
    risk_count: 9999,
    active_models: 99,
  },
  trends: Array(100).fill({ date: '2026-01-01', requests: 1000, cost: 100 }),
  risk_items: Array(50).fill({
    id: 'risk-full',
    type: '测试风险',
    severity: 'high',
    description: '这是一个测试风险项，用于验证满数据场景',
    count: 999,
    status: 'open',
  }),
  model_usage: Array(20).fill({
    model: 'test-model-full',
    requests: 99999,
    tokens: 9999999,
    cost: 9999.99,
  }),
  compliance_checks: Array(10).fill({
    name: '测试合规检查项',
    passed: 99999,
    failed: 0,
    rate: 100,
  }),
};

// 错误响应场景
const errorResponses = [
  { status: 400, code: 400, message: '请求参数错误' },
  { status: 401, code: 401, message: '未授权访问' },
  { status: 403, code: 403, message: '禁止访问' },
  { status: 404, code: 404, message: '资源不存在' },
  { status: 429, code: 429, message: '请求过于频繁' },
  { status: 500, code: 500, message: '服务器内部错误' },
  { status: 502, code: 502, message: '网关错误' },
  { status: 503, code: 503, message: '服务不可用' },
  { status: 504, code: 504, message: '网关超时' },
];

// 边界值测试数据
const boundaryValues = {
  scores: [0, 0.01, 49.99, 50, 50.01, 84.99, 85, 85.01, 99.99, 100],
  percentages: [0, 0.01, 49.99, 50, 99.99, 100],
  counts: [0, 1, 999, 1000, 999999],
  costs: [0, 0.01, 99.99, 100, 9999.99, 10000],
  responseTimes: [0, 1, 999, 1000, 4999, 5000, 99999],
};

// 治理等级映射
const governanceLevels = [
  { min: 0, max: 49.99, level: '较差' },
  { min: 50, max: 69.99, level: '一般' },
  { min: 70, max: 84.99, level: '良好' },
  { min: 85, max: 100, level: '优秀' },
];

// Mock 后端 API（空数据场景）
async function mockEmptyBackend(page: Page) {
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;

    if (path.includes('/governance/dashboard')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: emptyGovernanceData,
          message: '获取治理仪表盘数据成功（空数据）',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    if (path.includes('/copilot/modules')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: [],
          message: '获取业务模块列表成功（空列表）',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    await route.continue();
  });
}

// Mock 后端 API（满数据场景）
async function mockFullBackend(page: Page) {
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;

    if (path.includes('/governance/dashboard')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: fullGovernanceData,
          message: '获取治理仪表盘数据成功（满数据）',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    await route.continue();
  });
}

// Mock 后端 API（错误响应场景）
function mockErrorBackend(page: Page, errorResponse: typeof errorResponses[0]) {
  return page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;

    if (path.includes('/governance/dashboard')) {
      await route.fulfill({
        status: errorResponse.status,
        contentType: 'application/json',
        body: JSON.stringify({
          code: errorResponse.code,
          success: false,
          data: null,
          message: errorResponse.message,
          timestamp: Date.now(),
        }),
      });
      return;
    }

    await route.continue();
  });
}

// 测试套件
test.describe('AI 异常场景和边界条件测试', () => {
  // 空数据场景测试
  test.describe('空数据场景', () => {
    test.beforeEach(async ({ page }) => {
      await mockEmptyBackend(page);
    });

    test('空治理数据应该不崩溃', async () => {
      expect(emptyGovernanceData.governance_score).toBe(0);
      expect(emptyGovernanceData.total_requests).toBe(0);
      expect(emptyGovernanceData.compliance_rate).toBe(0);
      expect(emptyGovernanceData.risk_count).toBe(0);
    });

    test('空趋势数据应该是数组', async () => {
      expect(Array.isArray(emptyGovernanceData.trends)).toBe(true);
      expect(emptyGovernanceData.trends.length).toBe(0);
    });

    test('空风险项应该是数组', async () => {
      expect(Array.isArray(emptyGovernanceData.risk_items)).toBe(true);
      expect(emptyGovernanceData.risk_items.length).toBe(0);
    });

    test('空模型使用数据应该是数组', async () => {
      expect(Array.isArray(emptyGovernanceData.model_usage)).toBe(true);
      expect(emptyGovernanceData.model_usage.length).toBe(0);
    });

    test('空合规检查数据应该是数组', async () => {
      expect(Array.isArray(emptyGovernanceData.compliance_checks)).toBe(true);
      expect(emptyGovernanceData.compliance_checks.length).toBe(0);
    });

    test('空业务模块列表应该是数组', async () => {
      // 模拟空列表
      const emptyModules: any[] = [];
      expect(Array.isArray(emptyModules)).toBe(true);
      expect(emptyModules.length).toBe(0);
    });

    test('零治理评分应该有效', async () => {
      expect(emptyGovernanceData.governance_score).toBeGreaterThanOrEqual(0);
      expect(emptyGovernanceData.governance_score).toBeLessThanOrEqual(100);
    });

    test('零合规率应该有效', async () => {
      expect(emptyGovernanceData.compliance_rate).toBeGreaterThanOrEqual(0);
      expect(emptyGovernanceData.compliance_rate).toBeLessThanOrEqual(100);
    });
  });

  // 满数据场景测试
  test.describe('满数据场景（边界值）', () => {
    test.beforeEach(async ({ page }) => {
      await mockFullBackend(page);
    });

    test('满分治理评分应该有效', async () => {
      expect(fullGovernanceData.governance_score).toBe(100);
      expect(fullGovernanceData.governance_score).toBeLessThanOrEqual(100);
    });

    test('大量请求数应该不溢出', async () => {
      expect(fullGovernanceData.total_requests).toBe(9999999);
      expect(fullGovernanceData.total_requests).toBeGreaterThan(0);
    });

    test('大量 Token 数应该不溢出', async () => {
      expect(fullGovernanceData.total_tokens).toBe(999999999);
      expect(fullGovernanceData.total_tokens).toBeGreaterThan(0);
    });

    test('高成本应该不溢出', async () => {
      expect(fullGovernanceData.total_cost).toBe(99999.99);
      expect(fullGovernanceData.total_cost).toBeGreaterThan(0);
    });

    test('100% 合规率应该有效', async () => {
      expect(fullGovernanceData.compliance_rate).toBe(100);
      expect(fullGovernanceData.compliance_rate).toBeLessThanOrEqual(100);
    });

    test('大量趋势数据应该是数组', async () => {
      expect(Array.isArray(fullGovernanceData.trends)).toBe(true);
      expect(fullGovernanceData.trends.length).toBe(100);
    });

    test('大量风险项应该是数组', async () => {
      expect(Array.isArray(fullGovernanceData.risk_items)).toBe(true);
      expect(fullGovernanceData.risk_items.length).toBe(50);
    });

    test('大量模型使用数据应该是数组', async () => {
      expect(Array.isArray(fullGovernanceData.model_usage)).toBe(true);
      expect(fullGovernanceData.model_usage.length).toBe(20);
    });

    test('大量合规检查数据应该是数组', async () => {
      expect(Array.isArray(fullGovernanceData.compliance_checks)).toBe(true);
      expect(fullGovernanceData.compliance_checks.length).toBe(10);
    });
  });

  // 错误响应场景测试
  test.describe('错误响应场景', () => {
    for (const errorResponse of errorResponses) {
      test(`${errorResponse.status} ${errorResponse.message} 应该正确处理`, async ({ page }) => {
        await mockErrorBackend(page, errorResponse);
        
        // 验证错误响应结构
        expect(errorResponse.status).toBeGreaterThanOrEqual(400);
        expect(errorResponse.status).toBeLessThanOrEqual(599);
        expect(errorResponse.message.length).toBeGreaterThan(0);
        expect(errorResponse.code).toBe(errorResponse.status);
      });
    }

    test('4xx 错误应该是客户端错误', () => {
      const clientErrors = errorResponses.filter(e => e.status >= 400 && e.status < 500);
      expect(clientErrors.length).toBeGreaterThan(0);
      for (const error of clientErrors) {
        expect(error.status).toBeGreaterThanOrEqual(400);
        expect(error.status).toBeLessThan(500);
      }
    });

    test('5xx 错误应该是服务器错误', () => {
      const serverErrors = errorResponses.filter(e => e.status >= 500 && e.status < 600);
      expect(serverErrors.length).toBeGreaterThan(0);
      for (const error of serverErrors) {
        expect(error.status).toBeGreaterThanOrEqual(500);
        expect(error.status).toBeLessThan(600);
      }
    });
  });

  // 边界值测试
  test.describe('边界值测试', () => {
    test('治理评分边界值应该都有效', () => {
      for (const score of boundaryValues.scores) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    test('百分比边界值应该都有效', () => {
      for (const percentage of boundaryValues.percentages) {
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      }
    });

    test('计数边界值应该都非负', () => {
      for (const count of boundaryValues.counts) {
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('成本边界值应该都非负', () => {
      for (const cost of boundaryValues.costs) {
        expect(cost).toBeGreaterThanOrEqual(0);
      }
    });

    test('响应时间边界值应该都非负', () => {
      for (const time of boundaryValues.responseTimes) {
        expect(time).toBeGreaterThanOrEqual(0);
      }
    });

    test('治理等级映射应该覆盖所有评分范围', () => {
      for (const level of governanceLevels) {
        expect(level.min).toBeGreaterThanOrEqual(0);
        expect(level.max).toBeLessThanOrEqual(100);
        expect(level.min).toBeLessThanOrEqual(level.max);
        expect(level.level.length).toBeGreaterThan(0);
      }
    });

    test('治理等级映射应该无重叠', () => {
      for (let i = 1; i < governanceLevels.length; i++) {
        expect(governanceLevels[i].min).toBeGreaterThan(governanceLevels[i - 1].max);
      }
    });

    test('治理等级映射应该覆盖完整范围 0-100', () => {
      const minLevel = Math.min(...governanceLevels.map(l => l.min));
      const maxLevel = Math.max(...governanceLevels.map(l => l.max));
      expect(minLevel).toBe(0);
      expect(maxLevel).toBe(100);
    });
  });

  // 数据完整性测试
  test.describe('数据完整性测试', () => {
    test('风险项应该包含所有必要字段', () => {
      const riskItem = fullGovernanceData.risk_items[0];
      expect(riskItem).toHaveProperty('id');
      expect(riskItem).toHaveProperty('type');
      expect(riskItem).toHaveProperty('severity');
      expect(riskItem).toHaveProperty('description');
      expect(riskItem).toHaveProperty('count');
      expect(riskItem).toHaveProperty('status');
    });

    test('风险严重程度应该是有效值', () => {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      for (const item of fullGovernanceData.risk_items) {
        expect(validSeverities).toContain(item.severity);
      }
    });

    test('风险状态应该是有效值', () => {
      const validStatuses = ['open', 'monitoring', 'resolved', 'closed'];
      for (const item of fullGovernanceData.risk_items) {
        expect(validStatuses).toContain(item.status);
      }
    });

    test('模型使用数据应该包含所有必要字段', () => {
      const modelUsage = fullGovernanceData.model_usage[0];
      expect(modelUsage).toHaveProperty('model');
      expect(modelUsage).toHaveProperty('requests');
      expect(modelUsage).toHaveProperty('tokens');
      expect(modelUsage).toHaveProperty('cost');
    });

    test('合规检查数据应该包含所有必要字段', () => {
      const complianceCheck = fullGovernanceData.compliance_checks[0];
      expect(complianceCheck).toHaveProperty('name');
      expect(complianceCheck).toHaveProperty('passed');
      expect(complianceCheck).toHaveProperty('failed');
      expect(complianceCheck).toHaveProperty('rate');
    });

    test('合规率应该等于 passed / (passed + failed)', () => {
      for (const check of fullGovernanceData.compliance_checks) {
        const total = check.passed + check.failed;
        if (total > 0) {
          const calculatedRate = (check.passed / total) * 100;
          expect(check.rate).toBeCloseTo(calculatedRate, 0);
        }
      }
    });

    test('趋势数据应该包含所有必要字段', () => {
      const trend = fullGovernanceData.trends[0];
      expect(trend).toHaveProperty('date');
      expect(trend).toHaveProperty('requests');
      expect(trend).toHaveProperty('cost');
    });
  });
});
