#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms cycle_count list_cycle_count_configs handler 集成测试。
#![cfg(feature = "db-tests")]

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, tenant_claims, test_tenant};
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::{Extension, Json};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_shared_auth::middleware::tenant::{scope_request_tenant, RlsRequestTenant};
use topems_wms::models::inventory_alert::CreateCycleCountConfigRequest;
use topems_wms::modules::cycle_count::{
    create_cycle_count_config, list_cycle_count_configs, CycleCountQueryParams,
};

fn empty_params() -> CycleCountQueryParams {
    CycleCountQueryParams {
        page: None,
        page_size: None,
        warehouse_id: None,
        is_active: None,
    }
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.cycle_count_configs (
            id UUID PRIMARY KEY,
            warehouse_id UUID,
            location_id UUID,
            material_category TEXT,
            count_frequency TEXT,
            priority_level TEXT,
            last_count_date TIMESTAMPTZ,
            next_count_date TIMESTAMPTZ,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ,
            org_id UUID,
            tenant_id UUID,
            organization_id UUID
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
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

async fn body_of(pool: sqlx::PgPool, is_active: Option<bool>) -> Value {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = tenant_claims();
    let mut params = empty_params();
    params.is_active = is_active;
    let resp = list_cycle_count_configs(
        State(state),
        Extension(claims),
        HeaderMap::new(),
        Query(params),
        Extension(txn_arc),
    )
    .await;
    resp.data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message))
}

async fn insert_config(pool: &sqlx::PgPool, material_category: &str, is_active: bool) {
    sqlx::query(
        "INSERT INTO wms.cycle_count_configs (id, org_id, tenant_id, organization_id, warehouse_id, material_category, count_frequency, priority_level, next_count_date, is_active) VALUES ($1, $2, $2, $2, $3, $4, 'monthly', 'high', NOW(), $5)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(test_tenant())
    .bind(uuid::Uuid::new_v4())
    .bind(material_category)
    .bind(is_active)
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
    insert_config(&pool, "电子料", true).await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["configs"][0]["material_category"], "电子料");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_is_active(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_config(&pool, "电子料", true).await;
    insert_config(&pool, "包装料", false).await;

    let body = body_of(pool, Some(false)).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["configs"][0]["material_category"], "包装料");
}

#[sqlx::test(migrations = false)]
async fn create_config_takes_org_id_from_warehouse(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let tenant = test_tenant();
    let org_id = uuid::Uuid::new_v4();
    let warehouse_id = uuid::Uuid::new_v4();
    let mut txn = pool.begin().await.unwrap();
    sqlx::query("INSERT INTO wms.warehouses (id, tenant_id, org_id) VALUES ($1, $2, $3)")
        .bind(warehouse_id)
        .bind(tenant)
        .bind(org_id)
        .execute(&mut *txn)
        .await
        .unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));

    let req = CreateCycleCountConfigRequest {
        warehouse_id,
        location_id: None,
        material_category: None,
        count_frequency: "weekly".into(),
        priority_level: "normal".into(),
    };
    let resp = scope_request_tenant(
        RlsRequestTenant {
            tenant,
            system: false,
        },
        create_cycle_count_config(
            State(api_state(pool.clone())),
            Extension(tenant_claims()),
            HeaderMap::new(),
            Extension(txn_arc),
            Json(req),
        ),
    )
    .await;
    let config = resp
        .data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    assert_eq!(config.warehouse_id, warehouse_id);

    let row: (uuid::Uuid, uuid::Uuid, uuid::Uuid) = sqlx::query_as(
        "SELECT org_id, tenant_id, organization_id FROM wms.cycle_count_configs WHERE id = $1",
    )
    .bind(config.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(row.0, org_id);
    assert_eq!(row.1, tenant);
    assert_eq!(row.2, tenant);
}
