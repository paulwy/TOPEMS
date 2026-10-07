#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：doc DocumentService + handlers 集成测试。
//! 复用 AppState 测试工厂；覆盖 list（超管全量/租户过滤/空表）、create 默认值、
//! get（存在/不存在）。建表去 FK（core_doc_documents，22 列 + deleted_at）。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, tenant_claims, test_app_state};
use axum::extract::{Json, Path, State};
use axum::Extension;
use topems_unified_core::modules::doc::handlers::{
    create_document, delete_document, get_document, list_documents, update_document,
};
use topems_unified_core::modules::doc::models::{
    CreateDocumentRequest, Document, UpdateDocumentRequest,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core_doc_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            title VARCHAR(200) NOT NULL,
            folder_id UUID,
            template_id UUID,
            content TEXT,
            content_type VARCHAR(50) DEFAULT 'html',
            status VARCHAR(20) DEFAULT 'draft',
            version INTEGER DEFAULT 1,
            tags TEXT[],
            description TEXT,
            file_name VARCHAR(200),
            file_path VARCHAR(500),
            file_size BIGINT,
            mime_type VARCHAR(100),
            published_at TIMESTAMPTZ,
            published_by VARCHAR(100),
            archived_at TIMESTAMPTZ,
            archived_by VARCHAR(100),
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

const TENANT_A: &str = "00000000-0000-0000-0000-000000000009";
const TENANT_B: &str = "00000000-0000-0000-0000-00000000000b";

async fn insert_doc(pool: &sqlx::PgPool, tenant: &str, title: &str) -> uuid::Uuid {
    let id = uuid::Uuid::new_v4();
    sqlx::query(
        "INSERT INTO core_doc_documents (id, tenant_id, title, created_by) VALUES ($1, $2, $3, 'test')",
    )
    .bind(id)
    .bind(uuid::Uuid::parse_str(tenant).unwrap())
    .bind(title)
    .execute(pool)
    .await
    .unwrap();
    id
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_empty(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = list_documents(State(state), Extension(claims)).await;
    let docs: Vec<Document> = resp.0.data.unwrap();
    assert!(docs.is_empty());
}

#[sqlx::test(migrations = false)]
async fn list_superuser_sees_all_tenants(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_doc(&pool, TENANT_A, "doc-a").await;
    insert_doc(&pool, TENANT_B, "doc-b").await;

    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = list_documents(State(state), Extension(claims)).await;
    let docs: Vec<Document> = resp.0.data.unwrap();
    assert_eq!(docs.len(), 2);
}

#[sqlx::test(migrations = false)]
async fn list_tenant_sees_only_own(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_doc(&pool, TENANT_A, "doc-a").await;
    insert_doc(&pool, TENANT_B, "doc-b").await;

    let state = test_app_state(pool);
    let claims = tenant_claims();
    let resp = list_documents(State(state), Extension(claims)).await;
    let docs: Vec<Document> = resp.0.data.unwrap();
    assert_eq!(docs.len(), 1);
    assert_eq!(docs[0].tenant_id.to_string(), TENANT_A);
}

#[sqlx::test(migrations = false)]
async fn create_applies_defaults(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let req = CreateDocumentRequest {
        title: "测试文档".to_string(),
        folder_id: None,
        template_id: None,
        content: Some("<p>hi</p>".to_string()),
        content_type: None,
        status: None,
        tags: Some(vec!["tag1".to_string()]),
        description: None,
    };
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = create_document(State(state), Extension(claims), Json(req)).await;
    let doc: Document = resp.0.data.unwrap();
    assert_eq!(doc.title, "测试文档");
    assert_eq!(doc.status.as_deref(), Some("draft"));
    assert_eq!(doc.content_type.as_deref(), Some("html"));
    assert_eq!(doc.version, Some(1));
    assert_eq!(doc.tags, Some(vec!["tag1".to_string()]));
}

#[sqlx::test(migrations = false)]
async fn get_returns_document(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = insert_doc(&pool, TENANT_A, "doc-a").await;

    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = get_document(State(state), Extension(claims), Path(id)).await;
    let doc: Option<Document> = resp.0.data.unwrap();
    assert!(doc.is_some());
    assert_eq!(doc.unwrap().title, "doc-a");
}

#[sqlx::test(migrations = false)]
async fn get_missing_returns_none(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = get_document(State(state), Extension(claims), Path(uuid::Uuid::new_v4())).await;
    let doc: Option<Document> = resp.0.data.unwrap();
    assert!(doc.is_none());
}

#[sqlx::test(migrations = false)]
async fn update_changes_title(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = insert_doc(&pool, "00000000-0000-0000-0000-000000000000", "旧标题").await;

    let req = UpdateDocumentRequest {
        title: Some("新标题".to_string()),
        folder_id: None,
        content: None,
        tags: None,
        description: None,
    };
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = update_document(State(state), Extension(claims), Path(id), Json(req)).await;
    let doc: Option<Document> = resp.0.data.unwrap();
    assert_eq!(doc.unwrap().title, "新标题");
}

#[sqlx::test(migrations = false)]
async fn delete_hides_from_list(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = insert_doc(&pool, "00000000-0000-0000-0000-000000000000", "to-delete").await;

    let state = test_app_state(pool.clone());
    let claims = super_claims();
    let resp = delete_document(State(state), Extension(claims), Path(id)).await;
    let deleted: bool = resp.0.data.unwrap();
    assert!(deleted);

    // 软删除后 list 不再返回
    let state = test_app_state(pool.clone());
    let claims = super_claims();
    let resp = list_documents(State(state), Extension(claims)).await;
    let docs: Vec<Document> = resp.0.data.unwrap();
    assert!(docs.is_empty());
}
