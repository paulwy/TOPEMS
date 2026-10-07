#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms location list_locations handler 集成测试。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, super_claims};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::location::{list_locations, LocationPaginationParams};

fn empty_params() -> LocationPaginationParams {
    LocationPaginationParams {
        page: None,
        page_size: None,
        search: None,
        status: None,
        warehouse_id: None,
        zone_id: None,
        location_type: None,
        storage_type: None,
        isactive: None,
    }
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.locations (
            id UUID PRIMARY KEY,
            tenant_id UUID,
            org_id UUID,
            warehouse_id UUID,
            location_code TEXT,
            location_name TEXT,
            location_type TEXT,
            capacity FLOAT8,
            status TEXT,
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
    let claims = super_claims();
    let mut params = empty_params();
    params.status = status;
    let resp = list_locations(
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

async fn insert_location(pool: &sqlx::PgPool, code: &str, status: &str) {
    sqlx::query(
        "INSERT INTO wms.locations (id, tenant_id, org_id, warehouse_id, location_code, location_name, location_type, capacity, status) VALUES ($1, $2, $2, $3, $4, $5, 'rack', 100.5, $6)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind(code)
    .bind(format!("库位-{code}"))
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
    insert_location(&pool, "A-01", "active").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["code"], "A-01");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_location(&pool, "A-01", "active").await;
    insert_location(&pool, "B-02", "disabled").await;

    let body = body_of(pool, Some("disabled".to_string())).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["code"], "B-02");
}
