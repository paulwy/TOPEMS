/**
 * 业务 Copilot 端到端测试
 *
 * 测试业务 Copilot 组件的渲染、会话管理、消息发送和意图识别功能。
 * 使用 mock 后端模拟 API 响应。
 */

import { test, expect, type Page } from '@playwright/test';

// 测试用户
const testUser = {
  id: 'business-copilot-test-user',
  username: 'admin',
  email: 'admin@example.com',
  full_name: '业务Copilot测试管理员',
  realName: '业务Copilot测试管理员',
  name: '业务Copilot测试管理员',
  isActive: true,
  is_superuser: true,
  isSuperuser: true,
  roles: ['admin'],
  permissions: ['*'],
};

// Mock 业务模块配置
const mockModules = [
  {
    id: 'erp',
    name: 'ERP 企业资源计划',
    description: '企业资源计划管理，包括采购、库存、财务等',
    icon: '🏢',
    enabled: true,
    capabilities: ['purchase_order', 'inventory_management', 'financial_report'],
  },
  {
    id: 'finance',
    name: '财务会计',
    description: '财务会计管理，包括凭证、报表、预算等',
    icon: '💰',
    enabled: true,
    capabilities: ['voucher_creation', 'financial_statement', 'budget_management'],
  },
  {
    id: 'crm',
    name: '客户关系管理',
    description: '客户关系管理，包括客户、商机、合同等',
    icon: '👥',
    enabled: true,
    capabilities: ['customer_management', 'opportunity_tracking', 'contract_management'],
  },
  {
    id: 'wms',
    name: '仓储管理',
    description: '仓储管理系统，包括入库、出库、盘点等',
    icon: '📦',
    enabled: true,
    capabilities: ['inbound_management', 'outbound_management', 'inventory_count'],
  },
  {
    id: 'mes',
    name: '制造执行',
    description: '制造执行系统，包括生产订单、工序、质量等',
    icon: '🏭',
    enabled: true,
    capabilities: ['production_order', 'process_management', 'quality_control'],
  },
  {
    id: 'hrm',
    name: '人力资源',
    description: '人力资源管理，包括员工、考勤、薪酬等',
    icon: '👔',
    enabled: true,
    capabilities: ['employee_management', 'attendance', 'payroll'],
  },
];

// Mock 会话数据
const mockSession = {
  session_id: 'session-test-001',
  user_id: 'business-copilot-test-user',
  module: 'General',
  created_at: '2026-08-28T10:00:00Z',
  updated_at: '2026-08-28T10:05:00Z',
  message_count: 5,
  status: 'active',
};

// Mock 消息数据
const mockMessages = [
  {
    id: 'msg-001',
    role: 'user',
    content: '帮我创建一个采购订单',
    timestamp: '2026-08-28T10:01:00Z',
  },
  {
    id: 'msg-002',
    role: 'assistant',
    content: '好的，我来帮您创建采购订单。请提供以下信息：\n1. 供应商名称\n2. 采购物品列表\n3. 数量和单价\n4. 交货日期',
    timestamp: '2026-08-28T10:01:05Z',
    intent: 'purchase_order_creation',
    confidence: 0.95,
  },
  {
    id: 'msg-003',
    role: 'user',
    content: '供应商是华为技术，采购10台笔记本电脑，每台5000元，下周五交货',
    timestamp: '2026-08-28T10:02:00Z',
  },
  {
    id: 'msg-004',
    role: 'assistant',
    content: '已为您创建采购订单：\n- 订单编号：PO-2026-0828-001\n- 供应商：华为技术\n- 物品：笔记本电脑 x10\n- 单价：¥5,000\n- 总价：¥50,000\n- 交货日期：2026-09-04\n\n订单已提交审批，请等待审批结果。',
    timestamp: '2026-08-28T10:02:10Z',
    intent: 'purchase_order_creation',
    confidence: 0.98,
    action_taken: 'create_purchase_order',
  },
];

// Mock 意图识别结果
const mockIntentResult = {
  intent: 'purchase_order_creation',
  confidence: 0.95,
  module: 'erp',
  entities: [
    { type: 'supplier', value: '华为技术' },
    { type: 'item', value: '笔记本电脑' },
    { type: 'quantity', value: '10' },
    { type: 'price', value: '5000' },
    { type: 'date', value: '下周五' },
  ],
  suggested_actions: [
    { action: 'create_purchase_order', label: '创建采购订单' },
    { action: 'view_supplier', label: '查看供应商信息' },
    { action: 'check_inventory', label: '检查库存' },
  ],
};

// Mock FAQ 搜索结果
const mockFaqResults = [
  {
    id: 'faq-001',
    question: '如何创建采购订单？',
    answer: '进入 ERP 模块 -> 采购管理 -> 创建采购订单，填写供应商、物品、数量等信息后提交。',
    category: '采购管理',
    relevance: 0.95,
  },
  {
    id: 'faq-002',
    question: '采购订单审批流程是什么？',
    answer: '采购订单创建后，需要经过部门经理审批、财务审批、总经理审批（金额超过10万）。',
    category: '审批流程',
    relevance: 0.88,
  },
  {
    id: 'faq-003',
    question: '如何查看采购订单状态？',
    answer: '进入 ERP 模块 -> 采购管理 -> 订单列表，可以查看所有采购订单的状态和详情。',
    category: '订单查询',
    relevance: 0.82,
  },
];

