#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! master 模块闭环验收（审批 / 数据质量 / 对账）
//!
//! 目的：证明 10 个 handler 不只是「注册了路由」，而是真的走完
//! 写入 → 读回 → 状态流转 → 失败反馈 的闭环。
//!
//! 运行方式（必须显式指定测试库，禁止回退到 DATABASE_URL）：
//! ```bash
//! TEST_DATABASE_URL=postgres://topems_test_runner@127.0.0.1:5432/topems_test_runner \
//!   cargo test -p topems-unified-core --test master_closed_loop_e2e -- --test-threads=1
//! ```

#[path = "common/app_state.rs"]
mod app_state;

use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::{from_fn, from_fn_with_state, Next};
use axum_test::TestServer;
use serde_json::{json, Value};
use sqlx::{AssertSqlSafe, PgPool};
use std::time::Duration;
use tokio::time::{sleep, Instant};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::{
    rls_request_tenant, scope_request_tenant, tenant_middleware,
};
use topems_shared_db::scope::Db;
use topems_unified_core::routes::master::master_routes;
use uuid::Uuid;

const MDM_TABLES: &[&str] = &[
    "core_master_data_refs",
    "core_master_data_change_log",
    "core_mdm_approvals",
    "core_mdm_reconciliation_log",
];

fn claims_for(tenant_id: Uuid, with_write: bool) -> Claims {
    let mut claims = app_state::tenant_claims();
    claims.tenant_id = Some(tenant_id.to_string());
    claims.username = "mdm-e2e".to_string();
    claims.permissions = if with_write {
        vec!["system:read".to_string(), "system:write".to_string()]
    } else {
        vec![]
    };
    claims
}

/// 用真实 `master_routes` + 真实租户事务中间件搭一个进程内服务，
/// 这样路由注册、权限层、RlsTxnCell 与生产完全同构。
fn build_server(pool: PgPool, claims: Claims) -> TestServer {
    let state = app_state::test_app_state(pool.clone());
    let app = master_routes(&state)
        .with_state(state)
        .layer(from_fn_with_state(pool, tenant_middleware()))
        .layer(from_fn(move |mut req: Request, next: Next| {
            let claims = claims.clone();
            async move {
                // 生产链路由 auth_middleware 写入 RLS task-local；测试绕过认证，
                // 这里补上同样的请求作用域，否则 scope_with 会 fail-closed。
                let rls_ctx = rls_request_tenant(&claims);
                req.extensions_mut().insert(claims);
                scope_request_tenant(rls_ctx, next.run(req)).await
            }
        }));
    TestServer::new(app)
}

async fn count_rows(pool: &PgPool, tenant_id: Uuid, table: &str) -> i64 {
    let db = Db::new(pool.clone(), "public, shared");
    let mut scope = db.scope_for_tenant(tenant_id).await.expect("scope txn");
    let sql = format!("SELECT count(*) FROM public.{table} WHERE tenant_id = $1");
    let count: i64 = sqlx::query_scalar(AssertSqlSafe(sql))
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        .expect("count rows");
    scope.commit().await.expect("commit count");
    count
}

async fn tuple_inserted(pool: &PgPool, table: &str) -> i64 {
    sqlx::query_scalar(
        "SELECT COALESCE(n_tup_ins, 0) FROM pg_stat_user_tables \
         WHERE schemaname = 'public' AND relname = $1",
    )
    .bind(table)
    .fetch_optional(pool)
    .await
    .expect("read pg_stat_user_tables")
    .unwrap_or(0)
}

/// n_tup_ins 由统计收集器异步刷新，轮询到增量达标或超时
async fn wait_insert_delta(pool: &PgPool, table: &str, baseline: i64, min_delta: i64) -> i64 {
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        let current = tuple_inserted(pool, table).await;
        if current - baseline >= min_delta || Instant::now() >= deadline {
            return current;
        }
        sleep(Duration::from_millis(200)).await;
    }
}

async fn cleanup(pool: &PgPool, tenant_id: Uuid) {
    for table in MDM_TABLES {
        let db = Db::new(pool.clone(), "public, shared");
        let mut scope = db.scope_for_tenant(tenant_id).await.expect("cleanup scope");
        let sql = format!("DELETE FROM public.{table} WHERE tenant_id = $1");
        sqlx::query(AssertSqlSafe(sql))
            .bind(tenant_id)
            .execute(&mut scope)
            .await
            .expect("cleanup rows");
        scope.commit().await.expect("commit cleanup");
    }
}

