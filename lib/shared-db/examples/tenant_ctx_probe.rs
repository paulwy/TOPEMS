//! 诊断：验证 task-local 租户上下文能否经连接池 `before_acquire` 落到连接上。
//!
//! 用法：`DATABASE_URL=postgres://topems_app:...@127.0.0.1:5432/topems \
//!        cargo run -p topems-shared-db --example tenant_ctx_probe`
//!
//! 期望：作用域外 `<null>`，作用域内 tenant=指定租户、system=off/on，
//! 出作用域后回到 `<null>`（after_release 已清理）。

use sqlx::postgres::PgPoolOptions;
use topems_shared_db::tenant_ctx::{apply_pool_hooks, scope, TenantScopeCtx};

const DEFAULT_TENANT: &str = "00000000-0000-0000-0000-000000000001";

async fn probe(pool: &sqlx::PgPool) -> Result<(String, String), sqlx::Error> {
    let tenant: String = sqlx::query_scalar(
        "SELECT coalesce(nullif(current_setting('app.tenant_id', true), ''), '<null>')",
    )
    .fetch_one(pool)
    .await?;
    let system: String = sqlx::query_scalar(
        "SELECT coalesce(nullif(current_setting('app.rls_system', true), ''), '<null>')",
    )
    .fetch_one(pool)
    .await?;
    Ok((tenant, system))
}

#[tokio::main]
async fn main() -> Result<(), sqlx::Error> {
    let url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems_app@127.0.0.1:5432/topems".to_string());
    let pool = apply_pool_hooks(PgPoolOptions::new().max_connections(2), None)
        .connect(&url)
        .await?;

    println!("outside scope      : {:?}", probe(&pool).await?);

    let inside = scope(TenantScopeCtx::tenant(DEFAULT_TENANT), async {
        probe(&pool).await
    })
    .await?;
    println!("inside tenant scope: {:?}", inside);

    let sys = scope(TenantScopeCtx::system(), async { probe(&pool).await }).await?;
    println!("inside system scope: {:?}", sys);

    println!("after scopes       : {:?}", probe(&pool).await?);
    Ok(())
}
