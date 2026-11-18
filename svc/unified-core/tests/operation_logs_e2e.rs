#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：audit list_operation_logs handler 集成测试。
//! 复用 common::app_state 测试工厂；覆盖空表/过滤（user_name/module/success）/分页。
//! 注：通过 `#[path]` 直接引入工厂（绕过 common/mod.rs 的 topems-lib 运行时依赖）。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state, test_txn_cell};
use axum::extract::{Path, Query, State};
use axum::Extension;
use topems_unified_core::modules::audit::handlers::{
    get_operation_log, get_operation_log_stats, list_operation_logs,
};
use topems_unified_core::modules::audit::models::{
    OperationLog, OperationLogListResponse, OperationLogQuery, OperationLogRecord,
    OperationLogStatsResponse,
};
use topems_unified_core::modules::audit::service::record_operation_log;

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.core_operation_logs (
            id              UUID PRIMARY KEY,
            tenant_id       UUID,
            user_id         UUID,
            user_name       TEXT,
            module          TEXT,
            operation       TEXT,
            resource_type   TEXT,
            resource_id     TEXT,
            description     TEXT,
            request_data    JSONB,
            response_status INT,
            ip_address      TEXT,
            user_agent      TEXT,
            trace_id        TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn empty_query() -> OperationLogQuery {
    OperationLogQuery {
        user_id: None,
        user_name: None,
        module: None,
        operation: None,
        resource_type: None,
        resource_id: None,
        trace_id: None,
        start_time: None,
        end_time: None,
        success: None,
        page: None,
        page_size: None,
    }
}

async fn insert_log(
    pool: &sqlx::PgPool,
    user_name: &str,
    module: &str,
    response_status: i32,
) -> uuid::Uuid {
    let id = uuid::Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO public.core_operation_logs
           (id, tenant_id, user_id, user_name, module, operation,
            resource_type, resource_id, description, request_data,
            response_status, ip_address, user_agent, trace_id)
           VALUES ($1, $5, NULL, $2, $3, 'read', 'Voucher', NULL, 'test', '{}', $4, '127.0.1', 'test-agent', NULL)"#,
    )
    .bind(id)
    .bind(user_name)
    .bind(module)
    .bind(response_status)
    .bind(uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000009").unwrap())
    .execute(pool)
    .await
    .unwrap();
    id
}

async fn call_list(pool: sqlx::PgPool, query: OperationLogQuery) -> OperationLogListResponse {
    let txn = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = list_operation_logs(
        Extension(txn),
        State(state),
        Extension(claims),
        Query(query),
    )
    .await;
    resp.data.unwrap()
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero_total(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = call_list(pool, empty_query()).await;
    assert!(body.items.is_empty());
    assert_eq!(body.total, 0);
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_user_name(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_log(&pool, "alice", "finance", 200).await;
    insert_log(&pool, "bob", "finance", 200).await;

    let mut query = empty_query();
    query.user_name = Some("alice".to_string());
    let body = call_list(pool, query).await;
    assert_eq!(body.total, 1);
    assert_eq!(body.items[0].user_name, "alice");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_module(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_log(&pool, "alice", "finance", 200).await;
    insert_log(&pool, "bob", "wms", 200).await;

    let mut query = empty_query();
    query.module = Some("wms".to_string());
    let body = call_list(pool, query).await;
    assert_eq!(body.total, 1);
    assert_eq!(body.items[0].module, "wms");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_success_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_log(&pool, "alice", "finance", 200).await;
    insert_log(&pool, "bob", "finance", 500).await;

    let mut query = empty_query();
    query.success = Some(true);
    let body = call_list(pool, query).await;
    assert_eq!(body.total, 1);
    assert_eq!(body.items[0].user_name, "alice");
}

#[sqlx::test(migrations = false)]
async fn list_respects_pagination(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_log(&pool, "alice", "finance", 200).await;
    insert_log(&pool, "bob", "finance", 200).await;
    insert_log(&pool, "carol", "finance", 200).await;

    let mut query = empty_query();
    query.page = Some(2);
    query.page_size = Some(2);
    let body = call_list(pool, query).await;
    assert_eq!(body.total, 3);
    assert_eq!(body.items.len(), 1);
    assert_eq!(body.page, 2);
}

#[sqlx::test(migrations = false)]
async fn get_operation_log_returns_log(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let id = insert_log(&pool, "alice", "finance", 200).await;

    let txn = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = get_operation_log(Extension(txn), State(state), Extension(claims), Path(id)).await;
    let log: OperationLog = resp.data.unwrap();
    assert_eq!(log.id, id);
    assert_eq!(log.user_name, "alice");
    assert_eq!(log.module, "finance");
}

#[sqlx::test(migrations = false)]
async fn get_operation_log_not_found_returns_none(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let txn = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = get_operation_log(
        Extension(txn),
        State(state),
        Extension(claims),
        Path(uuid::Uuid::new_v4()),
    )
    .await;
    assert!(resp.data.is_none());
}

#[sqlx::test(migrations = false)]
async fn stats_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let txn = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = get_operation_log_stats(Extension(txn), State(state), Extension(claims)).await;
    let body: OperationLogStatsResponse = resp.data.unwrap();
    assert_eq!(body.total, 0);
}

#[sqlx::test(migrations = false)]
async fn stats_counts_inserted_rows(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_log(&pool, "alice", "finance", 200).await;
    insert_log(&pool, "bob", "wms", 200).await;
    insert_log(&pool, "carol", "finance", 500).await;

    let txn = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let resp = get_operation_log_stats(Extension(txn), State(state), Extension(claims)).await;
    let body: OperationLogStatsResponse = resp.data.unwrap();
    assert_eq!(body.total, 3);
}

/// 回归：`tokio::spawn` 丢失 task-local 后，审计写入仍必须落库（W7 审计断流）。
///
/// 直接在没有请求上下文的情况下调用 `record_operation_log`，模拟异步
/// spawn 的实际执行环境；nil 租户走系统通道，写入后独立查询计数验证。
#[sqlx::test(migrations = false)]
async fn record_operation_log_writes_without_request_context(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let state = test_app_state(pool.clone());

    let id = record_operation_log(
        &state.db,
        OperationLogRecord {
            tenant_id: uuid::Uuid::nil(),
            user_id: None,
            user_name: "anonymous".to_string(),
            module: "iam".to_string(),
            operation: "read".to_string(),
            resource_type: "User".to_string(),
            resource_id: None,
            description: Some("async audit regression".to_string()),
            request_data: None,
            response_status: Some(200),
            ip_address: Some("127.0.0.1".to_string()),
            user_agent: Some("test".to_string()),
            trace_id: Some("trace-async".to_string()),
        },
    )
    .await
    .unwrap();

    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM public.core_operation_logs WHERE id = $1")
            .bind(id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 1, "异步审计写入必须真实落库");
}
