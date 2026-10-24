-- ============================================================================
-- 20261007000028 — DB-01 修复：外键子列补支撑索引（81 条，幂等）
-- ============================================================================
-- 来源：artifacts/audit/TOPEMS审计报告.md DB-01（81/307=26% 外键子列缺支撑索引）
-- 复现口径：pg_constraint(contype='f') 左连 pg_index，无任何索引以该 FK 首列
-- 为前导列（indkey[0]=conkey[1]）即视为缺索引。5432 复现值=81，与审计一致。
-- 命名：idx_<table>_<col>，对齐既有 20260924110000_create_fk_indexes.sql 风格。
-- 全部 CREATE INDEX IF NOT EXISTS，可重复执行；本文件仅为草稿，不在本阶段应用。
-- 优先级（审计 L172）：iam 权限族 + ehs 整族已含在内。
-- ============================================================================

-- ---- schema: bi (2 条) ----
CREATE INDEX IF NOT EXISTS "idx_report_execution_records_schedule_id" ON "bi"."report_execution_records" ("schedule_id");  -- FK: 见 bi.report_execution_records
CREATE INDEX IF NOT EXISTS "idx_report_subscriptions_template_id" ON "bi"."report_subscriptions" ("template_id");  -- FK: 见 bi.report_subscriptions

-- ---- schema: core (1 条) ----
CREATE INDEX IF NOT EXISTS "idx_core_plugin_reviews_plugin_id" ON "core"."core_plugin_reviews" ("plugin_id");  -- FK: 见 core.core_plugin_reviews

-- ---- schema: ehs (23 条) ----
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_accident_investigations_accident_id" ON "ehs"."qa_ehs_accident_investigations" ("accident_id");  -- FK: 见 ehs.qa_ehs_accident_investigations
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_accident_reviews_accident_id" ON "ehs"."qa_ehs_accident_reviews" ("accident_id");  -- FK: 见 ehs.qa_ehs_accident_reviews
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_accident_treatments_accident_id" ON "ehs"."qa_ehs_accident_treatments" ("accident_id");  -- FK: 见 ehs.qa_ehs_accident_treatments
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_compliance_items_evaluation_id" ON "ehs"."qa_ehs_compliance_items" ("evaluation_id");  -- FK: 见 ehs.qa_ehs_compliance_items
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_compliance_items_regulation_id" ON "ehs"."qa_ehs_compliance_items" ("regulation_id");  -- FK: 见 ehs.qa_ehs_compliance_items
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_detection_records_factor_id" ON "ehs"."qa_ehs_detection_records" ("factor_id");  -- FK: 见 ehs.qa_ehs_detection_records
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_drill_evaluations_drill_id" ON "ehs"."qa_ehs_drill_evaluations" ("drill_id");  -- FK: 见 ehs.qa_ehs_drill_evaluations
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_drill_problems_drill_id" ON "ehs"."qa_ehs_drill_problems" ("drill_id");  -- FK: 见 ehs.qa_ehs_drill_problems
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_drill_records_plan_id" ON "ehs"."qa_ehs_drill_records" ("plan_id");  -- FK: 见 ehs.qa_ehs_drill_records
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_emergency_plan_approvals_plan_id" ON "ehs"."qa_ehs_emergency_plan_approvals" ("plan_id");  -- FK: 见 ehs.qa_ehs_emergency_plan_approvals
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_emergency_plan_supplies_plan_id" ON "ehs"."qa_ehs_emergency_plan_supplies" ("plan_id");  -- FK: 见 ehs.qa_ehs_emergency_plan_supplies
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_emergency_plan_versions_plan_id" ON "ehs"."qa_ehs_emergency_plan_versions" ("plan_id");  -- FK: 见 ehs.qa_ehs_emergency_plan_versions
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_hazard_rectifications_hazard_id" ON "ehs"."qa_ehs_hazard_rectifications" ("hazard_id");  -- FK: 见 ehs.qa_ehs_hazard_rectifications
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_hazard_verifications_hazard_id" ON "ehs"."qa_ehs_hazard_verifications" ("hazard_id");  -- FK: 见 ehs.qa_ehs_hazard_verifications
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_health_abnormalities_record_id" ON "ehs"."qa_ehs_health_abnormalities" ("record_id");  -- FK: 见 ehs.qa_ehs_health_abnormalities
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_health_exam_records_plan_id" ON "ehs"."qa_ehs_health_exam_records" ("plan_id");  -- FK: 见 ehs.qa_ehs_health_exam_records
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_inspection_items_plan_id" ON "ehs"."qa_ehs_inspection_items" ("plan_id");  -- FK: 见 ehs.qa_ehs_inspection_items
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_inspection_record_items_item_id" ON "ehs"."qa_ehs_inspection_record_items" ("item_id");  -- FK: 见 ehs.qa_ehs_inspection_record_items
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_inspection_record_items_record_id" ON "ehs"."qa_ehs_inspection_record_items" ("record_id");  -- FK: 见 ehs.qa_ehs_inspection_record_items
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_inspection_records_plan_id" ON "ehs"."qa_ehs_inspection_records" ("plan_id");  -- FK: 见 ehs.qa_ehs_inspection_records
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_material_stocks_material_id" ON "ehs"."qa_ehs_material_stocks" ("material_id");  -- FK: 见 ehs.qa_ehs_material_stocks
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_msds_material_id" ON "ehs"."qa_ehs_msds" ("material_id");  -- FK: 见 ehs.qa_ehs_msds
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_stock_records_material_id" ON "ehs"."qa_ehs_stock_records" ("material_id");  -- FK: 见 ehs.qa_ehs_stock_records

