import { describe, it, expect } from 'vitest';
import { toColumnDef, formatDateTimeCell } from '@/schema-dsl';
import { supplierSchema } from '../srm/supplier';

/**
 * SRM 供应商时间列复用统一格式化器的护栏（2026-11-27）
 *
 * 这些列以前自带一份本地 formatDateTimeCell（dayjs + 手写正则裁剪微秒），
 * 输出口径与全局一致但实现重复，容易之后两边漂移。此处锁死它们走共享实现。
 */
const field = supplierSchema.fields.find((f) => f.name === 'created_at')!;
const col = toColumnDef(field)!;
const render = (row: Record<string, unknown>) => col.render!(row, 0);

describe('SRM 供应商 created_at 列', () => {
  it('走共享格式化器，输出 YYYY-MM-DD HH:mm', () => {
    const raw = '2026-10-26T06:03:19.745368Z';
    expect(render({ created_at: raw })).toBe(formatDateTimeCell(raw) || '-');
  });

  it('不再泄漏 ISO 原文', () => {
    const out = String(render({ created_at: '2026-10-26T06:03:19.745368Z' }));
    expect(out).not.toMatch(/T\d{2}:|Z|\.\d/);
  });

  it('空值回落 "-"', () => {
    expect(render({ created_at: null })).toBe('-');
  });
});
