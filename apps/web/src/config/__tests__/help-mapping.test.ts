import { describe, it, expect, vi } from 'vitest';

import { findHelpByPath } from '../help-mapping';

// Mock i18n — t returns the key itself
vi.mock('@/i18n', () => ({
  default: { t: (x: string) => x },
}));

describe('findHelpByPath', () => {
  it('should find exact match for known top-level path', () => {
    const result = findHelpByPath('/iam');
    expect(result).toBeDefined();
    expect(result!.guideId).toBe('iam-getting-started');
    expect(result!.faqCategory).toBe('iam');
  });

  it('should find exact match for nested path', () => {
    const result = findHelpByPath('/iam/users');
    expect(result).toBeDefined();
    expect(result!.guideId).toBe('iam-user-management');
  });

  it('should fall back to parent path for unmatched nested path', () => {
    const result = findHelpByPath('/iam/users/extra/deep');
    expect(result).toBeDefined();
    // Should match /iam/users as the closest parent
    expect(result!.guideId).toBe('iam-user-management');
  });

  it('should fall back to module root for unknown nested path under known module', () => {
    const result = findHelpByPath('/crm/some/random/page');
    expect(result).toBeDefined();
    expect(result!.guideId).toBe('crm-getting-started');
    expect(result!.faqCategory).toBe('crm');
  });

  it('should return undefined for completely unknown path', () => {
    const result = findHelpByPath('/nonexistent/path/here');
    expect(result).toBeUndefined();
  });

  it('should return undefined for root path', () => {
    const result = findHelpByPath('/');
    expect(result).toBeUndefined();
  });

  it('should find workflow mappings', () => {
    const result = findHelpByPath('/workflow/designer');
    expect(result).toBeDefined();
    expect(result!.guideId).toBe('workflow-designer');
    expect(result!.faqCategory).toBe('workflow');
  });

  it('should find erp mappings', () => {
    const result = findHelpByPath('/erp/purchase');
    expect(result).toBeDefined();
    expect(result!.guideId).toBe('erp-purchase-management');
  });

  it('should find wms mappings', () => {
    const result = findHelpByPath('/wms/outbound');
    expect(result).toBeDefined();
    expect(result!.guideId).toBe('wms-outbound-management');
  });

  it('should find ai mapping', () => {
    const result = findHelpByPath('/ai');
    expect(result).toBeDefined();
    expect(result!.guideId).toBe('ai-getting-started');
  });
});
