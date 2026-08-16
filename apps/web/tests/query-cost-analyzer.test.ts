import { describe, it, expect } from 'vitest';
import {
  getCostLevel,
  getCostLevelColor,
  getCostLevelLabel,
  validateQuery,
  analyzeQueryCost,
  estimateResponseSize,
  suggestOptimization,
} from '@/utils/query-cost-analyzer';

describe('utils/query-cost-analyzer - getCostLevel', () => {
  it('score <= 50 → low', () => {
    expect(getCostLevel(0)).toBe('low');
    expect(getCostLevel(50)).toBe('low');
  });
  it('50 < score <= 200 → medium', () => {
    expect(getCostLevel(51)).toBe('medium');
    expect(getCostLevel(200)).toBe('medium');
  });
  it('200 < score <= 500 → high', () => {
    expect(getCostLevel(201)).toBe('high');
    expect(getCostLevel(500)).toBe('high');
  });
  it('score > 500 → critical', () => {
    expect(getCostLevel(501)).toBe('critical');
    expect(getCostLevel(10000)).toBe('critical');
  });
});

describe('utils/query-cost-analyzer - getCostLevelColor & Label', () => {
  it('low → 绿色 "低"', () => {
    expect(getCostLevelColor('low')).toBe('#16a34a');
    expect(getCostLevelLabel('low')).toBe('低');
  });
  it('medium → 橙色 "中"', () => {
    expect(getCostLevelColor('medium')).toBe('#f59e0b');
    expect(getCostLevelLabel('medium')).toBe('中');
  });
  it('high → 橘色 "高"', () => {
    expect(getCostLevelColor('high')).toBe('#f97316');
    expect(getCostLevelLabel('high')).toBe('高');
  });
  it('critical → 红色 "严重"', () => {
    expect(getCostLevelColor('critical')).toBe('#ef4444');
    expect(getCostLevelLabel('critical')).toBe('严重');
  });
});

describe('utils/query-cost-analyzer - validateQuery', () => {
  it('score <= maxScore → valid', () => {
    const r = validateQuery('{ id }', 10000);
    expect(r.valid).toBe(true);
  });
  it('score > maxScore → invalid 含 reason', () => {
    const r = validateQuery('{ id name email status }', 0);
    expect(r.valid).toBe(false);
    expect(typeof r.reason).toBe('string');
    expect(r.reason.length).toBeGreaterThan(0);
  });
});

describe('utils/query-cost-analyzer - analyzeQueryCost 基础解析', () => {
  it('简单查询能解析出 fieldCount >= 1', () => {
    const a = analyzeQueryCost('{ user { id name } }');
    expect(a.fieldCount).toBeGreaterThanOrEqual(1);
    expect(a.depth).toBeGreaterThanOrEqual(1);
    expect(typeof a.score).toBe('number');
    expect(['low', 'medium', 'high', 'critical']).toContain(a.level);
    expect(Array.isArray(a.suggestions)).toBe(true);
  });

  it('空查询/非法查询不会抛错，给出默认值', () => {
    const a = analyzeQueryCost('');
    expect(a.score).toBe(0);
    expect(a.level).toBe('low');
    expect(a.suggestions.length).toBeGreaterThanOrEqual(1);
  });
});

describe('utils/query-cost-analyzer - estimateResponseSize & suggestOptimization', () => {
  it('estimateResponseSize 返回 KB 数字', () => {
    const kb = estimateResponseSize('{ a b c }');
    expect(typeof kb).toBe('number');
    expect(kb).toBeGreaterThanOrEqual(0);
  });

  it('suggestOptimization 返回字符串数组', () => {
    const arr = suggestOptimization('{ id }');
    expect(Array.isArray(arr)).toBe(true);
  });
});
