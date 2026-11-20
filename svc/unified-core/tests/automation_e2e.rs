#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：automation 模块集成测试（0/618 盲区）。
//! 复用 AppState 工厂；覆盖 list/create/get/enable/disable/delete 全 handler。
//! 建表自建（迁移无 DDL），列名对齐 AutomationRule FromRow。
#![cfg(feature = "db-tests")]

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{tenant_claims, test_app_state};
use axum::extract::{Json, Path, Query, State};
use axum::Extension;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_shared_auth::middleware::tenant::{
    rls_request_tenant, scope_request_tenant, RlsRequestTenant, RlsTxnCell,
};
use topems_unified_core::modules::automation::{
    create_rule, delete_rule, disable_rule, duplicate_rule, enable_rule, get_rule,
    get_rule_by_code, list_rules, update_rule, AutomationRule, CreateRuleRequest, RuleQueryParams,
    UpdateRuleRequest,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS automation_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
            name VARCHAR(200) NOT NULL,
            code VARCHAR(100) NOT NULL,
            description TEXT,
            trigger JSONB NOT NULL DEFAULT '{}',
            action JSONB NOT NULL DEFAULT '{}',
            on_success JSONB,
            on_error JSONB,
            canvas JSONB,
            status VARCHAR(20) DEFAULT 'draft',
            last_run_at TIMESTAMPTZ,
            run_count INT DEFAULT 0,
            success_count INT DEFAULT 0,
            failed_count INT DEFAULT 0,
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn rls_scope(pool: &sqlx::PgPool) -> (RlsTxnCell, RlsRequestTenant) {
    let tx = pool.begin().await.unwrap();
    let cell: RlsTxnCell = Arc::new(Mutex::new(Some(tx)));
    (cell, rls_request_tenant(&tenant_claims()))
}

async fn commit_scope(cell: &RlsTxnCell) {
    let mut guard = cell.lock().await;
    if let Some(tx) = guard.take() {
        tx.commit().await.unwrap();
    }
}

fn empty_params() -> RuleQueryParams {
    RuleQueryParams {
        page: None,
        page_size: None,
        page_size_alt: None,
        search: None,
        status: None,
        trigger_type: None,
    }
}

fn create_req(name: &str, code: &str) -> CreateRuleRequest {
    CreateRuleRequest {
        name: name.to_string(),
        code: code.to_string(),
        description: Some("测试规则".to_string()),
        trigger: serde_json::json!({"type": "manual"}),
        action: serde_json::json!({"type": "notify"}),
        on_success: None,
        on_error: None,
        canvas: None,
        status: None,
    }
}

async fn create_via_handler(pool: sqlx::PgPool, name: &str, code: &str) -> AutomationRule {
    let (cell, ctx) = rls_scope(&pool).await;
    let cell_clone = cell.clone();
    let state = test_app_state(pool);
    let claims = tenant_claims();
    let resp = scope_request_tenant(
        ctx,
        create_rule(
            State(state),
            Extension(cell),
            Extension(claims),
            Json(create_req(name, code)),
        ),
    )
    .await;
    commit_scope(&cell_clone).await;
    resp.data.unwrap()
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        list_rules(State(state), Extension(cell), Query(empty_params())),
    )
    .await;
    let body = resp.data.unwrap();
    assert_eq!(body.total, 0);
}

#[sqlx::test(migrations = false)]
async fn create_applies_defaults(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let (cell, ctx) = rls_scope(&pool).await;
    let cell_clone = cell.clone();
    let state = test_app_state(pool);
    let claims = tenant_claims();
    let resp = scope_request_tenant(
        ctx,
        create_rule(
            State(state),
            Extension(cell),
            Extension(claims),
            Json(create_req("规则A", "RULE_A")),
        ),
    )
    .await;
    commit_scope(&cell_clone).await;
    let rule: AutomationRule = resp.data.unwrap();
    assert_eq!(rule.name, "规则A");
    assert_eq!(rule.code, "RULE_A");
    assert_eq!(rule.status, "draft");
    assert_eq!(
        rule.created_by,
        // 与 tenant_claims().sub 对齐（超管 sub 为 ...0001，租户用户为 ...0002）
        Some(uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap())
    );
}

