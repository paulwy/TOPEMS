//! WMS 租户作用域与库存短事务基建（W7-B4）
//!
//! 背景：`tenant_middleware` 为每个请求在 **handler 之前** 开启一个事务并设置
//! `app.tenant_id`，响应后再提交。库存写路径需要一个**短事务 + 行锁**的边界，
//! 并且不能在请求事务之外另起一条未设 GUC 的连接（RLS fail-closed 后那条连接
//! 会把所有行都过滤掉）。
//!
//! 因此库存写路径统一为：
//! 1. [`tenant_of`] 解析并强制租户（超管必须带 `x-tenant-id`，中间件已校验）；
//! 2. [`release_request_txn`] 回滚并释放请求事务（此前未写入，回滚无副作用，
//!    同时避免每请求占用两条连接）；
//! 3. [`wms_db`] + `Db::scope_for_tenant(tenant)` 开独立短事务，事务内完成
//!    行锁、扣减、movement 与状态更新，最后显式 `commit()`。
//!
//! 其余非库存写路由继续复用请求事务，只做租户收敛与 0 行校验。

use topems_shared_auth::middleware::tenant::RlsTxnCell;
use axum::http::HeaderMap;
use sqlx::PgPool;
use std::time::Instant;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::require_tenant;
use topems_shared_db::scope::{Db, ScopedTxn};
use uuid::Uuid;

/// 短事务行锁等待上限：2s（`SET LOCAL`/`set_config(..., true)` 仅当前事务生效）。
pub const SHORT_TXN_LOCK_TIMEOUT: &str = "2s";

/// 短事务耗时告警阈值：500ms。
pub const SHORT_TXN_WARN_MS: u64 = 500;

/// WMS 模块的 `Db` 视图（`wms, public` 作用域）。
pub fn wms_db(pool: &PgPool) -> Db {
    Db::new(pool.clone(), "wms, public")
}

/// 解析请求要落库/过滤的租户。
///
/// 超管在中间件已被要求显式携带 `x-tenant-id` 并写入 `claims.tenant_id`，
/// 因此这里与普通用户走同一路径：拿不到租户即 400，绝不降级为 `NULL` 公共行。
pub fn tenant_of(claims: &Claims, headers: &HeaderMap) -> Result<Uuid, (u16, String)> {
    require_tenant(claims, headers)
}

/// 回滚并释放中间件开启的请求事务。
///
/// 库存写路径改用独立短事务后，请求事务里没有任何写入，回滚是空的；释放连接
/// 后 `guard.take()` 返回 `None`，中间件收尾会直接跳过提交，不会二次提交。
pub async fn release_request_txn(cell: &RlsTxnCell) -> Result<(), sqlx::Error> {
    let mut guard = cell.lock().await;
    match guard.take() {
        Some(tx) => tx.rollback().await,
        None => Ok(()),
    }
}

/// 库存移动单号：`MV-YYYYMMDD-<uuid8>`。
///
/// 原实现用 `COUNT(*)+1`，并发下同一天必然重号（表上无唯一约束，不会报错，
/// 但下游按单号对账会串）。改用随机后缀，天然无碰撞。
pub fn movement_no(now: chrono::DateTime<chrono::Utc>) -> String {
    let suffix = Uuid::new_v4().simple().to_string();
    format!("MV-{}-{}", now.format("%Y%m%d"), &suffix[..8])
}

/// 给独立短事务设置 `lock_timeout`（2s）。
///
/// 用 `set_config(..., true)`（等价 `SET LOCAL`）：只作用于当前事务，
/// 连接归还池后不残留，不会污染后续请求。
pub async fn arm_short_txn(scope: &mut ScopedTxn<'_>) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT set_config('lock_timeout', $1, true)")
        .bind(SHORT_TXN_LOCK_TIMEOUT)
        .execute(scope)
        .await
        .map(|_| ())
}

/// 短事务耗时观测：沿用现有 tracing 日志体系，不新建指标栈。
///
/// `finish()` 在事务提交后调用；耗时 ≥ [`SHORT_TXN_WARN_MS`] 打 `warn`，
/// 否则打 `debug`（默认日志级别下不产生噪音）。
pub struct ShortTxnTimer {
    op: &'static str,
    started: Instant,
}

impl ShortTxnTimer {
    pub fn start(op: &'static str) -> Self {
        Self {
            op,
            started: Instant::now(),
        }
    }

    pub fn finish(&self) {
        let elapsed_ms = self.started.elapsed().as_millis() as u64;
        if elapsed_ms >= SHORT_TXN_WARN_MS {
            tracing::warn!(
                target: "wms.txn",
                op = self.op,
                elapsed_ms,
                threshold_ms = SHORT_TXN_WARN_MS,
                "短事务耗时超过告警阈值"
            );
        } else {
            tracing::debug!(
                target: "wms.txn",
                op = self.op,
                elapsed_ms,
                "短事务耗时"
            );
        }
    }
}
