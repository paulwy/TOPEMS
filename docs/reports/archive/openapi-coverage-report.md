# OpenAPI 覆盖率对照报告

> **生成时间**: 2026-08-14 02:10:47 | **阈值**: ≥95% | **总体**: ❌ FAIL

## 四服务覆盖率总览

| 服务 | #[utoipa::path] 宏数 | paths() 注册数 | 覆盖率 | 状态 | 未注册数 |
|------|------:|------:|------:|:----:|------:|
| erp | 397 | 208 | 52% | ❌ | 189 |
| finance | 494 | 433 | 88% | ❌ | 40 |
| wms | 204 | 112 | 55% | ❌ | 44 |
| analytics | 240 | 103 | 43% | ❌ | 80 |

## 详细信息

### erp — 52% ❌

- **openapi.rs**: `svc/erp/src/modules/openapi.rs`
- **#[utoipa::path] 宏数**: 397
- **paths() 注册数**: 208
- **未注册数**: 189

**未注册 handler 样本（前 10）:**

| operation_id | 文件 |
|------|------|
| fetch_entries_by_type | svc/erp/src/modules/addressbook.rs |
| log_audit_event | svc/erp/src/modules/audit.rs |
| export_elimination_worksheet | svc/erp/src/modules/consolidation/elimination_rules.rs |
| export_report | svc/erp/src/modules/consolidation/reports.rs |
| submit_report | svc/erp/src/modules/consolidation/reports.rs |
| preview_add_column | svc/erp/src/modules/db_structure.rs |
| execute_add_column | svc/erp/src/modules/db_structure.rs |
| execute_modify_column | svc/erp/src/modules/db_structure.rs |
| execute_drop_column | svc/erp/src/modules/db_structure.rs |
| list_dict_types | svc/erp/src/modules/dict.rs |

### finance — 88% ❌

- **openapi.rs**: `svc/finance/src/openapi.rs`
- **#[utoipa::path] 宏数**: 494
- **paths() 注册数**: 433
- **未注册数**: 40

**未注册 handler 样本（前 10）:**

| operation_id | 文件 |
|------|------|
| get_account | svc/finance/src/modules/mod.rs |
| get_account_by_code | svc/finance/src/modules/mod.rs |
| list_accounts | svc/finance/src/modules/mod.rs |
| create_voucher | svc/finance/src/modules/mod.rs |
| get_voucher | svc/finance/src/modules/mod.rs |
| submit_voucher | svc/finance/src/modules/mod.rs |
| approve_voucher | svc/finance/src/modules/mod.rs |
| post_voucher | svc/finance/src/modules/mod.rs |
| delete_voucher | svc/finance/src/modules/mod.rs |
| unpost_voucher | svc/finance/src/modules/mod.rs |

### wms — 55% ❌

- **openapi.rs**: `svc/wms/src/modules/openapi.rs`
- **#[utoipa::path] 宏数**: 204
- **paths() 注册数**: 112
- **未注册数**: 44

**未注册 handler 样本（前 10）:**

| operation_id | 文件 |
|------|------|
| get_expiring_soon | svc/wms/src/modules/batch.rs |
| get_expired | svc/wms/src/modules/batch.rs |
| adjust_quantity | svc/wms/src/modules/batch.rs |
| transfer_location | svc/wms/src/modules/batch.rs |
| outbound_to_shipping | svc/wms/src/modules/data_sync.rs |
| create_shipping_from_outbound | svc/wms/src/modules/data_sync.rs |
| create_inbound_from_scm | svc/wms/src/modules/data_sync.rs |
| get_sync_logs | svc/wms/src/modules/data_sync.rs |
| get_alert_summary | svc/wms/src/modules/inventory_alert.rs |
| get_alerts_by_warehouse | svc/wms/src/modules/inventory_alert.rs |

### analytics — 43% ❌

- **openapi.rs**: `svc/analytics/src/openapi.rs`
- **#[utoipa::path] 宏数**: 240
- **paths() 注册数**: 103
- **未注册数**: 80

**未注册 handler 样本（前 10）:**

| operation_id | 文件 |
|------|------|
| home | svc/analytics/src/main.rs |
| health | svc/analytics/src/main.rs |
| detailed_health | svc/analytics/src/main.rs |
| compat_home | svc/analytics/src/modules/analytics_compat.rs |
| compat_detailed_health | svc/analytics/src/modules/analytics_compat.rs |
| import_dashboard | svc/analytics/src/modules/bi/dashboard/crud.rs |
| export_dashboard | svc/analytics/src/modules/bi/dashboard/export.rs |
| export_dashboard_pdf | svc/analytics/src/modules/bi/dashboard/export.rs |
| export_dashboard_excel | svc/analytics/src/modules/bi/dashboard/export.rs |
| query_dashboard_realtime_data | svc/analytics/src/modules/bi/dashboard/realtime.rs |

---

*由 `scripts/audit/check-openapi-coverage.mjs` 自动生成*
