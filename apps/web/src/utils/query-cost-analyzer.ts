/**
 * V41.0 Track D: GraphQL 查询成本分析器
 *
 * 功能:
 * - 分析查询复杂度（字段数、嵌套深度、列表大小）
 * - 估算响应大小
 * - 提供优化建议
 * - 成本等级划分（low/medium/high/critical）
 */

import { parseQueryName } from './graphql-performance';

export type CostLevel = 'low' | 'medium' | 'high' | 'critical';

export interface QueryCostAnalysis {
  score: number;
  level: CostLevel;
  fieldCount: number;
  depth: number;
  estimatedSizeKB: number;
  suggestions: string[];
}

interface QueryNode {
  name: string;
  alias?: string;
  args: Record<string, unknown>;
  children: QueryNode[];
  isList: boolean;
  listSize: number;
}

const FIELD_WEIGHT = 1;
const DEPTH_WEIGHT = 10;
const LIST_SIZE_WEIGHT = 0.5;
const AVG_FIELD_SIZE_BYTES = 64;

const COST_THRESHOLDS = {
  low: 50,
  medium: 200,
  high: 500,
  critical: Infinity,
};

const DEFAULT_LIST_SIZE = 20;
const MAX_ESTIMATED_LIST_SIZE = 1000;

function stripComments(query: string): string {
  return query.replace(/#[^\n]*\n/g, '\n');
}

function findMatchingParen(str: string, start: number): number {
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '(') depth++;
    if (str[i] === ')') depth--;
    if (depth === 0) return i;
  }
  return str.length - 1;
}

function parseArgs(argsStr: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const trimmed = argsStr.trim().slice(1, -1).trim();
  if (!trimmed) return args;

  let depth = 0;
  let current = '';
  const parts: string[] = [];

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '{' || char === '[' || char === '(') depth++;
    if (char === '}' || char === ']' || char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex > 0) {
      const key = part.slice(0, colonIndex).trim().replace(/^\$/, '');
      const value = part.slice(colonIndex + 1).trim();
      args[key] = parseValue(value);
    }
  }

  return args;
}

function parseValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  if (/^["'].*["']$/.test(trimmed)) return trimmed.slice(1, -1);
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return parseArgs(trimmed);
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((v) => parseValue(v.trim()));
  }
  return trimmed;
}

function extractListSize(args: Record<string, unknown>): number {
  const sizeKeys = ['first', 'last', 'pageSize', 'page_size', 'limit', 'take'];
  for (const key of sizeKeys) {
    const val = args[key];
    if (typeof val === 'number' && val > 0) {
      return Math.min(val, MAX_ESTIMATED_LIST_SIZE);
    }
  }
  return DEFAULT_LIST_SIZE;
}

function isPluralName(name: string): boolean {
  return name.endsWith('s') || name.endsWith('List') || name.includes('items');
}

function parseSelectionSet(
  query: string,
  start: number,
  variables?: Record<string, unknown>
): { nodes: QueryNode[]; end: number } {
  const nodes: QueryNode[] = [];
  let i = start;
  let currentField = '';
  let inField = false;
  let argsStart = 0;
  let alias: string | undefined;
  let fieldName = '';

  const pushField = () => {
    if (currentField.trim()) {
      const name = fieldName || currentField.trim();
      const isList = isPluralName(name);
      nodes.push({
        name,
        alias,
        args: {},
        children: [],
        isList,
        listSize: isList ? DEFAULT_LIST_SIZE : 0,
      });
    }
    currentField = '';
    alias = undefined;
    fieldName = '';
    inField = false;
  };

  for (; i < query.length; i++) {
    const char = query[i];

    if (char === '}') {
      pushField();
      return { nodes, end: i };
    }

    if (char === '{') {
      pushField();
      const { nodes: children, end } = parseSelectionSet(query, i + 1, variables);
      if (nodes.length > 0) {
        const lastNode = nodes[nodes.length - 1];
        lastNode.children = children;
        if (lastNode.isList) {
          lastNode.listSize = extractListSize(lastNode.args);
        }
      }
      i = end;
      continue;
    }

    if (char === '(') {
      argsStart = i;
      const end = findMatchingParen(query, i);
      const argsStr = query.slice(argsStart, end + 1);
      let args = parseArgs(argsStr);
      args = resolveVariables(args, variables || {});
      if (nodes.length > 0 && inField) {
        nodes[nodes.length - 1].args = args;
        if (nodes[nodes.length - 1].isList) {
          nodes[nodes.length - 1].listSize = extractListSize(args);
        }
      }
      i = end;
      continue;
    }

    if (char === ':' && inField && !alias) {
      alias = currentField.trim();
      currentField = '';
      continue;
    }

    if (char === ',' || char === '\n' || char === '\r' || char === '\t') {
      if (inField) {
        pushField();
      }
      continue;
    }

    if (char === ' ' || char === '\t') {
      if (inField && currentField.trim()) {
        fieldName = fieldName || currentField.trim();
      }
      continue;
    }

    inField = true;
    currentField += char;
    fieldName = fieldName || currentField.trim();
  }

  pushField();
  return { nodes, end: i };
}

