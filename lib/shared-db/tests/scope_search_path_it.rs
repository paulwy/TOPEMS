//! 连接治理 B 试点验证：`ScopedTxn` 的事务级 `search_path` 行为。
//!
//! 需要真实 PostgreSQL（可用 `TOPEMS_IT_DATABASE_URL` 指定，未设置则跳过）。
//!
//! 覆盖：
//! 1. 作用域内 `SHOW search_path` / `current_schema()` 等于作用域设定值；
//! 2. 作用域结束（COMMIT）后，同一物理连接恢复为池基线（`SET LOCAL` 不残留）；
//! 3. 两个不同 `search_path` 的 `Db` 并发使用时不串味（连接隔离）；
//! 4. `scope_with` 复用请求级 RLS 事务时同样生效，且不接管提交。
//!
//! 连接数固定为 1–2，避免把连接池本身当成观察对象。

#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::indexing_slicing,
    clippy::as_conversions
)]

use sqlx::postgres::PgPoolOptions;
use std::time::Duration;
use topems_shared_auth::middleware::tenant::{scope_request_tenant, RlsRequestTenant};
use topems_shared_db::scope::Db;
use uuid::Uuid;

const BASELINE: &str = "iam,shared,public";

fn test_tenant() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
}

fn database_url() -> Option<String> {
    std::env::var("TOPEMS_IT_DATABASE_URL").ok()
}

async fn pool_with_baseline(url: &str, max: u32) -> sqlx::PgPool {
    PgPoolOptions::new()
        .max_connections(max)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        // 模拟 bootstrap 的会话级基线（after_connect 用 SEARCH_PATH 设置）
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                sqlx::query("SELECT set_config('search_path', $1, false)")
                    .bind(BASELINE)
                    .execute(&mut *conn)
                    .await?;
                Ok(())
            })
        })
        .connect(url)
        .await
        .expect("建立测试连接池失败")
}

async fn show_path(executor: &mut sqlx::PgConnection) -> String {
    sqlx::query_scalar::<_, String>("SHOW search_path")
        .fetch_one(&mut *executor)
        .await
        .expect("SHOW search_path 失败")
}

async fn show_in_scope(scope: &mut topems_shared_db::scope::ScopedTxn<'_>) -> String {
    sqlx::query_scalar::<_, String>("SHOW search_path")
        .fetch_one(&mut *scope)
        .await
        .expect("作用域内 SHOW search_path 失败")
}

#[tokio::test]
async fn scope_sets_and_restores_search_path() {
    let Some(url) = database_url() else {
        eprintln!("[skip] 未设置 TOPEMS_IT_DATABASE_URL");
        return;
    };
    // max=1：保证作用域用到的物理连接与后续观察连接是同一条，才能证明「不残留」。
    let pool = pool_with_baseline(&url, 1).await;

    // 基线：会话级 = BASELINE
    let mut conn = pool.acquire().await.unwrap();
    let baseline = show_path(&mut conn).await;
    println!("[baseline] SHOW search_path = {baseline}");
    assert_eq!(baseline, BASELINE);

    // 作用域内：SET LOCAL 覆盖为 public
    drop(conn);
    let db = Db::new(pool.clone(), "public");
    let mut scope = db.scope_read_for_tenant(test_tenant()).await.unwrap();
    let in_scope = show_in_scope(&mut scope).await;
    let schema: String = sqlx::query_scalar("SELECT current_schema()")
        .fetch_one(&mut scope)
        .await
        .unwrap();
    println!("[scope_read] SHOW search_path = {in_scope}, current_schema = {schema}");
    assert_eq!(in_scope, "public");
    assert_eq!(schema, "public");
    scope.commit().await.unwrap();

    // 作用域结束后：同一条连接恢复为基线（SET LOCAL 失效）
    let mut conn = pool.acquire().await.unwrap();
    let after = show_path(&mut conn).await;
    println!("[after commit] SHOW search_path = {after}");
    assert_eq!(after, BASELINE, "SET LOCAL 不应残留到连接归还后");

    // 读写作用域同样生效
    drop(conn);
    let mut scope = db.scope_for_tenant(test_tenant()).await.unwrap();
    let rw = show_in_scope(&mut scope).await;
    let schema: String = sqlx::query_scalar("SELECT current_schema()")
        .fetch_one(&mut scope)
        .await
        .unwrap();
    println!("[scope 读写] SHOW search_path = {rw}, current_schema = {schema}");
    assert_eq!(rw, "public");
    assert_eq!(schema, "public");
    scope.rollback().await.unwrap();

    // 回滚后同样恢复基线
    let mut conn = pool.acquire().await.unwrap();
    let after_rb = show_path(&mut conn).await;
    println!("[after rollback] SHOW search_path = {after_rb}");
    assert_eq!(after_rb, BASELINE);
}

