#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms inventory list handler 集成测试。
//! 复用 common/api_state.rs 工厂；覆盖空表/有数据/warehouse_id 过滤。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, super_claims};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_shared_core::response::ListResponse;
use topems_wms::modules::inventory::{list_inventory, InventoryPaginationParams};

fn empty_params() -> InventoryPaginationParams {
    InventoryPaginationParams {
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
        r#"CREATE TABLE IF NOT EXISTS wms.inventory (
            id UUID PRIMARY KEY,
            material_code TEXT,
            material_name TEXT,
            specification TEXT,
            unit TEXT,
            quantity NUMERIC(15,2) DEFAULT 0,
            available_quantity NUMERIC(15,2) DEFAULT 0,
            reserved_quantity NUMERIC(15,2) DEFAULT 0,
            location_id UUID,
            warehouse_id UUID,
            min_quantity NUMERIC(15,2) DEFAULT 0,
            max_quantity NUMERIC(15,2) DEFAULT 0,
            reorder_point NUMERIC(15,2) DEFAULT 0,
            quality_status TEXT,
            batch_number TEXT,
            lot_number TEXT,
            expiry_date TIMESTAMPTZ,
            supplier_name TEXT,
            total_value NUMERIC(15,2) DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, warehouse_id: Option<uuid::Uuid>) -> ListResponse<Value> {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let mut params = empty_params();
    params.warehouse_id = warehouse_id;
    let resp = list_inventory(
        State(state),
        Extension(claims),
        Query(params),
        Extension(txn_arc),
    )
    .await;
    resp.data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message))
}

async fn insert_inventory(pool: &sqlx::PgPool, material_code: &str, warehouse_id: uuid::Uuid) {
    sqlx::query(
        "INSERT INTO wms.inventory (id, material_code, material_name, quantity, quality_status, warehouse_id) VALUES ($1, $2, $3, 100, 'qualified', $4)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(material_code)
    .bind(format!("物料-{material_code}"))
    .bind(warehouse_id)
    .execute(pool)
    .await
    .unwrap();
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = body_of(pool, None).await;
    assert_eq!(body.total, 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_inventory(&pool, "M001", uuid::Uuid::new_v4()).await;

    let body = body_of(pool, None).await;
    assert_eq!(body.total, 1);
    assert_eq!(body.items[0]["sku"], "M001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_warehouse(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let wh_a = uuid::Uuid::new_v4();
    let wh_b = uuid::Uuid::new_v4();
    insert_inventory(&pool, "M-A", wh_a).await;
    insert_inventory(&pool, "M-B", wh_b).await;

    let body = body_of(pool, Some(wh_a)).await;
    assert_eq!(body.total, 1);
    assert_eq!(body.items[0]["sku"], "M-A");
}
