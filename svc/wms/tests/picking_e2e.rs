#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：wms picking 模块集成测试。
//! 复用 wave_pick 基建（同 wave_picks 表 + RLS txn 模式）；
//! 覆盖 list_picking_lists（空/计数）、get_picking_list、picking_statistics、picking_strategies。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, empty_params, super_claims};
use axum::extract::{Path, Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::picking::{
    get_picking_list, list_picking_lists, picking_statistics, picking_strategies,
};

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

async fn insert_pick(pool: &sqlx::PgPool, number: &str, status: &str) -> uuid::Uuid {
    let id = uuid::Uuid::new_v4();
    sqlx::query(
        "INSERT INTO wms.wave_picks (id, org_id, wave_pick_number, wave_pick_type, warehouse_id, status, total_items, picked_items, total_quantity, picked_quantity) VALUES ($1, $2, $3, 'standard', $4, $5, 10, 4, 100.5, 40.25)",
    )
    .bind(id)
    .bind(uuid::Uuid::new_v4())
    .bind(number)
    .bind(uuid::Uuid::new_v4())
    .bind(status)
    .execute(pool)
    .await
    .unwrap();
    id
}

async fn list_body(pool: sqlx::PgPool, status: Option<String>) -> Value {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let mut params = empty_params();
    params.status = status;
    let resp = list_picking_lists(
        State(state),
        Extension(claims),
        Query(params),
        Extension(txn_arc),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    serde_json::to_value(data).unwrap()
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = list_body(pool, None).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_pick(&pool, "PK-20261018-001", "pending").await;

    let body = list_body(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["wave_pick_number"], "PK-20261018-001");
}

#[sqlx::test(migrations = false)]
async fn get_returns_pick(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = insert_pick(&pool, "PK-20261018-002", "in_progress").await;

    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let resp = get_picking_list(
        State(state),
        Extension(claims),
        Path(id),
        Extension(txn_arc),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    assert_eq!(data["pick"]["wave_pick_number"], "PK-20261018-002");
    assert_eq!(data["pick"]["status"], "in_progress");
}

#[sqlx::test(migrations = false)]
async fn statistics_counts_statuses(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_pick(&pool, "PK-A", "pending").await;
    insert_pick(&pool, "PK-B", "pending").await;
    insert_pick(&pool, "PK-C", "completed").await;

    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let resp = picking_statistics(State(state), Extension(claims), Extension(txn_arc)).await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let stats = serde_json::to_value(data).unwrap();
    assert_eq!(stats["total_lists"], 3);
    assert_eq!(stats["pending"], 2);
    assert_eq!(stats["completed"], 1);
}

#[sqlx::test(migrations = false)]
async fn strategies_returns_defaults(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = api_state(pool);
    let claims = super_claims();
    let resp = picking_strategies(State(state), Extension(claims)).await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let strategies = serde_json::to_value(data).unwrap();
    let codes: Vec<&str> = strategies
        .as_array()
        .unwrap()
        .iter()
        .map(|s| s["code"].as_str().unwrap())
        .collect();
    assert_eq!(codes.len(), 4);
    assert!(codes.contains(&"fifo"));
    assert!(codes.contains(&"zone"));
}
