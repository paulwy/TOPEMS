#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-08）：mes wip list handler 集成测试（LEFT JOIN 2 表）。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::{json, Value};
use topems_mes::modules::wip::{list_wips, ListWipsQuery};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS production_processes (
            id UUID PRIMARY KEY, process_name VARCHAR(128)
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS work_stations (
            id UUID PRIMARY KEY, station_name VARCHAR(128)
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wips (
            id UUID PRIMARY KEY,
            wip_no VARCHAR(64) NOT NULL,
            order_id UUID,
            order_no VARCHAR(64),
            product_id UUID,
            product_name VARCHAR(256) NOT NULL,
            product_code VARCHAR(64) NOT NULL,
            quantity NUMERIC(12,2) NOT NULL,
            current_process_id UUID,
            current_work_station_id UUID,
            status VARCHAR(32) DEFAULT 'in_progress',
            batch_no VARCHAR(64),
            start_time TIMESTAMPTZ,
            last_transfer_time TIMESTAMPTZ,
            operator VARCHAR(64),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, status: Option<&str>) -> Value {
    let state = test_app_state(pool);
    let claims = super_claims();
    let q: ListWipsQuery = serde_json::from_value(if let Some(s) = status {
        json!({ "status": s })
    } else {
        json!({})
    })
    .unwrap();
    let resp = list_wips(State(state), Extension(claims), Query(q)).await;
    serde_json::to_value(
        resp.data
            .unwrap_or_else(|| panic!("handler error: {:?}", resp.message)),
    )
    .unwrap()
}

async fn insert_wip(pool: &sqlx::PgPool, no: &str, status: &str) {
    sqlx::query(
        "INSERT INTO wips (id, wip_no, product_name, product_code, quantity, status) VALUES ($1, $2, $3, $4, 100, $5)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(no)
    .bind(format!("产品-{no}"))
    .bind(format!("P-{no}"))
    .bind(status)
    .execute(pool).await.unwrap();
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    assert_eq!(body_of(pool, None).await["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_wip(&pool, "WIP-001", "in_progress").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["wips"][0]["wip_no"], "WIP-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_wip(&pool, "WIP-A", "in_progress").await;
    insert_wip(&pool, "WIP-B", "completed").await;

    let body = body_of(pool, Some("completed")).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["wips"][0]["wip_no"], "WIP-B");
}
