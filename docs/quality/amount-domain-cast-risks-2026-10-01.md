# 金额域数值转换风险点清单（finance / erp / srm）

> 来源：cargo clippy 强制开启数值安全 lint（as_conversions / cast_precision_loss / cast_possible_truncation / cast_possible_wrap / cast_sign_loss），按 (文件,消息) 去重。
> 修复原则：`as` → `try_from`/`From` 或显式 `saturating_*`/`wrapping_*`；cast 按业务语义选择，禁止机械替换。金额计算路径优先。

## finance（101 条）

| 文件 | lint | 消息 |
|---|---|---|
| svc/finance/src/domain/aggregate_repository | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/domain/async_projector | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/finance/src/domain/async_projector | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/finance/src/domain/async_projector | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/finance/src/domain/async_projector | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/domain/cqrs | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/domain/materialized_view | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/finance/src/domain/materialized_view | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/finance/src/domain/materialized_view | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/finance/src/domain/materialized_view | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/domain/pg_event_store | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/finance/src/domain/pg_event_store | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/finance/src/domain/pg_event_store | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/finance/src/domain/pg_event_store | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/finance/src/domain/pg_event_store | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/finance/src/domain/pg_event_store | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/finance/src/domain/pg_event_store | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/finance/src/domain/pg_event_store | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/finance/src/domain/pg_event_store | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/audit_v52 | `cast_sign_loss` | casting `f64` to `usize` may lose the sign of the value |
| svc/finance/src/modules/audit_v52 | `cast_possible_truncation` | casting `f64` to `usize` may truncate the value |
| svc/finance/src/modules/audit_v52 | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/finance/src/modules/audit_v52 | `cast_possible_truncation` | casting `i64` to `i32` may truncate the value |
| svc/finance/src/modules/audit_v52 | `cast_sign_loss` | casting `i64` to `u32` may lose the sign of the value |
| svc/finance/src/modules/audit_v52 | `cast_possible_truncation` | casting `i64` to `u32` may truncate the value |
| svc/finance/src/modules/audit_v52 | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/finance/src/modules/audit_v52 | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/finance/src/modules/audit_v52 | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/compliance_v51 | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/finance/src/modules/compliance_v51 | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/finance/src/modules/compliance_v51 | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/decision_v60 | `cast_possible_truncation` | casting `f64` to `i32` may truncate the value |
| svc/finance/src/modules/decision_v60 | `cast_possible_truncation` | casting `f64` to `i64` may truncate the value |
| svc/finance/src/modules/decision_v60 | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/finance/src/modules/decision_v60 | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/financial_reports | `cast_sign_loss` | casting `i32` to `usize` may lose the sign of the value |
| svc/finance/src/modules/financial_reports | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/finance/src/modules/financial_reports | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/finance/src/modules/financial_reports | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/forecast_v53 | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/finance/src/modules/forecast_v53 | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/forecasting | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/finance/src/modules/forecasting | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/mod | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/finance/src/modules/mod | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/finance/src/modules/mod | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/finance/src/modules/mod | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/multi_dimensional | `cast_possible_truncation` | casting `f64` to `i64` may truncate the value |
| svc/finance/src/modules/multi_dimensional | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/finance/src/modules/multi_dimensional | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/finance/src/modules/multi_dimensional | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/finance/src/modules/multi_dimensional | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/operational | `cast_possible_truncation` | casting `i64` to `i32` may truncate the value |
| svc/finance/src/modules/operational | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/reconcile_orders | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/report_center | `cast_possible_truncation` | casting `f64` to `i64` may truncate the value |
| svc/finance/src/modules/report_center | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/reports_v57 | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/finance/src/modules/reports_v57 | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/finance/src/modules/reports_v57 | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/risk_v54 | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/finance/src/modules/risk_v54 | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/finance/src/modules/risk_v54 | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/finance/src/modules/risk_v54 | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/risk_v59 | `cast_possible_truncation` | casting `f64` to `i32` may truncate the value |
| svc/finance/src/modules/risk_v59 | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/finance/src/modules/risk_v59 | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/finance/src/modules/risk_v59 | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/finance/src/modules/risk_v59 | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/settlement_center/service | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/finance/src/modules/settlement_center/service | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/settlement_v55 | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/finance/src/modules/settlement_v55 | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/finance/src/modules/settlement_v55 | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/shared_services | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/finance/src/modules/shared_services | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/treasury_v58 | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/finance/src/modules/treasury_v58 | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/voucher_template | `cast_possible_truncation` | casting `f64` to `i128` may truncate the value |
| svc/finance/src/modules/voucher_template | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/modules/voucher_template_entries | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/finance/src/modules/voucher_template_entries | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/finance/src/modules/voucher_template_entries | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/services/finance/payment | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/finance/src/services/finance/payment | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/finance/src/services/finance/payment | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/services/finance/periods | `cast_sign_loss` | casting `i32` to `u32` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/finance/src/services/finance/periods | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/finance/src/services/finance/periods | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/finance/src/services/finance/periods | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/services/finance/reconciliation | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/finance/src/services/finance/reconciliation | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/services/finance/u8_import | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/finance/src/services/finance/u8_import | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/finance/src/services/finance/u8_import | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/services/finance/voucher | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/finance/src/services/finance/voucher | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/finance/src/services/finance/voucher | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/finance/src/services/finance/voucher_template | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/finance/src/services/finance/voucher_template | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/finance/src/services/finance/voucher_template | `as_conversions` | using a potentially dangerous silent `as` conversion |