-- ---- schema: finance (3 条) ----
CREATE INDEX IF NOT EXISTS "idx_finance_v58_pool_transfers_from_pool" ON "finance"."finance_v58_pool_transfers" ("from_pool");  -- FK: 见 finance.finance_v58_pool_transfers
CREATE INDEX IF NOT EXISTS "idx_finance_v58_pool_transfers_to_pool" ON "finance"."finance_v58_pool_transfers" ("to_pool");  -- FK: 见 finance.finance_v58_pool_transfers
CREATE INDEX IF NOT EXISTS "idx_finance_v60_schedule_dependencies_depends_on" ON "finance"."finance_v60_schedule_dependencies" ("depends_on");  -- FK: 见 finance.finance_v60_schedule_dependencies

-- ---- schema: flow (4 条) ----
CREATE INDEX IF NOT EXISTS "idx_core_doc_documents_folder_id" ON "flow"."core_doc_documents" ("folder_id");  -- FK: 见 flow.core_doc_documents
CREATE INDEX IF NOT EXISTS "idx_core_doc_documents_template_id" ON "flow"."core_doc_documents" ("template_id");  -- FK: 见 flow.core_doc_documents
CREATE INDEX IF NOT EXISTS "idx_core_doc_folders_parent_id" ON "flow"."core_doc_folders" ("parent_id");  -- FK: 见 flow.core_doc_folders
CREATE INDEX IF NOT EXISTS "idx_core_flow_variable_history_variable_id" ON "flow"."core_flow_variable_history" ("variable_id");  -- FK: 见 flow.core_flow_variable_history

-- ---- schema: gis (1 条) ----
CREATE INDEX IF NOT EXISTS "idx_map_layers_map_id" ON "gis"."map_layers" ("map_id");  -- FK: 见 gis.map_layers

-- ---- schema: iam (7 条) ----
DO $$ BEGIN IF to_regclass('"iam"."core_billing_invoices"') IS NOT NULL THEN
  CREATE INDEX IF NOT EXISTS "idx_core_billing_invoices_subscription_id" ON "iam"."core_billing_invoices" ("subscription_id");
END IF; END $$;
DO $$ BEGIN IF to_regclass('"iam"."core_role_permissions"') IS NOT NULL THEN
  CREATE INDEX IF NOT EXISTS "idx_core_role_permissions_permission_id" ON "iam"."core_role_permissions" ("permission_id");
END IF; END $$;
DO $$ BEGIN IF to_regclass('"iam"."core_subscriptions"') IS NOT NULL THEN
  CREATE INDEX IF NOT EXISTS "idx_core_subscriptions_plan_id" ON "iam"."core_subscriptions" ("plan_id");
END IF; END $$;
DO $$ BEGIN IF to_regclass('"iam"."core_tenant_plugins"') IS NOT NULL THEN
  CREATE INDEX IF NOT EXISTS "idx_core_tenant_plugins_plugin_id" ON "iam"."core_tenant_plugins" ("plugin_id");
