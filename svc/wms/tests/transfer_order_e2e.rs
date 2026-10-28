#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms transfer_order list handler 集成测试。
//! 复用 common/api_state.rs 工厂；覆盖空表/有数据/status 过滤。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, super_claims};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::models::transfer_order::TransferOrderQueryParams;
use topems_wms::modules::transfer_order::list_transfers;

fn empty_params() -> TransferOrderQueryParams {
    TransferOrderQueryParams {
        page: None,
        page_size: None,
        transfer_type: None,
        from_warehouse_id: None,
        to_warehouse_id: None,
        status: None,
    }
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.transfer_orders (
            id UUID PRIMARY KEY,
            tenant_id UUID,
            order_number TEXT NOT NULL,
            transfer_type TEXT DEFAULT 'inter_warehouse',
            from_warehouse_id UUID,
            to_warehouse_id UUID,
            status TEXT DEFAULT 'pending',
            created_by TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, params: TransferOrderQueryParams) -> Value {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let resp = list_transfers(
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
        "INSERT INTO wms.transfer_orders (id, tenant_id, order_number, transfer_type, from_warehouse_id, to_warehouse_id, status) VALUES ($1, $2, $3, 'inter_warehouse', $4, $5, 'pending')",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind("TF-20261007-001")
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .execute(&pool)
    .await
    .unwrap();

    let body = body_of(pool, empty_params()).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["order_number"], "TF-20261007-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    for (i, status) in ["pending", "shipped"].iter().enumerate() {
        sqlx::query(
            "INSERT INTO wms.transfer_orders (id, tenant_id, order_number, transfer_type, from_warehouse_id, to_warehouse_id, status) VALUES ($1, $2, $3, 'inter_warehouse', $4, $5, $6)",
        )
        .bind(uuid::Uuid::new_v4())
        .bind(uuid::Uuid::new_v4())
        .bind(format!("TF-{i}"))
        .bind(uuid::Uuid::new_v4())
        .bind(uuid::Uuid::new_v4())
        .bind(status)
        .execute(&pool)
        .await
        .unwrap();
    }

    let mut params = empty_params();
    params.status = Some("shipped".to_string());
    let body = body_of(pool, params).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["status"], "shipped");
}
