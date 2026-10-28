#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：unified-core tenant 模块集成测试。
//! 覆盖 core_tenants 的 list/create/get/get_by_code/delete。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::test_app_state;
use axum::extract::{Path, Query, State};
use axum::Json;
use serde_json::Value;
use topems_unified_core::modules::tenant::handlers::{
    create_tenant, delete_tenant, get_tenant, get_tenant_by_code, list_tenants,
};
use topems_unified_core::modules::tenant::models::{CreateTenantRequest, ListTenantsQuery};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core_tenants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            code VARCHAR(64) NOT NULL UNIQUE,
            tenant_type VARCHAR(32) DEFAULT 'shared',
            plan VARCHAR(32) DEFAULT 'basic',
            license_type VARCHAR(32) DEFAULT 'subscription',
            license_expires_at TIMESTAMPTZ,
            database_host VARCHAR(256),
            database_port INTEGER DEFAULT 5432,
            database_name VARCHAR(64),
            quota_users INTEGER DEFAULT 20,
            quota_storage_gb BIGINT DEFAULT 10,
            quota_api_calls BIGINT DEFAULT 100000,
            quota_plugins TEXT[],
            features JSONB DEFAULT '{}',
            status VARCHAR(32) DEFAULT 'trial',
            trial_expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            activated_at TIMESTAMPTZ,
            suspended_at TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn empty_query() -> ListTenantsQuery {
    ListTenantsQuery {
        page: None,
        page_size: None,
        search: None,
        status: None,
        plan: None,
    }
}

fn create_req(code: &str, name: &str) -> CreateTenantRequest {
    CreateTenantRequest {
        name: name.to_string(),
        code: code.to_string(),
        tenant_type: "shared".to_string(),
        plan: "pro".to_string(),
        license_type: "subscription".to_string(),
        license_expires_at: None,
        trial_expires_at: None,
    }
}

async fn create_via_handler(pool: &sqlx::PgPool, code: &str, name: &str) -> uuid::Uuid {
    let resp = create_tenant(
        State(test_app_state(pool.clone())),
        Json(create_req(code, name)),
    )
    .await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("create_tenant error: {:?}", resp.message));
    serde_json::to_value(data).unwrap()["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap()
}

#[sqlx::test(migrations = false)]
async fn list_empty(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let resp = list_tenants(State(test_app_state(pool)), Query(empty_query())).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let value: Value = serde_json::to_value(data).unwrap();
    assert_eq!(value["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn create_and_list(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = create_via_handler(&pool, "ten-alpha", "阿尔法租户").await;

    let resp = list_tenants(State(test_app_state(pool.clone())), Query(empty_query())).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let value: Value = serde_json::to_value(data).unwrap();
    assert_eq!(value["total"], 1);
    assert_eq!(value["items"][0]["id"].as_str().unwrap(), id.to_string());
    assert_eq!(value["items"][0]["name"], "阿尔法租户");
}

#[sqlx::test(migrations = false)]
async fn get_by_id(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = create_via_handler(&pool, "ten-beta", "贝塔租户").await;

    let resp = get_tenant(State(test_app_state(pool)), Path(id)).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("get_tenant error: {:?}", resp.message));
    let value: Value = serde_json::to_value(data).unwrap();
    assert_eq!(value["name"], "贝塔租户");
    assert_eq!(value["plan"], "pro");
}

#[sqlx::test(migrations = false)]
async fn get_by_code(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    create_via_handler(&pool, "ten-gamma", "伽马租户").await;

    let resp = get_tenant_by_code(State(test_app_state(pool)), Path("ten-gamma".to_string())).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("get_tenant_by_code error: {:?}", resp.message));
    let value: Value = serde_json::to_value(data).unwrap();
    assert_eq!(value["code"], "ten-gamma");
}

#[sqlx::test(migrations = false)]
async fn delete_removes(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = create_via_handler(&pool, "ten-tmp", "临时租户").await;

    let del = delete_tenant(State(test_app_state(pool.clone())), Path(id)).await;
    assert!(del.0.data.is_some(), "delete failed: {:?}", del.0.message);

    let resp = list_tenants(State(test_app_state(pool)), Query(empty_query())).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let value: Value = serde_json::to_value(data).unwrap();
    assert_eq!(value["total"], 0);
}
