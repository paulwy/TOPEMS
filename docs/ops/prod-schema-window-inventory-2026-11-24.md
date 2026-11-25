# 生产 schema 追赶窗口：81 条迁移只读清单（2026-11-24）

> 用途：为 21:00–22:30（CST）窗口排期提供逐条依据。本文只读盘点，不含执行动作；
> 执行口径以 `docs/ops/prod-schema-window-plan-2026-11-24.md` §4/§5 为准。

## 1. 核对结论

- 白名单 81 条：仓库存在 81/81，已应用 0 条，缺失 0 条；与 §5 `ALL` 逐条一致。
- 排除 `20261124170000`（B261，随 `fde231ef9` 进入仓库，不在 `642ca90db`；本窗口不应用）。
- 登记：81 条全部出现在 `migration_manifest.yaml` 与 `database/checksums.txt`。
- 回滚件：80/81 存在；**`20261123130000_hrm_contracts_status_canonical` 缺回滚件**。
- 破坏性：16 条，全部需 `--allow-destructive` + 票据；无 `CREATE INDEX CONCURRENTLY`，均可事务内执行。
- 差异总览：仓库 863 条 / 生产账本 721 条 / 未入账 142 条 = 81（anchor 上）+ 60（anchor 下）+ 1（B261，排除）。

## 2. 81 条清单（按日分组）

### 2026-11-19（21 条）

| # | 版本 | 迁移 | 类型 | 关键对象/操作 | 票据/闸门 | 回滚 |
|---|---|---|---|---|---|---|
| 1 | `20261119010000` | iam_resource_permissions_role_grants（窗口首条） | DDL+DML | iam.resource_permissions | — | ✓ |
| 2 | `20261119100000` | drop_dead_tables_batch1（删表 batch-1） | 破坏性+DDL+DML+守卫 | archive._drop_manifest、archive._rls_policy_snapshot、archive._fk_snapshot | DEAD-TABLE-20261119 / batch-1 | ✓ |
| 3 | `20261119110000` | drop_dead_tables_batch2（删表 batch-2） | 破坏性+DDL+DML+守卫 | bi.audit_logs、archive._drop_manifest、archive._rls_policy_snapshot | DEAD-TABLE-20261119 / batch-2 | ✓ |
| 4 | `20261119120000` | erp_sales_order_items | RLS+DDL+守卫 | erp.sales_order_items | — | ✓ |
| 5 | `20261119130000` | rls_normalize_batch1_drop_duplicate_legacy | DML+守卫 | 动态操作，见原文件 | — | ✓ |
| 6 | `20261119131000` | rls_normalize_batch2_rename_legacy | RLS+DML+守卫 | 动态操作，见原文件 | — | ✓ |
| 7 | `20261119140000` | iam_core_tenant_plugins_rls_strict_forward | RLS+DDL+守卫 | iam.core_tenant_plugins | — | ✓ |
| 8 | `20261119141000` | rls_intentional_policies_guard | 守卫 | 动态操作，见原文件 | — | ✓ |
| 9 | `20261119150000` | pdm_master_data_refs_rls_strict_forward | RLS+DDL+守卫 | pdm.pdm_master_data_refs | — | ✓ |
| 10 | `20261119151000` | mobile_oa_announcement_reads_tenant_rls | RLS+DDL+DML+守卫 | mobile.oa_announcement_reads | — | ✓ |
| 11 | `20261119160000` | drop_zero_path_legacy_tables | 破坏性+DDL+DML+守卫 | archive._drop_manifest、archive._rls_policy_snapshot、archive._fk_snapshot | ZERO-PATH-20261119 | ✓ |
| 12 | `20261119161000` | zero_path_retained_tables_policy_fix | RLS+DDL+DML+守卫 | core.core_tenant_plugins、portal.user_preferences、iam.roles | — | ✓ |
| 13 | `20261119170000` | seed_core_plugin_categories | DML | 动态操作，见原文件 | — | ✓ |
| 14 | `20261119180000` | archive_legacy_schema_copies | 破坏性+DDL+DML+守卫 | archive._drop_manifest、archive._rls_policy_snapshot、archive._fk_snapshot | LEGACY-COPY-20261119 | ✓ |
| 15 | `20261119190000` | finance_u8_import_records_create | RLS+DDL+DML+守卫 | finance.finance_u8_import_records | — | ✓ |
| 16 | `20261119190100` | finance_u8_import_records_status_relax | DDL+守卫 | finance.finance_u8_import_records | — | ✓ |
| 17 | `20261119200000` | unblock_and_archive_legacy_tenant_tables | 破坏性+DDL+DML+守卫 | iam.core_tenant_plugins、archive._drop_manifest、archive._rls_policy_snapshot | TENANT-UNBLOCK-20261119 | ✓ |
| 18 | `20261119210000` | rls_normalize_erp_consolidation_policy_rename | DML+守卫 | 动态操作，见原文件 | — | ✓ |
| 19 | `20261119220000` | iam_resource_acl_read_permission | DML | 动态操作，见原文件 | — | ✓ |
| 20 | `20261119230000` | rls_dedupe_finance_u8_import_records_policy | DML+守卫 | 动态操作，见原文件 | — | ✓ |
| 21 | `20261119233000` | iam_legacy_permission_convergence | 破坏性+DML | public.core_role_permissions、public.core_permissions | IAM-PERM-20261119 | ✓ |

