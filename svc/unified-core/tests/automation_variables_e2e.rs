#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：automation variables handler 集成测试。
//! 复用 AppState 工厂；覆盖 list/create/get/update/delete 全 handler。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state};
use axum::extract::{Json, Path, Query, State};
use axum::Extension;
use topems_unified_core::modules::automation::{
    create_variable, delete_variable, get_variable, list_variables, update_variable,
    AutomationVariable, CreateVariableRequest, UpdateVariableRequest, VariableQueryParams,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS automation_variables (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
            key VARCHAR(200) NOT NULL UNIQUE,
            value TEXT,
            description TEXT,
            scope VARCHAR(50) DEFAULT 'global',
            rule_id UUID,
            is_secret BOOLEAN DEFAULT false,
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn empty_params() -> VariableQueryParams {
    VariableQueryParams {
        page: None,
        page_size: None,
        page_size_alt: None,
        scope: None,
        rule_id: None,
        search: None,
    }
}

fn create_req(key: &str, value: &str) -> CreateVariableRequest {
    CreateVariableRequest {
        key: key.to_string(),
        value: value.to_string(),
        description: Some("测试变量".to_string()),
        scope: None,
        rule_id: None,
        is_secret: None,
    }
}


topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool);
    let resp = list_variables(State(state), Query(empty_params())).await;
    let body = resp.data.unwrap();
    assert_eq!(body.total, 0);
}

#[sqlx::test(migrations = false)]
async fn create_returns_variable(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = create_variable(
        State(state),
        Extension(claims),
        Json(create_req("api_key", "v1")),
    )
    .await;
    let var: AutomationVariable = resp.data.unwrap();
    assert_eq!(var.key, "api_key");
    assert_eq!(var.value.as_deref(), Some("v1"));
}

#[sqlx::test(migrations = false)]
async fn get_roundtrip(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool.clone());
    let claims = super_claims();
    let resp = create_variable(
        State(state),
        Extension(claims),
        Json(create_req("db_host", "localhost")),
    )
    .await;
    let var: AutomationVariable = resp.data.unwrap();

    let state = test_app_state(pool);
    let resp = get_variable(State(state), Path(var.key.clone())).await;
    let got: AutomationVariable = resp.data.unwrap();
    assert_eq!(got.key, "db_host");
}

#[sqlx::test(migrations = false)]
async fn update_changes_value(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool.clone());
    let claims = super_claims();
    let resp = create_variable(
        State(state),
        Extension(claims),
        Json(create_req("timeout", "30")),
    )
    .await;
    let var: AutomationVariable = resp.data.unwrap();

    let req = UpdateVariableRequest {
        value: Some("60".to_string()),
        description: None,
        scope: None,
        is_secret: None,
    };
    let state = test_app_state(pool);
    let resp = update_variable(State(state), Path(var.key), Json(req)).await;
    let updated: AutomationVariable = resp.data.unwrap();
    assert_eq!(updated.value.as_deref(), Some("60"));
}

#[sqlx::test(migrations = false)]
async fn delete_removes_variable(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool.clone());
    let claims = super_claims();
    let resp = create_variable(
        State(state),
        Extension(claims),
        Json(create_req("temp", "x")),
    )
    .await;
    let var: AutomationVariable = resp.data.unwrap();

    let state = test_app_state(pool.clone());
    let resp = delete_variable(State(state), Path(var.key.clone())).await;
    let deleted: serde_json::Value = resp.data.unwrap();
    assert_eq!(deleted["success"], serde_json::json!(true));

    let state = test_app_state(pool);
    let resp = get_variable(State(state), Path(var.key)).await;
    assert!(resp.data.is_none());
}
