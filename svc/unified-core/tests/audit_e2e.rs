#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：unified-core audit 模块集成测试。
//! 覆盖 record_login / list_login_logs / list_operation_logs。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state};
use axum::extract::{Query, State};
use axum::Extension;
use topems_unified_core::modules::audit::handlers::list_operation_logs;
use topems_unified_core::modules::audit::login_log_handlers::{list_login_logs, record_login};
use topems_unified_core::modules::audit::models::{OperationLogListResponse, OperationLogQuery};
use topems_unified_core::modules::audit::{
    LoginLogQuery, RecordLoginRequest,
};

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

#[sqlx::test(migrations = false)]
async fn record_login_inserts_and_listable(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let state = test_app_state(pool.clone());
    let req = RecordLoginRequest {
        tenant_id: None,
        user_id: None,
        username: "alice".to_string(),
        ip_address: "10.0.0.1".to_string(),
        user_agent: Some("curl/8".to_string()),
        status: "success".to_string(),
        error_message: None,
    };
    let created = record_login(State(state.clone()), axum::Json(req)).await;
    assert!(
        created.0.success,
        "record_login failed: {:?}",
        created.0.message
    );
    assert_eq!(created.0.data.as_ref().unwrap().username, "alice");

    let resp = list_login_logs(
        State(state),
        Extension(super_claims()),
        Query(empty_login_query()),
    )
    .await;
    let body = resp.0.data.expect("list failed");
    assert_eq!(body.total, 1);
    assert_eq!(body.items.len(), 1);
    assert_eq!(body.items[0].username, "alice");
}

#[sqlx::test(migrations = false)]
async fn operation_logs_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let state = test_app_state(pool);
    let resp = list_operation_logs(
        State(state),
        Extension(super_claims()),
        Query(empty_op_query()),
    )
    .await;
    assert!(
        resp.0.success,
        "list_operation_logs failed: {:?}",
        resp.0.message
    );
    let body: OperationLogListResponse = resp.0.data.expect("data missing");
    assert_eq!(body.total, 0);
    assert!(body.items.is_empty());
}

#[sqlx::test(migrations = false)]
async fn operation_logs_with_data_lists_one(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    sqlx::query(
        r#"INSERT INTO core_operation_logs (tenant_id, user_id, user_name, module, operation, resource_type, resource_id, description, response_status, ip_address, trace_id)
           VALUES ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'bob', 'ehs', 'create', 'plan', 'plan-1', '创建应急预案', 200, '10.0.0.2', 'trace-abc')"#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let state = test_app_state(pool);
    let resp = list_operation_logs(
        State(state),
        Extension(super_claims()),
        Query(empty_op_query()),
    )
    .await;
    assert!(
        resp.0.success,
        "list_operation_logs failed: {:?}",
        resp.0.message
    );
    let body: OperationLogListResponse = resp.0.data.expect("data missing");
    assert_eq!(body.total, 1);
    assert_eq!(body.items[0].user_name, "bob");
    assert_eq!(body.items[0].module, "ehs");
}
