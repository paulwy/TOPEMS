# TOPEMS 前后端 API 对齐差距报告

**总计**: 19 个服务存在差距, 515 个前端API端点后端缺失

## 服务差距概览

| 前端服务 | 后端服务 | 缺失端点数 |
|----------|----------|------------|
| erp | erp | 94 |
| workflow | unified-core | 55 |
| wms | wms | 53 |
| bi | analytics | 51 |
| lims | lims | 40 |
| scm | scm | 37 |
| crm | crm | 36 |
| integration | integration | 32 |
| mes | mes | 29 |
| ai | ai | 24 |
| hrm | hrm | 17 |
| rs | rs | 14 |
| pm | pm | 10 |
| srm | srm | 8 |
| iam | unified-core | 6 |
| mail | unified-core | 6 |
| doc | doc | 1 |
| file | unified-core | 1 |
| migration | unified-core | 1 |

## erp 服务差距详情

- **后端服务**: erp
- **缺失端点数**: 94

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/addressbook` | addressbook/index.ts |
| GET | `/addressbook/departments/tree` | addressbook/index.ts |
| GET | `/addressbook/search` | addressbook/index.ts |
| GET | `/asset/equipments/stats` | asset/equipment.ts |
| GET | `/consolidation/company-relations` | consolidation/index.ts |
| GET | `/consolidation/company-tree` | consolidation/index.ts |
| GET | `/consolidation/elimination-rules` | consolidation/index.ts |
| GET | `/consolidation/internal-transactions` | consolidation/index.ts |
| GET | `/consolidation/reports` | consolidation/index.ts |
| GET | `/consolidation/scopes` | consolidation/index.ts |
| GET | `/inventory/low-stock` | erp/core/inventory.ts |
| GET | `/reports/aging-analysis` | erp/finance/report.ts |
| GET | `/reports/balance-sheet` | financialReport/index.ts |
| GET | `/reports/balance-sheet/history` | financialReport/index.ts |
| GET | `/reports/cash-flow` | financialReport/index.ts |
| GET | `/reports/cash-flow/history` | financialReport/index.ts |
| GET | `/reports/comparison` | financialReport/index.ts |
| GET | `/reports/consolidated/elims` | financialReport/index.ts |
| GET | `/reports/consolidated/entities` | financialReport/index.ts |
| GET | `/reports/income-statement` | financialReport/index.ts |
| GET | `/reports/income-statement/history` | financialReport/index.ts |
| GET | `/reports/item-details` | financialReport/index.ts |
| GET | `/reports/item-vouchers` | financialReport/index.ts |
| GET | `/reports/monthly-trend` | erp/finance/report.ts |
| GET | `/reports/period-over-period` | financialReport/index.ts |
| GET | `/reports/subscriptions` | financialReport/index.ts |
| GET | `/reports/trend` | financialReport/index.ts |
| GET | `/reports/year-over-year` | financialReport/index.ts |
| GET | `/voucher/rules` | voucherTemplate/index.ts |
| GET | `/voucher/templates` | voucherTemplate/index.ts |
| POST | `/accounting-subjects` | erp/finance/accounting.ts |
| POST | `/announcements` | erp/admin/announcement.ts |
| POST | `/asset/equipments` | asset/equipment.ts |
| POST | `/asset/equipments/batch-delete` | asset/equipment.ts |
| POST | `/asset/inspections` | asset/maintenance.ts |
| POST | `/asset/maintenances` | asset/maintenance.ts |
| POST | `/assets` | erp/finance/asset.ts |
| POST | `/bank-accounts` | erp/finance/bank.ts |
| POST | `/bank-transactions` | erp/finance/bank.ts |
| POST | `/budgets` | erp/finance/budget.ts |
| POST | `/consolidation/company-relations` | consolidation/index.ts |
| POST | `/consolidation/elimination-rules` | consolidation/index.ts |
| POST | `/consolidation/execute-elimination` | consolidation/index.ts |
| POST | `/consolidation/reports/generate` | consolidation/index.ts |
| POST | `/consolidation/scopes` | consolidation/index.ts |
| POST | `/consolidation/scopes/companies` | consolidation/index.ts |
| POST | `/customers` | erp/core/customer.ts |
| POST | `/expenses` | erp/finance/budget.ts |
| POST | `/finance/accounts/opening-balances` | erp/finance/accounting.ts |
| POST | `/finance/accounts/opening-balances/batch` | erp/finance/accounting.ts |
| POST | `/finance/accounts/opening-balances/carry-forward` | erp/finance/accounting.ts |
| POST | `/fixed-assets` | erp/finance/asset.ts |
| POST | `/fixed-assets/depreciate` | erp/finance/asset.ts |
| POST | `/inventory` | erp/core/inventory.ts |
| POST | `/materials` | erp/core/material.ts |
| POST | `/meeting-bookings` | erp/admin/meeting.ts |
| POST | `/meeting-rooms` | erp/admin/meeting.ts |
| POST | `/oa/expense-claims` | oa/expense.ts |
| POST | `/office-supplies` | erp/admin/officeSupplies.ts |
| POST | `/payables` | erp/finance/receivablePayable.ts |
| POST | `/purchase-orders` | erp/core/purchaseOrder.ts |
| POST | `/receivables` | erp/finance/receivablePayable.ts |
| POST | `/reports/approve` | financialReport/index.ts |
| POST | `/reports/balance-sheet/generate` | financialReport/index.ts |
| POST | `/reports/cash-flow/generate` | financialReport/index.ts |
| POST | `/reports/consolidated/elims` | financialReport/index.ts |
| POST | `/reports/consolidated/entities` | financialReport/index.ts |
| POST | `/reports/consolidated/generate` | financialReport/index.ts |
| POST | `/reports/export/batch` | financialReport/index.ts |
| POST | `/reports/income-statement/generate` | financialReport/index.ts |
| POST | `/reports/lock` | financialReport/index.ts |
| POST | `/reports/reject` | financialReport/index.ts |
| POST | `/reports/submit-approval` | financialReport/index.ts |
| POST | `/reports/subscriptions` | financialReport/index.ts |
| POST | `/reports/unlock` | financialReport/index.ts |
| POST | `/sales-orders` | erp/core/salesOrder.ts |
| POST | `/suppliers` | erp/core/supplier.ts |
| POST | `/system/db/columns` | system/index.ts |
| POST | `/system/db/columns/preview` | system/index.ts |
| POST | `/system/dict-items` | system/index.ts |
| POST | `/system/dict-items/batch` | system/index.ts |
| POST | `/system/dict-types` | system/index.ts |
| POST | `/vehicle-requests` | erp/admin/vehicle.ts |
| POST | `/vehicles` | erp/admin/vehicle.ts |
| POST | `/voucher/generate/auto` | voucherTemplate/index.ts |
| POST | `/voucher/generate/batch` | voucherTemplate/index.ts |
| POST | `/voucher/generate/from-source` | voucherTemplate/index.ts |
| POST | `/voucher/generate/preview` | voucherTemplate/index.ts |
| POST | `/voucher/rules` | voucherTemplate/index.ts |
| POST | `/voucher/templates` | voucherTemplate/index.ts |
| POST | `/voucher/templates/import` | voucherTemplate/index.ts |
| POST | `/voucher/templates/match` | voucherTemplate/index.ts |
| POST | `/vouchers` | erp/finance/voucher.ts |
| POST | `/vouchers/import/u8` | erp/finance/voucher.ts |

## workflow 服务差距详情

- **后端服务**: unified-core
- **缺失端点数**: 55

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/categories/active` | workflow/category.ts |
| GET | `/categories/tree` | workflow/category.ts |
| GET | `/delegates/active` | workflow/delegate.ts |
| GET | `/delegates/my` | workflow/delegate.ts |
| GET | `/delegates/my/attorneys` | workflow/delegate.ts |
| GET | `/form-definitions/categories` | workflow/form.ts |
| GET | `/form-instances/my` | workflow/form.ts |
| GET | `/form-instances/my/drafts` | workflow/form.ts |
| GET | `/monitor/analysis/departments` | workflow/monitor.ts |
| GET | `/monitor/analysis/efficiency` | workflow/monitor.ts |
| GET | `/monitor/analysis/trend` | workflow/monitor.ts |
| GET | `/monitor/analysis/users` | workflow/monitor.ts |
| GET | `/monitor/dashboard` | workflow/monitor.ts |
| GET | `/monitor/instances` | workflow/monitor.ts |
| GET | `/monitor/instances/completed` | workflow/monitor.ts |
| GET | `/monitor/instances/error` | workflow/monitor.ts |
| GET | `/monitor/instances/overdue` | workflow/monitor.ts |
| GET | `/monitor/instances/rejected` | workflow/monitor.ts |
| GET | `/monitor/instances/running` | workflow/monitor.ts |
| GET | `/monitor/instances/suspended` | workflow/monitor.ts |
| GET | `/monitor/logs` | workflow/monitor.ts |
| GET | `/monitor/performance` | workflow/monitor.ts |
| GET | `/monitor/realtime` | workflow/monitor.ts |
| GET | `/monitor/sla-compliance` | workflow/monitor.ts |
| GET | `/monitor/statistics` | workflow/monitor.ts |
| GET | `/performance` | workflow/index.ts |
| GET | `/rules/type` | workflow/rule.ts |
| GET | `/statistics` | workflow/index.ts |
| GET | `/tasks` | workflow/task.ts |
| GET | `/tasks/candidate` | workflow/task.ts |
| GET | `/tasks/count` | workflow/task.ts |
| GET | `/tasks/due-soon` | workflow/task.ts |
| GET | `/tasks/high-priority` | workflow/task.ts |
| GET | `/tasks/my` | workflow/task.ts |
| GET | `/tasks/my/cc` | workflow/task.ts |
| GET | `/tasks/my/completed` | workflow/task.ts |
| GET | `/tasks/my/count` | workflow/task.ts |
| GET | `/tasks/my/created` | workflow/task.ts |
| GET | `/tasks/my/involved` | workflow/task.ts |
| GET | `/tasks/my/pending` | workflow/task.ts |
| GET | `/tasks/my/stats` | workflow/task.ts |
| GET | `/tasks/overdue` | workflow/task.ts |
| POST | `/approvals` | workflow/approval.ts |
| POST | `/categories/sort` | workflow/category.ts |
| POST | `/form-definitions/import` | workflow/form.ts |
| POST | `/instances` | workflow/instance.ts |
| POST | `/performance/reset` | workflow/index.ts |
| POST | `/rules/batch` | workflow/rule.ts |
| POST | `/settings/batch` | workflow/setting.ts |
| POST | `/tasks/batch/approve` | workflow/task.ts |
| POST | `/tasks/batch/complete` | workflow/task.ts |
| POST | `/tasks/batch/delegate` | workflow/task.ts |
| POST | `/templates` | workflow/template.ts |
| POST | `/templates/import` | workflow/template.ts |
| POST | `/workflows/import` | workflow/definition.ts |