## erp（157 条）

| 文件 | lint | 消息 |
|---|---|---|
| svc/erp/src/bin/erp-e2e-cli | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/addressbook | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/addressbook | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/consolidation/internal_transactions | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/consolidation/internal_transactions | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/dict | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/dict | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/dict | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/dict | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/fixed_asset | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_assets | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_assets | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_assets | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_assets | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_audit | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_audit | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_catalog | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/master_data_catalog | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_catalog | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_catalog | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_catalog | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_classification | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_classification | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_classification | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_compliance_audit | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/master_data_compliance_audit | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_compliance_audit | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_compliance_audit | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_conflict | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_conflict | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_crud | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_crud | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_dashboard | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_dashboard | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_dashboard | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_dashboard | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_dashboard | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_gateway | `cast_precision_loss` | casting `u64` to `f64` may cause a loss of precision (`u64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_gateway | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_governance | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_governance | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_governance | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_graph | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/master_data_graph | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_graph | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_graph | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_graph | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_graphql | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/master_data_graphql | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_graphql | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_graphql | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_graphql | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_lifecycle | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_lifecycle | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_lineage | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_lineage | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_lineage_impact | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_lineage_impact | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_lineage_impact | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_lineage_impact | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_matching | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/master_data_matching | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_matching | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_matching | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_matching | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_maturity | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_maturity | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_metadata | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/master_data_metadata | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_metadata | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_quality_ai | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_quality_ai | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/master_data_quality_ai | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_quality_ai | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_quality_ai | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_quality_ai | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_quality_loop | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_quality_loop | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/master_data_quality_loop | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_quality_loop | `cast_precision_loss` | casting `u64` to `f64` may cause a loss of precision (`u64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_quality_loop | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_quality_loop | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_quality_loop | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_quality_loop | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_quality_loop | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_quality_rules | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_quality_rules | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_quality_rules | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_quality_rules | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_quality_rules | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_quality_rules | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/erp/src/modules/master_data_quality_rules | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/erp/src/modules/master_data_quality_rules | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/erp/src/modules/master_data_quality_rules | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/erp/src/modules/master_data_quality_rules | `cast_possible_wrap` | casting `u64` to `i64` may wrap around the value: help: if this is intentional, use `cast_signed()` instead: ` |
| svc/erp/src/modules/master_data_quality_rules | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_quality_rules | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_quality_trend | `cast_sign_loss` | casting `f64` to `u64` may lose the sign of the value |
| svc/erp/src/modules/master_data_quality_trend | `cast_possible_truncation` | casting `f64` to `u64` may truncate the value |
| svc/erp/src/modules/master_data_quality_trend | `cast_sign_loss` | casting `i32` to `u64` may lose the sign of the value |
| svc/erp/src/modules/master_data_quality_trend | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_quality_trend | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_quality_trend | `cast_sign_loss` | casting `i64` to `u64` may lose the sign of the value: help: if this is intentional, use `cast_unsigned()` ins |
| svc/erp/src/modules/master_data_quality_trend | `cast_precision_loss` | casting `u64` to `f64` may cause a loss of precision (`u64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_quality_trend | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_sync | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_sync | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/master_data_sync | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_sync | `cast_precision_loss` | casting `u64` to `f64` may cause a loss of precision (`u64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/master_data_sync | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/erp/src/modules/master_data_sync | `cast_possible_truncation` | casting `usize` to `i32` may truncate the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_sync | `cast_possible_wrap` | casting `usize` to `i32` may wrap around the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_sync | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_sync | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_sync_v2 | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/master_data_sync_v2 | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/master_data_sync_v2 | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_sync_v2 | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/master_data_version | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/master_data_version | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/mdm_v49_archive | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/mdm_v49_archive | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/mdm_v49_archive | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/mdm_v49_archive | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/mdm_v49_lifecycle | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/mdm_v49_lifecycle | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/mdm_v49_lifecycle | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/mdm_v49_lifecycle | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/mdm_v49_retirement | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/mdm_v49_retirement | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/mdm_v49_retirement | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/mdm_v49_retirement | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/mdm_v49_stats | `cast_possible_wrap` | casting `usize` to `i64` may wrap around the value on targets with 64-bit wide pointers |
| svc/erp/src/modules/mdm_v49_stats | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/order_calc | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/erp/src/modules/order_calc | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/modules/search | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/erp/src/modules/search | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/erp/src/modules/search | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/services/erp_adapter/kingdee_adapter | `cast_possible_truncation` | casting `i64` to `i32` may truncate the value |
| svc/erp/src/services/erp_adapter/kingdee_adapter | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/services/erp_adapter/sap_adapter | `cast_possible_truncation` | casting `i64` to `i32` may truncate the value |
| svc/erp/src/services/erp_adapter/sap_adapter | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/erp/src/services/erp_adapter/yonyou_adapter | `cast_possible_truncation` | casting `i64` to `i32` may truncate the value |
| svc/erp/src/services/erp_adapter/yonyou_adapter | `as_conversions` | using a potentially dangerous silent `as` conversion |

## srm（18 条）

| 文件 | lint | 消息 |
|---|---|---|
| svc/srm/src/modules/bid_price | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/srm/src/modules/bid_price | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/srm/src/modules/scoring_dimension | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/srm/src/modules/scoring_dimension | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/srm/src/modules/statistics | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/srm/src/modules/statistics | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/srm/src/modules/supplier | `cast_sign_loss` | casting `i64` to `usize` may lose the sign of the value |
| svc/srm/src/modules/supplier | `cast_possible_truncation` | casting `i64` to `usize` may truncate the value on targets with 32-bit wide pointers |
| svc/srm/src/modules/supplier | `cast_possible_truncation` | casting `usize` to `u32` may truncate the value on targets with 64-bit wide pointers |
| svc/srm/src/modules/supplier | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/srm/src/modules/supplier_evaluation | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/srm/src/modules/supplier_evaluation | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/srm/src/modules/supplier_evaluation | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/srm/src/modules/supplier_performance | `cast_precision_loss` | casting `i64` to `f64` may cause a loss of precision (`i64` is 64 bits wide, but `f64`'s mantissa is only 52 b |
| svc/srm/src/modules/supplier_performance | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/srm/src/modules/supplier_performance | `as_conversions` | using a potentially dangerous silent `as` conversion |
| svc/srm/src/shared/util | `cast_precision_loss` | casting `usize` to `f64` may cause a loss of precision (`usize` can be up to 64 bits wide depending on the tar |
| svc/srm/src/shared/util | `as_conversions` | using a potentially dangerous silent `as` conversion |
