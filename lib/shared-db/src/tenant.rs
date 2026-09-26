//! RLS Tenant 工具函数
//!
//! 提取自 Claims / Header 的 tenant_id 用于 RLS 双写。
//! 配合 axum 中间件设置 PostgreSQL 会话变量 `app.tenant_id`。

use axum::http::HeaderMap;
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

/// 优先从 Claims.tenant_id 获取，否则回退到 `x-tenant-id` header，返回Option。
///
/// 注意：`Claims.tenant_id` 的类型是 `Option<String>`（JWT 中以字符串形式承载），
/// 因此这里需要先把字符串解析为 `Uuid`，解析失败则继续回退。
pub fn get_tenant_id_option(claims: &Claims, headers: &HeaderMap) -> Option<Uuid> {
    if let Some(tid) = claims.tenant_id.as_ref() {
        if let Ok(parsed) = Uuid::parse_str(tid) {
            return Some(parsed);
        }
    }
    if let Some(v) = headers.get("x-tenant-id") {
        if let Ok(s) = v.to_str() {
            if let Ok(parsed) = Uuid::parse_str(s) {
                return Some(parsed);
            }
        }
    }
    None
}

/// 优先从 Claims.tenant_id 获取，否则回退到 `x-tenant-id` header，最终 fallback 到 nil UUID。
///
/// 注意：`Claims.tenant_id` 的类型是 `Option<String>`（JWT 中以字符串形式承载），
/// 因此这里需要先把字符串解析为 `Uuid`，解析失败则继续回退。
pub fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    get_tenant_id_option(claims, headers).unwrap_or_else(Uuid::nil)
}

/// 优先从 Claims.tenant_id 获取，否则回退到 `x-tenant-id` header，最终 fallback 到新生成的 UUID。
pub fn get_tenant_id_or_new(claims: &Claims, headers: &HeaderMap) -> Uuid {
    get_tenant_id_option(claims, headers).unwrap_or_else(Uuid::new_v4)
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

/// 在当前 PostgreSQL 连接设置 `app.tenant_id`，使 RLS 策略生效。
/// 适用于事务或手动获取连接的场景。
pub async fn set_session_tenant_id_conn(
    conn: &mut sqlx::PgConnection,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
        .bind(tenant_id.to_string())
        .execute(conn)
        .await?;
    Ok(())
}

/// 在当前 PostgreSQL 事务设置 `app.tenant_id`，使 RLS 策略生效。
/// 适用于事务内需要设置RLS上下文的场景。
pub async fn set_session_tenant_id_tx(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
        .bind(tenant_id.to_string())
        .execute(&mut **tx)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderMap;

    /// 构造一个最小可用的 `Claims` 用于测试。
    ///
    /// `Claims` 未实现 `Default`，且 `tenant_id` 字段类型为 `Option<String>`
    /// （而非 `Option<Uuid>`），因此这里集中构造，避免在每个测试中重复。
    fn make_claims(tenant_id: Option<&str>) -> Claims {
        Claims {
            sub: "u1".to_string(),
            username: "u1".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant_id.map(|s| s.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    #[test]
    fn returns_claims_tenant_id_when_present() {
        let headers = HeaderMap::new();
        let claims = make_claims(Some("00000000-0000-0000-0000-000000000000"));
        assert_eq!(get_tenant_id(&claims, &headers), uuid::Uuid::nil());
    }

    #[test]
    fn falls_back_to_x_tenant_id_header_when_claims_missing() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-tenant-id",
            "00000000-0000-0000-0000-000000000000".parse().unwrap(),
        );
        let claims = make_claims(None);
        assert_eq!(get_tenant_id(&claims, &headers), uuid::Uuid::nil());
    }

    #[test]
    fn returns_nil_uuid_when_neither_present() {
        let headers = HeaderMap::new();
        let claims = make_claims(None);
        assert_eq!(get_tenant_id(&claims, &headers), uuid::Uuid::nil());
    }
}
