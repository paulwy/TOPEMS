//! MES Tenant 工具函数
//!
//! 提取自 Claims / Header 的 tenant_id 用于 RLS 双写。
//! 配合 axum 中间件设置 PostgreSQL 会话变量 `app.tenant_id`。

use axum::http::HeaderMap;
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

/// 优先从 Claims.tenant_id 获取，否则回退到 `x-tenant-id` header，最终 fallback 到 nil UUID。
///
/// 注意：`Claims.tenant_id` 的类型是 `Option<String>`（JWT 中以字符串形式承载），
/// 因此这里需要先把字符串解析为 `Uuid`，解析失败则继续回退。
pub fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    if let Some(tid) = claims.tenant_id.as_ref() {
        if let Ok(parsed) = Uuid::parse_str(tid) {
            return parsed;
        }
    }
    if let Some(v) = headers.get("x-tenant-id") {
        if let Ok(s) = v.to_str() {
            if let Ok(parsed) = Uuid::parse_str(s) {
                return parsed;
            }
        }
    }
    Uuid::nil()
}

/// 在当前 PostgreSQL 会话设置 `app.tenant_id`，使 RLS 策略生效。
/// 必须在每条业务 SQL 之前调用（一次连接内一次即可，但 sqlx-pool 每次取连接需重设）。
pub async fn set_session_tenant_id(
    pool: &sqlx::PgPool,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
        .bind(tenant_id.to_string())
        .execute(pool)
        .await?;
    Ok(())
}
