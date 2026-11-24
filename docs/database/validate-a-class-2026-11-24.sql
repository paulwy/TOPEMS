-- A 类（有映射）NOT VALID 状态约束批量 VALIDATE（断言式，2026-11-24）
-- 依据：docs/database/status-db-check-mappings.json（人工核对映射）+ 代码枚举逐值断言
-- 期望值优先级：impl 块内 DB_VALUES > impl 块内 Self::X => "y" 字面量 > impl_status! 宏 > 存量声明（weak）
-- 排除：finance.expenses（3 行 status='pending' 待清洗）
-- 用法：psql -h /tmp -U air -d topems -v ON_ERROR_STOP=1 -f docs/database/validate-a-class-2026-11-24.sql

-- C 类 NOT VALID 状态约束批量 VALIDATE（断言式，2026-11-24）
-- 判定依据：docs/database/not-valid-triage-2026-11-24.md / .json
-- 规则：逐条断言
--   1) 约束存在且 convalidated = false
--   2) 约束字面值集 == 期望值集（期望源自代码 DB_VALUES / 迁移声明）
--   3) ALTER TABLE ... VALIDATE CONSTRAINT 成功
-- 任一不满足即跳过并计数，绝不"能通过就盖章"
-- 幂等：已 convalidated 的计入 skip，可重复执行
-- 用法：psql -h /tmp -U air -d topems -v ON_ERROR_STOP=1 \
--        -f database/maintenance/20261124_validate_c_class_status_checks.sql

CREATE TEMP TABLE _batch_targets (schema_name text, table_name text, constraint_name text, expected text[]);

