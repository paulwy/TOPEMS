/**
 * formSchemas — Zod Schema 工厂函数测试
 *
 * 测试项目中常用的 Zod schema 验证模式（字段名、编码、电话、金额等）。
 * 这些 schema 模式广泛用于 HrmEmployeeCreatePage、FinanceBudgetPage 等页面。
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Schema factories (mirrors patterns found in the project) ──────────────

/** 字段名称: 1-100 字符 */
function fieldName(label = '名称') {
  return z.string().min(1, `${label}不能为空`).max(100, `${label}不能超过100个字符`);
}

/** 字段编码: 2-50 字符, 仅字母数字下划线 */
function fieldCode(label = '编码') {
  return z
    .string()
    .min(2, `${label}至少2个字符`)
    .max(50, `${label}不能超过50个字符`)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, `${label}必须以字母开头，仅允许字母、数字和下划线`);
}

/** 手机号: 中国大陆格式 */
function fieldPhone(label = '手机号') {
  return z
    .string()
    .regex(/^1[3-9]\d{9}$/, `${label}格式不正确`)
    .or(z.literal(''));
}

/** 金额: 非负数字 */
function fieldAmount(label = '金额') {
  return z.number({ invalid_type_error: `${label}必须为数字` }).min(0, `${label}不能为负数`);
}

/** 基础实体 Schema 组合 */
function baseEntitySchema() {
  return z.object({
    name: fieldName('名称'),
    code: fieldCode('编码'),
    description: z.string().optional(),
    amount: fieldAmount('金额').optional(),
    phone: fieldPhone('手机号').optional(),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('fieldName schema', () => {
  const schema = fieldName('测试名称');

  it('accepts valid non-empty strings', () => {
    expect(schema.safeParse('hello').success).toBe(true);
    expect(schema.safeParse('a'.repeat(100)).success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toBeDefined();
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0].message).toContain('测试名称不能为空');
    }
  });

  it('rejects strings over 100 characters', () => {
    const result = schema.safeParse('a'.repeat(101));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toBeDefined();
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0].message).toContain('不能超过100个字符');
    }
  });
});

describe('fieldCode schema', () => {
  const schema = fieldCode('编码');

  it('accepts valid codes', () => {
    expect(schema.safeParse('abc').success).toBe(true);
    expect(schema.safeParse('A1_b2').success).toBe(true);
    expect(schema.safeParse('my_module_01').success).toBe(true);
  });

  it('rejects codes starting with number', () => {
    const result = schema.safeParse('1abc');
    expect(result.success).toBe(false);
  });

  it('rejects codes with special characters', () => {
    const result = schema.safeParse('my-code');
    expect(result.success).toBe(false);
  });

  it('rejects single character code', () => {
    const result = schema.safeParse('a');
    expect(result.success).toBe(false);
  });
});

describe('fieldPhone schema', () => {
  const schema = fieldPhone();

  it('accepts valid Chinese phone numbers', () => {
    expect(schema.safeParse('13800138000').success).toBe(true);
    expect(schema.safeParse('19999999999').success).toBe(true);
    expect(schema.safeParse('').success).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(schema.safeParse('12345678901').success).toBe(false); // starts with 1 but invalid prefix
    expect(schema.safeParse('12345').success).toBe(false); // too short
    expect(schema.safeParse('abc').success).toBe(false); // non-numeric
  });
});

describe('fieldAmount schema', () => {
  const schema = fieldAmount('金额');

  it('accepts non-negative numbers', () => {
    expect(schema.safeParse(0).success).toBe(true);
    expect(schema.safeParse(100.5).success).toBe(true);
  });

  it('rejects negative numbers', () => {
    const result = schema.safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toBeDefined();
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0].message).toContain('不能为负数');
    }
  });
});

describe('baseEntitySchema', () => {
  const schema = baseEntitySchema();

  it('validates a complete entity', () => {
    const result = schema.safeParse({
      name: 'Test Entity',
      code: 'test_entity',
      description: 'A test',
      amount: 100,
      phone: '13800138000',
    });
    expect(result.success).toBe(true);
  });

  it('requires name and code', () => {
    const result = schema.safeParse({ description: 'only desc' });
    expect(result.success).toBe(false);
  });

  it('allows optional fields to be omitted', () => {
    const result = schema.safeParse({
      name: 'Minimal',
      code: 'minimal',
    });
    expect(result.success).toBe(true);
  });
});
