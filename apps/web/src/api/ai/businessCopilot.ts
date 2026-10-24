/**
 * 业务 Copilot API 调用
 *
 * 提供业务 Copilot 的 API 调用封装，支持：
 * - 会话管理（创建/获取/删除）
 * - 消息发送与接收
 * - 意图识别
 * - 业务模块配置获取
 * - 工具调用
 */

import { apiClient } from '../client';
import type { ApiResponse } from '../client';

// ============================================================================
// 类型定义
// ============================================================================

/** 业务模块类型 */
export type BusinessModuleType = 'erp' | 'finance' | 'crm' | 'wms' | 'hr' | 'oa' | 'general';

/** Copilot 意图类型 */
type CopilotIntentType =
  | 'query'
  | 'create'
  | 'update'
  | 'delete'
  | 'analyze'
  | 'report'
  | 'approve'
  | 'reminder'
  | 'knowledge'
  | 'guidance'
  | 'other';

/** 工具调用状态 */
type ToolCallStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

/** 选中的记录 */
export interface SelectedRecord {
  record_type: string;
  record_id: string;
  record_name?: string;
  data?: Record<string, unknown>;
}

/** 对话消息 */
export interface ConversationMessage {
  message_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tool_calls?: ToolCall[];
}

/** 工具调用 */
interface ToolCall {
  call_id: string;
  tool_name: string;
  parameters: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: ToolCallStatus;
}

/** 建议的操作 */
interface SuggestedAction {
  action_id: string;
  action_type: string;
  label: string;
  description?: string;
  parameters?: Record<string, unknown>;
  priority: number;
}

/** 引用的数据 */
interface ReferencedData {
  data_type: string;
  data_id: string;
  data_name?: string;
  summary?: string;
  link?: string;
}

/** Copilot 会话 */
export interface CopilotSession {
  session_id: string;
  user_id: string;
  tenant_id: string;
  module: BusinessModuleType;
  current_page?: string;
  selected_records: SelectedRecord[];
  conversation_history: ConversationMessage[];
  context_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Copilot 请求 */
export interface CopilotRequest {
  session_id?: string;
  user_input: string;
  module: BusinessModuleType;
  current_page?: string;
  selected_records?: SelectedRecord[];
  additional_context?: Record<string, unknown>;
  stream?: boolean;
}

/** 发送消息请求 */
export interface SendMessageRequest {
  module: BusinessModuleType;
  session_id: string;
  user_input: string;
  user_id?: string;
}

/** Copilot 响应 */
export interface CopilotResponse {
  session_id: string;
  reply: string;
  intent: CopilotIntentType;
  confidence: number;
  tool_calls: ToolCall[];
  suggested_actions: SuggestedAction[];
  referenced_data: ReferencedData[];
  needs_confirmation: boolean;
  confirmation_prompt?: string;
  processing_time_ms: number;
}

/** 意图识别结果 */
export interface IntentRecognitionResult {
  intent: CopilotIntentType;
  confidence: number;
}

/** 业务模块配置 */
export interface BusinessModuleConfig {
  module: BusinessModuleType;
  name: string;
  description: string;
  system_prompt: string;
  welcome_message: string;
  supported_intents: CopilotIntentType[];
  available_tools: BusinessToolDefinition[];
  faqs: FAQItem[];
  quick_actions: QuickActionItem[];
}

/** 业务工具定义 */
interface BusinessToolDefinition {
  tool_id: string;
  name: string;
  description: string;
  category: string;
  parameters: ToolParameter[];
  requires_confirmation: boolean;
  use_cases: string[];
}

/** 工具参数 */
interface ToolParameter {
  name: string;
  param_type: string;
  description: string;
  required: boolean;
  default_value?: unknown;
  enum_values?: string[];
}

/** FAQ 项 */
export interface FAQItem {
  question: string;
  answer: string;
  keywords: string[];
  category: string;
}

/** 快捷操作 */
interface QuickActionItem {
  action_id: string;
  label: string;
  description: string;
  icon: string;
  intent: CopilotIntentType;
  preset_prompt: string;
}

// ============================================================================
// API 函数
// ============================================================================

/**
 * 创建 Copilot 会话
 */
export async function createSession(
  module: BusinessModuleType,
  user_id?: string,
  tenant_id?: string
): Promise<CopilotSession> {
  // dsh copilot 接口返回裸业务对象；user_id 后端必填，缺省用 anonymous
  return apiClient.ai.post(`/dsh/copilot/sessions`, {
    module,
    user_id: user_id || 'anonymous',
    tenant_id,
  });
}

/**
 * 删除会话（hook 活调：useBusinessCopilot.ts:282）
 */
export async function deleteSession(session_id: string): Promise<ApiResponse<void>> {
  // svc/ai 已实现（2026-10-24）：DELETE /dsh/copilot/sessions/{id}
  // （软删 core.ai_conversations，成功返回 204；core 侧 501 stub 已完成交接）
  return apiClient.ai.delete(`/dsh/copilot/sessions/${session_id}`);
}

/**
 * 发送消息并获取响应
 */
export async function sendMessage(request: SendMessageRequest): Promise<CopilotResponse> {
  return apiClient.ai.post(`/dsh/copilot/sessions/${request.session_id}/messages`, {
    message: request.user_input,
    module: request.module,
    user_id: request.user_id || 'anonymous',
  });
}

/**
 * 识别意图
 */
export async function recognizeIntent(
  text: string,
  module?: BusinessModuleType
): Promise<IntentRecognitionResult> {
  return apiClient.ai.post(`/dsh/copilot/intent/recognize`, { text, module });
}

/**
 * 获取业务模块配置
 */
export async function getModuleConfig(module: BusinessModuleType): Promise<BusinessModuleConfig> {
  return apiClient.ai.get(`/dsh/copilot/modules/${module}`);
}

/**
 * 获取所有业务模块配置
 */
export async function getAllModuleConfigs(): Promise<BusinessModuleConfig[]> {
  return apiClient.ai.get(`/dsh/copilot/modules`);
}

/**
 * 搜索 FAQ（hook 活调：useBusinessCopilot.ts:258）
 */
export async function searchFAQ(
  module: BusinessModuleType,
  query: string
): Promise<ApiResponse<FAQItem[]>> {
  // svc/ai 已实现（2026-10-24）：GET /dsh/copilot/modules/{module}/faq?q=...
  // （curated 静态知识库按 q 过滤；core 侧 501 stub 已完成交接）
  return apiClient.ai.get(`/dsh/copilot/modules/${module}/faq`, {
    params: { q: query },
  });
}

/**
 * 获取会话历史消息
 */
export async function getSessionMessages(
  session_id: string
): Promise<ApiResponse<ConversationMessage[]>> {
  return apiClient.ai.get(`/dsh/copilot/sessions/${session_id}/messages`);
}

/**
 * 更新选中记录
 */
export async function updateSelectedRecords(
  session_id: string,
  records: SelectedRecord[]
): Promise<ApiResponse<void>> {
  // 后端已实现（2026-10-06）：PUT /dsh/copilot/sessions/{session_id}/records
  return apiClient.ai.put(`/dsh/copilot/sessions/${session_id}/records`, { records });
}

/**
 * 设置上下文数据
 */
export async function setContextData(
  session_id: string,
  key: string,
  value: unknown
): Promise<ApiResponse<void>> {
  // 后端已实现（2026-10-06）：PUT /dsh/copilot/sessions/{session_id}/context
  return apiClient.ai.put(`/dsh/copilot/sessions/${session_id}/context`, { key, value });
}
