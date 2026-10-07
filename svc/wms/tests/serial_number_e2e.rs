#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms serial_number list handler 集成测试。
//! 生产缺陷：unit_price numeric(18,4) ← Option<f64> decode 必挂，已修 SELECT ::float8。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, super_claims};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::models::serial_number::SerialNumberQueryParams;
use topems_wms::modules::serial_number::list_serial_numbers;

fn empty_params() -> SerialNumberQueryParams {
    SerialNumberQueryParams {
        page: None,
        page_size: None,
        warehouse_id: None,
        sku: None,
        serial_no: None,
        supplier_id: None,
        batch_no: None,
        quality_status: None,
        status: None,
        expiry_warning: None,
        warranty_warning: None,
    }
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.serial_numbers (
            id UUID PRIMARY KEY,
            tenant_id UUID,
            org_id UUID,
            serial_no VARCHAR(100) NOT NULL,
            sku TEXT,
            material_name TEXT,
            specification TEXT,
            unit TEXT,
            warehouse_id UUID,
            warehouse_name VARCHAR(255),
            location_id UUID,
            location_code TEXT,
            supplier_id UUID,
            supplier_name TEXT,
            batch_no TEXT,
            production_date TIMESTAMPTZ,
            expiry_date TIMESTAMPTZ,
            quality_status VARCHAR(50) NOT NULL DEFAULT 'pending',
            status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
            warranty_start_date TIMESTAMPTZ,
            warranty_end_date TIMESTAMPTZ,
            inbound_order_no TEXT,
            outbound_order_no TEXT,
            current_owner TEXT,
            unit_price NUMERIC(18,4),
            remark TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, status: Option<String>) -> Value {
    let mut txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let mut params = empty_params();
    params.status = status;
    let resp = list_serial_numbers(
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

async fn insert_serial(pool: &sqlx::PgPool, serial_no: &str, status: &str) {
    sqlx::query(
        "INSERT INTO wms.serial_numbers (id, tenant_id, org_id, serial_no, sku, material_name, warehouse_id, quality_status, status, unit_price) VALUES ($1, $2, $2, $3, $4, $5, $6, 'qualified', $7, 199.5)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind(serial_no)
    .bind(format!("SKU-{serial_no}"))
    .bind(format!("物料-{serial_no}"))
    .bind(uuid::Uuid::new_v4())
    .bind(status)
    .execute(pool).await.unwrap();
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_serial(&pool, "SN-20261007-001", "in_stock").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["serial_no"], "SN-20261007-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_serial(&pool, "SN-A", "in_stock").await;
    insert_serial(&pool, "SN-B", "out_stock").await;

    let body = body_of(pool, Some("out_stock".to_string())).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["serial_no"], "SN-B");
}
