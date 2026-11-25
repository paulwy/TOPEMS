#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：automation runs 模块集成测试。
//! 复用 AppState 工厂；覆盖 list_runs（空/计数/状态过滤）、get_run（存在/不存在）、
//! retry_run、cancel_run（运行中/非运行中）、purge_runs。
//! 建表自建，列名对齐 AutomationRun FromRow。
#![cfg(feature = "db-tests")]

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{tenant_claims, test_app_state};
use axum::extract::{Json, Path, Query, State};
use axum::Extension;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_shared_auth::middleware::tenant::{
    rls_request_tenant, scope_request_tenant, RlsRequestTenant, RlsTxnCell,
};
use topems_unified_core::modules::automation::{
    cancel_run, get_dashboard_stats, get_run, get_run_log_by_id, get_run_logs, get_run_steps,
    list_runs, purge_runs, retry_run, trigger_rule, AutomationRun, PurgeRequest, RunLogQueryParams,
    RunQueryParams, TriggerRequest,
};

async fn rls_scope(pool: &sqlx::PgPool) -> (RlsTxnCell, RlsRequestTenant) {
    let tx = pool.begin().await.unwrap();
    let cell: RlsTxnCell = Arc::new(Mutex::new(Some(tx)));
    (cell, rls_request_tenant(&tenant_claims()))
}

async fn commit_scope(cell: &RlsTxnCell) {
    let mut guard = cell.lock().await;
    if let Some(tx) = guard.take() {
        tx.commit().await.unwrap();
    }
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS automation_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
            name VARCHAR(200) NOT NULL,
            code VARCHAR(100) NOT NULL,
            description TEXT,
            trigger JSONB NOT NULL DEFAULT '{}',
            action JSONB NOT NULL DEFAULT '{}',
            on_success JSONB,
            on_error JSONB,
            canvas JSONB,
            status VARCHAR(20) DEFAULT 'draft',
            last_run_at TIMESTAMPTZ,
            run_count INT DEFAULT 0,
            success_count INT DEFAULT 0,
            failed_count INT DEFAULT 0,
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
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
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS automation_variables (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            key VARCHAR(200) NOT NULL DEFAULT '',
            value TEXT,
            description TEXT,
            scope VARCHAR(20) DEFAULT 'rule',
            rule_id UUID,
            is_secret BOOLEAN NOT NULL DEFAULT FALSE,
            created_by UUID,
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

async fn insert_run_with_content(
    pool: &sqlx::PgPool,
    rule_id: uuid::Uuid,
    status: &str,
    rule_name: &str,
    steps: serde_json::Value,
    logs: &str,
) -> uuid::Uuid {
    let row: (uuid::Uuid,) = sqlx::query_as(
        r#"INSERT INTO automation_runs (rule_id, rule_name, status, trigger_type, steps, logs)
           VALUES ($1, $2, $3, 'manual', $4, $5) RETURNING id"#,
    )
    .bind(rule_id)
    .bind(rule_name)
    .bind(status)
    .bind(steps)
    .bind(logs)
    .fetch_one(pool)
    .await
    .unwrap();
    row.0
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn dashboard_stats_empty_table_ok(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    // 空表：AVG(duration_ms) 走 COALESCE 0 分支，NUMERIC→f64 解码不应报错（回归 P1）。
    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(ctx, get_dashboard_stats(State(state), Extension(cell))).await;
    assert!(
        resp.success,
        "空表 stats 应成功: code={} msg={}",
        resp.code, resp.message
    );
    let stats = resp.data.expect("空表 stats 应返回数据");
    assert_eq!(stats.total_runs, 0);
    assert_eq!(stats.avg_duration_ms, 0.0);
}

#[sqlx::test(migrations = false)]
async fn dashboard_stats_with_runs_avg_duration_ok(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let rule_id = uuid::Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO automation_rules (id, tenant_id, name, code, status)
           VALUES ($1, gen_random_uuid(), '规则S', 'RULE_S', 'enabled')"#,
    )
    .bind(rule_id)
    .execute(&pool)
    .await
    .unwrap();
    // 两条成功运行，duration_ms 分别 100 / 200，平均应为 150。
    for dur in [100i32, 200] {
        sqlx::query(
            r#"INSERT INTO automation_runs (rule_id, rule_name, status, trigger_type, duration_ms)
               VALUES ($1, '规则S', 'success', 'manual', $2)"#,
        )
        .bind(rule_id)
        .bind(dur)
        .execute(&pool)
        .await
        .unwrap();
    }

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(ctx, get_dashboard_stats(State(state), Extension(cell))).await;
    assert!(
        resp.success,
        "有数据 stats 应成功: code={} msg={}",
        resp.code, resp.message
    );
    let stats = resp.data.expect("有数据 stats 应返回数据");
    assert_eq!(stats.total_runs, 2);
    assert_eq!(stats.successful_runs, 2);
    assert!(
        (stats.avg_duration_ms - 150.0).abs() < 1e-6,
        "avg={}",
        stats.avg_duration_ms
    );
}

#[sqlx::test(migrations = false)]
async fn list_runs_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        list_runs(State(state), Extension(cell), Query(empty_params())),
    )
    .await;
    let body = resp.data.unwrap();
    assert_eq!(body.total, 0);
}

