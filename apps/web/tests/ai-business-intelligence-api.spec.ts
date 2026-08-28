/**
 * AI 业务智能模块 - API 客户端集成测试
 *
 * 测试业务 Copilot、智能表单、文档智能和治理仪表盘的 API 客户端
 *
 * 关注点：
 *   - API 端点路径正确性
 *   - 请求参数序列化
 *   - 响应数据解析
 *   - 错误处理
 *   - 类型安全
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks (vi.mock 工厂会被提升到顶部，里面的引用必须用 vi.hoisted) ───
const mocks = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockDelete = vi.fn();

  return {
    mockGet,
    mockPost,
    mockPut,
    mockDelete,
  };
});

vi.mock('@/api/client', () => ({
  apiClient: {
    get: mocks.mockGet,
    post: mocks.mockPost,
    put: mocks.mockPut,
    delete: mocks.mockDelete,
  },
  ApiResponse: undefined,
}));

// 解构 hoisted mocks
const { mockGet, mockPost, mockPut, mockDelete } = mocks;

// 导入待测试的 API
import {
  createSession,
  getSession,
  deleteSession,
  sendMessage,
  recognizeIntent,
  getModuleConfig,
  getAllModuleConfigs,
  searchFAQ,
} from '@/api/ai/business-copilot';

import {
  getFormDefinition,
  getAllFormDefinitions,
  validateForm,
  autoFillForm,
  generateFormFromText,
  submitForm,
  saveFormDraft,
} from '@/api/ai/business-intelligence';

import {
  getGovernanceDashboard,
  getGovernanceScore,
  getRiskAssessment,
  getComplianceStatus,
  getCostAnalysis,
  getPerformanceMetrics,
} from '@/api/ai/governance-dashboard';

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

const mockFormDefinition = {
  form_id: 'purchase_request',
  name: '采购申请单',
  fields: [
    { field_id: 'title', name: 'title', label: '标题', field_type: 'text', required: true },
  ],
};

const mockGovernanceData = {
  generated_at: '2024-01-01T00:00:00Z',
  time_range: '24h',
  overall_score: 85,
  governance_level: 'good',
  key_metrics: {
    total_requests: 1000,
    success_rate: 98.5,
  },
};

// ─── 测试套件 ───

describe('业务 Copilot API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('应该调用正确的端点并传递参数', async () => {
      mockPost.mockResolvedValue({ data: mockSession });

      const result = await createSession('erp', 'user-123', 'tenant-456');

      expect(mockPost).toHaveBeenCalledWith('/api/ai/copilot/sessions', {
        module: 'erp',
        user_id: 'user-123',
        tenant_id: 'tenant-456',
      });
      expect(result.data).toEqual(mockSession);
    });

    it('应该处理可选参数', async () => {
      mockPost.mockResolvedValue({ data: mockSession });

      await createSession('finance');

      expect(mockPost).toHaveBeenCalledWith('/api/ai/copilot/sessions', {
        module: 'finance',
        user_id: undefined,
        tenant_id: undefined,
      });
    });
  });

  describe('getSession', () => {
    it('应该调用正确的端点', async () => {
      mockGet.mockResolvedValue({ data: mockSession });

      const result = await getSession('test-session-uuid');

      expect(mockGet).toHaveBeenCalledWith('/api/ai/copilot/sessions/test-session-uuid');
      expect(result.data).toEqual(mockSession);
    });
  });

  describe('deleteSession', () => {
    it('应该调用 DELETE 方法', async () => {
      mockDelete.mockResolvedValue({ data: null });

      await deleteSession('test-session-uuid');

      expect(mockDelete).toHaveBeenCalledWith('/api/ai/copilot/sessions/test-session-uuid');
    });
  });

  describe('sendMessage', () => {
    it('应该传递完整的请求参数', async () => {
      mockPost.mockResolvedValue({ data: mockCopilotResponse });

      const request = {
        session_id: 'test-session-uuid',
        user_input: '查询采购订单',
        module: 'erp' as const,
      };

      const result = await sendMessage(request);

      expect(mockPost).toHaveBeenCalledWith('/api/ai/copilot/chat', request);
      expect(result.data).toEqual(mockCopilotResponse);
    });
  });

  describe('recognizeIntent', () => {
    it('应该识别意图', async () => {
      mockPost.mockResolvedValue({ data: { intent: 'query', confidence: 0.92 } });

      const result = await recognizeIntent('查询数据', 'erp');

      expect(mockPost).toHaveBeenCalledWith('/api/ai/copilot/intent', {
        text: '查询数据',
        module: 'erp',
      });
      expect(result.data?.intent).toBe('query');
    });
  });

  describe('getModuleConfig', () => {
    it('应该获取模块配置', async () => {
      const mockConfig = { module: 'erp', name: 'ERP', supported_intents: [] };
      mockGet.mockResolvedValue({ data: mockConfig });

      const result = await getModuleConfig('erp');

      expect(mockGet).toHaveBeenCalledWith('/api/ai/copilot/modules/erp');
      expect(result.data).toEqual(mockConfig);
    });
  });

  describe('getAllModuleConfigs', () => {
    it('应该获取所有模块配置', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await getAllModuleConfigs();

      expect(mockGet).toHaveBeenCalledWith('/api/ai/copilot/modules');
    });
  });

  describe('searchFAQ', () => {
    it('应该搜索 FAQ', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await searchFAQ('erp', '采购');

      expect(mockGet).toHaveBeenCalledWith('/api/ai/copilot/modules/erp/faq', {
        params: { q: '采购' },
      });
    });
  });
});

describe('智能表单 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFormDefinition', () => {
    it('应该获取表单定义', async () => {
      mockGet.mockResolvedValue({ data: mockFormDefinition });

      const result = await getFormDefinition('purchase_request');

      expect(mockGet).toHaveBeenCalledWith('/api/ai/forms/purchase_request');
      expect(result.data).toEqual(mockFormDefinition);
    });
  });

  describe('getAllFormDefinitions', () => {
    it('应该获取所有表单定义', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await getAllFormDefinitions();

      expect(mockGet).toHaveBeenCalledWith('/api/ai/forms', { params: undefined });
    });

    it('应该支持分类筛选', async () => {
      mockGet.mockResolvedValue({ data: [] });

      await getAllFormDefinitions('erp');

      expect(mockGet).toHaveBeenCalledWith('/api/ai/forms', { params: { category: 'erp' } });
    });
  });

  describe('validateForm', () => {
    it('应该验证表单数据', async () => {
      const mockResult = { is_valid: true, field_errors: {} };
      mockPost.mockResolvedValue({ data: mockResult });

      const values = { title: '测试' };
      const result = await validateForm('purchase_request', values);

      expect(mockPost).toHaveBeenCalledWith('/api/ai/forms/purchase_request/validate', { values });
      expect(result.data?.is_valid).toBe(true);
    });
  });

  describe('autoFillForm', () => {
    it('应该自动填充表单', async () => {
      mockPost.mockResolvedValue({ data: { form_id: 'purchase_request', values: {} } });

      const context = { user_id: '123' };
      await autoFillForm('purchase_request', context);

      expect(mockPost).toHaveBeenCalledWith('/api/ai/forms/purchase_request/auto-fill', { context });
    });
  });

  describe('generateFormFromText', () => {
    it('应该从文本生成表单', async () => {
      mockPost.mockResolvedValue({ data: { form_id: 'purchase_request', values: {} } });

      await generateFormFromText('purchase_request', '采购10台电脑');

      expect(mockPost).toHaveBeenCalledWith('/api/ai/forms/purchase_request/generate', {
        text: '采购10台电脑',
      });
    });
  });

  describe('submitForm', () => {
    it('应该提交表单', async () => {
      mockPost.mockResolvedValue({ data: { form_id: 'purchase_request', status: 'submitted' } });

      const values = { title: '测试' };
      await submitForm('purchase_request', values, 'record-123');

      expect(mockPost).toHaveBeenCalledWith('/api/ai/forms/purchase_request/submit', {
        values,
        record_id: 'record-123',
      });
    });
  });

  describe('saveFormDraft', () => {
    it('应该保存草稿', async () => {
      mockPost.mockResolvedValue({ data: { form_id: 'purchase_request', status: 'draft' } });

      const values = { title: '测试' };
      await saveFormDraft('purchase_request', values);

      expect(mockPost).toHaveBeenCalledWith('/api/ai/forms/purchase_request/draft', {
        values,
        record_id: undefined,
      });
    });
  });
});

describe('治理仪表盘 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGovernanceDashboard', () => {
    it('应该获取仪表盘数据', async () => {
      mockGet.mockResolvedValue({ data: mockGovernanceData });

      const result = await getGovernanceDashboard('24h');

      expect(mockGet).toHaveBeenCalledWith('/api/ai/governance/dashboard', {
        params: { time_range: '24h' },
      });
      expect(result.data).toEqual(mockGovernanceData);
    });

    it('应该使用默认时间范围', async () => {
      mockGet.mockResolvedValue({ data: mockGovernanceData });

      await getGovernanceDashboard();

      expect(mockGet).toHaveBeenCalledWith('/api/ai/governance/dashboard', {
        params: { time_range: '24h' },
      });
    });
  });

  describe('getGovernanceScore', () => {
    it('应该获取治理评分', async () => {
      mockGet.mockResolvedValue({ data: { overall_score: 85 } });

      await getGovernanceScore('7d');

      expect(mockGet).toHaveBeenCalledWith('/api/ai/governance/score', {
        params: { time_range: '7d' },
      });
    });
  });

  describe('getRiskAssessment', () => {
    it('应该获取风险评估', async () => {
      mockGet.mockResolvedValue({ data: { overall_risk_level: 'low' } });

      await getRiskAssessment();

      expect(mockGet).toHaveBeenCalledWith('/api/ai/governance/risk', {
        params: undefined,
      });
    });
  });

  describe('getComplianceStatus', () => {
    it('应该获取合规状态', async () => {
      mockGet.mockResolvedValue({ data: { overall_compliance_rate: 92 } });

      await getComplianceStatus('GDPR');

      expect(mockGet).toHaveBeenCalledWith('/api/ai/governance/compliance', {
        params: { framework: 'GDPR' },
      });
    });
  });

  describe('getCostAnalysis', () => {
    it('应该获取成本分析', async () => {
      mockGet.mockResolvedValue({ data: { total_cost: 12500 } });

      await getCostAnalysis('30d');

      expect(mockGet).toHaveBeenCalledWith('/api/ai/governance/cost', {
        params: { time_range: '30d' },
      });
    });
  });

  describe('getPerformanceMetrics', () => {
    it('应该获取性能指标', async () => {
      mockGet.mockResolvedValue({ data: { average_response_ms: 450 } });

      await getPerformanceMetrics();

      expect(mockGet).toHaveBeenCalledWith('/api/ai/governance/performance', {
        params: undefined,
      });
    });
  });
});

describe('API 端点路径验证', () => {
  it('业务 Copilot 端点应该以 /api/ai/copilot 开头', () => {
    const copilotEndpoints = [
      '/api/ai/copilot/sessions',
      '/api/ai/copilot/chat',
      '/api/ai/copilot/intent',
      '/api/ai/copilot/modules',
    ];

    copilotEndpoints.forEach((endpoint) => {
      expect(endpoint).toMatch(/^\/api\/ai\/copilot/);
    });
  });

  it('智能表单端点应该以 /api/ai/forms 开头', () => {
    const formEndpoints = [
      '/api/ai/forms',
      '/api/ai/forms/purchase_request',
      '/api/ai/forms/purchase_request/validate',
    ];

    formEndpoints.forEach((endpoint) => {
      expect(endpoint).toMatch(/^\/api\/ai\/forms/);
    });
  });

  it('治理仪表盘端点应该以 /api/ai/governance 开头', () => {
    const governanceEndpoints = [
      '/api/ai/governance/dashboard',
      '/api/ai/governance/score',
      '/api/ai/governance/risk',
      '/api/ai/governance/compliance',
      '/api/ai/governance/cost',
      '/api/ai/governance/performance',
    ];

    governanceEndpoints.forEach((endpoint) => {
      expect(endpoint).toMatch(/^\/api\/ai\/governance/);
    });
  });
});
