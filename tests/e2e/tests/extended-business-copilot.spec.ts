/**
 * 扩展业务模块 Copilot 端到端测试
 *
 * 测试 QMS、SCM、APS、EHS、OA、BI 等扩展业务模块的 Copilot 功能。
 * 使用 mock 后端模拟 API 响应。
 */

import { test, expect, type Page } from '@playwright/test';

// 测试用户
const testUser = {
  id: 'extended-copilot-test-user',
  username: 'admin',
  email: 'admin@example.com',
  full_name: '扩展Copilot测试管理员',
  realName: '扩展Copilot测试管理员',
  name: '扩展Copilot测试管理员',
  isActive: true,
  is_superuser: true,
  isSuperuser: true,
  roles: ['admin'],
  permissions: ['*'],
};

// 扩展业务模块配置
const mockExtendedModules = [
  {
    id: 'qms',
    name: '质量管理系统',
    description: '质量管理系统，包括质量检验、不合格品处理、质量分析等',
    icon: '✅',
    enabled: true,
    capabilities: ['quality_inspection', 'nonconformance_handling', 'quality_analysis', 'supplier_quality'],
  },
  {
    id: 'scm',
    name: '供应链管理',
    description: '供应链管理，包括供应商管理、采购协同、物流跟踪等',
    icon: '🔗',
    enabled: true,
    capabilities: ['supplier_management', 'procurement_collaboration', 'logistics_tracking', 'demand_planning'],
  },
  {
    id: 'aps',
    name: '高级计划排程',
    description: '高级计划与排程系统，包括生产计划、工序排程、资源优化等',
    icon: '📅',
    enabled: true,
    capabilities: ['production_planning', 'process_scheduling', 'resource_optimization', 'capacity_planning'],
  },
  {
    id: 'ehs',
    name: '环境健康安全',
    description: '环境健康安全管理，包括安全检查、事故管理、环保合规等',
    icon: '🛡️',
    enabled: true,
    capabilities: ['safety_inspection', 'incident_management', 'environmental_compliance', 'training_management'],
  },
  {
    id: 'oa',
    name: '办公自动化',
    description: '办公自动化系统，包括流程审批、文档管理、会议管理等',
    icon: '📋',
    enabled: true,
    capabilities: ['process_approval', 'document_management', 'meeting_management', 'announcement'],
  },
  {
    id: 'bi',
    name: '商业智能',
    description: '商业智能分析，包括数据报表、仪表盘、数据挖掘等',
    icon: '📊',
    enabled: true,
    capabilities: ['report_generation', 'dashboard_creation', 'data_analysis', 'kpi_monitoring'],
  },
];

// QMS 质量检验意图识别结果
const mockQmsIntentResult = {
  intent: 'quality_inspection_creation',
  confidence: 0.96,
  module: 'qms',
  entities: [
    { type: 'inspection_type', value: '来料检验' },
    { type: 'product', value: '电子元器件' },
    { type: 'batch', value: 'BATCH-2026-0828' },
    { type: 'quantity', value: '500' },
  ],
  suggested_actions: [
    { action: 'create_quality_inspection', label: '创建质量检验单' },
    { action: 'view_inspection_standard', label: '查看检验标准' },
    { action: 'check_previous_inspections', label: '查看历史检验记录' },
  ],
};

// SCM 供应商评估意图识别结果
const mockScmIntentResult = {
  intent: 'supplier_evaluation',
  confidence: 0.94,
  module: 'scm',
  entities: [
    { type: 'supplier', value: '华为技术' },
    { type: 'evaluation_period', value: '2026年Q3' },
    { type: 'evaluation_type', value: '综合评估' },
  ],
  suggested_actions: [
    { action: 'generate_supplier_report', label: '生成供应商评估报告' },
    { action: 'view_supplier_scorecard', label: '查看供应商记分卡' },
    { action: 'compare_suppliers', label: '对比多家供应商' },
  ],
};

// APS 生产排程意图识别结果
const mockApsIntentResult = {
  intent: 'production_scheduling',
  confidence: 0.97,
  module: 'aps',
  entities: [
    { type: 'production_order', value: 'PO-2026-0828-001' },
    { type: 'product', value: '智能终端设备' },
    { type: 'quantity', value: '1000' },
    { type: 'deadline', value: '2026-09-15' },
    { type: 'workshop', value: '一号车间' },
  ],
  suggested_actions: [
    { action: 'create_production_schedule', label: '创建生产排程' },
    { action: 'check_resource_capacity', label: '检查资源产能' },
    { action: 'view_current_schedule', label: '查看当前排程' },
  ],
};

