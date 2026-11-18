#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms batch list_batches handler 集成测试。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, tenant_claims, test_tenant};
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::models::batch::BatchQueryParams;
use topems_wms::modules::batch::list_batches;

fn empty_params() -> BatchQueryParams {
    BatchQueryParams {
        page: None,
        page_size: None,
        warehouse_id: None,
        sku: None,
        batch_no: None,
        supplier_id: None,
        quality_status: None,
        status: None,
        expiry_warning: None,
        expired: None,
    }
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.batches (
            id UUID PRIMARY KEY,
            tenant_id UUID,
            org_id UUID,
            batch_no TEXT,
            sku TEXT,
            material_name TEXT,
            specification TEXT,
            unit TEXT,
            quantity FLOAT8,
            available_quantity FLOAT8,
            warehouse_id UUID,
            warehouse_name VARCHAR(200),
            location_id UUID,
            location_code TEXT,
            supplier_id UUID,
            supplier_name TEXT,
            production_date TIMESTAMPTZ,
            expiry_date TIMESTAMPTZ,
            receipt_date TIMESTAMPTZ,
            quality_status TEXT,
            status TEXT,
            manufacture_date TIMESTAMPTZ,
            shelf_life_days INT,
            remaining_days INT,
            unit_price FLOAT8,
            total_value FLOAT8,
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
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = tenant_claims();
    let mut params = empty_params();
    params.status = status;
    let resp = list_batches(
        State(state),
        Extension(claims),
        HeaderMap::new(),
        Query(params),
        Extension(txn_arc),
    )
    .await;
    resp.data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message))
}

async fn insert_batch(pool: &sqlx::PgPool, batch_no: &str, status: &str) {
    sqlx::query(
        "INSERT INTO wms.batches (id, tenant_id, org_id, batch_no, sku, material_name, quantity, available_quantity, warehouse_id, quality_status, status) VALUES ($1, $2, $2, $3, $4, $5, 100, 80, $6, 'qualified', $7)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(test_tenant())
    .bind(batch_no)
    .bind(format!("SKU-{batch_no}"))
    .bind(format!("物料-{batch_no}"))
    .bind(uuid::Uuid::new_v4())
    .bind(status)
    .execute(pool).await.unwrap();
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_batch(&pool, "B20261007-001", "in_stock").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["batch_no"], "B20261007-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_batch(&pool, "B-A", "in_stock").await;
    insert_batch(&pool, "B-B", "reserved").await;

    let body = body_of(pool, Some("reserved".to_string())).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["batch_no"], "B-B");
}
