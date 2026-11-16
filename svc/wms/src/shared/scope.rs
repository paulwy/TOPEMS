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
use topems_shared_auth::auth::Claims;
use topems_shared_auth::require_tenant;
use topems_shared_db::scope::Db;
use uuid::Uuid;

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
