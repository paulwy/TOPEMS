import { describe, it, expect } from 'vitest';
import {
  FIELD_MAPPING,
  SEMANTIC_MAPPING,
  FULL_MAPPING,
  adapt,
  adaptReverse,
  snakeToCamel,
  camelToSnake,
} from '../openapi-adapter';

// ============================================================================
// V71.5 A3 类型适配层单元测试
// 验收标准：覆盖 ≥ 24 冲突字段；adapt/adaptReverse 双向转换正确
// ============================================================================

describe('FIELD_MAPPING 白名单字典', () => {
  it('应包含 ≥ 24 条映射（验收标准）', () => {
    expect(Object.keys(FIELD_MAPPING).length).toBeGreaterThanOrEqual(24);
  });

  it('每条映射 key 为 snake_case，value 为 camelCase', () => {
    for (const [snake, camel] of Object.entries(FIELD_MAPPING)) {
      expect(snake).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(camel).toMatch(/^[a-z][a-zA-Z0-9]*$/);
      expect(snake).not.toEqual(camel);
    }
  });

  // 逐条验证 24 个核心冲突字段（A 类直接冲突）
  const expectedMappings: Record<string, string> = {
    // 时间戳类
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    approved_at: 'approvedAt',
    submitted_at: 'submittedAt',
    posted_at: 'postedAt',
    closed_at: 'closedAt',
    completed_at: 'completedAt',
    payment_date: 'paymentDate',
    start_date: 'startDate',
    end_date: 'endDate',
    // 布尔标志类
    is_active: 'isActive',
    is_enabled: 'isEnabled',
    is_cash_flow: 'isCashFlow',
    is_reversed: 'isReversed',
    // 外键 ID 类
    parent_id: 'parentId',
    user_id: 'userId',
    account_id: 'accountId',
    department_id: 'departmentId',
    customer_id: 'customerId',
    supplier_id: 'supplierId',
    project_id: 'projectId',
    // 编码/名称类
    account_code: 'accountCode',
    voucher_no: 'voucherNo',
    voucher_date: 'voucherDate',
    voucher_type: 'voucherType',
    // 金额类
    total_amount: 'totalAmount',
    total_debit: 'totalDebit',
  };

  it('24+ 核心冲突字段逐条验证', () => {
    for (const [snake, camel] of Object.entries(expectedMappings)) {
      expect(FIELD_MAPPING[snake as keyof typeof FIELD_MAPPING]).toBe(camel);
    }
  });
});

describe('SEMANTIC_MAPPING 语义重命名', () => {
  it('account_type → category（枚举值一致，字段名不同）', () => {
    expect(SEMANTIC_MAPPING.account_type).toBe('category');
  });

  it('is_enabled → isactive（finance.ts 手写用 lowercase concat）', () => {
    expect(SEMANTIC_MAPPING.is_enabled).toBe('isactive');
  });
});

describe('FULL_MAPPING 合并映射', () => {
  it('应包含 FIELD_MAPPING 中未被 SEMANTIC_MAPPING 覆盖的条目', () => {
    for (const [key, value] of Object.entries(FIELD_MAPPING)) {
      // SEMANTIC_MAPPING 中的同名 key 会覆盖 FIELD_MAPPING 的值
      if (!(key in SEMANTIC_MAPPING)) {
        expect(FULL_MAPPING[key as keyof typeof FULL_MAPPING]).toBe(value);
      }
    }
  });

  it('应包含 SEMANTIC_MAPPING 的所有条目', () => {
    for (const [key, value] of Object.entries(SEMANTIC_MAPPING)) {
      expect(FULL_MAPPING[key as keyof typeof FULL_MAPPING]).toBe(value);
    }
  });

  it('SEMANTIC_MAPPING 的 is_enabled 应覆盖 FIELD_MAPPING 的 is_enabled', () => {
    // FIELD_MAPPING: is_enabled → isEnabled
    // SEMANTIC_MAPPING: is_enabled → isactive
    // FULL_MAPPING 应取 SEMANTIC_MAPPING 的值
    expect(FULL_MAPPING.is_enabled).toBe('isactive');
  });
});

describe('adapt() 蛇形 → 驼峰 转换', () => {
  it('应正确转换已知蛇形字段为驼峰', () => {
    const input = {
      created_at: '2026-08-09',
      updated_at: '2026-08-09',
      is_active: true,
      parent_id: 'uuid-123',
      account_code: '1001',
    };
    const result = adapt(input);
    expect(result).toEqual({
      createdAt: '2026-08-09',
      updatedAt: '2026-08-09',
      isActive: true,
      parentId: 'uuid-123',
      accountCode: '1001',
    });
  });

  it('应保留不在映射中的字段不变', () => {
    const input = {
      id: 'uuid-123',
      name: 'Test Account',
      level: 3,
      created_at: '2026-08-09',
    };
    const result = adapt(input);
    expect(result).toEqual({
      id: 'uuid-123',
      name: 'Test Account',
      level: 3,
      createdAt: '2026-08-09',
    });
  });

  it('应处理空对象', () => {
    expect(adapt({})).toEqual({});
  });

  it('应处理全字段为驼峰（无蛇形字段）的对象', () => {
    const input = { alreadyCamel: true, noChange: 'hello' };
    expect(adapt(input)).toEqual({ alreadyCamel: true, noChange: 'hello' });
  });

  it('应支持自定义映射字典', () => {
    const input = { custom_field: 'value' };
    const customMapping = { custom_field: 'customField' };
    expect(adapt(input, customMapping)).toEqual({ customField: 'value' });
  });
});

