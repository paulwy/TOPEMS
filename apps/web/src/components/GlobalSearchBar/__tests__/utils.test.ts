import { describe, it, expect } from 'vitest';
import { resolveResultPath } from '../utils';

describe('resolveResultPath', () => {
  it('订单详情路径归一为列表页', () => {
    expect(resolveResultPath({ path: '/sales/orders/abc' } as never)).toBe('/erp/sales-orders');
    expect(resolveResultPath({ path: 'sales/orders/abc' } as never)).toBe('/erp/sales-orders');
    expect(resolveResultPath({ path: '/purchase/orders/abc' } as never)).toBe(
      '/erp/purchase-order'
    );
  });

  it('已是列表页 / 其他业务路径原样保留', () => {
    expect(resolveResultPath({ path: '/erp/sales-orders' } as never)).toBe('/erp/sales-orders');
    expect(resolveResultPath({ path: '/rd/material' } as never)).toBe('/rd/material');
    expect(resolveResultPath({ path: '/crm/customers/x' } as never)).toBe('/crm/customers/x');
  });

  it('缺失 path 时回退 url，再回退根路由', () => {
    expect(resolveResultPath({ path: '', url: '/crm/customers/y' } as never)).toBe(
      '/crm/customers/y'
    );
    expect(resolveResultPath({ path: '' } as never)).toBe('/');
  });
});