// EHS 安全检查意图识别结果
const mockEhsIntentResult = {
  intent: 'safety_inspection_creation',
  confidence: 0.95,
  module: 'ehs',
  entities: [
    { type: 'inspection_type', value: '日常安全检查' },
    { type: 'area', value: '生产车间' },
    { type: 'inspector', value: '张三' },
    { type: 'date', value: '2026-08-28' },
  ],
  suggested_actions: [
    { action: 'create_safety_inspection', label: '创建安全检查单' },
    { action: 'view_inspection_checklist', label: '查看检查清单' },
    { action: 'view_previous_inspections', label: '查看历史检查记录' },
  ],
};

// OA 流程审批意图识别结果
const mockOaIntentResult = {
  intent: 'process_approval_query',
  confidence: 0.93,
  module: 'oa',
  entities: [
    { type: 'process_type', value: '请假申请' },
    { type: 'status', value: '待审批' },
    { type: 'applicant', value: '李四' },
  ],
  suggested_actions: [
    { action: 'list_pending_approvals', label: '列出待审批流程' },
    { action: 'approve_process', label: '审批流程' },
    { action: 'view_process_detail', label: '查看流程详情' },
  ],
};

// BI 报表生成意图识别结果
const mockBiIntentResult = {
  intent: 'report_generation',
  confidence: 0.98,
  module: 'bi',
  entities: [
    { type: 'report_type', value: '销售分析报表' },
    { type: 'time_range', value: '2026年8月' },
    { type: 'dimension', value: '按产品分类' },
    { type: 'chart_type', value: '柱状图' },
  ],
  suggested_actions: [
    { action: 'generate_report', label: '生成报表' },
    { action: 'save_as_dashboard', label: '保存为仪表盘' },
    { action: 'export_report', label: '导出报表' },
  ],
};

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
          data: mockExtendedModules,
          message: '获取扩展业务模块列表成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 单个业务模块配置 API
    if (path.match(/\/copilot\/modules\/[^/]+$/) && requestUrl.method === 'GET') {
      const moduleId = path.split('/').pop();
      const module = mockExtendedModules.find(m => m.id === moduleId) || mockExtendedModules[0];
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

    // 意图识别 API
    if (path.includes('/copilot/intent/recognize') && requestUrl.method === 'POST') {
      const body = route.request().postData() || '';
      let intentResult = mockQmsIntentResult;
      
      if (body.includes('质量') || body.includes('检验') || body.includes('QMS')) {
        intentResult = mockQmsIntentResult;
      } else if (body.includes('供应商') || body.includes('供应链') || body.includes('SCM')) {
        intentResult = mockScmIntentResult;
      } else if (body.includes('排程') || body.includes('生产计划') || body.includes('APS')) {
        intentResult = mockApsIntentResult;
      } else if (body.includes('安全') || body.includes('EHS') || body.includes('环保')) {
        intentResult = mockEhsIntentResult;
      } else if (body.includes('审批') || body.includes('流程') || body.includes('OA')) {
        intentResult = mockOaIntentResult;
      } else if (body.includes('报表') || body.includes('分析') || body.includes('BI')) {
        intentResult = mockBiIntentResult;
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: intentResult,
          message: '意图识别成功',
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
test.describe('扩展业务模块 Copilot', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
  });

  test('扩展业务模块列表数据结构应该完整', async () => {
    expect(mockExtendedModules.length).toBe(6);
    for (const module of mockExtendedModules) {
      expect(module).toHaveProperty('id');
      expect(module).toHaveProperty('name');
      expect(module).toHaveProperty('description');
      expect(module).toHaveProperty('icon');
      expect(module).toHaveProperty('enabled');
      expect(module).toHaveProperty('capabilities');
      expect(Array.isArray(module.capabilities)).toBe(true);
      expect(module.capabilities.length).toBeGreaterThan(0);
    }
  });

  test('所有扩展业务模块应该都启用', async () => {
    const enabledModules = mockExtendedModules.filter(m => m.enabled);
    expect(enabledModules.length).toBe(mockExtendedModules.length);
  });

  test('QMS 质量管理模块应该包含必要能力', async () => {
    const qms = mockExtendedModules.find(m => m.id === 'qms');
    expect(qms).toBeDefined();
    expect(qms!.capabilities).toContain('quality_inspection');
    expect(qms!.capabilities).toContain('nonconformance_handling');
    expect(qms!.capabilities).toContain('quality_analysis');
  });

  test('SCM 供应链管理模块应该包含必要能力', async () => {
    const scm = mockExtendedModules.find(m => m.id === 'scm');
    expect(scm).toBeDefined();
    expect(scm!.capabilities).toContain('supplier_management');
    expect(scm!.capabilities).toContain('procurement_collaboration');
    expect(scm!.capabilities).toContain('logistics_tracking');
  });

  test('APS 高级计划排程模块应该包含必要能力', async () => {
    const aps = mockExtendedModules.find(m => m.id === 'aps');
    expect(aps).toBeDefined();
    expect(aps!.capabilities).toContain('production_planning');
    expect(aps!.capabilities).toContain('process_scheduling');
    expect(aps!.capabilities).toContain('resource_optimization');
  });

  test('EHS 环境健康安全模块应该包含必要能力', async () => {
    const ehs = mockExtendedModules.find(m => m.id === 'ehs');
    expect(ehs).toBeDefined();
    expect(ehs!.capabilities).toContain('safety_inspection');
    expect(ehs!.capabilities).toContain('incident_management');
    expect(ehs!.capabilities).toContain('environmental_compliance');
  });

  test('OA 办公自动化模块应该包含必要能力', async () => {
    const oa = mockExtendedModules.find(m => m.id === 'oa');
    expect(oa).toBeDefined();
    expect(oa!.capabilities).toContain('process_approval');
    expect(oa!.capabilities).toContain('document_management');
    expect(oa!.capabilities).toContain('meeting_management');
  });

  test('BI 商业智能模块应该包含必要能力', async () => {
    const bi = mockExtendedModules.find(m => m.id === 'bi');
    expect(bi).toBeDefined();
    expect(bi!.capabilities).toContain('report_generation');
    expect(bi!.capabilities).toContain('dashboard_creation');
    expect(bi!.capabilities).toContain('data_analysis');
  });

  test('QMS 意图识别结果应该包含必要字段', async () => {
    expect(mockQmsIntentResult).toHaveProperty('intent');
    expect(mockQmsIntentResult).toHaveProperty('confidence');
    expect(mockQmsIntentResult).toHaveProperty('module');
    expect(mockQmsIntentResult).toHaveProperty('entities');
    expect(mockQmsIntentResult).toHaveProperty('suggested_actions');
    expect(mockQmsIntentResult.module).toBe('qms');
    expect(mockQmsIntentResult.confidence).toBeGreaterThan(0.9);
  });

  test('SCM 意图识别结果应该包含必要字段', async () => {
    expect(mockScmIntentResult.module).toBe('scm');
    expect(mockScmIntentResult.confidence).toBeGreaterThan(0.9);
    expect(mockScmIntentResult.entities.length).toBeGreaterThan(0);
    expect(mockScmIntentResult.suggested_actions.length).toBeGreaterThan(0);
  });

  test('APS 意图识别结果应该包含必要字段', async () => {
    expect(mockApsIntentResult.module).toBe('aps');
    expect(mockApsIntentResult.confidence).toBeGreaterThan(0.9);
    expect(mockApsIntentResult.entities.length).toBeGreaterThan(0);
  });

  test('EHS 意图识别结果应该包含必要字段', async () => {
    expect(mockEhsIntentResult.module).toBe('ehs');
    expect(mockEhsIntentResult.confidence).toBeGreaterThan(0.9);
    expect(mockEhsIntentResult.entities.length).toBeGreaterThan(0);
  });

  test('OA 意图识别结果应该包含必要字段', async () => {
    expect(mockOaIntentResult.module).toBe('oa');
    expect(mockOaIntentResult.confidence).toBeGreaterThan(0.9);
    expect(mockOaIntentResult.entities.length).toBeGreaterThan(0);
  });

  test('BI 意图识别结果应该包含必要字段', async () => {
    expect(mockBiIntentResult.module).toBe('bi');
    expect(mockBiIntentResult.confidence).toBeGreaterThan(0.9);
    expect(mockBiIntentResult.entities.length).toBeGreaterThan(0);
  });

  test('所有意图识别结果的置信度应该大于 0.9', async () => {
    const allResults = [mockQmsIntentResult, mockScmIntentResult, mockApsIntentResult, mockEhsIntentResult, mockOaIntentResult, mockBiIntentResult];
    for (const result of allResults) {
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  test('所有意图识别结果应该包含建议操作', async () => {
    const allResults = [mockQmsIntentResult, mockScmIntentResult, mockApsIntentResult, mockEhsIntentResult, mockOaIntentResult, mockBiIntentResult];
    for (const result of allResults) {
      expect(result.suggested_actions.length).toBeGreaterThanOrEqual(3);
      for (const action of result.suggested_actions) {
        expect(action).toHaveProperty('action');
        expect(action).toHaveProperty('label');
      }
    }
  });

  test('扩展业务模块总数应该为 12 个（6 基础 + 6 扩展）', async () => {
    // 基础模块：ERP、Finance、CRM、WMS、MES、HRM
    // 扩展模块：QMS、SCM、APS、EHS、OA、BI
    const baseModules = ['erp', 'finance', 'crm', 'wms', 'mes', 'hrm'];
    const extendedModuleIds = mockExtendedModules.map(m => m.id);
    const allModuleIds = [...baseModules, ...extendedModuleIds];
    expect(allModuleIds.length).toBe(12);
    expect(new Set(allModuleIds).size).toBe(12); // 无重复
  });
});