### 2026-11-20（19 条）

| # | 版本 | 迁移 | 类型 | 关键对象/操作 | 票据/闸门 | 回滚 |
|---|---|---|---|---|---|---|
| 1 | `20261120090000` | mes_column_typmod_align | DDL | 动态操作，见原文件 | — | ✓ |
| 2 | `20261120100000` | menu_crm_permission_alias_fix | DML | public.core_menus、iam.core_menus | — | ✓ |
| 3 | `20261120110000` | ai_schema_canonical | RLS+DDL+DML | ai.documents、ai.document_chunks、ai.qa_history | — | ✓ |
| 4 | `20261120120000` | ai_drop_duplicate_chunk_document_idx | 其它 | 动态操作，见原文件 | — | ✓ |
| 5 | `20261120130000` | tms_schema_canonical | RLS+DDL | tms.tms_vehicles、tms.tms_drivers、tms.tms_carriers | — | ✓ |
| 6 | `20261120140000` | master_data_schema_canonical | RLS+DDL | master_data.materials、master_data.uoms、master_data.samples | — | ✓ |
| 7 | `20261120150000` | ticket_schema_canonical | RLS+DDL | ticket.core_tickets、ticket.core_ticket_comments、ticket.core_ticket_activities | — | ✓ |
| 8 | `20261120160000` | plugin_registry_schema_canonical | RLS+DDL | core.core_plugins、core.core_plugin_instances、core.core_plugin_permissions | — | ✓ |
| 9 | `20261120170000` | finance_schema_canonical | RLS+DDL | finance.core_finance_accounts、finance.core_finance_aux_accounts、finance.core_finance_aux_balances | — | ✓ |
| 10 | `20261120180000` | portal_schema_canonical | DDL | portal.core_faqs、portal.core_guide_lessons、portal.core_guide_progress | — | ✓ |
| 11 | `20261120190000` | ehs_schema_canonical | RLS+DDL | ehs.qa_ehs_accidents、ehs.qa_ehs_compliance_evaluations、ehs.qa_ehs_contraindications | — | ✓ |
| 12 | `20261120200000` | lims_schema_canonical | RLS+DDL | lims.qa_lab_calibration_records、lims.qa_lab_instruments、lims.qa_lab_processes | — | ✓ |
| 13 | `20261120210000` | wms_schema_canonical | RLS+DDL | wms.inbound_orders、wms.inventory、wms.outbound_orders | — | ✓ |
| 14 | `20261120220000` | wms_drop_resurrected_dead_tables | 破坏性+DDL+守卫 | 动态操作，见原文件 | W2-D2-WMS-20261120 | ✓ |
| 15 | `20261120230000` | qms_schema_canonical | RLS+DDL | qms.qa_alert_messages、qms.qa_alert_rules、qms.qa_apqp_approvals | — | ✓ |
| 16 | `20261120235900` | hrm_schema_canonical | RLS+DDL | hrm.companies、hrm.contracts、hrm.departments | — | ✓ |
| 17 | `20261120235930` | hrm_drop_resurrected_dead_tables | 破坏性+DDL+守卫 | 动态操作，见原文件 | W2-D2-HRM-20261120 | ✓ |
| 18 | `20261120235945` | unified_core_schema_canonical | RLS+DDL | public.core_api_version_configs、public.core_file_permissions、public.core_files | — | ✓ |
| 19 | `20261120235950` | unified_core_drop_resurrected_dead_tables | 破坏性+DDL+守卫 | public.core_file_folders | W2-D2-UC-20261120 | ✓ |

