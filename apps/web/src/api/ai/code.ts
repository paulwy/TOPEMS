import apiClient from '../client';
import type { ApiResponse } from '../client';

export const codeApi = {
  generateCode: async (data: {
    prompt: string;
    language?: string;
    framework?: string;
    context?: string;
  }): Promise<
    ApiResponse<{
      code: string;
      language: string;
      explanation: string;
    }>
  > => {
    return apiClient.ai.post('/code/generate', data);
  },

  explainCode: async (data: {
    code: string;
    language?: string;
  }): Promise<
    ApiResponse<{
      explanation: string;
      summary: string;
      key_points: string[];
    }>
  > => {
    return apiClient.ai.post('/code/explain', data);
  },

  fixCodeBug: async (data: {
    code: string;
    error_message?: string;
    language?: string;
  }): Promise<
    ApiResponse<{
      fixed_code: string;
      explanation: string;
      bug_description: string;
    }>
  > => {
    return apiClient.ai.post('/code/fix', data);
  },

  optimizeCode: async (data: {
    code: string;
    optimization_type?: 'performance' | 'readability' | 'security';
    language?: string;
  }): Promise<
    ApiResponse<{
      optimized_code: string;
      explanation: string;
      improvements: string[];
    }>
  > => {
    return apiClient.ai.post('/code/optimize', data);
  },

  reviewCode: async (data: {
    code: string;
    language?: string;
    standards?: string[];
  }): Promise<
    ApiResponse<{
      issues: Array<{
        severity: 'critical' | 'warning' | 'info';
        line?: number;
        description: string;
        suggestion: string;
      }>;
      summary: string;
      score: number;
    }>
  > => {
    return apiClient.ai.post('/code/review', data);
  },
};
