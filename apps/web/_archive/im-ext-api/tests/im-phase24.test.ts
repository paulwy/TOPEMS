import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import imApi from '../im';
import {
  imAssistantApi,
  type ConversationSummary,
  type ActionItem,
  type ReplySuggestion,
  type ConversationSentiment,
  type ConversationInsights,
  type AssistantConfig,
  type AssistantTask,
  type SummarizeConversationRequest,
  type SuggestReplyRequest,
} from '../im/assistant';
import {
  imAutomationApi,
  type AutomationRule,
  type CreateAutomationRuleRequest,
  type UpdateAutomationRuleRequest,
  type ExecutionHistory,
  type AutomationStats,
  type RuleTemplate,
  type RuleStatus,
  type RuleTriggerType,
  type RuleActionType,
  type ExecutionStatus,
} from '../im/automation';

const { createDomainMock } = vi.hoisted(() => ({
  createDomainMock: () => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('../client', () => {
  const mockClient = {
    im: createDomainMock(),
    crm: createDomainMock(),
    hrm: createDomainMock(),
    scm: createDomainMock(),
    wms: createDomainMock(),
    mes: createDomainMock(),
    finance: createDomainMock(),
    quality: createDomainMock(),
    pdm: createDomainMock(),
    pm: createDomainMock(),
    project: createDomainMock(),
    monitor: createDomainMock(),
    tenant: createDomainMock(),
    mobile: createDomainMock(),
    addressbook: createDomainMock(),
    feedback: createDomainMock(),
    file: createDomainMock(),
    doc: createDomainMock(),
    template: createDomainMock(),
    unified: createDomainMock(),
    masterData: createDomainMock(),
    ai: createDomainMock(),
    iam: createDomainMock(),
    erp: createDomainMock(),
    messages: createDomainMock(),
    notifications: createDomainMock(),
    portal: createDomainMock(),
    billing: createDomainMock(),
    analytics: createDomainMock(),
    search: createDomainMock(),
  };
  return {
    apiClient: mockClient,
    default: mockClient,
  };
});

describe('IM Assistant API Tests', () => {
  const mockSummary: ConversationSummary = {
    chat_id: 'chat-001',
    summary: '本次会议讨论了 Q4 的产品规划',
    key_points: ['产品发布时间', '市场策略', '资源分配'],
    participant_count: 5,
    message_count: 120,
    time_range: { start: '2026-08-15T09:00:00Z', end: '2026-08-15T10:00:00Z' },
    model_used: 'gpt-4o',
  };

  const mockActionItems: ActionItem[] = [
    {
      id: 'action-001',
      content: '完成产品原型设计',
      source_message_id: 'msg-001',
      extracted_by: 'ai',
      confidence: 0.95,
      status: 'pending',
      due_date: '2026-08-20',
      assigned_to: 'user-001',
    },
    {
      id: 'action-002',
      content: '准备市场调研报告',
      source_message_id: 'msg-005',
      extracted_by: 'ai',
      confidence: 0.88,
      status: 'pending',
    },
  ];

  const mockReplySuggestion: ReplySuggestion = {
    id: 'reply-001',
    suggestions: [
      {
        text: '好的，我会尽快处理',
        type: 'acknowledgment',
        confidence: 0.92,
        tone: 'professional',
      },
      {
        text: '请问具体需要什么时候完成？',
        type: 'question',
        confidence: 0.85,
        tone: 'professional',
      },
    ],
    context_window: 10,
  };

  const mockSentiment: ConversationSentiment = {
    chat_id: 'chat-001',
    overall_sentiment: 'positive',
    sentiment_score: 0.75,
    emotion_distribution: { positive: 0.6, neutral: 0.3, negative: 0.1 },
    trend: 'stable',
  };

  const mockInsights: ConversationInsights = {
    chat_id: 'chat-001',
    active_topics: [
      { topic: '产品规划', message_count: 45 },
      { topic: '市场策略', message_count: 30 },
    ],
    participant_activity: [
      { user_id: 'user-001', message_count: 35, avg_response_time_ms: 1200 },
      { user_id: 'user-002', message_count: 28, avg_response_time_ms: 1500 },
    ],
    peak_activity_hours: [9, 10, 14],
    unanswered_questions: ['关于预算的具体细节...'],
    suggested_actions: ['安排预算讨论会议'],
  };

  const mockConfig: AssistantConfig = {
    id: 'config-001',
    auto_summarize: true,
    auto_summarize_threshold: 50,
    smart_replies_enabled: true,
    action_item_detection: true,
    sentiment_monitoring: false,
    insights_enabled: true,
    preferred_language: 'zh',
    tone: 'professional',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应调用 POST /assistant/summarize 总结会话', async () => {
    const req: SummarizeConversationRequest = {
      chat_id: 'chat-001',
      time_range: { start: '2026-08-15T09:00:00Z', end: '2026-08-15T10:00:00Z' },
    };
    apiClient.im.post.mockResolvedValue({ data: mockSummary });
    const result = await imAssistantApi.summarizeConversation(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/assistant/summarize', req);
    expect(result.data?.summary).toBe('本次会议讨论了 Q4 的产品规划');
    expect(result.data?.key_points).toHaveLength(3);
  });

  it('应调用 POST /assistant/action-items 提取待办', async () => {
    const req = { chat_id: 'chat-001', auto_assign: true };
    apiClient.im.post.mockResolvedValue({ data: mockActionItems });
    const result = await imAssistantApi.extractActionItems(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/assistant/action-items', req);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0].content).toBe('完成产品原型设计');
  });

  it('应调用 POST /assistant/suggest-reply 建议回复', async () => {
    const req: SuggestReplyRequest = {
      chat_id: 'chat-001',
      message_id: 'msg-001',
      context_message_count: 10,
      num_suggestions: 2,
    };
    apiClient.im.post.mockResolvedValue({ data: mockReplySuggestion });
    const result = await imAssistantApi.suggestReply(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/assistant/suggest-reply', req);
    expect(result.data?.suggestions).toHaveLength(2);
  });

  it('应调用 POST /assistant/sentiment 分析情绪', async () => {
    const req = { chat_id: 'chat-001' };
    apiClient.im.post.mockResolvedValue({ data: mockSentiment });
    const result = await imAssistantApi.analyzeConversationSentiment(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/assistant/sentiment', req);
    expect(result.data?.overall_sentiment).toBe('positive');
    expect(result.data?.sentiment_score).toBe(0.75);
  });

  it('应调用 GET /assistant/insights/:chatId 获取会话洞察', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockInsights });
    const result = await imAssistantApi.getConversationInsights('chat-001');
    expect(apiClient.im.get).toHaveBeenCalledWith('/assistant/insights/chat-001');
    expect(result.data?.active_topics).toHaveLength(2);
    expect(result.data?.peak_activity_hours).toContain(9);
  });

  it('应调用 GET /assistant/config 获取 AI 助手配置', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockConfig });
    const result = await imAssistantApi.getAssistantConfig();
    expect(apiClient.im.get).toHaveBeenCalledWith('/assistant/config');
    expect(result.data?.auto_summarize).toBe(true);
  });

  it('应调用 PUT /assistant/config 更新 AI 助手配置', async () => {
    const updateData = { auto_summarize: false, smart_replies_enabled: true };
    apiClient.im.put.mockResolvedValue({ data: { ...mockConfig, auto_summarize: false } });
    const result = await imAssistantApi.updateAssistantConfig(updateData);
    expect(apiClient.im.put).toHaveBeenCalledWith('/assistant/config', updateData);
    expect(result.data?.auto_summarize).toBe(false);
  });

  it('应调用 GET /assistant/conversations 获取 AI 对话历史', async () => {
    const mockConversations: AssistantTask[] = [
      {
        id: 'task-001',
        type: 'summarize',
        status: 'completed',
        input: {},
        created_by: 'user-001',
        created_at: '2026-08-15T10:00:00Z',
      },
    ];
    apiClient.im.get.mockResolvedValue({ data: mockConversations });
    const result = await imAssistantApi.getAssistantConversations({ status: 'completed' });
    expect(apiClient.im.get).toHaveBeenCalledWith('/assistant/conversations', {
      params: { status: 'completed' },
    });
    expect(result.data).toHaveLength(1);
  });

  it('应调用 GET /assistant/tasks 获取 AI 任务列表', async () => {
    const mockTasks: AssistantTask[] = [
      {
        id: 'task-001',
        type: 'summarize',
        status: 'completed',
        input: {},
        created_by: 'user-001',
        created_at: '2026-08-15T10:00:00Z',
      },
      {
        id: 'task-002',
        type: 'extract_actions',
        status: 'processing',
        input: {},
        created_by: 'user-002',
        created_at: '2026-08-15T11:00:00Z',
      },
    ];
    apiClient.im.get.mockResolvedValue({ data: mockTasks });
    const result = await imAssistantApi.getAssistantTasks({ status: 'processing' });
    expect(apiClient.im.get).toHaveBeenCalledWith('/assistant/tasks', {
      params: { status: 'processing' },
    });
    expect(result.data).toHaveLength(2);
  });
});

