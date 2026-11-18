#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：doc DocumentService + handlers 集成测试。
//! 复用 AppState 测试工厂；覆盖 list（超管全量/租户过滤/空表）、create 默认值、
//! get（存在/不存在）。建表去 FK（core_doc_documents，22 列 + deleted_at）。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, tenant_claims, test_app_state, test_txn_cell};
use axum::extract::{Json, Path, State};
use axum::Extension;
use topems_shared_auth::middleware::tenant::{rls_request_tenant, scope_request_tenant};
use topems_unified_core::modules::doc::handlers::{
    create_document, delete_document, get_document, get_document_version, list_document_versions,
    list_documents, restore_document_version, update_document,
};
use topems_unified_core::modules::doc::models::{
    CreateDocumentRequest, Document, DocumentVersion, UpdateDocumentRequest,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.core_doc_documents (
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

    // 版本表：与 public.core_doc_document_versions 权威结构一致（无 tenant_id、无 RLS）。
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.core_doc_document_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL,
            version INTEGER NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            summary VARCHAR(500),
            created_by VARCHAR(100) NOT NULL DEFAULT 'system',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (document_id, version)
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();

    // 恢复审计落 public.audit_logs；字段与权威表保持一致。
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            action VARCHAR(255) NOT NULL DEFAULT '',
            entity_type VARCHAR(50) NOT NULL DEFAULT '',
            entity_id UUID,
            entity_ids JSONB,
            user_id UUID,
            user_name TEXT,
            request_details JSONB,
            response_details JSONB,
            status VARCHAR(20) NOT NULL DEFAULT 'success',
            error_message TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            origin VARCHAR(20),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        "INSERT INTO public.core_doc_documents (id, tenant_id, title, created_by) VALUES ($1, $2, $3, 'test')",
    )
    .bind(id)
    .bind(uuid::Uuid::parse_str(tenant).unwrap())
    .bind(title)
    .execute(pool)
    .await
    .unwrap();
    id
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_empty(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let cell = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        list_documents(State(state), Extension(cell)),
    )
    .await;
    let docs: Vec<Document> = resp.data.unwrap();
    assert!(docs.is_empty());
}

#[sqlx::test(migrations = false)]
async fn list_superuser_sees_all_tenants(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_doc(&pool, TENANT_A, "doc-a").await;
    insert_doc(&pool, TENANT_B, "doc-b").await;

    let cell = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        list_documents(State(state), Extension(cell)),
    )
    .await;
    let docs: Vec<Document> = resp.data.unwrap();
    assert_eq!(docs.len(), 2);
}

#[sqlx::test(migrations = false)]
async fn list_tenant_sees_only_own(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_doc(&pool, TENANT_A, "doc-a").await;
    insert_doc(&pool, TENANT_B, "doc-b").await;

    let cell = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = tenant_claims();
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        list_documents(State(state), Extension(cell)),
    )
    .await;
    let docs: Vec<Document> = resp.data.unwrap();
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
    let doc: Document = resp.data.unwrap();
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

    let cell = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        get_document(State(state), Extension(cell), Path(id)),
    )
    .await;
    let doc: Option<Document> = resp.data.unwrap();
    assert!(doc.is_some());
    assert_eq!(doc.unwrap().title, "doc-a");
}

#[sqlx::test(migrations = false)]
async fn get_missing_returns_none(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let cell = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        get_document(State(state), Extension(cell), Path(uuid::Uuid::new_v4())),
    )
    .await;
    let doc: Option<Document> = resp.data.unwrap();
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
    let doc: Option<Document> = resp.data.unwrap();
    assert_eq!(doc.unwrap().title, "新标题");
}

#[sqlx::test(migrations = false)]
async fn delete_hides_from_list(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = insert_doc(&pool, "00000000-0000-0000-0000-000000000000", "to-delete").await;

    let state = test_app_state(pool.clone());
    let claims = super_claims();
    let resp = delete_document(State(state), Extension(claims), Path(id)).await;
    let deleted: bool = resp.data.unwrap();
    assert!(deleted);

    // 软删除后 list 不再返回
    let cell = test_txn_cell(&pool).await;
    let state = test_app_state(pool.clone());
    let claims = super_claims();
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        list_documents(State(state), Extension(cell)),
    )
    .await;
    let docs: Vec<Document> = resp.data.unwrap();
    assert!(docs.is_empty());
}

