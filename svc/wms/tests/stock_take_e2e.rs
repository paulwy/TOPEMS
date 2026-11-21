#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms stock_take list handler 集成测试。
//! 复用 common/api_state.rs 工厂；覆盖空表/有数据/warehouse_id 过滤。
#![cfg(feature = "db-tests")]

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, super_claims, tenant_claims, test_tenant};
use axum::extract::{Path, Query, State};
use axum::Extension;
use axum::Json;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::models::stock_take::{CreateStockTakeItemRequest, CreateStockTakeRequest};
use topems_wms::modules::stock_take::StockTakePaginationParams;
use topems_wms::modules::stock_take::{
    create_stock_take, create_stock_take_item, list_stock_takes,
};

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
            organization_id UUID,
            tenant_id UUID,
            org_id UUID NOT NULL,
            start_time TIMESTAMPTZ,
            end_time TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.stock_take_items (
            id UUID PRIMARY KEY,
            organization_id UUID,
            stock_take_id UUID NOT NULL,
            material_code TEXT NOT NULL,
            material_name TEXT,
            specification TEXT,
            batch_number TEXT,
            location_id UUID,
            system_quantity FLOAT8,
            counted_quantity FLOAT8,
            discrepancy_quantity FLOAT8,
            discrepancy_type TEXT,
            unit TEXT,
            unit_price NUMERIC,
            discrepancy_value NUMERIC,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            tenant_id UUID,
            org_id UUID NOT NULL
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn setup_warehouses(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.warehouses (
            id UUID PRIMARY KEY,
            tenant_id UUID,
            org_id UUID NOT NULL,
            deleted_at TIMESTAMPTZ
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
    resp.data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message))
}

topems_test_support::sqlx_dsn_guard!();
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
        "INSERT INTO wms.stock_takes (id, stock_take_number, status, warehouse_id, tenant_id, org_id) VALUES ($1, $2, 'pending', $3, $4, $4)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind("ST-20261007-001")
    .bind(uuid::Uuid::new_v4())
    .bind(test_tenant())
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
            "INSERT INTO wms.stock_takes (id, stock_take_number, status, warehouse_id, tenant_id, org_id) VALUES ($1, $2, 'pending', $3, $4, $4)",
        )
        .bind(uuid::Uuid::new_v4())
        .bind(format!("ST-{i}"))
        .bind(wh)
        .bind(test_tenant())
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

#[sqlx::test(migrations = false)]
async fn create_stock_take_without_warehouse_falls_back_to_tenant(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let tenant = test_tenant();
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let req = CreateStockTakeRequest {
        warehouse_id: None,
        location_id: None,
        stock_take_number: "ST-FALLBACK".to_string(),
        remarks: None,
    };
    let resp = topems_shared_auth::middleware::tenant::scope_request_tenant(
        topems_shared_auth::middleware::tenant::RlsRequestTenant {
            tenant,
            system: false,
        },
        create_stock_take(
            State(api_state(pool.clone())),
            Extension(tenant_claims()),
            axum::http::HeaderMap::new(),
            Extension(txn_arc),
            Json(req),
        ),
    )
    .await;
    let take = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let row: (uuid::Uuid, uuid::Uuid, uuid::Uuid) = sqlx::query_as(
        "SELECT org_id, organization_id, tenant_id FROM wms.stock_takes WHERE id = $1",
    )
    .bind(take.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(row.0, tenant);
    assert_eq!(row.1, tenant);
    assert_eq!(row.2, tenant);
}

#[sqlx::test(migrations = false)]
async fn create_stock_take_takes_org_id_from_warehouse(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    setup_warehouses(&pool).await;
    let tenant = test_tenant();
    let org_id = uuid::Uuid::new_v4();
    let warehouse_id = uuid::Uuid::new_v4();
    sqlx::query("INSERT INTO wms.warehouses (id, tenant_id, org_id) VALUES ($1, $2, $3)")
        .bind(warehouse_id)
        .bind(tenant)
        .bind(org_id)
        .execute(&pool)
        .await
        .unwrap();
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let req = CreateStockTakeRequest {
        warehouse_id: Some(warehouse_id),
        location_id: None,
        stock_take_number: "ST-WH".to_string(),
        remarks: None,
    };
    let resp = topems_shared_auth::middleware::tenant::scope_request_tenant(
        topems_shared_auth::middleware::tenant::RlsRequestTenant {
            tenant,
            system: false,
        },
        create_stock_take(
            State(api_state(pool.clone())),
            Extension(tenant_claims()),
            axum::http::HeaderMap::new(),
            Extension(txn_arc),
            Json(req),
        ),
    )
    .await;
    let take = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let row: (uuid::Uuid, uuid::Uuid, uuid::Uuid) = sqlx::query_as(
        "SELECT org_id, organization_id, tenant_id FROM wms.stock_takes WHERE id = $1",
    )
    .bind(take.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(row.0, org_id);
    assert_eq!(row.1, tenant);
    assert_eq!(row.2, tenant);
}

#[sqlx::test(migrations = false)]
async fn create_stock_take_item_inherits_org_id_from_header(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let tenant = test_tenant();
    let org_id = uuid::Uuid::new_v4();
    let take_id = uuid::Uuid::new_v4();
    sqlx::query(
        "INSERT INTO wms.stock_takes (id, stock_take_number, status, tenant_id, organization_id, org_id) VALUES ($1, 'ST-ITEM', 'in_progress', $2, $2, $3)",
    )
    .bind(take_id)
    .bind(tenant)
    .bind(org_id)
    .execute(&pool)
    .await
    .unwrap();
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let req = CreateStockTakeItemRequest {
        inventory_item_id: uuid::Uuid::new_v4(),
        expected_quantity: 10.0,
        actual_quantity: Some(9.0),
        remarks: None,
    };
    let resp = topems_shared_auth::middleware::tenant::scope_request_tenant(
        topems_shared_auth::middleware::tenant::RlsRequestTenant {
            tenant,
            system: false,
        },
        create_stock_take_item(
            State(api_state(pool.clone())),
            Extension(tenant_claims()),
            Path(take_id),
            axum::http::HeaderMap::new(),
            Extension(txn_arc),
            Json(req),
        ),
    )
    .await;
    assert_eq!(resp.code, 200, "handler error: {:?}", resp.message);
    let row: (uuid::Uuid, uuid::Uuid) = sqlx::query_as(
        "SELECT org_id, tenant_id FROM wms.stock_take_items WHERE stock_take_id = $1",
    )
    .bind(take_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(row.0, org_id);
    assert_eq!(row.1, tenant);
}
