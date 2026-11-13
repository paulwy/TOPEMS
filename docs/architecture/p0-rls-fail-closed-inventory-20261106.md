# P0 · RLS fail-closed 逐表影响清单（生成于 2026-11-06，prod 实测）

数据来源：`topems_prod`（PG18）`pg_class` / `pg_policy` / `information_schema.columns` 实测导出；可与本方案第 1 节口径直接对账。

## 分类汇总

| 类 | 含义 | 表数 |
|---|---|---|
| A | 有租户列 + GUC 策略，无 allow_all → 直接收紧 | 618 |
| B | 有租户列 + GUC 策略 + allow_all → 先删 allow_all 再收紧 | 3 |
| C | 有租户列但仅 allow_all → 新增租户策略（行为变化最大） | 184 |
| E | 无租户列 + allow_all → 保留，登记为全局/系统表 | 62 |
| F | 无租户列且无 allow_all → 需人工判定 | 0 |
| 合计 | | 867 |

## 各类表的 schema 分布

| schema | A | B | C | E | F |
|---|---|---|---|---|---|
| ai | 6 | 0 | 4 | 0 | 0 |
| analytics | 11 | 0 | 0 | 0 | 0 |
| bi | 7 | 0 | 1 | 0 | 0 |
| communication | 5 | 0 | 0 | 0 | 0 |
| core | 7 | 0 | 1 | 1 | 0 |
| crm | 19 | 0 | 1 | 1 | 0 |
| doc | 0 | 0 | 0 | 4 | 0 |
| doc_service | 0 | 0 | 0 | 4 | 0 |
| ehs | 22 | 0 | 17 | 0 | 0 |
| erp | 12 | 0 | 17 | 10 | 0 |
| finance | 83 | 0 | 18 | 0 | 0 |
| flow | 0 | 0 | 0 | 3 | 0 |
| gis | 5 | 0 | 10 | 7 | 0 |
| hrm | 29 | 0 | 2 | 0 | 0 |
| iam | 15 | 0 | 0 | 3 | 0 |
| integration | 9 | 0 | 9 | 0 | 0 |
| lims | 33 | 0 | 12 | 0 | 0 |
| mail | 0 | 0 | 0 | 2 | 0 |
| master_data | 82 | 0 | 0 | 2 | 0 |
| mes | 22 | 1 | 8 | 2 | 0 |
| mobile | 9 | 0 | 18 | 1 | 0 |
| notification | 0 | 0 | 0 | 1 | 0 |
| pdm | 20 | 0 | 0 | 1 | 0 |
| plugin_finance | 6 | 0 | 0 | 0 | 0 |
| plugin_mes | 1 | 0 | 0 | 0 | 0 |
| pm | 8 | 1 | 29 | 1 | 0 |
| portal | 2 | 0 | 1 | 3 | 0 |
| public | 95 | 0 | 2 | 6 | 0 |
| qms | 27 | 0 | 0 | 7 | 0 |
| report | 0 | 0 | 0 | 1 | 0 |
| rs | 14 | 1 | 0 | 0 | 0 |
| scm | 26 | 0 | 5 | 0 | 0 |
| srm | 13 | 0 | 7 | 0 | 0 |
| storage | 0 | 0 | 0 | 1 | 0 |
| ticket | 1 | 0 | 7 | 0 | 0 |
| tms | 7 | 0 | 0 | 0 | 0 |
| unified_core | 1 | 0 | 0 | 0 | 0 |
| wms | 21 | 0 | 15 | 1 | 0 |

## 类 A：有租户列 + GUC 策略，无 allow_all → 直接收紧