/// 验收主链路：保存 → 产生版本 → 列表可见 → 恢复到旧版本 →
/// 恢复动作自身留下版本记录 → 审计有记录。
#[sqlx::test(migrations = false)]
async fn version_history_restore_leaves_version_and_audit(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let claims = tenant_claims();
    let state = test_app_state(pool.clone());

    // 1) 新建文档即产生 v1
    let created = create_document(
        State(state.clone()),
        Extension(claims.clone()),
        Json(CreateDocumentRequest {
            title: "版本链路".to_string(),
            folder_id: None,
            template_id: None,
            content: Some("<p>v1</p>".to_string()),
            content_type: None,
            status: None,
            tags: None,
            description: None,
        }),
    )
    .await
    .data
    .unwrap();
    assert_eq!(created.version, Some(1));

    // 2) 版本列表可见 v1
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        list_document_versions(
            State(state.clone()),
            Extension(claims.clone()),
            Path(created.id),
        ),
    )
    .await;
    let versions: Vec<DocumentVersion> = resp.data.unwrap();
    assert_eq!(versions.len(), 1);
    assert_eq!(versions[0].version, 1);
    assert_eq!(versions[0].content, "<p>v1</p>");
    assert_eq!(versions[0].created_by, "tenant_user");

    // 3) 保存更新 → 追加 v2，旧内容不被覆盖
    let updated = update_document(
        State(state.clone()),
        Extension(claims.clone()),
        Path(created.id),
        Json(UpdateDocumentRequest {
            title: None,
            folder_id: None,
            content: Some("<p>v2</p>".to_string()),
            tags: None,
            description: None,
        }),
    )
    .await
    .data
    .unwrap()
    .unwrap();
    assert_eq!(updated.version, Some(2));
    assert_eq!(updated.content.as_deref(), Some("<p>v2</p>"));

    // 4) 单版本详情可读
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        get_document_version(
            State(state.clone()),
            Extension(claims.clone()),
            Path((created.id, 1)),
        ),
    )
    .await;
    let detail: DocumentVersion = resp.data.unwrap();
    assert_eq!(detail.content, "<p>v1</p>");

    // 5) 恢复到 v1
    let restore_resp = scope_request_tenant(
        rls_request_tenant(&claims),
        restore_document_version(
            State(state.clone()),
            Extension(claims.clone()),
            Path((created.id, 1)),
        ),
    )
    .await;
    assert!(
        restore_resp.success,
        "恢复失败：code={} message={}",
        restore_resp.code, restore_resp.message
    );
    let restored = restore_resp.data.unwrap();
    assert_eq!(restored.content.as_deref(), Some("<p>v1</p>"));
    assert_eq!(restored.version, Some(3));

    // 6) 恢复动作自身留在版本历史中
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        list_document_versions(
            State(state.clone()),
            Extension(claims.clone()),
            Path(created.id),
        ),
    )
    .await;
    let versions: Vec<DocumentVersion> = resp.data.unwrap();
    assert_eq!(versions.len(), 3);
    assert_eq!(versions[0].version, 3);
    assert_eq!(versions[0].content, "<p>v1</p>");
    assert_eq!(versions[0].summary.as_deref(), Some("恢复自版本 v1"));

    // 7) 审计有记录（同事务落库）
    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.audit_logs WHERE action = 'restore_version' AND entity_id = $1",
    )
    .bind(created.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(audit_count, 1);
}

/// 跨租户隔离：A 租户不能读取 B 租户文档的版本历史。
#[sqlx::test(migrations = false)]
async fn versions_are_tenant_scoped(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let doc_id = insert_doc(&pool, TENANT_B, "b-doc").await;
    sqlx::query(
        "INSERT INTO public.core_doc_document_versions (document_id, version, content, created_by) VALUES ($1, 1, 'secret', 'b-user')",
    )
    .bind(doc_id)
    .execute(&pool)
    .await
    .unwrap();

    let claims = tenant_claims();
    let state = test_app_state(pool.clone());
    let resp = scope_request_tenant(
        rls_request_tenant(&claims),
        list_document_versions(State(state), Extension(claims), Path(doc_id)),
    )
    .await;
    let versions: Vec<DocumentVersion> = resp.data.unwrap();
    assert!(versions.is_empty());
}
