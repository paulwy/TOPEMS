//! B2 回归：对账问题解决复用调用方事务（`resolve_reconciliation_issue_in_scope`）。
//!
//! 需要真实 PostgreSQL（`TOPEMS_IT_DATABASE_URL`，未设置则跳过）。
//!
//! 覆盖：
//! 1. 作用域内首次标记返回 true，重复标记返回 false；
//! 2. 方法不自行提交，提交后数据才对外可见；
//! 3. 未提交即丢弃作用域时，外部读到仍未解决（证明提交边界在调用方）。

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

use sqlx::postgres::PgPoolOptions;
use sqlx::{AssertSqlSafe, PgPool};
use std::time::Duration;
use topems_shared_db::reconciliation_log::ReconciliationLogService;
use topems_shared_db::scope::Db;
use uuid::Uuid;

fn database_url() -> Option<String> {
    std::env::var("TOPEMS_IT_DATABASE_URL").ok()
}

async fn create_table(pool: &PgPool, table: &str) {
    let sql = format!(
        "CREATE TABLE {table} (
            id uuid PRIMARY KEY,
            tenant_id uuid NOT NULL,
            domain text NOT NULL,
            master_data_id text NOT NULL,
            issue_type text NOT NULL,
            description text,
            detected_at timestamp with time zone NOT NULL DEFAULT now(),
            resolved boolean NOT NULL DEFAULT false,
            resolved_at timestamp with time zone
        )"
    );
    sqlx::query(AssertSqlSafe(sql))
        .execute(pool)
        .await
        .expect("create temp reconciliation table");
}

async fn insert_issue(pool: &PgPool, table: &str, tenant_id: Uuid, issue_id: Uuid) {
    let sql = format!(
        "INSERT INTO {table} (id, tenant_id, domain, master_data_id, issue_type)
         VALUES ($1, $2, 'material', 'mat-001', 'pending_sync')"
    );
    sqlx::query(AssertSqlSafe(sql))
        .bind(issue_id)
        .bind(tenant_id)
        .execute(pool)
        .await
        .expect("seed issue");
}

async fn is_resolved(pool: &PgPool, table: &str, issue_id: Uuid) -> bool {
    let sql = format!("SELECT resolved FROM {table} WHERE id = $1");
    sqlx::query_scalar::<_, bool>(AssertSqlSafe(sql))
        .bind(issue_id)
        .fetch_one(pool)
        .await
        .expect("read resolved")
}

#[tokio::test]
async fn resolve_in_scope_defers_commit_to_caller() {
    let Some(url) = database_url() else {
        eprintln!("skip: TOPEMS_IT_DATABASE_URL 未设置");
        return;
    };
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&url)
        .await
        .expect("connect test db");

    let table = format!("public._recon_scope_it_{}", Uuid::new_v4().simple());
    create_table(&pool, &table).await;
    let tenant_id = Uuid::new_v4();
    let issue_id = Uuid::new_v4();
    insert_issue(&pool, &table, tenant_id, issue_id).await;

    let db = Db::new(pool.clone(), "public");
    let service = ReconciliationLogService::with_tables(db.clone(), table.clone(), table.clone());

    // 1) 提交前：方法内可见已更新，但外部连接仍读到未解决。
    let mut scope = db
        .scope_for_tenant(tenant_id)
        .await
        .expect("open tenant scope");
    assert!(
        service
            .resolve_reconciliation_issue_in_scope(&mut scope, tenant_id, issue_id)
            .await
            .expect("first resolve"),
        "首次标记应返回 true"
    );
    assert!(
        !service
            .resolve_reconciliation_issue_in_scope(&mut scope, tenant_id, issue_id)
            .await
            .expect("second resolve"),
        "重复标记应返回 false"
    );
    assert!(
        !is_resolved(&pool, &table, issue_id).await,
        "调用方未提交前，外部不应看到已解决"
    );
    scope.commit().await.expect("commit caller scope");
    assert!(
        is_resolved(&pool, &table, issue_id).await,
        "提交后应读到已解决"
    );

    // 2) 未提交即丢弃作用域：更新应随事务回滚。
    let rollback_issue = Uuid::new_v4();
    insert_issue(&pool, &table, tenant_id, rollback_issue).await;
    {
        let mut scope = db
            .scope_for_tenant(tenant_id)
            .await
            .expect("open rollback scope");
        assert!(
            service
                .resolve_reconciliation_issue_in_scope(&mut scope, tenant_id, rollback_issue)
                .await
                .expect("resolve in rollback scope"),
            "回滚用例首次标记应返回 true"
        );
    }
    assert!(
        !is_resolved(&pool, &table, rollback_issue).await,
        "作用域丢弃后更新应回滚"
    );

    let drop_sql = format!("DROP TABLE {table}");
    sqlx::query(AssertSqlSafe(drop_sql))
        .execute(&pool)
        .await
        .expect("drop temp reconciliation table");
}
