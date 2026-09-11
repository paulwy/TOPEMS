import { describe, it, expect, vi } from 'vitest';

import { outboundOrderSchema } from '../../wms/outboundOrder';

// Mock i18n — t returns the key itself
vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

describe('outboundOrderSchema', () => {
  it('should have correct entity and meta', () => {
    expect(outboundOrderSchema.entity).toBe('outbound_order');
    expect(outboundOrderSchema.title).toBeDefined();
    expect(outboundOrderSchema.description).toBeDefined();
  });

  it('should have correct api config', () => {
    expect(outboundOrderSchema.api.module).toBe('wms');
    expect(outboundOrderSchema.api.resource).toBe('outboundOrders');
  });

  it('should have 9 fields', () => {
    expect(outboundOrderSchema.fields.length).toBe(9);
  });

  it('should have order_number as required readonly-on-edit text', () => {
    const field = outboundOrderSchema.fields.find((f) => f.name === 'order_number');
    expect(field).toBeDefined();
    expect(field!.type).toBe('text');
    expect(field!.required).toBe(true);
    expect(field!.readonlyOnEdit).toBe(true);
    expect(field!.sortable).toBe(true);
  });

  it('should have order_date as required date', () => {
    const field = outboundOrderSchema.fields.find((f) => f.name === 'order_date');
    expect(field).toBeDefined();
    expect(field!.type).toBe('date');
    expect(field!.required).toBe(true);
  });

  it('should have status as readonly text with renderCell', () => {
    const field = outboundOrderSchema.fields.find((f) => f.name === 'status');
    expect(field).toBeDefined();
    expect(field!.type).toBe('text');
    expect(field!.readonly).toBe(true);
    expect(typeof field!.renderCell).toBe('function');
  });

  it('should render known statuses via renderCell', () => {
    const field = outboundOrderSchema.fields.find((f) => f.name === 'status');
    expect(field).toBeDefined();
    const result = field!.renderCell!({ status: 'pending' });
    // With mocked i18n, t returns the key itself
    expect(result).toBe('wms.outbound_order.k10');
  });

  it('should return raw status for unknown statuses', () => {
    const field = outboundOrderSchema.fields.find((f) => f.name === 'status');
    const result = field!.renderCell!({ status: 'unknown_xyz' });
    expect(result).toBe('unknown_xyz');
  });

  it('should have correct list configuration', () => {
    expect(outboundOrderSchema.list.columns).toEqual([
      'order_number',
      'warehouse_id',
      'customer_name',
      'order_date',
      'expected_delivery',
      'total_amount',
      'status',
    ]);
    expect(outboundOrderSchema.list.searchFields).toEqual(['order_number', 'customer_name']);
    expect(outboundOrderSchema.list.pageSize).toBe(10);
  });

  it('should have correct actions and titles', () => {
    expect(outboundOrderSchema.actions).toEqual(['create', 'edit', 'detail', 'delete']);
    expect(outboundOrderSchema.formColCount).toBe(2);
    expect(outboundOrderSchema.createTitle).toBeDefined();
    expect(outboundOrderSchema.editTitle).toBeDefined();
    expect(outboundOrderSchema.detailTitle).toBeDefined();
  });
});