### 2026-11-21（21 条）

| # | 版本 | 迁移 | 类型 | 关键对象/操作 | 票据/闸门 | 回滚 |
|---|---|---|---|---|---|---|
| 1 | `20261121090000` | scm_schema_canonical | RLS+DDL | scm.purchase_contract_items、scm.purchase_inquiries、scm.purchase_inquiry_items | — | ✓ |
| 2 | `20261121100000` | erp_schema_canonical | RLS+DDL | erp.asset_categories、erp.bank_accounts、erp.customers | — | ✓ |
| 3 | `20261121110000` | mobile_schema_canonical | RLS+DDL | mobile.core_mobile_offline_records、mobile.mobile_push_notifications、mobile.push_devices | — | ✓ |
| 4 | `20261121111000` | mobile_drop_resurrected_dead_tables | 破坏性+DDL+守卫 | mobile.mobile_leave_applications | W2-D2-MOBILE-20261121 | ✓ |
| 5 | `20261121120000` | gis_schema_canonical | RLS+DDL | gis.business_locations、gis.device_location_records、gis.device_locations | — | ✓ |
| 6 | `20261121130000` | pm_schema_canonical | RLS+DDL | pm.budgets、pm.project_benefits、pm.project_members | — | ✓ |
| 7 | `20261121131000` | pm_drop_resurrected_dead_tables | 破坏性+DDL+守卫 | pm.pm_master_data_refs | W2-D2-PM-20261121 | ✓ |
| 8 | `20261121140000` | pdm_schema_canonical | RLS+DDL | pdm.pdm_bom_items、pdm.pdm_boms、pdm.pdm_change_notices | — | ✓ |
| 9 | `20261121150000` | srm_schema_canonical | RLS+DDL | srm.supplier_performance、srm.suppliers、srm.audit_logs | — | ✓ |
| 10 | `20261121160000` | mes_schema_canonical | RLS+DDL | mes.audit_logs、mes.equipment、mes.equipment_inspection_records | — | ✓ |
| 11 | `20261121170000` | crm_schema_canonical | RLS+DDL | crm.contacts、crm.customer_orders、crm.customer_tags | — | ✓ |
| 12 | `20261121180000` | integration_schema_canonical | RLS+DDL | integration.conversion_executions、integration.conversion_rules、integration.mes_qms_sync | — | ✓ |
| 13 | `20261121190000` | rd_schema_canonical | RLS+DDL | rs.project_phases、rs.projects、rs.change_orders | — | ✓ |
| 14 | `20261121200000` | analytics_schema_canonical | RLS+DDL | bi.report_schedules、bi.report_templates、bi.reports | — | ✓ |
| 15 | `20261121201000` | analytics_drop_resurrected_dead_tables | 破坏性+DDL+守卫 | bi.audit_logs | W2-D2-ANALYTICS-20261121 | ✓ |
| 16 | `20261121210000` | communication_schema_canonical | DDL | communication.core_location_messages | — | ✓ |
| 17 | `20261121220000` | finance_opening_balances_move | DDL+守卫 | erp.opening_balances | — | ✓ |
| 18 | `20261121230000` | w5c_hrm_drop_redundant_organization_id | 破坏性+DDL+守卫 | hrm.departments、hrm.employees、hrm.positions | W5C-ORG-HRM-20261121 | ✓ |
| 19 | `20261121235900` | w5c_wms_audit_inbound_drop_organization_id | 破坏性+DDL+守卫 | wms.audit_logs、wms.inbound_orders | W5C-ORG-WMS-20261121 | ✓ |
| 20 | `20261121235930` | w5c_hrm_init_status_drop_organization_id | 破坏性+DDL+守卫 | hrm.initialization_status | W5C-ORG-HRM-INIT-20261121 | ✓ |
| 21 | `20261121235940` | erp_consolidation_company_rls（W9 策略快照） | RLS+DDL+DML+守卫 | erp.consolidation_scopes、erp.consolidation_reports、erp.consolidation_report_lines | — | ✓ |

