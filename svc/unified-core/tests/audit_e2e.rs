#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：unified-core audit 模块集成测试。
//! 覆盖 record_login / list_login_logs / list_operation_logs。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state, test_txn_cell};
use axum::extract::{Query, State};
use axum::Extension;
use topems_unified_core::modules::audit::handlers::list_operation_logs;
use topems_unified_core::modules::audit::login_log_handlers::{list_login_logs, record_login};
use topems_unified_core::modules::audit::models::{OperationLogListResponse, OperationLogQuery};
use topems_unified_core::modules::audit::{LoginLogQuery, RecordLoginRequest};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.core_login_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            user_id UUID,
            username TEXT,
            ip_address TEXT,
            user_agent TEXT,
            status TEXT,
            error_message TEXT,
            login_time TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS core_operation_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            user_id UUID,
            user_name TEXT,
            module TEXT,
            operation TEXT,
            resource_type TEXT,
            resource_id TEXT,
            description TEXT,
            request_data JSONB,
            response_status INTEGER,
            ip_address TEXT,
            user_agent TEXT,
            trace_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn empty_login_query() -> LoginLogQuery {
    LoginLogQuery {
        username: None,
        status: None,
        user_id: None,
        ip_address: None,
        start_time: None,
        end_time: None,
        page: None,
        page_size: None,
    }
}

fn empty_op_query() -> OperationLogQuery {
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


topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn record_login_inserts_and_listable(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let state = test_app_state(pool.clone());
    let req = RecordLoginRequest {
        tenant_id: None,
        user_id: None,
        username: "alice".to_string(),
        ip_address: "10.0.1".to_string(),
        user_agent: Some("curl/8".to_string()),
        status: "success".to_string(),
        error_message: None,
    };
    let created = record_login(State(state.clone()), axum::Json(req)).await;
    assert!(
        created.success,
        "record_login failed: {:?}",
        created.message
    );
    assert_eq!(created.data.as_ref().unwrap().username, "alice");

    let resp = list_login_logs(
        Extension(test_txn_cell(&pool).await),
        State(state),
        Extension(super_claims()),
        Query(empty_login_query()),
    )
    .await;
    let body = resp.data.expect("list failed");
    assert_eq!(body.total, 1);
    assert_eq!(body.items.len(), 1);
    assert_eq!(body.items[0].username, "alice");
}

#[sqlx::test(migrations = false)]
async fn operation_logs_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let txn = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let resp = list_operation_logs(
        Extension(txn),
        State(state),
        Extension(super_claims()),
        Query(empty_op_query()),
    )
    .await;
    assert!(
        resp.success,
        "list_operation_logs failed: {:?}",
        resp.message
    );
    let body: OperationLogListResponse = resp.data.expect("data missing");
    assert_eq!(body.total, 0);
    assert!(body.items.is_empty());
}

#[sqlx::test(migrations = false)]
async fn operation_logs_with_data_lists_one(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    sqlx::query(
        r#"INSERT INTO core_operation_logs (tenant_id, user_id, user_name, module, operation, resource_type, resource_id, description, response_status, ip_address, trace_id)
           VALUES ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'bob', 'ehs', 'create', 'plan', 'plan-1', '创建应急预案', 200, '10.0.2', 'trace-abc')"#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let txn = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let resp = list_operation_logs(
        Extension(txn),
        State(state),
        Extension(super_claims()),
        Query(empty_op_query()),
    )
    .await;
    assert!(
        resp.success,
        "list_operation_logs failed: {:?}",
        resp.message
    );
    let body: OperationLogListResponse = resp.data.expect("data missing");
    assert_eq!(body.total, 1);
    assert_eq!(body.items[0].user_name, "bob");
    assert_eq!(body.items[0].module, "ehs");
}

// ===== public.audit_logs 软删过滤（2026-11-06）=====

use topems_unified_core::modules::audit::audit_query::{
    get_audit_log_stats, query_audit_logs, AuditLogQueryParams,
};

async fn setup_audit_logs_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id UUID,
            entity_ids JSONB,
            user_id UUID,
            user_name TEXT,
            request_details JSONB,
            response_details JSONB,
            status TEXT,
            error_message TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ,
            success BOOLEAN
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn empty_audit_query() -> AuditLogQueryParams {
    AuditLogQueryParams {
        source: None,
        user_id: None,
        username: None,
        action: None,
        entity_type: None,
        resource: None,
        status: None,
        success: None,
        ip_address: None,
        start_date: None,
        end_date: None,
        search: None,
        page: None,
        page_size: None,
    }
}

/// 审计查询/统计/榜单都必须排除 `deleted_at` 非空行。
#[sqlx::test(migrations = false)]
async fn audit_query_excludes_soft_deleted_rows(pool: sqlx::PgPool) {
    setup_audit_logs_schema(&pool).await;
    for (action, deleted) in [
        ("create_project", false),
        ("update_project", false),
        ("delete_project", true),
    ] {
        sqlx::query(
            r#"INSERT INTO public.audit_logs (tenant_id, action, entity_type, status, deleted_at)
               VALUES ('00000000-0000-0000-0000-000000000001', $1, 'project', 'success', $2)"#,
        )
        .bind(action)
        .bind(if deleted {
            Some(chrono::Utc::now())
        } else {
            None
        })
        .execute(&pool)
        .await
        .unwrap();
    }

    let txn = test_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let resp = query_audit_logs(
        Extension(txn.clone()),
        State(state.clone()),
        Query(empty_audit_query()),
    )
    .await;
    assert!(resp.success, "query_audit_logs failed: {:?}", resp.message);
    let body = resp.data.expect("data missing");
    assert_eq!(body.total, 2, "软删行不应计入 total");
    assert_eq!(body.items.len(), 2, "软删行不应出现在列表");
    assert!(
        !body.items.iter().any(|i| i.action == "delete_project"),
        "软删行 delete_project 不应返回"
    );

    let stats = get_audit_log_stats(Extension(txn), State(state), Query(empty_audit_query())).await;
    assert!(
        stats.success,
        "get_audit_log_stats failed: {:?}",
        stats.message
    );
    let stats = stats.data.expect("stats missing");
    assert_eq!(stats.total, 2, "统计总数应排除软删行");
    let by_action: i64 = stats
        .by_action
        .iter()
        .filter(|c| c.key == "delete_project")
        .map(|c| c.count)
        .sum();
    assert_eq!(by_action, 0, "by_action 不应含软删行");
}