#[tokio::test]
async fn master_ten_endpoints_form_closed_loop() {
    topems_test_support::ensure_test_dsn();
    let pool = PgPool::connect(&topems_test_support::test_database_url())
        .await
        .expect("connect test db");

    // 独立租户，避免与测试库既有数据互相干扰
    let tenant_id = Uuid::new_v4();
    cleanup(&pool, tenant_id).await;
    let server = build_server(pool.clone(), claims_for(tenant_id, true));

    let mut insert_baseline = std::collections::HashMap::new();
    for table in MDM_TABLES {
        insert_baseline.insert(*table, tuple_inserted(&pool, table).await);
    }

    let code = format!("e2e-{}", &Uuid::new_v4().to_string()[..8]);

    // 1) 写入 refs（此前 refs 表 0 行的写入方）
    let created = server
        .post("/mdm/refs")
        .json(&json!({
            "domain": "account_subject",
            "code": code,
            "name": "E2E 会计科目",
            "status": "active",
            "source_service": "finance",
        }))
        .await;
    let created_status = created.status_code();
    let created: Value = created.json();
    assert_eq!(created_status, StatusCode::OK, "create ref: {created}");
    assert_eq!(created["success"], true);
    let master_data_id = created["data"]["master_data_id"]
        .as_str()
        .expect("master_data_id")
        .to_string();
    assert_eq!(
        count_rows(&pool, tenant_id, "core_master_data_refs").await,
        1
    );

    // 2) 创建审批 → 待审列表读回
    let approval = server
        .post("/mdm/approvals")
        .json(&json!({
            "master_data_id": master_data_id,
            "domain": "account_subject",
            "action": "update",
            "payload": { "name": "E2E 会计科目-变更" },
        }))
        .await;
    assert_eq!(approval.status_code(), StatusCode::OK, "create approval");
    let approval: Value = approval.json();
    let approval_id = approval["data"]["id"]
        .as_str()
        .expect("approval id")
        .to_string();

    let pending = server.get("/mdm/approvals/pending").await;
    assert_eq!(pending.status_code(), StatusCode::OK, "pending approvals");
    let pending: Value = pending.json();
    assert!(
        pending["data"]
            .as_array()
            .unwrap()
            .iter()
            .any(|a| a["id"] == approval_id),
        "pending list 应包含刚创建的审批"
    );
    assert_eq!(count_rows(&pool, tenant_id, "core_mdm_approvals").await, 1);

    // 3) 审批 → 历史读回 approved
    let reviewed = server
        .post(&format!("/mdm/approvals/{approval_id}/review"))
        .json(&json!({ "approved": true, "comment": "e2e ok" }))
        .await;
    assert_eq!(reviewed.status_code(), StatusCode::OK, "review approval");
    let reviewed: Value = reviewed.json();
    assert_eq!(reviewed["data"]["status"], "approved");

    let history = server
        .get(&format!("/mdm/approvals/history/{master_data_id}"))
        .await;
    assert_eq!(history.status_code(), StatusCode::OK, "approval history");
    let history: Value = history.json();
    assert_eq!(history["data"][0]["status"], "approved");
    assert_eq!(history["data"][0]["reviewed_by"], "mdm-e2e");

    // 审批通过必须真正落变更，而不是只改审批状态
    let applied = server.get(&format!("/mdm/refs/{master_data_id}")).await;
    assert_eq!(applied.status_code(), StatusCode::OK);
    assert_eq!(applied.json::<Value>()["data"]["name"], "E2E 会计科目-变更");

    // 4) 把 ref 置为 pending_sync，触发对账写日志
    let updated = server
        .put(&format!("/mdm/refs/{master_data_id}"))
        .json(&json!({ "status": "pending_sync" }))
        .await;
    assert_eq!(updated.status_code(), StatusCode::OK, "update ref");

    let run = server.post("/mdm/reconciliation/run").await;
    assert_eq!(run.status_code(), StatusCode::OK, "run reconciliation");
    let run: Value = run.json();
    let detail = run["data"]["details"]
        .as_array()
        .unwrap()
        .iter()
        .find(|d| d["domain"] == "account_subject")
        .expect("account_subject detail");
    assert_eq!(detail["inconsistent"], 1);

    // 幂等：同样待同步数据重复对账，不应重复堆日志
    let run_again = server.post("/mdm/reconciliation/run").await;
    assert_eq!(run_again.status_code(), StatusCode::OK);
    assert_eq!(
        count_rows(&pool, tenant_id, "core_mdm_reconciliation_log").await,
        1,
        "重复对账不应重复插入未解决日志"
    );

    // 5) 日志读回 → 标记解决 → 未解决列表不再出现
    let logs = server
        .get("/mdm/reconciliation/logs?unresolved_only=true&limit=50")
        .await;
    assert_eq!(
        logs.status_code(),
        StatusCode::OK,
        "list reconciliation logs"
    );
    let logs: Value = logs.json();
    let issue = logs["data"]
        .as_array()
        .unwrap()
        .iter()
        .find(|l| l["master_data_id"] == master_data_id)
        .expect("reconciliation issue");
    let issue_id = issue["id"].as_str().expect("issue id").to_string();

    let resolved = server
        .post(&format!("/mdm/reconciliation/logs/{issue_id}/resolve"))
        .await;
    assert_eq!(resolved.status_code(), StatusCode::OK, "resolve issue");
    assert_eq!(resolved.json::<Value>()["data"], true);

    let logs_after = server
        .get("/mdm/reconciliation/logs?unresolved_only=true&limit=50")
        .await;
    let logs_after: Value = logs_after.json();
    assert!(
        !logs_after["data"]
            .as_array()
            .unwrap()
            .iter()
            .any(|l| l["id"] == issue_id),
        "已解决日志不应再出现在未解决列表"
    );

    // 6) 质量看板三个读端点
    let report = server.get("/mdm/quality/report").await;
    assert_eq!(report.status_code(), StatusCode::OK, "quality report");
    let report: Value = report.json();
    assert!(report["data"]["total_count"].as_i64().unwrap() >= 1);
    assert!(report["data"]["inconsistency_count"].as_i64().unwrap() >= 1);

    assert_eq!(
        server.get("/mdm/quality/duplicates").await.status_code(),
        StatusCode::OK
    );
    assert_eq!(
        server.get("/mdm/quality/stale").await.status_code(),
        StatusCode::OK
    );

    // 7) 入库落点断言：四张表都真的有行（不是只返回 200）
    assert_eq!(count_rows(&pool, tenant_id, "core_mdm_approvals").await, 1);
    assert_eq!(
        count_rows(&pool, tenant_id, "core_mdm_reconciliation_log").await,
        1
    );
    assert!(
        count_rows(&pool, tenant_id, "core_master_data_change_log").await >= 2,
        "create + update 都应写入变更日志"
    );

    // 8) n_tup_ins 增量：证明写入真的落到这 4 张表，而不是只返回 200
    for (table, min_delta) in [
        ("core_master_data_refs", 1),
        ("core_mdm_approvals", 1),
        ("core_mdm_reconciliation_log", 1),
        ("core_master_data_change_log", 3),
    ] {
        let baseline = insert_baseline[table];
        let current = wait_insert_delta(&pool, table, baseline, min_delta).await;
        assert!(
            current - baseline >= min_delta,
            "{table} n_tup_ins 增量不足: baseline={baseline}, current={current}, expected>={min_delta}"
        );
    }

    cleanup(&pool, tenant_id).await;
}

#[tokio::test]
async fn master_routes_enforce_system_write_permission() {
    topems_test_support::ensure_test_dsn();
    let pool = PgPool::connect(&topems_test_support::test_database_url())
        .await
        .expect("connect test db");
    let tenant_id = Uuid::new_v4();
    let server = build_server(pool, claims_for(tenant_id, false));

    // 无 system:read → 读端点 403
    let read = server.get("/mdm/quality/report").await;
    assert_eq!(read.status_code(), StatusCode::FORBIDDEN);

    // 无 system:write → 写端点 403
    let write = server.post("/mdm/reconciliation/run").await;
    assert_eq!(write.status_code(), StatusCode::FORBIDDEN);
}
