//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步（详见 docs/development/backend/database-development.md）
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")
//!       → 注意：这里只写 TYPE/NOT NULL/DEFAULT，不要写 UNIQUE/REFERENCES/CHECK
//!          （这些由 CREATE TABLE / CREATE INDEX IF NOT EXISTS 负责）

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "crm";
pub const SERVICE_TAG: &str = "crm";

/// crm 11 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "audit_logs",
        &[
            ("org_id", "UUID NOT NULL"),
            ("user_id", "UUID"),
            ("action", "VARCHAR(100) NOT NULL"),
            ("resource", "VARCHAR(100) NOT NULL"),
            ("resource_id", "UUID"),
            ("old_values", "JSONB"),
            ("new_values", "JSONB"),
            ("ip_address", "INET"),
            ("user_agent", "TEXT"),
            ("details", "JSONB"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("tenant_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "contacts",
        &[
            ("org_id", "UUID NOT NULL"),
            ("customer_id", "UUID"),
            ("first_name", "VARCHAR(100) NOT NULL"),
            ("last_name", "VARCHAR(100)"),
            ("full_name", "VARCHAR(255)"),
            ("email", "VARCHAR(100)"),
            ("phone", "VARCHAR(50)"),
            ("mobile", "VARCHAR(50)"),
            ("position", "VARCHAR(100)"),
            ("department", "VARCHAR(100)"),
            ("is_primary", "BOOLEAN DEFAULT false"),
            ("is_decision_maker", "BOOLEAN DEFAULT false"),
            ("gender", "VARCHAR(20)"),
            ("birthday", "DATE"),
            ("address", "TEXT"),
            ("notes", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "crm_master_data_refs",
        &[
            ("master_data_id", "VARCHAR(128) NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("domain", "VARCHAR(32) NOT NULL"),
            ("code", "VARCHAR(128) NOT NULL"),
            ("name", "VARCHAR(256)"),
            ("status", "VARCHAR(32) DEFAULT 'active'"),
            ("source_service", "VARCHAR(64) NOT NULL"),
            ("local_entity_type", "VARCHAR(64)"),
            ("local_entity_id", "UUID"),
            ("payload_snapshot", "JSONB"),
            ("last_synced_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ],
    ),
    (
        "customer_orders",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("customer_id", "UUID"),
            ("order_no", "VARCHAR(100)"),
            ("order_date", "DATE NOT NULL DEFAULT CURRENT_DATE"),
            ("order_amount", "DECIMAL(15,2) NOT NULL DEFAULT 0"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'completed'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "customer_tags",
        &[
            ("org_id", "UUID NOT NULL"),
            ("customer_id", "UUID NOT NULL"),
            ("tag_id", "UUID NOT NULL"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "customers",
        &[
            ("org_id", "UUID NOT NULL"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(100)"),
            ("industry", "VARCHAR(100)"),
            ("company_size", "VARCHAR(50)"),
            ("website", "VARCHAR(255)"),
            ("email", "VARCHAR(100)"),
            ("phone", "VARCHAR(50)"),
            ("fax", "VARCHAR(50)"),
            ("address", "TEXT"),
            ("city", "VARCHAR(100)"),
            ("province", "VARCHAR(100)"),
            ("country", "VARCHAR(100)"),
            ("postal_code", "VARCHAR(20)"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'active'"),
            ("customer_type", "VARCHAR(50) DEFAULT 'potential'"),
            ("source", "VARCHAR(50)"),
            ("rating", "VARCHAR(20)"),
            ("revenue", "DECIMAL(15,2)"),
            ("employee_count", "INTEGER"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "dashboard_metrics",
        &[
            ("org_id", "UUID NOT NULL"),
            ("metric_type", "VARCHAR(50) NOT NULL"),
            ("metric_name", "VARCHAR(100) NOT NULL"),
            ("metric_value", "DECIMAL(15,2) NOT NULL"),
            ("metric_unit", "VARCHAR(20)"),
            ("period_type", "VARCHAR(20) NOT NULL"),
            ("period_start", "DATE NOT NULL"),
            ("period_end", "DATE NOT NULL"),
            ("comparison_value", "DECIMAL(15,2)"),
            ("comparison_period_start", "DATE"),
            ("comparison_period_end", "DATE"),
            ("trend", "VARCHAR(20)"),
            ("target_value", "DECIMAL(15,2)"),
            ("achievement_percentage", "DECIMAL(5,2)"),
            ("details", "JSONB"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "interactions",
        &[
            ("org_id", "UUID NOT NULL"),
            ("customer_id", "UUID"),
            ("contact_id", "UUID"),
            ("opportunity_id", "UUID"),
            ("interaction_type", "VARCHAR(50) NOT NULL"),
            ("subject", "VARCHAR(255)"),
            ("content", "TEXT"),
            ("location", "VARCHAR(255)"),
            ("duration_minutes", "INTEGER"),
            ("scheduled_at", "TIMESTAMPTZ"),
            ("started_at", "TIMESTAMPTZ"),
            ("completed_at", "TIMESTAMPTZ"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'scheduled'"),
            ("outcome", "VARCHAR(50)"),
            ("follow_up_required", "BOOLEAN DEFAULT false"),
            ("follow_up_date", "DATE"),
            ("follow_up_notes", "TEXT"),
            ("assigned_to", "UUID"),
            ("attachments", "JSONB"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "opportunities",
        &[
            ("org_id", "UUID NOT NULL"),
            ("customer_id", "UUID"),
            ("contact_id", "UUID"),
            ("name", "VARCHAR(255) NOT NULL"),
            ("code", "VARCHAR(100)"),
            ("description", "TEXT"),
            ("value", "DECIMAL(15,2)"),
            ("expected_revenue", "DECIMAL(15,2)"),
            ("stage", "VARCHAR(50) NOT NULL DEFAULT 'prospecting'"),
            ("probability", "INTEGER DEFAULT 0"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'open'"),
            ("priority", "VARCHAR(20)"),
            ("source", "VARCHAR(50)"),
            ("campaign_id", "UUID"),
            ("close_date", "DATE"),
            ("actual_close_date", "DATE"),
            ("next_step", "TEXT"),
            ("competitor", "TEXT"),
            ("loss_reason", "TEXT"),
            ("win_reason", "TEXT"),
            ("assigned_to", "UUID"),
            ("notes", "TEXT"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
    (
        "return_items",
        &[
            ("return_id", "UUID NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("product_id", "UUID"),
            ("quantity", "INTEGER NOT NULL DEFAULT 0"),
            ("unit_price", "DECIMAL(15,2) NOT NULL DEFAULT 0"),
            ("total_amount", "DECIMAL(15,2) NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "returns",
        &[
            ("return_no", "VARCHAR(50) NOT NULL"),
            ("tenant_id", "UUID NOT NULL"),
            ("customer_id", "UUID"),
            ("order_id", "UUID"),
            ("return_type", "VARCHAR(20) NOT NULL DEFAULT 'return'"),
            ("reason", "VARCHAR(200)"),
            ("reason_detail", "TEXT"),
            ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("refund_amount", "DECIMAL(15,2) NOT NULL DEFAULT 0"),
            ("exchange_product_id", "UUID"),
            ("received", "BOOLEAN NOT NULL DEFAULT false"),
            ("received_at", "TIMESTAMPTZ"),
            ("approved_by", "UUID"),
            ("approved_at", "TIMESTAMPTZ"),
            ("completed_at", "TIMESTAMPTZ"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("ticket_id", "UUID"),
            ("warehouse_id", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
        ],
    ),
    (
        "rfm_results",
        &[
            ("tenant_id", "UUID NOT NULL"),
            ("customer_id", "UUID"),
            ("recency_days", "INTEGER NOT NULL DEFAULT 0"),
            ("frequency", "INTEGER NOT NULL DEFAULT 0"),
            ("monetary", "DECIMAL(15,2) NOT NULL DEFAULT 0"),
            ("r_score", "INTEGER NOT NULL DEFAULT 0"),
            ("f_score", "INTEGER NOT NULL DEFAULT 0"),
            ("m_score", "INTEGER NOT NULL DEFAULT 0"),
            ("rfm_score", "DECIMAL(10,2) NOT NULL DEFAULT 0"),
            ("segment", "VARCHAR(32) NOT NULL DEFAULT 'hibernating'"),
            ("analyzed_at", "TIMESTAMPTZ DEFAULT NOW()"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "tags",
        &[
            ("org_id", "UUID NOT NULL"),
            ("name", "VARCHAR(100) NOT NULL"),
            ("color", "VARCHAR(20) DEFAULT '#3498db'"),
            ("description", "TEXT"),
            ("category", "VARCHAR(50)"),
            ("is_system", "BOOLEAN DEFAULT false"),
            ("usage_count", "INTEGER DEFAULT 0"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("created_by", "UUID"),
            ("updated_by", "UUID"),
            ("deleted_at", "TIMESTAMPTZ"),
            ("tenant_id", "UUID"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    if SERVICE_SCHEMA != "public" {
        sqlx::query(&format!(
            "CREATE SCHEMA IF NOT EXISTS \"{}\"",
            SERVICE_SCHEMA
        ))
        .execute(pool)
        .await?;
    }
    // 阶段 0：确保 TABLE_DEFS 中所有表的"骨架"都存在（空表仅含 id PK）。
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }

    // 阶段 1+2：调用 shared-db 抽象完成增量迁移 + 一致性自检
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn service_schema_is_crm() {
        assert_eq!(SERVICE_SCHEMA, "crm");
    }

    #[test]
    fn service_tag_is_crm() {
        assert_eq!(SERVICE_TAG, "crm");
    }

    #[test]
    fn table_defs_has_expected_tables() {
        let names: Vec<&str> = TABLE_DEFS.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"customers"));
        assert!(names.contains(&"contacts"));
        assert!(names.contains(&"opportunities"));
        assert!(names.contains(&"interactions"));
        assert!(names.contains(&"tags"));
        assert!(names.contains(&"audit_logs"));
        assert!(names.contains(&"returns"));
        assert!(names.contains(&"return_items"));
        assert!(names.contains(&"rfm_results"));
        assert!(names.contains(&"customer_tags"));
        assert!(names.contains(&"dashboard_metrics"));
        assert!(names.contains(&"customer_orders"));
        assert!(names.contains(&"crm_master_data_refs"));
    }

    #[test]
    fn all_table_defs_have_nonempty_columns() {
        for (tbl, cols) in TABLE_DEFS {
            assert!(
                !cols.is_empty(),
                "Table {} should have at least one column defined",
                tbl
            );
        }
    }
}
