/**
 * AI 业务智能模块 - Hooks 集成测试
 *
 * 测试 useBusinessCopilot 和 useGovernanceDashboard hooks
 *
 * 关注点：
 *   - 状态管理正确性
 *   - 异步操作处理
 *   - 错误处理
 *   - 状态转换
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Hoisted mocks (vi.mock 工厂会被提升到顶部，里面的引用必须用 vi.hoisted) ───
const mocks = vi.hoisted(() => {
  const mockCreateSession = vi.fn();
  const mockGetSession = vi.fn();
  const mockDeleteSession = vi.fn();
  const mockSendMessage = vi.fn();
  const mockRecognizeIntent = vi.fn();
  const mockGetModuleConfig = vi.fn();
  const mockLoadAllModuleConfigs = vi.fn();
  const mockSearchFAQ = vi.fn();

  return {
    mockCreateSession,
    mockGetSession,
    mockDeleteSession,
    mockSendMessage,
    mockRecognizeIntent,
    mockGetModuleConfig,
    mockLoadAllModuleConfigs,
    mockSearchFAQ,
  };
});

vi.mock('@/api/ai/business-copilot', () => ({
  createSession: mocks.mockCreateSession,
  getSession: mocks.mockGetSession,
  deleteSession: mocks.mockDeleteSession,
  sendMessage: mocks.mockSendMessage,
  recognizeIntent: mocks.mockRecognizeIntent,
  getModuleConfig: mocks.mockGetModuleConfig,
  getAllModuleConfigs: mocks.mockLoadAllModuleConfigs,
  searchFAQ: mocks.mockSearchFAQ,
}));

// 解构 hoisted mocks
const {
  mockCreateSession,
  mockGetSession,
  mockDeleteSession,
  mockSendMessage,
  mockRecognizeIntent,
  mockGetModuleConfig,
  mockLoadAllModuleConfigs,
  mockSearchFAQ,
} = mocks;

// 导入待测试的 hooks
import { useBusinessCopilot } from '@/hooks/features/ai/useBusinessCopilot';

// ─── 测试数据 ───
const mockSession = {
  session_id: 'test-session-uuid',
  user_id: 'user-123',
  tenant_id: 'tenant-456',
  module: 'erp',
  conversation_history: [],
  context_data: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCopilotResponse = {
  session_id: 'test-session-uuid',
  reply: '这是测试回复',
  intent: 'query',
  confidence: 0.95,
  tool_calls: [],
  suggested_actions: [],
  referenced_data: [],
  needs_confirmation: false,
  processing_time_ms: 1234,
};

const mockModuleConfig = {
  module: 'erp',
  name: 'ERP 企业资源计划',
  description: '面向 ERP 模块的智能助手',
  system_prompt: '你是一个专业的 ERP 助手',
  welcome_message: '您好，我是 ERP 智能助手',
  supported_intents: ['query', 'create', 'update'],
  available_tools: [],
  faqs: [],
  quick_actions: [],
};

// ─── 测试套件 ───

describe('useBusinessCopilot Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSession.mockResolvedValue({ data: mockSession });
    mockSendMessage.mockResolvedValue({ data: mockCopilotResponse });
    mockGetModuleConfig.mockResolvedValue({ data: mockModuleConfig });
    mockDeleteSession.mockResolvedValue({ data: null });
  });

  describe('初始化', () => {
    it('应该使用默认模块初始化', () => {
      const { result } = renderHook(() => useBusinessCopilot('erp'));

      expect(result.current.currentModule).toBe('erp');
      expect(result.current.session).toBeNull();
      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('应该支持不同的初始模块', () => {
      const { result } = renderHook(() => useBusinessCopilot('finance'));

      expect(result.current.currentModule).toBe('finance');
    });
  });

  describe('createNewSession', () => {
    it('应该创建新会话并更新状态', async () => {
      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        const session = await result.current.createNewSession('erp');
        expect(session).toEqual(mockSession);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.messages).toEqual([]);
      expect(mockCreateSession).toHaveBeenCalledWith('erp');
    });

    it('应该处理创建失败', async () => {
      mockCreateSession.mockRejectedValue(new Error('创建失败'));

      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        const session = await result.current.createNewSession('erp');
        expect(session).toBeNull();
      });

      expect(result.current.error).toBe('创建失败');
      expect(result.current.session).toBeNull();
    });
  });

  describe('send', () => {
    it('应该发送消息并更新消息列表', async () => {
      const { result } = renderHook(() => useBusinessCopilot('erp'));

      // 先创建会话
      await act(async () => {
        await result.current.createNewSession('erp');
      });

      // 发送消息
      await act(async () => {
        const response = await result.current.send('测试消息');
        expect(response).toEqual(mockCopilotResponse);
      });

      // 验证消息列表包含用户消息和助手消息
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('测试消息');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe('这是测试回复');
      expect(result.current.lastResponse).toEqual(mockCopilotResponse);
    });

    it('应该设置发送状态', async () => {
      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        await result.current.createNewSession('erp');
      });

      // 验证发送前状态
      expect(result.current.isSending).toBe(false);

      // 发送消息并等待完成
      await act(async () => {
        await result.current.send('测试消息');
      });

      // 验证发送完成状态
      expect(result.current.isSending).toBe(false);
      expect(result.current.messages).toHaveLength(2);
    });

    it('应该处理发送失败', async () => {
      mockSendMessage.mockRejectedValue(new Error('发送失败'));

      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        await result.current.createNewSession('erp');
      });

      await act(async () => {
        const response = await result.current.send('测试消息');
        expect(response).toBeNull();
      });

      expect(result.current.error).toBe('发送失败');
      expect(result.current.messages).toHaveLength(0);
    });
  });

  describe('recognize', () => {
    it('应该识别意图', async () => {
      mockRecognizeIntent.mockResolvedValue({ data: { intent: 'query', confidence: 0.92 } });

      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        const result_data = await result.current.recognize('查询数据');
        expect(result_data).toEqual({ intent: 'query', confidence: 0.92 });
      });

      expect(result.current.intentResult).toEqual({ intent: 'query', confidence: 0.92 });
      expect(mockRecognizeIntent).toHaveBeenCalledWith('查询数据', 'erp');
    });
  });

  describe('switchModule', () => {
    it('应该切换模块并创建新会话', async () => {
      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        await result.current.createNewSession('erp');
      });

      expect(result.current.currentModule).toBe('erp');

      await act(async () => {
        await result.current.switchModule('finance');
      });

      expect(result.current.currentModule).toBe('finance');
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.messages).toEqual([]);
    });
  });

  describe('loadModuleConfig', () => {
    it('应该加载模块配置', async () => {
      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        const config = await result.current.loadModuleConfig('erp');
        expect(config).toEqual(mockModuleConfig);
      });

      expect(result.current.moduleConfig).toEqual(mockModuleConfig);
    });
  });

  describe('clearSession', () => {
    it('应该清除会话', async () => {
      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        await result.current.createNewSession('erp');
      });

      expect(result.current.session).not.toBeNull();

      await act(async () => {
        const success = await result.current.clearSession();
        expect(success).toBe(true);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.messages).toEqual([]);
      expect(result.current.lastResponse).toBeNull();
    });

    it('应该在没有会话时返回 true', async () => {
      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        const success = await result.current.clearSession();
        expect(success).toBe(true);
      });
    });
  });

  describe('clearError', () => {
    it('应该清除错误', async () => {
      mockCreateSession.mockRejectedValue(new Error('测试错误'));

      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        await result.current.createNewSession('erp');
      });

      expect(result.current.error).toBe('测试错误');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('应该重置所有状态', async () => {
      const { result } = renderHook(() => useBusinessCopilot('erp'));

      await act(async () => {
        await result.current.createNewSession('erp');
        await result.current.send('测试消息');
      });

      expect(result.current.session).not.toBeNull();
      expect(result.current.messages.length).toBeGreaterThan(0);

      act(() => {
        result.current.reset();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.messages).toEqual([]);
      expect(result.current.lastResponse).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.currentModule).toBe('erp');
    });
  });

  describe('updateRecords', () => {
    it('应该更新选中记录', () => {
      const { result } = renderHook(() => useBusinessCopilot('erp'));

      const records = [
        { record_type: 'purchase_order', record_id: 'PO-001', record_name: '采购订单 001' },
      ];

      act(() => {
        result.current.updateRecords(records);
      });

      expect(result.current.selectedRecords).toEqual(records);
    });
  });
});

describe('Hook 返回值完整性', () => {
  it('useBusinessCopilot 应该返回所有必要的属性和方法', () => {
    const { result } = renderHook(() => useBusinessCopilot('erp'));

    // 状态属性
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('session');
    expect(result.current).toHaveProperty('messages');
    expect(result.current).toHaveProperty('lastResponse');
    expect(result.current).toHaveProperty('isSending');
    expect(result.current).toHaveProperty('currentModule');
    expect(result.current).toHaveProperty('moduleConfig');
    expect(result.current).toHaveProperty('allModuleConfigs');
    expect(result.current).toHaveProperty('intentResult');
    expect(result.current).toHaveProperty('faqResults');
    expect(result.current).toHaveProperty('selectedRecords');

    // 方法
    expect(result.current).toHaveProperty('createNewSession');
    expect(result.current).toHaveProperty('send');
    expect(result.current).toHaveProperty('recognize');
    expect(result.current).toHaveProperty('switchModule');
    expect(result.current).toHaveProperty('loadModuleConfig');
    expect(result.current).toHaveProperty('loadAllModuleConfigs');
    expect(result.current).toHaveProperty('searchFaq');
    expect(result.current).toHaveProperty('updateRecords');
    expect(result.current).toHaveProperty('clearSession');
    expect(result.current).toHaveProperty('clearError');
    expect(result.current).toHaveProperty('reset');

    // 验证方法是函数
    expect(typeof result.current.createNewSession).toBe('function');
    expect(typeof result.current.send).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });
});
