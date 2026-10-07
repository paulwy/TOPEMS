//! P1 补测（2026-10-07）：wms sync_records list handler 集成测试。
//! 超管 Claims tenant_id=None → 查询用全零 UUID 匹配，insert 需 tenant_id=nil。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, super_claims};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::sync_records::{list_sync_records, ListSyncParams};

fn empty_params() -> ListSyncParams {
    ListSyncParams {
        source_system: None,
        target_system: None,
        sync_type: None,
        status: None,
        page: None,
        page_size: None,
    }
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.sync_records (
            id UUID PRIMARY KEY,
            tenant_id UUID,
            org_id UUID,
            sync_no TEXT,
            source_system VARCHAR(50) NOT NULL,
            target_system VARCHAR(50) NOT NULL,
            sync_type VARCHAR(50) NOT NULL,
            sync_direction VARCHAR(20),
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            total_count INT DEFAULT 0,
            success_count INT DEFAULT 0,
            failed_count INT DEFAULT 0,
            skipped_count INT DEFAULT 0,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            duration_seconds INT,
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, status: Option<String>) -> Value {
    let mut txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let mut params = empty_params();
    params.status = status;
    let resp = list_sync_records(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        Query(params),
    )
    .await;
    resp.0
        .data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message))
}

async fn insert_record(pool: &sqlx::PgPool, source_system: &str, status: &str) {
    sqlx::query(
        "INSERT INTO wms.sync_records (id, tenant_id, org_id, sync_no, source_system, target_system, sync_type, sync_direction, status) VALUES ($1, $2, $2, $3, $4, 'wms', 'incremental', 'outbound', $5)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::nil())
    .bind(format!("SYNC-{source_system}"))
    .bind(source_system)
    .bind(status)
    .execute(pool).await.unwrap();
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_record(&pool, "erp", "success").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["source_system"], "erp");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_record(&pool, "erp", "success").await;
    insert_record(&pool, "mes", "failed").await;

    let body = body_of(pool, Some("failed".to_string())).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["source_system"], "mes");
}