describe('IM Automation API Tests', () => {
  const mockRule: AutomationRule = {
    id: 'rule-001',
    name: '报销触发规则',
    description: '检测到报销关键词时自动创建报销单',
    trigger: { type: 'keyword', condition: '报销,费用', chat_ids: ['chat-001'] },
    action: { type: 'create_ticket', params: { category: 'finance' } },
    status: 'enabled',
    execution_count: 15,
    last_executed_at: '2026-08-15T10:30:00Z',
    created_by: 'user-001',
    created_at: '2026-08-10T09:00:00Z',
    updated_at: '2026-08-15T10:30:00Z',
  };

  const mockStats: AutomationStats = {
    total_rules: 10,
    active_rules: 7,
    total_executions: 150,
    today_executions: 12,
    success_rate: 0.95,
    by_action_type: {
      send_message: 30,
      create_task: 25,
      create_event: 20,
      create_ticket: 40,
      send_notification: 20,
      webhook: 10,
      assign_owner: 5,
    },
    failed_executions: 7,
  };

  const mockHistory: ExecutionHistory[] = [
    {
      id: 'history-001',
      rule_id: 'rule-001',
      rule_name: '报销触发规则',
      trigger_message_id: 'msg-001',
      trigger_chat_id: 'chat-001',
      status: 'success',
      action_type: 'create_ticket',
      result: { ticket_id: 'ticket-001' },
      execution_time_ms: 250,
      created_at: '2026-08-15T10:30:00Z',
    },
    {
      id: 'history-002',
      rule_id: 'rule-002',
      rule_name: '会议提醒规则',
      trigger_message_id: 'msg-005',
      trigger_chat_id: 'chat-002',
      status: 'success',
      action_type: 'send_notification',
      result: { notification_sent: true },
      execution_time_ms: 120,
      created_at: '2026-08-15T10:35:00Z',
    },
  ];

  const mockTemplates: RuleTemplate[] = [
    {
      id: 'tpl-001',
      name: '报销关键词触发',
      description: '检测到报销相关关键词时自动创建报销单',
      category: 'finance',
      trigger: { type: 'keyword', condition: '报销,费用,支出' },
      action: { type: 'create_ticket', params: { category: 'finance' } },
      usage_count: 50,
      is_premade: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应调用 POST /automation/rules 创建自动化规则', async () => {
    const req: CreateAutomationRuleRequest = {
      name: '请假触发规则',
      description: '检测到请假关键词时自动创建请假单',
      trigger: { type: 'keyword', condition: '请假,休假', chat_ids: ['chat-003'] },
      action: { type: 'create_ticket', params: { category: 'hr' } },
    };
    apiClient.im.post.mockResolvedValue({ data: { ...mockRule, name: '请假触发规则' } });
    const result = await imAutomationApi.createAutomationRule(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/automation/rules', req);
    expect(result.data?.name).toBe('请假触发规则');
    expect(result.data?.trigger.type).toBe('keyword');
  });

  it('应调用 GET /automation/rules 列出自动化规则', async () => {
    apiClient.im.get.mockResolvedValue({ data: [mockRule] });
    const result = await imAutomationApi.listAutomationRules({ status: 'enabled' });
    expect(apiClient.im.get).toHaveBeenCalledWith('/automation/rules', {
      params: { status: 'enabled' },
    });
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].name).toBe('报销触发规则');
  });

  it('应调用 GET /automation/rules/:id 获取单个规则', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockRule });
    const result = await imAutomationApi.getAutomationRule('rule-001');
    expect(apiClient.im.get).toHaveBeenCalledWith('/automation/rules/rule-001');
    expect(result.data?.id).toBe('rule-001');
  });

  it('应调用 PUT /automation/rules/:id 更新规则', async () => {
    const updateData: UpdateAutomationRuleRequest = {
      name: '更新后的规则名',
      description: '新的描述',
    };
    apiClient.im.put.mockResolvedValue({ data: { ...mockRule, name: '更新后的规则名' } });
    const result = await imAutomationApi.updateAutomationRule('rule-001', updateData);
    expect(apiClient.im.put).toHaveBeenCalledWith('/automation/rules/rule-001', updateData);
    expect(result.data?.name).toBe('更新后的规则名');
  });

  it('应调用 DELETE /automation/rules/:id 删除规则', async () => {
    apiClient.im.delete.mockResolvedValue({ data: null });
    const result = await imAutomationApi.deleteAutomationRule('rule-001');
    expect(apiClient.im.delete).toHaveBeenCalledWith('/automation/rules/rule-001');
    expect(result.data).toBeNull();
  });

  it('应调用 POST /automation/rules/:id/toggle 切换规则状态', async () => {
    apiClient.im.post.mockResolvedValue({ data: { ...mockRule, status: 'disabled' } });
    const result = await imAutomationApi.toggleRuleStatus('rule-001', 'disabled');
    expect(apiClient.im.post).toHaveBeenCalledWith('/automation/rules/rule-001/toggle', {
      status: 'disabled',
    });
    expect(result.data?.status).toBe('disabled');
  });

  it('应调用 POST /automation/rules/:id/test 测试规则', async () => {
    const testResult = {
      triggered: true,
      actions: [
        { type: 'create_ticket' as RuleActionType, executed: true, result: { ticket_id: 't-001' } },
      ],
    };
    apiClient.im.post.mockResolvedValue({ data: testResult });
    const result = await imAutomationApi.testRule('rule-001', '我要报销 500 元');
    expect(apiClient.im.post).toHaveBeenCalledWith('/automation/rules/rule-001/test', {
      test_message: '我要报销 500 元',
    });
    expect(result.data?.triggered).toBe(true);
  });

  it('应调用 POST /automation/workflows/:id/trigger 触发工作流', async () => {
    apiClient.im.post.mockResolvedValue({
      data: { execution_id: 'exec-001', status: 'success' as ExecutionStatus },
    });
    const result = await imAutomationApi.triggerWorkflow('wf-001', { message: '触发测试' });
    expect(apiClient.im.post).toHaveBeenCalledWith('/automation/workflows/wf-001/trigger', {
      message: '触发测试',
    });
    expect(result.data?.status).toBe('success');
  });

  it('应调用 GET /automation/history 获取执行历史', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockHistory });
    const result = await imAutomationApi.getAutomationHistory({ limit: 10 });
    expect(apiClient.im.get).toHaveBeenCalledWith('/automation/history', { params: { limit: 10 } });
    expect(result.data).toHaveLength(2);
  });

  it('应调用 GET /automation/stats 获取自动化统计', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockStats });
    const result = await imAutomationApi.getAutomationStats();
    expect(apiClient.im.get).toHaveBeenCalledWith('/automation/stats');
    expect(result.data?.total_rules).toBe(10);
    expect(result.data?.success_rate).toBe(0.95);
  });

  it('应调用 GET /automation/templates 获取规则模板', async () => {
    apiClient.im.get.mockResolvedValue({ data: mockTemplates });
    const result = await imAutomationApi.getRuleTemplates({ category: 'finance' });
    expect(apiClient.im.get).toHaveBeenCalledWith('/automation/templates', {
      params: { category: 'finance' },
    });
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].is_premade).toBe(true);
  });

  it('应调用 POST /automation/rules/:id/duplicate 复制规则', async () => {
    apiClient.im.post.mockResolvedValue({
      data: { ...mockRule, id: 'rule-002', name: '报销触发规则 副本' },
    });
    const result = await imAutomationApi.duplicateRule('rule-001', '报销触发规则 副本');
    expect(apiClient.im.post).toHaveBeenCalledWith('/automation/rules/rule-001/duplicate', {
      new_name: '报销触发规则 副本',
    });
    expect(result.data?.name).toBe('报销触发规则 副本');
  });
});