## wms 服务差距详情

- **后端服务**: wms
- **缺失端点数**: 53

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/audit-logs` | wms/audit.ts |
| GET | `/audit-logs/modules` | wms/audit.ts |
| GET | `/batches` | wms/batch.ts |
| GET | `/batches/expired` | wms/batch.ts |
| GET | `/batches/expiring-soon` | wms/batch.ts |
| GET | `/batches/statistics` | wms/batch.ts |
| GET | `/inbound-orders` | wms/inbound.ts |
| GET | `/inventory` | wms/inventory.ts |
| GET | `/inventory-alerts/records` | wms/inventory.ts |
| GET | `/inventory-alerts/rules` | wms/inventory.ts |
| GET | `/inventory-alerts/statistics` | wms/inventory.ts |
| GET | `/inventory/abc-analysis` | wms/inventory.ts |
| GET | `/inventory/low-stock` | wms/inventory.ts |
| GET | `/inventory/statistics` | wms/inventory.ts |
| GET | `/inventory/turnover` | wms/inventory.ts |
| GET | `/inventory/value-by-warehouse` | wms/inventory.ts |
| GET | `/locations` | wms/location.ts |
| GET | `/locations/status` | wms/location.ts |
| GET | `/outbound-orders` | wms/outbound.ts |
| GET | `/serial-numbers` | wms/serialNumber.ts |
| GET | `/serial-numbers/statistics` | wms/serialNumber.ts |
| GET | `/smart-replenishment/orders` | wms/replenishment.ts |
| GET | `/smart-replenishment/safety-stock` | wms/replenishment.ts |
| GET | `/smart-replenishment/statistics` | wms/replenishment.ts |
| GET | `/smart-replenishment/suggestions` | wms/replenishment.ts |
| GET | `/stock-takes` | wms/stocktake.ts |
| GET | `/sync-records` | wms/sync.ts |
| GET | `/sync-records/statistics` | wms/sync.ts |
| GET | `/transfers` | wms/transfer.ts |
| GET | `/warehouses` | wms/warehouse.ts |
| GET | `/wave-picks` | wms/outbound.ts |
| POST | `/batches` | wms/batch.ts |
| POST | `/inbound-orders` | wms/inbound.ts |
| POST | `/inventory` | wms/inventory.ts |
| POST | `/inventory-alerts/rules` | wms/inventory.ts |
| POST | `/locations` | wms/location.ts |
| POST | `/locations/batch` | wms/location.ts |
| POST | `/locations/batch-delete` | wms/location.ts |
| POST | `/outbound-orders` | wms/outbound.ts |
| POST | `/serial-numbers` | wms/serialNumber.ts |
| POST | `/serial-numbers/bulk` | wms/serialNumber.ts |
| POST | `/smart-replenishment/orders` | wms/replenishment.ts |
| POST | `/smart-replenishment/safety-stock/batch-update` | wms/replenishment.ts |
| POST | `/smart-replenishment/safety-stock/calculate` | wms/replenishment.ts |
| POST | `/smart-replenishment/suggestions/generate` | wms/replenishment.ts |
| POST | `/stock-takes` | wms/stocktake.ts |
| POST | `/sync/scm` | wms/sync.ts |
| POST | `/sync/scm/inventory` | wms/sync.ts |
| POST | `/sync/scm/orders` | wms/sync.ts |
| POST | `/transfers` | wms/transfer.ts |
| POST | `/warehouses` | wms/warehouse.ts |
| POST | `/wave-picks` | wms/outbound.ts |
| PUT | `/locations/batch` | wms/location.ts |

## bi 服务差距详情

- **后端服务**: analytics
- **缺失端点数**: 51

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/analytics/development` | bi/analytics.ts |
| GET | `/analytics/laboratory` | bi/analytics.ts |
| GET | `/analytics/overview` | bi/analytics.ts |
| GET | `/analytics/production` | bi/analytics.ts |
| GET | `/analytics/quality` | bi/analytics.ts |
| GET | `/analytics/report` | bi/report.ts |
| GET | `/analytics/summary` | bi/analytics.ts |
| GET | `/comparison-analysis` | bi/comparison.ts |
| GET | `/dashboard` | bi/dashboard.ts |
| GET | `/dashboard/public` | bi/dashboard.ts |
| GET | `/dashboard/template` | bi/dashboard.ts |
| GET | `/data-sources` | bi/dataSource.ts |
| GET | `/datasets` | bi/dataset.ts |
| GET | `/ehs/incident-trend` | bi/analytics.ts |
| GET | `/ehs/risk-distribution` | bi/analytics.ts |
| GET | `/ehs/summary` | bi/analytics.ts |
| GET | `/lims/instrument-usage` | bi/analytics.ts |
| GET | `/lims/sample-status-distribution` | bi/analytics.ts |
| GET | `/lims/sample-timeline` | bi/analytics.ts |
| GET | `/lims/summary` | bi/analytics.ts |
| GET | `/lims/test-pass-rate` | bi/analytics.ts |
| GET | `/pdm/batch-status-distribution` | bi/analytics.ts |
| GET | `/pdm/production-trend` | bi/analytics.ts |
| GET | `/pdm/summary` | bi/analytics.ts |
| GET | `/permissions/check` | bi/permission.ts |
| GET | `/permissions/data` | bi/permission.ts |
| GET | `/permissions/row-level` | bi/permission.ts |
| GET | `/qms/issue-distribution` | bi/analytics.ts |
| GET | `/qms/quality-trend` | bi/analytics.ts |
| GET | `/qms/summary` | bi/analytics.ts |
| GET | `/rs/experiment-success-rate` | bi/analytics.ts |
| GET | `/rs/material-usage` | bi/analytics.ts |
| GET | `/rs/project-ranking` | bi/analytics.ts |
| GET | `/rs/project-timeline` | bi/analytics.ts |
| GET | `/rs/summary` | bi/analytics.ts |
| GET | `/srm/order-timeline` | bi/analytics.ts |
| GET | `/srm/summary` | bi/analytics.ts |
| GET | `/srm/supplier-ranking` | bi/analytics.ts |
| GET | `/sync-records` | bi/sync.ts |
| GET | `/widget` | bi/widget.ts |
| POST | `/analytics/report` | bi/report.ts |
| POST | `/comparison-analysis` | bi/comparison.ts |
| POST | `/dashboard` | bi/dashboard.ts |
| POST | `/dashboard/template` | bi/dashboard.ts |
| POST | `/data-sources` | bi/dataSource.ts |
| POST | `/datasets` | bi/dataset.ts |
| POST | `/datasets/query` | bi/dataset.ts |
| POST | `/permissions/data` | bi/permission.ts |
| POST | `/permissions/row-level` | bi/permission.ts |
| POST | `/sync-records` | bi/sync.ts |
| POST | `/widget` | bi/widget.ts |

