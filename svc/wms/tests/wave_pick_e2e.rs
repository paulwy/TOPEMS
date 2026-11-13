#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms wave_pick list_wave_picks handler 集成测试。
//! query_as FromRow（19 列 SELECT）；建表手写对齐生产列类型。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, empty_params, tenant_claims, test_tenant};
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::wave_pick::list_wave_picks;

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.wave_picks (
            id UUID PRIMARY KEY,
            org_id UUID NOT NULL,
            wave_pick_number VARCHAR(100) NOT NULL,
            wave_pick_type VARCHAR(50) NOT NULL DEFAULT 'standard',
            warehouse_id UUID,
            warehouse_name VARCHAR(255),
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            priority VARCHAR(20) DEFAULT 'medium',
            assigned_to UUID,
            assigned_user_name VARCHAR(255),
            batch_id UUID,
            start_time TIMESTAMPTZ,
            end_time TIMESTAMPTZ,
            total_items BIGINT NOT NULL DEFAULT 0,
            picked_items BIGINT NOT NULL DEFAULT 0,
            total_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
            picked_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
            remarks TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ,
            tenant_id UUID
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
    let resp = list_wave_picks(
        State(state),
        Extension(claims),
        Query(params),
        HeaderMap::new(),
        Extension(txn_arc),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    serde_json::to_value(data).unwrap()
}

async fn insert_wave(pool: &sqlx::PgPool, number: &str, status: &str) {
    let tid = uuid::Uuid::new_v4();
    sqlx::query(
        "INSERT INTO wms.wave_picks (id, org_id, tenant_id, wave_pick_number, wave_pick_type, warehouse_id, status, total_items, picked_items, total_quantity, picked_quantity) VALUES ($1, $2, $6, $3, 'standard', $4, $5, 10, 4, 100.5, 40.25)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(tid)
    .bind(number)
    .bind(uuid::Uuid::new_v4())
    .bind(status)
    .bind(test_tenant())
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
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_wave(&pool, "WV-20261007-001", "pending").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["wave_pick_number"], "WV-20261007-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_wave(&pool, "WV-A", "pending").await;
    insert_wave(&pool, "WV-B", "completed").await;

    let body = body_of(pool, Some("completed".to_string())).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["wave_pick_number"], "WV-B");
}
