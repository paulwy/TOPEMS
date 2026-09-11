import { describe, it, expect, vi } from 'vitest';

import { docSchema } from '../../rd/doc';

// Mock i18n — t returns the key itself
vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

describe('docSchema', () => {
  it('should have correct entity and title', () => {
    expect(docSchema.entity).toBe('rd_doc');
    expect(docSchema.title).toBeDefined();
    expect(docSchema.description).toBeDefined();
  });

  it('should have correct api config', () => {
    expect(docSchema.api.module).toBe('rd');
    expect(docSchema.api.resource).toBe('docs');
  });

  it('should have 7 fields', () => {
    expect(docSchema.fields.length).toBe(7);
  });

  it('should have doc_name field as required text', () => {
    const field = docSchema.fields.find((f) => f.name === 'doc_name');
    expect(field).toBeDefined();
    expect(field!.type).toBe('text');
    expect(field!.required).toBe(true);
  });

  it('should have doc_type select field with options', () => {
    const field = docSchema.fields.find((f) => f.name === 'doc_type');
    expect(field).toBeDefined();
    expect(field!.type).toBe('select');
    expect(field!.options).toBeDefined();
    if (field!.options && 'options' in field!.options) {
      expect(field!.options.options.length).toBe(5);
    }
  });

  it('should have status select field with published/draft options', () => {
    const field = docSchema.fields.find((f) => f.name === 'status');
    expect(field).toBeDefined();
    expect(field!.type).toBe('select');
    expect(field!.defaultValue).toBe('draft');
  });

  it('should have correct list configuration', () => {
    expect(docSchema.list.columns).toEqual([
      'doc_name',
      'doc_type',
      'version',
      'author',
      'update_time',
      'status',
    ]);
    expect(docSchema.list.searchFields).toEqual(['doc_name', 'author']);
    expect(docSchema.list.pageSize).toBe(10);
  });

  it('should have statusBadge configuration', () => {
    expect(docSchema.list.statusBadge).toBeDefined();
    expect(docSchema.list.statusBadge!.field).toBe('status');
    expect(docSchema.list.statusBadge!.colorMap.published).toBe('success');
    expect(docSchema.list.statusBadge!.colorMap.draft).toBe('warning');
  });

  it('should have correct actions', () => {
    expect(docSchema.actions).toEqual(['create', 'edit', 'detail', 'delete']);
  });

  it('should have form sections and titles', () => {
    expect(docSchema.formSections.length).toBe(2);
    expect(docSchema.formColCount).toBe(2);
    expect(docSchema.createTitle).toBeDefined();
    expect(docSchema.editTitle).toBeDefined();
    expect(docSchema.detailTitle).toBeDefined();
  });
});
