import { describe, it, expect } from 'vitest';
import { customerZodSchema } from '../../crm/customer';

describe('customerSchema contract (before fix)', () => {
  it('rejects object missing required name / customerType', () => {
    const result = customerZodSchema.safeParse({ industry: 'Manufacturing' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const missingPaths = result.error.issues.map(i => i.path.join('.'));
      expect(missingPaths).toContain('name');
      expect(missingPaths).toContain('customerType');
    }
  });

  it('accepts a fully-formed enterprise customer', () => {
    const ok = customerZodSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      tenantId: '990e8400-e29b-41d4-a716-446655440099',
      name: '示例工厂有限公司',
      customerType: 'enterprise',
      industry: 'Manufacturing',
      rating: 'A',
      region: '华东',
      ownerId: 'aa0e8400-e29b-41d4-a716-4466554400aa',
      approvalStatus: 'none',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
      deletedAt: null,
    });
    expect(ok.success).toBe(true);
  });
});
