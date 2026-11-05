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
use topems_shared_db::scope::Db;

const BASELINE: &str = "iam,shared,public";

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
    let mut scope = db.scope_read().await.unwrap();
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
    let mut scope = db.scope().await.unwrap();
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
            let mut s = db_public.scope_read().await.unwrap();
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
            let mut s = db_information.scope_read().await.unwrap();
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

    // 模拟 tenant_middleware：请求级事务 + RLS 上下文
    let mut txn = pool.begin().await.unwrap();
    sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind("00000000-0000-0000-0000-000000000001")
        .execute(&mut *txn)
        .await
        .unwrap();

    let mut scope = db.scope_with(&mut txn).await.unwrap();
    let p = show_in_scope(&mut scope).await;
    let tenant: String = sqlx::query_scalar("SELECT current_setting('app.tenant_id', true)")
        .fetch_one(&mut scope)
        .await
        .unwrap();
    println!("[scope_with] SHOW search_path = {p}, app.tenant_id = {tenant}");
    assert_eq!(p, "public");
    assert_eq!(tenant, "00000000-0000-0000-0000-000000000001");
    scope.commit().await.unwrap(); // 借用事务：空操作，由中间件提交
    txn.commit().await.unwrap();

    // 借用事务由中间件提交后，连接同样恢复基线
    let mut conn = pool.acquire().await.unwrap();
    assert_eq!(show_path(&mut conn).await, BASELINE);
}
