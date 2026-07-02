use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_samples (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sample_no VARCHAR(64) NOT NULL UNIQUE,
            sample_name VARCHAR(256) NOT NULL,
            sample_type VARCHAR(64),
            source VARCHAR(64),
            quantity DECIMAL(12,2),
            unit VARCHAR(32),
            status VARCHAR(32) DEFAULT 'received',
            received_at TIMESTAMP DEFAULT NOW(),
            expired_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_no VARCHAR(64) NOT NULL UNIQUE,
            sample_id UUID NOT NULL REFERENCES qa_lab_samples(id) ON DELETE CASCADE,
            sample_no VARCHAR(64) NOT NULL,
            test_items JSONB NOT NULL,
            status VARCHAR(32) DEFAULT 'pending',
            assigned_to VARCHAR(64),
            instrument_id UUID,
            planned_date TIMESTAMP,
            actual_start_date TIMESTAMP,
            actual_end_date TIMESTAMP,
            result JSONB,
            conclusion VARCHAR(500),
            recorded_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            task_id UUID NOT NULL REFERENCES qa_lab_tasks(id) ON DELETE CASCADE,
            test_data JSONB NOT NULL,
            conclusion VARCHAR(256) NOT NULL,
            recorded_by VARCHAR(64) NOT NULL,
            recorded_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_instruments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instrument_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            model VARCHAR(128),
            manufacturer VARCHAR(128),
            status VARCHAR(32) DEFAULT 'normal',
            location VARCHAR(128),
            last_calibration_at TIMESTAMP,
            next_calibration_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_reagents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reagent_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            specification VARCHAR(128),
            manufacturer VARCHAR(128),
            batch_no VARCHAR(64),
            quantity DECIMAL(12,2),
            unit VARCHAR(32),
            status VARCHAR(32) DEFAULT 'normal',
            expired_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_processes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            process_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            description TEXT,
            steps JSONB,
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_sample_lifecycle (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sample_id UUID NOT NULL REFERENCES qa_lab_samples(id) ON DELETE CASCADE,
            sample_no VARCHAR(64) NOT NULL,
            lifecycle_stage VARCHAR(32) NOT NULL,
            stage_description TEXT,
            operator VARCHAR(64),
            notes TEXT,
            location VARCHAR(128),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_calibration_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instrument_id UUID NOT NULL REFERENCES qa_lab_instruments(id) ON DELETE CASCADE,
            instrument_no VARCHAR(64) NOT NULL,
            instrument_name VARCHAR(256) NOT NULL,
            calibrated_by VARCHAR(64) NOT NULL,
            calibration_date TIMESTAMP NOT NULL,
            next_calibration_date TIMESTAMP,
            calibration_result VARCHAR(32) NOT NULL,
            parameters JSONB,
            notes TEXT,
            certificate_no VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_reagent_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reagent_id UUID NOT NULL REFERENCES qa_lab_reagents(id) ON DELETE CASCADE,
            reagent_no VARCHAR(64) NOT NULL,
            reagent_name VARCHAR(256) NOT NULL,
            alert_type VARCHAR(32) NOT NULL,
            current_value DECIMAL(12,2),
            threshold_value DECIMAL(12,2),
            unit VARCHAR(32),
            message TEXT NOT NULL,
            is_resolved BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            resolved_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_reagent_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reagent_id UUID NOT NULL REFERENCES qa_lab_reagents(id) ON DELETE CASCADE,
            adjustment_type VARCHAR(16) NOT NULL,
            quantity DECIMAL(12,2) NOT NULL,
            reason TEXT,
            operator VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lab_inspection_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_no VARCHAR(64) NOT NULL UNIQUE,
            sample_id UUID NOT NULL REFERENCES qa_lab_samples(id) ON DELETE CASCADE,
            sample_no VARCHAR(64) NOT NULL,
            sample_name VARCHAR(256) NOT NULL,
            inspection_date TIMESTAMP,
            inspector VARCHAR(64),
            inspection_items JSONB,
            conclusion VARCHAR(32),
            remark TEXT,
            status VARCHAR(32) DEFAULT 'draft',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_no ON qa_lab_samples(sample_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_status ON qa_lab_samples(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_no ON qa_lab_tasks(task_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_status ON qa_lab_tasks(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_sample ON qa_lab_tasks(sample_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_records_no ON qa_lab_records(record_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_records_task ON qa_lab_records(task_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lab_instruments_no ON qa_lab_instruments(instrument_no)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lab_instruments_status ON qa_lab_instruments(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_reagents_no ON qa_lab_reagents(reagent_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_reagents_status ON qa_lab_reagents(status)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lab_processes_no ON qa_lab_processes(process_no)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_sample_lifecycle_sample ON qa_lab_sample_lifecycle(sample_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_calibration_records_instrument ON qa_lab_calibration_records(instrument_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_reagent_alerts_reagent ON qa_lab_reagent_alerts(reagent_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_reagent_history_reagent ON qa_lab_reagent_history(reagent_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_inspection_reports_no ON qa_lab_inspection_reports(report_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lab_inspection_reports_sample ON qa_lab_inspection_reports(sample_id)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_sync_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sync_no VARCHAR(64) NOT NULL UNIQUE,
            sync_type VARCHAR(32) NOT NULL,
            source_id UUID,
            target_service VARCHAR(32) NOT NULL,
            target_id UUID,
            status VARCHAR(32) DEFAULT 'pending',
            payload JSONB,
            response JSONB,
            error_msg TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_sync_no ON qa_lims_sync_records(sync_no)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_sync_type ON qa_lims_sync_records(sync_type)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_sync_status ON qa_lims_sync_records(status)",
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_sample_barcodes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            barcode VARCHAR(128) NOT NULL UNIQUE,
            barcode_type VARCHAR(32) NOT NULL,
            sample_id UUID REFERENCES qa_lab_samples(id) ON DELETE SET NULL,
            sample_no VARCHAR(64),
            rfid_tag VARCHAR(128),
            print_count INTEGER DEFAULT 0,
            status VARCHAR(32) DEFAULT 'active',
            generated_by VARCHAR(64),
            generated_at TIMESTAMP,
            last_printed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_barcode_scan_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            barcode_id UUID NOT NULL REFERENCES qa_lims_sample_barcodes(id) ON DELETE CASCADE,
            barcode VARCHAR(128) NOT NULL,
            scan_type VARCHAR(32) NOT NULL,
            sample_id UUID,
            sample_no VARCHAR(64),
            operator VARCHAR(64),
            location VARCHAR(128),
            notes TEXT,
            scanned_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_rfid_tags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tag_id VARCHAR(128) NOT NULL UNIQUE,
            tag_type VARCHAR(32) DEFAULT 'uhf',
            sample_id UUID REFERENCES qa_lab_samples(id) ON DELETE SET NULL,
            sample_no VARCHAR(64),
            status VARCHAR(32) DEFAULT 'unused',
            assigned_at TIMESTAMP,
            last_read_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_method_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category_code VARCHAR(64) NOT NULL UNIQUE,
            category_name VARCHAR(256) NOT NULL,
            parent_id UUID REFERENCES qa_lims_method_categories(id) ON DELETE CASCADE,
            sort_order INTEGER DEFAULT 0,
            description TEXT,
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_test_methods (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            method_code VARCHAR(64) NOT NULL UNIQUE,
            method_name VARCHAR(256) NOT NULL,
            category_id UUID REFERENCES qa_lims_method_categories(id) ON DELETE SET NULL,
            standard VARCHAR(256),
            version VARCHAR(32) DEFAULT '1.0',
            description TEXT,
            principle TEXT,
            instruments JSONB,
            reagents JSONB,
            parameters JSONB,
            steps JSONB,
            calculation_formula TEXT,
            uncertainty_ref VARCHAR(256),
            status VARCHAR(32) DEFAULT 'draft',
            validated BOOLEAN DEFAULT FALSE,
            validated_at TIMESTAMP,
            validated_by VARCHAR(64),
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_method_validations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            method_id UUID NOT NULL REFERENCES qa_lims_test_methods(id) ON DELETE CASCADE,
            method_code VARCHAR(64) NOT NULL,
            method_name VARCHAR(256) NOT NULL,
            version VARCHAR(32) NOT NULL,
            validation_type VARCHAR(64) NOT NULL,
            validation_date TIMESTAMP NOT NULL,
            validated_by VARCHAR(64) NOT NULL,
            conclusion VARCHAR(64) NOT NULL,
            parameters JSONB,
            report_url VARCHAR(512),
            notes TEXT,
            status VARCHAR(32) DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_method_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            method_id UUID NOT NULL REFERENCES qa_lims_test_methods(id) ON DELETE CASCADE,
            version VARCHAR(32) NOT NULL,
            version_description TEXT,
            change_log TEXT,
            is_current BOOLEAN DEFAULT FALSE,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_pt_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_no VARCHAR(64) NOT NULL UNIQUE,
            plan_name VARCHAR(256) NOT NULL,
            provider VARCHAR(256),
            test_item VARCHAR(256),
            test_method VARCHAR(256),
            plan_year VARCHAR(16),
            sample_type VARCHAR(64),
            expected_result JSONB,
            registration_date TIMESTAMP,
            test_deadline TIMESTAMP,
            report_deadline TIMESTAMP,
            status VARCHAR(32) DEFAULT 'planning',
            contact_person VARCHAR(64),
            contact_phone VARCHAR(32),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_pt_samples (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id UUID NOT NULL REFERENCES qa_lims_pt_plans(id) ON DELETE CASCADE,
            plan_no VARCHAR(64) NOT NULL,
            plan_name VARCHAR(256) NOT NULL,
            sample_code VARCHAR(128) NOT NULL,
            sample_name VARCHAR(256),
            received_date TIMESTAMP,
            received_by VARCHAR(64),
            storage_condition VARCHAR(256),
            sample_status VARCHAR(32) DEFAULT 'received',
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_pt_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id UUID NOT NULL REFERENCES qa_lims_pt_plans(id) ON DELETE CASCADE,
            plan_no VARCHAR(64) NOT NULL,
            sample_id UUID NOT NULL REFERENCES qa_lims_pt_samples(id) ON DELETE CASCADE,
            sample_code VARCHAR(128) NOT NULL,
            test_item VARCHAR(256) NOT NULL,
            test_result DECIMAL(18,6),
            result_unit VARCHAR(32),
            test_date TIMESTAMP,
            tested_by VARCHAR(64),
            instrument VARCHAR(256),
            test_method VARCHAR(256),
            replicate_results JSONB,
            mean_value DECIMAL(18,6),
            standard_deviation DECIMAL(18,6),
            coefficient_variation DECIMAL(10,4),
            notes TEXT,
            submitted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_pt_evaluations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id UUID NOT NULL REFERENCES qa_lims_pt_plans(id) ON DELETE CASCADE,
            plan_no VARCHAR(64) NOT NULL,
            sample_id UUID NOT NULL REFERENCES qa_lims_pt_samples(id) ON DELETE CASCADE,
            sample_code VARCHAR(128) NOT NULL,
            test_item VARCHAR(256) NOT NULL,
            test_result DECIMAL(18,6),
            assigned_value DECIMAL(18,6),
            standard_deviation DECIMAL(18,6),
            z_score DECIMAL(10,4),
            en_score DECIMAL(10,4),
            measurement_uncertainty DECIMAL(18,6),
            reference_uncertainty DECIMAL(18,6),
            evaluation_method VARCHAR(32),
            evaluation_result VARCHAR(32),
            evaluated_by VARCHAR(64),
            evaluated_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_pt_corrective_actions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id UUID NOT NULL REFERENCES qa_lims_pt_plans(id) ON DELETE CASCADE,
            plan_no VARCHAR(64) NOT NULL,
            evaluation_id UUID NOT NULL REFERENCES qa_lims_pt_evaluations(id) ON DELETE CASCADE,
            unsatisfactory_item VARCHAR(256) NOT NULL,
            root_cause TEXT,
            corrective_measures TEXT,
            responsible_person VARCHAR(64),
            deadline TIMESTAMP,
            status VARCHAR(32) DEFAULT 'pending',
            verification_result TEXT,
            verified_by VARCHAR(64),
            verified_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_uncertainty_projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_no VARCHAR(64) NOT NULL UNIQUE,
            project_name VARCHAR(256) NOT NULL,
            method_id UUID,
            method_name VARCHAR(256),
            test_item VARCHAR(256),
            measurand VARCHAR(256),
            measurement_range VARCHAR(128),
            unit VARCHAR(32),
            status VARCHAR(32) DEFAULT 'draft',
            evaluator VARCHAR(64),
            evaluation_date TIMESTAMP,
            combined_uncertainty DECIMAL(18,6),
            expanded_uncertainty DECIMAL(18,6),
            coverage_factor DECIMAL(10,4) DEFAULT 2.0,
            confidence_level DECIMAL(10,4) DEFAULT 95.0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_uncertainty_sources (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES qa_lims_uncertainty_projects(id) ON DELETE CASCADE,
            source_name VARCHAR(256) NOT NULL,
            source_type VARCHAR(32) NOT NULL,
            description TEXT,
            distribution_type VARCHAR(32),
            sensitivity_coefficient DECIMAL(18,6),
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_uncertainty_components (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES qa_lims_uncertainty_projects(id) ON DELETE CASCADE,
            source_id UUID NOT NULL REFERENCES qa_lims_uncertainty_sources(id) ON DELETE CASCADE,
            component_type VARCHAR(16) NOT NULL,
            component_name VARCHAR(256) NOT NULL,
            standard_uncertainty DECIMAL(18,6),
            relative_uncertainty DECIMAL(18,6),
            sensitivity_coefficient DECIMAL(18,6),
            degrees_freedom DECIMAL(18,6),
            calculation_method VARCHAR(64),
            parameters JSONB,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_sample_barcodes_no ON qa_lims_sample_barcodes(barcode)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_sample_barcodes_sample ON qa_lims_sample_barcodes(sample_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_sample_barcodes_status ON qa_lims_sample_barcodes(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_barcode_scan_barcode ON qa_lims_barcode_scan_records(barcode)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_barcode_scan_type ON qa_lims_barcode_scan_records(scan_type)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_rfid_tags_tag ON qa_lims_rfid_tags(tag_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_rfid_tags_status ON qa_lims_rfid_tags(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_test_methods_code ON qa_lims_test_methods(method_code)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_test_methods_status ON qa_lims_test_methods(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_test_methods_category ON qa_lims_test_methods(category_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_method_categories_code ON qa_lims_method_categories(category_code)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_method_validations_method ON qa_lims_method_validations(method_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_method_versions_method ON qa_lims_method_versions(method_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_plans_no ON qa_lims_pt_plans(plan_no)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_plans_status ON qa_lims_pt_plans(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_samples_plan ON qa_lims_pt_samples(plan_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_results_plan ON qa_lims_pt_results(plan_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_results_sample ON qa_lims_pt_results(sample_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_evaluations_plan ON qa_lims_pt_evaluations(plan_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_corrective_plan ON qa_lims_pt_corrective_actions(plan_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_corrective_status ON qa_lims_pt_corrective_actions(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_projects_no ON qa_lims_uncertainty_projects(project_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_projects_status ON qa_lims_uncertainty_projects(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_sources_project ON qa_lims_uncertainty_sources(project_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_components_project ON qa_lims_uncertainty_components(project_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_components_source ON qa_lims_uncertainty_components(source_id)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_instrument_data (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            data_no VARCHAR(64) NOT NULL UNIQUE,
            instrument_id UUID REFERENCES qa_lab_instruments(id) ON DELETE SET NULL,
            batch_no VARCHAR(64) NOT NULL,
            protocol VARCHAR(32) NOT NULL DEFAULT 'JSON',
            raw_data JSONB,
            parsed_data JSONB,
            status VARCHAR(32) DEFAULT 'pending',
            quality_score DECIMAL(5,2),
            error_msg TEXT,
            collected_at TIMESTAMP,
            parsed_at TIMESTAMP,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_collection_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_no VARCHAR(64) NOT NULL UNIQUE,
            task_name VARCHAR(256) NOT NULL,
            instrument_id UUID REFERENCES qa_lab_instruments(id) ON DELETE SET NULL,
            protocol VARCHAR(32) NOT NULL DEFAULT 'JSON',
            collection_mode VARCHAR(32) DEFAULT 'manual',
            cron_expression VARCHAR(128),
            interval_minutes INTEGER,
            parse_rule_id UUID,
            status VARCHAR(32) DEFAULT 'active',
            last_run_at TIMESTAMP,
            next_run_at TIMESTAMP,
            total_collections BIGINT DEFAULT 0,
            success_count BIGINT DEFAULT 0,
            failed_count BIGINT DEFAULT 0,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_parse_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            rule_no VARCHAR(64) NOT NULL UNIQUE,
            rule_name VARCHAR(256) NOT NULL,
            protocol VARCHAR(32) NOT NULL DEFAULT 'JSON',
            instrument_type VARCHAR(64),
            parse_config JSONB,
            quality_rules JSONB,
            status VARCHAR(32) DEFAULT 'active',
            version VARCHAR(32) DEFAULT '1.0',
            description TEXT,
            created_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_no ON qa_lims_instrument_data(data_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_status ON qa_lims_instrument_data(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_instrument ON qa_lims_instrument_data(instrument_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_batch ON qa_lims_instrument_data(batch_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_protocol ON qa_lims_instrument_data(protocol)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_collection_tasks_no ON qa_lims_collection_tasks(task_no)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_collection_tasks_status ON qa_lims_collection_tasks(status)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_collection_tasks_instrument ON qa_lims_collection_tasks(instrument_id)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_parse_rules_no ON qa_lims_parse_rules(rule_no)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_parse_rules_status ON qa_lims_parse_rules(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_parse_rules_protocol ON qa_lims_parse_rules(protocol)")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS qa_lims_audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            action VARCHAR(64) NOT NULL,
            entity_type VARCHAR(64),
            entity_id UUID,
            entity_ids JSONB,
            user_id VARCHAR(64),
            user_name VARCHAR(128),
            request_details JSONB,
            response_details JSONB,
            status VARCHAR(32) DEFAULT 'success',
            error_message TEXT,
            ip_address VARCHAR(128),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_action ON qa_lims_audit_logs(action)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_entity_type ON qa_lims_audit_logs(entity_type)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_user_id ON qa_lims_audit_logs(user_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_status ON qa_lims_audit_logs(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_created_at ON qa_lims_audit_logs(created_at)")
        .execute(pool)
        .await?;

    Ok(())
}
