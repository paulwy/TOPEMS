# E2E 测试编写模式规范

## 文件结构
- 测试文件路径: `apps/web/e2e/ui/<module>-<flow>.spec.ts`
- 共享辅助工具: `apps/web/e2e/ui/helpers/auth.ts`

## 导入约定
```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, expectUrl, expectPageVisible, expectHasHeading } from './helpers/auth';
```

## 测试组织
```typescript
test.describe('模块名 流程名 (TC-XXX-001 ~ TC-XXX-00N)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-XXX-001 should ...', async ({ page }) => {
    // 测试逻辑
  });
});
```

## 测试用例命名
- 格式: `TC-<模块缩写>-<编号> should <描述>`
- 模块缩写: WMS, CRM, MES, SCM, ERP, TMS

## 等待策略
- 使用 `waitForLoadState('networkidle')` 等待网络空闲
- 使用 `waitForURL` 等待页面跳转
- 禁止使用固定 `sleep` / `waitForTimeout`
- 元素可见性使用 `expect(...).toBeVisible({ timeout: 10000 })`

## 容错处理
- 按钮可能不存在时使用 `.catch(() => false)` 包裹 `isVisible()`
- 弹窗/表格可能不存在时使用 `.catch(() => {})` 包裹断言
- 每个测试用例独立，不依赖其他测试的数据

## 页面路由参考
### WMS
- 入库: `/wms/inbound`, `/wms/inbound-order`
- 出库: `/wms/outbound`, `/wms/outbound-order`
- 盘点: `/wms/stock-take`
- 库位: `/wms/location-management`, `/wms/warehouse-management`
- 库存: `/wms/inventory`, `/wms/inventory-report`
- 分析: `/wms/analytics/inventory-turnover`, `/wms/analytics/age-pareto`, `/wms/analytics/flow-trend`, `/wms/analytics/abc-analysis`, `/wms/analytics/location-utilization`

### CRM
- 客户: `/crm/customers`, `/crm/customers/create`
- 商机: `/crm/opportunities`
- 合同: `/crm/billing`
- 交互: `/crm/interactions`
- 分析: `/crm/sales-funnel`, `/crm/rfm`, `/crm/customer-scoring`, `/crm/sales-forecast`, `/crm/customer-segmentation`

### MES
- 生产订单: `/mes/production-orders`
- 工单: `/mes/work-orders`, `/mes/work-order`
- 设备: `/mes/equipment`, `/mes/equipment-oee`
- 质量: `/mes/quality-inspection`, `/mes/quality`
- 分析: `/mes/analytics/oee`, `/mes/analytics/delivery`, `/mes/analytics/quality-pareto`, `/mes/analytics/mtbf`, `/mes/analytics/energy`, `/mes/analytics/capacity`

### SCM
- 采购: `/scm/purchase-orders`, `/scm/purchase-requisition`, `/scm/purchase-items`
- 供应商: `/scm/suppliers`, `/scm/supplier-admission`, `/scm/supplier-evaluation`
- 合同: `/scm/contracts`, `/scm/purchase-contract`
- 分析: `/scm/overview`, `/scm/inventory-turnover`, `/scm/price-comparison`

### ERP
- 财务: `/erp/voucher-management`, `/erp/financial-report`, `/erp/financial-analysis`, `/erp/accounting-management`
- 资产: `/erp/asset-management`
- 成本: `/erp/budget-management`, `/erp/receivable-payable`
- 基础: `/erp/customer-management`, `/erp/supplier-management`, `/erp/inventory-management`

### TMS
- 运输: `/tms/shipments`
- 车辆: `/tms/vehicles`
- 司机: `/tms/drivers`
- 承运商: `/tms/carriers`
- 路线: `/tms/routes`
- 分析: `/tms/analytics/shipment-trend`, `/tms/analytics/vehicle-utilization`, `/tms/analytics/driver-performance`, `/tms/analytics/carrier-performance`, `/tms/analytics/route-efficiency`, `/tms/analytics/freight-cost`

## 参考样本
- `apps/web/e2e/ui/wms-inbound.spec.ts` - 入库流程完整示例
- `apps/web/e2e/ui/wms-outbound.spec.ts` - 出库流程完整示例
- `apps/web/e2e/ui/crm-customer.spec.ts` - 现有 CRM 客户测试（需扩展）
