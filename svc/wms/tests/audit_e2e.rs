#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：wms audit 模块集成测试。
//! 覆盖 list_audit_logs（空/计数）、get_audit_log、log_audit_event（写库）。
//! 建表对齐 AuditLog FromRow（SELECT 15 列，其余列可空）。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, tenant_claims, test_tenant};
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::audit::{
    get_audit_log, list_audit_logs, log_audit_event, ListAuditLogsQuery,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            action VARCHAR(100),
            entity_type TEXT,
            entity_id UUID,
            entity_ids JSONB,
            user_id TEXT,
            user_name TEXT,
            request_details JSONB,
            response_details JSONB,
            status VARCHAR(50),
            error_message TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            org_id UUID,
            organization_id UUID,
            resource VARCHAR(100),
            resource_id UUID,
            success BOOLEAN,
            details JSONB,
            new_values JSONB,
            old_values JSONB,
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    // log_audit_event 经 SchemaAware 解析 bare `audit_logs` 到 search_path 首表（测试库默认 public）。
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            action VARCHAR(100),
            entity_type TEXT,
            entity_id UUID,
            entity_ids JSONB,
            user_id TEXT,
            user_name TEXT,
            request_details JSONB,
            response_details JSONB,
            status VARCHAR(50),
            error_message TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            org_id UUID,
            organization_id UUID,
            resource VARCHAR(100),
            resource_id UUID,
            success BOOLEAN,
            details JSONB,
            new_values JSONB,
            old_values JSONB,
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn empty_params() -> ListAuditLogsQuery {
    ListAuditLogsQuery {
        action: None,
        entity_type: None,
        user_id: None,
        status: None,
        start_date: None,
        end_date: None,
        page: None,
        page_size: None,
    }
}

async fn insert_log(pool: &sqlx::PgPool, action: &str, status: &str) -> uuid::Uuid {
    let row: (uuid::Uuid,) = sqlx::query_as(
        r#"INSERT INTO wms.audit_logs (action, entity_type, status, user_name, user_id, tenant_id)
           VALUES ($1, 'inventory', $2, '张三', 'user-1', $3) RETURNING id"#,
    )
    .bind(action)
    .bind(status)
    .bind(test_tenant())
    .fetch_one(pool)
    .await
    .unwrap();
    row.0
}

async fn list_body(pool: sqlx::PgPool) -> Value {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let resp = list_audit_logs(
        State(state),
        Query(empty_params()),
        Extension(tenant_claims()),
        HeaderMap::new(),
        Extension(txn_arc),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    serde_json::to_value(data).unwrap()
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = list_body(pool).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_log(&pool, "create", "SUCCESS").await;

    let body = list_body(pool).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["audit_logs"][0]["action"], "create");
    assert_eq!(body["audit_logs"][0]["user_name"], "张三");
}

#[sqlx::test(migrations = false)]
async fn get_returns_log(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = insert_log(&pool, "update", "SUCCESS").await;

    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let resp = get_audit_log(
        State(state),
        Path(id),
        Extension(tenant_claims()),
        HeaderMap::new(),
        Extension(txn_arc),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let log = serde_json::to_value(data).unwrap();
    assert_eq!(log["action"], "update");
    assert_eq!(log["status"], "SUCCESS");
}

#[sqlx::test(migrations = false)]
async fn log_event_creates_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    log_audit_event(
        &pool,
        "create".to_string(),
        "inventory".to_string(),
        Some(uuid::Uuid::new_v4()),
        None,
        Some("user-1".to_string()),
        Some("李四".to_string()),
        None,
        None,
        "SUCCESS".to_string(),
        None,
        &HeaderMap::new(),
    )
    .await;

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM public.audit_logs")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);
    let (action, user_name): (String, Option<String>) =
        sqlx::query_as("SELECT action, user_name FROM public.audit_logs")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(action, "create");
    assert_eq!(user_name.as_deref(), Some("李四"));
}