#[tokio::test]
async fn concurrent_scopes_do_not_leak_schema() {
    let Some(url) = database_url() else {
        eprintln!("[skip] 未设置 TOPEMS_IT_DATABASE_URL");
        return;
    };
    let pool = pool_with_baseline(&url, 2).await;
    let db_public = Db::new(pool.clone(), "public");
    let db_information = Db::new(pool.clone(), "information_schema");

    let (a, b) = tokio::join!(
        async {
            let mut s = db_public
                .scope_read_for_tenant(test_tenant())
                .await
                .unwrap();
            let p = show_in_scope(&mut s).await;
            tokio::time::sleep(Duration::from_millis(150)).await;
            let schema: String = sqlx::query_scalar("SELECT current_schema()")
                .fetch_one(&mut s)
                .await
                .unwrap();
            s.commit().await.unwrap();
            (p, schema)
        },
        async {
            tokio::time::sleep(Duration::from_millis(50)).await;
            let mut s = db_information
                .scope_read_for_tenant(test_tenant())
                .await
                .unwrap();
            let p = show_in_scope(&mut s).await;
            let schema: String = sqlx::query_scalar("SELECT current_schema()")
                .fetch_one(&mut s)
                .await
                .unwrap();
            s.commit().await.unwrap();
            (p, schema)
        }
    );
    println!("[concurrent] db_public = {a:?}, db_information_schema = {b:?}");
    assert_eq!(a.0, "public");
    assert_eq!(a.1, "public");
    assert_eq!(b.0, "information_schema");
    assert_eq!(b.1, "information_schema");
}

#[tokio::test]
async fn scope_with_reuses_request_txn() {
    let Some(url) = database_url() else {
        eprintln!("[skip] 未设置 TOPEMS_IT_DATABASE_URL");
        return;
    };
    let pool = pool_with_baseline(&url, 1).await;
    let db = Db::new(pool.clone(), "public");

    // 模拟 tenant_middleware：请求级事务 + 认证中间件写入的 task-local 上下文
    let mut txn = pool.begin().await.unwrap();

    let ctx = RlsRequestTenant {
        tenant: test_tenant(),
        system: false,
    };
    let (p, tenant, rls_system, statement_timeout) = scope_request_tenant(ctx, async {
        let mut scope = db.scope_with(&mut txn).await.unwrap();
        let p = show_in_scope(&mut scope).await;
        let tenant: String = sqlx::query_scalar("SELECT current_setting('app.tenant_id', true)")
            .fetch_one(&mut scope)
            .await
            .unwrap();
        let rls_system: String =
            sqlx::query_scalar("SELECT COALESCE(current_setting('app.rls_system', true), 'off')")
                .fetch_one(&mut scope)
                .await
                .unwrap();
        let statement_timeout: String =
            sqlx::query_scalar("SELECT current_setting('statement_timeout', true)")
                .fetch_one(&mut scope)
                .await
                .unwrap();
        scope.commit().await.unwrap(); // 借用事务：空操作，由中间件提交
        (p, tenant, rls_system, statement_timeout)
    })
    .await;
    println!(
        "[scope_with] SHOW search_path = {p}, app.tenant_id = {tenant}, \
         app.rls_system = {rls_system}, statement_timeout = {statement_timeout}"
    );
    assert_eq!(p, "public");
    assert_eq!(tenant, test_tenant().to_string());
    assert_eq!(rls_system, "off");
    if std::env::var("TOPEMS_STATEMENT_TIMEOUT").is_err() {
        assert_eq!(statement_timeout, "30s");
    } else {
        assert_ne!(statement_timeout, "0");
    }
    txn.commit().await.unwrap();

    // 借用事务由中间件提交后，连接同样恢复基线
    let mut conn = pool.acquire().await.unwrap();
    assert_eq!(show_path(&mut conn).await, BASELINE);
}

