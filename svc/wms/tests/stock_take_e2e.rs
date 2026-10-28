#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms stock_take list handler 集成测试。
//! 复用 common/api_state.rs 工厂；覆盖空表/有数据/warehouse_id 过滤。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, super_claims};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::stock_take::list_stock_takes;
use topems_wms::modules::stock_take::StockTakePaginationParams;

fn empty_params() -> StockTakePaginationParams {
    StockTakePaginationParams {
        page: None,
        page_size: None,
        search: None,
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
        r#"CREATE TABLE IF NOT EXISTS wms.stock_takes (
            id UUID PRIMARY KEY,
            warehouse_id UUID,
            warehouse_name TEXT,
            location_id UUID,
            location_code TEXT,
            location_name TEXT,
            stock_take_number TEXT NOT NULL,
            stock_take_type TEXT,
            status TEXT DEFAULT 'pending',
            planned_date TIMESTAMPTZ,
            actual_date TIMESTAMPTZ,
            total_items INT DEFAULT 0,
            counted_items INT DEFAULT 0,
            discrepancy_items INT DEFAULT 0,
            total_quantity FLOAT8 DEFAULT 0,
            counted_quantity FLOAT8 DEFAULT 0,
            discrepancy_quantity FLOAT8 DEFAULT 0,
            discrepancy_value FLOAT8 DEFAULT 0,
            accuracy_rate FLOAT8 DEFAULT 0,
            approval_status TEXT,
            adjustment_status TEXT,
            remarks TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, params: StockTakePaginationParams) -> Value {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let resp = list_stock_takes(
        State(state),
        Extension(claims),
        Query(params),
        Extension(txn_arc),
    )
    .await;
    resp
        .data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message))
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = body_of(pool, empty_params()).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    sqlx::query(
        "INSERT INTO wms.stock_takes (id, stock_take_number, status, warehouse_id) VALUES ($1, $2, 'pending', $3)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind("ST-20261007-001")
    .bind(uuid::Uuid::new_v4())
    .execute(&pool)
    .await
    .unwrap();

    let body = body_of(pool, empty_params()).await;
    assert_eq!(body["total"], 1);
    assert_eq!(
        body["stock_takes"][0]["stock_take_number"],
        "ST-20261007-001"
    );
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_warehouse(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let wh_a = uuid::Uuid::new_v4();
    let wh_b = uuid::Uuid::new_v4();
    for (i, wh) in [wh_a, wh_b].iter().enumerate() {
        sqlx::query(
            "INSERT INTO wms.stock_takes (id, stock_take_number, status, warehouse_id) VALUES ($1, $2, 'pending', $3)",
        )
        .bind(uuid::Uuid::new_v4())
        .bind(format!("ST-{i}"))
        .bind(wh)
        .execute(&pool)
        .await
        .unwrap();
    }

    let mut params = empty_params();
    params.warehouse_id = Some(wh_a);
    let body = body_of(pool, params).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["stock_takes"][0]["warehouse_id"], wh_a.to_string());
}
