/**
 * DSH Agent API 调用
 *
 * 提供基于 DSH Agent 编排器的 API 调用，支持：
 * - 同步执行 Agent
 * - 流式执行 Agent（SSE）
 * - 会话管理
 * - 工具列表
 */

import { apiClient } from '../client';
import type { ApiResponse } from '../client';

// ============================================================================
// 类型定义
// ============================================================================

/** Agent 执行请求 */
export interface DshAgentExecuteRequest {
  /** 用户查询 */
  query: string;
  /** 会话 ID（可选，用于多轮对话） */
  session_id?: string;
  /** 最大迭代次数（可选） */
  max_iterations?: number;
  /** 可用工具列表（可选，为空表示使用所有工具） */
  available_tools?: string[];
}

/** 执行步骤 */
export interface ExecutionStep {
  /** 步骤编号 */
  step_number: number;
  /** 步骤类型 */
  step_type: string;
  /** 步骤描述 */
  description: string;
  /** 工具名称（如果是工具调用） */
  tool_name?: string;
  /** 工具参数 */
  tool_arguments?: Record<string, unknown>;
  /** 工具结果 */
  tool_result?: Record<string, unknown>;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 耗时（毫秒） */
  duration_ms: number;
}

/** Agent 执行响应 */
export interface DshAgentExecuteResponse {
  /** 会话 ID */
  session_id: string;
  /** 最终答案 */
  answer: string;
  /** 执行步骤 */
  steps: ExecutionStep[];
  /** 使用的工具列表 */
  tools_used: string[];
  /** 总耗时（毫秒） */
  total_duration_ms: number;
  /** 迭代次数 */
  iterations: number;
}

/** 会话信息 */
export interface SessionInfo {
  /** 会话 ID */
  session_id: string;
  /** 消息数量 */
  message_count: number;
  /** 上下文变量 */
  variables: Record<string, string>;
}

/** 工具信息 */
export interface ToolInfo {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 输入参数 schema */
  input_schema: Record<string, unknown>;
}

/** 流式事件类型 */
export type StreamEventType =
  | 'session_start'
  | 'thinking'
  | 'tool_call_start'
  | 'tool_call_progress'
  | 'tool_call_complete'
  | 'content_delta'
  | 'content_complete'
  | 'session_end'
  | 'error';

/** 流式事件数据 */
export interface StreamEventData {
  /** 会话 ID */
  session_id?: string;
  /** 内容增量 */
  delta?: string;
  /** 完整内容 */
  content?: string;
  /** 工具名称 */
  tool_name?: string;
  /** 工具参数 */
  tool_arguments?: Record<string, unknown>;
  /** 工具结果 */
  tool_result?: Record<string, unknown>;
  /** 思考内容 */
  thought?: string;
  /** 错误信息 */
  error?: string;
  /** 进度（0-100） */
  progress?: number;
}

/** 流式事件回调 */
export type StreamEventHandler = (event: StreamEventType, data: StreamEventData) => void;

// ============================================================================
// API 调用
// ============================================================================

export const dshAgentApi = {
  /**
   * 同步执行 Agent
   */
  execute: async (
    data: DshAgentExecuteRequest,
  ): Promise<ApiResponse<DshAgentExecuteResponse>> => {
    return apiClient.ai.post<DshAgentExecuteResponse>('/dsh/agent/execute', data);
  },

  /**
   * 流式执行 Agent（SSE）
   * @param request 请求参数
   * @param onEvent 事件回调函数
   * @returns Promise，在流结束时 resolve
   */
  executeStream: async (
    request: DshAgentExecuteRequest,
    onEvent: StreamEventHandler,
  ): Promise<void> => {
    // 使用相对路径，让浏览器处理 base URL
    const url = '/api/ai/dsh/agent/stream';

    // 使用 fetch API 进行 SSE 连接
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 按行解析 SSE 事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent: StreamEventType = 'content_delta';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim() as StreamEventType;
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim();
          } else if (line === '' && currentData) {
            // 空行表示事件结束
            try {
              const data = JSON.parse(currentData) as StreamEventData;
              onEvent(currentEvent, data);

              // 如果是会话结束或错误，停止读取
              if (currentEvent === 'session_end' || currentEvent === 'error') {
                return;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
            currentEvent = 'content_delta';
            currentData = '';
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  /**
   * 获取会话信息
   */
  getSession: async (sessionId: string): Promise<ApiResponse<SessionInfo | null>> => {
    return apiClient.ai.get<SessionInfo | null>(`/dsh/agent/session/${sessionId}`);
  },

  /**
   * 清除会话
   */
  clearSession: async (sessionId: string): Promise<ApiResponse<boolean>> => {
    return apiClient.ai.delete<boolean>(`/dsh/agent/session/${sessionId}`);
  },

  /**
   * 获取可用工具列表
   */
  listTools: async (): Promise<ApiResponse<ToolInfo[]>> => {
    return apiClient.ai.get<ToolInfo[]>('/dsh/agent/tools');
  },

  /**
   * 获取活跃会话数
   */
  getActiveSessions: async (): Promise<ApiResponse<number>> => {
    return apiClient.ai.get<number>('/dsh/agent/active-sessions');
  },
};
