import { describe, it, expect } from 'vitest';
import {
  formatDateCell,
  formatDateTimeCell,
  parseDateValue,
} from '@/schema-dsl/formatDate';
import { toColumnDef } from '@/schema-dsl/types';

/**
 * 日期列统一格式化的护栏（2026-11-27）
 * 口径：日期 YYYY-MM-DD、日期时间 YYYY-MM-DD HH:mm，一律浏览器本地时区。
 * 断言尽量用「动态期望」构造，避免测试依赖运行机器的 TZ 设置。
 */
const pad = (n: number) => String(n).padStart(2, '0');
const local = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

describe('parseDateValue', () => {
  it('空值返回 null', () => {
    expect(parseDateValue(null)).toBeNull();
    expect(parseDateValue(undefined)).toBeNull();
    expect(parseDateValue('')).toBeNull();
  });

  it('纯日期按本地日历日，不做时区偏移', () => {
    const d = parseDateValue('2026-11-20')!;
    expect(local(d)).toBe('2026-11-20');
    expect(d.getHours()).toBe(0);
  });

  it('后端 sqlx 的 "-3 01:00:00+00" 风格可解析并落在本地时区', () => {
    const d = parseDateValue('2026-11-20 01:00:00+00')!;
    // 01:00 UTC 在本地时区不可能是 UTC 的同一时刻字符串，但必须是个真实时刻
    expect(d.getTime()).toBe(Date.UTC(2026, 10, 20, 1, 0, 0));
  });

  it('RFC3339 带 6 位微秒 + Z 可解析', () => {
    const d = parseDateValue('2026-10-26T06:03:19.745368Z')!;
    expect(d.getTime()).toBe(Date.UTC(2026, 9, 26, 6, 3, 19, 745));
  });

  it('非法字符串返回 null 而不是 Invalid Date', () => {
    expect(parseDateValue('not-a-date')).toBeNull();
  });
});

describe('格式化输出', () => {
  it('日期输出 YYYY-MM-DD', () => {
    expect(formatDateCell('2026-11-20')).toBe('2026-11-20');
  });

  it('日期时间输出 YYYY-MM-DD HH:mm（本地时区）', () => {
    const iso = '2026-10-26T06:03:19.745368Z';
    const d = new Date(iso);
    const expected = `${local(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    expect(formatDateTimeCell(iso)).toBe(expected);
    // 不再出现秒、毫秒、时区后缀
    expect(formatDateTimeCell(iso)).not.toMatch(/Z|T|\+|:\d{2}:\d{2}/);
  });

  it('空值与非法值输出空串', () => {
    expect(formatDateCell(null)).toBe('');
    expect(formatDateTimeCell('oops')).toBe('');
  });
});

describe('toColumnDef 默认日期渲染', () => {
  it('datetime 列未写 renderCell 时套用统一格式', () => {
    const col = toColumnDef({
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
    } as never)!;
    const d = new Date('2026-10-26T06:03:19.745368Z');
    const out = (col.render as (row: Record<string, unknown>) => unknown)({
      created_at: '2026-10-26T06:03:19.745368Z',
    });
    expect(out).toBe(`${local(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
  });

  it('date 列空值统一回退 "-"', () => {
    const col = toColumnDef({ name: 'd', label: '日期', type: 'date' } as never)!;
    expect((col.render as (row: Record<string, unknown>) => unknown)({ d: null })).toBe('-');
  });

  it('已有 renderCell 的列不被默认格式化覆盖', () => {
    const col = toColumnDef({
      name: 'd',
      label: '日期',
      type: 'date',
      renderCell: (row: Record<string, unknown>, _index: number) => `custom:${row.d}`,
    } as never)!;
    expect((col.render as (row: Record<string, unknown>) => unknown)({ d: '2026-11-20' })).toBe(
      'custom:2026-11-20'
    );
  });
});
