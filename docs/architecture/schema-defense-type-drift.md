# TABLE_DEFS ↔ 迁移 DDL 类型差异待核清单（B 扩展首轮）

> 生成：2026-10-29 B 扩展（列级一致性校验）首轮扫描。差异 = TABLE_DEFS 契约类型 vs 迁移权威类型，语义归一化后仍不一致。
> 处置：真实差异需人工核对后修权威（迁移或 TABLE_DEFS）；可接受差异（如 TEXT vs VARCHAR(n) 同族）经确认后可在门禁归为 INFO。

共 326 处类型差异。

| 表 | 列 | TABLE_DEFS 类型 | 迁移类型 |
|---|---|---|---|
| bank_accounts | account_name | `VARCHAR(200) NOT NULL` | `TEXT NOT NULL` |
| bank_accounts | account_number | `VARCHAR(50) NOT NULL` | `TEXT NOT NULL …(+5)` |
| bank_accounts | bank_name | `VARCHAR(100) NOT NULL` | `TEXT NOT NULL` |
| batches | batch_no | `VARCHAR(100) NOT NULL` | `text` |
| batches | material_name | `VARCHAR(500) NOT NULL` | `text …(+14)` |
| batches | sku | `VARCHAR(100) NOT NULL` | `text` |
| business_locations | deleted_at | `TIMESTAMP` | `timestamptz` |
| contacts | email | `VARCHAR(100)` | `TEXT …(+4)` |
| contacts | first_name | `VARCHAR(100) NOT NULL` | `TEXT NOT NULL` |
| contacts | last_name | `VARCHAR(100)` | `TEXT` |
| contracts | sign_date | `TIMESTAMPTZ` | `DATE` |
| core_api_version_configs | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_dict_items | deleted_at | `TIMESTAMP` | `TIMESTAMPTZ` |
| core_dict_types | deleted_at | `TIMESTAMP` | `TIMESTAMPTZ` |
| core_doc_documents | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_doc_documents | tags | `TEXT[]` | `text` |
| core_doc_folders | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_doc_templates | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_file_folders | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_file_folders | updated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_file_permissions | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| core_files | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_files | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_files | updated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_finance_accounts | created_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp` |
| core_finance_accounts | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp` |
| core_finance_approval_workflows | approved_at | `TIMESTAMPTZ` | `timestamp` |
| core_finance_approval_workflows | created_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp …(+1)` |
| core_finance_approval_workflows | rejected_at | `TIMESTAMPTZ` | `timestamp` |
| core_finance_ledger | created_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp` |
| core_finance_ledger | deleted_at | `TIMESTAMPTZ` | `timestamp` |
| core_finance_ledger | voucher_date | `TIMESTAMPTZ NOT NULL` | `timestamp not null` |
| core_finance_periods | closed_at | `TIMESTAMPTZ` | `timestamp …(+2)` |
| core_finance_periods | end_date | `TIMESTAMPTZ NOT NULL` | `timestamp not null` |
| core_finance_periods | start_date | `TIMESTAMPTZ NOT NULL` | `timestamp not null` |
| core_finance_reconciliation_items | created_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp` |
| core_finance_reconciliation_items | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp` |
| core_finance_reconciliation_sessions | completed_at | `TIMESTAMPTZ` | `timestamp` |
| core_finance_reconciliation_sessions | created_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp` |
| core_finance_reconciliation_sessions | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp` |
| core_finance_voucher_lines | created_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp` |
| core_finance_vouchers | created_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp` |
| core_finance_vouchers | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` | `timestamp not null default current_timestamp …(+1)` |
| core_finance_vouchers | voucher_date | `TIMESTAMPTZ NOT NULL` | `timestamp not null` |
| core_guide_progress | completed_lessons | `UUID[] NOT NULL DEFAULT '{}'` | `UUID` |
| core_login_logs | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_login_logs | login_time | `TIMESTAMP NOT NULL DEFAULT NOW()` | `timestamptz NOT NULL DEFAULT NOW()` |
| core_master_data_change_log | created_at | `TIMESTAMP NOT NULL DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| core_master_data_refs | created_at | `TIMESTAMP NOT NULL DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| core_master_data_refs | last_synced_at | `TIMESTAMP NOT NULL DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| core_master_data_refs | updated_at | `TIMESTAMP NOT NULL DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| core_mdm_approvals | requested_at | `TIMESTAMP NOT NULL DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| core_mdm_approvals | reviewed_at | `TIMESTAMP` | `timestamp with time zone` |
| core_mdm_reconciliation_log | detected_at | `TIMESTAMP NOT NULL DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| core_mdm_reconciliation_log | resolved_at | `TIMESTAMP` | `timestamp with time zone` |
| core_menu_groups | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_menus | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_migration_history | applied_at | `TIMESTAMP` | `timestamptz` |
| core_migration_history | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_mobile_offline_records | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_mobile_offline_records | updated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_permissions | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_plugin_categories | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_plugin_instances | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_plugin_instances | started_at | `TIMESTAMP` | `timestamptz` |
| core_plugin_instances | stopped_at | `TIMESTAMP` | `timestamptz` |
| core_plugin_navigation | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_plugin_navigation | updated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_plugin_permissions | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_plugin_reviews | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_plugin_reviews | updated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_plugin_versions | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_plugins | activated_at | `TIMESTAMP` | `timestamptz` |
| core_plugins | installed_at | `TIMESTAMP` | `timestamptz` |
| core_plugins | tags | `TEXT[]` | `TEXT …(+3)` |
| core_role_permissions | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_roles | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_roles | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_roles | updated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_tenant_modules | activated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_tenant_modules | expires_at | `TIMESTAMP` | `timestamptz` |
| core_tenant_plugins | activated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_tenant_plugins | last_used_at | `TIMESTAMP` | `timestamptz …(+2)` |
| core_tenant_plugins | license_expires_at | `TIMESTAMP` | `timestamptz` |
| core_tenant_settings | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_tenant_settings | updated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_tenant_usage | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_tenant_users | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_tenant_users | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_tenants | license_expires_at | `TIMESTAMP` | `timestamptz` |
| core_tenants | quota_plugins | `TEXT[]` | `TEXT` |
| core_tenants | trial_expires_at | `TIMESTAMP` | `timestamptz …(+5)` |
| core_ticket_sla_policies | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| core_tickets | tags | `TEXT[]` | `text` |
| core_user_roles | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_workflow_instances | completed_at | `TIMESTAMP` | `timestamptz` |
| core_workflow_instances | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW() …(+1)` |
| core_workflow_instances | started_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_workflow_tasks | completed_at | `TIMESTAMP` | `timestamptz` |
| core_workflow_tasks | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_workflow_tasks | priority | `TEXT` | `integer default` |
| core_workflows | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| core_workflows | published_at | `TIMESTAMP` | `timestamptz …(+1)` |
| core_workflows | updated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW()` |
| customer_orders | status | `VARCHAR(20) NOT NULL DEFAULT 'completed'` | `TEXT DEFAULT` |
| customers | code | `VARCHAR(100)` | `TEXT` |
| customers | industry | `VARCHAR(100)` | `TEXT …(+15)` |
| customers | name | `VARCHAR(255) NOT NULL` | `TEXT NOT NULL` |
| cycle_count_configs | count_frequency | `VARCHAR(20) NOT NULL DEFAULT 'monthly'` | `text` |
| cycle_count_configs | material_category | `VARCHAR(50)` | `text` |
| cycle_count_configs | priority_level | `VARCHAR(20) NOT NULL DEFAULT 'medium'` | `text` |
| devices | deleted_at | `TIMESTAMP` | `timestamp with time zone` |
| discrepancy_records | material_code | `VARCHAR(100) NOT NULL` | `text` |
| discrepancy_records | material_name | `VARCHAR(255) NOT NULL` | `text` |
| discrepancy_records | system_quantity | `NUMERIC(15, 2) NOT NULL` | `double precision …(+6)` |
| document_chunks | embedding | `vector(1536) NOT NULL` | `public` |
| documents | category | `VARCHAR(100)` | `TEXT …(+2)` |
| documents | file_name | `VARCHAR(500) NOT NULL` | `TEXT` |
| documents | file_path | `TEXT NOT NULL` | `VARCHAR(500)` |
| equipment | created_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `timestamp without time zone not null default now()` |
| equipment | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `timestamp without time zone not null default now()` |
| equipment_maintenance_records | end_time | `TIMESTAMPTZ` | `timestamp without time zone` |
| equipment_maintenance_records | result | `VARCHAR(20)` | `text …(+2)` |
| equipment_maintenance_records | start_time | `TIMESTAMPTZ NOT NULL` | `timestamp without time zone not null` |
| finance_control_points | created_at | `TIMESTAMPTZTZ NOT NULL DEFAULT NOW()` | `timestamptz not null default now()` |
| finance_control_points | deleted_at | `TIMESTAMPTZ` | `timestamp` |
| finance_control_points | updated_at | `TIMESTAMPTZTZ NOT NULL DEFAULT NOW()` | `timestamptz not null default now()` |
| finance_v56_tax_suggestions | action_items | `TEXT[]` | `text` |
| finance_v57_analysis_dimensions | hierarchy | `TEXT[]` | `text` |
| finance_v57_analysis_results | dimensions | `TEXT[] NOT NULL` | `text` |
| finance_v57_analysis_results | measures | `TEXT[] NOT NULL` | `text` |
| finance_v57_forecast_models | features | `TEXT[]` | `text` |
| finance_v58_cash_pools | entities | `TEXT[] NOT NULL DEFAULT '{}'` | `text` |
| fixed_assets | created_at | `TIMESTAMP NOT NULL DEFAULT NOW()` | `timestamp with time zone not null default now() …(+1)` |
| fixed_assets | monthly_depreciation | `DECIMAL(20,4)` | `float8 generated always as ((original_value - salvage_value)` |
| fixed_assets | net_value | `DECIMAL(20,4)` | `float8 generated always as (original_value - accumulated_depreciation)` |
| interactions | interaction_type | `VARCHAR(50) NOT NULL` | `TEXT NOT NULL` |
| interactions | status | `VARCHAR(20) NOT NULL DEFAULT 'scheduled'` | `TEXT DEFAULT …(+1)` |
| interactions | subject | `VARCHAR(255)` | `TEXT` |
| inventory | available_quantity | `DOUBLE PRECISION NOT NULL DEFAULT 0` | `numeric(15, 2)` |
| inventory | quantity | `DOUBLE PRECISION NOT NULL DEFAULT 0` | `numeric(15, 2)` |
| inventory | reserved_quantity | `DOUBLE PRECISION NOT NULL DEFAULT 0` | `numeric(15, 2)` |
| locations | location_type | `VARCHAR(100) NOT NULL` | `text` |
| locations | position | `JSONB NOT NULL` | `character varying(50)` |
| locations | status | `VARCHAR(50) NOT NULL DEFAULT 'active'` | `text …(+3)` |
| maps | deleted_at | `TIMESTAMP` | `timestamptz` |
| materials | material_code | `VARCHAR(64) NOT NULL` | `TEXT PRIMARY KEY` |
| materials | material_name | `VARCHAR(200) NOT NULL` | `TEXT NOT NULL` |
| media_files | tags | `TEXT[]` | `text` |
| opening_balances | created_at | `TIMESTAMP NOT NULL DEFAULT NOW()` | `timestamp with time zone not null default now()` |
| opening_balances | updated_at | `TIMESTAMP NOT NULL DEFAULT NOW()` | `timestamp with time zone not null default now()` |
| opportunities | customer_name | `VARCHAR(255)` | `TEXT` |
| opportunities | name | `VARCHAR(255) NOT NULL` | `TEXT NOT NULL …(+4)` |
| opportunities | opp_no | `VARCHAR(50)` | `TEXT` |
| patrol_records | patrol_type | `VARCHAR(50) NOT NULL` | `text not null default` |
| patrol_records | status | `VARCHAR(20) NOT NULL DEFAULT 'pending'` | `text not null default …(+1)` |
| patrol_records | title | `VARCHAR(200) NOT NULL` | `text not null default` |
| pdm_document_versions | changes | `TEXT[] NOT NULL DEFAULT '{}'` | `text` |
| pdm_project_phases | deliverables | `TEXT[] DEFAULT '{}'` | `text` |
| pipelines | deleted_at | `TIMESTAMP` | `timestamptz` |
| production_lines | created_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `TIMESTAMP DEFAULT NOW()` |
| production_lines | deleted_at | `TIMESTAMPTZ` | `TIMESTAMP` |
| production_lines | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `TIMESTAMP DEFAULT NOW()` |
| project_members | allocation | `DOUBLE PRECISION DEFAULT 1.0` | `numeric(5,2)` |
| project_members | cost_rate | `DOUBLE PRECISION` | `numeric(10,2) …(+2)` |
| project_members | hourly_rate | `DOUBLE PRECISION` | `numeric(10,2)` |
| push_notifications | target_ids | `TEXT[] NOT NULL` | `text` |
| qa_alert_messages | acknowledged_at | `TIMESTAMP` | `timestamp with time zone` |
| qa_alert_messages | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| qa_alert_rules | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz NOT NULL DEFAULT now()` |
| qa_alert_rules | deleted_at | `TIMESTAMP` | `timestamptz` |
| qa_alert_rules | updated_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz NOT NULL DEFAULT now()` |
| qa_apqp_approvals | approved_at | `TIMESTAMP` | `timestamp with time zone` |
| qa_apqp_approvals | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| qa_apqp_approvals | submitted_at | `TIMESTAMP DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| qa_apqp_phases | actual_start_date | `TIMESTAMP` | `timestamp with time zone …(+3)` |
| qa_apqp_phases | end_date | `TIMESTAMP` | `timestamp with time zone` |
| qa_apqp_phases | start_date | `TIMESTAMP` | `timestamp with time zone` |
| qa_apqp_projects | actual_end_date | `TIMESTAMP` | `timestamp with time zone …(+3)` |
| qa_apqp_projects | start_date | `TIMESTAMP` | `timestamp with time zone` |
| qa_apqp_projects | target_date | `TIMESTAMP` | `timestamp with time zone` |
| qa_apqp_risks | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| qa_apqp_risks | target_date | `TIMESTAMP` | `timestamp with time zone` |
| qa_apqp_risks | updated_at | `TIMESTAMP DEFAULT NOW()` | `timestamp with time zone DEFAULT now()` |
| qa_apqp_tasks | completed_at | `TIMESTAMP` | `timestamp with time zone` |
| qa_apqp_tasks | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamp with time zone DEFAULT now() …(+1)` |
| qa_apqp_tasks | due_date | `TIMESTAMP` | `timestamp with time zone` |
| qa_ehs_emergency_plans | contact_phone | `VARCHAR(32)` | `TEXT` |
| qa_ehs_employees | email | `VARCHAR(256)` | `text` |
| qa_ehs_hazard_factors | affected_positions | `JSONB` | `TEXT` |
| qa_ehs_hazard_factors | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW() …(+1)` |
| qa_ehs_hazard_factors | sources | `JSONB` | `TEXT` |
| qa_ehs_hazardous_materials | created_at | `TIMESTAMP DEFAULT NOW()` | `timestamptz DEFAULT NOW() …(+1)` |
| qa_ehs_hazardous_materials | hazard_class | `JSONB` | `VARCHAR(32)` |
| qa_ehs_hazardous_materials | storage_condition | `TEXT` | `VARCHAR(256)` |
| qa_ehs_hazards | category | `VARCHAR(64)` | `TEXT …(+8)` |
| qa_ehs_hazards | hazard_no | `VARCHAR(64) NOT NULL` | `TEXT NOT NULL UNIQUE` |
| qa_ehs_hazards | title | `VARCHAR(256) NOT NULL` | `TEXT` |
| qa_lab_calibration_records | calibration_date | `TIMESTAMPTZ NOT NULL` | `timestamp not null` |
| qa_lab_calibration_records | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lab_calibration_records | next_calibration_date | `TIMESTAMPTZ` | `timestamp` |
| qa_lab_inspection_reports | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lab_inspection_reports | inspection_date | `TIMESTAMPTZ` | `timestamp` |
| qa_lab_inspection_reports | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lab_instruments | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now() …(+2)` |
| qa_lab_instruments | last_calibration_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lab_instruments | next_calibration_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lab_processes | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lab_processes | deleted_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lab_processes | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lab_reagent_alerts | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lab_reagent_alerts | resolved_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lab_reagent_history | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lab_reagents | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lab_reagents | expired_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lab_reagents | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now() …(+1)` |
| qa_lab_records | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lab_records | deleted_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lab_records | recorded_at | `TIMESTAMPTZ DEFAULT now()` | `timestamp default now()` |
| qa_lab_sample_lifecycle | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_audit_logs | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_barcode_scan_records | scanned_at | `TIMESTAMPTZ DEFAULT now()` | `timestamp default now()` |
| qa_lims_collection_tasks | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now() …(+2)` |
| qa_lims_collection_tasks | last_run_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_collection_tasks | next_run_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_instrument_data | collected_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_instrument_data | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now() …(+2)` |
| qa_lims_instrument_data | parsed_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_method_categories | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_method_categories | deleted_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_method_categories | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_method_validations | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_method_validations | validation_date | `TIMESTAMPTZ NOT NULL` | `timestamp not null` |
| qa_lims_method_versions | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_parse_rules | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_parse_rules | deleted_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_parse_rules | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_pt_corrective_actions | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now() …(+1)` |
| qa_lims_pt_corrective_actions | deadline | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_pt_corrective_actions | verified_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_pt_evaluations | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_pt_evaluations | evaluated_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_pt_plans | registration_date | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_pt_plans | report_deadline | `TIMESTAMPTZ` | `timestamp …(+4)` |
| qa_lims_pt_plans | test_deadline | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_pt_results | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now() …(+1)` |
| qa_lims_pt_results | submitted_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_pt_results | test_date | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_pt_samples | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_pt_samples | received_date | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_rfid_tags | assigned_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_rfid_tags | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now() …(+2)` |
| qa_lims_rfid_tags | last_read_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_sample_barcodes | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now() …(+2)` |
| qa_lims_sample_barcodes | generated_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_sample_barcodes | last_printed_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_sync_records | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_sync_records | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_test_methods | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_test_methods | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now() …(+1)` |
| qa_lims_test_methods | validated_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_uncertainty_components | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_uncertainty_components | deleted_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_uncertainty_components | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_uncertainty_projects | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_uncertainty_projects | evaluation_date | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_uncertainty_projects | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now() …(+1)` |
| qa_lims_uncertainty_sources | created_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| qa_lims_uncertainty_sources | deleted_at | `TIMESTAMPTZ` | `timestamp` |
| qa_lims_uncertainty_sources | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `timestamp default now()` |
| replenishment_suggestions | material_code | `VARCHAR(100) NOT NULL` | `text` |
| replenishment_suggestions | material_name | `VARCHAR(200) NOT NULL` | `text …(+14)` |
| replenishment_suggestions | suggestion_number | `VARCHAR(50) NOT NULL` | `text` |
| returns | reason | `VARCHAR(200)` | `TEXT …(+1)` |
| returns | return_no | `VARCHAR(50) NOT NULL` | `TEXT` |
| returns | return_type | `VARCHAR(20) NOT NULL DEFAULT 'return'` | `TEXT` |
| rfm_results | frequency | `INTEGER NOT NULL DEFAULT 0` | `DOUBLE PRECISION` |
| rfm_results | monetary | `DECIMAL(15,2) NOT NULL DEFAULT 0` | `DOUBLE PRECISION …(+2)` |
| rfm_results | recency_days | `INTEGER NOT NULL DEFAULT 0` | `DOUBLE PRECISION` |
| sales_orders | order_date | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `DATE` |
| sales_orders | status | `VARCHAR(20) NOT NULL DEFAULT 'draft'` | `TEXT DEFAULT` |
| shifts | created_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `TIMESTAMP DEFAULT NOW()` |
| shifts | deleted_at | `TIMESTAMPTZ` | `TIMESTAMP` |
| shifts | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `TIMESTAMP DEFAULT NOW()` |
| stock_take_items | batch_number | `VARCHAR(100)` | `text …(+10)` |
| stock_take_items | material_code | `VARCHAR(100) NOT NULL` | `text` |
| stock_take_items | material_name | `VARCHAR(255) NOT NULL` | `text` |
| stock_takes | material_category | `VARCHAR(50)` | `text …(+17)` |
| stock_takes | stock_take_number | `VARCHAR(100) NOT NULL` | `text` |
| stock_takes | stock_take_type | `VARCHAR(50) NOT NULL` | `text` |
| supplier_delivery_appointments | delivery_time | `TIME` | `time without time zone` |
| supplier_delivery_appointments | expected_arrival_time | `TIME` | `time without time zone` |
| supplier_products | category | `VARCHAR(50)` | `TEXT …(+3)` |
| supplier_products | name | `VARCHAR(200) NOT NULL` | `TEXT NOT NULL` |
| supplier_products | product_no | `VARCHAR(50) NOT NULL` | `TEXT NOT NULL` |
| suppliers | code | `VARCHAR(50) NOT NULL` | `text` |
| tags | color | `VARCHAR(20) DEFAULT '#3498db'` | `TEXT DEFAULT` |
| tags | name | `VARCHAR(100) NOT NULL` | `TEXT NOT NULL` |
| ticket_knowledge_articles | keywords | `TEXT[] NOT NULL DEFAULT '{}'` | `text` |
| tms_carriers | carrier_no | `VARCHAR(64) NOT NULL` | `TEXT NOT NULL UNIQUE` |
| tms_carriers | contact_person | `VARCHAR(64)` | `TEXT …(+3)` |
| tms_carriers | name | `VARCHAR(128) NOT NULL` | `TEXT NOT NULL` |
| tms_drivers | driver_no | `VARCHAR(64) NOT NULL` | `TEXT NOT NULL UNIQUE` |
| tms_drivers | name | `VARCHAR(128) NOT NULL` | `TEXT NOT NULL` |
| tms_drivers | phone | `VARCHAR(32)` | `TEXT …(+3)` |
| tms_routes | name | `VARCHAR(128) NOT NULL` | `TEXT` |
| tms_routes | origin | `VARCHAR(256)` | `TEXT NOT NULL …(+2)` |
| tms_routes | route_no | `VARCHAR(64) NOT NULL` | `TEXT NOT NULL UNIQUE` |
| tms_shipments | destination | `VARCHAR(256)` | `TEXT NOT NULL …(+1)` |
| tms_shipments | origin | `VARCHAR(256)` | `TEXT NOT NULL` |
| tms_shipments | shipment_no | `VARCHAR(64) NOT NULL` | `TEXT NOT NULL UNIQUE` |
| tms_vehicles | plate_number | `VARCHAR(32)` | `TEXT` |
| tms_vehicles | vehicle_no | `VARCHAR(64) NOT NULL` | `TEXT NOT NULL UNIQUE` |
| tms_vehicles | vehicle_type | `VARCHAR(32)` | `TEXT …(+1)` |
| transfers | end_time | `TIME` | `time without time zone` |
| transfers | start_time | `TIME` | `time without time zone` |
| warehouse_locations | deleted_at | `TIMESTAMP` | `timestamptz` |
| warehouses | contact_phone | `VARCHAR(50)` | `text …(+2)` |
| warehouses | warehouse_code | `VARCHAR(100) NOT NULL` | `text` |
| warehouses | warehouse_name | `VARCHAR(255) NOT NULL` | `text` |
| work_calendars | created_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `TIMESTAMP DEFAULT NOW()` |
| work_calendars | deleted_at | `TIMESTAMPTZ` | `TIMESTAMP` |
| work_calendars | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `TIMESTAMP DEFAULT NOW()` |
| workshops | created_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `TIMESTAMP DEFAULT NOW()` |
| workshops | deleted_at | `TIMESTAMPTZ` | `TIMESTAMP` |
| workshops | updated_at | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | `TIMESTAMP DEFAULT NOW()` |