#[sqlx::test(migrations = false)]
async fn list_runs_counts_inserted(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    insert_run_via_sql(&pool, rid, "running", "规则A").await;
    insert_run_via_sql(&pool, rid, "completed", "规则A").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        list_runs(State(state), Extension(cell), Query(empty_params())),
    )
    .await;
    let body = resp.data.unwrap();
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
    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp =
        scope_request_tenant(ctx, list_runs(State(state), Extension(cell), Query(params))).await;
    let body = resp.data.unwrap();
    assert_eq!(body.total, 1);
    assert_eq!(body.items[0].status, "running");
}

#[sqlx::test(migrations = false)]
async fn get_run_returns_run(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    let run_id = insert_run_via_sql(&pool, rid, "running", "规则A").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp =
        scope_request_tenant(ctx, get_run(State(state), Extension(cell), Path(run_id))).await;
    let got: AutomationRun = resp.data.unwrap();
    assert_eq!(got.id, run_id);
    assert_eq!(got.rule_id, rid);
    assert_eq!(got.status, "running");
}

#[sqlx::test(migrations = false)]
async fn get_run_missing_returns_none(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        get_run(State(state), Extension(cell), Path(uuid::Uuid::new_v4())),
    )
    .await;
    assert!(resp.data.is_none());
}

#[sqlx::test(migrations = false)]
async fn retry_run_creates_new_run(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    let run_id = insert_run_via_sql(&pool, rid, "failed", "规则A").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let cell_clone = cell.clone();
    let state = test_app_state(pool.clone());
    let resp =
        scope_request_tenant(ctx, retry_run(State(state), Extension(cell), Path(run_id))).await;
    commit_scope(&cell_clone).await;
    let body: serde_json::Value = resp.data.unwrap();
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

    let (cell, ctx) = rls_scope(&pool).await;
    let cell_clone = cell.clone();
    let state = test_app_state(pool.clone());
    let resp =
        scope_request_tenant(ctx, cancel_run(State(state), Extension(cell), Path(run_id))).await;
    commit_scope(&cell_clone).await;
    let body: serde_json::Value = resp.data.unwrap();
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

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp =
        scope_request_tenant(ctx, cancel_run(State(state), Extension(cell), Path(run_id))).await;
    assert!(resp.data.is_none());
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
    let (cell, ctx) = rls_scope(&pool).await;
    let cell_clone = cell.clone();
    let state = test_app_state(pool.clone());
    let resp = scope_request_tenant(
        ctx,
        purge_runs(State(state), Extension(cell), Json(payload)),
    )
    .await;
    commit_scope(&cell_clone).await;
    let body: serde_json::Value = resp.data.unwrap();
    assert_eq!(body["deleted"], serde_json::json!(1));

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM automation_runs")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);
}

#[sqlx::test(migrations = false)]
async fn get_run_steps_returns_steps(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    let run_id = insert_run_with_content(
        &pool,
        rid,
        "completed",
        "规则A",
        serde_json::json!([{"step": 1, "name": "init"}]),
        "",
    )
    .await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        get_run_steps(State(state), Extension(cell), Path(run_id)),
    )
    .await;
    let steps: serde_json::Value = resp.data.unwrap();
    assert_eq!(steps[0]["name"], serde_json::json!("init"));
}

#[sqlx::test(migrations = false)]
async fn get_run_steps_none_returns_empty_array(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    let run_id = insert_run_via_sql(&pool, rid, "running", "规则A").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        get_run_steps(State(state), Extension(cell), Path(run_id)),
    )
    .await;
    let steps: serde_json::Value = resp.data.unwrap();
    assert_eq!(steps, serde_json::json!([]));
}

