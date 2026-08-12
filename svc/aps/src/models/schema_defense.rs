//! APS Schema 防御定义 — 使用 shared-db 抽象
use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "plugin_aps";
pub const SERVICE_TAG: &str = "aps";

/// APS 5 张表的列定义单一事实源。不含 id 列（verify 自动拼）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "aps_production_plans",
        &[
            ("plan_no", "VARCHAR(64) NOT NULL"),
            ("plan_name", "VARCHAR(128) NOT NULL"),
            ("plan_type", "VARCHAR(32) DEFAULT 'monthly'"),
            ("start_date", "DATE"),
            ("end_date", "DATE"),
            ("status", "VARCHAR(32) DEFAULT 'draft'"),
            ("product_id", "UUID"),
            ("product_name", "VARCHAR(256)"),
            ("target_quantity", "DECIMAL(12,2)"),
            ("notes", "TEXT"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "aps_schedules",
        &[
            ("schedule_no", "VARCHAR(64) NOT NULL"),
            ("plan_id", "UUID"),
            ("work_order_id", "UUID"),
            ("product_id", "UUID"),
            ("product_name", "VARCHAR(256)"),
            ("work_center_id", "UUID"),
            ("work_center_name", "VARCHAR(128)"),
            ("planned_start", "TIMESTAMPTZ"),
            ("planned_end", "TIMESTAMPTZ"),
            ("actual_start", "TIMESTAMPTZ"),
            ("actual_end", "TIMESTAMPTZ"),
            ("quantity", "DECIMAL(12,2)"),
            ("priority", "INTEGER DEFAULT 0"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "aps_capacities",
        &[
            ("work_center_id", "UUID NOT NULL"),
            ("work_center_name", "VARCHAR(128)"),
            ("capacity_date", "DATE"),
            ("available_hours", "DECIMAL(10,2)"),
            ("used_hours", "DECIMAL(10,2) DEFAULT 0"),
            ("utilization_rate", "DECIMAL(5,4) DEFAULT 0"),
            ("status", "VARCHAR(32) DEFAULT 'available'"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "aps_material_plans",
        &[
            ("plan_no", "VARCHAR(64) NOT NULL"),
            ("plan_id", "UUID"),
            ("material_id", "UUID"),
            ("material_code", "VARCHAR(64)"),
            ("material_name", "VARCHAR(256)"),
            ("required_quantity", "DECIMAL(12,4)"),
            ("available_quantity", "DECIMAL(12,4) DEFAULT 0"),
            ("shortfall_quantity", "DECIMAL(12,4) DEFAULT 0"),
            ("required_date", "DATE"),
            ("supply_type", "VARCHAR(32) DEFAULT 'purchase'"),
            ("status", "VARCHAR(32) DEFAULT 'pending'"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "aps_demand_forecasts",
        &[
            ("forecast_no", "VARCHAR(64) NOT NULL"),
            ("product_id", "UUID"),
            ("product_name", "VARCHAR(256)"),
            ("forecast_period", "VARCHAR(32)"),
            ("forecast_date", "DATE"),
            ("forecast_quantity", "DECIMAL(12,2)"),
            ("actual_quantity", "DECIMAL(12,2) DEFAULT 0"),
            ("accuracy_rate", "DECIMAL(5,4) DEFAULT 0"),
            ("method", "VARCHAR(32) DEFAULT 'moving_average'"),
            ("confidence_level", "DECIMAL(5,4) DEFAULT 0.95"),
            ("notes", "TEXT"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> anyhow::Result<()> {
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
