//! P1 补测（2026-10-07）：wms inbound_order list handler 集成测试。
//! 复用 common/api_state.rs 工厂；建表由 pg_dump 生产 DDL 自动生成（60 列）。

#[path = "common/api_state.rs"]
mod api_state;

use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::inbound_order::list_inbound_orders;
use api_state::{api_state, empty_params, super_claims};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.inbound_orders (
            id uuid,
            org_id uuid,
            order_number VARCHAR(100),
            order_type VARCHAR(50),
            reference_number VARCHAR(100),
            reference_type VARCHAR(50),
            warehouse_id uuid,
            warehouse_name VARCHAR(255),
            supplier_id uuid,
            supplier_name VARCHAR(255),
            supplier_code VARCHAR(100),
            purchase_order_id uuid,
            purchase_order_number VARCHAR(100),
            production_order_id uuid,
            production_order_number VARCHAR(100),
            customer_id uuid,
            customer_name VARCHAR(255),
            customer_order_number VARCHAR(100),
            expected_arrival_date TIMESTAMPTZ,
            actual_arrival_date TIMESTAMPTZ,
            arrival_time TIME,
            received_date TIMESTAMPTZ,
            received_time TIME,
            carrier VARCHAR(255),
            carrier_code VARCHAR(100),
            vehicle_number VARCHAR(100),
            driver_name VARCHAR(255),
            driver_phone text,
            total_items INT,
            total_quantity FLOAT8,
            received_quantity FLOAT8,
            rejected_quantity FLOAT8,
            total_weight FLOAT8,
            total_volume FLOAT8,
            total_value FLOAT8,
            priority VARCHAR(20),
            status VARCHAR(20),
            receiver VARCHAR(255),
            receiver_id uuid,
            receiving_team VARCHAR(100),
            inspection_required boolean,
            inspection_status VARCHAR(20),
            inspection_result VARCHAR(20),
            inspector VARCHAR(255),
            inspection_date TIMESTAMPTZ,
            quality_check_notes text,
            receiving_notes text,
            special_instructions text,
            attachments jsonb,
            notes text,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by uuid,
            updated_by uuid,
            deleted_at TIMESTAMPTZ,
            tenant_id uuid,
            approved_by uuid,
            approved_at TIMESTAMPTZ,
            order_date TIMESTAMPTZ,
            organization_id uuid
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, status: Option<String>) -> Value {
    let mut txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let mut params = empty_params();
    params.status = status;
    let resp = list_inbound_orders(State(state), Extension(claims), Query(params), Extension(txn_arc)).await;
    resp.0
        .data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message))
}

async fn insert_order(pool: &sqlx::PgPool, order_number: &str, status: &str) {
    let tid = uuid::Uuid::new_v4();
    sqlx::query(
        "INSERT INTO wms.inbound_orders (id, org_id, organization_id, order_number, order_type, status, order_date) VALUES ($1, $2, $2, $3, 'standard', $4, NOW())",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(tid)
    .bind(order_number)
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
    insert_order(&pool, "PO-20261007-001", "created").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["orders"][0]["order_number"], "PO-20261007-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_order(&pool, "PO-A", "created").await;
    insert_order(&pool, "PO-B", "received").await;

    let body = body_of(pool, Some("received".to_string())).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["orders"][0]["order_number"], "PO-B");
}