END IF; END $$;
DO $$ BEGIN IF to_regclass('"iam"."core_user_roles"') IS NOT NULL THEN
  CREATE INDEX IF NOT EXISTS "idx_core_user_roles_role_id" ON "iam"."core_user_roles" ("role_id");
END IF; END $$;
CREATE INDEX IF NOT EXISTS "idx_position_roles_role_id" ON "iam"."position_roles" ("role_id");  -- FK: 见 iam.position_roles
CREATE INDEX IF NOT EXISTS "idx_user_positions_position_id" ON "iam"."user_positions" ("position_id");  -- FK: 见 iam.user_positions

-- ---- schema: mes (8 条) ----
DO $$ BEGIN IF to_regclass('"mes"."core_billing_invoices"') IS NOT NULL THEN
  CREATE INDEX IF NOT EXISTS "idx_core_billing_invoices_subscription_id" ON "mes"."core_billing_invoices" ("subscription_id");
END IF; END $$;
DO $$ BEGIN IF to_regclass('"mes"."core_role_permissions"') IS NOT NULL THEN
  CREATE INDEX IF NOT EXISTS "idx_core_role_permissions_permission_id" ON "mes"."core_role_permissions" ("permission_id");
END IF; END $$;
DO $$ BEGIN IF to_regclass('"mes"."core_subscriptions"') IS NOT NULL THEN
  CREATE INDEX IF NOT EXISTS "idx_core_subscriptions_plan_id" ON "mes"."core_subscriptions" ("plan_id");
END IF; END $$;
DO $$ BEGIN IF to_regclass('"mes"."core_tenant_plugins"') IS NOT NULL THEN
  CREATE INDEX IF NOT EXISTS "idx_core_tenant_plugins_plugin_id" ON "mes"."core_tenant_plugins" ("plugin_id");
END IF; END $$;
DO $$ BEGIN IF to_regclass('"mes"."core_user_roles"') IS NOT NULL THEN
  CREATE INDEX IF NOT EXISTS "idx_core_user_roles_role_id" ON "mes"."core_user_roles" ("role_id");
END IF; END $$;
CREATE INDEX IF NOT EXISTS "idx_production_records_equipment_id" ON "mes"."production_records" ("equipment_id");  -- FK: 见 mes.production_records
CREATE INDEX IF NOT EXISTS "idx_work_stations_equipment_id" ON "mes"."work_stations" ("equipment_id");  -- FK: 见 mes.work_stations
CREATE INDEX IF NOT EXISTS "idx_work_stations_process_id" ON "mes"."work_stations" ("process_id");  -- FK: 见 mes.work_stations

-- ---- schema: mobile (1 条) ----
CREATE INDEX IF NOT EXISTS "idx_shortcuts_user_id" ON "mobile"."shortcuts" ("user_id");  -- FK: 见 mobile.shortcuts