### 2026-11-22（4 条）

| # | 版本 | 迁移 | 类型 | 关键对象/操作 | 票据/闸门 | 回滚 |
|---|---|---|---|---|---|---|
| 1 | `20261122090000` | core_user_company_scopes_is_default（is_default（本次500根因）） | DDL+DML | public.core_user_company_scopes | — | ✓ |
| 2 | `20261122100000` | mes_production_orders_quantity_finalize_bigint | DDL+守卫 | mes.production_orders | — | ✓ |
| 3 | `20261122150000` | public_approval_workflow_tenant_isolation | RLS+DDL+DML+守卫 | public.approvals、public.approval_records、public.core_workflow_instances | — | ✓ |
| 4 | `20261122160000` | mes_erp_sync_mes_order_id_nullable | DDL+守卫 | integration.mes_erp_sync | — | ✓ |

### 2026-11-23（9 条）

| # | 版本 | 迁移 | 类型 | 关键对象/操作 | 票据/闸门 | 回滚 |
|---|---|---|---|---|---|---|
| 1 | `20261123090000` | core_tenant_modules_company_scope | RLS+DDL+DML+守卫 | public.core_tenant_modules | — | ✓ |
| 2 | `20261123100000` | core_inter_module_sync_company_scope | RLS+DDL+DML+守卫 | integration.core_inter_module_sync | — | ✓ |
| 3 | `20261123110000` | monitor_settings_company_scope | RLS+DDL+DML+守卫 | public.monitor_settings | — | ✓ |
| 4 | `20261123120000` | system_settings_company_scope | RLS+DDL+DML+守卫 | public.system_settings | — | ✓ |
| 5 | `20261123130000` | hrm_contracts_status_canonical（缺回滚件） | DDL | hrm.contracts | — | **✗** |
| 6 | `20261123140000` | erp_sales_orders_company_id | DDL+守卫 | erp.sales_orders | — | ✓ |
| 7 | `20261123141000` | erp_purchase_orders_company_id | DDL+守卫 | erp.purchase_orders | — | ✓ |
| 8 | `20261123142000` | search_projection_v2_company_scope | RLS+DDL+守卫 | public.search_entity_projections_v2 | — | ✓ |
| 9 | `20261123150000` | erp_orders_company_scope_rls | RLS+DDL+守卫 | erp.sales_orders、erp.purchase_orders | — | ✓ |

### 2026-11-24（7 条）

| # | 版本 | 迁移 | 类型 | 关键对象/操作 | 票据/闸门 | 回滚 |
|---|---|---|---|---|---|---|
| 1 | `20261124100000` | finance_budgets_status_lifecycle | DDL | finance.budgets | — | ✓ |
| 2 | `20261124110000` | finance_expenses_status_default | DDL+守卫 | finance.expenses | — | ✓ |
| 3 | `20261124120000` | audit_logs_status_narrow | DDL+守卫 | 动态操作，见原文件 | — | ✓ |
| 4 | `20261124130000` | financial_reports_single_status | 破坏性+DDL+守卫 | finance.financial_reports | B255-FIN-REPORT-20261124 | ✓ |
| 5 | `20261124140000` | crm_customer_finance_risklevel | DDL+守卫 | crm.customer_finance | — | ✓ |
| 6 | `20261124150000` | hrm_init_status_tenant_step_unique（HRM 唯一索引） | DDL+守卫 | hrm.initialization_status | — | ✓ |
| 7 | `20261124160000` | rd_project_members_status_standard（RD 状态收口（末条）） | DDL+DML+守卫 | rs.project_members | — | ✓ |

## 3. 16 条破坏性版本

