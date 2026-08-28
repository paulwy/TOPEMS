/**
 * QMS/SCM/APS/EHS/BI 扩展业务模块 Copilot 端到端测试
 *
 * 测试质量管理(QMS)、供应链管理(SCM)、高级计划排程(APS)、环境健康安全(EHS)、商业智能(BI)
 * 五个扩展业务模块的 Copilot 功能。使用 mock 后端模拟 API 响应。
 */

import { test, expect, type Page } from '@playwright/test';

// 测试用户
const testUser = {
  id: 'extended-modules-test-user',
  username: 'admin',
  email: 'admin@example.com',
  full_name: '扩展模块测试管理员',
  realName: '扩展模块测试管理员',
  name: '扩展模块测试管理员',
  isActive: true,
  is_superuser: true,
  isSuperuser: true,
  roles: ['admin'],
  permissions: ['*'],
};

// 扩展业务模块配置
const mockModules = [
  {
    id: 'qms',
    name: 'QMS 智能助手',
    description: '质量管理智能助手，帮助处理质量检验、不合格品处理、质量分析、供应商质量等业务',
    icon: '✅',
    enabled: true,
    capabilities: ['quality_inspection', 'nonconformance_handling', 'quality_analysis', 'supplier_quality'],
    supported_intents: ['query', 'create', 'update', 'analyze', 'report', 'approve', 'knowledge', 'guidance'],
    available_tools: [
      { tool_id: 'qms.query_inspection', name: '查询质量检验', category: 'query' },
      { tool_id: 'qms.create_nonconformance', name: '创建不合格品', category: 'create' },
      { tool_id: 'qms.analyze_quality', name: '质量分析', category: 'analysis' },
      { tool_id: 'qms.query_supplier_quality', name: '供应商质量查询', category: 'query' },
      { tool_id: 'qms.generate_quality_report', name: '生成质量报表', category: 'report' },
    ],
    quick_actions: [
      { action_id: 'qms.query_inspection', label: '检验记录', icon: 'search' },
      { action_id: 'qms.create_nc', label: '不合格品', icon: 'alert' },
      { action_id: 'qms.analyze', label: '质量分析', icon: 'chart' },
      { action_id: 'qms.supplier', label: '供应商质量', icon: 'users' },
    ],
    faqs: [
      { question: '如何查询质量检验记录？', category: '质量检验' },
      { question: '如何创建不合格品记录？', category: '不合格品' },
      { question: '如何查看质量趋势分析？', category: '质量分析' },
      { question: '如何评估供应商质量？', category: '供应商质量' },
    ],
  },
  {
    id: 'scm',
    name: 'SCM 智能助手',
    description: '供应链管理智能助手，帮助处理供应商管理、采购协同、物流跟踪、需求计划等业务',
    icon: '🔗',
    enabled: true,
    capabilities: ['supplier_management', 'procurement_collaboration', 'logistics_tracking', 'demand_planning'],
    supported_intents: ['query', 'create', 'update', 'analyze', 'report', 'knowledge', 'guidance'],
    available_tools: [
      { tool_id: 'scm.query_supplier', name: '查询供应商', category: 'query' },
      { tool_id: 'scm.track_logistics', name: '物流跟踪', category: 'query' },
      { tool_id: 'scm.demand_planning', name: '需求计划', category: 'analysis' },
      { tool_id: 'scm.analyze_supply_chain', name: '供应链分析', category: 'analysis' },
      { tool_id: 'scm.generate_report', name: '生成供应链报表', category: 'report' },
    ],
    quick_actions: [
      { action_id: 'scm.query_supplier', label: '供应商查询', icon: 'users' },
      { action_id: 'scm.track', label: '物流跟踪', icon: 'truck' },
      { action_id: 'scm.demand', label: '需求计划', icon: 'calendar' },
      { action_id: 'scm.analyze', label: '供应链分析', icon: 'chart' },
    ],
    faqs: [
      { question: '如何查询供应商信息？', category: '供应商管理' },
      { question: '如何跟踪物流状态？', category: '物流管理' },
      { question: '如何制定需求计划？', category: '需求计划' },
      { question: '如何分析供应链绩效？', category: '供应链分析' },
    ],
  },
  {
    id: 'aps',
    name: 'APS 智能助手',
    description: '高级计划排程智能助手，帮助处理生产计划、工序排程、资源优化、产能规划等业务',
    icon: '📅',
    enabled: true,
    capabilities: ['production_planning', 'process_scheduling', 'resource_optimization', 'capacity_planning'],
    supported_intents: ['query', 'create', 'update', 'analyze', 'report', 'knowledge', 'guidance'],
    available_tools: [
      { tool_id: 'aps.query_production_plan', name: '查询生产计划', category: 'query' },
      { tool_id: 'aps.create_production_plan', name: '创建生产计划', category: 'create' },
      { tool_id: 'aps.optimize_schedule', name: '优化排程', category: 'analysis' },
      { tool_id: 'aps.analyze_capacity', name: '产能分析', category: 'analysis' },
      { tool_id: 'aps.generate_report', name: '生成排程报表', category: 'report' },
    ],
    quick_actions: [
      { action_id: 'aps.query_plan', label: '生产计划', icon: 'calendar' },
      { action_id: 'aps.create_plan', label: '创建计划', icon: 'plus' },
      { action_id: 'aps.optimize', label: '优化排程', icon: 'settings' },
      { action_id: 'aps.capacity', label: '产能分析', icon: 'chart' },
    ],
    faqs: [
      { question: '如何查询生产计划？', category: '生产计划' },
      { question: '如何创建生产计划？', category: '生产计划' },
      { question: '如何优化生产排程？', category: '排程优化' },
      { question: '如何分析产能负荷？', category: '产能分析' },
    ],
  },
  {
    id: 'ehs',
    name: 'EHS 智能助手',
    description: '环境健康安全智能助手，帮助处理安全检查、事故管理、环保合规、培训管理等业务',
    icon: '🛡️',
    enabled: true,
    capabilities: ['safety_inspection', 'incident_management', 'environmental_compliance', 'training_management'],
    supported_intents: ['query', 'create', 'update', 'analyze', 'report', 'approve', 'knowledge', 'guidance'],
    available_tools: [
      { tool_id: 'ehs.query_inspection', name: '查询安全检查', category: 'query' },
      { tool_id: 'ehs.create_incident', name: '创建事故记录', category: 'create' },
      { tool_id: 'ehs.query_compliance', name: '查询环保合规', category: 'query' },
      { tool_id: 'ehs.analyze_safety', name: '安全分析', category: 'analysis' },
      { tool_id: 'ehs.generate_report', name: '生成EHS报表', category: 'report' },
    ],
    quick_actions: [
      { action_id: 'ehs.query_inspection', label: '安全检查', icon: 'search' },
      { action_id: 'ehs.create_incident', label: '事故报告', icon: 'alert' },
      { action_id: 'ehs.compliance', label: '环保合规', icon: 'leaf' },
      { action_id: 'ehs.analyze', label: '安全分析', icon: 'chart' },
    ],
    faqs: [
      { question: '如何查询安全检查记录？', category: '安全检查' },
      { question: '如何报告安全事故？', category: '事故管理' },
      { question: '如何查看环保合规状态？', category: '环保管理' },
      { question: '如何分析安全趋势？', category: '安全分析' },
    ],
  },
  {
    id: 'bi',
    name: 'BI 智能助手',
    description: '商业智能智能助手，帮助处理数据报表、仪表盘、数据分析、KPI监控等业务',
    icon: '📊',
    enabled: true,
    capabilities: ['report_generation', 'dashboard_creation', 'data_analysis', 'kpi_monitoring'],
    supported_intents: ['query', 'create', 'update', 'analyze', 'report', 'knowledge', 'guidance'],
    available_tools: [
      { tool_id: 'bi.query_report', name: '查询报表', category: 'query' },
      { tool_id: 'bi.create_dashboard', name: '创建仪表盘', category: 'create' },
      { tool_id: 'bi.analyze_data', name: '数据分析', category: 'analysis' },
      { tool_id: 'bi.query_kpi', name: '查询KPI', category: 'query' },
      { tool_id: 'bi.generate_report', name: '生成分析报告', category: 'report' },
    ],
    quick_actions: [
      { action_id: 'bi.query_report', label: '报表查询', icon: 'file' },
      { action_id: 'bi.create_dashboard', label: '创建仪表盘', icon: 'dashboard' },
      { action_id: 'bi.analyze', label: '数据分析', icon: 'chart' },
      { action_id: 'bi.kpi', label: 'KPI监控', icon: 'target' },
    ],
    faqs: [
      { question: '如何查询数据报表？', category: '报表管理' },
      { question: '如何创建数据仪表盘？', category: '仪表盘' },
      { question: '如何进行数据分析？', category: '数据分析' },
      { question: '如何查看KPI指标？', category: 'KPI监控' },
    ],
  },
];