INSERT INTO _batch_targets (schema_name, table_name, constraint_name, expected) VALUES
  ('crm', 'customer_orders', 'ck_customer_orders_status_standard', ARRAY['approved', 'cancelled', 'completed', 'draft', 'pending', 'shipped']::text[]),
  ('crm', 'crm_master_data_refs', 'ck_crm_master_data_refs_status_standard', ARRAY['active', 'deleted', 'inactive']::text[]),
  ('crm', 'sales_orders', 'ck_sales_orders_status_standard', ARRAY['approved', 'cancelled', 'completed', 'draft', 'pending', 'shipped']::text[]),
  ('crm', 'billing_records', 'ck_billing_records_status_standard', ARRAY['cancelled', 'overdue', 'paid', 'pending']::text[]),
  ('erp', 'sales_orders', 'sales_orders_status_check', ARRAY['approved', 'cancelled', 'completed', 'draft', 'pending', 'shipped']::text[]),
  ('finance', 'expense_approvals', 'ck_expense_approvals_status_standard', ARRAY['approved', 'draft', 'pending', 'reimbursed', 'rejected']::text[]),
  ('finance', 'reconciliation_settlement_links', 'ck_reconciliation_settlement_links_status_standard', ARRAY['cancelled', 'linked']::text[]),
  ('finance', 'finance_v55_invoices', 'ck_finance_v55_invoices_status_standard', ARRAY['pending', 'posted', 'recognized', 'verified']::text[]),
  ('finance', 'finance_v55_reconciliation_results', 'ck_finance_v55_recon_results_match_status_standard', ARRAY['discrepancy', 'matched', 'partial', 'unmatched']::text[]),
  ('finance', 'financial_reports', 'ck_financial_reports_status_standard', ARRAY['approved', 'draft', 'locked', 'pending', 'rejected']::text[]),
  ('finance', 'financial_reports', 'ck_financial_reports_approval_status_standard', ARRAY['approved', 'draft', 'locked', 'pending', 'rejected']::text[]),
  ('finance', 'finance_v60_decision_scenarios', 'ck_finance_v60_decision_scenarios_status_standard', ARRAY['active', 'archived', 'draft', 'evaluated']::text[]),
  ('finance', 'finance_v60_schedule_tasks', 'ck_finance_v60_schedule_tasks_status_standard', ARRAY['completed', 'failed', 'paused', 'pending', 'running']::text[]),
  ('finance', 'finance_v56_tax_forms', 'ck_finance_v56_tax_forms_status_standard', ARRAY['accepted', 'calculated', 'draft', 'rejected', 'submitted']::text[]),
  ('finance', 'finance_v56_tax_plans', 'ck_finance_v56_tax_plans_status_standard', ARRAY['approved', 'draft', 'executed', 'proposed', 'rejected', 'under_review']::text[]),
  ('finance', 'finance_v57_generated_reports', 'ck_finance_v57_generated_reports_status_standard', ARRAY['completed', 'failed', 'generating', 'pending']::text[]),
  ('finance', 'erp_collection_records', 'ck_erp_collection_records_status_standard', ARRAY['confirmed', 'pending', 'written_off']::text[]),
  ('finance', 'finance_audit_findings_v52', 'ck_finance_audit_findings_v52_status_standard', ARRAY['ignored', 'open', 'resolved']::text[]),
  ('finance', 'finance_v60_alerts', 'ck_finance_v60_alerts_status_standard', ARRAY['acknowledged', 'active', 'resolved', 'suppressed']::text[]),
  ('mes', 'capacities', 'ck_capacities_status_standard', ARRAY['allocated', 'available', 'consumed', 'maintenance', 'released']::text[]),
  ('mes', 'demand_forecasts', 'ck_demand_forecasts_status_standard', ARRAY['adopted', 'calculated', 'cancelled', 'draft', 'superseded', 'validated']::text[]),
  ('mes', 'material_plans', 'ck_material_plans_status_standard', ARRAY['cancelled', 'pending', 'requisitioned', 'satisfied', 'shortage', 'sourced']::text[]),
  ('mes', 'production_plans', 'ck_production_plans_status_standard', ARRAY['approved', 'cancelled', 'completed', 'draft', 'in_progress', 'pending_approval']::text[]),
  ('bi', 'report_schedules', 'ck_report_schedules_status_standard', ARRAY['active', 'completed', 'failed', 'paused']::text[]),
  ('integration', 'async_tasks', 'ck_async_tasks_status_standard', ARRAY['cancelled', 'completed', 'failed', 'in_progress', 'max_retries_exceeded', 'pending']::text[]),
  ('rs', 'projects', 'ck_rs_projects_status_standard', ARRAY['active', 'cancelled', 'completed', 'draft', 'paused', 'pending_approval']::text[]),
  ('rs', 'project_milestones', 'ck_project_milestones_status_standard', ARRAY['achieved', 'delayed', 'pending']::text[]),
  ('rs', 'project_phases', 'ck_project_phases_status_standard', ARRAY['completed', 'delayed', 'in_progress', 'not_started']::text[]),
  ('pm', 'projects', 'ck_projects_status_standard', ARRAY['active', 'cancelled', 'completed', 'draft', 'paused', 'pending_approval', 'rejected']::text[]),
  ('wms', 'outbound_orders', 'ck_outbound_orders_picking_status_standard', ARRAY['completed', 'in_progress', 'pending']::text[]),
  ('wms', 'stock_takes', 'ck_stock_takes_adjustment_status_standard', ARRAY['completed', 'pending']::text[]),
  ('wms', 'stock_takes', 'ck_stock_takes_approval_status_standard', ARRAY['approved', 'pending', 'rejected']::text[]),
  ('wms', 'stock_take_items', 'ck_stock_take_items_status_standard', ARRAY['completed', 'pending']::text[]),
  ('wms', 'stock_take_items', 'ck_stock_take_items_quality_status_standard', ARRAY['pending', 'qualified', 'unqualified']::text[]),
  ('crm', 'sales_forecasts', 'ck_sales_forecasts_status_standard', ARRAY['archived', 'draft', 'generated']::text[]),
  ('crm', 'interactions', 'ck_interactions_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'scheduled']::text[]),
  ('crm', 'contacts', 'contacts_approval_status_check', ARRAY['approved', 'none', 'pending', 'rejected']::text[]),
  ('crm', 'customers', 'customers_approval_status_check', ARRAY['approved', 'none', 'pending', 'rejected']::text[]),
  ('wms', 'slotting_suggestions', 'ck_slotting_suggestions_status_standard', ARRAY['applied', 'pending', 'rejected']::text[]),
  ('wms', 'discrepancy_records', 'ck_discrepancy_records_adjustment_status_standard', ARRAY['approved', 'completed', 'pending', 'rejected']::text[]),
  ('wms', 'batches', 'ck_batches_status_standard', ARRAY['frozen', 'in_stock', 'out_stock', 'reserved', 'scrapped']::text[]),
  ('wms', 'batches', 'ck_batches_quality_status_standard', ARRAY['inspecting', 'pending', 'qualified', 'unqualified']::text[]),
  ('wms', 'inbound_orders', 'ck_inbound_orders_status_standard', ARRAY['cancelled', 'completed', 'confirmed', 'created', 'received']::text[]),
  ('wms', 'outbound_orders', 'ck_outbound_orders_status_standard', ARRAY['cancelled', 'completed', 'confirmed', 'created', 'packing', 'picking', 'shipping']::text[]),
  ('wms', 'replenishment_order_items', 'ck_replenishment_order_items_status_standard', ARRAY['completed', 'confirmed', 'pending']::text[]),
  ('wms', 'replenishment_orders', 'ck_replenishment_orders_status_standard', ARRAY['completed', 'confirmed', 'pending']::text[]),
  ('wms', 'replenishment_suggestions', 'ck_replenishment_suggestions_status_standard', ARRAY['active', 'confirmed', 'draft']::text[]),
  ('wms', 'serial_numbers', 'ck_serial_numbers_status_standard', ARRAY['frozen', 'in_stock', 'out_stock', 'reserved', 'scrapped']::text[]),
  ('wms', 'serial_numbers', 'ck_serial_numbers_quality_status_standard', ARRAY['inspecting', 'pending', 'qualified', 'unqualified']::text[]),
  ('wms', 'transfer_orders', 'ck_transfer_orders_status_standard', ARRAY['cancelled', 'completed', 'confirmed', 'pending', 'received', 'shipped']::text[]),
  ('wms', 'transfer_order_items', 'ck_transfer_order_items_status_standard', ARRAY['cancelled', 'completed', 'partial', 'pending', 'shipped']::text[]),
  ('wms', 'wave_picks', 'ck_wave_picks_status_standard', ARRAY['assigned', 'cancelled', 'completed', 'created', 'picking']::text[]),
  ('wms', 'wave_pick_items', 'ck_wave_pick_items_status_standard', ARRAY['pending', 'picked', 'short_picked']::text[]),
  ('wms', 'locations', 'ck_wms_locations_status_standard', ARRAY['available', 'full', 'inactive', 'partial']::text[]),
  ('wms', 'stock_takes', 'ck_stock_takes_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'planned']::text[]),
  ('srm', 'supplier_contracts', 'ck_supplier_contracts_status_standard', ARRAY['active', 'archived', 'draft', 'inactive']::text[]),
  ('crm', 'contracts', 'ck_crm_contracts_status_canonical', ARRAY['active', 'completed', 'draft', 'expired', 'pending', 'terminated']::text[]),
  ('crm', 'opportunities', 'ck_crm_opportunities_status_canonical', ARRAY['archived', 'lost', 'open', 'won']::text[]),
  ('master_data', 'mdm_subscriptions', 'mdm_subscriptions_status_check', ARRAY['active', 'cancelled', 'expired', 'pending']::text[]),
  ('master_data', 'mdm_billing_records', 'mdm_billing_records_status_check', ARRAY['invoiced', 'overdue', 'paid', 'pending']::text[]),
  ('master_data', 'mdm_sla_incidents', 'mdm_sla_incidents_status_check', ARRAY['closed', 'investigating', 'open', 'resolved']::text[]),
  ('master_data', 'mdm_recovery_plans', 'mdm_recovery_plans_status_check', ARRAY['active', 'completed', 'draft', 'executing', 'failed']::text[]),
  ('master_data', 'mdm_continuity_plans', 'mdm_continuity_plans_status_check', ARRAY['active', 'draft', 'expired', 'tested']::text[]),
  ('master_data', 'mdm_region_configs', 'mdm_region_configs_status_check', ARRAY['degraded', 'offline', 'online']::text[]),
  ('master_data', 'mdm_replication_configs', 'mdm_replication_configs_status_check', ARRAY['lagging', 'paused', 'running', 'stopped']::text[]),
  ('master_data', 'mdm_failover_records', 'mdm_failover_records_status_check', ARRAY['completed', 'in_progress', 'initiated', 'rolled_back']::text[]),
  ('master_data', 'mdm_data_products', 'mdm_data_products_status_check', ARRAY['deprecated', 'draft', 'published', 'retired']::text[]),
  ('master_data', 'mdm_quality_checks', 'mdm_quality_checks_status_check', ARRAY['failed', 'passed', 'warning']::text[]),
  ('master_data', 'mdm_auto_fix_actions', 'mdm_auto_fix_actions_status_check', ARRAY['applied', 'failed', 'pending', 'verified']::text[]),
  ('master_data', 'mdm_workflows', 'mdm_workflows_status_check', ARRAY['cancelled', 'completed', 'draft', 'paused', 'running']::text[]),
  ('erp', 'announcements', 'announcements_status_check', ARRAY['archived', 'draft', 'expired', 'published']::text[]),
  ('erp', 'assets', 'assets_status_check', ARRAY['in_stock', 'in_use', 'maintenance', 'scrapped', 'transferred']::text[]),
  ('mobile', 'push_notifications', 'push_notifications_status_check', ARRAY['failed', 'pending', 'sent']::text[]),
  ('srm', 'biddings', 'biddings_status_check', ARRAY['awarded', 'draft', 'evaluated', 'opened', 'published']::text[]),
  ('srm', 'inquiries', 'inquiries_status_check', ARRAY['awarded', 'cancelled', 'closed', 'draft', 'in_progress', 'published']::text[]),
  ('srm', 'quotations', 'quotations_status_check', ARRAY['awarded', 'pending', 'rejected']::text[]),
  ('tms', 'tms_shipments', 'ck_tms_shipments_status_standard', ARRAY['cancelled', 'delivered', 'draft', 'in_transit', 'pending']::text[]),
  ('public', 'core_tenants', 'core_tenants_status_check', ARRAY['active', 'deleted', 'suspended', 'trial']::text[]),
  ('erp', 'purchase_orders', 'purchase_orders_status_check', ARRAY['approved', 'cancelled', 'pending']::text[]),
  ('erp', 'receivables', 'receivables_status_check', ARRAY['paid', 'pending']::text[]),
  ('ai', 'documents', 'documents_status_check', ARRAY['empty', 'pending', 'processed']::text[]),
  ('mes', 'work_orders', 'work_orders_status_check', ARRAY['cancelled', 'completed', 'in_progress', 'paused', 'pending']::text[]),
  ('mes', 'production_orders', 'production_orders_status_check', ARRAY['cancelled', 'closed', 'completed', 'in_progress', 'paused', 'pending', 'planned', 'released']::text[]),
  ('mes', 'production_schedules', 'production_schedules_status_check', ARRAY['cancelled', 'completed', 'pending', 'released', 'running', 'scheduled']::text[]),
  ('mes', 'work_stations', 'work_stations_status_check', ARRAY['active', 'available', 'inactive']::text[]),
  ('wms', 'sync_records', 'sync_records_status_check', ARRAY['completed', 'failed', 'pending', 'running', 'success']::text[]),
  ('scm', 'sync_records', 'sync_records_status_check', ARRAY['completed', 'failed', 'pending', 'running']::text[]),
  ('mes', 'material_issues', 'material_issues_status_check', ARRAY['completed', 'pending']::text[]),
  ('srm', 'suppliers', 'ck_suppliers_status_standard', ARRAY['active', 'archived', 'blacklisted', 'deleted', 'inactive', 'pending']::text[]),
  ('core', 'knowledge_documents', 'knowledge_documents_status_check', ARRAY['failed', 'pending', 'processing', 'ready']::text[]),
  ('wms', 'inbound_order_items', 'ck_inbound_order_items_quality_status_standard', ARRAY['pending', 'qualified', 'rejected']::text[]),
  ('wms', 'inventory', 'ck_inventory_quality_status_standard', ARRAY['pending', 'qualified', 'unqualified']::text[]),
  ('public', 'qa_lab_samples', 'ck_qa_lab_samples_status_standard', ARRAY['completed', 'destroyed', 'disposed', 'received', 'registered', 'retrieved', 'stored', 'testing']::text[]),
  ('lims', 'lims_safety_tasks', 'ck_lims_safety_tasks_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'pending']::text[]),
  ('qms', 'qa_quality_inspections', 'ck_qa_quality_inspections_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'pending', 'pending_audit', 'rejected']::text[]),
  ('qms', 'qa_quality_issues', 'ck_qa_quality_issues_status_standard', ARRAY['approved', 'cancelled', 'closed', 'in_progress', 'open', 'rejected', 'resolved']::text[]),
  ('mobile', 'documents', 'ck_mobile_documents_status_standard', ARRAY['approved', 'archived', 'draft', 'pending_review', 'rejected']::text[]),
  ('mobile', 'patrol_records', 'ck_mobile_patrol_records_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'pending']::text[]),
  ('public', 'audit_logs', 'ck_audit_logs_status_standard', ARRAY['active', 'archived', 'error', 'failed', 'failure', 'inactive', 'not_found', 'pending', 'success', 'unknown']::text[]),
  ('ehs', 'training_programs', 'ck_training_programs_status_standard', ARRAY['active', 'cancelled', 'completed', 'draft']::text[]),
  ('ehs', 'qa_ehs_trainings', 'ck_qa_ehs_trainings_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'scheduled']::text[]),
  ('ehs', 'training_records', 'ck_training_records_status_standard', ARRAY['completed', 'failed', 'ongoing']::text[]),
  ('ehs', 'qa_ehs_training_certificates', 'ck_qa_ehs_training_certificates_status_standard', ARRAY['expired', 'revoked', 'valid']::text[]),
  ('ehs', 'qa_ehs_risks', 'ck_qa_ehs_risks_status_standard', ARRAY['assessed', 'controlled', 'identified']::text[]),
  ('ehs', 'qa_ehs_hazards', 'ck_qa_ehs_hazards_status_standard', ARRAY['closed', 'pending_approval', 'pending_verification', 'rectifying', 'rejected', 'reported', 'resolved', 'verified']::text[]),
  ('ehs', 'qa_ehs_hazard_rectifications', 'ck_qa_ehs_hazard_rectifications_status_standard', ARRAY['in_progress', 'pending', 'submitted']::text[]),
  ('ehs', 'qa_ehs_accidents', 'ck_qa_ehs_accidents_status_standard', ARRAY['closed', 'reported']::text[]),
  ('ehs', 'qa_ehs_drill_plans', 'ck_qa_ehs_drill_plans_status_standard', ARRAY['cancelled', 'completed', 'planned']::text[]),
  ('ehs', 'qa_ehs_drill_records', 'ck_qa_ehs_drill_records_status_standard', ARRAY['cancelled', 'completed', 'in_progress']::text[]),
  ('ehs', 'qa_ehs_risk_controls', 'ck_qa_ehs_risk_controls_status_standard', ARRAY['active', 'completed']::text[]),
  ('ehs', 'qa_ehs_investigations', 'ck_qa_ehs_investigations_status_standard', ARRAY['completed', 'in_progress']::text[]),
  ('ehs', 'qa_ehs_treatments', 'ck_qa_ehs_treatments_status_standard', ARRAY['completed', 'in_progress']::text[]),
  ('ehs', 'qa_ehs_treatment_actions', 'ck_qa_ehs_treatment_actions_status_standard', ARRAY['completed', 'pending']::text[]),
  ('ehs', 'qa_ehs_incident_actions', 'ck_qa_ehs_incident_actions_status_standard', ARRAY['completed', 'in_progress', 'pending', 'verified']::text[]),
  ('scm', 'scm_master_data_refs', 'ck_scm_master_data_refs_status_standard', ARRAY['active', 'deleted', 'inactive']::text[]),
  ('integration', 'erp_connections', 'ck_erp_connections_status_standard', ARRAY['active', 'inactive']::text[]),
  ('integration', 'erp_connections', 'ck_erp_connections_last_sync_status_standard', ARRAY['failed', 'running', 'success']::text[]),
  ('integration', 'external_erp_sync_logs', 'ck_external_erp_sync_logs_status_standard', ARRAY['failed', 'running', 'success']::text[]),
  ('public', 'erp_connections', 'ck_erp_connections_status_standard', ARRAY['active', 'inactive']::text[]),
  ('public', 'external_erp_sync_logs', 'ck_external_erp_sync_logs_status_standard', ARRAY['failed', 'running', 'success']::text[]),
  ('master_data', 'mdm_suppliers', 'ck_mdm_suppliers_status_standard', ARRAY['active', 'blacklisted', 'inactive', 'pending']::text[]),
  ('scm', 'suppliers', 'ck_suppliers_status_standard', ARRAY['active', 'inactive', 'pending']::text[]),
  ('public', 'core_login_logs', 'ck_core_login_logs_status_standard', ARRAY['failed', 'success']::text[]),
  ('mobile', 'push_notifications', 'ck_push_notifications_status_standard', ARRAY['failed', 'pending', 'sent']::text[]),
  ('mobile', 'mobile_push_notifications', 'ck_mobile_push_notifications_status_standard', ARRAY['failed', 'pending', 'sent']::text[]),
  ('scm', 'purchase_orders', 'ck_scm_purchase_orders_status_standard', ARRAY['approved', 'cancelled', 'closed', 'completed', 'confirmed', 'draft', 'pending', 'rejected']::text[]),
  ('scm', 'sync_logs', 'ck_scm_sync_logs_status_standard', ARRAY['failed', 'in_progress', 'pending', 'success']::text[]),
  ('ehs', 'qa_ehs_emergency_plans', 'ck_qa_ehs_emergency_plans_status_standard', ARRAY['cancelled', 'completed', 'draft', 'ongoing', 'planned']::text[]),
  ('public', 'core_workflows', 'ck_core_workflows_status_standard', ARRAY['active', 'deployed', 'draft', 'inactive', 'published']::text[]),
  ('public', 'core_workflow_instances', 'ck_core_workflow_instances_status_standard', ARRAY['approved', 'cancelled', 'completed', 'error', 'pending', 'rejected', 'running', 'suspended']::text[]),
  ('public', 'core_workflow_tasks', 'ck_core_workflow_tasks_status_standard', ARRAY['approved', 'claimed', 'completed', 'delegated', 'error', 'pending', 'rejected']::text[]),
  ('scm', 'purchase_requisitions', 'ck_scm_purchase_requisitions_status_standard', ARRAY['approved', 'cancelled', 'converted', 'draft', 'pending', 'rejected']::text[]),
  ('scm', 'purchase_contracts', 'ck_scm_purchase_contracts_status_standard', ARRAY['approved', 'cancelled', 'draft', 'expired', 'pending', 'rejected', 'reviewing', 'signed', 'terminated']::text[]),
  ('scm', 'supplier_delivery_appointments', 'ck_scm_supplier_delivery_appointments_status_standard', ARRAY['approved', 'arrived', 'cancelled', 'completed', 'pending', 'rejected']::text[]),
  ('scm', 'incoming_inspections', 'ck_scm_incoming_inspections_status_standard', ARRAY['failed', 'passed', 'pending']::text[]),
  ('scm', 'supplier_evaluations', 'ck_scm_supplier_evaluations_status_standard', ARRAY['approved', 'completed', 'draft', 'submitted']::text[]),
  ('scm', 'mrp_suggestions', 'ck_scm_mrp_suggestions_status_standard', ARRAY['completed', 'confirmed', 'draft', 'pending', 'rejected']::text[]),
  ('scm', 'supplier_admissions', 'ck_scm_supplier_admissions_status_standard', ARRAY['active', 'approved', 'draft', 'pending', 'rejected']::text[]),
  ('mes', 'quality_inspections', 'ck_mes_quality_inspections_status_standard', ARRAY['concession_received', 'failed', 'inspecting', 'passed', 'pending', 'rework', 'scrapped']::text[]),
  ('mes', 'material_boms', 'ck_mes_material_boms_status_standard', ARRAY['active', 'draft', 'inactive', 'obsolete']::text[]),
  ('mes', 'material_returns', 'ck_mes_material_returns_status_standard', ARRAY['approved', 'cancelled', 'pending', 'returned']::text[]),
  ('mes', 'production_records', 'ck_mes_production_records_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'pending']::text[]),
  ('mes', 'work_reports', 'ck_mes_work_reports_status_standard', ARRAY['approved', 'archived', 'cancelled', 'draft', 'rejected', 'reworking', 'submitted']::text[]),
  ('mes', 'material_requirements', 'ck_mes_material_requirements_status_standard', ARRAY['cancelled', 'completed', 'confirmed', 'draft', 'released']::text[]),
  ('mes', 'equipment_maintenance_records', 'ck_mes_equipment_maintenance_records_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'pending']::text[]),
  ('mes', 'teams', 'ck_mes_teams_status_standard', ARRAY['active', 'inactive']::text[]),
  ('mes', 'wips', 'ck_mes_wips_status_standard', ARRAY['completed', 'in_progress', 'pending', 'transferred']::text[]),
  ('mes', 'quality_patrols', 'ck_mes_quality_patrols_status_standard', ARRAY['completed', 'in_progress', 'pending']::text[]),
  ('mes', 'quality_patrol_items', 'ck_mes_quality_patrol_items_status_standard', ARRAY['fail', 'pass', 'pending']::text[]),
  ('mes', 'equipment', 'ck_mes_equipment_status_standard', ARRAY['fault', 'idle', 'maintenance', 'running', 'scrapped']::text[]),
  ('mes', 'equipment_inspections', 'ck_mes_equipment_inspections_status_standard', ARRAY['abnormal', 'normal']::text[]),
  ('mes', 'quality_records', 'ck_mes_quality_records_quality_status_standard', ARRAY['pending', 'qualified', 'rejected']::text[]),
  ('mes', 'batch_records', 'ck_mes_batch_records_status_standard', ARRAY['active', 'cancelled', 'completed']::text[]),
  ('mes', 'equipment_inspection_records', 'ck_mes_equipment_inspection_records_overall_status_standard', ARRAY['abnormal', 'normal']::text[]),
  ('mes', 'equipment_inspection_records', 'ck_mes_equipment_inspection_records_status_standard', ARRAY['completed', 'needs_repair']::text[]),
  ('scm', 'purchase_requisitions', 'ck_scm_purchase_requisitions_approval_status_standard', ARRAY['approved', 'pending', 'rejected']::text[]),
  ('scm', 'purchase_contracts', 'ck_scm_purchase_contracts_approval_status_standard', ARRAY['approved', 'pending', 'rejected']::text[]),
  ('scm', 'supplier_admissions', 'ck_scm_supplier_admissions_approval_status_standard', ARRAY['approved', 'pending', 'rejected']::text[]),
  ('scm', 'supplier_quotes', 'ck_scm_supplier_quotes_status_standard', ARRAY['draft', 'submitted']::text[]),
  ('scm', 'incoming_notices', 'ck_scm_incoming_notices_status_standard', ARRAY['arrived', 'pending']::text[]),
  ('ehs', 'safety_hazards', 'ck_ehs_safety_hazards_status_standard', ARRAY['closed', 'pending_approval', 'pending_verification', 'rectifying', 'rejected', 'reported', 'resolved', 'verified']::text[]),
  ('erp', 'leave_requests', 'ck_erp_leave_requests_status_standard', ARRAY['approved', 'cancelled', 'draft', 'pending', 'rejected']::text[]),
  ('hrm', 'leave_records', 'ck_hrm_leave_records_status_standard', ARRAY['approved', 'cancelled', 'pending', 'rejected']::text[]),
  ('hrm', 'leave_records', 'ck_hrm_leave_records_approval_status_standard', ARRAY['approved', 'pending', 'rejected']::text[]),
  ('erp', 'vehicles', 'ck_erp_vehicles_status_standard', ARRAY['available', 'in_use', 'maintenance', 'unavailable']::text[]),
  ('erp', 'vehicle_requests', 'ck_erp_vehicle_requests_status_standard', ARRAY['approved', 'completed', 'pending', 'rejected']::text[]),
  ('erp', 'meeting_rooms', 'ck_erp_meeting_rooms_status_standard', ARRAY['available', 'maintenance', 'occupied', 'unavailable']::text[]),
  ('erp', 'meeting_bookings', 'ck_erp_meeting_bookings_status_standard', ARRAY['cancelled', 'confirmed']::text[]),
  ('erp', 'office_supplies', 'ck_erp_office_supplies_status_standard', ARRAY['discontinued', 'in_stock', 'low_stock', 'out_of_stock']::text[]),
  ('finance', 'core_finance_payments', 'ck_finance_core_finance_payments_status_standard', ARRAY['cancelled', 'completed', 'draft', 'failed', 'pending', 'processing']::text[]),
  ('erp', 'receivables', 'ck_erp_receivables_status_standard', ARRAY['paid', 'pending']::text[]),
  ('finance', 'reconciliation_snapshots', 'ck_finance_reconciliation_snapshots_status_standard', ARRAY['approved', 'draft', 'matched', 'pending']::text[]),
  ('finance', 'settlement_snapshots', 'ck_finance_settlement_snapshots_status_standard', ARRAY['approved', 'draft', 'pending', 'rejected']::text[]),
  ('hrm', 'contract_renewals', 'ck_hrm_contract_renewals_status_standard', ARRAY['approved', 'executed', 'pending', 'rejected']::text[]),
  ('hrm', 'contracts', 'ck_hrm_contracts_status_standard', ARRAY['active', 'expired', 'pending', 'terminated']::text[]),
  ('finance', 'difference_adjustments', 'ck_difference_adjustments_status_standard', ARRAY['approved', 'pending', 'rejected']::text[]),
  ('finance', 'core_finance_payment_workflow', 'ck_core_finance_payment_workflow_status_standard', ARRAY['approved', 'cancelled', 'completed', 'error', 'pending', 'rejected', 'running', 'suspended']::text[]),
  ('finance', 'core_finance_payment_items', 'ck_core_finance_payment_items_write_off_status_standard', ARRAY['completed', 'pending']::text[]),
  ('finance', 'finance_v54_review_workflows', 'ck_finance_v54_review_workflows_status_standard', ARRAY['completed', 'in_progress', 'pending', 'rejected']::text[]),
  ('finance', 'finance_v55_payment_results', 'ck_finance_v55_payment_results_status_standard', ARRAY['completed', 'failed', 'pending', 'processing', 'reversed']::text[]),
  ('finance', 'finance_v58_pool_transfers', 'ck_finance_v58_pool_transfers_status_standard', ARRAY['completed', 'failed', 'pending']::text[]),
  ('finance', 'finance_v60_schedule_executions', 'ck_finance_v60_schedule_executions_status_standard', ARRAY['cancelled', 'completed', 'failed', 'pending', 'running']::text[]),
  ('finance', 'reconcile_orders', 'ck_reconcile_orders_status_standard', ARRAY['cancelled', 'confirmed', 'disputed', 'draft', 'pending']::text[]),
  ('finance', 'reconcile_items', 'ck_reconcile_items_status_standard', ARRAY['disputed', 'matched', 'unmatched']::text[]),
  ('finance', 'reconciliation_item_snapshots', 'ck_reconciliation_item_snapshots_match_status_standard', ARRAY['diff', 'manual', 'matched', 'unmatched']::text[]),
  ('erp', 'consolidation_scopes', 'ck_consolidation_scopes_status_standard', ARRAY['active', 'draft', 'inactive']::text[]),
  ('erp', 'consolidation_reports', 'ck_consolidation_reports_approval_status_standard', ARRAY['approved', 'cancelled', 'draft', 'pending', 'rejected']::text[]),
  ('integration', 'mes_erp_sync', 'ck_mes_erp_sync_sync_status_standard', ARRAY['failed', 'pending', 'synced']::text[]),
  ('pdm', 'pdm_change_notices', 'ck_pdm_change_notices_status_standard', ARRAY['approved', 'cancelled', 'closed', 'draft', 'implemented', 'pending', 'rejected', 'withdrawn']::text[]),
  ('pm', 'pm_tasks', 'ck_pm_tasks_status_standard', ARRAY['blocked', 'done', 'in_progress', 'review', 'todo']::text[]),
  ('pm', 'project_approvals', 'ck_project_approvals_status_standard', ARRAY['approved', 'cancelled', 'pending', 'rejected']::text[]),
  ('pm', 'contracts', 'ck_contracts_status_standard', ARRAY['active', 'approved', 'cancelled', 'completed', 'draft', 'pending', 'rejected']::text[]),
  ('pm', 'budgets', 'ck_budgets_status_standard', ARRAY['approved', 'draft', 'pending']::text[]),
  ('pm', 'project_milestones', 'ck_project_milestones_status_standard', ARRAY['completed', 'in_progress', 'overdue', 'pending']::text[]),
  ('pm', 'project_expenses', 'ck_project_expenses_status_standard', ARRAY['approved', 'pending', 'rejected']::text[]),
  ('pm', 'project_phases', 'ck_project_phases_status_standard', ARRAY['active', 'completed', 'pending']::text[]),
  ('pm', 'project_reports', 'ck_project_reports_status_standard', ARRAY['generated', 'pending']::text[]),
  ('pm', 'defects', 'ck_defects_status_standard', ARRAY['closed', 'in_progress', 'open', 'resolved']::text[]),
  ('pm', 'project_risks', 'ck_project_risks_status_standard', ARRAY['closed', 'identified', 'mitigated']::text[]),
  ('rd', 'bugs', 'ck_rd_bugs_status_standard', ARRAY['closed', 'in_progress', 'open', 'resolved']::text[]),
  ('pm', 'project_resources', 'ck_project_resources_status_standard', ARRAY['available', 'in_use', 'maintenance', 'retired']::text[]),
  ('qms', 'qa_audit_findings', 'ck_qa_audit_findings_status_standard', ARRAY['closed', 'in_progress', 'open', 'verified']::text[]),
  ('pm', 'settlements', 'ck_settlements_status_standard', ARRAY['approved', 'draft', 'pending', 'rejected']::text[]),
  ('pm', 'acceptance_records', 'ck_acceptance_records_result_status_standard', ARRAY['failed', 'passed', 'pending']::text[]),
  ('qms', 'qa_audit_plans', 'ck_qa_audit_plans_status_standard', ARRAY['cancelled', 'completed', 'draft', 'in_progress', 'scheduled']::text[]),
  ('pm', 'acceptance_plans', 'ck_acceptance_plans_status_standard', ARRAY['cancelled', 'completed', 'in_progress', 'pending']::text[]),
  ('hrm', 'training_records', 'ck_training_records_completion_status_standard', ARRAY['completed', 'failed', 'in_progress']::text[]),
  ('hrm', 'training_records', 'ck_training_records_attendance_status_standard', ARRAY['attended', 'registered']::text[]),
  ('hrm', 'training_plans', 'ck_training_plans_status_lifecycle_standard', ARRAY['active', 'archived', 'completed', 'inactive']::text[]),
  ('ehs', 'qa_ehs_hazardous_materials', 'ck_qa_ehs_hazardous_materials_status_lifecycle_standard', ARRAY['active', 'archived', 'inactive', 'restricted']::text[]),
  ('ehs', 'qa_ehs_environment_monitors', 'ck_qa_ehs_environment_monitors_status_lifecycle_standard', ARRAY['active', 'archived', 'inactive', 'maintenance']::text[]),
  ('wms', 'warehouses', 'ck_warehouses_status_lifecycle_standard', ARRAY['active', 'archived', 'inactive', 'maintenance']::text[]),
  ('rs', 'rs_projects', 'ck_rs_projects_status_lifecycle_standard', ARRAY['cancelled', 'completed', 'in_progress', 'pending']::text[])
;

DO $$
DECLARE
  r record;
  n_ok int := 0;
  n_skip int := 0;
  n_bad int := 0;
  def text;
  got text[];
  want text[];
  rel regclass;
BEGIN
  FOR r IN SELECT * FROM _batch_targets ORDER BY schema_name, table_name, constraint_name LOOP
    rel := format('%I.%I', r.schema_name, r.table_name)::regclass;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = r.constraint_name AND c.conrelid = rel) THEN
      RAISE NOTICE 'SKIP missing  %', r.constraint_name;
      n_skip := n_skip + 1;
      CONTINUE;
    END IF;

    IF (SELECT c.convalidated FROM pg_constraint c WHERE c.conname = r.constraint_name AND c.conrelid = rel) THEN
      RAISE NOTICE 'SKIP already  %', r.constraint_name;
      n_skip := n_skip + 1;
      CONTINUE;
    END IF;

    IF cardinality(r.expected) > 0 THEN
      SELECT pg_get_constraintdef(c.oid) INTO def FROM pg_constraint c WHERE c.conname = r.constraint_name AND c.conrelid = rel;
      SELECT array_agg(m[1] ORDER BY m[1]) INTO got FROM regexp_matches(def, '''([^'']+)''', 'g') AS m;
      SELECT array_agg(v ORDER BY v) INTO want FROM unnest(r.expected) AS v;
      IF got IS DISTINCT FROM want THEN
        RAISE NOTICE 'SKIP valueset  %  def=%', r.constraint_name, def;
        n_bad := n_bad + 1;
        CONTINUE;
      END IF;
    END IF;

    BEGIN
      EXECUTE format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I', r.schema_name, r.table_name, r.constraint_name);
      n_ok := n_ok + 1;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'FAIL validate  %  err=%', r.constraint_name, SQLERRM;
      n_bad := n_bad + 1;
    END;
  END LOOP;

  RAISE NOTICE 'batch 完成: ok=%  skip=%  bad=%', n_ok, n_skip, n_bad;
END $$;

DROP TABLE _batch_targets;
