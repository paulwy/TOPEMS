//! 请求级租户上下文（RLS GUC 贯通）。
//!
//! 背景：中间件曾把 `app.tenant_id` 设在「自己独占的一条池连接」上，而 handler 用的是
//! `state.pool` 借出的另一条连接 —— GUC 从未真正跟着请求走，策略只能靠「未设 GUC 即全开」
//! 的空分支兜底（fail-open）。
//!
//! 本模块用 tokio task-local 携带租户上下文，并在连接池 `before_acquire` 时把上下文
//! 写到**当前这次 checkout 的连接**上，`after_release` 归还前清空，避免池化串号。
//! 这样请求内任何 `pool.acquire()` 都能拿到正确的租户 GUC，策略才有条件收口为 fail-closed。

use sqlx::postgres::PgPoolOptions;
use std::future::Future;
use tokio::task_local;

/// 一次请求的租户上下午。
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TenantScopeCtx {
    /// 真实租户 ID；超管/系统路径为 `None`（不设租户 GUC）。
    pub tenant_id: Option<String>,
    /// 是否系统特权会话（写 `app.rls_system='on'`）。
    pub is_superuser: bool,
}

impl TenantScopeCtx {
    pub fn tenant(tenant_id: impl Into<String>) -> Self {
        Self {
            tenant_id: Some(tenant_id.into()),
            is_superuser: false,
        }
    }

    pub fn system() -> Self {
        Self {
            tenant_id: None,
            is_superuser: true,
        }
    }
}

task_local! {
    static TENANT_SCOPE: TenantScopeCtx;
}

/// 在租户上下文作用域内执行请求后续所有逻辑（含 handler 内任意 `pool.acquire()`）。
pub async fn scope<F>(ctx: TenantScopeCtx, fut: F) -> F::Output
where
    F: Future,
{
    TENANT_SCOPE.scope(ctx, fut).await
}

/// 读取当前 task 的租户上下文；不在作用域内返回 `None`。
///
/// 灰度开关 `TOPEMS_RLS_CTX`（1/true 开启）：未开启时恒返回 `None`，
/// 连接池回落既有语义 —— 上线代码先「不改变行为」，再按环境逐台打开。
pub fn current() -> Option<TenantScopeCtx> {
    if !plumbing_enabled() {
        return None;
    }
    TENANT_SCOPE.try_with(Clone::clone).ok()
}

fn plumbing_enabled() -> bool {
    static ENABLED: std::sync::OnceLock<bool> = std::sync::OnceLock::new();
    *ENABLED.get_or_init(|| {
        std::env::var("TOPEMS_RLS_CTX")
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false)
    })
}

/// 给连接池挂上租户 GUC 的 checkout / release 钩子。
///
/// - `before_acquire`：有请求上下文则写 `app.tenant_id` + `app.rls_system`（单条查询，一次往返）；
///   无上下文（后台任务、启动期）则回落 `default_tenant`（未配置则清空，保持既有语义）。
/// - `after_release`：无论成败先 `RESET` 两个 GUC，确保归还连接不带任何租户状态。
///
/// 钩子内的错误只记日志、不阻断取连接：GUC 写失败会被策略拦成 0 行（可观测），
/// 而让 hook 返回 Err 会直接打断全站取连接，代价更大。
pub fn apply_pool_hooks(options: PgPoolOptions, default_tenant: Option<String>) -> PgPoolOptions {
    let fallback = default_tenant;
    options
        .before_acquire(move |conn, _meta| {
            let fallback = fallback.clone();
            Box::pin(async move {
                let ctx = current();
                let (tenant, system) = match ctx {
                    Some(c) => (c.tenant_id, c.is_superuser),
                    None => (fallback.clone(), false),
                };
                let system_flag = if system { "on" } else { "off" };
                let tenant_value = tenant.unwrap_or_default();
                if let Err(e) = sqlx::query(
                    "SELECT set_config('app.tenant_id', $1, false), \
                            set_config('app.rls_system', $2, false)",
                )
                .bind(&tenant_value)
                .bind(system_flag)
                .execute(&mut *conn)
                .await
                {
                    tracing::warn!("before_acquire 设置租户 GUC 失败（策略将按无上下文处理）: {e}");
                }
                Ok(true)
            })
        })
        .after_release(|conn, _meta| {
            Box::pin(async move {
                if let Err(e) = sqlx::query(
                    "SELECT set_config('app.tenant_id', '', false), \
                            set_config('app.rls_system', 'off', false)",
                )
                .execute(&mut *conn)
                .await
                {
                    tracing::warn!("after_release 清理租户 GUC 失败: {e}");
                }
                Ok(true)
            })
        })
}
