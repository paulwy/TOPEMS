/**
 * 业务 Copilot Hook
 *
 * 提供业务 Copilot 的状态管理和操作，包括：
 * - 会话管理
 * - 消息发送与接收
 * - 意图识别
 * - 业务模块配置
 */

import { useState, useCallback } from 'react';
import {
  createSession,
  getSession,
  deleteSession,
  sendMessage,
  recognizeIntent,
  getModuleConfig,
  getAllModuleConfigs,
  searchFAQ,
  type CopilotSession,
  type SendMessageRequest,
  type CopilotResponse,
  type BusinessModuleType,
  type IntentRecognitionResult,
  type BusinessModuleConfig,
  type FAQItem,
  type ConversationMessage,
  type SelectedRecord,
} from '@/api/ai/businessCopilot';

// ============================================================================
// Hook 状态
// ============================================================================

interface UseBusinessCopilotState {
  /** 是否加载中 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 当前会话 */
  session: CopilotSession | null;
  /** 消息列表 */
  messages: ConversationMessage[];
  /** 最后一次响应 */
  lastResponse: CopilotResponse | null;
  /** 是否正在发送消息 */
  isSending: boolean;
  /** 当前业务模块 */
  currentModule: BusinessModuleType;
  /** 模块配置 */
  moduleConfig: BusinessModuleConfig | null;
  /** 所有模块配置 */
  allModuleConfigs: BusinessModuleConfig[];
  /** 意图识别结果 */
  intentResult: IntentRecognitionResult | null;
  /** FAQ 搜索结果 */
  faqResults: FAQItem[];
  /** 选中的记录 */
  selectedRecords: SelectedRecord[];
}

// ============================================================================
// Hook 返回值
// ============================================================================

