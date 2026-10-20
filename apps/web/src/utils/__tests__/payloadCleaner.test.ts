import { describe, it, expect } from 'vitest';
import {
  cleanEmptyOptionalFields,
  isForeignKeyField,
  isDateTimeField,
  isValidUuid,
} from '@/utils/payloadCleaner';

describe('cleanEmptyOptionalFields', () => {
  it('drops empty-string foreign key fields (snake_case)', () => {
    const cleaned = cleanEmptyOptionalFields({
      name: '仓库A',
      warehouse_id: '',
      location_id: '  ',
      status: 'active',
    });
    expect(cleaned).toEqual({ name: '仓库A', status: 'active' });
    expect('warehouse_id' in cleaned).toBe(false);
    expect('location_id' in cleaned).toBe(false);
  });

  it('drops empty-string foreign key fields (camelCase)', () => {
    const cleaned = cleanEmptyOptionalFields({
      title: '工单',
      assigneeId: '',
      projectId: '9e6f0c4a-1111-2222-3333-444444444444',
    });
    expect(cleaned).toEqual({
      title: '工单',
      projectId: '9e6f0c4a-1111-2222-3333-444444444444',
    });
    expect('assigneeId' in cleaned).toBe(false);
  });

  it('drops empty-string date/time fields', () => {
    const cleaned = cleanEmptyOptionalFields({
      title: '入库单',
      expected_date: '',
      created_at: '',
      dueTime: '2026-10-20T00:00:00Z',
    });
    expect(cleaned).toEqual({
      title: '入库单',
      dueTime: '2026-10-20T00:00:00Z',
    });
  });

  it('keeps legitimate empty strings on text/code fields', () => {
    const cleaned = cleanEmptyOptionalFields({
      name: '',
      code: '',
      phone: '',
      remark: '备注',
      customer_type: 'enterprise',
    });
    expect(cleaned).toEqual({
      name: '',
      code: '',
      phone: '',
      remark: '备注',
      customer_type: 'enterprise',
    });
  });

  it('keeps non-empty UUID values untouched', () => {
    const uuid = '9e6f0c4a-1111-2222-3333-444444444444';
    const cleaned = cleanEmptyOptionalFields({ owner_id: uuid, code: 'X1' });
    expect(cleaned).toEqual({ owner_id: uuid, code: 'X1' });
  });

  it('recurses into nested objects and object arrays', () => {
    const cleaned = cleanEmptyOptionalFields({
      name: '订单',
      detail: { warehouse_id: '', amount: 100 },
      lines: [
        { item_id: '', qty: 2 },
        { item_id: 'abc', qty: 1 },
      ],
    });
    expect(cleaned).toEqual({
      name: '订单',
      detail: { amount: 100 },
      lines: [{ qty: 2 }, { item_id: 'abc', qty: 1 }],
    });
  });

  it('does not mutate the input payload', () => {
    const input = { warehouse_id: '', name: 'A' };
    cleanEmptyOptionalFields(input);
    expect(input.warehouse_id).toBe('');
  });

  it('returns non-object payloads unchanged', () => {
    expect(cleanEmptyOptionalFields('plain')).toBe('plain');
    expect(cleanEmptyOptionalFields(42)).toBe(42);
    expect(cleanEmptyOptionalFields(null)).toBeNull();
  });
});

describe('field predicates', () => {
  it('identifies foreign key fields', () => {
    expect(isForeignKeyField('warehouse_id')).toBe(true);
    expect(isForeignKeyField('assigneeId')).toBe(true);
    expect(isForeignKeyField('id')).toBe(true);
    expect(isForeignKeyField('name')).toBe(false);
  });

  it('identifies date/time fields', () => {
    expect(isDateTimeField('expected_date')).toBe(true);
    expect(isDateTimeField('dueTime')).toBe(true);
    expect(isDateTimeField('startDate')).toBe(true);
    expect(isDateTimeField('name')).toBe(false);
  });

  it('validates UUID format', () => {
    expect(isValidUuid('9e6f0c4a-1111-2222-3333-444444444444')).toBe(true);
    expect(isValidUuid('')).toBe(false);
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });
});
