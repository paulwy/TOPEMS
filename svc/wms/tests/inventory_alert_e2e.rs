//! P1 补测（2026-10-07）：wms inventory_alert list_alerts handler 集成测试。
//! list_alerts 为 inventory JOIN warehouses/locations 动态计算告警（非 rules 表）。
//! 建表复用 inventory 22 列 + warehouses/locations 小表。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, super_claims};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::inventory_alert::{list_alerts, AlertQueryParams};

fn empty_params() -> AlertQueryParams {
    AlertQueryParams {
        page: None,
        page_size: None,
        search: None,
        alert_type: None,
        severity: None,
        status: None,
        warehouse_id: None,
    }
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.inventory (
            id UUID PRIMARY KEY,
            material_code TEXT,
            material_name TEXT,
            specification TEXT,
            unit TEXT,
            quantity NUMERIC(15,2) DEFAULT 0,
            available_quantity NUMERIC(15,2) DEFAULT 0,
            reserved_quantity NUMERIC(15,2) DEFAULT 0,
            location_id UUID,
            warehouse_id UUID,
            min_quantity NUMERIC(15,2) DEFAULT 0,
            max_quantity NUMERIC(15,2) DEFAULT 0,
            reorder_point NUMERIC(15,2) DEFAULT 0,
            quality_status TEXT,
            batch_number TEXT,
            lot_number TEXT,
            expiry_date TIMESTAMPTZ,
            supplier_name TEXT,
            total_value NUMERIC(15,2) DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.warehouses (
            id UUID PRIMARY KEY,
            warehouse_name TEXT,
            org_id UUID,
            tenant_id UUID
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.locations (
            id UUID PRIMARY KEY,
            location_code TEXT,
            org_id UUID,
            tenant_id UUID
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, alert_type: Option<String>) -> Value {
    let mut txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let mut params = empty_params();
    params.alert_type = alert_type;
    let resp = list_alerts(
        State(state),
        Extension(claims),
        Query(params),
        Extension(txn_arc),
    )
    .await;
    resp.0
        .data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message))
}

async fn insert_inventory(
    pool: &sqlx::PgPool,
    material_code: &str,
    quantity: f64,
    min_qty: Option<f64>,
) {
    sqlx::query(
        "INSERT INTO wms.inventory (id, material_code, material_name, quantity, quality_status, min_quantity, warehouse_id) VALUES ($1, $2, $3, $4, 'qualified', $5, $6)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(material_code)
    .bind(format!("物料-{material_code}"))
    .bind(quantity)
    .bind(min_qty)
    .bind(uuid::Uuid::new_v4())
    .execute(pool)
    .await
    .unwrap();
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inventory_rows(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_inventory(&pool, "M001", 3.0, Some(5.0)).await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["alerts"][0]["material_code"], "M001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_alert_type(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_inventory(&pool, "M-A", 100.0, Some(5.0)).await;
    insert_inventory(&pool, "M-B", 3.0, Some(5.0)).await;

    let body = body_of(pool, Some("below_min".to_string())).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["alerts"][0]["material_code"], "M-B");
}