describe('adaptReverse() 驼峰 → 蛇形 转换', () => {
  it('应正确转换已知驼峰字段为蛇形', () => {
    const input = {
      createdAt: '2026-08-09',
      isActive: true,
      parentId: 'uuid-123',
      accountCode: '1001',
    };
    const result = adaptReverse(input);
    expect(result).toEqual({
      created_at: '2026-08-09',
      is_active: true,
      parent_id: 'uuid-123',
      account_code: '1001',
    });
  });

  it('应保留不在映射中的字段不变', () => {
    const input = {
      id: 'uuid-123',
      name: 'Test',
      createdAt: '2026-08-09',
    };
    const result = adaptReverse(input);
    expect(result).toEqual({
      id: 'uuid-123',
      name: 'Test',
      created_at: '2026-08-09',
    });
  });

  it('应处理空对象', () => {
    expect(adaptReverse({})).toEqual({});
  });

  it('adapt → adaptReverse 应为恒等变换（已知字段）', () => {
    const original = {
      created_at: '2026-08-09',
      is_active: true,
      parent_id: 'uuid-123',
      account_code: '1001',
      name: 'Test',
    };
    const adapted = adapt(original);
    const reversed = adaptReverse(adapted as Record<string, unknown>);
    expect(reversed).toEqual(original);
  });
});

describe('snakeToCamel() 通用转换', () => {
  it('应正确转换 snake_case 为 camelCase', () => {
    expect(snakeToCamel('created_at')).toBe('createdAt');
    expect(snakeToCamel('is_active')).toBe('isActive');
    expect(snakeToCamel('parent_id')).toBe('parentId');
    expect(snakeToCamel('account_type')).toBe('accountType');
  });

  it('应保留无下划线的字符串不变', () => {
    expect(snakeToCamel('name')).toBe('name');
    expect(snakeToCamel('id')).toBe('id');
  });

  it('应处理多段下划线', () => {
    expect(snakeToCamel('total_cost_cents')).toBe('totalCostCents');
    expect(snakeToCamel('bank_account_no')).toBe('bankAccountNo');
  });
});

describe('camelToSnake() 通用转换', () => {
  it('应正确转换 camelCase 为 snake_case', () => {
    expect(camelToSnake('createdAt')).toBe('created_at');
    expect(camelToSnake('isActive')).toBe('is_active');
    expect(camelToSnake('parentId')).toBe('parent_id');
    expect(camelToSnake('accountType')).toBe('account_type');
  });

  it('应保留无大写的字符串不变', () => {
    expect(camelToSnake('name')).toBe('name');
    expect(camelToSnake('id')).toBe('id');
  });

  it('应处理多段大写', () => {
    expect(camelToSnake('totalCostCents')).toBe('total_cost_cents');
    expect(camelToSnake('bankAccountNo')).toBe('bank_account_no');
  });

  it('snakeToCamel → camelToSnake 应为恒等变换', () => {
    const testCases = ['created_at', 'is_active', 'parent_id', 'total_cost_cents'];
    for (const tc of testCases) {
      expect(camelToSnake(snakeToCamel(tc))).toBe(tc);
    }
  });
});

describe('24 冲突字段端到端验证（模拟后端 → 前端适配）', () => {
  // 模拟后端返回的 Account 蛇形数据
  const mockApiAccount = {
    id: 'uuid-001',
    code: '1001',
    name: '现金',
    account_type: 'asset',
    balance_direction: 'debit',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-09T00:00:00Z',
    created_by: 'admin',
    updated_by: 'admin',
    is_enabled: true,
    is_cash_flow: false,
    is_detail: true,
    parent_id: 'uuid-000',
    parent_code: '1000',
    tenant_id: 'tenant-001',
    level: 2,
  };

  it('adapt() 应将 14 个蛇形字段全部转为驼峰', () => {
    const result = adapt(mockApiAccount);
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
    expect(result).toHaveProperty('createdBy');
    expect(result).toHaveProperty('updatedBy');
    expect(result).toHaveProperty('isEnabled');
    expect(result).toHaveProperty('isCashFlow');
    expect(result).toHaveProperty('isDetail');
    expect(result).toHaveProperty('parentId');
    expect(result).toHaveProperty('parentCode');
    expect(result).toHaveProperty('tenantId');
    expect(result).toHaveProperty('accountType');
    expect(result).toHaveProperty('balanceDirection');
    // 原始蛇形字段不应存在
    expect(result).not.toHaveProperty('created_at');
    expect(result).not.toHaveProperty('is_enabled');
    expect(result).not.toHaveProperty('parent_id');
  });

  it('adaptReverse() 应将驼峰字段全部转回蛇形', () => {
    const adapted = adapt(mockApiAccount);
    const reversed = adaptReverse(adapted as Record<string, unknown>);
    expect(reversed).toEqual(mockApiAccount);
  });
});