| 版本 | 票据 | 闸门 | 关键动作 | 回滚 |
|---|---|---|---|---|
| `20261119100000` | DEAD-TABLE-20261119 | batch-1 | archive._drop_manifest、archive._rls_policy_snapshot、archive._fk_snapshot | ✓ |
| `20261119110000` | DEAD-TABLE-20261119 | batch-2 | bi.audit_logs、archive._drop_manifest、archive._rls_policy_snapshot | ✓ |
| `20261119160000` | ZERO-PATH-20261119 | — | archive._drop_manifest、archive._rls_policy_snapshot、archive._fk_snapshot | ✓ |
| `20261119180000` | LEGACY-COPY-20261119 | — | archive._drop_manifest、archive._rls_policy_snapshot、archive._fk_snapshot | ✓ |
| `20261119200000` | TENANT-UNBLOCK-20261119 | — | iam.core_tenant_plugins、archive._drop_manifest、archive._rls_policy_snapshot | ✓ |
| `20261119233000` | IAM-PERM-20261119 | — | public.core_role_permissions、public.core_permissions | ✓ |
| `20261120220000` | W2-D2-WMS-20261120 | — | 动态 DROP/归档，见原文件 | ✓ |
| `20261120235930` | W2-D2-HRM-20261120 | — | 动态 DROP/归档，见原文件 | ✓ |
| `20261120235950` | W2-D2-UC-20261120 | — | public.core_file_folders | ✓ |
| `20261121111000` | W2-D2-MOBILE-20261121 | — | mobile.mobile_leave_applications | ✓ |
| `20261121131000` | W2-D2-PM-20261121 | — | pm.pm_master_data_refs | ✓ |
| `20261121201000` | W2-D2-ANALYTICS-20261121 | — | bi.audit_logs | ✓ |
| `20261121230000` | W5C-ORG-HRM-20261121 | — | hrm.departments、hrm.employees、hrm.positions | ✓ |
| `20261121235900` | W5C-ORG-WMS-20261121 | — | wms.audit_logs、wms.inbound_orders | ✓ |
| `20261121235930` | W5C-ORG-HRM-INIT-20261121 | — | hrm.initialization_status | ✓ |
| `20261124130000` | B255-FIN-REPORT-20261124 | — | finance.financial_reports | ✓ |

## 4. 与 `fe23cda1` 二进制直接相关的关键条目

- `20261122090000`：新增 `public.core_user_company_scopes.is_default`，本次 500 的直接根因，必须成功。
- `20261124150000` / `20261124160000`：HRM / RD 收口，窗口末两条，顺序不可倒置。
- `20261121235940` 等 RLS 策略批次：新 tenant 中间件依赖的策略快照需与代码一致。

## 5. 风险：60 条 anchor 下未入账（需单独裁决）

这 60 条版本号 ≤ `20261119000002`，`apply-forward.sh` 只扫 > anchor，本窗口不会处理；
dry-run 从生产 dump 恢复，会原样保留这些缺口。抽查结果不是统一「已应用未记账」，而是混合状态：

| 迁移 | 抽查对象 | 生产现状 | 判定 |
|---|---|---|---|
| `20261107000002` | `iam.core_tenant_modules.tier` | 缺列（`public` 侧有） | 部分未应用 |
| `20261107000019` | `communication.core_email_templates` | 表仍存在 | 未应用 |
| `20261112105000` | `wms.*` RLS | 39 张表已启用 | 效果已存在 |
| `20261117180000` | `public.core_flow_rules` RLS | `true` | 效果已存在 |
| `20261118124000` | `iam.core_tenant_plugins` RLS | `false` | 未应用 |

结论：这 60 条需另开批次或明确豁免，不要并入本窗口自动执行。
其中测试/实验件 15 条，其余为权限/种子/RLS/表迁移。

<details><summary>展开 60 条明细</summary>

