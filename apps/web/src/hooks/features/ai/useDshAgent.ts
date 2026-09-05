/**
 * DSH Agent Hook
 *
 * 提供 DSH Agent 的状态管理和操作，包括：
 * - 执行 Agent
 * - 流式执行
 * - 会话管理
 * - 工具列表
 */

import { useState, useCallback, useRef } from 'react';
import i18n from '@/i18n';
import {
  dshAgentApi,
  type DshAgentExecuteRequest,
  type DshAgentExecuteResponse,
  type SessionInfo,
  type ToolInfo,
  type StreamEventHandler,
} from '@/api/ai/dshAgent';

// ============================================================================
// Hook 状态
// ============================================================================

interface UseDshAgentState {
  /** 是否加载中 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 当前会话 ID */
  sessionId: string | undefined;
  /** 最后一次响应 */
  lastResponse: DshAgentExecuteResponse | null;
  /** 流式内容（累积） */
  streamingContent: string;
  /** 是否正在流式输出 */
  isStreaming: boolean;
  /** 可用工具列表 */
  tools: ToolInfo[];
  /** 会话信息 */
  sessionInfo: SessionInfo | null;
}

// ============================================================================
// Hook 返回值
// ============================================================================

interface UseDshAgentReturn extends UseDshAgentState {
  /** 同步执行 Agent */
  execute: (request: DshAgentExecuteRequest) => Promise<DshAgentExecuteResponse | null>;
  /** 流式执行 Agent */
  executeStream: (request: DshAgentExecuteRequest, onEvent?: StreamEventHandler) => Promise<void>;
  /** 清除会话 */
  clearSession: () => Promise<boolean>;
  /** 刷新会话信息 */
  refreshSessionInfo: () => Promise<void>;
  /** 加载工具列表 */
  loadTools: () => Promise<void>;
  /** 重置状态 */
  reset: () => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useDshAgent(initialSessionId?: string): UseDshAgentReturn {
  // 状态
  const [state, setState] = useState<UseDshAgentState>({
    isLoading: false,
    error: null,
    sessionId: initialSessionId,
    lastResponse: null,
    streamingContent: '',
    isStreaming: false,
    tools: [],
    sessionInfo: null,
  });

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);

  // 更新状态（部分更新）
  const updateState = useCallback((updates: Partial<UseDshAgentState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // 同步执行 Agent
  const execute = useCallback(
    async (request: DshAgentExecuteRequest): Promise<DshAgentExecuteResponse | null> => {
      updateState({ isLoading: true, error: null });

      try {
        const response = await dshAgentApi.execute(request);

        if (response.code === 0 && response.data) {
          updateState({
            isLoading: false,
            lastResponse: response.data,
            sessionId: response.data.session_id,
          });
          return response.data;
        } else {
          throw new Error(response.message || i18n.t('ai.use_dsh_agent.execute_failed'));
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : i18n.t('ai.use_dsh_agent.unknown_error');
        updateState({ isLoading: false, error: errorMessage });
        return null;
      }
    },
    [updateState]
  );

  // 流式执行 Agent
  const executeStream = useCallback(
    async (request: DshAgentExecuteRequest, onEvent?: StreamEventHandler): Promise<void> => {
      updateState({ isLoading: true, isStreaming: true, error: null, streamingContent: '' });

      // 创建 AbortController
      abortControllerRef.current = new AbortController();

      try {
        await dshAgentApi.executeStream(request, (event, data) => {
          // 调用用户回调
          onEvent?.(event, data);

          // 更新内部状态
          switch (event) {
            case 'content_delta':
              setState((prev) => ({
                ...prev,
                streamingContent: prev.streamingContent + (data.delta || ''),
              }));
              break;
            case 'content_complete':
              updateState({
                streamingContent: data.content || '',
                isStreaming: false,
              });
              break;
            case 'session_start':
              if (data.session_id) {
                updateState({ sessionId: data.session_id });
              }
              break;
            case 'session_end':
              updateState({ isStreaming: false, isLoading: false });
              break;
            case 'error':
              updateState({
                error: data.error || i18n.t('ai.use_dsh_agent.unknown_error'),
                isStreaming: false,
                isLoading: false,
              });
              break;
          }
        });

        updateState({ isLoading: false, isStreaming: false });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : i18n.t('ai.use_dsh_agent.unknown_error');
        updateState({ isLoading: false, isStreaming: false, error: errorMessage });
        throw err;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [updateState]
  );

  // 清除会话
  const clearSession = useCallback(async (): Promise<boolean> => {
    if (!state.sessionId) return true;

    try {
      const response = await dshAgentApi.clearSession(state.sessionId);
      if (response.code === 0) {
        updateState({
          sessionId: undefined,
          sessionInfo: null,
          lastResponse: null,
          streamingContent: '',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('清除会话失败:', err);
      return false;
    }
  }, [state.sessionId, updateState]);

  // 刷新会话信息
  const refreshSessionInfo = useCallback(async (): Promise<void> => {
    if (!state.sessionId) return;

    try {
      const response = await dshAgentApi.getSession(state.sessionId);
      if (response.code === 0 && response.data) {
        updateState({ sessionInfo: response.data });
      }
    } catch (err) {
      console.error('获取会话信息失败:', err);
    }
  }, [state.sessionId, updateState]);

  // 加载工具列表
  const loadTools = useCallback(async (): Promise<void> => {
    try {
      const response = await dshAgentApi.listTools();
      if (response.code === 0 && response.data) {
        updateState({ tools: response.data });
      }
    } catch (err) {
      console.error('加载工具列表失败:', err);
    }
  }, [updateState]);

  // 重置状态
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({
      isLoading: false,
      error: null,
      sessionId: undefined,
      lastResponse: null,
      streamingContent: '',
      isStreaming: false,
      tools: [],
      sessionInfo: null,
    });
  }, []);

  return {
    ...state,
    execute,
    executeStream,
    clearSession,
    refreshSessionInfo,
    loadTools,
    reset,
  };
}

export default useDshAgent;
