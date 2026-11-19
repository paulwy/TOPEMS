#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：unified-core system_audit 模块集成测试。
//! 覆盖 list_audit_logs / get_audit_log / export_audit_logs / get_audit_stats。
#![cfg(feature = "db-tests")]

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{test_app_state, test_txn_cell};
use axum::extract::{Extension, Path, Query, State};
use serde_json::Value;
use topems_unified_core::modules::system_audit::{
    export_audit_logs, get_audit_log, get_audit_stats, list_audit_logs, AuditLogQueryParams,
    AuditStatsParams,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            action VARCHAR(100),
            entity_type TEXT,
            entity_id UUID,
            entity_ids JSONB,
            user_id UUID,
            user_name TEXT,
            request_details JSONB,
            response_details JSONB,
            status VARCHAR(50),
            error_message TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn empty_params() -> AuditLogQueryParams {
    AuditLogQueryParams {
        page: None,
        page_size: None,
        user_id: None,
        user_name: None,
        action: None,
        entity_type: None,
        start_date: None,
        end_date: None,
        status: None,
        search: None,
    }
}

async fn insert_log(pool: &sqlx::PgPool, action: &str) -> uuid::Uuid {
    let row: (uuid::Uuid,) = sqlx::query_as(
        r#"INSERT INTO audit_logs (action, entity_type, status, user_id, user_name)
           VALUES ($1, 'system', 'SUCCESS', gen_random_uuid(), '张三') RETURNING id"#,
    )
    .bind(action)
    .fetch_one(pool)
    .await
    .unwrap();
    row.0
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let resp = list_audit_logs(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool)),
        Query(empty_params()),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    assert_eq!(data.total, 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_log(&pool, "create").await;

    let resp = list_audit_logs(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool.clone())),
        Query(empty_params()),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    assert_eq!(data.total, 1);
    let items = serde_json::to_value(data.items).unwrap();
    assert_eq!(items[0]["action"], "create");
}

#[sqlx::test(migrations = false)]
async fn get_returns_log(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = insert_log(&pool, "update").await;

    let resp = get_audit_log(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool)),
        Path(id),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let log = serde_json::to_value(data).unwrap();
    assert_eq!(log["action"], "update");
    assert_eq!(log["user_name"], "张三");
}

#[sqlx::test(migrations = false)]
async fn export_returns_csv_rows(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_log(&pool, "create").await;

    let resp = export_audit_logs(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool)),
        Query(empty_params()),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    assert!(data["data"].is_array());
    assert_eq!(data["data"].as_array().unwrap().len(), 1);
}

#[sqlx::test(migrations = false)]
async fn stats_groups_by_action(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_log(&pool, "create").await;
    insert_log(&pool, "update").await;

    let params = AuditStatsParams {
        start_date: None,
        end_date: None,
        group_by: Some("action".to_string()),
    };
    let resp = get_audit_stats(
        Extension(test_txn_cell(&pool).await),
        State(test_app_state(pool)),
        Query(params),
    )
    .await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let value: Value = serde_json::to_value(data).unwrap();
    assert!(value["total"].as_i64().unwrap_or(0) >= 2);
}
