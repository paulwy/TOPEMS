//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 服务: tms | Schema: tms
//! 规范: 新增列需两处同步 -> CREATE TABLE 文本块 + TABLE_DEFS 数组

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "tms";
pub const SERVICE_TAG: &str = "tms";

/// tms 5 张表的列定义单一事实源。不含 id 列（verify 自动拼）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    (
        "tms_vehicles",
        &[
            ("vehicle_no", "VARCHAR(64) NOT NULL"),
            ("plate_number", "VARCHAR(32)"),
            ("vehicle_type", "VARCHAR(32)"),
            ("capacity", "DECIMAL(12,2)"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("carrier_id", "UUID"),
            ("notes", "TEXT"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "tms_drivers",
        &[
            ("driver_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(128) NOT NULL"),
            ("phone", "VARCHAR(32)"),
            ("license_no", "VARCHAR(64)"),
            ("license_type", "VARCHAR(32)"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("carrier_id", "UUID"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "tms_carriers",
        &[
            ("carrier_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(128) NOT NULL"),
            ("contact_person", "VARCHAR(64)"),
            ("contact_phone", "VARCHAR(32)"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("service_area", "VARCHAR(256)"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "tms_routes",
        &[
            ("route_no", "VARCHAR(64) NOT NULL"),
            ("name", "VARCHAR(128) NOT NULL"),
            ("origin", "VARCHAR(256)"),
            ("destination", "VARCHAR(256)"),
            ("distance_km", "DECIMAL(10,2)"),
            ("estimated_hours", "DECIMAL(10,2)"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'active'"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ],
    ),
    (
        "tms_shipments",
        &[
            ("shipment_no", "VARCHAR(64) NOT NULL"),
            ("order_id", "UUID"),
            ("carrier_id", "UUID"),
            ("vehicle_id", "UUID"),
            ("driver_id", "UUID"),
            ("route_id", "UUID"),
            ("origin", "VARCHAR(256)"),
            ("destination", "VARCHAR(256)"),
            ("status", "VARCHAR(32) NOT NULL DEFAULT 'pending'"),
            ("freight_amount", "DECIMAL(12,2)"),
            ("planned_departure", "TIMESTAMPTZ"),
            ("planned_arrival", "TIMESTAMPTZ"),
            ("actual_departure", "TIMESTAMPTZ"),
            ("actual_arrival", "TIMESTAMPTZ"),
            ("notes", "TEXT"),
            ("tenant_id", "UUID"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
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