describe('IM Phase 24 - 聚合 API 快捷方法测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('imApi.assistant 子域应包含 AI 助手 API', () => {
    expect(imApi.assistant).toBeDefined();
    expect(imApi.assistant.summarizeConversation).toBeInstanceOf(Function);
    expect(imApi.assistant.extractActionItems).toBeInstanceOf(Function);
    expect(imApi.assistant.suggestReply).toBeInstanceOf(Function);
  });

  it('imApi.automation 子域应包含自动化 API', () => {
    expect(imApi.automation).toBeDefined();
    expect(imApi.automation.createAutomationRule).toBeInstanceOf(Function);
    expect(imApi.automation.listAutomationRules).toBeInstanceOf(Function);
    expect(imApi.automation.getAutomationStats).toBeInstanceOf(Function);
  });

  it('顶层快捷方法 summarizeConversation 应调用 imAssistantApi.summarizeConversation', async () => {
    const req = { chat_id: 'chat-001' };
    apiClient.im.post.mockResolvedValue({ data: { id: 'sum-001' } });
    const result = await imApi.summarizeConversation(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/assistant/summarize', req);
    expect(result.data?.id).toBe('sum-001');
  });

  it('顶层快捷方法 extractActionItems 应调用 imAssistantApi.extractActionItems', async () => {
    const req = { chat_id: 'chat-001' };
    apiClient.im.post.mockResolvedValue({ data: [{ id: 'action-001' }] });
    const result = await imApi.extractActionItems(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/assistant/action-items', req);
    expect(result.data).toHaveLength(1);
  });

  it('顶层快捷方法 suggestConversationReply 应调用 imAssistantApi.suggestReply', async () => {
    const req = { chat_id: 'chat-001', message_id: 'msg-001' };
    apiClient.im.post.mockResolvedValue({ data: { id: 'reply-001' } });
    const result = await imApi.suggestConversationReply(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/assistant/suggest-reply', req);
    expect(result.data?.id).toBe('reply-001');
  });

  it('顶层快捷方法 createAutomationRule 应调用 imAutomationApi.createAutomationRule', async () => {
    const req: CreateAutomationRuleRequest = {
      name: '测试规则',
      trigger: { type: 'keyword', condition: '测试' },
      action: { type: 'send_notification', params: {} },
    };
    apiClient.im.post.mockResolvedValue({ data: { id: 'rule-001' } });
    const result = await imApi.createAutomationRule(req);
    expect(apiClient.im.post).toHaveBeenCalledWith('/automation/rules', req);
    expect(result.data?.id).toBe('rule-001');
  });

  it('顶层快捷方法 listAutomationRules 应调用 imAutomationApi.listAutomationRules', async () => {
    apiClient.im.get.mockResolvedValue({ data: [{ id: 'rule-001' }] });
    const result = await imApi.listAutomationRules();
    expect(apiClient.im.get).toHaveBeenCalledWith('/automation/rules', { params: undefined });
    expect(result.data).toHaveLength(1);
  });

  it('顶层快捷方法 getAutomationStats 应调用 imAutomationApi.getAutomationStats', async () => {
    apiClient.im.get.mockResolvedValue({ data: { total_rules: 5 } });
    const result = await imApi.getAutomationStats();
    expect(apiClient.im.get).toHaveBeenCalledWith('/automation/stats');
    expect(result.data?.total_rules).toBe(5);
  });

  it('顶层快捷方法 getAssistantConfig 应调用 imAssistantApi.getAssistantConfig', async () => {
    apiClient.im.get.mockResolvedValue({ data: { id: 'config-001' } });
    const result = await imApi.getAssistantConfig();
    expect(apiClient.im.get).toHaveBeenCalledWith('/assistant/config');
    expect(result.data?.id).toBe('config-001');
  });

  it('顶层快捷方法 getAutomationHistory 应调用 imAutomationApi.getAutomationHistory', async () => {
    apiClient.im.get.mockResolvedValue({ data: [{ id: 'history-001' }] });
    const result = await imApi.getAutomationHistory();
    expect(apiClient.im.get).toHaveBeenCalledWith('/automation/history', { params: undefined });
    expect(result.data).toHaveLength(1);
  });

  it('顶层快捷方法 triggerWorkflow 应调用 imAutomationApi.triggerWorkflow', async () => {
    const params = { action: 'test' };
    apiClient.im.post.mockResolvedValue({ data: { status: 'success' } });
    const result = await imApi.triggerWorkflow('wf-001', params);
    expect(apiClient.im.post).toHaveBeenCalledWith('/automation/workflows/wf-001/trigger', params);
    expect(result.data?.status).toBe('success');
  });
});