| 表 | 租户列 | 可空 | FORCE RLS | 策略（名:形态） | 建议动作 |
|---|---|---|---|---|---|
| ai.ai_models | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ai.ai_prompt_templates | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ai.ai_settings | tenant_id | NO | Y | tenant_isolation_ai_settings:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ai.documents | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ai.model_usage_stats | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ai.usage_logs | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_comparison_analyses | tenant_id | YES | Y | tenant_isolation_analytics_comparison_analyses:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_comparison_results | tenant_id | YES | Y | tenant_isolation_analytics_comparison_results:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_dashboard_shares | tenant_id | YES | Y | tenant_isolation_analytics_dashboard_shares:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_dashboard_templates | tenant_id | YES | Y | tenant_isolation_analytics_dashboard_templates:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_dashboards | tenant_id | YES | Y | tenant_isolation_analytics_dashboards:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_datasources | tenant_id | YES | Y | tenant_isolation_analytics_datasources:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_drilldown_history | tenant_id | YES | Y | tenant_isolation_analytics_drilldown_history:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_drilldown_paths | tenant_id | YES | Y | tenant_isolation_analytics_drilldown_paths:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_row_level_permissions | tenant_id | YES | Y | tenant_isolation_analytics_row_level_permissions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_self_service_reports | tenant_id | YES | Y | tenant_isolation_analytics_self_service_reports:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| analytics.analytics_widgets | tenant_id | YES | Y | tenant_isolation_analytics_widgets:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| bi.analytics_dashboards | tenant_id | NO | Y | tenant_isolation_analytics_dashboards:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| bi.analytics_datasets | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_analytics_datasets:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| bi.analytics_datasources | tenant_id | NO | Y | tenant_isolation_analytics_datasources:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| bi.analytics_widgets | tenant_id | NO | Y | tenant_isolation_analytics_widgets:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| bi.report_schedules | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| bi.report_templates | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_report_templates:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| bi.reports | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| communication.core_email_templates | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| communication.core_notification_deliveries | tenant_id | YES | Y | notification_deliveries_tenant_isolation:strict | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| communication.core_notification_preferences | tenant_id | YES | Y | notification_preferences_tenant_isolation:strict | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| communication.core_notification_subscriptions | tenant_id | YES | Y | notification_subscriptions_tenant_isolation:strict | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| communication.notification_channels | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_notification_channels:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| core.ai_conversations | tenant_id | NO | Y | ai_conversations_tenant_isolation:strict; tenant_isolation_ai_conversations:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| core.ai_faqs | tenant_id | NO | Y | tenant_isolation_core_ai_faqs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| core.knowledge_bases | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| core.knowledge_chunks | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| core.knowledge_documents | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| core.knowledge_qa_history | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| core.user_preferences | tenant_id | YES | Y | tenant_isolation_user_preferences:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.billing_records | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.contacts | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_contacts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.contracts | tenant_id | NO | Y | tenant_isolation_contracts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.crm_master_data_refs | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.customer_finance | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_customer_finance:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.customer_orders | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.customer_recommendations | tenant_id | NO | Y | tenant_isolation_customer_recommendations:strict | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.customer_scores | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.customer_segments | tenant_id | NO | Y | tenant_isolation_customer_segments:strict | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.customer_tags | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_customer_tags:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.customers | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_customers:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.interactions | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_interactions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.opportunities | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_opportunities:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.return_items | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.returns | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.rfm_results | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.sales_forecasts | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.sales_orders | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| crm.tags | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_tags:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.hazard_control_measures | tenant_id | NO | Y | tenant_isolation_hazard_control_measures:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.hazard_risk_assessments | tenant_id | NO | Y | tenant_isolation_hazard_risk_assessments:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_accidents | tenant_id | YES | Y | qa_ehs_accidents_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_alerts | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_compliance_evaluations | tenant_id | YES | N | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支）；另需 FORCE RLS（或有依据地保留例外） |
| ehs.qa_ehs_discharge_permits | tenant_id | YES | N | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支）；另需 FORCE RLS（或有依据地保留例外） |
| ehs.qa_ehs_drill_evaluations | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_ehs_drill_evaluations:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_env_monitor_records | tenant_id | YES | N | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支）；另需 FORCE RLS（或有依据地保留例外） |
| ehs.qa_ehs_environment_incidents | tenant_id | YES | N | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支）；另需 FORCE RLS（或有依据地保留例外） |
| ehs.qa_ehs_environment_monitors | tenant_id | YES | Y | qa_ehs_environment_monitors_tenant_policy:fail_open; rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_environmental_regulations | tenant_id | YES | N | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支）；另需 FORCE RLS（或有依据地保留例外） |
| ehs.qa_ehs_hazard_factors | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_hazardous_materials | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_hazards | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_incident_actions | tenant_id | YES | Y | qa_ehs_incident_actions_tenant_policy:fail_open; tenant_isolation_qa_ehs_incident_actions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_investigations | tenant_id | YES | Y | qa_ehs_investigations_tenant_policy:fail_open; tenant_isolation_qa_ehs_investigations:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_reviews | tenant_id | YES | Y | qa_ehs_reviews_tenant_policy:fail_open; tenant_isolation_qa_ehs_reviews:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_risk_controls | tenant_id | YES | Y | qa_ehs_risk_controls_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_risks | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_training_certificates | tenant_id | YES | Y | qa_ehs_training_certificates_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_treatment_actions | tenant_id | YES | Y | qa_ehs_treatment_actions_tenant_policy:fail_open; tenant_isolation_qa_ehs_treatment_actions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ehs.qa_ehs_treatments | tenant_id | YES | Y | qa_ehs_treatments_tenant_policy:fail_open; tenant_isolation_qa_ehs_treatments:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.announcements | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_announcements:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.assets | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_assets:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.bank_accounts | tenant_id | YES | Y | tenant_isolation_bank_accounts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.documents | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.erp_master_data_refs | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.fin_reconciliations | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_fin_reconciliations:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.inventory | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_inventory:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.inventory_items | tenant_id | NO | Y | tenant_isolation_inventory_items:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.materials | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_materials:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.purchase_orders | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_purchase_orders:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.voucher_items | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_voucher_items:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| erp.vouchers | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.budgets | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.core_finance_accounts | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_finance_accounts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.core_finance_approval_workflows | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_finance_approval_workflows:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.core_finance_aux_accounts | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_finance_aux_accounts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.core_finance_aux_balances | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_finance_aux_balances:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.core_finance_ledger | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_finance_ledger:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.core_finance_periods | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_finance_periods:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.core_finance_reconciliation_items | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_finance_reconciliation_items:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.core_finance_reconciliation_sessions | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_finance_reconciliation_sessions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.core_finance_vouchers | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_finance_vouchers:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.cqrs_projection_progress | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.difference_adjustments | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_difference_adjustments:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.erp_collection_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.expense_approvals | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_expense_approvals:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_audit_log | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_audit_rules_v52 | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_budget_variances_v53 | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_cash_flow_predictions_v53 | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_compliance_issues | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_compliance_reports | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_finance_compliance_reports:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_control_matrices | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_finance_control_matrices:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_control_points | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_finance_control_points:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_prediction_models_v53 | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_risk_assessments | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_finance_risk_assessments:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v54_fraud_rules | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v54_fraud_scores | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v54_review_results | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v54_review_rules | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v54_review_workflows | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v54_risk_alerts | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v54_risk_indicators | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v55_invoice_items | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v55_invoices | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v55_payment_requests | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v55_payment_results | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v55_reconciliation_results | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v55_reconciliation_rules | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v56_tax_brackets | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v56_tax_forms | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v56_tax_lines | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v56_tax_plans | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v56_tax_rates | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v56_tax_suggestions | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v57_analysis_dimensions | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v57_analysis_results | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v57_forecast_models | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v57_generated_reports | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v57_insights | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v57_report_templates | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v58_cash_pools | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v58_forecast_results | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v58_forecast_scenarios | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v58_liquidity_targets | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v58_optimization_results | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v58_pool_allocations | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v58_pool_transfers | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v59_credit_profiles | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v59_device_profiles | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v59_fraud_decisions | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v59_fraud_rules | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v59_fraud_signals | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v59_scoring_models | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v59_stress_results | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v59_stress_scenarios | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v60_alert_channels | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v60_alert_rules | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v60_alerts | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v60_decision_results | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v60_decision_scenarios | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v60_schedule_dependencies | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v60_schedule_executions | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_v60_schedule_tasks | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.finance_voucher_templates | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_finance_voucher_templates:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.financial_reports | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_financial_reports:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.mv_receivable_aging | tenant_id | YES | Y | tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.mv_voucher_summary | tenant_id | YES | Y | tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.reconcile_orders | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.reconciliation_orders | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.reconciliation_settlement_links | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_reconciliation_settlement_links:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.sales_invoices | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.settlement_center_dashboards | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_settlement_center_dashboards:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.source_amount_snapshots | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| finance.vouchers | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| gis.geofences | tenant_id | NO | Y | tenant_isolation_geofences:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| gis.gis_map_markers | tenant_id | YES | Y | tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| gis.map_markers | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| gis.maps | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| gis.pipelines | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.attendance_records | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_attendance_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.candidates | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_candidates:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.companies | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_companies:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.contract_renewals | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_contract_renewals:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.contracts | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_contracts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.departments | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_departments:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.employees | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_employees:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.hrm_cache_invalidation_logs | tenant_id | YES | Y | tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.hrm_master_data_refs | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.initialization_status | tenant_id | NO | Y | tenant_isolation_initialization_status:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.interviews | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_interviews:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.job_openings | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_job_openings:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.leave_records | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_leave_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.module_settings | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.payroll_details | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_payroll_details:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.payroll_items | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_payroll_items:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.payroll_records | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_payroll_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.payroll_runs | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_payroll_runs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.performance_goals | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_performance_goals:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.performance_records | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_performance_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.performance_reviews | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_performance_reviews:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.positions | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_positions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.recruitment_applications | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_recruitment_applications:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.recruitment_records | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_recruitment_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.salary_adjustments | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_salary_adjustments:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.training_courses | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_training_courses:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.training_participants | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_training_participants:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.training_plans | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_training_plans:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| hrm.training_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_training_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.crm_dashboard_snapshots | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.data_permissions | tenant_id | NO | Y | tenant_isolation_data_permissions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.ehs_dashboard_snapshots | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.hrm_dashboard_snapshots | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.lims_dashboard_snapshots | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.pdm_dashboard_snapshots | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.permission_audit_logs | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_permission_audit_logs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.permission_templates | tenant_id | NO | Y | tenant_isolation_permission_templates:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.position_permissions | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_position_permissions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.position_roles | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_position_roles:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.positions | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_positions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.resource_permissions | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_resource_permissions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.tenant_users | tenant_id | NO | Y | tenant_isolation_tenant_users:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.user_positions | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_user_positions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| iam.wms_dashboard_snapshots | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| integration.async_tasks | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| integration.conversion_executions | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_conversion_executions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| integration.conversion_rules | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_conversion_rules:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| integration.erp_connections | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_erp_connections:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| integration.erp_mappings | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_erp_mappings:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| integration.external_erp_staging | tenant_id | NO | Y | tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| integration.external_erp_sync_logs | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_external_erp_sync_logs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| integration.integration_sync_logs | tenant_id | YES | Y | tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| integration.mes_qms_sync | tenant_id | NO | Y | tenant_isolation_mes_qms_sync:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.lims_inspection_records | tenant_id | YES | Y | tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.lims_safety_tasks | tenant_id | YES | Y | tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lab_calibration_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lab_calibration_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lab_inspection_reports | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lab_inspection_reports:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lab_instruments | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lab_instruments:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lab_processes | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lab_processes:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lab_reagent_alerts | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lab_reagent_alerts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lab_reagent_history | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lab_reagent_history:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lab_reagents | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lab_reagents:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lab_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lab_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lab_sample_lifecycle | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lab_sample_lifecycle:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_analytes | tenant_id | YES | N | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_analytes:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支）；另需 FORCE RLS（或有依据地保留例外） |
| lims.qa_lims_audit_logs | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_audit_logs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_barcode_scan_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_barcode_scan_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_collection_tasks | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_collection_tasks:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_instrument_data | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_instrument_data:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_method_categories | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_method_categories:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_method_validations | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_method_validations:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_method_versions | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_method_versions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_parse_rules | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_parse_rules:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_pt_corrective_actions | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_pt_corrective_actions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_pt_evaluations | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_pt_evaluations:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_pt_plans | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_pt_plans:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_pt_results | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_pt_results:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_pt_samples | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_pt_samples:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_rfid_tags | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_rfid_tags:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_sample_barcodes | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_sample_barcodes:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_sync_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_sync_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_test_methods | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_test_methods:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_uncertainty_components | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_uncertainty_components:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_uncertainty_projects | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_uncertainty_projects:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.qa_lims_uncertainty_sources | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_lims_uncertainty_sources:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| lims.samples | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.materials | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_materials:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_ai_models | tenant_id | NO | Y | tenant_isolation_mdm_ai_models:fail_open; tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_ai_suggestions | tenant_id | NO | Y | tenant_isolation_mdm_ai_suggestions:fail_open; tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_api_exposures | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_api_products | tenant_id | YES | Y | mdm_api_products_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_asset_categories | tenant_id | YES | Y | mdm_asset_categories_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_assets | tenant_id | YES | Y | mdm_assets_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_audit_events | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_audit_export_logs | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_auto_fix_actions | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_bc_tests | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_billing_records | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_change_events | tenant_id | YES | Y | mdm_change_events_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_classification_models | tenant_id | NO | Y | tenant_isolation_mdm_classification_models:fail_open; tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_classification_results | tenant_id | NO | Y | tenant_isolation_mdm_classification_results:fail_open; tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_classifier_rules | tenant_id | NO | Y | tenant_isolation_mdm_classifier_rules:fail_open; tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_continuity_plans | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_critical_functions | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_data_contracts | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_data_permissions | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_data_products | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_dimension_scores | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_failover_records | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_fix_strategies | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_governance_insights | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_governance_suggestions | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_graph_communities | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_graph_edges | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_graph_nodes | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_impact_analyses | tenant_id | YES | Y | mdm_impact_analyses_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_impact_simulations | tenant_id | YES | Y | mdm_impact_simulations_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_improvement_plans | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_interactions | tenant_id | YES | Y | mdm_interactions_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_kg_edges | tenant_id | YES | Y | mdm_kg_edges_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_kg_graphs | tenant_id | YES | Y | mdm_kg_graphs_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_kg_nodes | tenant_id | YES | Y | mdm_kg_nodes_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_lifecycle_history | tenant_uid | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_lifecycle_policies | tenant_uid | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_lifecycle_stages | tenant_uid | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_lineage_edges | tenant_id | YES | Y | mdm_lineage_edges_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_lineage_graphs | tenant_id | YES | Y | mdm_lineage_graphs_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_lineage_nodes | tenant_id | YES | Y | mdm_lineage_nodes_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_match_results | tenant_id | NO | Y | tenant_isolation_mdm_match_results:fail_open; tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_match_rules | tenant_id | NO | Y | tenant_isolation_mdm_match_rules:fail_open; tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_maturity_assessments | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_maturity_history | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_metadata_attributes | tenant_uid | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_metadata_objects | tenant_id | YES | Y | mdm_metadata_objects_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_metadata_tags | tenant_uid | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_permission_roles | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_propagation_logs | tenant_id | YES | Y | mdm_propagation_logs_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_propagation_rules | tenant_id | YES | Y | mdm_propagation_rules_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_quality_checks | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_quality_loop_configs | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_rate_cards | tenant_uid | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_recommendations | tenant_id | YES | Y | mdm_recommendations_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_recovery_plans | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_recovery_points | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_region_configs | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_replication_configs | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_search_history | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_search_indexes | tenant_id | YES | Y | mdm_search_indexes_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_semantic_search_indexes | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_sla_configs | tenant_uid | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_sla_incidents | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_sla_measurements | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_subscriptions | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_tag_rules | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_tagged_entities | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_tags | tenant_id | NO | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_usage_records | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_user_role_assignments | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_v60_lineage_edges | tenant_uid | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_v60_lineage_graphs | tenant_uid | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_v60_lineage_nodes | tenant_uid | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_version_branches | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_version_snapshots | tenant_id | YES | Y | mdm_version_snapshots_tenant_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_workflow_history | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_workflow_templates | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.mdm_workflows | tenant_id | YES | Y | tenant_isolation_policy:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.samples | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_samples:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| master_data.uoms | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_uoms:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.audit_logs | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_audit_logs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.dashboard_stats | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_dashboard_stats:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.equipment | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.equipment_inspection_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.equipment_maintenance_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.equipment_oee | tenant_id | YES | Y | tenant_isolation_equipment_oee:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.financial_records | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_financial_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.material_plans | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.module_settings | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.process_route_steps | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.process_routes | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.production_costs | tenant_id | YES | Y | tenant_isolation_production_costs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.production_orders | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.production_processes | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.production_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.production_schedules | tenant_id | YES | Y | tenant_isolation_production_schedules:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.quality_standard_values | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_quality_standard_values:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.supply_chain_orders | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_supply_chain_orders:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.teams | tenant_id | YES | Y | tenant_isolation_teams:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.work_orders | tenant_id | YES | N | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支）；另需 FORCE RLS（或有依据地保留例外） |
| mes.work_reports | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_work_reports:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mes.work_stations | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mobile.core_mobile_offline_records | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_mobile_offline_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mobile.documents | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mobile.oa_announcements | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mobile.oa_calendar_events | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mobile.oa_meetings | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mobile.oa_tasks | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mobile.push_config | tenant_id | NO | Y | tenant_isolation_push_config:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mobile.push_notifications | tenant_id | YES | Y | tenant_isolation_push_notifications:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| mobile.shortcuts | tenant_id | NO | Y | tenant_isolation_shortcuts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.module_settings | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_bom_items | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_bom_items:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_boms | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_boms:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_change_notices | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_change_notices:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_configurations | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_configurations:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_document_versions | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_document_versions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_documents | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_documents:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_drawings | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_drawings:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_materials | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_materials:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_production_batches | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_production_batches:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_production_formulas | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_production_formulas:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_production_processes | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_production_processes:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_production_steps | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_production_steps:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_products | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_products:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_project_members | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_project_members:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_project_phases | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_project_phases:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_projects | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_projects:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_versions | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_versions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_workflow_instances | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_workflow_instances:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pdm.pdm_workflows | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pdm_workflows:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| plugin_finance.accounting_subjects | tenant_id | YES | Y | tenant_isolation_accounting_subjects:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| plugin_finance.difference_adjustments | tenant_id | NO | Y | tenant_isolation_difference_adjustments:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| plugin_finance.reconciliation_item_snapshots | tenant_id | NO | Y | tenant_isolation_reconciliation_item_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| plugin_finance.reconciliation_settlement_links | tenant_id | NO | Y | tenant_isolation_reconciliation_settlement_links:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| plugin_finance.reconciliation_snapshots | tenant_id | NO | Y | tenant_isolation_reconciliation_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| plugin_finance.settlement_snapshots | tenant_id | NO | Y | tenant_isolation_settlement_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| plugin_mes.audit_logs | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pm.budgets | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pm.pm_budget_items | tenant_id | YES | Y | tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pm.pm_master_data_refs | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pm.pm_tasks | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_pm_tasks:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pm.project_members | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pm.project_milestones | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_project_milestones:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pm.project_phases | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_project_phases:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| pm.projects | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_projects:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| portal.portal_dashboard_stats | tenant_id | NO | Y | tenant_isolation_portal_dashboard_stats:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| portal.portal_notifications | tenant_id | NO | Y | tenant_isolation_portal_notifications:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public._archive_core_workflow_instances | tenant_id | NO | Y | tenant_isolation_core_workflow_instances:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public._archive_core_workflow_versions | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_workflow_versions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.approval_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.approvals | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.audit_logs | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_audit_logs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.automation_rules | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.automation_runs | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.automation_variables | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_dict_items | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_dict_types | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_doc_documents | tenant_id | NO | Y | tenant_isolation_core_doc_documents:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_doc_folders | tenant_id | NO | Y | tenant_isolation_core_doc_folders:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_doc_templates | tenant_id | NO | Y | tenant_isolation_core_doc_templates:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_email_queue | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_emails | tenant_id | NO | Y | tenant_isolation_core_emails:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_faqs | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_file_folders | tenant_id | NO | Y | tenant_isolation_core_file_folders:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_files | tenant_id | NO | Y | tenant_isolation_core_files:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_finance_accounts | tenant_id | NO | Y | tenant_isolation_core_finance_accounts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_finance_vouchers | tenant_id | NO | Y | tenant_isolation_core_finance_vouchers:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_flow_categories | tenant_id | YES | Y | tenant_isolation_core_flow_categories:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_guide_lessons | tenant_id | NO | Y | tenant_isolation_core_guide_lessons:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_guide_progress | tenant_id | NO | Y | tenant_isolation_core_guide_progress:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_guides | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_inter_module_sync | tenant_id | NO | Y | tenant_isolation_core_inter_module_sync:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_login_logs | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_core_login_logs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_master_data_change_log | tenant_id | NO | Y | tenant_isolation_core_master_data_change_log:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_master_data_refs | tenant_id | NO | Y | tenant_isolation_core_master_data_refs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_mdm_approvals | tenant_id | NO | Y | tenant_isolation_core_mdm_approvals:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_mdm_reconciliation_log | tenant_id | NO | Y | tenant_isolation_core_mdm_reconciliation_log:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_menu_groups | tenant_id | NO | Y | rls_menu_global_visible:strict; rls_tenant_isolation:fail_open; tenant_isolation_core_menu_groups:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_menus | tenant_id | NO | Y | rls_menu_global_visible:strict; tenant_isolation_core_menus:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_migration_history | tenant_id | NO | Y | tenant_isolation_core_migration_history:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_notification_templates | tenant_id | NO | Y | tenant_isolation_core_notification_templates:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_notifications | tenant_id | NO | Y | tenant_isolation_core_notifications:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_refresh_tokens | tenant_id | YES | N | core_refresh_tokens_tenant_isolation:strict | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支）；另需 FORCE RLS（或有依据地保留例外） |
| public.core_roles | tenant_id | NO | Y | tenant_isolation_core_roles:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_sessions | tenant_id | YES | N | core_sessions_tenant_isolation:strict | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支）；另需 FORCE RLS（或有依据地保留例外） |
| public.core_tenant_modules | tenant_id | NO | Y | tenant_isolation_core_tenant_modules:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_tenant_settings | tenant_id | NO | Y | tenant_isolation_core_tenant_settings:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_tenant_usage | tenant_id | NO | Y | tenant_isolation_core_tenant_usage:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_tenant_users | tenant_id | NO | Y | tenant_isolation_core_tenant_users:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_tenants | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_workflow_instances | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_workflow_tasks | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_workflow_versions | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.core_workflows | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.cqrs_events | tenant_id | YES | Y | tenant_isolation_cqrs_events:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.crm_dashboard_snapshots | tenant_id | NO | Y | tenant_isolation_crm_dashboard_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.ehs_dashboard_snapshots | tenant_id | NO | Y | tenant_isolation_ehs_dashboard_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.finance_voucher_templates | tenant_id | NO | Y | tenant_isolation_finance_voucher_templates:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.financial_reports | tenant_id | NO | Y | tenant_isolation_financial_reports:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.hrm_dashboard_snapshots | tenant_id | NO | Y | tenant_isolation_hrm_dashboard_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.lims_dashboard_snapshots | tenant_id | NO | Y | tenant_isolation_lims_dashboard_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.monitor_settings | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.pdm_change_notices | tenant_id | NO | Y | tenant_isolation_pdm_change_notices:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.pdm_dashboard_snapshots | tenant_id | NO | Y | tenant_isolation_pdm_dashboard_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.pdm_materials | tenant_id | NO | Y | tenant_isolation_pdm_materials:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.pdm_products | tenant_id | NO | Y | tenant_isolation_pdm_products:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.permission_audit_logs | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_calibration_records | tenant_id | YES | Y | tenant_isolation_qa_lab_calibration_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_inspection_reports | tenant_id | YES | Y | tenant_isolation_qa_lab_inspection_reports:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_instruments | tenant_id | YES | Y | tenant_isolation_qa_lab_instruments:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_processes | tenant_id | YES | Y | tenant_isolation_qa_lab_processes:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_reagent_alerts | tenant_id | YES | Y | tenant_isolation_qa_lab_reagent_alerts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_reagent_history | tenant_id | YES | Y | tenant_isolation_qa_lab_reagent_history:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_reagents | tenant_id | YES | Y | tenant_isolation_qa_lab_reagents:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_records | tenant_id | YES | Y | tenant_isolation_qa_lab_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_sample_lifecycle | tenant_id | YES | Y | tenant_isolation_qa_lab_sample_lifecycle:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_samples | tenant_id | YES | Y | tenant_isolation_qa_lab_samples:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lab_tasks | tenant_id | YES | Y | tenant_isolation_qa_lab_tasks:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_audit_logs | tenant_id | YES | Y | tenant_isolation_qa_lims_audit_logs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_barcode_scan_records | tenant_id | YES | Y | tenant_isolation_qa_lims_barcode_scan_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_collection_tasks | tenant_id | YES | Y | tenant_isolation_qa_lims_collection_tasks:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_instrument_data | tenant_id | YES | Y | tenant_isolation_qa_lims_instrument_data:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_method_categories | tenant_id | YES | Y | tenant_isolation_qa_lims_method_categories:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_method_validations | tenant_id | YES | Y | tenant_isolation_qa_lims_method_validations:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_method_versions | tenant_id | YES | Y | tenant_isolation_qa_lims_method_versions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_parse_rules | tenant_id | YES | Y | tenant_isolation_qa_lims_parse_rules:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_pt_corrective_actions | tenant_id | YES | Y | tenant_isolation_qa_lims_pt_corrective_actions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_pt_evaluations | tenant_id | YES | Y | tenant_isolation_qa_lims_pt_evaluations:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_pt_plans | tenant_id | YES | Y | tenant_isolation_qa_lims_pt_plans:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_pt_results | tenant_id | YES | Y | tenant_isolation_qa_lims_pt_results:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_pt_samples | tenant_id | YES | Y | tenant_isolation_qa_lims_pt_samples:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_rfid_tags | tenant_id | YES | Y | tenant_isolation_qa_lims_rfid_tags:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_sample_barcodes | tenant_id | YES | Y | tenant_isolation_qa_lims_sample_barcodes:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_sync_records | tenant_id | YES | Y | tenant_isolation_qa_lims_sync_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_test_methods | tenant_id | YES | Y | tenant_isolation_qa_lims_test_methods:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_uncertainty_components | tenant_id | YES | Y | tenant_isolation_qa_lims_uncertainty_components:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_uncertainty_projects | tenant_id | YES | Y | tenant_isolation_qa_lims_uncertainty_projects:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.qa_lims_uncertainty_sources | tenant_id | YES | Y | tenant_isolation_qa_lims_uncertainty_sources:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.search_entity_projections | tenant_id | NO | Y | tenant_isolation_search_entity_projections:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.system_settings | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.tenant_permissions | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_tenant_permissions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| public.wms_dashboard_snapshots | tenant_id | NO | Y | tenant_isolation_wms_dashboard_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_alert_messages | tenant_id | YES | Y | tenant_isolation_qa_alert_messages:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_alert_rules | tenant_id | YES | Y | tenant_isolation_qa_alert_rules:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_approval_events | tenant_id | NO | Y | tenant_isolation_qa_approval_events:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_apqp_phases | tenant_id | YES | Y | tenant_isolation_qa_apqp_phases:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_apqp_projects | tenant_id | YES | Y | tenant_isolation_qa_apqp_projects:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_apqp_risks | tenant_id | YES | Y | tenant_isolation_qa_apqp_risks:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_apqp_tasks | tenant_id | YES | Y | tenant_isolation_qa_apqp_tasks:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_audit_findings | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_audit_findings:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_audit_plans | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_audit_plans:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_audit_tasks | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_audit_tasks:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_corrective_action_items | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_corrective_action_items:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_corrective_actions | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_corrective_actions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_ehs_hazards | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_eightd_audit_logs | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_eightd_audit_logs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_eightd_reports | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_eightd_reports:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_fmea_analyses | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_fmea_analyses:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_fmea_items | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_fmea_items:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_inspection_audits | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_inspection_audits:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_inspection_results | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_inspection_results:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_qms_sync_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_qms_sync_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_quality_costs | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_quality_costs:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_quality_inspections | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_quality_inspections:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_quality_issues | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_quality_issues:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_spc_charts | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_spc_charts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_spc_data_points | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_spc_data_points:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_standard_revisions | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_standard_revisions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| qms.qa_standards | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_qa_standards:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.audit_logs | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.change_orders | tenant_id | NO | Y | tenant_isolation_change_orders:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.change_requests | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_change_requests:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.experiments | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.formula_versions | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.material_tests | tenant_id | NO | Y | tenant_isolation_material_tests:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.module_settings | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.project_members | tenant_id | NO | Y | tenant_isolation_project_members:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.project_milestones | tenant_id | NO | Y | tenant_isolation_project_milestones:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.project_phases | tenant_id | NO | Y | tenant_isolation_project_phases:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.projects | tenant_id | YES | Y | tenant_isolation_projects:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.rs_experiments | tenant_id | YES | Y | tenant_isolation_rs_experiments:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.rs_formulas | tenant_id | YES | Y | tenant_isolation_rs_formulas:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| rs.rs_projects | tenant_id | YES | Y | tenant_isolation_rs_projects:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.demand_forecast | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.incoming_inspections | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.incoming_notices | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_incoming_notices:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.inspection_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.materials | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.module_settings | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.mrp_suggestions | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.price_comparison_items | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.price_comparisons | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.purchase_contracts | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.purchase_requisitions | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.sales_order_items | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.scm_master_data_refs | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.srm_supplier_snapshots | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_srm_supplier_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.supplier_admissions | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.supplier_products | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.supplier_quotes | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.suppliers | tenant_id | YES | Y | tenant_isolation_suppliers:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.sync_logs | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.sync_record_details | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.sync_records | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.wms_inbound_order_snapshots | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_wms_inbound_order_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.wms_inventory_movement_snapshots | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_wms_inventory_movement_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.wms_inventory_snapshots | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_wms_inventory_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.wms_outbound_order_snapshots | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_wms_outbound_order_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| scm.wms_replenishment_suggestion_snapshots | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_wms_replenishment_suggestion_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.bid_requests | tenant_id | YES | Y | tenant_isolation_bid_requests:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.bidding_suppliers | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.biddings | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.bids | tenant_id | YES | Y | tenant_isolation_bids:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.inquiries | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_inquiries:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.quotations | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.scm_supplier_snapshots | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_scm_supplier_snapshots:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.scoring_dimensions | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.supplier_performance | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_supplier_performance:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.suppliers | tenant_id | YES | Y | tenant_isolation_suppliers:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.tender_awards | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_tender_awards:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.tender_bids | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_tender_bids:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| srm.tenders | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_tenders:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| ticket.ticket_attachments | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| tms.carriers | tenant_id | YES | Y | tenant_isolation_carriers:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| tms.drivers | tenant_id | YES | Y | tenant_isolation_drivers:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| tms.tms_carriers | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| tms.tms_drivers | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| tms.tms_routes | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| tms.tms_shipments | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| tms.tms_vehicles | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| unified_core.inter_module_sync | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.alerts | tenant_id | YES | Y | tenant_isolation_alerts:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.inbound_orders | tenant_id | YES | Y | tenant_isolation_inbound_orders:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.inventory | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_inventory:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.inventory_movements | tenant_id | NO | Y | rls_tenant_isolation:fail_open; tenant_isolation_inventory_movements:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.labor_shifts | tenant_id | NO | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.locations | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.outbound_orders | tenant_id | YES | Y | tenant_isolation_outbound_orders:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.purchase_order_snapshots | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.replenishment_order_items | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.replenishment_orders | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.replenishment_rules | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.replenishment_suggestions | tenant_id | YES | Y | tenant_isolation_replenishment_suggestions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.serial_numbers | tenant_id | YES | Y | tenant_isolation_serial_numbers:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.slotting_rules | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_slotting_rules:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.slotting_suggestions | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_slotting_suggestions:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.slotting_zones | tenant_id | YES | Y | rls_tenant_isolation:fail_open; tenant_isolation_slotting_zones:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.stock_takes | tenant_id | YES | Y | rls_tenant_isolation:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.sync_record_details | tenant_id | YES | Y | tenant_isolation_sync_record_details:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.sync_records | tenant_id | YES | Y | tenant_isolation_sync_records:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.transfer_order_items | tenant_id | YES | Y | tenant_isolation_transfer_order_items:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |
| wms.transfer_orders | tenant_id | YES | Y | tenant_isolation_transfer_orders:fail_open | 收紧 GUC 策略（去未设豁免，保留 nil 超管分支） |

