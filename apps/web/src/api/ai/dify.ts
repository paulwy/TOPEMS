import apiClient from '../client';
import type { ApiResponse } from '../client';
import config from '@/config/runtime';
import type {
  DifyHealthResponse,
  DifyInfoResponse,
  DifyParametersResponse,
  DifyMetaResponse,
  DifyListConversationsParams,
  DifyListConversationsResponse,
  DifyListMessagesParams,
  DifyListMessagesResponse,
  DifyChatRequest,
  DifyChatResponse,
  DifyStreamEvent,
  DifyFeedbackRequest,
  DifyFeedbackResult,
  DifyStopRequest,
  DifyStopResponse,
} from './types';

const buildQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

const getAiBaseUrl = (): string => {
  return config.services.ai || '/api/ai';
};

const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export const difyApi = {
  health: async (): Promise<ApiResponse<DifyHealthResponse>> => {
    return apiClient.ai.get<DifyHealthResponse>('/dify/health');
  },

  info: async (): Promise<ApiResponse<DifyInfoResponse>> => {
    return apiClient.ai.get<DifyInfoResponse>('/dify/info');
  },

  parameters: async (user?: string): Promise<ApiResponse<DifyParametersResponse>> => {
    const qs = buildQueryString({ user });
    return apiClient.ai.get<DifyParametersResponse>(`/dify/parameters${qs}`);
  },

  meta: async (): Promise<ApiResponse<DifyMetaResponse>> => {
    return apiClient.ai.get<DifyMetaResponse>('/dify/meta');
  },

  listConversations: async (
    params: DifyListConversationsParams = {}
  ): Promise<ApiResponse<DifyListConversationsResponse>> => {
    const qs = buildQueryString(params as Record<string, unknown>);
    return apiClient.ai.get<DifyListConversationsResponse>(`/dify/conversations${qs}`);
  },

  listMessages: async (
    params: DifyListMessagesParams
  ): Promise<ApiResponse<DifyListMessagesResponse>> => {
    const { conversation_id, ...rest } = params;
    const qs = buildQueryString(rest as Record<string, unknown>);
    return apiClient.ai.get<DifyListMessagesResponse>(`/dify/messages${qs}`, {
      params: { conversation_id },
    });
  },

  deleteConversation: async (
    conversation_id: string,
    user?: string
  ): Promise<ApiResponse<{ result: string }>> => {
    const qs = buildQueryString({ user });
    return apiClient.ai.delete(`/dify/conversations/${conversation_id}${qs}`);
  },

  chat: async (payload: DifyChatRequest): Promise<ApiResponse<DifyChatResponse>> => {
    const data: DifyChatRequest = {
      ...payload,
      response_mode: 'blocking',
    };
    return apiClient.ai.post<DifyChatResponse>('/dify/chat', data);
  },

  chatStream: async function* (
    payload: DifyChatRequest
  ): AsyncGenerator<DifyStreamEvent, void, unknown> {
    const baseUrl = getAiBaseUrl();
    const url = `${baseUrl}/dify/chat/stream`;
    const token = getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const body: DifyChatRequest = {
      ...payload,
      response_mode: 'streaming',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errText = await response.text();
        if (errText) {
          errorMsg = errText;
        }
      } catch {
        // ignore
      }
      yield {
        event: 'error',
        error: errorMsg,
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield {
        event: 'error',
        error: 'No readable stream available',
      };
      return;
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr) as DifyStreamEvent;
              yield parsed;

              if (parsed.event === 'error' || parsed.event === 'message_end') {
                // Continue processing remaining buffer before exit
              }
            } catch {
              // If not valid JSON, yield as raw message content
              yield {
                event: 'message',
                answer: dataStr,
              };
            }
          }
        }
      }

      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.slice(5).trim();
          if (dataStr && dataStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataStr) as DifyStreamEvent;
              yield parsed;
            } catch {
              yield {
                event: 'message',
                answer: dataStr,
              };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  feedback: async (
    message_id: string,
    rating: 'like' | 'dislike',
    user?: string
  ): Promise<ApiResponse<DifyFeedbackResult>> => {
    const payload: DifyFeedbackRequest = {
      rating,
      user,
    };
    return apiClient.ai.post<DifyFeedbackResult>(
      `/dify/messages/${message_id}/feedbacks`,
      payload
    );
  },

  stop: async (
    message_id: string,
    user?: string
  ): Promise<ApiResponse<DifyStopResponse>> => {
    const payload: DifyStopRequest = {
      user,
    };
    return apiClient.ai.post<DifyStopResponse>(`/dify/messages/${message_id}/stop`, payload);
  },
};

export default difyApi;