## lims 服务差距详情

- **后端服务**: lims
- **缺失端点数**: 40

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| DELETE | `/samples/batch` | lims/sample.ts |
| GET | `/barcodes/types` | lims/barcode.ts |
| GET | `/collection-tasks` | lims/collection.ts |
| GET | `/instrument-data` | lims/instrument.ts |
| GET | `/instrument-data/statistics` | lims/instrument.ts |
| GET | `/lifecycle-stages` | lims/sample.ts |
| GET | `/method-categories` | lims/testMethod.ts |
| GET | `/method-validations` | lims/testMethod.ts |
| GET | `/parse-rules` | lims/collection.ts |
| GET | `/print-config` | lims/barcode.ts |
| GET | `/print-config/default` | lims/barcode.ts |
| GET | `/reagents/expiring` | lims/reagent.ts |
| GET | `/reagents/low-stock` | lims/reagent.ts |
| GET | `/rfid-tags` | lims/barcode.ts |
| GET | `/statistics` | lims/index.ts |
| GET | `/sync-records` | lims/sync.ts |
| POST | `/barcodes/generate` | lims/barcode.ts |
| POST | `/barcodes/print` | lims/barcode.ts |
| POST | `/collection-tasks` | lims/collection.ts |
| POST | `/instrument-data` | lims/instrument.ts |
| POST | `/instrument-data/parse/test` | lims/instrument.ts |
| POST | `/maintenance` | lims/instrument.ts |
| POST | `/method-categories` | lims/testMethod.ts |
| POST | `/method-validations` | lims/testMethod.ts |
| POST | `/parse-rules` | lims/collection.ts |
| POST | `/pt-corrective-actions` | lims/proficiencyTesting.ts |
| POST | `/pt-evaluations` | lims/proficiencyTesting.ts |
| POST | `/pt-results` | lims/proficiencyTesting.ts |
| POST | `/pt-samples/receive` | lims/proficiencyTesting.ts |
| POST | `/rfid-tags` | lims/barcode.ts |
| POST | `/rfid-tags/assign` | lims/barcode.ts |
| POST | `/samples/batch` | lims/sample.ts |
| POST | `/samples/import` | lims/sample.ts |
| POST | `/samples/lifecycle-event` | lims/sample.ts |
| POST | `/sync/reagent-to-ehs` | lims/sync.ts |
| POST | `/sync/record-to-qms` | lims/sync.ts |
| POST | `/uncertainty-components` | lims/uncertainty.ts |
| POST | `/uncertainty-sources` | lims/uncertainty.ts |
| POST | `/uncertainty/type-a` | lims/uncertainty.ts |
| POST | `/uncertainty/type-b` | lims/uncertainty.ts |

