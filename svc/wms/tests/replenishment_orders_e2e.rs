#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms smart_replenishment list_orders handler 集成测试。
//! 复用 common/api_state.rs 工厂（含 PaginationParams）；覆盖空表/有数据/分页。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, empty_params, super_claims};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::smart_replenishment::orders::list_orders;

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.replenishment_orders (
            id UUID PRIMARY KEY,
            order_number TEXT NOT NULL,
            warehouse_id UUID,
            warehouse_name TEXT,
            status TEXT DEFAULT 'pending',
            total_quantity BIGINT DEFAULT 0,
            total_amount FLOAT8 DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, page_size: Option<i64>) -> Value {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let mut params = empty_params();
    params.page_size = page_size;
    let resp = list_orders(
        State(state),
        Extension(claims),
        Query(params),
        Extension(txn_arc),
    )
    .await;
    let body = resp
        .0
        .data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    body
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
    sqlx::query(
        "INSERT INTO wms.replenishment_orders (id, order_number, status, total_quantity, total_amount) VALUES ($1, $2, 'pending', 100, 1000.5)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind("RO-20261007-001")
    .execute(&pool)
    .await
    .unwrap();

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["order_number"], "RO-20261007-001");
    assert_eq!(body["items"][0]["total_quantity"], 100);
}

#[sqlx::test(migrations = false)]
async fn list_respects_page_size(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    for i in 0..2 {
        sqlx::query(
            "INSERT INTO wms.replenishment_orders (id, order_number, status) VALUES ($1, $2, 'pending')",
        )
        .bind(uuid::Uuid::new_v4())
        .bind(format!("RO-{i}"))
        .execute(&pool)
        .await
        .unwrap();
    }

    let body = body_of(pool, Some(1)).await;
    assert_eq!(body["total"], 2);
    assert_eq!(body["items"].as_array().unwrap().len(), 1);
}
