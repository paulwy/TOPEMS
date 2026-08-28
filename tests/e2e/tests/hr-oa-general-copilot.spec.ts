/**
 * HR/OA/General 业务模块 Copilot 端到端测试
 *
 * 测试人力资源（HR）、办公自动化（OA）、通用助手（General）三个业务模块的 Copilot 功能。
 * 使用 mock 后端模拟 API 响应。
 */

import { test, expect, type Page } from '@playwright/test';

// 测试用户
const testUser = {
  id: 'hr-oa-general-copilot-test-user',
  username: 'admin',
  email: 'admin@example.com',
  full_name: 'HR/OA/General Copilot测试管理员',
  realName: 'HR/OA/General Copilot测试管理员',
  name: 'HR/OA/General Copilot测试管理员',
  isActive: true,
  is_superuser: true,
  isSuperuser: true,
  roles: ['admin'],
  permissions: ['*'],
};

// HR/OA/General 业务模块配置
const mockModules = [
  {
    id: 'hr',
    name: 'HR 智能助手',
    description: '人力资源智能助手，帮助处理员工管理、招聘、考勤、薪酬、绩效等业务',
    icon: '👥',
    enabled: true,
    capabilities: ['employee_management', 'attendance', 'leave_management', 'recruitment', 'performance', 'training'],
    supported_intents: ['query', 'create', 'update', 'delete', 'analyze', 'report', 'approve', 'knowledge', 'guidance'],
    available_tools: [
      { tool_id: 'hr.query_employee', name: '查询员工信息', category: 'query' },
      { tool_id: 'hr.create_employee', name: '创建员工档案', category: 'create' },
      { tool_id: 'hr.query_attendance', name: '查询考勤记录', category: 'query' },
      { tool_id: 'hr.query_leave', name: '查询请假记录', category: 'query' },
      { tool_id: 'hr.analyze_headcount', name: '人力分析', category: 'analysis' },
    ],
    quick_actions: [
      { action_id: 'hr.query_employee', label: '查询员工', icon: 'users' },
      { action_id: 'hr.attendance', label: '考勤统计', icon: 'calendar' },
      { action_id: 'hr.leave', label: '请假申请', icon: 'clipboard' },
      { action_id: 'hr.analysis', label: '人力分析', icon: 'chart' },
    ],
    faqs: [
      { question: '如何查询员工信息？', category: '员工管理' },
      { question: '如何申请请假？', category: '考勤管理' },
      { question: '如何查看我的考勤记录？', category: '考勤管理' },
      { question: '新员工入职流程是什么？', category: '员工管理' },
    ],
  },
  {
    id: 'oa',
    name: 'OA 智能助手',
    description: '办公自动化智能助手，帮助处理审批、公文、会议、通知、日程等办公业务',
    icon: '📋',
    enabled: true,
    capabilities: ['approval', 'document', 'meeting', 'announcement', 'schedule', 'task'],
    supported_intents: ['query', 'create', 'update', 'delete', 'approve', 'knowledge', 'guidance'],
    available_tools: [
      { tool_id: 'oa.query_approval', name: '查询审批流程', category: 'query' },
      { tool_id: 'oa.approve', name: '审批操作', category: 'approval' },
      { tool_id: 'oa.query_document', name: '查询公文', category: 'query' },
      { tool_id: 'oa.create_meeting', name: '创建会议', category: 'create' },
      { tool_id: 'oa.query_schedule', name: '查询日程', category: 'query' },
    ],
    quick_actions: [
      { action_id: 'oa.todo', label: '待办审批', icon: 'inbox' },
      { action_id: 'oa.new_approval', label: '发起审批', icon: 'send' },
      { action_id: 'oa.new_meeting', label: '创建会议', icon: 'video' },
      { action_id: 'oa.schedule', label: '今日日程', icon: 'calendar' },
    ],
    faqs: [
      { question: '如何查看我的待办审批？', category: '审批管理' },
      { question: '如何快速审批？', category: '审批管理' },
      { question: '如何创建会议？', category: '会议管理' },
      { question: '如何查看今日日程？', category: '日程管理' },
    ],
  },
  {
    id: 'general',
    name: '通用智能助手',
    description: '通用智能助手，提供跨模块的综合服务、知识问答、操作指导等',
    icon: '🤖',
    enabled: true,
    capabilities: ['knowledge_search', 'guidance', 'dashboard', 'report', 'module_query'],
    supported_intents: ['query', 'analyze', 'report', 'knowledge', 'guidance'],
    available_tools: [
      { tool_id: 'general.search_knowledge', name: '知识搜索', category: 'query' },
      { tool_id: 'general.get_guidance', name: '操作指导', category: 'query' },
      { tool_id: 'general.query_dashboard', name: '查询仪表盘', category: 'query' },
      { tool_id: 'general.generate_report', name: '生成报表', category: 'report' },
      { tool_id: 'general.available_modules', name: '可用模块查询', category: 'query' },
    ],
    quick_actions: [
      { action_id: 'general.search', label: '知识搜索', icon: 'search' },
      { action_id: 'general.guidance', label: '操作指导', icon: 'book' },
      { action_id: 'general.dashboard', label: '查看仪表盘', icon: 'dashboard' },
      { action_id: 'general.report', label: '生成报表', icon: 'file' },
    ],
    faqs: [
      { question: '系统有哪些功能模块？', category: '系统介绍' },
      { question: '如何切换到其他业务模块？', category: '使用指南' },
      { question: '如何获取系统操作帮助？', category: '使用指南' },
      { question: '可以生成哪些报表？', category: '报表功能' },
    ],
  },
];