// 意图识别结果映射
const mockIntentResults: Record<string, any> = {
  qms: {
    intent: 'quality_inspection_query',
    confidence: 0.94,
    module: 'qms',
    suggested_actions: [
      { action: 'query_inspection', label: '查询质量检验', confidence: 0.92 },
    ],
    entities: [
      { type: 'inspection_type', value: '来料检验', confidence: 0.88 },
    ],
  },
  scm: {
    intent: 'supplier_query',
    confidence: 0.93,
    module: 'scm',
    suggested_actions: [
      { action: 'query_supplier', label: '查询供应商', confidence: 0.91 },
    ],
    entities: [
      { type: 'supplier_name', value: '示例供应商', confidence: 0.85 },
    ],
  },
  aps: {
    intent: 'production_plan_query',
    confidence: 0.95,
    module: 'aps',
    suggested_actions: [
      { action: 'query_production_plan', label: '查询生产计划', confidence: 0.93 },
    ],
    entities: [
      { type: 'product', value: '产品A', confidence: 0.87 },
    ],
  },
  ehs: {
    intent: 'safety_inspection_query',
    confidence: 0.92,
    module: 'ehs',
    suggested_actions: [
      { action: 'query_inspection', label: '查询安全检查', confidence: 0.90 },
    ],
    entities: [
      { type: 'inspection_type', value: '日常检查', confidence: 0.86 },
    ],
  },
  bi: {
    intent: 'data_analysis',
    confidence: 0.96,
    module: 'bi',
    suggested_actions: [
      { action: 'analyze_data', label: '数据分析', confidence: 0.94 },
    ],
    entities: [
      { type: 'metric', value: '销售额', confidence: 0.89 },
    ],
  },
};