function resolveVariables(
  args: Record<string, unknown>,
  variables: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      const varName = value.slice(1);
      resolved[key] = variables[varName] ?? value;
    } else if (typeof value === 'object' && value !== null) {
      resolved[key] = resolveVariables(value as Record<string, unknown>, variables);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function extractRootQuery(query: string): string {
  const trimmed = stripComments(query).trim();
  const operationPattern = /^(query|mutation|subscription)\s+(\w+)?\s*(\([^)]*\))?\s*\{/;
  const match = trimmed.match(operationPattern);

  if (match) {
    const startIndex = trimmed.indexOf('{', match.index || 0);
    return trimmed.slice(startIndex + 1);
  }

  if (trimmed.startsWith('{')) {
    return trimmed.slice(1);
  }

  return trimmed;
}

function parseQuery(query: string, variables?: Record<string, unknown>): QueryNode[] {
  const rootQuery = extractRootQuery(query);
  const { nodes } = parseSelectionSet(rootQuery, 0, variables);
  return nodes;
}

function countFields(nodes: QueryNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.children.length > 0) {
      count += countFields(node.children);
    }
  }
  return count;
}

function calculateDepth(nodes: QueryNode[], currentDepth = 0): number {
  let maxDepth = currentDepth;
  for (const node of nodes) {
    if (node.children.length > 0) {
      const childDepth = calculateDepth(node.children, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    } else {
      maxDepth = Math.max(maxDepth, currentDepth + 1);
    }
  }
  return maxDepth;
}

function calculateListComplexity(nodes: QueryNode[]): number {
  let complexity = 0;
  for (const node of nodes) {
    if (node.isList) {
      const childFields = node.children.length > 0 ? countFields(node.children) : 1;
      complexity += node.listSize * childFields * LIST_SIZE_WEIGHT;
    }
    if (node.children.length > 0) {
      complexity += calculateListComplexity(node.children);
    }
  }
  return complexity;
}

function estimateSize(nodes: QueryNode[]): number {
  let totalBytes = 0;
  for (const node of nodes) {
    const fieldSize = AVG_FIELD_SIZE_BYTES + node.name.length * 2;
    if (node.isList && node.listSize > 0) {
      const childSize = node.children.length > 0 ? estimateSize(node.children) : fieldSize;
      totalBytes += node.listSize * childSize;
    } else if (node.children.length > 0) {
      totalBytes += fieldSize + estimateSize(node.children);
    } else {
      totalBytes += fieldSize;
    }
  }
  return totalBytes;
}

function generateSuggestions(
  nodes: QueryNode[],
  fieldCount: number,
  depth: number,
  score: number
): string[] {
  const suggestions: string[] = [];

  if (depth > 5) {
    suggestions.push(`查询嵌套过深(${depth}层)，建议减少嵌套层级或使用分页`);
  }

  if (fieldCount > 30) {
    suggestions.push(`查询字段过多(${fieldCount}个)，建议按需选择字段`);
  }

  const largeLists: string[] = [];
  function findLargeLists(ns: QueryNode[], path: string) {
    for (const node of ns) {
      const currentPath = path ? `${path}.${node.name}` : node.name;
      if (node.isList && node.listSize > 100) {
        largeLists.push(`${currentPath}(${node.listSize}条)`);
      }
      if (node.children.length > 0) {
        findLargeLists(node.children, currentPath);
      }
    }
  }
  findLargeLists(nodes, '');

  if (largeLists.length > 0) {
    suggestions.push(`大列表查询: ${largeLists.join(', ')}，建议使用分页或游标`);
  }

  if (score > COST_THRESHOLDS.high) {
    suggestions.push('查询成本较高，考虑拆分查询或使用缓存');
  }

  if (suggestions.length === 0 && score <= COST_THRESHOLDS.low) {
    suggestions.push('查询成本正常，无需优化');
  }

  return suggestions;
}

export function analyzeQueryCost(
  query: string,
  variables?: Record<string, unknown>
): QueryCostAnalysis {
  try {
    const nodes = parseQuery(query, variables);
    const fieldCount = countFields(nodes);
    const depth = calculateDepth(nodes);
    const listComplexity = calculateListComplexity(nodes);
    const estimatedSizeBytes = estimateSize(nodes);

    const score = fieldCount * FIELD_WEIGHT + depth * depth * DEPTH_WEIGHT + listComplexity;

    const level = getCostLevel(score);
    const suggestions = generateSuggestions(nodes, fieldCount, depth, score);

    return {
      score: Math.round(score),
      level,
      fieldCount,
      depth,
      estimatedSizeKB: Math.round((estimatedSizeBytes / 1024) * 100) / 100,
      suggestions,
    };
  } catch {
    return {
      score: 0,
      level: 'low',
      fieldCount: 0,
      depth: 0,
      estimatedSizeKB: 0,
      suggestions: ['无法解析查询，跳过成本分析'],
    };
  }
}

export function getCostLevel(score: number): CostLevel {
  if (score <= COST_THRESHOLDS.low) return 'low';
  if (score <= COST_THRESHOLDS.medium) return 'medium';
  if (score <= COST_THRESHOLDS.high) return 'high';
  return 'critical';
}

export function estimateResponseSize(query: string, variables?: Record<string, unknown>): number {
  const analysis = analyzeQueryCost(query, variables);
  return analysis.estimatedSizeKB;
}

export function suggestOptimization(query: string): string[] {
  const analysis = analyzeQueryCost(query);
  return analysis.suggestions;
}

export function validateQuery(
  query: string,
  maxScore: number,
  variables?: Record<string, unknown>
): { valid: boolean; score: number; reason: string } {
  const analysis = analyzeQueryCost(query, variables);
  const valid = analysis.score <= maxScore;
  return {
    valid,
    score: analysis.score,
    reason: valid ? '查询成本在限制范围内' : `查询成本(${analysis.score})超过限制(${maxScore})`,
  };
}

export function getCostLevelColor(level: CostLevel): string {
  const colors: Record<CostLevel, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  return colors[level];
}

export function getCostLevelLabel(level: CostLevel): string {
  const labels: Record<CostLevel, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  };
  return labels[level];
}

export { parseQueryName };