## scm 服务差距详情

- **后端服务**: scm
- **缺失端点数**: 37

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/audit-logs` | scm/auditLog.ts |
| GET | `/comparisons` | scm/priceComparison.ts |
| GET | `/dashboard/overview` | scm/supplyChainDashboard.ts |
| GET | `/dashboard/purchase-inbound-outbound` | scm/supplyChainDashboard.ts |
| GET | `/dashboard/supplier-performance` | scm/supplyChainDashboard.ts |
| GET | `/delivery-appointments` | scm/deliveryAppointment.ts |
| GET | `/delivery-appointments/stats` | scm/deliveryAppointment.ts |
| GET | `/evaluations` | scm/supplierEvaluation.ts |
| GET | `/incoming-inspections` | scm/incomingInspection.ts |
| GET | `/inventory-turnover` | scm/inventoryTurnover.ts |
| GET | `/inventory-turnover/abc-classification` | scm/inventoryTurnover.ts |
| GET | `/inventory-turnover/trend` | scm/inventoryTurnover.ts |
| GET | `/mrp-suggestions` | scm/mrpSuggestion.ts |
| GET | `/mrp-suggestions/summary` | scm/mrpSuggestion.ts |
| GET | `/mrp/suggestions` | scm/mrpPlan.ts |
| GET | `/purchase-contracts` | scm/purchaseContract.ts |
| GET | `/purchase-items` | scm/purchaseItem.ts |
| GET | `/purchase-orders` | scm/purchaseOrder.ts |
| GET | `/purchase-requisitions` | scm/purchaseRequisition.ts |
| GET | `/quotes` | scm/priceComparison.ts |
| GET | `/supplier-admissions` | scm/supplierAdmission.ts |
| GET | `/suppliers` | scm/supplier.ts |
| GET | `/sync-records` | scm/syncRecord.ts |
| POST | `/comparisons` | scm/priceComparison.ts |
| POST | `/delivery-appointments` | scm/deliveryAppointment.ts |
| POST | `/evaluations` | scm/supplierEvaluation.ts |
| POST | `/incoming-inspections` | scm/incomingInspection.ts |
| POST | `/inspection-records` | scm/inspectionRecord.ts |
| POST | `/mrp/suggestions` | scm/mrpPlan.ts |
| POST | `/purchase-contracts` | scm/purchaseContract.ts |
| POST | `/purchase-items` | scm/purchaseItem.ts |
| POST | `/purchase-orders` | scm/purchaseOrder.ts |
| POST | `/purchase-requisitions` | scm/purchaseRequisition.ts |
| POST | `/quotes` | scm/priceComparison.ts |
| POST | `/supplier-admissions` | scm/supplierAdmission.ts |
| POST | `/suppliers` | scm/supplier.ts |
| POST | `/sync-records` | scm/syncRecord.ts |

## crm 服务差距详情

- **后端服务**: crm
- **缺失端点数**: 36

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/billing` | crm/billing.ts |
| GET | `/collections/export` | crmFinance/index.ts |
| GET | `/contacts` | crm/contact.ts |
| GET | `/customer-scoring` | crm/scoring.ts |
| GET | `/customers` | crm/customer.ts |
| GET | `/interactions` | crm/interaction.ts |
| GET | `/invoices/export` | crmFinance/index.ts |
| GET | `/opportunities` | crm/opportunity.ts |
| GET | `/opportunities/forecast` | crm/opportunity.ts |
| GET | `/opportunities/funnel` | crm/opportunity.ts |
| GET | `/opportunities/stats` | crm/opportunity.ts |
| GET | `/recommendations` | crm/segmentation.ts |
| GET | `/reports/overdue-receivables` | crmFinance/index.ts |
| GET | `/reports/receivable-aging` | crmFinance/index.ts |
| GET | `/reports/receivable-aging/export` | crmFinance/index.ts |
| GET | `/reports/receivable-summary` | crmFinance/index.ts |
| GET | `/sales-forecast` | crm/forecast.ts |
| GET | `/segments` | crm/segmentation.ts |
| GET | `/segments/auto` | crm/segmentation.ts |
| GET | `/tags` | crm/customer.ts |
| POST | `/billing` | crm/billing.ts |
| POST | `/contacts` | crm/contact.ts |
| POST | `/contacts/batch-delete` | crm/contact.ts |
| POST | `/customer-scoring` | crm/scoring.ts |
| POST | `/customer-scoring/calculate` | crm/scoring.ts |
| POST | `/customers` | crm/customer.ts |
| POST | `/customers/batch-delete` | crm/customer.ts |
| POST | `/interactions` | crm/interaction.ts |
| POST | `/interactions/batch-delete` | crm/interaction.ts |
| POST | `/opportunities` | crm/opportunity.ts |
| POST | `/opportunities/batch-delete` | crm/opportunity.ts |
| POST | `/recommendations` | crm/segmentation.ts |
| POST | `/sales-forecast` | crm/forecast.ts |
| POST | `/sales-forecast/generate` | crm/forecast.ts |
| POST | `/segments` | crm/segmentation.ts |
| POST | `/tags` | crm/customer.ts |

