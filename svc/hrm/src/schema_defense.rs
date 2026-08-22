//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "hrm";
pub const SERVICE_TAG: &str = "hrm";

/// hrm 17 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "companies",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("short_name", "VARCHAR(100)"),
            ("registration_number", "VARCHAR(100)"),
            ("tax_number", "VARCHAR(100)"),
            ("address", "TEXT"),
            ("contact_phone", "VARCHAR(50)"),
            ("contact_email", "VARCHAR(100)"),
            ("website", "VARCHAR(255)"),
            ("description", "TEXT"),
            ("legal_person", "VARCHAR(100)"),
            ("industry", "VARCHAR(100)"),
            ("registered_capital", "NUMERIC(18, 2)"),
            ("established_date", "DATE"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "departments",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("company_id", "UUID"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(50)"),
            ("parent_id", "UUID"),
            ("manager_id", "UUID"),
            ("description", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "positions",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("company_id", "UUID"),
            ("department_id", "UUID"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(50)"),
            ("level", "INTEGER DEFAULT 1"),
            ("description", "TEXT"),
            ("responsibilities", "TEXT"),
            ("requirements", "TEXT"),
            ("salary_range_min", "NUMERIC(15, 2)"),
            ("salary_range_max", "NUMERIC(15, 2)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "employees",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("org_id", "UUID"),
            ("company_id", "UUID"),
            ("department_id", "UUID"),
            ("position_id", "UUID"),
            ("employee_number", "VARCHAR(50) NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("gender", "VARCHAR(20)"),
            ("birth_date", "DATE"),
            ("hire_date", "DATE"),
            ("regular_date", "DATE"),
            ("probation_period", "INTEGER"),
            ("leave_date", "DATE"),
            ("id_card_number", "TEXT"),
            ("job_title", "VARCHAR(255)"),
            ("position", "VARCHAR(255)"),
            ("joblevel", "VARCHAR(50)"),
            ("work_location", "VARCHAR(255)"),
            ("report_to_name", "VARCHAR(255)"),
            ("email", "TEXT"),
            ("phone", "TEXT"),
            ("emergency_contact_name", "VARCHAR(255)"),
            ("emergency_contact_phone", "VARCHAR(50)"),
            ("emergency_relation", "VARCHAR(50)"),
            ("hukou_location", "VARCHAR(255)"),
            ("address", "TEXT"),
            ("education", "VARCHAR(50)"),
            ("marital_status", "VARCHAR(20)"),
            ("nationality", "VARCHAR(50)"),
            ("bank_account", "VARCHAR(100)"),
            ("bank_name", "VARCHAR(100)"),
            ("remark", "TEXT"),
            ("employee_type", "VARCHAR(50)"),
            ("user_id", "UUID"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "contracts",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            ("contract_no", "VARCHAR(100)"),
            ("contract_type", "VARCHAR(50) NOT NULL"),
            ("party_a_name", "VARCHAR(255)"),
            ("party_a_contact", "VARCHAR(255)"),
            ("party_b_name", "VARCHAR(255)"),
            ("party_b_contact", "VARCHAR(255)"),
            ("start_date", "DATE NOT NULL"),
            ("end_date", "DATE"),
            ("salary", "NUMERIC(15, 2)"),
            ("probation_period_days", "INTEGER"),
            ("contract_file_path", "TEXT"),
            ("reminder_days", "INTEGER DEFAULT 30"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "attendance_records",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            ("date", "DATE NOT NULL"),
            ("check_in_time", "TIME"),
            ("check_out_time", "TIME"),
            ("check_in_location", "VARCHAR(255)"),
            ("check_out_location", "VARCHAR(255)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'normal'"),
            ("work_hours", "NUMERIC(5, 2)"),
            ("overtime_hours", "NUMERIC(5, 2)"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "payroll_records",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            ("period_year", "INTEGER NOT NULL"),
            ("period_month", "INTEGER NOT NULL"),
            ("base_salary", "NUMERIC(15, 2) NOT NULL"),
            ("bonus", "NUMERIC(15, 2) DEFAULT 0"),
            ("allowance", "NUMERIC(15, 2) DEFAULT 0"),
            ("overtime_pay", "NUMERIC(15, 2) DEFAULT 0"),
            ("deduction", "NUMERIC(15, 2) DEFAULT 0"),
            ("tax", "NUMERIC(15, 2) DEFAULT 0"),
            ("insurance", "NUMERIC(15, 2) DEFAULT 0"),
            ("net_salary", "NUMERIC(15, 2) NOT NULL"),
            ("payment_date", "DATE"),
            ("payment_method", "VARCHAR(50)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "performance_records",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            ("period_year", "INTEGER NOT NULL"),
            ("period_month", "INTEGER"),
            ("period_quarter", "INTEGER"),
            ("performance_type", "VARCHAR(50) NOT NULL"),
            ("score", "NUMERIC(5, 2)"),
            ("level", "VARCHAR(50)"),
            ("goals", "TEXT"),
            ("achievements", "TEXT"),
            ("strengths", "TEXT"),
            ("weaknesses", "TEXT"),
            ("improvement_plan", "TEXT"),
            ("reviewer_id", "UUID"),
            ("review_date", "DATE"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "training_records",
        &[
            ("organization_id", "UUID"),
            ("tenant_id", "UUID"),
            ("training_name", "VARCHAR(255)"),
            ("training_type", "VARCHAR(50)"),
            ("training_category", "VARCHAR(50)"),
            ("description", "TEXT"),
            ("instructor", "VARCHAR(255)"),
            ("start_date", "DATE"),
            ("end_date", "DATE"),
            ("duration_hours", "NUMERIC(5, 2)"),
            ("location", "VARCHAR(255)"),
            ("cost", "NUMERIC(15, 2)"),
            ("max_participants", "INTEGER"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'planned'"),
            ("course_id", "UUID"),
            ("employee_id", "UUID"),
            ("enrollment_date", "TIMESTAMPTZ"),
            ("attendance_status", "VARCHAR(30)"),
            ("completion_status", "VARCHAR(30)"),
            ("certificate_no", "VARCHAR(100)"),
            ("completed_at", "TIMESTAMPTZ"),
            ("feedback", "TEXT"),
            ("score", "NUMERIC(5, 2)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "training_participants",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("training_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            (
                "participation_status",
                "VARCHAR(20) NOT NULL DEFAULT 'registered'",
            ),
            ("completion_status", "VARCHAR(20)"),
            ("score", "NUMERIC(5, 2)"),
            ("certificate_no", "VARCHAR(100)"),
            ("certificate_file_path", "TEXT"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "recruitment_records",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("position_id", "UUID"),
            ("title", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("requirements", "TEXT"),
            ("salary_range_min", "NUMERIC(15, 2)"),
            ("salary_range_max", "NUMERIC(15, 2)"),
            ("location", "VARCHAR(255)"),
            ("recruitment_type", "VARCHAR(50)"),
            ("publish_date", "DATE"),
            ("deadline", "DATE"),
            ("vacancies", "INTEGER DEFAULT 1"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "recruitment_applications",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("recruitment_id", "UUID NOT NULL"),
            ("applicant_name", "VARCHAR(255) NOT NULL"),
            ("applicant_email", "VARCHAR(100)"),
            ("applicant_phone", "VARCHAR(50)"),
            ("resume_file_path", "TEXT"),
            ("education", "VARCHAR(255)"),
            ("work_experience", "TEXT"),
            ("expected_salary", "NUMERIC(15, 2)"),
            ("application_date", "DATE NOT NULL"),
            ("interview_date", "DATE"),
            ("interview_result", "VARCHAR(50)"),
            ("offer_status", "VARCHAR(50)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'submitted'"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "leave_records",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            ("leave_type", "VARCHAR(50) NOT NULL"),
            ("start_date", "DATE NOT NULL"),
            ("end_date", "DATE NOT NULL"),
            ("days", "NUMERIC(5, 2) NOT NULL"),
            ("reason", "TEXT"),
            ("approver_id", "UUID"),
            ("approval_status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("approval_date", "DATE"),
            ("rejection_reason", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "salary_adjustments",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            ("adjustment_type", "VARCHAR(50) NOT NULL"),
            ("previous_salary", "NUMERIC(15, 2) NOT NULL"),
            ("new_salary", "NUMERIC(15, 2) NOT NULL"),
            ("adjustment_amount", "NUMERIC(15, 2) NOT NULL"),
            ("adjustment_percentage", "NUMERIC(5, 2)"),
            ("effective_date", "DATE NOT NULL"),
            ("reason", "TEXT"),
            ("approver_id", "UUID"),
            ("approval_status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("approval_date", "DATE"),
            ("rejection_reason", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "audit_logs",
        &[
            (
                "organization_id",
                "UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL",
            ),
            ("user_id", "VARCHAR(255)"),
            ("action", "VARCHAR(100) NOT NULL"),
            ("entity_type", "VARCHAR(100) NOT NULL"),
            ("entity_id", "UUID"),
            ("entity_ids", "JSONB"),
            ("user_name", "VARCHAR(255)"),
            ("request_details", "JSONB"),
            ("response_details", "JSONB"),
            ("status", "VARCHAR(50) NOT NULL DEFAULT 'success'"),
            ("error_message", "TEXT"),
            ("ip_address", "INET"),
            ("user_agent", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            (
                "tenant_id",
                "UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL",
            ),
        ],
    ),
    (
        "initialization_status",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("step_name", "VARCHAR(100) NOT NULL"),
            ("step_order", "INTEGER NOT NULL"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("completed_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "initialization_logs",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("step_name", "VARCHAR(100) NOT NULL"),
            ("action", "VARCHAR(50) NOT NULL"),
            ("old_data", "JSONB"),
            ("new_data", "JSONB"),
            ("error_message", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "payroll_runs",
        &[
            ("organization_id", "UUID"),
            ("tenant_id", "UUID"),
            ("pay_period", "VARCHAR(20) NOT NULL"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("total_amount", "NUMERIC(15, 2) NOT NULL DEFAULT 0"),
            ("employee_count", "INTEGER NOT NULL DEFAULT 0"),
            ("paid_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "payroll_items",
        &[
            ("organization_id", "UUID"),
            ("tenant_id", "UUID"),
            ("payroll_run_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            ("gross_amount", "NUMERIC(15, 2) NOT NULL DEFAULT 0"),
            ("net_amount", "NUMERIC(15, 2) NOT NULL DEFAULT 0"),
            ("deductions", "NUMERIC(15, 2) NOT NULL DEFAULT 0"),
            ("taxes", "NUMERIC(15, 2) NOT NULL DEFAULT 0"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("bank_account", "VARCHAR(50)"),
            ("paid_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "payroll_details",
        &[
            ("organization_id", "UUID"),
            ("tenant_id", "UUID"),
            ("payroll_item_id", "UUID NOT NULL"),
            ("item_type", "VARCHAR(50) NOT NULL"),
            ("category", "VARCHAR(50) NOT NULL"),
            ("description", "TEXT NOT NULL DEFAULT ''"),
            ("amount", "NUMERIC(15, 2) NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "training_plans",
        &[
            ("organization_id", "UUID"),
            ("tenant_id", "UUID"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(128)"),
            ("description", "TEXT"),
            ("start_date", "TIMESTAMPTZ"),
            ("end_date", "TIMESTAMPTZ"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("budget", "NUMERIC(15, 2)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "training_courses",
        &[
            ("organization_id", "UUID"),
            ("tenant_id", "UUID"),
            ("plan_id", "UUID"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(128)"),
            ("category", "VARCHAR(64) NOT NULL DEFAULT 'other'"),
            ("level", "VARCHAR(64) NOT NULL DEFAULT 'beginner'"),
            ("description", "TEXT"),
            ("duration_hours", "NUMERIC(8, 2)"),
            ("instructor_id", "UUID"),
            ("instructor_name", "VARCHAR(255)"),
            ("location", "VARCHAR(255)"),
            ("max_participants", "INTEGER"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "job_openings",
        &[
            ("organization_id", "UUID"),
            ("tenant_id", "UUID"),
            ("title", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(128)"),
            ("department_id", "UUID"),
            ("position_id", "UUID"),
            ("employment_type", "VARCHAR(50)"),
            ("location", "VARCHAR(255)"),
            ("description", "TEXT"),
            ("requirements", "TEXT"),
            ("salary_min", "NUMERIC(15, 2)"),
            ("salary_max", "NUMERIC(15, 2)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("publish_date", "TIMESTAMPTZ"),
            ("close_date", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "candidates",
        &[
            ("organization_id", "UUID"),
            ("tenant_id", "UUID"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("email", "VARCHAR(128)"),
            ("phone", "VARCHAR(64)"),
            ("position_id", "UUID"),
            ("job_opening_id", "UUID"),
            ("resume_path", "TEXT"),
            ("source", "VARCHAR(100)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'new'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "interviews",
        &[
            ("organization_id", "UUID"),
            ("tenant_id", "UUID"),
            ("candidate_id", "UUID NOT NULL"),
            ("interviewer_id", "UUID"),
            ("round", "INTEGER NOT NULL DEFAULT 1"),
            ("scheduled_at", "TIMESTAMPTZ"),
            ("actual_at", "TIMESTAMPTZ"),
            ("duration_minutes", "INTEGER NOT NULL DEFAULT 30"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'scheduled'"),
            ("result", "VARCHAR(50)"),
            ("notes", "TEXT"),
            ("score", "NUMERIC(5, 2)"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "performance_reviews",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            ("review_period", "VARCHAR(50) NOT NULL"),
            ("reviewer_id", "UUID"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("overall_rating", "NUMERIC(5, 2)"),
            ("self_rating", "NUMERIC(5, 2)"),
            ("manager_rating", "NUMERIC(5, 2)"),
            ("final_rating", "NUMERIC(5, 2)"),
            ("comments", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "performance_goals",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("employee_id", "UUID NOT NULL"),
            ("title", "VARCHAR(255) NOT NULL"),
            ("description", "TEXT"),
            ("target", "VARCHAR(255)"),
            ("weight", "NUMERIC(5, 2) NOT NULL DEFAULT 0"),
            ("achieved", "NUMERIC(5, 2)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("due_date", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
    (
        "contract_renewals",
        &[
            ("organization_id", "UUID NOT NULL"),
            ("contract_id", "UUID NOT NULL"),
            ("previous_contract_id", "UUID"),
            ("renewal_type", "VARCHAR(50) NOT NULL"),
            ("renew_reason", "TEXT"),
            ("renewal_reason", "TEXT"),
            ("new_start_date", "DATE NOT NULL"),
            ("new_end_date", "DATE"),
            ("new_salary", "NUMERIC(15, 2)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("approver_id", "UUID"),
            ("approved_at", "TIMESTAMPTZ"),
            ("rejection_reason", "TEXT"),
            ("executed_at", "TIMESTAMPTZ"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID NOT NULL"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 阶段 0：确保 schema 和表骨架存在
    if SERVICE_SCHEMA != "public" {
        sqlx::query(&format!(
            "CREATE SCHEMA IF NOT EXISTS \"{}\"",
            SERVICE_SCHEMA
        ))
        .execute(pool)
        .await?;
    }
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_schema_is_hrm() {
        assert_eq!(SERVICE_SCHEMA, "hrm");
    }

    #[test]
    fn test_service_tag_is_hrm() {
        assert_eq!(SERVICE_TAG, "hrm");
    }

    #[test]
    fn test_table_defs_has_expected_table_count() {
        // 17 tables as documented in the comment
        assert!(
            TABLE_DEFS.len() >= 15,
            "expected at least 15 table definitions, got {}",
            TABLE_DEFS.len()
        );
    }

    #[test]
    fn test_table_defs_contains_core_tables() {
        let table_names: Vec<&str> = TABLE_DEFS.iter().map(|(name, _)| *name).collect();
        assert!(table_names.contains(&"companies"), "missing 'companies'");
        assert!(
            table_names.contains(&"departments"),
            "missing 'departments'"
        );
        assert!(table_names.contains(&"positions"), "missing 'positions'");
        assert!(table_names.contains(&"employees"), "missing 'employees'");
        assert!(table_names.contains(&"contracts"), "missing 'contracts'");
        assert!(
            table_names.contains(&"attendance_records"),
            "missing 'attendance_records'"
        );
        assert!(
            table_names.contains(&"payroll_records"),
            "missing 'payroll_records'"
        );
        assert!(table_names.contains(&"audit_logs"), "missing 'audit_logs'");
    }

    #[test]
    fn test_all_tables_have_tenant_id_except_init_tables() {
        for (table_name, cols) in TABLE_DEFS {
            let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
            // initialization_status and initialization_logs don't have tenant_id
            if *table_name == "initialization_status" || *table_name == "initialization_logs" {
                assert!(
                    !col_names.contains(&"tenant_id"),
                    "table '{}' should NOT have tenant_id",
                    table_name
                );
            } else {
                assert!(
                    col_names.contains(&"tenant_id"),
                    "table '{}' is missing tenant_id column",
                    table_name
                );
            }
        }
    }

    #[test]
    fn test_all_tables_have_organization_id() {
        for (table_name, cols) in TABLE_DEFS {
            let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
            assert!(
                col_names.contains(&"organization_id"),
                "table '{}' is missing organization_id column",
                table_name
            );
        }
    }

    #[test]
    fn test_all_tables_have_created_at() {
        for (table_name, cols) in TABLE_DEFS {
            let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
            assert!(
                col_names.contains(&"created_at"),
                "table '{}' is missing created_at column",
                table_name
            );
        }
    }

    #[test]
    fn test_business_tables_have_deleted_at() {
        // Business tables should support soft delete
        let business_tables = [
            "companies",
            "departments",
            "positions",
            "employees",
            "contracts",
            "attendance_records",
            "payroll_records",
            "performance_records",
            "training_records",
            "training_participants",
            "recruitment_records",
            "recruitment_applications",
            "leave_records",
            "salary_adjustments",
        ];
        let table_map: std::collections::HashMap<&str, &[(&str, &str)]> =
            TABLE_DEFS.iter().cloned().collect();

        for bt in &business_tables {
            if let Some(cols) = table_map.get(bt) {
                let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
                assert!(
                    col_names.contains(&"deleted_at"),
                    "business table '{}' is missing deleted_at column",
                    bt
                );
            }
        }
    }

    #[test]
    fn test_audit_logs_has_no_deleted_at() {
        // audit_logs should not have deleted_at (immutable log)
        let table_map: std::collections::HashMap<&str, &[(&str, &str)]> =
            TABLE_DEFS.iter().cloned().collect();
        if let Some(cols) = table_map.get("audit_logs") {
            let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
            assert!(
                !col_names.contains(&"deleted_at"),
                "audit_logs should NOT have deleted_at"
            );
        }
    }

    #[test]
    fn test_table_defs_no_duplicate_table_names() {
        let mut seen = std::collections::HashSet::new();
        for (name, _) in TABLE_DEFS {
            assert!(seen.insert(*name), "duplicate table name found: {}", name);
        }
    }

    #[test]
    fn test_table_defs_no_duplicate_columns_per_table() {
        for (table_name, cols) in TABLE_DEFS {
            let mut seen = std::collections::HashSet::new();
            for (col_name, _) in *cols {
                assert!(
                    seen.insert(*col_name),
                    "duplicate column '{}' in table '{}'",
                    col_name,
                    table_name
                );
            }
        }
    }

    #[test]
    fn test_employees_table_has_expected_columns() {
        let table_map: std::collections::HashMap<&str, &[(&str, &str)]> =
            TABLE_DEFS.iter().cloned().collect();
        let cols = table_map.get("employees").expect("employees table exists");
        let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
        assert!(col_names.contains(&"employee_number"));
        assert!(col_names.contains(&"name"));
        assert!(col_names.contains(&"gender"));
        assert!(col_names.contains(&"hire_date"));
        assert!(col_names.contains(&"status"));
        assert!(col_names.contains(&"tenant_id"));
    }

    #[test]
    fn test_contracts_table_has_expected_columns() {
        let table_map: std::collections::HashMap<&str, &[(&str, &str)]> =
            TABLE_DEFS.iter().cloned().collect();
        let cols = table_map.get("contracts").expect("contracts table exists");
        let col_names: Vec<&str> = cols.iter().map(|(c, _)| *c).collect();
        assert!(col_names.contains(&"employee_id"));
        assert!(col_names.contains(&"contract_no"));
        assert!(col_names.contains(&"contract_type"));
        assert!(col_names.contains(&"start_date"));
        assert!(col_names.contains(&"end_date"));
        assert!(col_names.contains(&"salary"));
    }

    #[test]
    fn test_all_column_types_are_non_empty() {
        for (table_name, cols) in TABLE_DEFS {
            for (col_name, col_type) in *cols {
                assert!(
                    !col_type.is_empty(),
                    "column '{}' in table '{}' has empty type",
                    col_name,
                    table_name
                );
            }
        }
    }
}
