// AI 相关类型定义

export type AIFeatureType = 'code' | 'text' | 'document' | 'validate' | 'complete';

export interface ValidationIssue {
  field: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  fix?: string;
}

export interface Suggestion {
  field: string;
  value: unknown;
  reason: string;
}

export interface ValidateRequest {
  data: Record<string, unknown>;
  schema?: string;
  context?: {
    module: string;
    entityType: string;
  };
}

export interface ValidateResponse {
  valid: boolean;
  issues: ValidationIssue[];
  suggestions: Suggestion[];
}

export interface CompleteRequest {
  data?: Record<string, unknown>;
  partialData?: Record<string, unknown>;
  fieldsToComplete?: string[];
  context?: {
    module: string;
    entityType: string;
  };
}

export interface CompletionItem {
  value: unknown;
  confidence: number;
  source: 'inference' | 'history' | 'knowledge';
}

export interface CompleteResponse {
  completions: Record<string, CompletionItem>;
}

export interface SummarizeRequest {
  text: string;
  maxLength?: number;
  type?: 'short' | 'medium' | 'detailed';
  context?: Record<string, unknown>;
}

export interface SummarizeResponse {
  summary: string;
  keyPoints: string[];
}

export interface AITemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: Array<{
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'textarea';
    label: string;
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
  promptTemplate: string;
}

export interface CodeGenerateContext {
  entityType: 'department' | 'employee' | 'project' | 'contract';
  name?: string;
  parentId?: string;
  type?: string;
}

export interface TextOptimizeContext {
  textType: 'description' | 'duty' | 'profile' | 'clause';
  name?: string;
  keywords?: string[];
}