-- ---- schema: public (30 条) ----
CREATE INDEX IF NOT EXISTS "idx_core_flow_variable_history_variable_id" ON "public"."core_flow_variable_history" ("variable_id");  -- FK: 见 public.core_flow_variable_history
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_accident_investigations_accident_id" ON "public"."qa_ehs_accident_investigations" ("accident_id");  -- FK: 见 public.qa_ehs_accident_investigations
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_accident_reviews_accident_id" ON "public"."qa_ehs_accident_reviews" ("accident_id");  -- FK: 见 public.qa_ehs_accident_reviews
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_accident_treatments_accident_id" ON "public"."qa_ehs_accident_treatments" ("accident_id");  -- FK: 见 public.qa_ehs_accident_treatments
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_compliance_items_evaluation_id" ON "public"."qa_ehs_compliance_items" ("evaluation_id");  -- FK: 见 public.qa_ehs_compliance_items
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_compliance_items_regulation_id" ON "public"."qa_ehs_compliance_items" ("regulation_id");  -- FK: 见 public.qa_ehs_compliance_items
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_detection_records_factor_id" ON "public"."qa_ehs_detection_records" ("factor_id");  -- FK: 见 public.qa_ehs_detection_records
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_drill_evaluations_drill_id" ON "public"."qa_ehs_drill_evaluations" ("drill_id");  -- FK: 见 public.qa_ehs_drill_evaluations
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_drill_problems_drill_id" ON "public"."qa_ehs_drill_problems" ("drill_id");  -- FK: 见 public.qa_ehs_drill_problems
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_drill_records_plan_id" ON "public"."qa_ehs_drill_records" ("plan_id");  -- FK: 见 public.qa_ehs_drill_records
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_emergency_plan_approvals_plan_id" ON "public"."qa_ehs_emergency_plan_approvals" ("plan_id");  -- FK: 见 public.qa_ehs_emergency_plan_approvals
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_emergency_plan_supplies_plan_id" ON "public"."qa_ehs_emergency_plan_supplies" ("plan_id");  -- FK: 见 public.qa_ehs_emergency_plan_supplies
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_emergency_plan_versions_plan_id" ON "public"."qa_ehs_emergency_plan_versions" ("plan_id");  -- FK: 见 public.qa_ehs_emergency_plan_versions
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_hazard_rectifications_hazard_id" ON "public"."qa_ehs_hazard_rectifications" ("hazard_id");  -- FK: 见 public.qa_ehs_hazard_rectifications
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_hazard_verifications_hazard_id" ON "public"."qa_ehs_hazard_verifications" ("hazard_id");  -- FK: 见 public.qa_ehs_hazard_verifications
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_hazards_inspection_id" ON "public"."qa_ehs_hazards" ("inspection_id");  -- FK: 见 public.qa_ehs_hazards
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_health_abnormalities_record_id" ON "public"."qa_ehs_health_abnormalities" ("record_id");  -- FK: 见 public.qa_ehs_health_abnormalities
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_health_exam_records_plan_id" ON "public"."qa_ehs_health_exam_records" ("plan_id");  -- FK: 见 public.qa_ehs_health_exam_records
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_inspection_items_plan_id" ON "public"."qa_ehs_inspection_items" ("plan_id");  -- FK: 见 public.qa_ehs_inspection_items
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_inspection_record_items_item_id" ON "public"."qa_ehs_inspection_record_items" ("item_id");  -- FK: 见 public.qa_ehs_inspection_record_items
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_inspection_record_items_record_id" ON "public"."qa_ehs_inspection_record_items" ("record_id");  -- FK: 见 public.qa_ehs_inspection_record_items
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_inspection_records_plan_id" ON "public"."qa_ehs_inspection_records" ("plan_id");  -- FK: 见 public.qa_ehs_inspection_records
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_material_stocks_material_id" ON "public"."qa_ehs_material_stocks" ("material_id");  -- FK: 见 public.qa_ehs_material_stocks
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_msds_material_id" ON "public"."qa_ehs_msds" ("material_id");  -- FK: 见 public.qa_ehs_msds
CREATE INDEX IF NOT EXISTS "idx_qa_ehs_stock_records_material_id" ON "public"."qa_ehs_stock_records" ("material_id");  -- FK: 见 public.qa_ehs_stock_records
CREATE INDEX IF NOT EXISTS "idx_qa_lims_barcode_scan_records_barcode_id" ON "public"."qa_lims_barcode_scan_records" ("barcode_id");  -- FK: 见 public.qa_lims_barcode_scan_records
CREATE INDEX IF NOT EXISTS "idx_qa_lims_method_categories_parent_id" ON "public"."qa_lims_method_categories" ("parent_id");  -- FK: 见 public.qa_lims_method_categories
CREATE INDEX IF NOT EXISTS "idx_qa_lims_pt_corrective_actions_evaluation_id" ON "public"."qa_lims_pt_corrective_actions" ("evaluation_id");  -- FK: 见 public.qa_lims_pt_corrective_actions
CREATE INDEX IF NOT EXISTS "idx_qa_lims_pt_evaluations_sample_id" ON "public"."qa_lims_pt_evaluations" ("sample_id");  -- FK: 见 public.qa_lims_pt_evaluations
CREATE INDEX IF NOT EXISTS "idx_qa_lims_rfid_tags_sample_id" ON "public"."qa_lims_rfid_tags" ("sample_id");  -- FK: 见 public.qa_lims_rfid_tags

-- ---- schema: scm (1 条) ----
CREATE INDEX IF NOT EXISTS "idx_supplier_products_supplier_id" ON "scm"."supplier_products" ("supplier_id");  -- FK: 见 scm.supplier_products