/// 无请求上下文必须报错，不得静默执行（裁决 3）。
#[tokio::test]
async fn scope_without_context_errors() {
    let Some(url) = database_url() else {
        eprintln!("[skip] 未设置 TOPEMS_IT_DATABASE_URL");
        return;
    };
    let pool = pool_with_baseline(&url, 1).await;
    let db = Db::new(pool, "public");

    let read_err = db.scope_read().await.expect_err("scope_read 应报错");
    println!("[no context] scope_read error = {read_err}");
    assert!(
        read_err.to_string().contains("RLS context missing"),
        "错误信息应指明缺少租户上下文，实际：{read_err}"
    );

    let write_err = db.scope().await.expect_err("scope 应报错");
    println!("[no context] scope error = {write_err}");
    assert!(write_err.to_string().contains("RLS context missing"));
}

/// 有请求上下文时，普通租户设 tenant + `rls_system='off'`；超管走系统通道。
#[tokio::test]
async fn request_context_sets_tenant_guc() {
    let Some(url) = database_url() else {
        eprintln!("[skip] 未设置 TOPEMS_IT_DATABASE_URL");
        return;
    };
    let pool = pool_with_baseline(&url, 2).await;
    let db = Db::new(pool, "public");

    let tenant_ctx = RlsRequestTenant {
        tenant: test_tenant(),
        system: false,
    };
    let (tenant, system) = scope_request_tenant(tenant_ctx, async {
        let mut scope = db.scope_read().await.unwrap();
        let tenant: String = sqlx::query_scalar("SELECT current_setting('app.tenant_id', true)")
            .fetch_one(&mut scope)
            .await
            .unwrap();
        let system: String = sqlx::query_scalar("SELECT current_setting('app.rls_system', true)")
            .fetch_one(&mut scope)
            .await
            .unwrap();
        scope.commit().await.unwrap();
        (tenant, system)
    })
    .await;
    println!("[tenant ctx] app.tenant_id = {tenant}, app.rls_system = {system}");
    assert_eq!(tenant, test_tenant().to_string());
    assert_eq!(system, "off");

    let system_ctx = RlsRequestTenant {
        tenant: Uuid::nil(),
        system: true,
    };
    let (tenant, system) = scope_request_tenant(system_ctx, async {
        let mut scope = db.scope_read().await.unwrap();
        let tenant: String = sqlx::query_scalar("SELECT current_setting('app.tenant_id', true)")
            .fetch_one(&mut scope)
            .await
            .unwrap();
        let system: String = sqlx::query_scalar("SELECT current_setting('app.rls_system', true)")
            .fetch_one(&mut scope)
            .await
            .unwrap();
        scope.commit().await.unwrap();
        (tenant, system)
    })
    .await;
    println!("[system ctx] app.tenant_id = {tenant}, app.rls_system = {system}");
    assert_eq!(tenant, Uuid::nil().to_string());
    assert_eq!(system, "on");
}

/// 系统通道：显式 nil 租户 + `app.rls_system='on'`，不需要请求上下文。
#[tokio::test]
async fn system_scope_sets_guc_without_request_context() {
    let Some(url) = database_url() else {
        eprintln!("[skip] 未设置 TOPEMS_IT_DATABASE_URL");
        return;
    };
    let pool = pool_with_baseline(&url, 1).await;
    let db = Db::new(pool, "public");

    let mut scope = db.scope_read_system().await.unwrap();
    let tenant: String = sqlx::query_scalar("SELECT current_setting('app.tenant_id', true)")
        .fetch_one(&mut scope)
        .await
        .unwrap();
    let system: String = sqlx::query_scalar("SELECT current_setting('app.rls_system', true)")
        .fetch_one(&mut scope)
        .await
        .unwrap();
    println!("[scope_read_system] app.tenant_id = {tenant}, app.rls_system = {system}");
    assert_eq!(tenant, Uuid::nil().to_string());
    assert_eq!(system, "on");
    scope.commit().await.unwrap();

    let mut scope = db.scope_system().await.unwrap();
    let tenant: String = sqlx::query_scalar("SELECT current_setting('app.tenant_id', true)")
        .fetch_one(&mut scope)
        .await
        .unwrap();
    let system: String = sqlx::query_scalar("SELECT current_setting('app.rls_system', true)")
        .fetch_one(&mut scope)
        .await
        .unwrap();
    println!("[scope_system] app.tenant_id = {tenant}, app.rls_system = {system}");
    assert_eq!(tenant, Uuid::nil().to_string());
    assert_eq!(system, "on");
    scope.rollback().await.unwrap();
}

