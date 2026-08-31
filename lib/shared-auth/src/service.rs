//! # 服务间认证（Service-to-Service Auth）
//!
//! 服务 A 调用服务 B 时，用**共享 JWT 密钥**签发"服务身份" token，
//! 替代转发前端用户 token（前端用户通常缺少目标服务的内部权限 → 401 降级）。
//!
//! ## 设计原则
//! - **最小权限**：调用方显式声明所需权限（如 `&["wms:admin"]`），而非签发超管。
//! - **短时效**：默认 5 分钟有效，每次调用重新签发，降低泄漏窗口。
//! - **可审计**：`username` 固定为服务名（如 `"erp-service"`），日志可区分服务与真实用户。
//! - **零依赖密钥**：各服务经 `AuthState::from_env()` 读取同一 `JWT_SECRET`，
//!   签发方与验证方密钥天然一致，无需额外配置。
//!
//! ## 使用
//! ```rust
//! let token = issue_service_token(jwt_secret, "erp-service", &["wms:admin"], None)?;
//! client.get(url).header("Authorization", format!("Bearer {}", token))
//! ```

use crate::auth::Claims;
use topems_shared_core::error::TopemsError;

/// 服务身份 token 默认有效期（秒）：5 分钟
pub const SERVICE_TOKEN_TTL_SECS: usize = 300;

/// 服务身份的固定 sub（非真实用户，标识系统级调用）
pub const SERVICE_SUBJECT: &str = "00000000-0000-0000-0000-000000000000";

/// 服务身份的固定 role（区分于真实用户的业务角色）
pub const SERVICE_ROLE: &str = "service";

/// 签发服务间认证 token（HS256/RS256 由 `jwt_secret` 格式自动选择）。
///
/// - `jwt_secret`: 共享 JWT 密钥（与目标服务 `AuthState::from_env()` 读取的一致）。
/// - `username`: 调用方服务名（如 `"erp-service"`），用于审计与日志。
/// - `permissions`: 调用目标服务所需的最小权限集合（如 `&["wms:admin"]`）。
/// - `ttl_secs`: 有效期秒数，`None` 时使用 [`SERVICE_TOKEN_TTL_SECS`]（300 秒）。
pub fn issue_service_token(
    jwt_secret: &str,
    username: &str,
    permissions: &[&str],
    ttl_secs: Option<usize>,
) -> Result<String, TopemsError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as usize)
        .unwrap_or(0);
    let ttl = ttl_secs.unwrap_or(SERVICE_TOKEN_TTL_SECS);

    let claims = Claims {
        sub: SERVICE_SUBJECT.to_string(),
        username: username.to_string(),
        role: SERVICE_ROLE.to_string(),
        roles: vec![SERVICE_ROLE.to_string()],
        permissions: permissions.iter().map(|s| s.to_string()).collect(),
        is_superuser: false,
        exp: now + ttl,
        iat: now,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
    };
    claims.encode(jwt_secret)
}

/// 判断 Claims 是否为服务身份（非真实用户）。
///
/// 被调用方可在中间件中用于区分服务调用与用户调用（如审计、告警差异）。
pub fn is_service_claims(claims: &Claims) -> bool {
    claims.role == SERVICE_ROLE
        || (claims.sub == SERVICE_SUBJECT && claims.username.ends_with("-service"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::verify_jwt_token;

    const TEST_SECRET: &str = "topems-test-jwt-secret-key-at-least-32-characters-long";

    #[test]
    fn test_issue_service_token_roundtrip() {
        let token = issue_service_token(TEST_SECRET, "erp-service", &["wms:admin"], None)
            .expect("签发成功");
        let claims = verify_jwt_token(&token, TEST_SECRET).expect("验证成功");

        assert_eq!(claims.username, "erp-service");
        assert_eq!(claims.role, SERVICE_ROLE);
        assert_eq!(claims.permissions, vec!["wms:admin"]);
        assert!(!claims.is_superuser, "服务 token 不应为超管");
        assert!(is_service_claims(&claims));
    }

    #[test]
    fn test_issue_service_token_custom_ttl() {
        let token = issue_service_token(TEST_SECRET, "portal-service", &["erp:read"], Some(60))
            .expect("签发成功");
        let claims = verify_jwt_token(&token, TEST_SECRET).expect("验证成功");
        assert_eq!(claims.exp - claims.iat, 60);
    }

    #[test]
    fn test_is_service_claims_false_for_user() {
        let user_claims = Claims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            username: "alice".to_string(),
            role: "admin".to_string(),
            roles: vec!["admin".to_string()],
            permissions: vec!["wms:admin".to_string()],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
        };
        assert!(!is_service_claims(&user_claims));
    }
}
