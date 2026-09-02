pub mod audit_log;

use sqlx::PgPool;
use std::collections::BTreeSet;
use topems_shared_boundary::only_own_schema_query;

// =====================================================================
// 📋 开发规范：新增列必须两处同步（详见 docs/development/backend/database-development.md）
//  (1) 下方 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//  (2) 上方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//      → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK
//         （这些由 CREATE TABLE / CREATE INDEX IF NOT EXISTS 负责）
// =====================================================================

pub const SERVICE_SCHEMA: &str = "ehs";

/// EHS 43 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "qa_ehs_risks",
        &[
            ("risk_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("risk_type", "VARCHAR(64)"),
            ("hazard_factor", "VARCHAR(128)"),
            ("likelihood", "INTEGER"),
            ("severity", "INTEGER"),
            ("risk_level", "VARCHAR(32)"),
            ("control_measures", "TEXT"),
            ("status", "VARCHAR(32) DEFAULT 'identified'"),
            ("assessed_by", "VARCHAR(64)"),
            ("assessed_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_inspection_plans",
        &[
            ("plan_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("inspection_type", "VARCHAR(64)"),
            ("frequency", "VARCHAR(32)"),
            ("start_date", "DATE"),
            ("end_date", "DATE"),
            ("inspector", "VARCHAR(64)"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_inspection_items",
        &[
            ("plan_id", "UUID"),
            ("item_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("category", "VARCHAR(64)"),
            ("standard", "TEXT"),
            ("order_num", "INTEGER DEFAULT 0"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_inspection_records",
        &[
            ("record_no", "VARCHAR(64) NOT NULL"),
            ("plan_id", "UUID"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("inspection_type", "VARCHAR(64)"),
            ("location", "VARCHAR(128)"),
            ("inspector", "VARCHAR(64)"),
            ("inspected_at", "TIMESTAMP"),
            ("result", "VARCHAR(32)"),
            ("issues", "JSONB"),
            ("attachments", "JSONB"),
            ("status", "VARCHAR(32) DEFAULT 'in_progress'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_inspection_record_items",
        &[
            ("record_id", "UUID"),
            ("item_id", "UUID"),
            ("item_title", "VARCHAR(256) NOT NULL"),
            ("item_category", "VARCHAR(64)"),
            ("result", "VARCHAR(32)"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_hazards",
        &[
            ("hazard_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("category", "VARCHAR(64)"),
            ("level", "VARCHAR(32)"),
            ("source", "VARCHAR(64)"),
            ("location", "VARCHAR(128)"),
            ("reported_by", "VARCHAR(64)"),
            ("reported_at", "TIMESTAMP"),
            ("status", "VARCHAR(32) DEFAULT 'reported'"),
            ("inspection_id", "UUID"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_hazard_rectifications",
        &[
            ("hazard_id", "UUID"),
            ("description", "TEXT"),
            ("responsible", "VARCHAR(64)"),
            ("deadline", "DATE"),
            ("status", "VARCHAR(32) DEFAULT 'in_progress'"),
            ("progress", "INTEGER DEFAULT 0"),
            ("started_at", "TIMESTAMP"),
            ("completed_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_hazard_verifications",
        &[
            ("hazard_id", "UUID"),
            ("verifier", "VARCHAR(64)"),
            ("result", "VARCHAR(32)"),
            ("remarks", "TEXT"),
            ("verified_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_accidents",
        &[
            ("accident_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("accident_type", "VARCHAR(64)"),
            ("severity", "VARCHAR(32)"),
            ("location", "VARCHAR(128)"),
            ("occurred_at", "TIMESTAMP"),
            ("casualties", "INTEGER"),
            ("economic_loss", "DECIMAL(12,2)"),
            ("status", "VARCHAR(32) DEFAULT 'reported'"),
            ("reported_by", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_accident_investigations",
        &[
            ("accident_id", "UUID"),
            ("team", "JSONB"),
            ("findings", "TEXT"),
            ("root_cause", "TEXT"),
            ("timeline", "JSONB"),
            ("status", "VARCHAR(32) DEFAULT 'in_progress'"),
            ("started_at", "TIMESTAMP"),
            ("completed_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_accident_treatments",
        &[
            ("accident_id", "UUID"),
            ("actions", "JSONB"),
            ("responsible", "VARCHAR(64)"),
            ("status", "VARCHAR(32) DEFAULT 'in_progress'"),
            ("started_at", "TIMESTAMP"),
            ("completed_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_accident_reviews",
        &[
            ("accident_id", "UUID"),
            ("summary", "TEXT"),
            ("lessons_learned", "JSONB"),
            ("recommendations", "JSONB"),
            ("reviewer", "VARCHAR(64)"),
            ("reviewed_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_environment",
        &[
            ("record_no", "VARCHAR(64) NOT NULL"),
            ("monitor_type", "VARCHAR(64)"),
            ("monitor_point", "VARCHAR(128)"),
            ("data", "JSONB"),
            ("status", "VARCHAR(32) DEFAULT 'normal'"),
            ("monitored_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_trainings",
        &[
            ("training_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("content", "TEXT"),
            ("trainer", "VARCHAR(64)"),
            ("training_type", "VARCHAR(64)"),
            ("duration_hours", "INTEGER"),
            ("scheduled_at", "TIMESTAMP"),
            ("status", "VARCHAR(32) DEFAULT 'scheduled'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_sync_records",
        &[
            ("sync_no", "VARCHAR(64) NOT NULL"),
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
        "qa_ehs_emergency_plans",
        &[
            ("plan_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("category", "VARCHAR(64)"),
            ("version", "VARCHAR(32)"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("scope", "TEXT"),
            ("emergency_level", "VARCHAR(32)"),
            ("responsible_dept", "VARCHAR(128)"),
            ("responsible_person", "VARCHAR(64)"),
            ("contact_phone", "VARCHAR(32)"),
            ("content", "TEXT"),
            ("created_by", "VARCHAR(64)"),
            ("approved_by", "VARCHAR(64)"),
            ("approved_at", "TIMESTAMP"),
            ("effective_date", "DATE"),
            ("expiry_date", "DATE"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_emergency_plan_supplies",
        &[
            ("plan_id", "UUID"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("specification", "VARCHAR(256)"),
            ("quantity", "INTEGER DEFAULT 0"),
            ("unit", "VARCHAR(32)"),
            ("storage_location", "VARCHAR(256)"),
            ("responsible_person", "VARCHAR(64)"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_emergency_plan_versions",
        &[
            ("plan_id", "UUID"),
            ("version", "VARCHAR(32) NOT NULL"),
            ("change_description", "TEXT"),
            ("changed_by", "VARCHAR(64)"),
            ("changed_at", "TIMESTAMP"),
            ("content", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_emergency_plan_approvals",
        &[
            ("plan_id", "UUID"),
            ("approver", "VARCHAR(64)"),
            ("approver_role", "VARCHAR(64)"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("opinion", "TEXT"),
            ("approved_at", "TIMESTAMP"),
            ("order_num", "INTEGER DEFAULT 0"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_drill_plans",
        &[
            ("plan_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("drill_type", "VARCHAR(64)"),
            ("plan_date", "DATE"),
            ("location", "VARCHAR(256)"),
            ("participants", "INTEGER"),
            ("estimated_duration", "INTEGER"),
            ("content", "TEXT"),
            ("organizer", "VARCHAR(64)"),
            ("status", "VARCHAR(32) DEFAULT 'planned'"),
            ("related_plan_id", "UUID"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_drill_records",
        &[
            ("record_no", "VARCHAR(64) NOT NULL"),
            ("plan_id", "UUID"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("drill_type", "VARCHAR(64)"),
            ("location", "VARCHAR(256)"),
            ("started_at", "TIMESTAMP"),
            ("ended_at", "TIMESTAMP"),
            ("duration", "INTEGER"),
            ("participants", "INTEGER"),
            ("participant_list", "JSONB"),
            ("content", "TEXT"),
            ("actual_content", "TEXT"),
            ("organizer", "VARCHAR(64)"),
            ("recorder", "VARCHAR(64)"),
            ("status", "VARCHAR(32) DEFAULT 'in_progress'"),
            ("attachments", "JSONB"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_drill_evaluations",
        &[
            ("drill_id", "UUID"),
            ("evaluator", "VARCHAR(64)"),
            ("overall_score", "INTEGER"),
            ("overall_comment", "TEXT"),
            ("objectives_met", "BOOLEAN"),
            ("response_time_score", "INTEGER"),
            ("coordination_score", "INTEGER"),
            ("procedure_score", "INTEGER"),
            ("equipment_score", "INTEGER"),
            ("evaluated_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_drill_problems",
        &[
            ("drill_id", "UUID"),
            ("description", "TEXT NOT NULL"),
            ("category", "VARCHAR(64)"),
            ("severity", "VARCHAR(32)"),
            ("responsible_person", "VARCHAR(64)"),
            ("deadline", "DATE"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("rectification_measures", "TEXT"),
            ("rectified_at", "TIMESTAMP"),
            ("verifier", "VARCHAR(64)"),
            ("verified_at", "TIMESTAMP"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_health_exam_plans",
        &[
            ("plan_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("description", "TEXT"),
            ("exam_type", "VARCHAR(64)"),
            ("plan_date", "DATE"),
            ("end_date", "DATE"),
            ("location", "VARCHAR(256)"),
            ("hospital", "VARCHAR(256)"),
            ("participants_count", "INTEGER"),
            ("status", "VARCHAR(32) DEFAULT 'planned'"),
            ("organizer", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_health_exam_records",
        &[
            ("record_no", "VARCHAR(64) NOT NULL"),
            ("plan_id", "UUID"),
            ("employee_id", "VARCHAR(64) NOT NULL"),
            ("employee_name", "VARCHAR(64) NOT NULL"),
            ("department", "VARCHAR(128)"),
            ("position", "VARCHAR(128)"),
            ("exam_type", "VARCHAR(64)"),
            ("exam_date", "DATE"),
            ("hospital", "VARCHAR(256)"),
            ("overall_result", "VARCHAR(32)"),
            ("blood_pressure", "VARCHAR(32)"),
            ("heart_rate", "INTEGER"),
            ("vision", "VARCHAR(64)"),
            ("hearing", "VARCHAR(64)"),
            ("lung_function", "VARCHAR(64)"),
            ("liver_function", "VARCHAR(64)"),
            ("kidney_function", "VARCHAR(64)"),
            ("blood_routine", "VARCHAR(64)"),
            ("urine_routine", "VARCHAR(64)"),
            ("chest_xray", "VARCHAR(64)"),
            ("ecg", "VARCHAR(64)"),
            ("abnormal_items", "JSONB"),
            ("diagnosis", "TEXT"),
            ("doctor_advice", "TEXT"),
            ("doctor", "VARCHAR(64)"),
            ("attachments", "JSONB"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_contraindications",
        &[
            ("employee_id", "VARCHAR(64) NOT NULL"),
            ("employee_name", "VARCHAR(64) NOT NULL"),
            ("department", "VARCHAR(128)"),
            ("position", "VARCHAR(128)"),
            ("contraindication_type", "VARCHAR(64) NOT NULL"),
            ("description", "TEXT"),
            ("diagnosed_at", "DATE"),
            ("hospital", "VARCHAR(256)"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("work_restriction", "TEXT"),
            ("advised_position", "VARCHAR(128)"),
            ("follow_up_date", "DATE"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_health_abnormalities",
        &[
            ("record_id", "UUID"),
            ("employee_id", "VARCHAR(64) NOT NULL"),
            ("employee_name", "VARCHAR(64) NOT NULL"),
            ("item_name", "VARCHAR(128) NOT NULL"),
            ("item_result", "VARCHAR(128)"),
            ("reference_range", "VARCHAR(128)"),
            ("severity", "VARCHAR(32)"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("follow_up_advice", "TEXT"),
            ("follow_up_date", "DATE"),
            ("follow_up_result", "TEXT"),
            ("responsible_person", "VARCHAR(64)"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_hazard_factors",
        &[
            ("factor_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("factor_type", "VARCHAR(64) NOT NULL"),
            ("category", "VARCHAR(64)"),
            ("description", "TEXT"),
            ("hazard_level", "VARCHAR(32)"),
            ("exposure_limit", "VARCHAR(128)"),
            ("unit", "VARCHAR(32)"),
            ("sources", "JSONB"),
            ("affected_positions", "JSONB"),
            ("affected_count", "INTEGER"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_detection_records",
        &[
            ("record_no", "VARCHAR(64) NOT NULL"),
            ("factor_id", "UUID"),
            ("factor_name", "VARCHAR(256) NOT NULL"),
            ("factor_type", "VARCHAR(64)"),
            ("detect_point", "VARCHAR(256) NOT NULL"),
            ("detect_date", "DATE"),
            ("detect_agency", "VARCHAR(256)"),
            ("detect_method", "VARCHAR(128)"),
            ("concentration", "VARCHAR(64)"),
            ("unit", "VARCHAR(32)"),
            ("standard_value", "VARCHAR(64)"),
            ("result", "VARCHAR(32)"),
            ("detector", "VARCHAR(64)"),
            ("status", "VARCHAR(32) DEFAULT 'completed'"),
            ("remarks", "TEXT"),
            ("attachments", "JSONB"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_disease_cases",
        &[
            ("case_no", "VARCHAR(64) NOT NULL"),
            ("employee_id", "VARCHAR(64) NOT NULL"),
            ("employee_name", "VARCHAR(64) NOT NULL"),
            ("department", "VARCHAR(128)"),
            ("position", "VARCHAR(128)"),
            ("disease_type", "VARCHAR(64) NOT NULL"),
            ("disease_name", "VARCHAR(256) NOT NULL"),
            ("severity", "VARCHAR(32)"),
            ("diagnosed_at", "DATE"),
            ("diagnosing_hospital", "VARCHAR(256)"),
            ("diagnosis_basis", "TEXT"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("treatment_plan", "TEXT"),
            ("work_arrangement", "TEXT"),
            ("compensation_status", "VARCHAR(32)"),
            ("outcome", "TEXT"),
            ("closed_at", "TIMESTAMP"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_protection_measures",
        &[
            ("measure_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("measure_type", "VARCHAR(64) NOT NULL"),
            ("description", "TEXT"),
            ("related_factors", "JSONB"),
            ("related_positions", "JSONB"),
            ("implementation_date", "DATE"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("responsible_person", "VARCHAR(64)"),
            ("effectiveness", "VARCHAR(32)"),
            ("inspection_date", "DATE"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_health_trainings",
        &[
            ("training_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("training_type", "VARCHAR(64)"),
            ("content", "TEXT"),
            ("trainer", "VARCHAR(64)"),
            ("training_date", "DATE"),
            ("location", "VARCHAR(256)"),
            ("participants_count", "INTEGER"),
            ("duration_hours", "INTEGER"),
            ("status", "VARCHAR(32) DEFAULT 'completed'"),
            ("pass_rate", "DECIMAL(5,2)"),
            ("attachments", "JSONB"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_hazardous_materials",
        &[
            ("material_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(256) NOT NULL"),
            ("alias", "VARCHAR(256)"),
            ("english_name", "VARCHAR(256)"),
            ("cas_no", "VARCHAR(64)"),
            ("category", "VARCHAR(64) NOT NULL"),
            ("hazard_level", "VARCHAR(32)"),
            ("hazard_class", "JSONB"),
            ("specification", "VARCHAR(256)"),
            ("unit", "VARCHAR(32)"),
            ("packaging", "VARCHAR(128)"),
            ("storage_condition", "TEXT"),
            ("storage_location", "VARCHAR(256)"),
            ("max_stock", "DECIMAL(12,2)"),
            ("min_stock", "DECIMAL(12,2)"),
            ("current_stock", "DECIMAL(12,2)"),
            ("safety_data_sheet", "TEXT"),
            ("emergency_measures", "TEXT"),
            ("supplier", "VARCHAR(256)"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_material_stocks",
        &[
            ("material_id", "UUID"),
            ("material_name", "VARCHAR(256) NOT NULL"),
            ("batch_no", "VARCHAR(64)"),
            ("quantity", "DECIMAL(12,2) NOT NULL DEFAULT 0"),
            ("unit", "VARCHAR(32)"),
            ("storage_location", "VARCHAR(256)"),
            ("received_date", "DATE"),
            ("expiry_date", "DATE"),
            ("supplier", "VARCHAR(256)"),
            ("status", "VARCHAR(32) DEFAULT 'normal'"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_stock_records",
        &[
            ("record_no", "VARCHAR(64) NOT NULL"),
            ("material_id", "UUID"),
            ("material_name", "VARCHAR(256) NOT NULL"),
            ("record_type", "VARCHAR(32) NOT NULL"),
            ("quantity", "DECIMAL(12,2) NOT NULL"),
            ("unit", "VARCHAR(32)"),
            ("batch_no", "VARCHAR(64)"),
            ("related_order", "VARCHAR(64)"),
            ("operator", "VARCHAR(64)"),
            ("operation_time", "TIMESTAMP"),
            ("from_location", "VARCHAR(256)"),
            ("to_location", "VARCHAR(256)"),
            ("recipient", "VARCHAR(64)"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_msds",
        &[
            ("material_id", "UUID"),
            ("material_name", "VARCHAR(256) NOT NULL"),
            ("version", "VARCHAR(32)"),
            ("ingredients", "TEXT"),
            ("hazard_identification", "TEXT"),
            ("first_aid_measures", "TEXT"),
            ("fire_fighting_measures", "TEXT"),
            ("accidental_release_measures", "TEXT"),
            ("handling_and_storage", "TEXT"),
            ("exposure_control", "TEXT"),
            ("physical_chemical_properties", "TEXT"),
            ("stability_reactivity", "TEXT"),
            ("toxicological_info", "TEXT"),
            ("ecological_info", "TEXT"),
            ("disposal_considerations", "TEXT"),
            ("transport_info", "TEXT"),
            ("regulatory_info", "TEXT"),
            ("other_info", "TEXT"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_environmental_regulations",
        &[
            ("reg_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("category", "VARCHAR(64) NOT NULL"),
            ("regulation_type", "VARCHAR(64)"),
            ("issuing_authority", "VARCHAR(256)"),
            ("issued_date", "DATE"),
            ("effective_date", "DATE"),
            ("expiry_date", "DATE"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("content", "TEXT"),
            ("applicability", "TEXT"),
            ("related_files", "JSONB"),
            ("version", "VARCHAR(32)"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_compliance_evaluations",
        &[
            ("eval_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("eval_type", "VARCHAR(64) NOT NULL"),
            ("eval_period", "VARCHAR(128)"),
            ("start_date", "DATE"),
            ("end_date", "DATE"),
            ("evaluator", "VARCHAR(64)"),
            ("status", "VARCHAR(32) DEFAULT 'in_progress'"),
            ("overall_result", "VARCHAR(32)"),
            ("compliance_rate", "DECIMAL(5,2)"),
            ("findings", "TEXT"),
            ("improvements", "TEXT"),
            ("evaluated_at", "TIMESTAMP"),
            ("attachments", "JSONB"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_compliance_items",
        &[
            ("evaluation_id", "UUID"),
            ("regulation_id", "UUID"),
            ("regulation_title", "VARCHAR(256)"),
            ("item_description", "TEXT"),
            ("compliance_status", "VARCHAR(32) NOT NULL"),
            ("evidence", "TEXT"),
            ("issues", "TEXT"),
            ("corrective_action", "TEXT"),
            ("responsible_person", "VARCHAR(64)"),
            ("deadline", "DATE"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_env_monitor_records",
        &[
            ("record_no", "VARCHAR(64) NOT NULL"),
            ("monitor_type", "VARCHAR(64) NOT NULL"),
            ("monitor_point", "VARCHAR(256) NOT NULL"),
            ("monitor_date", "DATE"),
            ("monitor_agency", "VARCHAR(256)"),
            ("monitor_method", "VARCHAR(128)"),
            ("pollutant", "VARCHAR(128)"),
            ("concentration", "VARCHAR(64)"),
            ("unit", "VARCHAR(32)"),
            ("standard_value", "VARCHAR(64)"),
            ("standard_type", "VARCHAR(64)"),
            ("result", "VARCHAR(32)"),
            ("flow_rate", "VARCHAR(64)"),
            ("emission_rate", "VARCHAR(64)"),
            ("status", "VARCHAR(32) DEFAULT 'completed'"),
            ("remarks", "TEXT"),
            ("attachments", "JSONB"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_discharge_permits",
        &[
            ("permit_no", "VARCHAR(64) NOT NULL"),
            ("permit_type", "VARCHAR(64) NOT NULL"),
            ("permit_name", "VARCHAR(256)"),
            ("issuing_authority", "VARCHAR(256)"),
            ("issued_date", "DATE"),
            ("valid_from", "DATE"),
            ("valid_to", "DATE"),
            ("status", "VARCHAR(32) DEFAULT 'valid'"),
            ("pollutant_list", "JSONB"),
            ("discharge_standard", "VARCHAR(256)"),
            ("total_amount_limit", "TEXT"),
            ("discharge_location", "VARCHAR(256)"),
            ("holder", "VARCHAR(256)"),
            ("attachments", "JSONB"),
            ("remarks", "TEXT"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_environment_incidents",
        &[
            ("incident_no", "VARCHAR(64) NOT NULL"),
            ("title", "VARCHAR(256) NOT NULL"),
            ("incident_type", "VARCHAR(64) NOT NULL"),
            ("level", "VARCHAR(32)"),
            ("location", "VARCHAR(256)"),
            ("occurred_at", "TIMESTAMP"),
            ("reported_by", "VARCHAR(64)"),
            ("reported_at", "TIMESTAMP"),
            ("description", "TEXT"),
            ("cause", "TEXT"),
            ("impact", "TEXT"),
            ("immediate_measures", "TEXT"),
            ("status", "VARCHAR(32) DEFAULT 'reported'"),
            ("responsible_person", "VARCHAR(64)"),
            ("investigation_result", "TEXT"),
            ("corrective_actions", "TEXT"),
            ("preventive_measures", "TEXT"),
            ("closed_at", "TIMESTAMP"),
            ("attachments", "JSONB"),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
    (
        "qa_ehs_employees",
        &[
            ("employee_no", "VARCHAR(64)"),
            ("name", "VARCHAR(128) NOT NULL"),
            ("email", "VARCHAR(256)"),
            ("department_id", "UUID"),
            ("department_name", "VARCHAR(128)"),
            ("position", "VARCHAR(128)"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            (
                "tenant_id",
                "UUID DEFAULT '00000000-0000-0000-0000-000000000000'",
            ),
            ("created_at", "TIMESTAMP DEFAULT NOW()"),
            ("updated_at", "TIMESTAMP DEFAULT NOW()"),
        ],
    ),
];

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
    let rows: Vec<(String,)> = sqlx::query_as(only_own_schema_query!(
        "public",
        r#"
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        "#
    ))
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
            "[ehs schema 自检] {}.{} 仍缺失 {} 列: {:?}",
            schema,
            table,
            missing.len(),
            missing
        );
    }
    Ok(())
}

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_risks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            risk_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            risk_type VARCHAR(64),
            hazard_factor VARCHAR(128),
            likelihood INTEGER,
            severity INTEGER,
            risk_level VARCHAR(32),
            control_measures TEXT,
            status VARCHAR(32) DEFAULT 'identified',
            assessed_by VARCHAR(64),
            assessed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_inspection_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            inspection_type VARCHAR(64),
            frequency VARCHAR(32),
            start_date DATE,
            end_date DATE,
            inspector VARCHAR(64),
            status VARCHAR(32) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_inspection_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id UUID REFERENCES qa_ehs_inspection_plans(id),
            item_no VARCHAR(64) NOT NULL,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            category VARCHAR(64),
            standard TEXT,
            order_num INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_inspection_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            plan_id UUID REFERENCES qa_ehs_inspection_plans(id),
            title VARCHAR(256) NOT NULL,
            inspection_type VARCHAR(64),
            location VARCHAR(128),
            inspector VARCHAR(64),
            inspected_at TIMESTAMP,
            result VARCHAR(32),
            issues JSONB,
            attachments JSONB,
            status VARCHAR(32) DEFAULT 'in_progress',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_inspection_record_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_id UUID REFERENCES qa_ehs_inspection_records(id),
            item_id UUID REFERENCES qa_ehs_inspection_items(id),
            item_title VARCHAR(256) NOT NULL,
            item_category VARCHAR(64),
            result VARCHAR(32),
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_hazards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            hazard_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            category VARCHAR(64),
            level VARCHAR(32),
            source VARCHAR(64),
            location VARCHAR(128),
            reported_by VARCHAR(64),
            reported_at TIMESTAMP,
            status VARCHAR(32) DEFAULT 'reported',
            inspection_id UUID REFERENCES qa_ehs_inspection_records(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_hazard_rectifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            hazard_id UUID REFERENCES qa_ehs_hazards(id),
            description TEXT,
            responsible VARCHAR(64),
            deadline DATE,
            status VARCHAR(32) DEFAULT 'in_progress',
            progress INTEGER DEFAULT 0,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_hazard_verifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            hazard_id UUID REFERENCES qa_ehs_hazards(id),
            verifier VARCHAR(64),
            result VARCHAR(32),
            remarks TEXT,
            verified_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_accidents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            accident_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            accident_type VARCHAR(64),
            severity VARCHAR(32),
            location VARCHAR(128),
            occurred_at TIMESTAMP,
            casualties INTEGER,
            economic_loss DECIMAL(12,2),
            status VARCHAR(32) DEFAULT 'reported',
            reported_by VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_accident_investigations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            accident_id UUID REFERENCES qa_ehs_accidents(id),
            team JSONB,
            findings TEXT,
            root_cause TEXT,
            timeline JSONB,
            status VARCHAR(32) DEFAULT 'in_progress',
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_accident_treatments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            accident_id UUID REFERENCES qa_ehs_accidents(id),
            actions JSONB,
            responsible VARCHAR(64),
            status VARCHAR(32) DEFAULT 'in_progress',
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_accident_reviews (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            accident_id UUID REFERENCES qa_ehs_accidents(id),
            summary TEXT,
            lessons_learned JSONB,
            recommendations JSONB,
            reviewer VARCHAR(64),
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_environment (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            monitor_type VARCHAR(64),
            monitor_point VARCHAR(128),
            data JSONB,
            status VARCHAR(32) DEFAULT 'normal',
            monitored_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_trainings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            training_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            content TEXT,
            trainer VARCHAR(64),
            training_type VARCHAR(64),
            duration_hours INTEGER,
            scheduled_at TIMESTAMP,
            status VARCHAR(32) DEFAULT 'scheduled',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_risks_no ON qa_ehs_risks(risk_no)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_accidents_no ON qa_ehs_accidents(accident_no)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_plans_no ON qa_ehs_inspection_plans(plan_no)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_records_no ON qa_ehs_inspection_records(record_no)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_no ON qa_ehs_hazards(hazard_no)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazards_status ON qa_ehs_hazards(status)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_accidents_status ON qa_ehs_accidents(status)"
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_sync_records (
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
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_no ON qa_ehs_sync_records(sync_no)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_type ON qa_ehs_sync_records(sync_type)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_sync_status ON qa_ehs_sync_records(status)"
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_emergency_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            category VARCHAR(64),
            version VARCHAR(32),
            status VARCHAR(32) DEFAULT 'draft',
            scope TEXT,
            emergency_level VARCHAR(32),
            responsible_dept VARCHAR(128),
            responsible_person VARCHAR(64),
            contact_phone TEXT,
            content TEXT,
            created_by VARCHAR(64),
            approved_by VARCHAR(64),
            approved_at TIMESTAMP,
            effective_date DATE,
            expiry_date DATE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plans_no ON qa_ehs_emergency_plans(plan_no)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plans_category ON qa_ehs_emergency_plans(category)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_emergency_plans_status ON qa_ehs_emergency_plans(status)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_emergency_plan_supplies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id UUID REFERENCES qa_ehs_emergency_plans(id),
            name VARCHAR(256) NOT NULL,
            specification VARCHAR(256),
            quantity INTEGER DEFAULT 0,
            unit VARCHAR(32),
            storage_location VARCHAR(256),
            responsible_person VARCHAR(64),
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_emergency_plan_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id UUID REFERENCES qa_ehs_emergency_plans(id),
            version VARCHAR(32) NOT NULL,
            change_description TEXT,
            changed_by VARCHAR(64),
            changed_at TIMESTAMP,
            content TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_emergency_plan_approvals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_id UUID REFERENCES qa_ehs_emergency_plans(id),
            approver VARCHAR(64),
            approver_role VARCHAR(64),
            status VARCHAR(32) DEFAULT 'pending',
            opinion TEXT,
            approved_at TIMESTAMP,
            order_num INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_drill_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            drill_type VARCHAR(64),
            plan_date DATE,
            location VARCHAR(256),
            participants INTEGER,
            estimated_duration INTEGER,
            content TEXT,
            organizer VARCHAR(64),
            status VARCHAR(32) DEFAULT 'planned',
            related_plan_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_plans_no ON qa_ehs_drill_plans(plan_no)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_plans_status ON qa_ehs_drill_plans(status)"
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_drill_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            plan_id UUID REFERENCES qa_ehs_drill_plans(id),
            title VARCHAR(256) NOT NULL,
            drill_type VARCHAR(64),
            location VARCHAR(256),
            started_at TIMESTAMP,
            ended_at TIMESTAMP,
            duration INTEGER,
            participants INTEGER,
            participant_list JSONB,
            content TEXT,
            actual_content TEXT,
            organizer VARCHAR(64),
            recorder VARCHAR(64),
            status VARCHAR(32) DEFAULT 'in_progress',
            attachments JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_no ON qa_ehs_drill_records(record_no)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_drill_records_status ON qa_ehs_drill_records(status)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_drill_evaluations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            drill_id UUID REFERENCES qa_ehs_drill_records(id),
            evaluator VARCHAR(64),
            overall_score INTEGER,
            overall_comment TEXT,
            objectives_met BOOLEAN,
            response_time_score INTEGER,
            coordination_score INTEGER,
            procedure_score INTEGER,
            equipment_score INTEGER,
            evaluated_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_drill_problems (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            drill_id UUID REFERENCES qa_ehs_drill_records(id),
            description TEXT NOT NULL,
            category VARCHAR(64),
            severity VARCHAR(32),
            responsible_person VARCHAR(64),
            deadline DATE,
            status VARCHAR(32) DEFAULT 'pending',
            rectification_measures TEXT,
            rectified_at TIMESTAMP,
            verifier VARCHAR(64),
            verified_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_health_exam_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            plan_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            description TEXT,
            exam_type VARCHAR(64),
            plan_date DATE,
            end_date DATE,
            location VARCHAR(256),
            hospital VARCHAR(256),
            participants_count INTEGER,
            status VARCHAR(32) DEFAULT 'planned',
            organizer VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_plans_no ON qa_ehs_health_exam_plans(plan_no)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_plans_status ON qa_ehs_health_exam_plans(status)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_health_exam_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            plan_id UUID REFERENCES qa_ehs_health_exam_plans(id),
            employee_id VARCHAR(64) NOT NULL,
            employee_name VARCHAR(64) NOT NULL,
            department VARCHAR(128),
            position VARCHAR(128),
            exam_type VARCHAR(64),
            exam_date DATE,
            hospital VARCHAR(256),
            overall_result VARCHAR(32),
            blood_pressure VARCHAR(32),
            heart_rate INTEGER,
            vision VARCHAR(64),
            hearing VARCHAR(64),
            lung_function VARCHAR(64),
            liver_function VARCHAR(64),
            kidney_function VARCHAR(64),
            blood_routine VARCHAR(64),
            urine_routine VARCHAR(64),
            chest_xray VARCHAR(64),
            ecg VARCHAR(64),
            abnormal_items JSONB,
            diagnosis TEXT,
            doctor_advice TEXT,
            doctor VARCHAR(64),
            attachments JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_no ON qa_ehs_health_exam_records(record_no)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_health_exam_records_employee ON qa_ehs_health_exam_records(employee_id)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_contraindications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            employee_id VARCHAR(64) NOT NULL,
            employee_name VARCHAR(64) NOT NULL,
            department VARCHAR(128),
            position VARCHAR(128),
            contraindication_type VARCHAR(64) NOT NULL,
            description TEXT,
            diagnosed_at DATE,
            hospital VARCHAR(256),
            status VARCHAR(32) DEFAULT 'active',
            work_restriction TEXT,
            advised_position VARCHAR(128),
            follow_up_date DATE,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_contraindications_employee ON qa_ehs_contraindications(employee_id)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_health_abnormalities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_id UUID REFERENCES qa_ehs_health_exam_records(id),
            employee_id VARCHAR(64) NOT NULL,
            employee_name VARCHAR(64) NOT NULL,
            item_name VARCHAR(128) NOT NULL,
            item_result VARCHAR(128),
            reference_range VARCHAR(128),
            severity VARCHAR(32),
            status VARCHAR(32) DEFAULT 'pending',
            follow_up_advice TEXT,
            follow_up_date DATE,
            follow_up_result TEXT,
            responsible_person VARCHAR(64),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_hazard_factors (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            factor_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            factor_type VARCHAR(64) NOT NULL,
            category VARCHAR(64),
            description TEXT,
            hazard_level VARCHAR(32),
            exposure_limit VARCHAR(128),
            unit VARCHAR(32),
            sources JSONB,
            affected_positions JSONB,
            affected_count INTEGER,
            status VARCHAR(32) DEFAULT 'active',
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_factors_no ON qa_ehs_hazard_factors(factor_no)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazard_factors_type ON qa_ehs_hazard_factors(factor_type)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_detection_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            factor_id UUID REFERENCES qa_ehs_hazard_factors(id),
            factor_name VARCHAR(256) NOT NULL,
            factor_type VARCHAR(64),
            detect_point VARCHAR(256) NOT NULL,
            detect_date DATE,
            detect_agency VARCHAR(256),
            detect_method VARCHAR(128),
            concentration VARCHAR(64),
            unit VARCHAR(32),
            standard_value VARCHAR(64),
            result VARCHAR(32),
            detector VARCHAR(64),
            status VARCHAR(32) DEFAULT 'completed',
            remarks TEXT,
            attachments JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_detection_records_no ON qa_ehs_detection_records(record_no)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_disease_cases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            case_no VARCHAR(64) NOT NULL UNIQUE,
            employee_id VARCHAR(64) NOT NULL,
            employee_name VARCHAR(64) NOT NULL,
            department VARCHAR(128),
            position VARCHAR(128),
            disease_type VARCHAR(64) NOT NULL,
            disease_name VARCHAR(256) NOT NULL,
            severity VARCHAR(32),
            diagnosed_at DATE,
            diagnosing_hospital VARCHAR(256),
            diagnosis_basis TEXT,
            status VARCHAR(32) DEFAULT 'active',
            treatment_plan TEXT,
            work_arrangement TEXT,
            compensation_status VARCHAR(32),
            outcome TEXT,
            closed_at TIMESTAMP,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_disease_cases_no ON qa_ehs_disease_cases(case_no)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_disease_cases_status ON qa_ehs_disease_cases(status)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_protection_measures (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            measure_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            measure_type VARCHAR(64) NOT NULL,
            description TEXT,
            related_factors JSONB,
            related_positions JSONB,
            implementation_date DATE,
            status VARCHAR(32) DEFAULT 'active',
            responsible_person VARCHAR(64),
            effectiveness VARCHAR(32),
            inspection_date DATE,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_health_trainings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            training_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            training_type VARCHAR(64),
            content TEXT,
            trainer VARCHAR(64),
            training_date DATE,
            location VARCHAR(256),
            participants_count INTEGER,
            duration_hours INTEGER,
            status VARCHAR(32) DEFAULT 'completed',
            pass_rate DECIMAL(5,2),
            attachments JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_hazardous_materials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            material_no VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(256) NOT NULL,
            alias VARCHAR(256),
            english_name VARCHAR(256),
            cas_no VARCHAR(64),
            category VARCHAR(64) NOT NULL,
            hazard_level VARCHAR(32),
            hazard_class JSONB,
            specification VARCHAR(256),
            unit VARCHAR(32),
            packaging VARCHAR(128),
            storage_condition TEXT,
            storage_location VARCHAR(256),
            max_stock DECIMAL(12,2),
            min_stock DECIMAL(12,2),
            current_stock DECIMAL(12,2),
            safety_data_sheet TEXT,
            emergency_measures TEXT,
            supplier VARCHAR(256),
            status VARCHAR(32) DEFAULT 'active',
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazardous_materials_no ON qa_ehs_hazardous_materials(material_no)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazardous_materials_category ON qa_ehs_hazardous_materials(category)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_hazardous_materials_status ON qa_ehs_hazardous_materials(status)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_material_stocks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            material_id UUID REFERENCES qa_ehs_hazardous_materials(id),
            material_name VARCHAR(256) NOT NULL,
            batch_no VARCHAR(64),
            quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
            unit VARCHAR(32),
            storage_location VARCHAR(256),
            received_date DATE,
            expiry_date DATE,
            supplier VARCHAR(256),
            status VARCHAR(32) DEFAULT 'normal',
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_stock_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            material_id UUID REFERENCES qa_ehs_hazardous_materials(id),
            material_name VARCHAR(256) NOT NULL,
            record_type VARCHAR(32) NOT NULL,
            quantity DECIMAL(12,2) NOT NULL,
            unit VARCHAR(32),
            batch_no VARCHAR(64),
            related_order VARCHAR(64),
            operator VARCHAR(64),
            operation_time TIMESTAMP,
            from_location VARCHAR(256),
            to_location VARCHAR(256),
            recipient VARCHAR(64),
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_no ON qa_ehs_stock_records(record_no)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_stock_records_type ON qa_ehs_stock_records(record_type)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_msds (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            material_id UUID REFERENCES qa_ehs_hazardous_materials(id),
            material_name VARCHAR(256) NOT NULL,
            version VARCHAR(32),
            ingredients TEXT,
            hazard_identification TEXT,
            first_aid_measures TEXT,
            fire_fighting_measures TEXT,
            accidental_release_measures TEXT,
            handling_and_storage TEXT,
            exposure_control TEXT,
            physical_chemical_properties TEXT,
            stability_reactivity TEXT,
            toxicological_info TEXT,
            ecological_info TEXT,
            disposal_considerations TEXT,
            transport_info TEXT,
            regulatory_info TEXT,
            other_info TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_environmental_regulations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reg_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            category VARCHAR(64) NOT NULL,
            regulation_type VARCHAR(64),
            issuing_authority VARCHAR(256),
            issued_date DATE,
            effective_date DATE,
            expiry_date DATE,
            status VARCHAR(32) DEFAULT 'active',
            content TEXT,
            applicability TEXT,
            related_files JSONB,
            version VARCHAR(32),
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_regulations_no ON qa_ehs_environmental_regulations(reg_no)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_regulations_category ON qa_ehs_environmental_regulations(category)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_regulations_status ON qa_ehs_environmental_regulations(status)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_compliance_evaluations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            eval_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            eval_type VARCHAR(64) NOT NULL,
            eval_period VARCHAR(128),
            start_date DATE,
            end_date DATE,
            evaluator VARCHAR(64),
            status VARCHAR(32) DEFAULT 'in_progress',
            overall_result VARCHAR(32),
            compliance_rate DECIMAL(5,2),
            findings TEXT,
            improvements TEXT,
            evaluated_at TIMESTAMP,
            attachments JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_evals_no ON qa_ehs_compliance_evaluations(eval_no)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_compliance_evals_status ON qa_ehs_compliance_evaluations(status)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_compliance_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            evaluation_id UUID REFERENCES qa_ehs_compliance_evaluations(id),
            regulation_id UUID REFERENCES qa_ehs_environmental_regulations(id),
            regulation_title VARCHAR(256),
            item_description TEXT,
            compliance_status VARCHAR(32) NOT NULL,
            evidence TEXT,
            issues TEXT,
            corrective_action TEXT,
            responsible_person VARCHAR(64),
            deadline DATE,
            status VARCHAR(32) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_env_monitor_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            record_no VARCHAR(64) NOT NULL UNIQUE,
            monitor_type VARCHAR(64) NOT NULL,
            monitor_point VARCHAR(256) NOT NULL,
            monitor_date DATE,
            monitor_agency VARCHAR(256),
            monitor_method VARCHAR(128),
            pollutant VARCHAR(128),
            concentration VARCHAR(64),
            unit VARCHAR(32),
            standard_value VARCHAR(64),
            standard_type VARCHAR(64),
            result VARCHAR(32),
            flow_rate VARCHAR(64),
            emission_rate VARCHAR(64),
            status VARCHAR(32) DEFAULT 'completed',
            remarks TEXT,
            attachments JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_monitor_no ON qa_ehs_env_monitor_records(record_no)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_monitor_type ON qa_ehs_env_monitor_records(monitor_type)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_discharge_permits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            permit_no VARCHAR(64) NOT NULL UNIQUE,
            permit_type VARCHAR(64) NOT NULL,
            permit_name VARCHAR(256),
            issuing_authority VARCHAR(256),
            issued_date DATE,
            valid_from DATE,
            valid_to DATE,
            status VARCHAR(32) DEFAULT 'valid',
            pollutant_list JSONB,
            discharge_standard VARCHAR(256),
            total_amount_limit TEXT,
            discharge_location VARCHAR(256),
            holder VARCHAR(256),
            attachments JSONB,
            remarks TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_discharge_permits_no ON qa_ehs_discharge_permits(permit_no)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_discharge_permits_status ON qa_ehs_discharge_permits(status)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_environment_incidents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            incident_no VARCHAR(64) NOT NULL UNIQUE,
            title VARCHAR(256) NOT NULL,
            incident_type VARCHAR(64) NOT NULL,
            level VARCHAR(32),
            location VARCHAR(256),
            occurred_at TIMESTAMP,
            reported_by VARCHAR(64),
            reported_at TIMESTAMP,
            description TEXT,
            cause TEXT,
            impact TEXT,
            immediate_measures TEXT,
            status VARCHAR(32) DEFAULT 'reported',
            responsible_person VARCHAR(64),
            investigation_result TEXT,
            corrective_actions TEXT,
            preventive_measures TEXT,
            closed_at TIMESTAMP,
            attachments JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_incidents_no ON qa_ehs_environment_incidents(incident_no)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("public", "CREATE INDEX IF NOT EXISTS idx_qa_ehs_env_incidents_status ON qa_ehs_environment_incidents(status)"))
        .execute(pool)
        .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        r#"
        CREATE TABLE IF NOT EXISTS qa_ehs_employees (
            id UUID PRIMARY KEY,
            employee_no VARCHAR(64),
            name VARCHAR(128) NOT NULL,
            email TEXT,
            department_id UUID,
            department_name VARCHAR(128),
            position VARCHAR(128),
            status VARCHAR(32) DEFAULT 'active',
            tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_employees_name ON qa_ehs_employees(name)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "public",
        "CREATE INDEX IF NOT EXISTS idx_qa_ehs_employees_dept ON qa_ehs_employees(department_id)"
    ))
    .execute(pool)
    .await?;

    // =====================================================================
    // 阶段1：增量迁移 —— 基于 TABLE_DEFS 逐列 ADD COLUMN IF NOT EXISTS
    // =====================================================================
    let mut tables_done = 0usize;
    let mut cols_added = 0usize;
    for (tbl, cols_arr) in TABLE_DEFS {
        let n = ensure_table_columns(pool, Some(SERVICE_SCHEMA), tbl, cols_arr).await?;
        tables_done += 1;
        cols_added += n;
    }
    tracing::info!(
        "[ehs 增量迁移] 完成 {} 张表 / {} 列 ADD COLUMN IF NOT EXISTS 检查",
        tables_done,
        cols_added
    );

    // =====================================================================
    // 阶段2：schema 一致性自检 —— 对照 TABLE_DEFS + id 列与实际库对比
    // =====================================================================
    let mut verified = 0usize;
    for (tbl, cols_arr) in TABLE_DEFS {
        let mut expected = vec!["id"];
        expected.extend(cols_arr.iter().map(|(c, _)| *c));
        verify_table_columns(pool, SERVICE_SCHEMA, tbl, &expected).await?;
        verified += 1;
    }
    tracing::info!(
        "[ehs schema 自检] 完成 {} 张表结构一致性校验（缺失列会单独 WARN）",
        verified
    );

    Ok(())
}