/// 按租户遍历：显式租户 + `rls_system='off'`，不需要请求上下文。
#[tokio::test]
async fn scope_for_tenant_sets_guc() {
    let Some(url) = database_url() else {
        eprintln!("[skip] 未设置 TOPEMS_IT_DATABASE_URL");
        return;
    };
    let pool = pool_with_baseline(&url, 1).await;
    let db = Db::new(pool, "public");

    let mut scope = db.scope_read_for_tenant(test_tenant()).await.unwrap();
    let tenant: String = sqlx::query_scalar("SELECT current_setting('app.tenant_id', true)")
        .fetch_one(&mut scope)
        .await
        .unwrap();
    let system: String = sqlx::query_scalar("SELECT current_setting('app.rls_system', true)")
        .fetch_one(&mut scope)
        .await
        .unwrap();
    println!("[scope_read_for_tenant] app.tenant_id = {tenant}, app.rls_system = {system}");
    assert_eq!(tenant, test_tenant().to_string());
    assert_eq!(system, "off");
    scope.commit().await.unwrap();
}

/// K14 试点：请求事务内逐行 SAVEPOINT —— 单行失败只回滚该行，后续行仍可写入，
/// 且失败行不会被外层请求事务提交。临时表随事务回滚消失，不落任何持久副作用。
#[tokio::test]
async fn scope_savepoint_isolates_failed_rows() {
    let Some(url) = database_url() else {
        eprintln!("[skip] 未设置 TOPEMS_IT_DATABASE_URL");
        return;
    };
    let pool = pool_with_baseline(&url, 1).await;
    let db = Db::new(pool.clone(), "public");
    let mut txn = pool.begin().await.unwrap();
    sqlx::query("CREATE TEMP TABLE sp_pilot (id int PRIMARY KEY) ON COMMIT DROP")
        .execute(&mut *txn)
        .await
        .unwrap();

    let ctx = RlsRequestTenant {
        tenant: test_tenant(),
        system: false,
    };
    scope_request_tenant(ctx, async {
        // 行 1：成功 → RELEASE 保存点
        let mut s = db.scope_savepoint(&mut txn).await.unwrap();
        sqlx::query("INSERT INTO sp_pilot (id) VALUES (1)")
            .execute(&mut s)
            .await
            .unwrap();
        s.commit().await.unwrap();

        // 行 2：主键冲突 → 回滚到保存点，外层事务不进入 aborted
        let mut s = db.scope_savepoint(&mut txn).await.unwrap();
        let err = sqlx::query("INSERT INTO sp_pilot (id) VALUES (1)")
            .execute(&mut s)
            .await
            .expect_err("重复主键应报错");
        println!("[row2 failed] {err}");
        s.rollback().await.unwrap();

        // 行 3：失败行之后仍可继续写入（原「独立事务」语义）
        let mut s = db.scope_savepoint(&mut txn).await.unwrap();
        sqlx::query("INSERT INTO sp_pilot (id) VALUES (3)")
            .execute(&mut s)
            .await
            .unwrap();
        s.commit().await.unwrap();

        let mut s = db.scope_with(&mut txn).await.unwrap();
        let ids: Vec<i32> = sqlx::query_scalar("SELECT id FROM sp_pilot ORDER BY id")
            .fetch_all(&mut s)
            .await
            .unwrap();
        s.commit().await.unwrap();
        println!("[after rows] ids = {ids:?}");
        assert_eq!(ids, vec![1, 3], "失败行不得写入，成功行必须保留");
    })
    .await;

    txn.rollback().await.unwrap();
}