## 类 B：有租户列 + GUC 策略 + allow_all → 先删 allow_all 再收紧

| 表 | 租户列 | 可空 | FORCE RLS | 策略（名:形态） | 建议动作 |
|---|---|---|---|---|---|
| mes.process_flow_steps | tenant_id | YES | Y | mes_allow_all_process_flow_steps:allow_all; rls_tenant_isolation:fail_open | 删除 allow_all 策略 + 收紧 GUC 策略 |
| pm.documents | tenant_id | NO | Y | pm_allow_all_documents:allow_all; rls_tenant_isolation:fail_open | 删除 allow_all 策略 + 收紧 GUC 策略 |
| rs.formulas | tenant_id | YES | Y | rls_tenant_isolation:fail_open; rs_allow_all_formulas:allow_all | 删除 allow_all 策略 + 收紧 GUC 策略 |

## 类 C：有租户列但仅 allow_all → 新增租户策略（行为变化最大）

> **全局表例外（2026-11-14 定案）**：`core.core_plugins` 是**全租户共享插件目录**，不参与租户隔离，保留 `allow_all`。依据：`code` 全局唯一；`tenant_id` 表示发布方而非查看方；租户级安装/授权关系在 `core.core_tenant_plugins`。隔离责任在发布侧（`/api/plugin/dev/*` 上传/发布鉴权与审核），市场查询按 `is_published` 放行，**不得**追加 `tenant_id` 谓词（会导致非发布租户市场为空）。