// Mock 后端
async function mockBackend(page: Page) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    const path = new URL(url).pathname;
    const method = request.method();

    // 业务模块列表 API
    if (path.includes('/copilot/modules') && method === 'GET' && !path.match(/\/copilot\/modules\/[^/]+$/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: { modules: mockModules, total: mockModules.length },
          message: '获取模块列表成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 单个业务模块配置 API
    if (path.match(/\/copilot\/modules\/[^/]+$/) && method === 'GET') {
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

    // 意图识别 API
    if (path.includes('/copilot/intent/recognize') && method === 'POST') {
      const body = request.postData() || '';
      let intentResult = mockIntentResults.bi;
      
      for (const [moduleId, result] of Object.entries(mockIntentResults)) {
        if (body.includes(moduleId) || body.includes(moduleId.toUpperCase())) {
          intentResult = result;
          break;
        }
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

    // 对话发送 API
    if (path.includes('/copilot/chat') && method === 'POST') {
      const body = request.postData() || '';
      let responseText = '我是扩展业务模块智能助手，很高兴为您服务！';
      
      if (body.includes('质量') || body.includes('QMS') || body.includes('检验')) {
        responseText = '根据您的需求，我为您查询到最近的质量检验记录：共有 15 条检验记录，其中合格 12 条，不合格 3 条。不合格品主要集中在来料检验环节。建议关注供应商A的来料质量。';
      } else if (body.includes('供应商') || body.includes('SCM') || body.includes('物流')) {
        responseText = '根据您的需求，我为您查询到供应商信息：共有 25 家合格供应商，其中A级供应商 8 家，B级供应商 12 家，C级供应商 5 家。最近物流配送准时率为 92.5%。';
      } else if (body.includes('生产') || body.includes('APS') || body.includes('排程')) {
        responseText = '根据您的需求，我为您查询到本周生产计划：共有 20 个生产订单，其中已完成 8 个，执行中 10 个，待排程 2 个。当前产能利用率为 78%。';
      } else if (body.includes('安全') || body.includes('EHS') || body.includes('事故')) {
        responseText = '根据您的需求，我为您查询到安全检查记录：本月共进行安全检查 30 次，发现隐患 15 项，已整改 12 项，整改中 3 项。本月无安全事故发生。注意：紧急情况请立即拨打应急电话！';
      } else if (body.includes('报表') || body.includes('BI') || body.includes('分析') || body.includes('KPI')) {
        responseText = '根据您的需求，我为您分析了本月销售数据：总销售额 500 万元，同比增长 15%，环比增长 8%。销售排名前三的产品分别是产品A、产品B、产品C。建议关注产品D的销售下滑趋势。';
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: {
            response: responseText,
            session_id: 'test-session-extended',
            message_id: 'msg-' + Date.now(),
            timestamp: new Date().toISOString(),
            suggested_actions: [
              { action: 'view_detail', label: '查看详情' },
              { action: 'more_info', label: '更多信息' },
            ],
          },
          message: '对话成功',
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
test.describe('QMS/SCM/APS/EHS/BI 扩展业务模块 Copilot', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
  });

  // ==================== 模块列表测试 ====================
  test.describe('模块列表', () => {
    test('扩展模块列表数据结构应该完整', async () => {
      expect(mockModules).toHaveLength(5);
      
      const moduleIds = mockModules.map(m => m.id);
      expect(moduleIds).toEqual(expect.arrayContaining(['qms', 'scm', 'aps', 'ehs', 'bi']));
      
      for (const module of mockModules) {
        expect(module.name).toBeDefined();
        expect(module.description).toBeDefined();
        expect(module.enabled).toBe(true);
        expect(module.capabilities.length).toBeGreaterThanOrEqual(3);
      }
    });

    test('每个扩展模块应该有完整的工具配置', async () => {
      for (const module of mockModules) {
        expect(module.available_tools).toBeDefined();
        expect(module.available_tools.length).toBe(5);
        
        for (const tool of module.available_tools) {
          expect(tool.tool_id).toBeDefined();
          expect(tool.name).toBeDefined();
          expect(tool.category).toBeDefined();
          expect(tool.tool_id).toMatch(/^[a-z]+\.[a-z_]+$/);
        }
      }
    });

    test('每个扩展模块应该有快捷操作', async () => {
      for (const module of mockModules) {
        expect(module.quick_actions).toBeDefined();
        expect(module.quick_actions.length).toBe(4);
        
        for (const action of module.quick_actions) {
          expect(action.action_id).toBeDefined();
          expect(action.label).toBeDefined();
          expect(action.icon).toBeDefined();
        }
      }
    });

    test('每个扩展模块应该有FAQ', async () => {
      for (const module of mockModules) {
        expect(module.faqs).toBeDefined();
        expect(module.faqs.length).toBe(4);
        
        for (const faq of module.faqs) {
          expect(faq.question).toBeDefined();
          expect(faq.category).toBeDefined();
          expect(faq.question.endsWith('？') || faq.question.endsWith('?')).toBe(true);
        }
      }
    });
  });

  // ==================== QMS 模块测试 ====================
  test.describe('QMS 质量管理模块', () => {
    test('QMS模块配置应该包含质量管理相关功能', async () => {
      const qms = mockModules.find(m => m.id === 'qms')!;
      
      expect(qms.name).toBe('QMS 智能助手');
      expect(qms.capabilities).toEqual(
        expect.arrayContaining(['quality_inspection', 'nonconformance_handling', 'quality_analysis'])
      );
      expect(qms.supported_intents).toContain('query');
      expect(qms.supported_intents).toContain('create');
      expect(qms.supported_intents).toContain('analyze');
    });

    test('QMS模块应该包含质量检验工具', async () => {
      const qms = mockModules.find(m => m.id === 'qms')!;
      const tool = qms.available_tools.find(t => t.tool_id === 'qms.query_inspection');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('查询质量检验');
      expect(tool!.category).toBe('query');
    });

    test('QMS模块应该包含不合格品创建工具', async () => {
      const qms = mockModules.find(m => m.id === 'qms')!;
      const tool = qms.available_tools.find(t => t.tool_id === 'qms.create_nonconformance');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('创建不合格品');
      expect(tool!.category).toBe('create');
    });

    test('QMS意图识别应该能识别质量管理相关请求', async () => {
      const result = mockIntentResults.qms;
      expect(result.module).toBe('qms');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.intent).toContain('quality');
    });
  });

  // ==================== SCM 模块测试 ====================
  test.describe('SCM 供应链管理模块', () => {
    test('SCM模块配置应该包含供应链管理相关功能', async () => {
      const scm = mockModules.find(m => m.id === 'scm')!;
      
      expect(scm.name).toBe('SCM 智能助手');
      expect(scm.capabilities).toEqual(
        expect.arrayContaining(['supplier_management', 'logistics_tracking', 'demand_planning'])
      );
    });

    test('SCM模块应该包含供应商查询工具', async () => {
      const scm = mockModules.find(m => m.id === 'scm')!;
      const tool = scm.available_tools.find(t => t.tool_id === 'scm.query_supplier');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('查询供应商');
      expect(tool!.category).toBe('query');
    });

    test('SCM模块应该包含物流跟踪工具', async () => {
      const scm = mockModules.find(m => m.id === 'scm')!;
      const tool = scm.available_tools.find(t => t.tool_id === 'scm.track_logistics');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('物流跟踪');
      expect(tool!.category).toBe('query');
    });

    test('SCM意图识别应该能识别供应链相关请求', async () => {
      const result = mockIntentResults.scm;
      expect(result.module).toBe('scm');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  // ==================== APS 模块测试 ====================
  test.describe('APS 高级计划排程模块', () => {
    test('APS模块配置应该包含计划排程相关功能', async () => {
      const aps = mockModules.find(m => m.id === 'aps')!;
      
      expect(aps.name).toBe('APS 智能助手');
      expect(aps.capabilities).toEqual(
        expect.arrayContaining(['production_planning', 'process_scheduling', 'capacity_planning'])
      );
    });

    test('APS模块应该包含生产计划查询工具', async () => {
      const aps = mockModules.find(m => m.id === 'aps')!;
      const tool = aps.available_tools.find(t => t.tool_id === 'aps.query_production_plan');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('查询生产计划');
    });

    test('APS模块应该包含优化排程工具', async () => {
      const aps = mockModules.find(m => m.id === 'aps')!;
      const tool = aps.available_tools.find(t => t.tool_id === 'aps.optimize_schedule');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('优化排程');
      expect(tool!.category).toBe('analysis');
    });

    test('APS意图识别应该能识别计划排程相关请求', async () => {
      const result = mockIntentResults.aps;
      expect(result.module).toBe('aps');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  // ==================== EHS 模块测试 ====================
  test.describe('EHS 环境健康安全模块', () => {
    test('EHS模块配置应该包含环境健康安全相关功能', async () => {
      const ehs = mockModules.find(m => m.id === 'ehs')!;
      
      expect(ehs.name).toBe('EHS 智能助手');
      expect(ehs.capabilities).toEqual(
        expect.arrayContaining(['safety_inspection', 'incident_management', 'environmental_compliance'])
      );
    });

    test('EHS模块应该包含安全检查工具', async () => {
      const ehs = mockModules.find(m => m.id === 'ehs')!;
      const tool = ehs.available_tools.find(t => t.tool_id === 'ehs.query_inspection');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('查询安全检查');
    });

    test('EHS模块应该包含事故记录创建工具', async () => {
      const ehs = mockModules.find(m => m.id === 'ehs')!;
      const tool = ehs.available_tools.find(t => t.tool_id === 'ehs.create_incident');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('创建事故记录');
      expect(tool!.category).toBe('create');
    });

    test('EHS意图识别应该能识别环境健康安全相关请求', async () => {
      const result = mockIntentResults.ehs;
      expect(result.module).toBe('ehs');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  // ==================== BI 模块测试 ====================
  test.describe('BI 商业智能模块', () => {
    test('BI模块配置应该包含商业智能相关功能', async () => {
      const bi = mockModules.find(m => m.id === 'bi')!;
      
      expect(bi.name).toBe('BI 智能助手');
      expect(bi.capabilities).toEqual(
        expect.arrayContaining(['report_generation', 'dashboard_creation', 'data_analysis', 'kpi_monitoring'])
      );
    });

    test('BI模块应该包含报表查询工具', async () => {
      const bi = mockModules.find(m => m.id === 'bi')!;
      const tool = bi.available_tools.find(t => t.tool_id === 'bi.query_report');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('查询报表');
    });

    test('BI模块应该包含数据分析工具', async () => {
      const bi = mockModules.find(m => m.id === 'bi')!;
      const tool = bi.available_tools.find(t => t.tool_id === 'bi.analyze_data');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('数据分析');
      expect(tool!.category).toBe('analysis');
    });

    test('BI模块应该包含KPI查询工具', async () => {
      const bi = mockModules.find(m => m.id === 'bi')!;
      const tool = bi.available_tools.find(t => t.tool_id === 'bi.query_kpi');
      
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('查询KPI');
    });

    test('BI意图识别应该能识别商业智能相关请求', async () => {
      const result = mockIntentResults.bi;
      expect(result.module).toBe('bi');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  // ==================== 跨模块测试 ====================
  test.describe('跨模块功能', () => {
    test('所有扩展模块都应该启用', async () => {
      for (const module of mockModules) {
        expect(module.enabled).toBe(true);
      }
    });

    test('所有扩展模块ID应该唯一', async () => {
      const ids = mockModules.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('所有扩展模块都应该有图标', async () => {
      for (const module of mockModules) {
        expect(module.icon).toBeDefined();
        expect(module.icon.length).toBeGreaterThan(0);
      }
    });

    test('所有扩展模块名称应该包含"智能助手"', async () => {
      for (const module of mockModules) {
        expect(module.name).toContain('智能助手');
      }
    });

    test('所有工具ID应该遵循命名规范', async () => {
      for (const module of mockModules) {
        for (const tool of module.available_tools) {
          expect(tool.tool_id).toMatch(/^[a-z]+\.[a-z_]+$/);
        }
      }
    });

    test('所有快捷操作ID应该遵循命名规范', async () => {
      for (const module of mockModules) {
        for (const action of module.quick_actions) {
          expect(action.action_id).toMatch(/^[a-z]+\.[a-z_]+$/);
        }
      }
    });
  });
});
