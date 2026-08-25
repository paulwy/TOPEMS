import i18n from '@/i18n';

/**
 * V53.0 前端 AI 增强 — 智能代码补全
 *
 * 提供上下文感知的代码智能补全能力：
 * - 组件 Props / API 类型提示
 * - 基于项目结构的自动导入建议
 * - TypeScript 类型推断
 * - React Hooks 使用建议
 * - 常用代码片段库
 * - 多语言支持 (TypeScript, CSS, JSON)
 */

enum CompletionKind {
  SNIPPET = 'snippet',
  PROPERTY = 'property',
  FUNCTION = 'function',
  IMPORT = 'import',
  KEYWORD = 'keyword',
  VARIABLE = 'variable',
  TYPE = 'type',
  SNIPPETPLACEHOLDER = 'snippet-placeholder',
}

export interface CompletionContext {
  file: string;
  position: { line: number; character: number };
  trigger_char?: string;
  scope?: string;
  language: 'typescript' | 'css' | 'json';
  content?: string;
  cursor_word?: string;
  imports?: Array<{ path: string; items: string[] }>;
  schema?: Record<string, unknown>;
}

export interface CompletionItem {
  label: string;
  kind: CompletionKind;
  detail?: string;
  insert_text: string;
  sort_order: number;
  documentation?: string;
  deprecated?: boolean;
  preselect?: boolean;
  additional_text?: string;
  filter_text?: string;
  symbol_name?: string;
  symbol_kind?: string;
  text_edit?: {
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    new_text: string;
  };
}

export interface SnippetDefinition {
  id: string;
  label: string;
  description: string;
  language: string;
  kind: CompletionKind;
  template: string;
  placeholders: Array<{ name: string; default_value?: string }>;
  sort_order: number;
  category: 'react' | 'typescript' | 'css' | 'json' | 'testing';
}

export interface ComponentPropInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  default_value?: unknown;
  deprecated?: boolean;
}

export interface APIEndpointInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  request_type?: string;
  response_type?: string;
}