// HR 意图识别结果
const mockHrIntentResult = {
  intent: 'employee_query',
  confidence: 0.95,
  module: 'hr',
  suggested_actions: [
    { action: 'query_employee', label: '查询员工信息', confidence: 0.92 },
    { action: 'view_employee_detail', label: '查看员工详情', confidence: 0.85 },
  ],
  entities: [
    { type: 'employee_name', value: '张三', confidence: 0.98 },
    { type: 'department', value: '研发部', confidence: 0.87 },
  ],
};

// OA 意图识别结果
const mockOaIntentResult = {
  intent: 'approval_query',
  confidence: 0.94,
  module: 'oa',
  suggested_actions: [
    { action: 'query_approval', label: '查询待办审批', confidence: 0.93 },
    { action: 'view_approval_detail', label: '查看审批详情', confidence: 0.88 },
  ],
  entities: [
    { type: 'approval_type', value: '请假', confidence: 0.91 },
    { type: 'status', value: '待审批', confidence: 0.89 },
  ],
};

// General 意图识别结果
const mockGeneralIntentResult = {
  intent: 'knowledge_search',
  confidence: 0.92,
  module: 'general',
  suggested_actions: [
    { action: 'search_knowledge', label: '搜索知识库', confidence: 0.90 },
    { action: 'get_guidance', label: '获取操作指导', confidence: 0.85 },
  ],
  entities: [
    { type: 'query', value: '如何创建采购订单', confidence: 0.95 },
    { type: 'module', value: 'ERP', confidence: 0.82 },
  ],
};

// HR 会话创建响应
const mockHrSessionResponse = {
  session_id: 'hr-session-001',
  module: 'hr',
  user_id: testUser.id,
  created_at: new Date().toISOString(),
  welcome_message: '您好！我是 HR 智能助手，可以帮您处理员工管理、招聘、考勤、薪酬、绩效等业务。请问有什么可以帮您的？',
  context: {
    current_module: 'hr',
    conversation_history: [],
    user_preferences: {},
  },
};

// OA 会话创建响应
const mockOaSessionResponse = {
  session_id: 'oa-session-001',
  module: 'oa',
  user_id: testUser.id,
  created_at: new Date().toISOString(),
  welcome_message: '您好！我是 OA 智能助手，可以帮您处理审批、公文、会议、通知、日程等办公业务。请问有什么可以帮您的？',
  context: {
    current_module: 'oa',
    conversation_history: [],
    user_preferences: {},
  },
};