| 表 | 租户列 | 可空 | FORCE RLS | 策略（名:形态） | 建议动作 |
|---|---|---|---|---|---|
| ai.ai_training_samples | tenant_id | YES | Y | ai_allow_all_ai_training_samples:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ai.analysis_results | tenant_id | NO | Y | ai_allow_all_analysis_results:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ai.document_chunks | tenant_id | NO | Y | ai_allow_all_document_chunks:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ai.qa_history | tenant_id | NO | Y | ai_allow_all_qa_history:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| bi.audit_logs | tenant_id | YES | Y | bi_allow_all_audit_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| core.core_plugins | tenant_id | YES | Y | core_allow_all_core_plugins:allow_all | 保留 allow_all（登记为全局表）：全租户共享插件目录，tenant_id 为发布方，租户安装关系在 core.core_tenant_plugins；隔离责任在发布侧鉴权 |
| crm.audit_logs | tenant_id | YES | Y | crm_allow_all_audit_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.audit_logs | tenant_id | YES | Y | ehs_allow_all_audit_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.drill_records | tenant_id | YES | Y | ehs_allow_all_drill_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.emergency_plans | tenant_id | YES | Y | ehs_allow_all_emergency_plans:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.environmental_alerts | tenant_id | YES | Y | ehs_allow_all_environmental_alerts:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.environmental_data | tenant_id | YES | Y | ehs_allow_all_environmental_data:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.health_checkups | tenant_id | YES | Y | ehs_allow_all_health_checkups:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.health_records | tenant_id | YES | Y | ehs_allow_all_health_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.monitoring_points | tenant_id | YES | Y | ehs_allow_all_monitoring_points:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.qa_ehs_employees | tenant_id | YES | Y | ehs_allow_all_qa_ehs_employees:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.risk_assessments | tenant_id | YES | Y | ehs_allow_all_risk_assessments:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.risk_controls | tenant_id | YES | Y | ehs_allow_all_risk_controls:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.safety_checks | tenant_id | YES | Y | ehs_allow_all_safety_checks:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.safety_hazards | tenant_id | YES | Y | ehs_allow_all_safety_hazards:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.safety_incidents | tenant_id | YES | Y | ehs_allow_all_safety_incidents:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.training_programs | tenant_id | YES | Y | ehs_allow_all_training_programs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.training_records | tenant_id | YES | Y | ehs_allow_all_training_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ehs.vaccination_records | tenant_id | YES | Y | ehs_allow_all_vaccination_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.audit_logs | tenant_id | YES | Y | erp_allow_all_audit_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.company_relations | tenant_id | YES | Y | erp_allow_all_company_relations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.consolidation_report_lines | tenant_id | YES | Y | erp_allow_all_consolidation_report_lines:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.consolidation_reports | tenant_id | YES | Y | erp_allow_all_consolidation_reports:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.consolidation_scope_companies | tenant_id | YES | Y | erp_allow_all_consolidation_scope_companies:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.consolidation_scopes | tenant_id | YES | Y | erp_allow_all_consolidation_scopes:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.customers | tenant_id | YES | Y | erp_allow_all_customers:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.dict_items | tenant_id | YES | Y | erp_allow_all_dict_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.dict_types | tenant_id | YES | Y | erp_allow_all_dict_types:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.elimination_rules | tenant_id | YES | Y | erp_allow_all_elimination_rules:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.financial_vouchers | tenant_id | YES | Y | erp_allow_all_financial_vouchers:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.fixed_assets | tenant_id | YES | Y | erp_allow_all_fixed_assets:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.internal_transactions | tenant_id | YES | Y | erp_allow_all_internal_transactions:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.leave_requests | tenant_id | NO | Y | erp_allow_all_leave_requests:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.opening_balances | tenant_id | YES | Y | erp_allow_all_opening_balances:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.sales_orders | tenant_id | YES | Y | erp_allow_all_sales_orders:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| erp.suppliers | tenant_id | YES | Y | erp_allow_all_suppliers:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.accounting_subjects | tenant_id | NO | Y | finance_allow_all_accounting_subjects:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.core_finance_approval_nodes | tenant_id | YES | Y | finance_allow_all_core_finance_approval_nodes:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.core_finance_payment_approval_config | tenant_id | YES | Y | finance_allow_all_core_finance_payment_approval_config:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.core_finance_payment_items | tenant_id | YES | Y | finance_allow_all_core_finance_payment_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.core_finance_payment_workflow | tenant_id | YES | Y | finance_allow_all_core_finance_payment_workflow:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.core_finance_payments | tenant_id | YES | Y | finance_allow_all_core_finance_payments:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.core_finance_voucher_lines | tenant_id | NO | Y | finance_allow_all_core_finance_voucher_lines:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.erp_payables | tenant_id | YES | Y | finance_allow_all_erp_payables:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.erp_payment_records | tenant_id | YES | Y | finance_allow_all_erp_payment_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.erp_receivables | tenant_id | YES | Y | finance_allow_all_erp_receivables:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.expenses | tenant_id | YES | Y | finance_allow_all_expenses:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.finance_voucher_generation_rules | tenant_id | YES | Y | finance_allow_all_finance_voucher_generation_rules:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.finance_voucher_template_lines | tenant_id | YES | Y | finance_allow_all_finance_voucher_template_lines:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.payables | tenant_id | NO | Y | finance_allow_all_payables:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.receivables | tenant_id | NO | Y | finance_allow_all_receivables:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.reconciliation_item_snapshots | tenant_id | YES | Y | finance_allow_all_reconciliation_item_snapshots:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.reconciliation_snapshots | tenant_id | YES | Y | finance_allow_all_reconciliation_snapshots:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| finance.settlement_snapshots | tenant_id | YES | Y | finance_allow_all_settlement_snapshots:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| gis.business_locations | tenant_id | YES | Y | gis_allow_all_business_locations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| gis.device_location_records | tenant_id | YES | Y | gis_allow_all_device_location_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| gis.device_locations | tenant_id | YES | Y | gis_allow_all_device_locations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| gis.devices | tenant_id | YES | Y | gis_allow_all_devices:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| gis.evidence_records | tenant_id | YES | Y | gis_allow_all_evidence_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| gis.factory_maps | tenant_id | YES | Y | gis_allow_all_factory_maps:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| gis.location_photos | tenant_id | YES | Y | gis_allow_all_location_photos:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| gis.locations | tenant_id | NO | Y | gis_allow_all_locations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| gis.track_records | tenant_id | YES | Y | gis_allow_all_track_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| gis.warehouse_locations | tenant_id | YES | Y | gis_allow_all_warehouse_locations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| hrm.audit_logs | tenant_id | YES | Y | hrm_allow_all_audit_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| hrm.initialization_logs | tenant_id | NO | Y | hrm_allow_all_initialization_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| integration.core_inter_module_sync | tenant_id | YES | Y | integration_allow_all_core_inter_module_sync:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| integration.crm_erp_sync | tenant_id | YES | Y | integration_allow_all_crm_erp_sync:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| integration.crm_scm_sync | tenant_id | YES | Y | integration_allow_all_crm_scm_sync:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| integration.erp_wms_sync | tenant_id | YES | Y | integration_allow_all_erp_wms_sync:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| integration.hrm_finance_sync | tenant_id | YES | Y | integration_allow_all_hrm_finance_sync:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| integration.integration_events | tenant_id | YES | Y | integration_allow_all_integration_events:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| integration.lims_qms_sync | tenant_id | YES | Y | integration_allow_all_lims_qms_sync:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| integration.mes_erp_sync | tenant_id | YES | Y | integration_allow_all_mes_erp_sync:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| integration.wms_scm_sync | tenant_id | YES | Y | integration_allow_all_wms_scm_sync:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.ai_analyses | tenant_id | YES | Y | lims_allow_all_ai_analyses:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.audit_logs | tenant_id | YES | Y | lims_allow_all_audit_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.document_relations | tenant_id | YES | Y | lims_allow_all_document_relations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.inspection_processes | tenant_id | YES | Y | lims_allow_all_inspection_processes:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.inspection_records | tenant_id | YES | Y | lims_allow_all_inspection_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.inspection_tasks | tenant_id | YES | Y | lims_allow_all_inspection_tasks:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.instrument_calibrations | tenant_id | YES | Y | lims_allow_all_instrument_calibrations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.instruments | tenant_id | YES | Y | lims_allow_all_instruments:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.lab_ledger | tenant_id | YES | Y | lims_allow_all_lab_ledger:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.maintenance_records | tenant_id | YES | Y | lims_allow_all_maintenance_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.reagent_usages | tenant_id | YES | Y | lims_allow_all_reagent_usages:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| lims.reagents | tenant_id | YES | Y | lims_allow_all_reagents:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mes.capacities | tenant_id | YES | Y | mes_allow_all_capacities:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mes.demand_forecasts | tenant_id | YES | Y | mes_allow_all_demand_forecasts:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mes.process_flows | tenant_id | YES | Y | mes_allow_all_process_flows:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mes.production_plans | tenant_id | YES | Y | mes_allow_all_production_plans:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mes.quality_inspections | tenant_id | YES | Y | mes_allow_all_quality_inspections:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mes.quality_patrol_items | tenant_id | YES | Y | mes_allow_all_quality_patrol_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mes.quality_patrols | tenant_id | YES | Y | mes_allow_all_quality_patrols:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mes.quality_standards | tenant_id | YES | Y | mes_allow_all_quality_standards:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.audio_recordings | tenant_id | NO | Y | mobile_allow_all_audio_recordings:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.barcode_scans | tenant_id | YES | Y | mobile_allow_all_barcode_scans:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.devices | tenant_id | YES | Y | mobile_allow_all_devices:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.media_files | tenant_id | YES | Y | mobile_allow_all_media_files:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.mobile_push_notifications | tenant_id | NO | Y | mobile_allow_all_mobile_push_notifications:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.mobile_scan_records | tenant_id | YES | Y | mobile_allow_all_mobile_scan_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.mobile_tasks | tenant_id | NO | Y | mobile_allow_all_mobile_tasks:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.mobile_users | tenant_id | YES | Y | mobile_allow_all_mobile_users:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.offline_operations | tenant_id | YES | Y | mobile_allow_all_offline_operations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.offline_sync_records | tenant_id | YES | Y | mobile_allow_all_offline_sync_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.patrol_records | tenant_id | NO | Y | mobile_allow_all_patrol_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.photo_evidences | tenant_id | NO | Y | mobile_allow_all_photo_evidences:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.photo_uploads | tenant_id | YES | Y | mobile_allow_all_photo_uploads:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.push_devices | tenant_id | YES | Y | mobile_allow_all_push_devices:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.push_templates | tenant_id | YES | Y | mobile_allow_all_push_templates:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.scan_records | tenant_id | NO | Y | mobile_allow_all_scan_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.sync_policies | tenant_id | YES | Y | mobile_allow_all_sync_policies:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| mobile.video_recordings | tenant_id | NO | Y | mobile_allow_all_video_recordings:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.acceptance_items | tenant_id | YES | Y | pm_allow_all_acceptance_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.acceptance_plans | tenant_id | YES | Y | pm_allow_all_acceptance_plans:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.acceptance_records | tenant_id | YES | Y | pm_allow_all_acceptance_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.acceptances | tenant_id | NO | Y | pm_allow_all_acceptances:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.budget_items | tenant_id | YES | Y | pm_allow_all_budget_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.contract_milestones | tenant_id | YES | Y | pm_allow_all_contract_milestones:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.contract_payment_schedule | tenant_id | YES | Y | pm_allow_all_contract_payment_schedule:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.contract_templates | tenant_id | YES | Y | pm_allow_all_contract_templates:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.contracts | tenant_id | NO | Y | pm_allow_all_contracts:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.defects | tenant_id | YES | Y | pm_allow_all_defects:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.document_folders | tenant_id | YES | Y | pm_allow_all_document_folders:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.document_versions | tenant_id | YES | Y | pm_allow_all_document_versions:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.notification_settings | tenant_id | YES | Y | pm_allow_all_notification_settings:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.notifications | tenant_id | NO | Y | pm_allow_all_notifications:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.project_approvals | tenant_id | NO | Y | pm_allow_all_project_approvals:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.project_benefits | tenant_id | NO | Y | pm_allow_all_project_benefits:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.project_documents | tenant_id | YES | Y | pm_allow_all_project_documents:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.project_expenses | tenant_id | NO | Y | pm_allow_all_project_expenses:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.project_reports | tenant_id | YES | Y | pm_allow_all_project_reports:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.project_resources | tenant_id | NO | Y | pm_allow_all_project_resources:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.project_risks | tenant_id | YES | Y | pm_allow_all_project_risks:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.project_type_configs | tenant_id | NO | Y | pm_allow_all_project_type_configs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.quality_checks | tenant_id | NO | Y | pm_allow_all_quality_checks:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.report_templates | tenant_id | YES | Y | pm_allow_all_report_templates:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.risk_events | tenant_id | YES | Y | pm_allow_all_risk_events:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.risks | tenant_id | NO | Y | pm_allow_all_risks:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.settlement_adjustments | tenant_id | YES | Y | pm_allow_all_settlement_adjustments:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.settlement_items | tenant_id | YES | Y | pm_allow_all_settlement_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| pm.settlements | tenant_id | NO | Y | pm_allow_all_settlements:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| portal.portal_todos | tenant_id | YES | Y | portal_allow_all_portal_todos:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| public.core_operation_logs | tenant_id | NO | Y | public_allow_all_core_operation_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| public.subscriptions | tenant_id | NO | Y | public_allow_all_subscriptions:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| scm.audit_logs | tenant_id | YES | Y | scm_allow_all_audit_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| scm.purchase_items | tenant_id | YES | Y | scm_allow_all_purchase_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| scm.purchase_orders | tenant_id | YES | Y | scm_allow_all_purchase_orders:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| scm.supplier_delivery_appointments | tenant_id | YES | Y | scm_allow_all_supplier_delivery_appointments:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| scm.supplier_evaluations | tenant_id | YES | Y | scm_allow_all_supplier_evaluations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| srm.audit_logs | tenant_id | YES | Y | srm_allow_all_audit_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| srm.contract_terms | tenant_id | YES | Y | srm_allow_all_contract_terms:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| srm.purchase_orders | tenant_id | YES | Y | srm_allow_all_purchase_orders:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| srm.supplier_categories | tenant_id | YES | Y | srm_allow_all_supplier_categories:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| srm.supplier_contracts | tenant_id | YES | Y | srm_allow_all_supplier_contracts:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| srm.supplier_evaluations | tenant_id | YES | Y | srm_allow_all_supplier_evaluations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| srm.supplier_products | tenant_id | YES | Y | srm_allow_all_supplier_products:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ticket.core_ticket_activities | tenant_id | NO | Y | ticket_allow_all_core_ticket_activities:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ticket.core_ticket_comments | tenant_id | NO | Y | ticket_allow_all_core_ticket_comments:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ticket.core_ticket_sla_escalations | tenant_id | NO | Y | ticket_allow_all_core_ticket_sla_escalations:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ticket.core_ticket_sla_policies | tenant_id | NO | Y | ticket_allow_all_core_ticket_sla_policies:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ticket.core_tickets | tenant_id | NO | Y | ticket_allow_all_core_tickets:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ticket.ticket_automation_rules | tenant_id | NO | Y | ticket_allow_all_ticket_automation_rules:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| ticket.ticket_knowledge_articles | tenant_id | NO | Y | ticket_allow_all_ticket_knowledge_articles:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.audit_logs | tenant_id | YES | Y | wms_allow_all_audit_logs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.batches | tenant_id | YES | Y | wms_allow_all_batches:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.cycle_count_configs | tenant_id | YES | Y | wms_allow_all_cycle_count_configs:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.discrepancy_records | tenant_id | YES | Y | wms_allow_all_discrepancy_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.inbound_order_items | tenant_id | YES | Y | wms_allow_all_inbound_order_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.inventory_alert_records | tenant_id | YES | Y | wms_allow_all_inventory_alert_records:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.inventory_alert_rules | tenant_id | YES | Y | wms_allow_all_inventory_alert_rules:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.outbound_order_items | tenant_id | YES | Y | wms_allow_all_outbound_order_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.stock_take_items | tenant_id | YES | Y | wms_allow_all_stock_take_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.transfer_items | tenant_id | YES | Y | wms_allow_all_transfer_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.transfers | tenant_id | YES | Y | wms_allow_all_transfers:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.warehouses | tenant_id | YES | Y | wms_allow_all_warehouses:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.wave_pick_items | tenant_id | YES | Y | wms_allow_all_wave_pick_items:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.wave_picks | tenant_id | YES | Y | wms_allow_all_wave_picks:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |
| wms.wms_approval_events | tenant_id | YES | Y | wms_allow_all_wms_approval_events:allow_all | 以租户策略替换 allow_all（需逐个确认业务全局语义） |

