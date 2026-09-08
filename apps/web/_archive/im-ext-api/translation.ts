import apiClient from '../client';
import type { ApiResponse } from '../client';

export type TranslationLanguage =
  | 'auto'
  | 'zh'
  | 'en'
  | 'ja'
  | 'ko'
  | 'fr'
  | 'de'
  | 'es'
  | 'ru'
  | 'pt'
  | 'it'
  | 'ar'
  | 'th'
  | 'vi'
  | 'id';

export type TranslationStatus = 'pending' | 'completed' | 'failed';

export interface Translation {
  id: string;
  message_id: string;
  chat_id: string;
  original_content: string;
  original_language: TranslationLanguage;
  translated_content: string;
  translated_language: TranslationLanguage;
  translator: 'google' | 'deepl' | 'mymemory' | 'custom';
  confidence?: number;
  status: TranslationStatus;
  created_by: string;
  created_at: string;
}

export interface TranslateMessageRequest {
  message_id: string;
  chat_id: string;
  target_language: TranslationLanguage;
  source_language?: TranslationLanguage;
  translator?: 'google' | 'deepl' | 'mymemory' | 'custom';
}

export interface TranslateTextRequest {
  text: string;
  target_language: TranslationLanguage;
  source_language?: TranslationLanguage;
  translator?: 'google' | 'deepl' | 'mymemory' | 'custom';
}

export interface BatchTranslateRequest {
  messages: Array<{
    message_id: string;
    chat_id: string;
    content: string;
  }>;
  target_language: TranslationLanguage;
  source_language?: TranslationLanguage;
}

export interface TranslationPreferences {
  auto_translate: boolean;
  default_language: TranslationLanguage;
  source_languages: TranslationLanguage[];
  excluded_chats: string[];
  show_original: boolean;
}

export interface TranslationStats {
  total_translations: number;
  today_translations: number;
  by_language: Record<string, number>;
  by_translator: Record<string, number>;
}

export const imTranslationApi = {
  translateMessage: async (data: TranslateMessageRequest): Promise<ApiResponse<Translation>> => {
    return apiClient.im.post('/im/translations', data);
  },

  translateText: async (
    data: TranslateTextRequest
  ): Promise<
    ApiResponse<{
      translated_content: string;
      source_language: TranslationLanguage;
      confidence: number;
    }>
  > => {
    return apiClient.im.post('/im/translations/text', data);
  },

  batchTranslate: async (
    data: BatchTranslateRequest
  ): Promise<
    ApiResponse<{
      translations: Translation[];
      failed_count: number;
    }>
  > => {
    return apiClient.im.post('/im/translations/batch', data);
  },

  getTranslation: async (translationId: string): Promise<ApiResponse<Translation>> => {
    return apiClient.im.get(`/im/translations/${translationId}`);
  },

  listMessageTranslations: async (messageId: string): Promise<ApiResponse<Translation[]>> => {
    return apiClient.im.get(`/im/messages/${messageId}/translations`);
  },

  deleteTranslation: async (translationId: string): Promise<ApiResponse<null>> => {
    return apiClient.im.delete(`/im/translations/${translationId}`);
  },

  getTranslationPreferences: async (): Promise<ApiResponse<TranslationPreferences>> => {
    return apiClient.im.get('/im/translation-preferences');
  },

  updateTranslationPreferences: async (
    data: Partial<TranslationPreferences>
  ): Promise<ApiResponse<TranslationPreferences>> => {
    return apiClient.im.put('/im/translation-preferences', data);
  },

  detectLanguage: async (
    text: string
  ): Promise<
    ApiResponse<{
      language: TranslationLanguage;
      confidence: number;
    }>
  > => {
    return apiClient.im.post('/im/translations/detect', { text });
  },

  getAvailableLanguages: async (): Promise<
    ApiResponse<
      Array<{
        code: TranslationLanguage;
        name: string;
        native_name: string;
      }>
    >
  > => {
    return apiClient.im.get('/im/translations/languages');
  },

  getTranslationStats: async (): Promise<ApiResponse<TranslationStats>> => {
    return apiClient.im.get('/im/translations/stats');
  },
};
