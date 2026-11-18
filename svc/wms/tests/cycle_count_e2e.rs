#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms cycle_count list_cycle_count_configs handler 集成测试。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, tenant_claims, test_tenant};
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::cycle_count::{list_cycle_count_configs, CycleCountQueryParams};

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