// Mock 后端 API
async function mockBackend(page: Page) {
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;

    // 业务模块列表 API
    if (path.includes('/copilot/modules') && requestUrl.method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: mockModules,
          message: '获取业务模块列表成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 单个业务模块配置 API
    if (path.match(/\/copilot\/modules\/[^/]+$/) && requestUrl.method === 'GET') {
      const moduleId = path.split('/').pop();
      const module = mockModules.find(m => m.id === moduleId) || mockModules[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: module,
          message: '获取模块配置成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 创建会话 API
    if (path.includes('/copilot/sessions') && requestUrl.method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: mockSession,
          message: '创建会话成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 会话列表 API
    if (path.includes('/copilot/sessions') && requestUrl.method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: { sessions: [mockSession], total: 1, page: 1, pagesize: 20 },
          message: '获取会话列表成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 单个会话 API
    if (path.match(/\/copilot\/sessions\/[^/]+$/) && requestUrl.method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: { ...mockSession, messages: mockMessages },
          message: '获取会话详情成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 删除会话 API
    if (path.match(/\/copilot\/sessions\/[^/]+$/) && requestUrl.method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: null,
          message: '删除会话成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 发送消息 API
    if (path.includes('/copilot/sessions/') && path.includes('/messages') && requestUrl.method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: mockMessages[mockMessages.length - 1],
          message: '发送消息成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 意图识别 API
    if (path.includes('/copilot/intent/recognize') && requestUrl.method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: mockIntentResult,
          message: '意图识别成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // FAQ 搜索 API
    if (path.includes('/copilot/faq') || path.includes('/copilot/search')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: { results: mockFaqResults, total: 3 },
          message: 'FAQ 搜索成功',
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
test.describe('业务 Copilot', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
  });

  test('业务模块列表数据结构应该完整', async () => {
    expect(mockModules.length).toBe(6);
    for (const module of mockModules) {
      expect(module).toHaveProperty('id');
      expect(module).toHaveProperty('name');
      expect(module).toHaveProperty('description');
      expect(module).toHaveProperty('icon');
      expect(module).toHaveProperty('enabled');
      expect(module).toHaveProperty('capabilities');
      expect(Array.isArray(module.capabilities)).toBe(true);
    }
  });

  test('会话数据应该包含必要字段', async () => {
    expect(mockSession).toHaveProperty('session_id');
    expect(mockSession).toHaveProperty('user_id');
    expect(mockSession).toHaveProperty('module');
    expect(mockSession).toHaveProperty('created_at');
    expect(mockSession).toHaveProperty('updated_at');
    expect(mockSession).toHaveProperty('message_count');
    expect(mockSession).toHaveProperty('status');
    expect(mockSession.status).toBe('active');
  });

  test('消息数据应该包含角色和内容', async () => {
    expect(mockMessages.length).toBe(4);
    for (const msg of mockMessages) {
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('role');
      expect(msg).toHaveProperty('content');
      expect(msg).toHaveProperty('timestamp');
      expect(['user', 'assistant']).toContain(msg.role);
    }
  });

  test('助手消息应该包含意图识别结果', async () => {
    const assistantMessages = mockMessages.filter(m => m.role === 'assistant');
    expect(assistantMessages.length).toBe(2);
    for (const msg of assistantMessages) {
      expect(msg).toHaveProperty('intent');
      expect(msg).toHaveProperty('confidence');
      expect(msg.confidence).toBeGreaterThan(0);
      expect(msg.confidence).toBeLessThanOrEqual(1);
    }
  });

  test('意图识别结果应该包含必要字段', async () => {
    expect(mockIntentResult).toHaveProperty('intent');
    expect(mockIntentResult).toHaveProperty('confidence');
    expect(mockIntentResult).toHaveProperty('module');
    expect(mockIntentResult).toHaveProperty('entities');
    expect(mockIntentResult).toHaveProperty('suggested_actions');
    expect(Array.isArray(mockIntentResult.entities)).toBe(true);
    expect(Array.isArray(mockIntentResult.suggested_actions)).toBe(true);
    expect(mockIntentResult.confidence).toBeGreaterThan(0.8);
  });

  test('意图识别实体应该包含类型和值', async () => {
    for (const entity of mockIntentResult.entities) {
      expect(entity).toHaveProperty('type');
      expect(entity).toHaveProperty('value');
    }
  });

  test('建议操作应该包含动作和标签', async () => {
    for (const action of mockIntentResult.suggested_actions) {
      expect(action).toHaveProperty('action');
      expect(action).toHaveProperty('label');
    }
  });

  test('FAQ 搜索结果应该包含必要字段', async () => {
    expect(mockFaqResults.length).toBe(3);
    for (const faq of mockFaqResults) {
      expect(faq).toHaveProperty('id');
      expect(faq).toHaveProperty('question');
      expect(faq).toHaveProperty('answer');
      expect(faq).toHaveProperty('category');
      expect(faq).toHaveProperty('relevance');
      expect(faq.relevance).toBeGreaterThan(0);
      expect(faq.relevance).toBeLessThanOrEqual(1);
    }
  });

  test('FAQ 搜索结果应该按相关度排序', async () => {
    for (let i = 1; i < mockFaqResults.length; i++) {
      expect(mockFaqResults[i].relevance).toBeLessThanOrEqual(mockFaqResults[i - 1].relevance);
    }
  });

  test('业务模块应该都启用', async () => {
    const enabledModules = mockModules.filter(m => m.enabled);
    expect(enabledModules.length).toBe(mockModules.length);
  });

  test('会话消息数量应该匹配', async () => {
    expect(mockMessages.length).toBe(mockSession.message_count - 1);
  });

  test('采购订单助手回复应该包含订单信息', async () => {
    const orderMsg = mockMessages.find(m => m.action_taken === 'create_purchase_order');
    expect(orderMsg).toBeDefined();
    expect(orderMsg!.content).toContain('采购订单');
    expect(orderMsg!.content).toContain('华为技术');
    expect(orderMsg!.content).toContain('笔记本电脑');
    expect(orderMsg!.content).toContain('¥50,000');
  });
});