interface UseBusinessCopilotReturn extends UseBusinessCopilotState {
  /** 创建会话 */
  createNewSession: (module: BusinessModuleType) => Promise<CopilotSession | null>;
  /** 发送消息 */
  send: (
    user_input: string,
    options?: Partial<SendMessageRequest>
  ) => Promise<CopilotResponse | null>;
  /** 识别意图 */
  recognize: (text: string) => Promise<IntentRecognitionResult | null>;
  /** 切换模块 */
  switchModule: (module: BusinessModuleType) => Promise<void>;
  /** 加载模块配置 */
  loadModuleConfig: (module: BusinessModuleType) => Promise<BusinessModuleConfig | null>;
  /** 加载所有模块配置 */
  loadAllModuleConfigs: () => Promise<BusinessModuleConfig[]>;
  /** 搜索 FAQ */
  searchFaq: (query: string) => Promise<FAQItem[]>;
  /** 更新选中记录 */
  updateRecords: (records: SelectedRecord[]) => void;
  /** 清除会话 */
  clearSession: () => Promise<boolean>;
  /** 清除错误 */
  clearError: () => void;
  /** 重置状态 */
  reset: () => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useBusinessCopilot(
  initialModule: BusinessModuleType = 'general'
): UseBusinessCopilotReturn {
  const [state, setState] = useState<UseBusinessCopilotState>({
    isLoading: false,
    error: null,
    session: null,
    messages: [],
    lastResponse: null,
    isSending: false,
    currentModule: initialModule,
    moduleConfig: null,
    allModuleConfigs: [],
    intentResult: null,
    faqResults: [],
    selectedRecords: [],
  });

  /** 创建会话 */
  const createNewSession = useCallback(async (module: BusinessModuleType) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const response = await createSession(module);
      if (response.data) {
        setState((s) => ({
          ...s,
          session: response.data!,
          messages: [],
          currentModule: module,
          isLoading: false,
        }));
        return response.data;
      }
      throw new Error('Failed to create session');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((s) => ({ ...s, error: message, isLoading: false }));
      return null;
    }
  }, []);

  /** 发送消息 */
  const send = useCallback(
    async (user_input: string, options?: Partial<SendMessageRequest>) => {
      setState((s) => ({ ...s, isSending: true, error: null }));
      try {
        const sessionId = state.session?.session_id;
        if (!sessionId) {
          throw new Error('No active session');
        }

        const request: SendMessageRequest = {
          module: state.currentModule,
          session_id: sessionId,
          user_input,
          ...options,
        };

        const response = await sendMessage(request);
        if (response.data) {
          // 添加用户消息
          const userMessage: ConversationMessage = {
            message_id: `msg_${Date.now()}_user`,
            role: 'user',
            content: user_input,
            timestamp: new Date().toISOString(),
          };

          // 添加助手消息
          const assistantMessage: ConversationMessage = {
            message_id: `msg_${Date.now()}_assistant`,
            role: 'assistant',
            content: response.data.reply,
            timestamp: new Date().toISOString(),
            tool_calls: response.data.tool_calls,
          };

          setState((s) => ({
            ...s,
            messages: [...s.messages, userMessage, assistantMessage],
            lastResponse: response.data!,
            isSending: false,
          }));
          return response.data;
        }
        throw new Error('Failed to send message');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setState((s) => ({ ...s, error: message, isSending: false }));
        return null;
      }
    },
    [state.session, state.currentModule]
  );

  /** 识别意图 */
  const recognize = useCallback(
    async (text: string) => {
      try {
        const response = await recognizeIntent(text, state.currentModule);
        if (response.data) {
          setState((s) => ({ ...s, intentResult: response.data! }));
          return response.data;
        }
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setState((s) => ({ ...s, error: message }));
        return null;
      }
    },
    [state.currentModule]
  );

  /** 切换模块 */
  const switchModule = useCallback(
    async (module: BusinessModuleType) => {
      setState((s) => ({ ...s, currentModule: module, session: null, messages: [] }));
      await createNewSession(module);
    },
    [createNewSession]
  );

  /** 加载模块配置 */
  const loadModuleConfig = useCallback(async (module: BusinessModuleType) => {
    try {
      const response = await getModuleConfig(module);
      if (response.data) {
        setState((s) => ({ ...s, moduleConfig: response.data! }));
        return response.data;
      }
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((s) => ({ ...s, error: message }));
      return null;
    }
  }, []);

  /** 加载所有模块配置 */
  const loadAllModuleConfigs = useCallback(async () => {
    try {
      const response = await getAllModuleConfigs();
      if (response.data) {
        setState((s) => ({ ...s, allModuleConfigs: response.data! }));
        return response.data;
      }
      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((s) => ({ ...s, error: message }));
      return [];
    }
  }, []);

  /** 搜索 FAQ */
  const searchFaq = useCallback(
    async (query: string) => {
      try {
        const response = await searchFAQ(state.currentModule, query);
        if (response.data) {
          setState((s) => ({ ...s, faqResults: response.data! }));
          return response.data;
        }
        return [];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setState((s) => ({ ...s, error: message }));
        return [];
      }
    },
    [state.currentModule]
  );

  /** 更新选中记录 */
  const updateRecords = useCallback((records: SelectedRecord[]) => {
    setState((s) => ({ ...s, selectedRecords: records }));
  }, []);

  /** 清除会话 */
  const clearSession = useCallback(async () => {
    if (!state.session) return true;
    try {
      await deleteSession(state.session.session_id);
      setState((s) => ({ ...s, session: null, messages: [], lastResponse: null }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((s) => ({ ...s, error: message }));
      return false;
    }
  }, [state.session]);

  /** 清除错误 */
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  /** 重置状态 */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      session: null,
      messages: [],
      lastResponse: null,
      isSending: false,
      currentModule: initialModule,
      moduleConfig: null,
      allModuleConfigs: [],
      intentResult: null,
      faqResults: [],
      selectedRecords: [],
    });
  }, [initialModule]);

  return {
    ...state,
    createNewSession,
    send,
    recognize,
    switchModule,
    loadModuleConfig,
    loadAllModuleConfigs,
    searchFaq,
    updateRecords,
    clearSession,
    clearError,
    reset,
  };
}

export default useBusinessCopilot;