#[sqlx::test(migrations = false)]
async fn get_run_logs_splits_lines(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    let run_id = insert_run_with_content(
        &pool,
        rid,
        "completed",
        "规则A",
        serde_json::json!([]),
        "line1\nline2\nline3",
    )
    .await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        get_run_logs(
            State(state),
            Extension(cell),
            Path(run_id),
            Query(RunLogQueryParams {
                page: None,
                page_size: None,
                page_size_alt: None,
            }),
        ),
    )
    .await;
    let body: serde_json::Value = resp.data.unwrap();
    assert_eq!(body["total"], serde_json::json!(3));
    assert_eq!(body["lines"].as_array().unwrap().len(), 3);
}

#[sqlx::test(migrations = false)]
async fn get_run_log_by_id_delegates(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rid = uuid::Uuid::new_v4();
    let run_id = insert_run_with_content(
        &pool,
        rid,
        "completed",
        "规则A",
        serde_json::json!([]),
        "a\nb",
    )
    .await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        get_run_log_by_id(
            State(state),
            Extension(cell),
            Path((run_id, uuid::Uuid::new_v4())),
            Query(RunLogQueryParams {
                page: None,
                page_size: None,
                page_size_alt: None,
            }),
        ),
    )
    .await;
    let body: serde_json::Value = resp.data.unwrap();
    assert_eq!(body["total"], serde_json::json!(2));
}

async fn insert_rule_via_sql(pool: &sqlx::PgPool, name: &str, code: &str) -> uuid::Uuid {
    let row: (uuid::Uuid,) = sqlx::query_as(
        r#"INSERT INTO automation_rules (name, code, status, trigger, action)
           VALUES ($1, $2, 'enabled', '{"type":"manual"}', '{"type":"notify"}') RETURNING id"#,
    )
    .bind(name)
    .bind(code)
    .fetch_one(pool)
    .await
    .unwrap();
    row.0
}

#[sqlx::test(migrations = false)]
async fn trigger_rule_creates_run(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rule_id = insert_rule_via_sql(&pool, "规则A", "RULE_A").await;

    let payload = TriggerRequest {
        input_variables: Some(serde_json::json!({"key": "value"})),
    };
    let (cell, ctx) = rls_scope(&pool).await;
    let cell_clone = cell.clone();
    let state = test_app_state(pool.clone());
    let resp = scope_request_tenant(
        ctx,
        trigger_rule(
            State(state),
            Extension(cell),
            Path(rule_id),
            Json(Some(payload)),
        ),
    )
    .await;
    commit_scope(&cell_clone).await;
    let body: serde_json::Value = resp.data.unwrap();
    let run_id = body["run_id"].as_str().unwrap();

    let (status, trigger_type, input): (String, Option<String>, Option<serde_json::Value>) =
        sqlx::query_as(
            "SELECT status, trigger_type, input_variables FROM automation_runs WHERE id = $1",
        )
        .bind(uuid::Uuid::parse_str(run_id).unwrap())
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(status, "running");
    assert_eq!(trigger_type.as_deref(), Some("manual"));
    assert_eq!(input, Some(serde_json::json!({"key": "value"})));

    let (run_count,): (i32,) =
        sqlx::query_as("SELECT run_count FROM automation_rules WHERE id = $1")
            .bind(rule_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(run_count, 1);
}

#[sqlx::test(migrations = false)]
async fn trigger_rule_without_payload(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let rule_id = insert_rule_via_sql(&pool, "规则B", "RULE_B").await;

    let (cell, ctx) = rls_scope(&pool).await;
    let cell_clone = cell.clone();
    let state = test_app_state(pool.clone());
    let resp = scope_request_tenant(
        ctx,
        trigger_rule(State(state), Extension(cell), Path(rule_id), Json(None)),
    )
    .await;
    commit_scope(&cell_clone).await;
    let body: serde_json::Value = resp.data.unwrap();
    let run_id = body["run_id"].as_str().unwrap();

    let input: Option<serde_json::Value> =
        sqlx::query_scalar("SELECT input_variables FROM automation_runs WHERE id = $1")
            .bind(uuid::Uuid::parse_str(run_id).unwrap())
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(input.is_none());
}

#[sqlx::test(migrations = false)]
async fn trigger_rule_missing_rule_returns_none(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    let (cell, ctx) = rls_scope(&pool).await;
    let state = test_app_state(pool);
    let resp = scope_request_tenant(
        ctx,
        trigger_rule(
            State(state),
            Extension(cell),
            Path(uuid::Uuid::new_v4()),
            Json(None),
        ),
    )
    .await;
    assert!(resp.data.is_none());
}
