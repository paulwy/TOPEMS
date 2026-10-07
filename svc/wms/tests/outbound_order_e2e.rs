//! P1 补测（2026-10-07）：wms outbound_order list handler 集成测试。
//! 复用超管权限放行路径（check_module_permission 对 is_superuser 直接 Ok），
//! RLS 事务 Arc（pool.begin）构造，wms schema 最小建表（对齐 list SELECT 24 列）。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, empty_params, super_claims};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::outbound_order::list_outbound_orders;

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.outbound_orders (
            id UUID PRIMARY KEY,
            organization_id UUID NOT NULL,
            order_number TEXT NOT NULL,
            warehouse_id UUID,
            warehouse_name TEXT,
            customer_id UUID,
            customer_name TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expected_ship_date TIMESTAMPTZ,
            actual_ship_date TIMESTAMPTZ,
            total_value FLOAT8 DEFAULT 0,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            sales_order_id UUID,
            sales_order_number TEXT,
            carrier TEXT,
            tracking_number TEXT,
            picked_quantity INT DEFAULT 0,
            packed_quantity INT DEFAULT 0,
            shipped_quantity FLOAT8 DEFAULT 0,
            created_by UUID,
            approved_by UUID,
            approved_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));

    let state = api_state(pool);
    let claims = super_claims();
    let resp = list_outbound_orders(
        State(state),
        Extension(claims),
        Query(empty_params()),
        Extension(txn_arc),
    )
    .await;
    let body: Value = resp
        .0
        .data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let mut txn = pool.begin().await.unwrap();
    sqlx::query(
        "INSERT INTO wms.outbound_orders (id, organization_id, order_number, customer_name, status) VALUES ($1, $2, $3, '客户A', 'pending')",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind("SO-20261007-001")
    .execute(&mut *txn)
    .await
    .unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));

    let state = api_state(pool);
    let claims = super_claims();
    let resp = list_outbound_orders(
        State(state),
        Extension(claims),
        Query(empty_params()),
        Extension(txn_arc),
    )
    .await;
    let body: Value = resp
        .0
        .data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert_eq!(body["total"], 1);
    assert_eq!(body["orders"][0]["order_number"], "SO-20261007-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let mut txn = pool.begin().await.unwrap();
    for (i, status) in ["pending", "shipped"].iter().enumerate() {
        sqlx::query(
            "INSERT INTO wms.outbound_orders (id, organization_id, order_number, status) VALUES ($1, $2, $3, $4)",
        )
        .bind(uuid::Uuid::new_v4())
        .bind(uuid::Uuid::new_v4())
        .bind(format!("SO-{i}"))
        .bind(status)
        .execute(&mut *txn)
        .await
        .unwrap();
    }
    let txn_arc = Arc::new(Mutex::new(Some(txn)));

    let mut params = empty_params();
    params.status = Some("shipped".to_string());
    let state = api_state(pool);
    let claims = super_claims();
    let resp = list_outbound_orders(
        State(state),
        Extension(claims),
        Query(params),
        Extension(txn_arc),
    )
    .await;
    let body: Value = resp
        .0
        .data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert_eq!(body["total"], 1);
    assert_eq!(body["orders"][0]["status"], "shipped");
}