#[sqlx::test(migrations = false)]
async fn list_counts_created(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    create_via_handler(pool.clone(), "规则A", "RULE_A").await;
    create_via_handler(pool.clone(), "规则B", "RULE_B").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        list_rules(State(state), Extension(cell), Query(empty_params())),
    )
    .await;
    let body = resp.data.unwrap();
    assert_eq!(body.total, 2);
    assert_eq!(body.items.len(), 2);
}

#[sqlx::test(migrations = false)]
async fn get_returns_rule(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rule = create_via_handler(pool.clone(), "规则A", "RULE_A").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp =
        scope_request_tenant(ctx, get_rule(State(state), Extension(cell), Path(rule.id))).await;
    let got: AutomationRule = resp.data.unwrap();
    assert_eq!(got.id, rule.id);
    assert_eq!(got.name, "规则A");
}

#[sqlx::test(migrations = false)]
async fn get_missing_returns_none(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        get_rule(State(state), Extension(cell), Path(uuid::Uuid::new_v4())),
    )
    .await;
    assert!(resp.data.is_none());
}

#[sqlx::test(migrations = false)]
async fn enable_switches_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rule = create_via_handler(pool.clone(), "规则A", "RULE_A").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        enable_rule(State(state), Extension(cell), Path(rule.id)),
    )
    .await;
    let got: AutomationRule = resp.data.unwrap();
    assert_eq!(got.status, "enabled");
}

#[sqlx::test(migrations = false)]
async fn disable_switches_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rule = create_via_handler(pool.clone(), "规则A", "RULE_A").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        disable_rule(State(state), Extension(cell), Path(rule.id)),
    )
    .await;
    let got: AutomationRule = resp.data.unwrap();
    assert_eq!(got.status, "disabled");
}

#[sqlx::test(migrations = false)]
async fn delete_removes_rule(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rule = create_via_handler(pool.clone(), "规则A", "RULE_A").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let cell_clone = cell.clone();
    let state = test_app_state(pool.clone());
    let resp = scope_request_tenant(
        ctx,
        delete_rule(State(state), Extension(cell), Path(rule.id)),
    )
    .await;
    let deleted: serde_json::Value = resp.data.unwrap();
    assert_eq!(deleted["success"], serde_json::json!(true));
    commit_scope(&cell_clone).await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool.clone());
    let resp =
        scope_request_tenant(ctx, get_rule(State(state), Extension(cell), Path(rule.id))).await;
    assert!(resp.data.is_none());
}

#[sqlx::test(migrations = false)]
async fn get_by_code_returns_rule(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rule = create_via_handler(pool.clone(), "规则A", "RULE_A").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        get_rule_by_code(State(state), Extension(cell), Path("RULE_A".to_string())),
    )
    .await;
    let got: AutomationRule = resp.data.unwrap();
    assert_eq!(got.id, rule.id);
    assert_eq!(got.name, "规则A");
}

#[sqlx::test(migrations = false)]
async fn update_rule_fields(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rule = create_via_handler(pool.clone(), "规则A", "RULE_A").await;

    let payload = UpdateRuleRequest {
        name: Some("规则A-改".to_string()),
        description: None,
        trigger: None,
        action: None,
        on_success: None,
        on_error: None,
        canvas: None,
        status: Some("enabled".to_string()),
    };
    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        update_rule(State(state), Extension(cell), Path(rule.id), Json(payload)),
    )
    .await;
    let got: AutomationRule = resp.data.unwrap();
    assert_eq!(got.name, "规则A-改");
    assert_eq!(got.status, "enabled");
}

#[sqlx::test(migrations = false)]
async fn duplicate_creates_copy(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rule = create_via_handler(pool.clone(), "规则A", "RULE_A").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        duplicate_rule(State(state), Extension(cell), Path(rule.id)),
    )
    .await;
    let copy: AutomationRule = resp.data.unwrap();
    assert_ne!(copy.id, rule.id);
    assert!(copy.name.contains("副本"));
    assert!(copy.code.contains("_copy_"));
    assert_eq!(copy.status, "draft");
}