## integration 服务差距详情

- **后端服务**: integration
- **缺失端点数**: 32

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/conversion-rules` | integration/conversionRule.ts |
| GET | `/erp/connections` | integration/connection.ts |
| GET | `/events` | integration/sync.ts |
| GET | `/external-erp/connections` | external-erp/connection.ts |
| GET | `/external-erp/sync-logs` | external-erp/syncLogs.ts |
| GET | `/lims-qms` | integration/sync.ts |
| GET | `/mes-erp` | integration/sync.ts |
| GET | `/rules` | integration/conversionRule.ts |
| GET | `/stats` | integration/sync.ts |
| GET | `/sync-stats` | integration/sync.ts |
| GET | `/sync-stats/history` | integration/sync.ts |
| GET | `/wms-scm` | integration/sync.ts |
| POST | `/conversion-rules` | integration/conversionRule.ts |
| POST | `/erp/connections` | integration/connection.ts |
| POST | `/erp/connections/test` | integration/connection.ts |
| POST | `/erp/mappings` | integration/mapping.ts |
| POST | `/events` | integration/sync.ts |
| POST | `/external-erp/connections` | external-erp/connection.ts |
| POST | `/external-erp/connections/test` | external-erp/connection.ts |
| POST | `/external-erp/sync/accounts` | external-erp/sync.ts |
| POST | `/external-erp/sync/customers` | external-erp/sync.ts |
| POST | `/external-erp/sync/departments` | external-erp/sync.ts |
| POST | `/external-erp/sync/employees` | external-erp/sync.ts |
| POST | `/external-erp/sync/full` | external-erp/sync.ts |
| POST | `/external-erp/sync/invoices` | external-erp/sync.ts |
| POST | `/external-erp/sync/projects` | external-erp/sync.ts |
| POST | `/external-erp/sync/suppliers` | external-erp/sync.ts |
| POST | `/external-erp/sync/vouchers` | external-erp/sync.ts |
| POST | `/lims-qms` | integration/sync.ts |
| POST | `/mes-erp` | integration/sync.ts |
| POST | `/rules` | integration/conversionRule.ts |
| POST | `/wms-scm` | integration/sync.ts |

## mes 服务差距详情

- **后端服务**: mes
- **缺失端点数**: 29

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/equipment/statistics` | mes/equipment.ts |
| GET | `/kanban/dashboard` | mes/productionKanban.ts |
| GET | `/kanban/equipment-status` | mes/productionKanban.ts |
| GET | `/kanban/workstation-status` | mes/productionKanban.ts |
| GET | `/wips/statistics` | mes/wip.ts |
| POST | `/boms` | mes/material.ts |
| POST | `/equipment` | mes/equipment.ts |
| POST | `/equipment-oee` | mes/equipment.ts |
| POST | `/inspections` | mes/equipment.ts |
| POST | `/maintenances` | mes/equipment.ts |
| POST | `/material-issues` | mes/material.ts |
| POST | `/material-requirements` | mes/materialRequirement.ts |
| POST | `/material-returns` | mes/material.ts |
| POST | `/orders` | mes/productionOrder.ts |
| POST | `/orders/from-erp` | mes/productionOrder.ts |
| POST | `/process-flows` | mes/processFlow.ts |
| POST | `/process-routes` | mes/process.ts |
| POST | `/processes` | mes/productionProcess.ts |
| POST | `/quality/inspections` | mes/quality.ts |
| POST | `/quality/patrols` | mes/quality.ts |
| POST | `/quality/standards` | mes/quality.ts |
| POST | `/records` | mes/productionRecord.ts |
| POST | `/schedules` | mes/productionSchedule.ts |
| POST | `/teams` | mes/team.ts |
| POST | `/wips` | mes/wip.ts |
| POST | `/wips/transfer` | mes/wip.ts |
| POST | `/work-orders` | mes/workOrder.ts |
| POST | `/work-reports` | mes/workReport.ts |
| POST | `/workstations` | mes/workStation.ts |

