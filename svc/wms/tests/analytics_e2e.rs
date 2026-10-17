#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：wms analytics 模块集成测试。
//! 覆盖 get_dashboard_summary（跨 6 表聚合：仓库/库存/出入库/告警/库位利用率）。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, super_claims};
use axum::extract::State;
use axum::Extension;
use serde_json::Value;
use topems_wms::modules::analytics::get_dashboard_summary;

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    for (table, ddl) in [
        (
            "warehouses",
            "id UUID PRIMARY KEY, name VARCHAR(200), deleted_at TIMESTAMPTZ",
        ),
        (
            "inventory",
            "id UUID PRIMARY KEY, material_code VARCHAR(100), quantity NUMERIC(15,2), deleted_at TIMESTAMPTZ",
        ),
        (
            "inbound_orders",
            "id UUID PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW(), deleted_at TIMESTAMPTZ",
        ),
        (
            "outbound_orders",
            "id UUID PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW(), deleted_at TIMESTAMPTZ",
        ),
        (
            "alerts",
            "id UUID PRIMARY KEY, status VARCHAR(20), severity VARCHAR(20), deleted_at TIMESTAMPTZ",
        ),
        (
            "locations",
            "id UUID PRIMARY KEY, status VARCHAR(20), deleted_at TIMESTAMPTZ",
        ),
    ] {
        sqlx::query(&format!(
            "CREATE TABLE IF NOT EXISTS wms.{table} ({ddl})"
        ))
        .execute(pool)
        .await
        .unwrap();
    }
}

#[sqlx::test(migrations = false)]
async fn dashboard_aggregates_core_metrics(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    sqlx::query("INSERT INTO wms.warehouses (id, name) VALUES (gen_random_uuid(), 'W1')")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query(
        "INSERT INTO wms.inventory (id, material_code, quantity) VALUES (gen_random_uuid(), 'A001', 100), (gen_random_uuid(), 'B002', 50)",
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query("INSERT INTO wms.inbound_orders (id) VALUES (gen_random_uuid())")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO wms.outbound_orders (id) VALUES (gen_random_uuid())")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query(
        "INSERT INTO wms.alerts (id, status, severity) VALUES (gen_random_uuid(), 'active', 'critical'), (gen_random_uuid(), 'active', 'warning')",
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO wms.locations (id, status) VALUES (gen_random_uuid(), 'occupied'), (gen_random_uuid(), 'empty')",
    )
    .execute(&pool)
    .await
    .unwrap();

    let state = api_state(pool);
    let claims = super_claims();
    let resp = get_dashboard_summary(State(state), Extension(claims)).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    let summary: Value = serde_json::to_value(data).unwrap();
    assert_eq!(summary["warehouse_count"], 1);
    assert_eq!(summary["inventory_total"], 150.0);
    assert_eq!(summary["inventory_sku_count"], 2);
    assert_eq!(summary["inbound_today"], 1);
    assert_eq!(summary["outbound_today"], 1);
    assert_eq!(summary["alert_count"], 2);
    assert_eq!(summary["alert_critical"], 1);
    assert_eq!(summary["location_utilization"], 50.0);
}
