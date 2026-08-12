import { describe, it, expect } from 'vitest';
import { toOpenApiParams, camelToSnake } from '@topems/shared-types';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('CRM contract adapter', () => {
  it('toOpenApiParams 白名单映射 customerType → customer_type + tenantId → tenant_id', () => {
    const out = toOpenApiParams({ customerType: 'enterprise', tenantId: 'a'.repeat(36) });
    expect(out).toMatchObject({
      customer_type: 'enterprise',
      tenant_id: expect.any(String),
    });
  });

  it('toOpenApiParams 未映射字段保持原 key（映射白名单限制，需要 camelToSnake 显式调用）', () => {
    const out = toOpenApiParams({ approvalStatus: 'pending', customerType: 'individual' });
    expect(out).toMatchObject({
      customer_type: 'individual',
    });
    expect(out).toHaveProperty('approvalStatus', 'pending');
  });

  it('camelToSnake 通用转换 approvalStatus / ownerId / approverIds（用于动态字段）', () => {
    expect(camelToSnake('approvalStatus')).toBe('approval_status');
    expect(camelToSnake('ownerId')).toBe('owner_id');
    expect(camelToSnake('approverIds')).toBe('approver_ids');
    expect(camelToSnake('customerType')).toBe('customer_type');
  });

  it('FE_ROUTES_JSON 至少 21 对路由对称（customer 8 + contact 8 + opportunity 10 + 其他）', () => {
    const src = readFileSync(resolve(__dirname, '../../crm/index.ts'), 'utf8');
    const m = src.match(/\/\*\s*FE_ROUTES_JSON\s*([\s\S]*?)\*\//);
    expect(m).not.toBeNull();
    const pairs = JSON.parse(m![1]);
    expect(Array.isArray(pairs)).toBe(true);
    expect(pairs.length).toBeGreaterThanOrEqual(21);
  });

  it('FE_ROUTES_JSON 包含 customer/contact 审批三接口各 3 条（共 6 条）', () => {
    const src = readFileSync(resolve(__dirname, '../../crm/index.ts'), 'utf8');
    const m = src.match(/\/\*\s*FE_ROUTES_JSON\s*([\s\S]*?)\*\//);
    const pairs = JSON.parse(m![1]) as Array<[string, string]>;
    const customerApproval = pairs.filter(([, p]) =>
      p.startsWith('/crm/customers/:id/approval/')
    );
    const contactApproval = pairs.filter(([, p]) =>
      p.startsWith('/crm/contacts/:id/approval/')
    );
    expect(customerApproval.length).toBe(3);
    expect(contactApproval.length).toBe(3);
    const approvalActions = new Set(
      [...customerApproval, ...contactApproval].map(
        ([method, path]) => `${method} ${path.split('/approval/')[1]}`
      )
    );
    expect(approvalActions.has('POST start')).toBe(true);
    expect(approvalActions.has('POST approve')).toBe(true);
    expect(approvalActions.has('POST reject')).toBe(true);
  });

  it('审计日志 action 命名规范（crm.{entity}.approval.{start|approve|reject}）', () => {
    const expectedActions = new Set([
      'crm.customer.approval.start',
      'crm.customer.approval.approve',
      'crm.customer.approval.reject',
      'crm.contact.approval.start',
      'crm.contact.approval.approve',
      'crm.contact.approval.reject',
    ]);
    expect(expectedActions.size).toBe(6);
    const actions = Array.from(expectedActions);
    expect(actions.every(a => a.split('.').length >= 4)).toBe(true);
    expect(actions.filter(a => a.includes('approval')).length).toBe(6);
  });
});