- `20261103210000` [测试] 20261103210000_db08_test_varchar_to_text_190cols.sql
- `20261103220000` [测试] 20261103220000_db09_test_iam_position_id_bigint_to_uuid.sql
- `20261103230000` [测试] 20261103230000_db10_5433_varchar_text_to_uuid_19cols.sql
- `20261104000000` [测试] 20261104000000_db11_5433_varchar_to_text_24cols.sql
- `20261104010000` [测试] 20261104010000_db12_5433_date_timestamptz_21cols.sql
- `20261104020000` [测试] 20261104020000_db13_5433_numeric_double_20cols.sql
- `20261104030000` [测试] 20261104030000_db14_test_varchar_to_uuid_7cols_with_data.sql
- `20261104040000` [测试] 20261104040000_db15_5433_integer_bigint_16cols.sql
- `20261104050000` [测试] 20261104050000_db16_5433_tenant_id_rls_decouple_14cols.sql
- `20261104060000` [测试] 20261104060000_db17_5433_misc_12cols.sql
- `20261104070000` [测试] 20261104070000_db18_5433_special_types_8cols.sql
- `20261105110000` [测试] 20261105110000_db20_test_timestamptz_align_prod_169cols.sql
- `20261105120000` [测试] 20261105120000_db21_test_varchar_numeric_widen_16cols.sql
- `20261105145000` [生产件] 20261105145000_finance_currency_master_fix.sql
- `20261105150000` [测试] 20261105150000_db23_test_type_align_4cols.sql
- `20261105180000` [测试] 20261105180000_db24_test_rfm_numeric_2cols.sql
- `20261105235800` [生产件] 20261105235800_iam_refresh_token_privileged_lookup.sql
- `20261106000001` [生产件] 20261106000001_permission_code_unify_bi_mes_wms.sql
- `20261107000001` [生产件] 20261107000001_iam_core_public_authority_sync.sql
- `20261107000002` [生产件] 20261107000002_tenant_modules_tier_column.sql
- `20261107000015` [生产件] 20261107000015_auth_rls_system_context_branch.sql
- `20261107000019` [生产件] 20261107000019_drop_communication_email_templates.sql
- `20261107000020` [生产件] 20261107000020_align_finance_payments_created_by_and_pm_tags.sql
- `20261107000021` [生产件] 20261107000021_route_permission_gaps_batch27.sql
- `20261107000022` [生产件] 20261107000022_domain_manager_roles_batch28.sql
- `20261107000023` [生产件] 20261107000023_domain_admin_code_grants_batch28.sql
- `20261107000024` [生产件] 20261107000024_finance_admin_seed.sql
- `20261107000025` [生产件] 20261107000025_seed_menus_batch29.sql
- `20261107000026` [生产件] 20261107000026_seed_asset_categories_batch31.sql
- `20261107000027` [生产件] 20261107000027_drop_dead_tables_batch31.sql
- `20261107000028` [生产件] 20261107000028_cleanup_erp_customers_batch32.sql
- `20261107000029` [生产件] 20261107000029_create_mdm_supplier_master_batch32.sql
- `20261107000030` [生产件] 20261107000030_seed_mdm_supplier_master_batch32.sql
- `20261107000031` [生产件] 20261107000031_supplier_category_dict_and_backfill.sql
- `20261107000032` [生产件] 20261107000032_scm_supplier_null_no_soft_delete.sql
- `20261107000033` [生产件] 20261107000033_mdm_sync_dead_letter.sql
- `20261107000034` [生产件] 20261107000034_mdm_rename_asset_categories_to_data_asset_categories.sql
- `20261107000035` [生产件] 20261107000035_mark_mdm_suppliers_category_deprecated.sql
- `20261107000036` [生产件] 20261107000036_rd_deploy_formula_link_batch38.sql
- `20261107000040` [生产件] 20261107000040_finance_budget_perm_batch40.sql
- `20261107000041` [生产件] 20261107000041_finance_submodule_perms_batch40.sql
- `20261107000042` [生产件] 20261107000042_ai_comm_perm_grants_batch40.sql
- `20261107000043` [生产件] 20261107000043_finance_smallfiles_perms_batch41.sql
- `20261109110100` [生产件] 20261109110100_p3_report_line_map.sql
- `20261112105000` [生产件] 20261112105000_w7_b4_wms_rls_fail_closed.sql
- `20261114100000` [生产件] 20261114100000_w7_b4_status_check_widen_business_states.sql
- `20261115140000` [生产件] 20261115140000_family_assets_to_erp_assets.sql
- `20261115140100` [生产件] 20261115140100_family_employees_to_hrm_employees.sql
- `20261115140200` [生产件] 20261115140200_family_mail_emails_to_core_emails.sql
- `20261115140300` [生产件] 20261115140300_family_erp_connections_to_integration.sql
- `20261115140400` [生产件] 20261115140400_family_erp_mappings_to_integration.sql
- `20261115140500` [生产件] 20261115140500_family_external_erp_sync_logs_to_integration.sql
- `20261115140600` [生产件] 20261115140600_family_storage_files_to_core_files.sql
- `20261115140700` [生产件] 20261115140700_family_doc_service_files_to_core_files.sql
- `20261115140800` [生产件] 20261115140800_family_tenant_plugins_to_iam.sql
- `20261115140900` [生产件] 20261115140900_family_tenant_users_to_public.sql
- `20261115141000` [生产件] 20261115141000_family_core_workflows_to_public.sql
- `20261115141100` [生产件] 20261115141100_family_flow_workflows_to_public.sql
- `20261117180000` [生产件] 20261117180000_unified_core_rls_strict.sql
- `20261118124000` [生产件] 20261118124000_iam_tenant_plugins_rls_strict.sql

