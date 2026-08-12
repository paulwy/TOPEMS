pub const SERVICE_SCHEMA: &str = "lims";

pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "qa_lab_samples",
        &[
            ("sample_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("sample_name", "VARCHAR(256) NOT NULL"),
            ("sample_type", "VARCHAR(64)"),
            ("source", "VARCHAR(64)"),
            ("quantity", "DECIMAL(12,2)"),
            ("unit", "VARCHAR(32)"),
            ("status", "VARCHAR(32) DEFAULT 'received'"),
            ("received_at", "TIMESTAMP DEFAULT NOW()"),
            ("expired_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lab_tasks",
        &[
            ("task_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("sample_id", "UUID NOT NULL"),
            ("sample_no", "VARCHAR(64) NOT NULL"),
            ("test_items", "JSONB NOT NULL"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("assigned_to", "VARCHAR(64)"),
            ("instrument_id", "UUID"),
            ("planned_date", "TIMESTAMP"),
            ("actual_start_date", "TIMESTAMP"),
            ("actual_end_date", "TIMESTAMP"),
            ("result", "JSONB"),
            ("conclusion", "VARCHAR(500)"),
            ("recorded_by", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lab_records",
        &[
            ("record_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("task_id", "UUID NOT NULL"),
            ("test_data", "JSONB NOT NULL"),
            ("conclusion", "VARCHAR(256) NOT NULL"),
            ("recorded_by", "VARCHAR(64) NOT NULL"),
            ("recorded_at", "TIMESTAMP DEFAULT NOW()"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lab_instruments",
        &[
            ("instrument_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("model", "VARCHAR(128)"),
            ("manufacturer", "VARCHAR(128)"),
            ("status", "VARCHAR(32) DEFAULT 'normal'"),
            ("location", "VARCHAR(128)"),
            ("last_calibration_at", "TIMESTAMP"),
            ("next_calibration_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lab_reagents",
        &[
            ("reagent_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("specification", "VARCHAR(128)"),
            ("manufacturer", "VARCHAR(128)"),
            ("batch_no", "VARCHAR(64)"),
            ("quantity", "DECIMAL(12,2)"),
            ("unit", "VARCHAR(32)"),
            ("status", "VARCHAR(32) DEFAULT 'normal'"),
            ("expired_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lab_processes",
        &[
            ("process_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("steps", "JSONB"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lab_sample_lifecycle",
        &[
            ("sample_id", "UUID NOT NULL"),
            ("sample_no", "VARCHAR(64) NOT NULL"),
            ("lifecycle_stage", "VARCHAR(32) NOT NULL"),
            ("stage_description", "TEXT"),
            ("operator", "VARCHAR(64)"),
            ("notes", "TEXT"),
            ("location", "VARCHAR(128)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lab_calibration_records",
        &[
            ("instrument_id", "UUID NOT NULL"),
            ("instrument_no", "VARCHAR(64) NOT NULL"),
            ("instrument_name", "VARCHAR(256) NOT NULL"),
            ("calibrated_by", "VARCHAR(64) NOT NULL"),
            ("calibration_date", "TIMESTAMP NOT NULL"),
            ("next_calibration_date", "TIMESTAMP"),
            ("calibration_result", "VARCHAR(32) NOT NULL"),
            ("parameters", "JSONB"),
            ("notes", "TEXT"),
            ("certificate_no", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lab_reagent_alerts",
        &[
            ("reagent_id", "UUID NOT NULL"),
            ("reagent_no", "VARCHAR(64) NOT NULL"),
            ("reagent_name", "VARCHAR(256) NOT NULL"),
            ("alert_type", "VARCHAR(32) NOT NULL"),
            ("current_value", "DECIMAL(12,2)"),
            ("threshold_value", "DECIMAL(12,2)"),
            ("unit", "VARCHAR(32)"),
            ("message", "TEXT NOT NULL"),
            ("is_resolved", "BOOLEAN DEFAULT FALSE"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("resolved_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lab_reagent_history",
        &[
            ("reagent_id", "UUID NOT NULL"),
            ("adjustment_type", "VARCHAR(16) NOT NULL"),
            ("quantity", "DECIMAL(12,2) NOT NULL"),
            ("reason", "TEXT"),
            ("operator", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lab_inspection_reports",
        &[
            ("report_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("sample_id", "UUID NOT NULL"),
            ("sample_no", "VARCHAR(64) NOT NULL"),
            ("sample_name", "VARCHAR(256) NOT NULL"),
            ("inspection_date", "TIMESTAMP"),
            ("inspector", "VARCHAR(64)"),
            ("inspection_items", "JSONB"),
            ("conclusion", "VARCHAR(32)"),
            ("remark", "TEXT"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lims_sync_records",
        &[
            ("sync_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("sync_type", "VARCHAR(32) NOT NULL"),
            ("source_id", "UUID"),
            ("target_service", "VARCHAR(32) NOT NULL"),
            ("target_id", "UUID"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("payload", "JSONB"),
            ("response", "JSONB"),
            ("error_msg", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lims_sample_barcodes",
        &[
            ("barcode", "VARCHAR(128) NOT NULL UNIQUE"),
            ("barcode_type", "VARCHAR(32) NOT NULL"),
            ("sample_id", "UUID"),
            ("sample_no", "VARCHAR(64)"),
            ("rfid_tag", "VARCHAR(128)"),
            ("print_count", "INTEGER DEFAULT 0"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("generated_by", "VARCHAR(64)"),
            ("generated_at", "TIMESTAMP"),
            ("last_printed_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_barcode_scan_records",
        &[
            ("barcode_id", "UUID NOT NULL"),
            ("barcode", "VARCHAR(128) NOT NULL"),
            ("scan_type", "VARCHAR(32) NOT NULL"),
            ("sample_id", "UUID"),
            ("sample_no", "VARCHAR(64)"),
            ("operator", "VARCHAR(64)"),
            ("location", "VARCHAR(128)"),
            ("notes", "TEXT"),
            ("scanned_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lims_rfid_tags",
        &[
            ("tag_id", "VARCHAR(128) NOT NULL UNIQUE"),
            ("tag_type", "VARCHAR(32) DEFAULT 'uhf'"),
            ("sample_id", "UUID"),
            ("sample_no", "VARCHAR(64)"),
            ("status", "VARCHAR(32) DEFAULT 'unused'"),
            ("assigned_at", "TIMESTAMP"),
            ("last_read_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_method_categories",
        &[
            ("category_code", "VARCHAR(64) NOT NULL UNIQUE"),
            ("category_name", "VARCHAR(256) NOT NULL"),
            ("parent_id", "UUID"),
            ("sort_order", "INTEGER DEFAULT 0"),
            ("description", "TEXT"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_test_methods",
        &[
            ("method_code", "VARCHAR(64) NOT NULL UNIQUE"),
            ("method_name", "VARCHAR(256) NOT NULL"),
            ("category_id", "UUID"),
            ("standard", "VARCHAR(256)"),
            ("version", "VARCHAR(32) DEFAULT '1.0'"),
            ("description", "TEXT"),
            ("principle", "TEXT"),
            ("instruments", "JSONB"),
            ("reagents", "JSONB"),
            ("parameters", "JSONB"),
            ("steps", "JSONB"),
            ("calculation_formula", "TEXT"),
            ("uncertainty_ref", "VARCHAR(256)"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("validated", "BOOLEAN DEFAULT FALSE"),
            ("validated_at", "TIMESTAMP"),
            ("validated_by", "VARCHAR(64)"),
            ("created_by", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_method_validations",
        &[
            ("method_id", "UUID NOT NULL"),
            ("method_code", "VARCHAR(64) NOT NULL"),
            ("method_name", "VARCHAR(256) NOT NULL"),
            ("version", "VARCHAR(32) NOT NULL"),
            ("validation_type", "VARCHAR(64) NOT NULL"),
            ("validation_date", "TIMESTAMP NOT NULL"),
            ("validated_by", "VARCHAR(64) NOT NULL"),
            ("conclusion", "VARCHAR(64) NOT NULL"),
            ("parameters", "JSONB"),
            ("report_url", "VARCHAR(512)"),
            ("notes", "TEXT"),
            ("status", "VARCHAR(32) DEFAULT 'completed'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lims_method_versions",
        &[
            ("method_id", "UUID NOT NULL"),
            ("version", "VARCHAR(32) NOT NULL"),
            ("version_description", "TEXT"),
            ("change_log", "TEXT"),
            ("is_current", "BOOLEAN DEFAULT FALSE"),
            ("created_by", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lims_pt_plans",
        &[
            ("plan_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("plan_name", "VARCHAR(256) NOT NULL"),
            ("provider", "VARCHAR(256)"),
            ("test_item", "VARCHAR(256)"),
            ("test_method", "VARCHAR(256)"),
            ("plan_year", "VARCHAR(16)"),
            ("sample_type", "VARCHAR(64)"),
            ("expected_result", "JSONB"),
            ("registration_date", "TIMESTAMP"),
            ("test_deadline", "TIMESTAMP"),
            ("report_deadline", "TIMESTAMP"),
            ("status", "VARCHAR(32) DEFAULT 'planning'"),
            ("contact_person", "VARCHAR(64)"),
            ("contact_phone", "VARCHAR(32)"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_pt_samples",
        &[
            ("plan_id", "UUID NOT NULL"),
            ("plan_no", "VARCHAR(64) NOT NULL"),
            ("plan_name", "VARCHAR(256) NOT NULL"),
            ("sample_code", "VARCHAR(128) NOT NULL"),
            ("sample_name", "VARCHAR(256)"),
            ("received_date", "TIMESTAMP"),
            ("received_by", "VARCHAR(64)"),
            ("storage_condition", "VARCHAR(256)"),
            ("sample_status", "VARCHAR(32) DEFAULT 'received'"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lims_pt_results",
        &[
            ("plan_id", "UUID NOT NULL"),
            ("plan_no", "VARCHAR(64) NOT NULL"),
            ("sample_id", "UUID NOT NULL"),
            ("sample_code", "VARCHAR(128) NOT NULL"),
            ("test_item", "VARCHAR(256) NOT NULL"),
            ("test_result", "DECIMAL(18,6)"),
            ("result_unit", "VARCHAR(32)"),
            ("test_date", "TIMESTAMP"),
            ("tested_by", "VARCHAR(64)"),
            ("instrument", "VARCHAR(256)"),
            ("test_method", "VARCHAR(256)"),
            ("replicate_results", "JSONB"),
            ("mean_value", "DECIMAL(18,6)"),
            ("standard_deviation", "DECIMAL(18,6)"),
            ("coefficient_variation", "DECIMAL(10,4)"),
            ("notes", "TEXT"),
            ("submitted_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lims_pt_evaluations",
        &[
            ("plan_id", "UUID NOT NULL"),
            ("plan_no", "VARCHAR(64) NOT NULL"),
            ("sample_id", "UUID NOT NULL"),
            ("sample_code", "VARCHAR(128) NOT NULL"),
            ("test_item", "VARCHAR(256) NOT NULL"),
            ("test_result", "DECIMAL(18,6)"),
            ("assigned_value", "DECIMAL(18,6)"),
            ("standard_deviation", "DECIMAL(18,6)"),
            ("z_score", "DECIMAL(10,4)"),
            ("en_score", "DECIMAL(10,4)"),
            ("measurement_uncertainty", "DECIMAL(18,6)"),
            ("reference_uncertainty", "DECIMAL(18,6)"),
            ("evaluation_method", "VARCHAR(32)"),
            ("evaluation_result", "VARCHAR(32)"),
            ("evaluated_by", "VARCHAR(64)"),
            ("evaluated_at", "TIMESTAMP"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lims_pt_corrective_actions",
        &[
            ("plan_id", "UUID NOT NULL"),
            ("plan_no", "VARCHAR(64) NOT NULL"),
            ("evaluation_id", "UUID NOT NULL"),
            ("unsatisfactory_item", "VARCHAR(256) NOT NULL"),
            ("root_cause", "TEXT"),
            ("corrective_measures", "TEXT"),
            ("responsible_person", "VARCHAR(64)"),
            ("deadline", "TIMESTAMP"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("verification_result", "TEXT"),
            ("verified_by", "VARCHAR(64)"),
            ("verified_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_lims_uncertainty_projects",
        &[
            ("project_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("project_name", "VARCHAR(256) NOT NULL"),
            ("method_id", "UUID"),
            ("method_name", "VARCHAR(256)"),
            ("test_item", "VARCHAR(256)"),
            ("measurand", "VARCHAR(256)"),
            ("measurement_range", "VARCHAR(128)"),
            ("unit", "VARCHAR(32)"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("evaluator", "VARCHAR(64)"),
            ("evaluation_date", "TIMESTAMP"),
            ("combined_uncertainty", "DECIMAL(18,6)"),
            ("expanded_uncertainty", "DECIMAL(18,6)"),
            ("coverage_factor", "DECIMAL(10,4) DEFAULT 2.0"),
            ("confidence_level", "DECIMAL(10,4) DEFAULT 95.0"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_uncertainty_sources",
        &[
            ("project_id", "UUID NOT NULL"),
            ("source_name", "VARCHAR(256) NOT NULL"),
            ("source_type", "VARCHAR(32) NOT NULL"),
            ("description", "TEXT"),
            ("distribution_type", "VARCHAR(32)"),
            ("sensitivity_coefficient", "DECIMAL(18,6)"),
            ("sort_order", "INTEGER DEFAULT 0"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_uncertainty_components",
        &[
            ("project_id", "UUID NOT NULL"),
            ("source_id", "UUID NOT NULL"),
            ("component_type", "VARCHAR(16) NOT NULL"),
            ("component_name", "VARCHAR(256) NOT NULL"),
            ("standard_uncertainty", "DECIMAL(18,6)"),
            ("relative_uncertainty", "DECIMAL(18,6)"),
            ("sensitivity_coefficient", "DECIMAL(18,6)"),
            ("degrees_freedom", "DECIMAL(18,6)"),
            ("calculation_method", "VARCHAR(64)"),
            ("parameters", "JSONB"),
            ("description", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_instrument_data",
        &[
            ("data_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("instrument_id", "UUID"),
            ("batch_no", "VARCHAR(64) NOT NULL"),
            ("protocol", "VARCHAR(32) NOT NULL DEFAULT 'JSON'"),
            ("raw_data", "JSONB"),
            ("parsed_data", "JSONB"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("quality_score", "DECIMAL(5,2)"),
            ("error_msg", "TEXT"),
            ("collected_at", "TIMESTAMP"),
            ("parsed_at", "TIMESTAMP"),
            ("created_by", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_collection_tasks",
        &[
            ("task_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("task_name", "VARCHAR(256) NOT NULL"),
            ("instrument_id", "UUID"),
            ("protocol", "VARCHAR(32) NOT NULL DEFAULT 'JSON'"),
            ("collection_mode", "VARCHAR(32) DEFAULT 'manual'"),
            ("cron_expression", "VARCHAR(128)"),
            ("interval_minutes", "INTEGER"),
            ("parse_rule_id", "UUID"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("last_run_at", "TIMESTAMP"),
            ("next_run_at", "TIMESTAMP"),
            ("total_collections", "BIGINT DEFAULT 0"),
            ("success_count", "BIGINT DEFAULT 0"),
            ("failed_count", "BIGINT DEFAULT 0"),
            ("created_by", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_parse_rules",
        &[
            ("rule_no", "VARCHAR(64) NOT NULL UNIQUE"),
            ("rule_name", "VARCHAR(256) NOT NULL"),
            ("protocol", "VARCHAR(32) NOT NULL DEFAULT 'JSON'"),
            ("instrument_type", "VARCHAR(64)"),
            ("parse_config", "JSONB"),
            ("quality_rules", "JSONB"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("version", "VARCHAR(32) DEFAULT '1.0'"),
            ("description", "TEXT"),
            ("created_by", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMP"),
        ],
    ),
    (
        "qa_lims_audit_logs",
        &[
            ("action", "VARCHAR(64) NOT NULL"),
            ("entity_type", "VARCHAR(64)"),
            ("entity_id", "UUID"),
            ("entity_ids", "JSONB"),
            ("user_id", "VARCHAR(64)"),
            ("user_name", "VARCHAR(128)"),
            ("request_details", "JSONB"),
            ("response_details", "JSONB"),
            ("status", "VARCHAR(32) DEFAULT 'success'"),
            ("error_message", "TEXT"),
            ("ip_address", "VARCHAR(128)"),
            ("user_agent", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
];

use sqlx::PgPool;
use std::collections::BTreeSet;

async fn add_column_if_missing(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), sqlx::Error> {
    let qualified = match schema {
        Some(s) => format!(r#""{}"."{}""#, s, table),
        None => format!(r#""{}""#, table),
    };
    let ddl = format!(
        r#"ALTER TABLE {} ADD COLUMN IF NOT EXISTS "{}" {}"#,
        qualified, column, definition
    );
    sqlx::query(&ddl).execute(pool).await?;
    Ok(())
}

async fn ensure_table_columns(
    pool: &PgPool,
    schema: Option<&str>,
    table: &str,
    columns: &[(&str, &str)],
) -> Result<usize, sqlx::Error> {
    let mut n = 0usize;
    for (col, def) in columns {
        add_column_if_missing(pool, schema, table, col, def).await?;
        n += 1;
    }
    Ok(n)
}

async fn verify_table_columns(
    pool: &PgPool,
    schema: &str,
    table: &str,
    expected: &[&str],
) -> Result<(), sqlx::Error> {
    let rows: Vec<(String,)> = sqlx::query_as(
        r#"
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        "#,
    )
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await?;
    let actual: BTreeSet<&str> = rows.iter().map(|(c,)| c.as_str()).collect();
    let mut missing = Vec::new();
    for col in expected {
        if !actual.contains(col) {
            missing.push(*col);
        }
    }
    if !missing.is_empty() {
        tracing::warn!(
            "[lims schema 自检] {}.{} 仍缺失 {} 列: {:?}",
            schema,
            table,
            missing.len(),
            missing
        );
    }
    Ok(())
}

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 阶段 0：确保 TABLE_DEFS 中所有表的"骨架"都存在（空表仅含 id PK）。
    // 新增的表如果老环境从未 CREATE 过，后续 ensure_table_columns(ALTER TABLE …)
    // 会因为 relation does not exist 直接报错。用 IF NOT EXISTS 建最小骨架即可，
    // 后续阶段 1 再补齐所有非 PK 列，老库已存在的表完全不受影响。
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (\
                id UUID PRIMARY KEY DEFAULT gen_random_uuid()\
            )",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }

    // 阶段 1：逐列 ADD COLUMN IF NOT EXISTS（增量迁移）
    let mut tables_done = 0usize;
    let mut cols_added = 0usize;
    for (tbl, cols_arr) in TABLE_DEFS {
        let n = ensure_table_columns(pool, Some(SERVICE_SCHEMA), tbl, cols_arr).await?;
        tables_done += 1;
        cols_added += n;
    }
    tracing::info!(
        "[lims 增量迁移] 完成 {} 张表 / {} 列 ADD COLUMN IF NOT EXISTS 检查",
        tables_done,
        cols_added
    );

    // 阶段 2：information_schema 列一致性自检
    let mut verified = 0usize;
    for (tbl, cols_arr) in TABLE_DEFS {
        let mut expected = vec!["id"];
        expected.extend(cols_arr.iter().map(|(c, _)| *c));
        verify_table_columns(pool, SERVICE_SCHEMA, tbl, &expected).await?;
        verified += 1;
    }
    tracing::info!("[lims schema 自检] 完成 {} 张表结构一致性校验", verified);
    Ok(())
}
