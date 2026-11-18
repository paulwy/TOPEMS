#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms discrepancy list_discrepancies handler 集成测试。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, tenant_claims, test_tenant};
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::discrepancy::{list_discrepancies, DiscrepancyQueryParams};

fn empty_params() -> DiscrepancyQueryParams {
    DiscrepancyQueryParams {
        page: None,
        page_size: None,
        stock_take_id: None,
        adjustment_status: None,
    }
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.discrepancy_records (
            id UUID PRIMARY KEY,
            tenant_id UUID,
            org_id UUID,
            stock_take_id UUID,
            stock_take_item_id UUID,
            inventory_id UUID,
            material_code TEXT,
            material_name TEXT,
            system_quantity FLOAT8,
            counted_quantity FLOAT8,
            discrepancy_quantity FLOAT8,
            discrepancy_type TEXT,
            expected_quantity FLOAT8,
            actual_quantity FLOAT8,
            adjustment_quantity FLOAT8,
            adjustment_status TEXT,
            approved_by UUID,
            approval_date TIMESTAMPTZ,
            adjustment_date TIMESTAMPTZ,
            reason TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, adjustment_status: Option<String>) -> Value {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = tenant_claims();
    let mut params = empty_params();
    params.adjustment_status = adjustment_status;
    let resp = list_discrepancies(
        State(state),
        Extension(claims),
        Query(params),
        HeaderMap::new(),
        Extension(txn_arc),
    )
    .await;
    resp.data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message))
}

async fn insert_disc(pool: &sqlx::PgPool, material_code: &str, adjustment_status: &str) {
    sqlx::query(
        "INSERT INTO wms.discrepancy_records (id, tenant_id, org_id, stock_take_id, stock_take_item_id, inventory_id, material_code, material_name, system_quantity, counted_quantity, discrepancy_quantity, discrepancy_type, adjustment_status) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, 100, 95, -5, 'quantity_diff', $8)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(test_tenant())
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind(material_code)
    .bind(format!("物料-{material_code}"))
    .bind(adjustment_status)
    .execute(pool).await.unwrap();
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_disc(&pool, "M001", "pending").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["records"][0]["material_code"], "M001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_disc(&pool, "M-A", "pending").await;
    insert_disc(&pool, "M-B", "approved").await;

    let body = body_of(pool, Some("approved".to_string())).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["records"][0]["material_code"], "M-B");
}
