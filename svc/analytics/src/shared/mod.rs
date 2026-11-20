// V67.1 P0-9: permission 模块已删除（死代码 + 安全 stub）

use axum::extract::FromRef;
use sqlx::PgPool;
use topems_shared_auth::auth::AuthState;
use topems_shared_auth::middleware::TenantScope;
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_db::scope::{Db, ScopedTxn};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    /// 事务级 RLS 作用域入口：请求路径按 Claims 租户/系统通道开事务，
    /// 与 ehs `shared/permission.rs` 的 `open_read_scope` / `open_write_scope` 同构。
    pub db: Db,
    pub health_config: SimpleHealthConfig,
}

/// 按作用域打开只读事务：`Tenant` → 指定租户，`System` → 系统通道。
pub async fn open_read_scope<'a>(
    db: &'a Db,
    scope: &TenantScope,
) -> Result<ScopedTxn<'a>, sqlx::Error> {
    match scope.tenant_id() {
        Some(tenant) => db.scope_read_for_tenant(tenant).await,
        None => db.scope_read_system().await,
    }
}

/// 按作用域打开读写事务：`Tenant` → 指定租户，`System` → 系统通道。
pub async fn open_write_scope<'a>(
    db: &'a Db,
    scope: &TenantScope,
    txn: &'a mut sqlx::Transaction<'_, sqlx::Postgres>,
) -> Result<ScopedTxn<'a>, sqlx::Error> {
    match scope.tenant_id() {
        Some(_) => db.scope_with(txn).await,
        None => db.scope_with_system(txn).await,
    }
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
