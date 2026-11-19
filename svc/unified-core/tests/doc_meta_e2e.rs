#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：doc templates/folders handler 集成测试。
//! 复用 AppState 工厂；覆盖 list/create/get（templates）+ list/create（folders）。
//! 建表自建（无 FK）。
#![cfg(feature = "db-tests")]

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state, test_txn_cell};
use axum::extract::{Json, Path, State};
use axum::Extension;
use topems_shared_auth::middleware::tenant::{rls_request_tenant, scope_request_tenant};
use topems_unified_core::modules::doc::handlers::{
    create_folder, create_template, get_template, list_folders, list_templates,
};
use topems_unified_core::modules::doc::models::{
    CreateFolderRequest, CreateTemplateRequest, Folder, Template,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core_doc_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
            name VARCHAR(200) NOT NULL,
            category VARCHAR(100),
            description TEXT,
            content TEXT NOT NULL DEFAULT '',
            content_type VARCHAR(50) DEFAULT 'html',
            fields JSONB,
            is_enabled BOOLEAN DEFAULT true,
            is_default BOOLEAN DEFAULT false,
            created_by VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core_doc_folders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
            name VARCHAR(200) NOT NULL,
            parent_id UUID,
            description TEXT,
            sort_order INT DEFAULT 0,
            is_enabled BOOLEAN DEFAULT true,
            created_by VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMP
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn template_req(name: &str) -> CreateTemplateRequest {
    CreateTemplateRequest {
        name: name.to_string(),
        category: Some("通用".to_string()),
        description: Some("测试模板".to_string()),
        content: "<div/>".to_string(),
        content_type: None,
        fields: None,
        is_enabled: None,
        is_default: None,
    }
}

fn folder_req(name: &str) -> CreateFolderRequest {
    CreateFolderRequest {
        name: name.to_string(),
        parent_id: None,
        description: None,
        sort_order: None,
        is_enabled: None,
    }
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_templates_empty(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let cell = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        list_templates(State(state), Extension(cell)),
    )
    .await;
    let items: Vec<Template> = resp.data.unwrap();
    assert!(items.is_empty());
}

#[sqlx::test(migrations = false)]
async fn create_template_returns(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = create_template(
        State(state),
        Extension(claims),
        Json(template_req("报销模板")),
    )
    .await;
    let tpl: Template = resp.data.unwrap();
    assert_eq!(tpl.name, "报销模板");
    assert_eq!(tpl.category.as_deref(), Some("通用"));
}

#[sqlx::test(migrations = false)]
async fn get_template_roundtrip(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool.clone());
    let claims = super_claims();
    let resp = create_template(
        State(state),
        Extension(claims),
        Json(template_req("合同模板")),
    )
    .await;
    let tpl: Template = resp.data.unwrap();

    let cell = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        get_template(State(state), Extension(cell), Path(tpl.id)),
    )
    .await;
    let got: Option<Template> = resp.data.unwrap();
    assert!(got.is_some());
    assert_eq!(got.unwrap().id, tpl.id);
}

#[sqlx::test(migrations = false)]
async fn list_folders_empty(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let cell = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        list_folders(State(state), Extension(cell)),
    )
    .await;
    let items: Vec<Folder> = resp.data.unwrap();
    assert!(items.is_empty());
}

#[sqlx::test(migrations = false)]
async fn create_folder_returns(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = create_folder(State(state), Extension(claims), Json(folder_req("财务"))).await;
    let folder: Folder = resp.data.unwrap();
    assert_eq!(folder.name, "财务");
}
