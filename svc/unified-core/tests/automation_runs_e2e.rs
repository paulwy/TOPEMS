#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：automation runs 模块集成测试。
//! 复用 AppState 工厂；覆盖 list_runs（空/计数/状态过滤）、get_run（存在/不存在）、
//! retry_run、cancel_run（运行中/非运行中）、purge_runs。
//! 建表自建，列名对齐 AutomationRun FromRow。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::test_app_state;
use axum::extract::{Json, Path, Query, State};
use topems_unified_core::modules::automation::{
    cancel_run, get_run, list_runs, purge_runs, retry_run, AutomationRun, PurgeRequest,
    RunQueryParams,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS automation_runs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            rule_id UUID NOT NULL,
            rule_name TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'running',
            trigger_type TEXT,
            input_variables JSONB,
            output JSONB,
            output_data JSONB,
            error_message TEXT,
            steps JSONB,
            logs TEXT,
            started_at TIMESTAMPTZ DEFAULT NOW(),
            finished_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            duration_ms INT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn empty_params() -> RunQueryParams {
    RunQueryParams {
        page: None,
        page_size: None,
        page_size_alt: None,
        rule_id: None,
        status: None,
        start_time: None,
        end_time: None,
    }
}

async fn insert_run_via_sql(
    pool: &sqlx::PgPool,
    rule_id: uuid::Uuid,
    status: &str,
    rule_name: &str,
) -> uuid::Uuid {
    let row: (uuid::Uuid,) = sqlx::query_as(
        r#"INSERT INTO automation_runs (rule_id, rule_name, status, trigger_type)
           VALUES ($1, $2, $3, 'manual') RETURNING id"#,
    )
    .bind(rule_id)
    .bind(rule_name)
    .bind(status)
    .fetch_one(pool)
    .await
    .unwrap();
    row.0
}

#[sqlx::test(migrations = false)]
async fn list_runs_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool);
    let resp = list_runs(State(state), Query(empty_params())).await;
    let body = resp.0.data.unwrap();
    assert_eq!(body.total, 0);
}

#[sqlx::test(migrations = false)]
async fn list_runs_counts_inserted(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    insert_run_via_sql(&pool, rid, "running", "规则A").await;
    insert_run_via_sql(&pool, rid, "completed", "规则A").await;

    let state = test_app_state(pool);
    let resp = list_runs(State(state), Query(empty_params())).await;
    let body = resp.0.data.unwrap();
    assert_eq!(body.total, 2);
    assert_eq!(body.items.len(), 2);
}

#[sqlx::test(migrations = false)]
async fn list_runs_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    insert_run_via_sql(&pool, rid, "running", "规则A").await;
    insert_run_via_sql(&pool, rid, "completed", "规则A").await;

    let mut params = empty_params();
    params.status = Some("running".to_string());
    let state = test_app_state(pool);
    let resp = list_runs(State(state), Query(params)).await;
    let body = resp.0.data.unwrap();
    assert_eq!(body.total, 1);
    assert_eq!(body.items[0].status, "running");
}

#[sqlx::test(migrations = false)]
async fn get_run_returns_run(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    let run_id = insert_run_via_sql(&pool, rid, "running", "规则A").await;

    let state = test_app_state(pool);
    let resp = get_run(State(state), Path(run_id)).await;
    let got: AutomationRun = resp.0.data.unwrap();
    assert_eq!(got.id, run_id);
    assert_eq!(got.rule_id, rid);
    assert_eq!(got.status, "running");
}

#[sqlx::test(migrations = false)]
async fn get_run_missing_returns_none(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let state = test_app_state(pool);
    let resp = get_run(State(state), Path(uuid::Uuid::new_v4())).await;
    assert!(resp.0.data.is_none());
}

#[sqlx::test(migrations = false)]
async fn retry_run_creates_new_run(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    let run_id = insert_run_via_sql(&pool, rid, "failed", "规则A").await;

    let state = test_app_state(pool.clone());
    let resp = retry_run(State(state), Path(run_id)).await;
    let body: serde_json::Value = resp.0.data.unwrap();
    let new_id = body["run_id"].as_str().unwrap();
    assert!(!new_id.is_empty());

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM automation_runs")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 2);

    let new_status: String =
        sqlx::query_scalar("SELECT status FROM automation_runs WHERE id = $1::uuid")
            .bind(uuid::Uuid::parse_str(new_id).unwrap())
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(new_status, "running");
}

#[sqlx::test(migrations = false)]
async fn cancel_run_marks_cancelled(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    let run_id = insert_run_via_sql(&pool, rid, "running", "规则A").await;

    let state = test_app_state(pool.clone());
    let resp = cancel_run(State(state), Path(run_id)).await;
    let body: serde_json::Value = resp.0.data.unwrap();
    assert_eq!(body["success"], serde_json::json!(true));

    let status: String = sqlx::query_scalar("SELECT status FROM automation_runs WHERE id = $1")
        .bind(run_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(status, "cancelled");
}

#[sqlx::test(migrations = false)]
async fn cancel_non_running_returns_not_found(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    let run_id = insert_run_via_sql(&pool, rid, "completed", "规则A").await;

    let state = test_app_state(pool);
    let resp = cancel_run(State(state), Path(run_id)).await;
    assert!(resp.0.data.is_none());
}

#[sqlx::test(migrations = false)]
async fn purge_runs_deletes_matching(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    insert_run_via_sql(&pool, rid, "running", "规则A").await;
    insert_run_via_sql(&pool, rid, "completed", "规则A").await;

    let payload = PurgeRequest {
        before: None,
        status: Some("completed".to_string()),
    };
    let state = test_app_state(pool.clone());
    let resp = purge_runs(State(state), Json(payload)).await;
    let body: serde_json::Value = resp.0.data.unwrap();
    assert_eq!(body["deleted"], serde_json::json!(1));

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM automation_runs")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);
}
