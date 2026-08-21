# WMS 非 Detail 页面模板使用扫描报告

扫描时间：2026-08-21T09:54:28.118Z
扫描目录：apps/web/src/pages/wms
排除已迁移的 6 个 Detail 页面

## 汇总

- 总页面数：17
- 已使用模板且无 Tailwind：16
- 已使用模板但仍有 Tailwind：0
- Dashboard/报表/分析类：1
- 需要迁移：0

## 详细清单

| 文件 | 行数 | PageContainer | CrudPage | ListPageTemplate | DashboardTemplate | DataTable | MUI | Tailwind | 建议 |
|------|------|---------------|----------|------------------|-------------------|-----------|-----|----------|------|
| BatchManagementPage.tsx | 248 | ✅ | ✅ | — | — | — | ✅ | — | already-migrated |
| DashboardPage.tsx | 232 | ✅ | — | — | ✅ | — | ✅ | — | already-migrated |
| InboundOrderPage.tsx | 33 | — | ✅ | — | — | — | — | — | already-migrated |
| InboundPage.tsx | 234 | — | ✅ | — | — | — | ✅ | — | already-migrated |
| InventoryPage.tsx | 156 | — | ✅ | — | — | — | ✅ | — | already-migrated |
| InventoryReportPage.tsx | 278 | ✅ | — | — | — | — | ✅ | — | dashboard-or-analytics |
| LocationPage.tsx | 30 | — | ✅ | — | — | — | — | — | already-migrated |
| OutboundOrderPage.tsx | 30 | — | ✅ | — | — | — | — | — | already-migrated |
| OutboundPage.tsx | 304 | — | ✅ | — | — | — | ✅ | — | already-migrated |
| ReplenishmentPage.tsx | 486 | ✅ | ✅ | — | — | — | ✅ | — | already-migrated |
| SerialNumberPage.tsx | 154 | — | ✅ | — | — | — | ✅ | — | already-migrated |
| StockTakePage.tsx | 812 | ✅ | ✅ | — | — | — | ✅ | — | already-migrated |
| SupplierDetailPage.tsx | 506 | ✅ | — | — | — | — | ✅ | — | already-migrated |
| SupplierManagementPage.tsx | 18 | — | ✅ | — | — | — | — | — | already-migrated |
| TransferPage.tsx | 539 | — | ✅ | — | — | — | ✅ | — | already-migrated |
| WarehouseManagementPage.tsx | 30 | — | ✅ | — | — | — | — | — | already-migrated |
| WmsAreaPage.tsx | 39 | — | ✅ | — | — | — | — | — | already-migrated |

## 分类说明

- **already-migrated**：已使用标准模板且无 Tailwind 类名，无需处理
- **template-used-but-tailwind-remains**：已接入 CrudPage/ListPageTemplate 但仍有部分 Tailwind 样式，可逐步清理
- **dashboard-or-analytics**：Dashboard/报表/分析类页面，建议根据设计系统评估是否使用 DashboardTemplate
- **needs-migration**：未使用任何标准模板，建议优先迁移

## Dashboard / 报表 / 分析 页面

- InventoryReportPage.tsx
  - 未使用任何标准模板