## ai 服务差距详情

- **后端服务**: ai
- **缺失端点数**: 24

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/dashboard/feature-usage` | ai/index.ts |
| GET | `/dashboard/stats` | ai/index.ts |
| GET | `/models` | ai/index.ts |
| GET | `/prompts/categories` | ai/index.ts |
| GET | `/vector/collections` | ai/vector.ts |
| POST | `/code/explain` | ai/code.ts |
| POST | `/code/fix-bug` | ai/code.ts |
| POST | `/code/generate` | ai/code.ts |
| POST | `/code/optimize` | ai/code.ts |
| POST | `/code/review` | ai/code.ts |
| POST | `/conversations` | ai/chat.ts |
| POST | `/documents` | ai/documents.ts |
| POST | `/prompts/templates` | ai/index.ts |
| POST | `/qa/ask` | ai/qa.ts |
| POST | `/qa/ask-conversation` | ai/qa.ts |
| POST | `/qa/ask-structured` | ai/qa.ts |
| POST | `/qa/ask-with-context` | ai/qa.ts |
| POST | `/qa/classify` | ai/qa.ts |
| POST | `/qa/feedback` | ai/qa.ts |
| POST | `/qa/history/batch-delete` | ai/qa.ts |
| POST | `/recommendations` | ai/recommendation.ts |
| POST | `/recommendations/feedback` | ai/recommendation.ts |
| POST | `/vector/collections` | ai/vector.ts |
| POST | `/vector/search` | ai/vector.ts |

## hrm 服务差距详情

- **后端服务**: hrm
- **缺失端点数**: 17

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| POST | `/attendance` | hrm/attendance.ts |
| POST | `/attendance/check-in` | hrm/attendance.ts |
| POST | `/attendance/check-out` | hrm/attendance.ts |
| POST | `/candidates` | hrm/recruitment.ts |
| POST | `/companies` | hrm/company.ts |
| POST | `/contracts` | hrm/contract.ts |
| POST | `/departments` | hrm/department.ts |
| POST | `/employees` | hrm/employee.ts |
| POST | `/interviews` | hrm/recruitment.ts |
| POST | `/job-openings` | hrm/recruitment.ts |
| POST | `/leaves` | hrm/leave.ts |
| POST | `/payroll-runs` | hrm/payroll.ts |
| POST | `/salary-adjustments` | hrm/payroll.ts |
| POST | `/training-courses` | hrm/training.ts |
| POST | `/training-plans` | hrm/training.ts |
| POST | `/training-records` | hrm/training.ts |
| POST | `/training-records/enroll` | hrm/training.ts |

## rs 服务差距详情

- **后端服务**: rs
- **缺失端点数**: 14

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| DELETE | `/materials/batch` | rs/material.ts |
| DELETE | `/projects/batch` | rs/project.ts |
| GET | `/statistics` | rs/statistics.ts |
| POST | `/bugs` | rs/bug.ts |
| POST | `/builds` | rs/build.ts |
| POST | `/deploys` | rs/deploy.ts |
| POST | `/experiments` | rs/experiment.ts |
| POST | `/formulas` | rs/formula.ts |
| POST | `/materials` | rs/material.ts |
| POST | `/materials/import` | rs/material.ts |
| POST | `/projects` | rs/project.ts |
| POST | `/projects/batch` | rs/project.ts |
| POST | `/projects/import` | rs/project.ts |
| POST | `/tests` | rs/test.ts |

## pm 服务差距详情

- **后端服务**: pm
- **缺失端点数**: 10

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/contract-templates` | pm/contract.ts |
| GET | `/contracts` | pm/contract.ts |
| GET | `/notification-types` | pm/notification.ts |
| GET | `/report-templates` | pm/report.ts |
| GET | `/statistics` | pm/dashboard.ts |
| POST | `/contract-templates` | pm/contract.ts |
| POST | `/contracts` | pm/contract.ts |
| POST | `/notifications` | pm/notification.ts |
| POST | `/projects` | pm/project.ts |
| POST | `/report-templates` | pm/report.ts |