</details>

## 6. 前置状态（截至生成时）

| 项 | 状态 |
|---|---|
| §5 执行块 / apply-forward.sh | ✓ 存在，支持 `--only/--defer/--allow-destructive/--anchor` |
| 81 条白名单 | ✓ 与仓库逐条一致 |
| manifest / checksums | ✓ 81/81 已登记 |
| 回滚件 | 80/81，`20261123130000` 缺 |
| 磁盘 | ✓ 48GiB（已清理 `target/debug`，`target/release` 保留） |
| 备份 | ✓ `/Users/xingzhai/backup/topems_prod-20261124-window.dump`，12MB，sha256 `3276535567e074ef2a677cd57c4206ba42f52a3d701a4c8914eb9c9a25c56135` |
| 演练库 `topems_prod_dryrun` | ✓ 已恢复；max=20261119000002，tables 1344 / constraints 9877 / indexes 4433 / policies 1050 / matviews 1（统一口径复核，生产逐项相同）；`is_default` 不存在（预期） |
| 当前服务 | ✓ 旧件 `676287d3…`，pid 59896，health 200 |
| B261 `20261124170000` | 仓库存在但排除；执行前复核 `--only` 不含它 |

> 恢复方式：`pg_restore --no-owner`。原因：直接恢复时 `REFRESH MATERIALIZED VIEW bi.org_stats` 以 MV 属主身份执行，被 `companies` 的 FORCE RLS 拒绝；`row_security=off` 对属主无效。`--no-owner` 仅改变演练库对象归属，策略与数据完整恢复（policies 1050 与生产一致）。

## 7. 演练结果（13:45–14:04，仅写 `topems_prod_dryrun`）

| 项 | 结果 |
|---|---|
| 入账 | 80 条顺序成功；归一 1 行后 `20261121230000` 经 `--apply-deferred` 补投成功 → 最终 81/81，`rows=802`，`failed=0`，`max=20261124160000` |
| 未应用 | `20261124170000`（B261，按裁决排除） |
| `is_default` | ✓ 已存在 |
| 归档 | `archive._drop_manifest` 5 批 / 338 表 / 11 行，与 5 条删表版本对应 |
| 对象 | tables 1344→1373、constraints 9877→10025、policies 1050→855、matviews 1 |
| 服务 | 全程未动；仍为旧件 `676287d3…`，health 200 |

演练修正的执行包缺陷（已回写 plan §5）：固定 `--anchor` 会卡第 2 条；B261 必须进 `--defer`；`20261119160000/180000/200000` 缺 gate GUC；bash 3.2 空数组展开。

**唯一真实阻断**：`hrm.employees` 1 行 `organization_id IS NULL`（`tenant_id`=`org_id`=`00000000-…-0001`）。**已获批准**，窗口停写后执行（见 plan §5 步骤 0）：

```sql
UPDATE hrm.employees SET organization_id = tenant_id
WHERE organization_id IS NULL AND org_id = tenant_id;
```

演练已验证：`UPDATE 1` → mismatch 0 → `20261121230000` 应用成功、`hrm.employees.organization_id` 已删。窗口按顺序跑到该条即可，无需事后补投。

