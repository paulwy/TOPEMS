use axum::extract::FromRef;
use std::sync::Arc;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::AsyncL2Cache;
use topems_shared_db::scope::Db;
use topems_shared_event::event::EventPublisher;

/// 严格解析请求令牌中的租户：缺失、非法或 nil 一律视为无租户上下文。
///
/// PDM 的写入与查询均以此为唯一入口，不允许用 nil UUID 兜底冒充租户。
pub fn strict_claims_tenant(claims: &Claims) -> Option<uuid::Uuid> {
    claims
        .tenant_id
        .as_deref()
        .and_then(|t| uuid::Uuid::parse_str(t).ok())
        .filter(|t| !t.is_nil())
}

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    /// 连接治理 B：模块不再持有连接池，所有查询经 `Db` 作用域
    /// （事务级 `SET LOCAL search_path = "pdm, public"`）。
    pub db: Db,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for Db {
    fn from_ref(state: &AppState) -> Self {
        state.db.clone()
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn test_appstate_clone_derive_compiles() {
        fn assert_clone<T: Clone>() {}
        assert_clone::<AppState>();
    }

    fn claims_with_tenant(tenant_id: Option<&str>) -> Claims {
        serde_json::from_value(serde_json::json!({
            "sub": "00000000-0000-0000-0000-000000000001",
            "username": "tester",
            "role": "user",
            "roles": [],
            "permissions": [],
            "is_superuser": false,
            "exp": 0,
            "iat": 0,
            "email": null,
            "department": null,
            "tenant_id": tenant_id,
            "department_id": null,
            "position_id": null,
            "position_code": null,
            "must_change_password": false
        }))
        .expect("构造测试 Claims 失败")
    }

    #[test]
    fn strict_tenant_accepts_valid_uuid() {
        let claims = claims_with_tenant(Some("550e8400-e29b-41d4-a716-446655440000"));
        assert_eq!(
            strict_claims_tenant(&claims),
            Some(uuid::Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap())
        );
    }

    #[test]
    fn strict_tenant_rejects_missing() {
        assert_eq!(strict_claims_tenant(&claims_with_tenant(None)), None);
    }

    #[test]
    fn strict_tenant_rejects_nil_uuid() {
        let claims = claims_with_tenant(Some("00000000-0000-0000-0000-000000000000"));
        assert_eq!(strict_claims_tenant(&claims), None);
    }

    #[test]
    fn strict_tenant_rejects_malformed() {
        assert_eq!(
            strict_claims_tenant(&claims_with_tenant(Some("not-a-uuid"))),
            None
        );
    }
}