## srm 服务差距详情

- **后端服务**: srm
- **缺失端点数**: 8

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/biddings` | srm/index.ts |
| GET | `/inquiries` | srm/index.ts |
| GET | `/performance/score-level-distribution` | srm/index.ts |
| GET | `/performance/top-suppliers` | srm/index.ts |
| GET | `/supplier-portal/announcements` | srm/index.ts |
| POST | `/biddings` | srm/index.ts |
| POST | `/inquiries` | srm/index.ts |
| POST | `/quotations` | srm/index.ts |

## iam 服务差距详情

- **后端服务**: unified-core
- **缺失端点数**: 6

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/auth/password-policy` | iam/auth.ts |
| GET | `/auth/security-settings` | iam/auth.ts |
| GET | `/auth/sessions` | iam/auth.ts |
| POST | `/access-logs` | permissionInterceptor.ts |
| PUT | `/auth/password-policy` | iam/auth.ts |
| PUT | `/auth/security-settings` | iam/auth.ts |

## mail 服务差距详情

- **后端服务**: unified-core
- **缺失端点数**: 6

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/emails/stats` | mail/index.ts |
| POST | `/emails` | mail/index.ts |
| POST | `/emails/resend` | mail/index.ts |
| POST | `/emails/send-with-template` | mail/index.ts |
| POST | `/templates` | mail/index.ts |
| POST | `/templates/render` | mail/index.ts |

## doc 服务差距详情

- **后端服务**: doc
- **缺失端点数**: 1

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| POST | `/templates` | template/index.ts |

## file 服务差距详情

- **后端服务**: unified-core
- **缺失端点数**: 1

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| POST | `/files/export` | file/index.ts |

## migration 服务差距详情

- **后端服务**: unified-core
- **缺失端点数**: 1

| 方法 | 路径 | 前端文件 |
|------|------|----------|
| GET | `/migrations/services` | migration/index.ts |