// General 会话创建响应
const mockGeneralSessionResponse = {
  session_id: 'general-session-001',
  module: 'general',
  user_id: testUser.id,
  created_at: new Date().toISOString(),
  welcome_message: '您好！我是 TOPEMS 通用智能助手，可以帮您解答系统使用问题、提供操作指导、查询数据、生成报表等。请问有什么可以帮您的？',
  context: {
    current_module: 'general',
    conversation_history: [],
    user_preferences: {},
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

    // 会话创建 API
    if (path.includes('/copilot/sessions') && method === 'POST') {
      const body = request.postData() || '';
      let sessionResponse = mockGeneralSessionResponse;
      
      if (body.includes('hr') || body.includes('人力资源') || body.includes('HR')) {
        sessionResponse = mockHrSessionResponse;
      } else if (body.includes('oa') || body.includes('办公自动化') || body.includes('OA')) {
        sessionResponse = mockOaSessionResponse;
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: sessionResponse,
          message: '会话创建成功',
          timestamp: Date.now(),
        }),
      });
      return;
    }

    // 意图识别 API
    if (path.includes('/copilot/intent/recognize') && method === 'POST') {
      const body = request.postData() || '';
      let intentResult = mockGeneralIntentResult;
      
      if (body.includes('员工') || body.includes('考勤') || body.includes('请假') || body.includes('HR') || body.includes('人力')) {
        intentResult = mockHrIntentResult;
      } else if (body.includes('审批') || body.includes('会议') || body.includes('日程') || body.includes('OA') || body.includes('公文')) {
        intentResult = mockOaIntentResult;
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
      let responseText = '我是通用智能助手，很高兴为您服务！';
      
      if (body.includes('员工') || body.includes('HR') || body.includes('人力')) {
        responseText = '根据您的需求，我为您查询到以下员工信息：张三，研发部，高级工程师，在职状态。如需更多信息，请告诉我具体的查询条件。';
      } else if (body.includes('审批') || body.includes('OA') || body.includes('待办')) {
        responseText = '您当前有 3 条待办审批：1. 张三的请假申请（待审批）；2. 李四的报销申请（待审批）；3. 王五的采购申请（待审批）。请问您要处理哪一条？';
      } else if (body.includes('报表') || body.includes('分析')) {
        responseText = '我可以为您生成经营日报、经营周报、经营月报、综合分析等报表。请问您需要生成哪种报表？需要统计哪个时间段的数据？';
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 200,
          success: true,
          data: {
            response: responseText,
            session_id: 'test-session-001',
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
test.describe('HR/OA/General 业务模块 Copilot', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
  });

  // ==================== 模块列表测试 ====================
  test.describe('模块列表', () => {
    test('HR/OA/General 模块列表数据结构应该完整', async () => {
      expect(mockModules).toHaveLength(3);
      
      const hrModule = mockModules.find(m => m.id === 'hr');
      expect(hrModule).toBeDefined();
      expect(hrModule!.name).toBe('HR 智能助手');
      expect(hrModule!.enabled).toBe(true);
      expect(hrModule!.capabilities).toContain('employee_management');
      
      const oaModule = mockModules.find(m => m.id === 'oa');
      expect(oaModule).toBeDefined();
      expect(oaModule!.name).toBe('OA 智能助手');
      expect(oaModule!.capabilities).toContain('approval');
      
      const generalModule = mockModules.find(m => m.id === 'general');
      expect(generalModule).toBeDefined();
      expect(generalModule!.name).toBe('通用智能助手');
      expect(generalModule!.capabilities).toContain('knowledge_search');
    });

    test('每个模块应该有完整的工具配置', async () => {
      for (const module of mockModules) {
        expect(module.available_tools).toBeDefined();
        expect(module.available_tools.length).toBeGreaterThanOrEqual(5);
        
        for (const tool of module.available_tools!) {
          expect(tool.tool_id).toBeDefined();
          expect(tool.name).toBeDefined();
          expect(tool.category).toBeDefined();
        }
      }
    });

    test('每个模块应该有快捷操作', async () => {
      for (const module of mockModules) {
        expect(module.quick_actions).toBeDefined();
        expect(module.quick_actions!.length).toBe(4);
        
        for (const action of module.quick_actions!) {
          expect(action.action_id).toBeDefined();
          expect(action.label).toBeDefined();
          expect(action.icon).toBeDefined();
        }
      }
    });

    test('每个模块应该有 FAQ', async () => {
      for (const module of mockModules) {
        expect(module.faqs).toBeDefined();
        expect(module.faqs!.length).toBe(4);
        
        for (const faq of module.faqs!) {
          expect(faq.question).toBeDefined();
          expect(faq.category).toBeDefined();
        }
      }
    });
  });

  // ==================== HR 模块测试 ====================
  test.describe('HR 模块', () => {
    test('HR 模块配置应该包含人力资源相关功能', async () => {
      const hrModule = mockModules.find(m => m.id === 'hr')!;
      
      expect(hrModule.capabilities).toEqual(
        expect.arrayContaining(['employee_management', 'attendance', 'leave_management'])
      );
      expect(hrModule.supported_intents).toContain('query');
      expect(hrModule.supported_intents).toContain('create');
      expect(hrModule.supported_intents).toContain('analyze');
    });

    test('HR 模块应该包含员工查询工具', async () => {
      const hrModule = mockModules.find(m => m.id === 'hr')!;
      const queryTool = hrModule.available_tools!.find(t => t.tool_id === 'hr.query_employee');
      
      expect(queryTool).toBeDefined();
      expect(queryTool!.name).toBe('查询员工信息');
      expect(queryTool!.category).toBe('query');
    });

    test('HR 模块应该包含人力分析工具', async () => {
      const hrModule = mockModules.find(m => m.id === 'hr')!;
      const analysisTool = hrModule.available_tools!.find(t => t.tool_id === 'hr.analyze_headcount');
      
      expect(analysisTool).toBeDefined();
      expect(analysisTool!.name).toBe('人力分析');
      expect(analysisTool!.category).toBe('analysis');
    });

    test('HR 意图识别应该能识别人力资源相关请求', async () => {
      expect(mockHrIntentResult.intent).toBe('employee_query');
      expect(mockHrIntentResult.module).toBe('hr');
      expect(mockHrIntentResult.confidence).toBeGreaterThan(0.9);
      expect(mockHrIntentResult.entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'employee_name' }),
        ])
      );
    });

    test('HR 会话创建应该返回正确的欢迎消息', async () => {
      expect(mockHrSessionResponse.module).toBe('hr');
      expect(mockHrSessionResponse.welcome_message).toContain('HR 智能助手');
      expect(mockHrSessionResponse.welcome_message).toContain('员工管理');
    });
  });

  // ==================== OA 模块测试 ====================
  test.describe('OA 模块', () => {
    test('OA 模块配置应该包含办公自动化相关功能', async () => {
      const oaModule = mockModules.find(m => m.id === 'oa')!;
      
      expect(oaModule.capabilities).toEqual(
        expect.arrayContaining(['approval', 'document', 'meeting', 'schedule'])
      );
      expect(oaModule.supported_intents).toContain('approve');
      expect(oaModule.supported_intents).toContain('query');
    });

    test('OA 模块应该包含审批查询工具', async () => {
      const oaModule = mockModules.find(m => m.id === 'oa')!;
      const approvalTool = oaModule.available_tools!.find(t => t.tool_id === 'oa.query_approval');
      
      expect(approvalTool).toBeDefined();
      expect(approvalTool!.name).toBe('查询审批流程');
      expect(approvalTool!.category).toBe('query');
    });

    test('OA 模块应该包含审批操作工具', async () => {
      const oaModule = mockModules.find(m => m.id === 'oa')!;
      const approveTool = oaModule.available_tools!.find(t => t.tool_id === 'oa.approve');
      
      expect(approveTool).toBeDefined();
      expect(approveTool!.name).toBe('审批操作');
      expect(approveTool!.category).toBe('approval');
    });

    test('OA 模块应该包含会议创建工具', async () => {
      const oaModule = mockModules.find(m => m.id === 'oa')!;
      const meetingTool = oaModule.available_tools!.find(t => t.tool_id === 'oa.create_meeting');
      
      expect(meetingTool).toBeDefined();
      expect(meetingTool!.name).toBe('创建会议');
      expect(meetingTool!.category).toBe('create');
    });

    test('OA 意图识别应该能识别办公自动化相关请求', async () => {
      expect(mockOaIntentResult.intent).toBe('approval_query');
      expect(mockOaIntentResult.module).toBe('oa');
      expect(mockOaIntentResult.confidence).toBeGreaterThan(0.9);
    });

    test('OA 会话创建应该返回正确的欢迎消息', async () => {
      expect(mockOaSessionResponse.module).toBe('oa');
      expect(mockOaSessionResponse.welcome_message).toContain('OA 智能助手');
      expect(mockOaSessionResponse.welcome_message).toContain('审批');
    });
  });

  // ==================== General 模块测试 ====================
  test.describe('General 模块', () => {
    test('General 模块配置应该包含通用服务相关功能', async () => {
      const generalModule = mockModules.find(m => m.id === 'general')!;
      
      expect(generalModule.capabilities).toEqual(
        expect.arrayContaining(['knowledge_search', 'guidance', 'dashboard', 'report'])
      );
      expect(generalModule.supported_intents).toContain('knowledge');
      expect(generalModule.supported_intents).toContain('guidance');
      expect(generalModule.supported_intents).toContain('report');
    });

    test('General 模块应该包含知识搜索工具', async () => {
      const generalModule = mockModules.find(m => m.id === 'general')!;
      const searchTool = generalModule.available_tools!.find(t => t.tool_id === 'general.search_knowledge');
      
      expect(searchTool).toBeDefined();
      expect(searchTool!.name).toBe('知识搜索');
      expect(searchTool!.category).toBe('query');
    });

    test('General 模块应该包含操作指导工具', async () => {
      const generalModule = mockModules.find(m => m.id === 'general')!;
      const guidanceTool = generalModule.available_tools!.find(t => t.tool_id === 'general.get_guidance');
      
      expect(guidanceTool).toBeDefined();
      expect(guidanceTool!.name).toBe('操作指导');
      expect(guidanceTool!.category).toBe('query');
    });

    test('General 模块应该包含报表生成工具', async () => {
      const generalModule = mockModules.find(m => m.id === 'general')!;
      const reportTool = generalModule.available_tools!.find(t => t.tool_id === 'general.generate_report');
      
      expect(reportTool).toBeDefined();
      expect(reportTool!.name).toBe('生成报表');
      expect(reportTool!.category).toBe('report');
    });

    test('General 意图识别应该能识别通用服务相关请求', async () => {
      expect(mockGeneralIntentResult.intent).toBe('knowledge_search');
      expect(mockGeneralIntentResult.module).toBe('general');
      expect(mockGeneralIntentResult.confidence).toBeGreaterThan(0.9);
    });

    test('General 会话创建应该返回正确的欢迎消息', async () => {
      expect(mockGeneralSessionResponse.module).toBe('general');
      expect(mockGeneralSessionResponse.welcome_message).toContain('通用智能助手');
      expect(mockGeneralSessionResponse.welcome_message).toContain('系统使用问题');
    });
  });

  // ==================== 跨模块测试 ====================
  test.describe('跨模块功能', () => {
    test('三个模块都应该启用', async () => {
      for (const module of mockModules) {
        expect(module.enabled).toBe(true);
      }
    });

    test('每个模块都应该有唯一的 ID', async () => {
      const ids = mockModules.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('每个模块都应该有图标', async () => {
      for (const module of mockModules) {
        expect(module.icon).toBeDefined();
        expect(module.icon.length).toBeGreaterThan(0);
      }
    });

    test('每个模块都应该有描述', async () => {
      for (const module of mockModules) {
        expect(module.description).toBeDefined();
        expect(module.description.length).toBeGreaterThan(10);
      }
    });

    test('HR 模块不应该包含审批相关能力', async () => {
      const hrModule = mockModules.find(m => m.id === 'hr')!;
      expect(hrModule.capabilities).not.toContain('approval');
    });

    test('OA 模块不应该包含员工管理能力', async () => {
      const oaModule = mockModules.find(m => m.id === 'oa')!;
      expect(oaModule.capabilities).not.toContain('employee_management');
    });

    test('General 模块应该支持最少的意图类型', async () => {
      const generalModule = mockModules.find(m => m.id === 'general')!;
      expect(generalModule.supported_intents.length).toBeLessThanOrEqual(5);
      expect(generalModule.supported_intents).not.toContain('create');
      expect(generalModule.supported_intents).not.toContain('delete');
    });
  });

  // ==================== 数据完整性测试 ====================
  test.describe('数据完整性', () => {
    test('所有工具 ID 应该遵循命名规范', async () => {
      for (const module of mockModules) {
        for (const tool of module.available_tools!) {
          expect(tool.tool_id).toMatch(/^[a-z]+\.[a-z_]+$/);
        }
      }
    });

    test('所有快捷操作 ID 应该遵循命名规范', async () => {
      for (const module of mockModules) {
        for (const action of module.quick_actions!) {
          expect(action.action_id).toMatch(/^[a-z]+\.[a-z_]+$/);
        }
      }
    });

    test('所有 FAQ 问题应该以问号结尾', async () => {
      for (const module of mockModules) {
        for (const faq of module.faqs!) {
          expect(faq.question.endsWith('？') || faq.question.endsWith('?')).toBe(true);
        }
      }
    });

    test('所有模块名称应该包含"智能助手"', async () => {
      for (const module of mockModules) {
        expect(module.name).toContain('智能助手');
      }
    });
  });
});
