use axum::extract::FromRef;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::TenantScope;
use topems_shared_core::health::SystemMetrics;
use topems_shared_core::TopemsError;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    /// 字典等租户隔离表专用：复用请求级 RLS 事务并叠加 `search_path`。
    /// `db` 仍保留给尚未完成连接治理的模块。
    pub rls_db: topems_shared_db::Db,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.db.clone()
    }
}

/// B 类读路径：普通用户必须有租户；服务令牌/超管显式走系统通道（落日志 + 计数）。
pub fn tenant_read_scope(
    claims: &Claims,
    source: &'static str,
    table: &'static str,
) -> Result<TenantScope, TopemsError> {
    TenantScope::from_claims(claims, source, table)
        .map_err(|(_, message)| TopemsError::ValidationFailed(message))
}

/// D 类写路径：只允许租户通道，缺失/非法/nil 租户一律 400。
pub fn tenant_write_scope(claims: &Claims) -> Result<TenantScope, TopemsError> {
    TenantScope::require_tenant(claims)
        .map_err(|(_, message)| TopemsError::ValidationFailed(message))
}
