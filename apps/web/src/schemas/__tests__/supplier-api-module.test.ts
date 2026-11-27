import { describe, it, expect } from 'vitest';
import { supplierSchema as wmsSupplierSchema } from '../wms/supplier';
import { supplierSchema as erpSupplierSchema } from '../erp/supplier';
import { supplierSchema as srmSupplierSchema } from '../srm/supplier';

/**
 * 供应主数据 schema 的 api 声明护栏（2026-11-27）
 *
 * WMS / ERP / SRM 三张供应商页实际都请求 `/api/master-data/suppliers`，
 * 但 schema 里一度写成 `module: 'mdm'`（该模块不在 ApiClient 的 module 白名单，
 * `/api/mdm/suppliers` 线上返回 404）。api 字段目前只作声明用，
 * 写错不会立刻炸，但会在以后有人按它自动建 client 时踩坑，这里锁死正确值。
 */
const CASES = [
  ['wms', wmsSupplierSchema],
  ['erp', erpSupplierSchema],
  ['srm', srmSupplierSchema],
] as const;

describe('供应商 schema 的 api 声明', () => {
  for (const [name, schema] of CASES) {
    it(`${name} 指向 master-data/suppliers`, () => {
      expect(schema.api).toEqual({ module: 'master-data', resource: 'suppliers' });
    });
  }

  it('不再出现 mdm 模块声明', () => {
    for (const [, schema] of CASES) {
      expect(schema.api.module).not.toBe('mdm');
    }
  });
});