## 类 E：无租户列 + allow_all → 保留，登记为全局/系统表

| 表 | 租户列 | 可空 | FORCE RLS | 策略（名:形态） | 建议动作 |
|---|---|---|---|---|---|
| core.core_tenant_plugins | - | - | Y | core_allow_all_core_tenant_plugins:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| crm.core_crm_customers | - | - | Y | crm_allow_all_core_crm_customers:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| doc.document_versions | - | - | Y | doc_allow_all_document_versions:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| doc.documents | - | - | Y | doc_allow_all_documents:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| doc.folders | - | - | Y | doc_allow_all_folders:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| doc.templates | - | - | Y | doc_allow_all_templates:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| doc_service.archives | - | - | Y | doc_service_allow_all_archives:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| doc_service.files | - | - | Y | doc_service_allow_all_files:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| doc_service.folders | - | - | Y | doc_service_allow_all_folders:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| doc_service.templates | - | - | Y | doc_service_allow_all_templates:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| erp.core_erp_materials | - | - | Y | erp_allow_all_core_erp_materials:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| erp.core_erp_suppliers | - | - | Y | erp_allow_all_core_erp_suppliers:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| erp.expenses | - | - | Y | erp_allow_all_expenses:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| erp.holidays | - | - | Y | erp_allow_all_holidays:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| erp.meeting_bookings | - | - | Y | erp_allow_all_meeting_bookings:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| erp.meeting_rooms | - | - | Y | erp_allow_all_meeting_rooms:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| erp.payables | - | - | Y | erp_allow_all_payables:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| erp.receivables | - | - | Y | erp_allow_all_receivables:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| erp.vehicle_requests | - | - | Y | erp_allow_all_vehicle_requests:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| erp.vehicles | - | - | Y | erp_allow_all_vehicles:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| flow.audit_logs | - | - | Y | flow_allow_all_audit_logs:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| flow.notifications | - | - | Y | flow_allow_all_notifications:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| flow.workflows | - | - | Y | flow_allow_all_workflows:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| gis.audit_log | - | - | Y | gis_allow_all_audit_log:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| gis.audit_logs | - | - | Y | gis_allow_all_audit_logs:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| gis.geodata | - | - | Y | gis_allow_all_geodata:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| gis.geofeatures | - | - | Y | gis_allow_all_geofeatures:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| gis.geofence_alerts | - | - | Y | gis_allow_all_geofence_alerts:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| gis.map_layers | - | - | Y | gis_allow_all_map_layers:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| gis.spatial_analysis | - | - | Y | gis_allow_all_spatial_analysis:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| iam.audit_logs | - | - | Y | iam_allow_all_audit_logs:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| iam.permissions | - | - | Y | iam_allow_all_permissions:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| iam.roles | - | - | Y | iam_allow_all_roles:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| mail.emails | - | - | Y | mail_allow_all_emails:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| mail.templates | - | - | Y | mail_allow_all_templates:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| master_data.core_dict_items | - | - | Y | master_data_allow_all_core_dict_items:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| master_data.core_dict_types | - | - | Y | master_data_allow_all_core_dict_types:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| mes.material_categories | - | - | Y | mes_allow_all_material_categories:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| mes.material_requirement_items | - | - | Y | mes_allow_all_material_requirement_items:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| mobile.oa_announcement_reads | - | - | Y | mobile_allow_all_oa_announcement_reads:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| notification.notifications | - | - | Y | notification_allow_all_notifications:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| pdm.pdm_master_data_refs | - | - | Y | pdm_allow_all_pdm_master_data_refs:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| pm.service_integrations | - | - | Y | pm_allow_all_service_integrations:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| portal.portal_announcements | - | - | Y | portal_allow_all_portal_announcements:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| portal.portal_quick_actions | - | - | Y | portal_allow_all_portal_quick_actions:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| portal.user_preferences | - | - | Y | portal_allow_all_user_preferences:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| public.alert_rules | - | - | Y | public_allow_all_alert_rules:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| public.alerts | - | - | Y | public_allow_all_alerts:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| public.navigation_menu | - | - | Y | public_allow_all_navigation_menu:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| public.pinned_apps | - | - | Y | public_allow_all_pinned_apps:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| public.todos | - | - | Y | public_allow_all_todos:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| public.user_settings | - | - | Y | public_allow_all_user_settings:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| qms.audit_logs | - | - | Y | qms_allow_all_audit_logs:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| qms.corrective_actions | - | - | Y | qms_allow_all_corrective_actions:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| qms.dashboard_metrics | - | - | Y | qms_allow_all_dashboard_metrics:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| qms.inspection_items | - | - | Y | qms_allow_all_inspection_items:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| qms.quality_inspections | - | - | Y | qms_allow_all_quality_inspections:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| qms.quality_issues | - | - | Y | qms_allow_all_quality_issues:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| qms.quality_standards | - | - | Y | qms_allow_all_quality_standards:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| report.reports | - | - | Y | report_allow_all_reports:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| storage.files | - | - | Y | storage_allow_all_files:allow_all | 无租户列 + allow_all：保留（登记为全局表） |
| wms.wms_master_data_refs | - | - | Y | wms_allow_all_wms_master_data_refs:allow_all | 无租户列 + allow_all：保留（登记为全局表） |

## 类 F：无租户列且无 allow_all → 需人工判定

| 表 | 租户列 | 可空 | FORCE RLS | 策略（名:形态） | 建议动作 |
|---|---|---|---|---|---|
