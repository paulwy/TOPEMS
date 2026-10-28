#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-08）：mes work_order list handler 集成测试。
//! handler SQL 带 schema 前缀（FROM mes.work_orders），测试库建 mes schema + 表。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::{json, Value};
use topems_mes::modules::work_order::{list_work_orders, ListWorkOrdersQuery};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS mes")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS mes.production_processes (
            id UUID PRIMARY KEY,
            process_name VARCHAR(128),
            work_station_name VARCHAR(128),
            work_station_id UUID
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS mes.teams (
            id UUID PRIMARY KEY,
            team_name VARCHAR(128)
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS mes.work_orders (
            id UUID PRIMARY KEY,
            work_order_no VARCHAR(64) NOT NULL,
            order_id UUID,
            order_no VARCHAR(64),
            product_code VARCHAR(64),
            product_name VARCHAR(256),
            work_station_id UUID,
            process_id UUID,
            planned_quantity NUMERIC(12,2) DEFAULT 0,
            completed_quantity NUMERIC(12,2) DEFAULT 0,
            plan_start_date TIMESTAMPTZ,
            plan_end_date TIMESTAMPTZ,
            actual_start_date TIMESTAMPTZ,
            actual_end_date TIMESTAMPTZ,
            team_id UUID,
            operator VARCHAR(64),
            status VARCHAR(32),
            priority VARCHAR(16),
            remark TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    // list_work_orders 的 tenant 隔离 EXISTS 子查询依赖 production_orders（P1-8 起）
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS mes.production_orders (
            id UUID PRIMARY KEY,
            order_number VARCHAR(64),
            tenant_id UUID
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, status: Option<&str>) -> Value {
    let state = test_app_state(pool);
    let claims = super_claims();
    let q: ListWorkOrdersQuery = serde_json::from_value(if let Some(s) = status {
        json!({ "status": s })
    } else {
        json!({})
    })
    .unwrap();
    let resp = list_work_orders(State(state), Extension(claims), Query(q)).await;
    serde_json::to_value(
        resp.data
            .unwrap_or_else(|| panic!("handler error: {:?}", resp.message)),
    )
    .unwrap()
}

async fn insert_work_order(pool: &sqlx::PgPool, no: &str, status: &str) {
    sqlx::query("INSERT INTO mes.work_orders (id, work_order_no, status) VALUES ($1, $2, $3)")
        .bind(uuid::Uuid::new_v4())
        .bind(no)
        .bind(status)
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
    insert_work_order(&pool, "WO-001", "pending").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["work_orders"][0]["work_order_no"], "WO-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_work_order(&pool, "WO-A", "pending").await;
    insert_work_order(&pool, "WO-B", "released").await;

    let body = body_of(pool, Some("released")).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["work_orders"][0]["work_order_no"], "WO-B");
}
