-- RLS 专项全量实施：327 张含租户列表启用 RLS + 租户隔离策略（幂等）
-- 策略语义：无租户上下文→全放行（兼容现有连接）；有上下文→仅本租户行；tenant_id IS NULL→共享行放行
-- 不 FORCE：superuser/owner 管理通道不受影响；应用接入非 superuser 角色或 FORCE 后隔离生效
-- 试点 20260908000015 已验证：读过滤 ✓ / 越权写拦截 ✓ / superuser 绕过（预期）
-- 注：EXECUTE 使用 $policy$ 引用字符串避免 format() 单引号转义问题（v2）
DO $$
DECLARE
  t text;
  pol_exists boolean;
  col_exists boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ai.ai_training_samples',
    'core.core_tenant_plugins',
    'core.knowledge_bases',
    'core.knowledge_chunks',
    'core.knowledge_documents',
    'core.knowledge_qa_history',
    'crm.core_crm_customers',
    'crm.customer_orders',
    'crm.customer_scores',
    'crm.return_items',
    'crm.rfm_results',
    'crm.sales_forecasts',
    'doc.document_versions',
    'doc.documents',
    'doc.folders',
    'doc.templates',
    'doc_service.core_doc_documents',
    'ehs.qa_ehs_employees',
    'erp.core_erp_materials',
    'erp.core_erp_suppliers',
    'erp.documents',
    'erp.erp_master_data_refs',
    'erp.fin_reconciliations',
    'erp.holidays',
    'erp.inventory',
    'erp.leave_requests',
    'erp.meeting_bookings',
    'erp.meeting_rooms',
    'erp.purchase_orders',
    'erp.vehicle_requests',
    'erp.vehicles',
    'finance.accounting_subjects',
    'finance.budgets',
    'finance.core_finance_accounts',
    'finance.core_finance_approval_nodes',
    'finance.core_finance_approval_workflows',
    'finance.core_finance_aux_accounts',
    'finance.core_finance_aux_balances',
    'finance.core_finance_ledger',
    'finance.core_finance_payment_approval_config',
    'finance.core_finance_payment_items',
    'finance.core_finance_payment_workflow',
    'finance.core_finance_payments',
    'finance.core_finance_periods',
    'finance.core_finance_reconciliation_items',
    'finance.core_finance_reconciliation_sessions',
    'finance.core_finance_voucher_lines',
    'finance.core_finance_vouchers',
    'finance.difference_adjustments',
    'finance.erp_collection_records',
    'finance.erp_payables',
    'finance.erp_payment_records',
    'finance.erp_receivables',
    'finance.finance_alert_configs_v52',
    'finance.finance_alert_history_v52',
    'finance.finance_anomaly_alerts_v52',
    'finance.finance_audit_findings_v52',
    'finance.finance_audit_rules_v52',
    'finance.finance_budget_variances_v53',
    'finance.finance_cash_flow_predictions_v53',
    'finance.finance_compliance_reports',
    'finance.finance_control_matrices',
    'finance.finance_control_points',
    'finance.finance_detection_configs_v52',
    'finance.finance_prediction_models_v53',
    'finance.finance_risk_assessments',
    'finance.finance_u8_import_records',
    'finance.finance_v54_fraud_rules',
    'finance.finance_v54_fraud_scores',
    'finance.finance_v54_review_results',
    'finance.finance_v54_review_rules',
    'finance.finance_v54_review_workflows',
    'finance.finance_v54_risk_alerts',
    'finance.finance_v54_risk_indicators',
    'finance.finance_v55_invoice_items',
    'finance.finance_v55_invoices',
    'finance.finance_v55_payment_requests',
    'finance.finance_v55_payment_results',
    'finance.finance_v55_reconciliation_results',
    'finance.finance_v55_reconciliation_rules',
    'finance.finance_v56_tax_brackets',
    'finance.finance_v56_tax_forms',
    'finance.finance_v56_tax_lines',
    'finance.finance_v56_tax_plans',
    'finance.finance_v56_tax_rates',
    'finance.finance_v56_tax_suggestions',
    'finance.finance_v57_analysis_dimensions',
    'finance.finance_v57_analysis_results',
    'finance.finance_v57_forecast_models',
    'finance.finance_v57_generated_reports',
    'finance.finance_v57_insights',
    'finance.finance_v57_report_templates',
    'finance.finance_v58_cash_pools',
    'finance.finance_v58_forecast_results',
    'finance.finance_v58_forecast_scenarios',
    'finance.finance_v58_liquidity_targets',
    'finance.finance_v58_optimization_results',
    'finance.finance_v58_pool_allocations',
    'finance.finance_v58_pool_transfers',
    'finance.finance_v59_credit_profiles',
    'finance.finance_v59_device_profiles',
    'finance.finance_v59_fraud_decisions',
    'finance.finance_v59_fraud_rules',
    'finance.finance_v59_fraud_signals',
    'finance.finance_v59_scoring_models',
    'finance.finance_v59_stress_results',
    'finance.finance_v59_stress_scenarios',
    'finance.finance_v60_alert_channels',
    'finance.finance_v60_alert_rules',
    'finance.finance_v60_alerts',
    'finance.finance_v60_decision_results',
    'finance.finance_v60_decision_scenarios',
    'finance.finance_v60_schedule_dependencies',
    'finance.finance_v60_schedule_executions',
    'finance.finance_v60_schedule_tasks',
    'finance.finance_voucher_generation_rules',
    'finance.finance_voucher_template_lines',
    'finance.finance_voucher_templates',
    'finance.financial_reports',
    'finance.reconciliation_item_snapshots',
    'finance.reconciliation_settlement_links',
    'finance.reconciliation_snapshots',
    'finance.settlement_center_dashboards',
    'finance.settlement_snapshots',
    'finance.source_amount_snapshots',
    'finance.vouchers',
    'gis.audit_log',
    'gis.audit_logs',
    'gis.business_locations',
    'gis.device_location_records',
    'gis.device_locations',
    'gis.devices',
    'gis.evidence_records',
    'gis.factory_maps',
    'gis.geodata',
    'gis.geofeatures',
    'gis.geofence_alerts',
    'gis.location_photos',
    'gis.locations',
    'gis.map_layers',
    'gis.map_markers',
    'gis.maps',
    'gis.pipelines',
    'gis.spatial_analysis',
    'gis.track_records',
    'gis.warehouse_locations',
    'hrm.attendance_records',
    'hrm.audit_logs',
    'hrm.candidates',
    'hrm.companies',
    'hrm.contract_renewals',
    'hrm.contracts',
    'hrm.departments',
    'hrm.employees',
    'hrm.interviews',
    'hrm.job_openings',
    'hrm.leave_records',
    'hrm.payroll_details',
    'hrm.payroll_items',
    'hrm.payroll_records',
    'hrm.payroll_runs',
    'hrm.performance_goals',
    'hrm.performance_records',
    'hrm.performance_reviews',
    'hrm.positions',
    'hrm.recruitment_applications',
    'hrm.recruitment_records',
    'hrm.salary_adjustments',
    'hrm.training_courses',
    'hrm.training_participants',
    'hrm.training_plans',
    'hrm.training_records',
    'iam.position_permissions',
    'iam.position_roles',
    'iam.positions',
    'iam.resource_permissions',
    'iam.user_positions',
    'integration.conversion_executions',
    'integration.conversion_rules',
    'integration.core_inter_module_sync',
    'integration.crm_erp_sync',
    'integration.crm_scm_sync',
    'integration.erp_wms_sync',
    'integration.hrm_finance_sync',
    'lims.qa_lab_calibration_records',
    'lims.qa_lab_inspection_reports',
    'lims.qa_lab_instruments',
    'lims.qa_lab_processes',
    'lims.qa_lab_reagent_alerts',
    'lims.qa_lab_reagent_history',
    'lims.qa_lab_reagents',
    'lims.qa_lab_records',
    'lims.qa_lab_sample_lifecycle',
    'lims.qa_lab_samples',
    'lims.qa_lab_tasks',
    'lims.qa_lims_audit_logs',
    'lims.qa_lims_barcode_scan_records',
    'lims.qa_lims_collection_tasks',
    'lims.qa_lims_instrument_data',
    'lims.qa_lims_method_categories',
    'lims.qa_lims_method_validations',
    'lims.qa_lims_method_versions',
    'lims.qa_lims_parse_rules',
    'lims.qa_lims_pt_corrective_actions',
    'lims.qa_lims_pt_evaluations',
    'lims.qa_lims_pt_plans',
    'lims.qa_lims_pt_results',
    'lims.qa_lims_pt_samples',
    'lims.qa_lims_rfid_tags',
    'lims.qa_lims_sample_barcodes',
    'lims.qa_lims_sync_records',
    'lims.qa_lims_test_methods',
    'lims.qa_lims_uncertainty_components',
    'lims.qa_lims_uncertainty_projects',
    'lims.qa_lims_uncertainty_sources',
    'master_data.core_master_data_change_log',
    'master_data.core_master_data_event_outbox',
    'master_data.core_master_data_refs',
    'master_data.core_mdm_approvals',
    'master_data.core_mdm_reconciliation_log',
    'mes.audit_logs',
    'mes.capacities',
    'mes.demand_forecasts',
    'mes.material_plans',
    'mes.production_plans',
    'mobile.core_mobile_offline_records',
    'mobile.mobile_push_notifications',
    'pdm.pdm_bom_items',
    'pdm.pdm_boms',
    'pdm.pdm_change_notices',
    'pdm.pdm_configurations',
    'pdm.pdm_document_versions',
    'pdm.pdm_documents',
    'pdm.pdm_master_data_refs',
    'pdm.pdm_materials',
    'pdm.pdm_production_batches',
    'pdm.pdm_production_formulas',
    'pdm.pdm_production_processes',
    'pdm.pdm_production_steps',
    'pdm.pdm_products',
    'pdm.pdm_project_members',
    'pdm.pdm_project_phases',
    'pdm.pdm_projects',
    'pdm.pdm_versions',
    'pdm.pdm_workflow_instances',
    'pdm.pdm_workflows',
    'public.alert_rules',
    'public.alerts',
    'public.announcements',
    'public.audit_logs',
    'public.core_doc_documents',
    'public.core_doc_folders',
    'public.core_doc_templates',
    'public.core_login_logs',
    'public.core_master_data_change_log',
    'public.core_master_data_event_outbox',
    'public.core_master_data_refs',
    'public.core_mdm_approvals',
    'public.core_mdm_reconciliation_log',
    'public.core_menu_groups',
    'public.core_operation_logs',
    'public.core_tenant_usage',
    'public.navigation_menu',
    'public.permission_audit_logs',
    'public.pinned_apps',
    'public.subscriptions',
    'public.tenant_permissions',
    'public.todos',
    'public.user_settings',
    'qms.qa_audit_findings',
    'qms.qa_audit_plans',
    'qms.qa_audit_tasks',
    'qms.qa_corrective_action_items',
    'qms.qa_corrective_actions',
    'qms.qa_ehs_hazards',
    'qms.qa_eightd_audit_logs',
    'qms.qa_eightd_reports',
    'qms.qa_fmea_analyses',
    'qms.qa_fmea_items',
    'qms.qa_inspection_audits',
    'qms.qa_inspection_results',
    'qms.qa_lab_samples',
    'qms.qa_lab_tasks',
    'qms.qa_qms_sync_records',
    'qms.qa_quality_costs',
    'qms.qa_quality_inspections',
    'qms.qa_quality_issues',
    'qms.qa_spc_charts',
    'qms.qa_spc_data_points',
    'qms.qa_standard_revisions',
    'qms.qa_standards',
    'rs.change_requests',
    'rs.formula_versions',
    'scm.demand_forecast',
    'scm.sales_order_items',
    'scm.srm_supplier_snapshots',
    'scm.supplier_products',
    'scm.wms_inbound_order_snapshots',
    'scm.wms_inventory_movement_snapshots',
    'scm.wms_inventory_snapshots',
    'scm.wms_outbound_order_snapshots',
    'scm.wms_replenishment_suggestion_snapshots',
    'srm.bidding_suppliers',
    'srm.biddings',
    'srm.inquiries',
    'srm.quotations',
    'srm.scm_supplier_snapshots',
    'srm.scoring_dimensions',
    'srm.supplier_performance',
    'srm.tender_awards',
    'srm.tender_bids',
    'srm.tenders',
    'ticket.core_ticket_activities',
    'ticket.core_ticket_comments',
    'ticket.core_ticket_sla_escalations',
    'ticket.core_ticket_sla_policies',
    'ticket.ticket_automation_rules',
    'ticket.ticket_knowledge_articles',
    'tms.tms_carriers',
    'tms.tms_drivers',
    'tms.tms_routes',
    'tms.tms_shipments',
    'tms.tms_vehicles',
    'unified_core.inter_module_sync',
    'wms.inventory_movements',
    'wms.wms_approval_events',
    'wms.wms_master_data_refs'
  ]
  LOOP
    -- 2026-09-18 防御化（空库重建链卡点）：表可能不存在（旧库遗留 v52/v53 等），存在才启用
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = split_part(t, '.', 1)
                 AND table_name = split_part(t, '.', 2)) THEN
      EXECUTE 'ALTER TABLE ' || t || ' ENABLE ROW LEVEL SECURITY';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = split_part(t, '.', 1)
        AND tablename = split_part(t, '.', 2)
        AND policyname = 'rls_tenant_isolation'
    ) INTO pol_exists;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = split_part(t, '.', 1)
        AND table_name = split_part(t, '.', 2)
        AND column_name = 'tenant_id'
    ) INTO col_exists;
    -- 2026-09-18 防御化（空库重建链卡点）：无 tenant_id 列的表跳过策略（如骨架表/纯系统表）
    IF NOT pol_exists AND col_exists THEN
    IF t = 'ai.ai_training_samples' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'core.core_tenant_plugins' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'core.knowledge_bases' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'core.knowledge_chunks' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'core.knowledge_documents' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'core.knowledge_qa_history' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'crm.core_crm_customers' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'crm.customer_orders' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'crm.customer_scores' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'crm.return_items' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'crm.rfm_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'crm.sales_forecasts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'doc.document_versions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'doc.documents' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'doc.folders' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'doc.templates' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'doc_service.core_doc_documents' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'ehs.qa_ehs_employees' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.core_erp_materials' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.core_erp_suppliers' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.documents' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.erp_master_data_refs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.fin_reconciliations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.holidays' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.inventory' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.leave_requests' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.meeting_bookings' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.meeting_rooms' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.purchase_orders' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.vehicle_requests' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'erp.vehicles' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.accounting_subjects' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.budgets' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_accounts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_approval_nodes' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_approval_workflows' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_aux_accounts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_aux_balances' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_ledger' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_payment_approval_config' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_payment_items' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_payment_workflow' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_payments' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_periods' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_reconciliation_items' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_reconciliation_sessions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_voucher_lines' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.core_finance_vouchers' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.difference_adjustments' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.erp_collection_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.erp_payables' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.erp_payment_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.erp_receivables' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_alert_configs_v52' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_alert_history_v52' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_anomaly_alerts_v52' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_audit_findings_v52' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_audit_rules_v52' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_budget_variances_v53' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_cash_flow_predictions_v53' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_compliance_reports' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_control_matrices' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_control_points' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_detection_configs_v52' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_prediction_models_v53' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_risk_assessments' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_u8_import_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v54_fraud_rules' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v54_fraud_scores' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v54_review_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v54_review_rules' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v54_review_workflows' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v54_risk_alerts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v54_risk_indicators' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v55_invoice_items' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v55_invoices' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v55_payment_requests' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v55_payment_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v55_reconciliation_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v55_reconciliation_rules' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v56_tax_brackets' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v56_tax_forms' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v56_tax_lines' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v56_tax_plans' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v56_tax_rates' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v56_tax_suggestions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v57_analysis_dimensions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v57_analysis_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v57_forecast_models' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v57_generated_reports' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v57_insights' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v57_report_templates' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v58_cash_pools' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v58_forecast_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v58_forecast_scenarios' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v58_liquidity_targets' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v58_optimization_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v58_pool_allocations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v58_pool_transfers' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v59_credit_profiles' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v59_device_profiles' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v59_fraud_decisions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v59_fraud_rules' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v59_fraud_signals' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v59_scoring_models' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v59_stress_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v59_stress_scenarios' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v60_alert_channels' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v60_alert_rules' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v60_alerts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v60_decision_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v60_decision_scenarios' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v60_schedule_dependencies' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v60_schedule_executions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_v60_schedule_tasks' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_voucher_generation_rules' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_voucher_template_lines' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.finance_voucher_templates' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.financial_reports' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.reconciliation_item_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.reconciliation_settlement_links' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.reconciliation_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.settlement_center_dashboards' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.settlement_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.source_amount_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'finance.vouchers' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.audit_log' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.audit_logs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.business_locations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.device_location_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.device_locations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.devices' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.evidence_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.factory_maps' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.geodata' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.geofeatures' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.geofence_alerts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.location_photos' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.locations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.map_layers' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.map_markers' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.maps' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.pipelines' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.spatial_analysis' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.track_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'gis.warehouse_locations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.attendance_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.audit_logs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.candidates' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.companies' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.contract_renewals' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.contracts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.departments' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.employees' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.interviews' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.job_openings' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.leave_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.payroll_details' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.payroll_items' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.payroll_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.payroll_runs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.performance_goals' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.performance_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.performance_reviews' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.positions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.recruitment_applications' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.recruitment_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.salary_adjustments' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.training_courses' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.training_participants' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.training_plans' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'hrm.training_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'iam.position_permissions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'iam.position_roles' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'iam.positions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'iam.resource_permissions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'iam.user_positions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'integration.conversion_executions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'integration.conversion_rules' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'integration.core_inter_module_sync' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'integration.crm_erp_sync' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'integration.crm_scm_sync' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'integration.erp_wms_sync' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'integration.hrm_finance_sync' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_calibration_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_inspection_reports' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_instruments' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_processes' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_reagent_alerts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_reagent_history' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_reagents' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_sample_lifecycle' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_samples' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lab_tasks' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_audit_logs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_barcode_scan_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_collection_tasks' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_instrument_data' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_method_categories' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_method_validations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_method_versions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_parse_rules' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_pt_corrective_actions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_pt_evaluations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_pt_plans' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_pt_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_pt_samples' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_rfid_tags' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_sample_barcodes' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_sync_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_test_methods' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_uncertainty_components' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_uncertainty_projects' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'lims.qa_lims_uncertainty_sources' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'master_data.core_master_data_change_log' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'master_data.core_master_data_event_outbox' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'master_data.core_master_data_refs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'master_data.core_mdm_approvals' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'master_data.core_mdm_reconciliation_log' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'mes.audit_logs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'mes.capacities' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'mes.demand_forecasts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'mes.material_plans' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
      )$policy$;
    END IF;
    IF t = 'mes.production_plans' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'mobile.core_mobile_offline_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'mobile.mobile_push_notifications' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_bom_items' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_boms' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_change_notices' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_configurations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_document_versions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_documents' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_master_data_refs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_materials' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_production_batches' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_production_formulas' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_production_processes' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_production_steps' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_products' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_project_members' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_project_phases' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_projects' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_versions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_workflow_instances' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'pdm.pdm_workflows' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.alert_rules' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.alerts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.announcements' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.audit_logs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_doc_documents' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_doc_folders' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_doc_templates' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_login_logs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_master_data_change_log' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_master_data_event_outbox' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_master_data_refs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_mdm_approvals' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_mdm_reconciliation_log' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_menu_groups' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_operation_logs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.core_tenant_usage' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.navigation_menu' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.permission_audit_logs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
      )$policy$;
    END IF;
    IF t = 'public.pinned_apps' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.subscriptions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.tenant_permissions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
      )$policy$;
    END IF;
    IF t = 'public.todos' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'public.user_settings' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_audit_findings' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_audit_plans' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_audit_tasks' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_corrective_action_items' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_corrective_actions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_ehs_hazards' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_eightd_audit_logs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_eightd_reports' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_fmea_analyses' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_fmea_items' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_inspection_audits' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_inspection_results' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_lab_samples' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_lab_tasks' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_qms_sync_records' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_quality_costs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_quality_inspections' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_quality_issues' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_spc_charts' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_spc_data_points' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_standard_revisions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'qms.qa_standards' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'rs.change_requests' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'rs.formula_versions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'scm.demand_forecast' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'scm.sales_order_items' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'scm.srm_supplier_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'scm.supplier_products' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'scm.wms_inbound_order_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'scm.wms_inventory_movement_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'scm.wms_inventory_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'scm.wms_outbound_order_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'scm.wms_replenishment_suggestion_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'srm.bidding_suppliers' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'srm.biddings' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'srm.inquiries' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'srm.quotations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'srm.scm_supplier_snapshots' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'srm.scoring_dimensions' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'srm.supplier_performance' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'srm.tender_awards' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'srm.tender_bids' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'srm.tenders' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'ticket.core_ticket_activities' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'ticket.core_ticket_comments' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'ticket.core_ticket_sla_escalations' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'ticket.core_ticket_sla_policies' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'ticket.ticket_automation_rules' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'ticket.ticket_knowledge_articles' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'tms.tms_carriers' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'tms.tms_drivers' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'tms.tms_routes' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'tms.tms_shipments' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'tms.tms_vehicles' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'unified_core.inter_module_sync' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'wms.inventory_movements' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'wms.wms_approval_events' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    IF t = 'wms.wms_master_data_refs' THEN
      EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON $policy$ || t || $policy$ USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )$policy$;
    END IF;
    END IF;
  END LOOP;
END $$;
