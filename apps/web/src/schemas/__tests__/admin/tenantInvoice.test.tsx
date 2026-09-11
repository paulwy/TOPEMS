import { describe, it, expect, vi } from 'vitest';

// Explicitly import the .tsx file (not the .ts file which shadows it in resolution order)
import { tenantInvoiceSchema, invoiceRowActions } from '../../admin/tenantInvoice.tsx';

// Mock i18n — t returns the key itself
vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

describe('tenantInvoiceSchema', () => {
  it('should have correct entity and meta', () => {
    expect(tenantInvoiceSchema.entity).toBe('tenant_invoice');
    expect(tenantInvoiceSchema.title).toBeDefined();
    expect(tenantInvoiceSchema.description).toBeDefined();
  });

  it('should have correct api config', () => {
    expect(tenantInvoiceSchema.api.module).toBe('tenant');
    expect(tenantInvoiceSchema.api.resource).toBe('invoices');
  });

  it('should have 8 fields', () => {
    expect(tenantInvoiceSchema.fields.length).toBe(8);
  });

  it('should have id field as readonly text', () => {
    const field = tenantInvoiceSchema.fields.find((f) => f.name === 'id');
    expect(field).toBeDefined();
    expect(field!.type).toBe('text');
    expect(field!.readonly).toBe(true);
    expect(field!.sortable).toBe(true);
  });

  it('should have amount field as readonly number', () => {
    const field = tenantInvoiceSchema.fields.find((f) => f.name === 'amount');
    expect(field).toBeDefined();
    expect(field!.type).toBe('number');
    expect(field!.readonly).toBe(true);
  });

  it('should have status select with 4 options', () => {
    const field = tenantInvoiceSchema.fields.find((f) => f.name === 'status');
    expect(field).toBeDefined();
    expect(field!.type).toBe('select');
    expect(field!.readonly).toBe(true);
    if (field!.options && 'options' in field!.options) {
      expect(field!.options.options.length).toBe(4);
    }
  });

  it('should have correct list columns', () => {
    expect(tenantInvoiceSchema.list.columns).toEqual([
      'id',
      'period_start',
      'period_end',
      'amount',
      'status',
      'paid_at',
    ]);
    expect(tenantInvoiceSchema.list.searchFields).toEqual(['id']);
    expect(tenantInvoiceSchema.list.pageSize).toBe(10);
  });

  it('should have statusBadge with 4 statuses', () => {
    expect(tenantInvoiceSchema.list.statusBadge).toBeDefined();
    expect(tenantInvoiceSchema.list.statusBadge!.field).toBe('status');
    expect(tenantInvoiceSchema.list.statusBadge!.colorMap.paid).toBe('success');
    expect(tenantInvoiceSchema.list.statusBadge!.colorMap.pending).toBe('warning');
    expect(tenantInvoiceSchema.list.statusBadge!.colorMap.failed).toBe('error');
    expect(tenantInvoiceSchema.list.statusBadge!.colorMap.draft).toBe('default');
  });

  it('should have detail-only action', () => {
    expect(tenantInvoiceSchema.actions).toEqual(['detail']);
  });
});

describe('invoiceRowActions', () => {
  it('should export an array with one action', () => {
    expect(Array.isArray(invoiceRowActions)).toBe(true);
    expect(invoiceRowActions.length).toBe(1);
  });

  it('should have a download action with icon and onClick', () => {
    const action = invoiceRowActions[0];
    expect(action.label).toBeDefined();
    expect(action.icon).toBeDefined();
    expect(typeof action.onClick).toBe('function');
  });
});
