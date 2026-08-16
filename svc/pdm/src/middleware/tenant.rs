use axum::{extract::FromRequestParts, http::request::Parts, Extension};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
}

pub struct TenantRequest {
    pub ctx: TenantContext,
}

impl<S> FromRequestParts<S> for TenantRequest
where
    S: Send + Sync,
{
    type Rejection = ApiResponse<()>;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let tenant_ctx = parts
            .extensions
            .get::<TenantContext>()
            .cloned()
            .ok_or_else(|| ApiResponse::error(401, "缺少租户上下文信息"))?;

        Ok(TenantRequest { ctx: tenant_ctx })
    }
}

pub fn extract_tenant_id(ctx: &TenantContext) -> Uuid {
    ctx.tenant_id
}

pub struct TenantDataAccess {
    pool: PgPool,
    tenant_id: Uuid,
}

impl TenantDataAccess {
    pub fn new(pool: PgPool, tenant_id: Uuid) -> Self {
        Self { pool, tenant_id }
    }

    pub fn tenant_id(&self) -> Uuid {
        self.tenant_id
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

impl TenantContext {
    pub fn into_extension(self) -> Extension<Self> {
        Extension(self)
    }
}

pub fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub async fn tenant_middleware(
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    mut request: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let tenant_id = get_tenant_id(&claims, &headers);
    let user_id = Uuid::parse_str(&claims.sub).unwrap_or_else(|_| Uuid::new_v4());

    let ctx = TenantContext { tenant_id, user_id };
    request.extensions_mut().insert(ctx);

    next.run(request).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderMap;
    use topems_shared_auth::auth::Claims;

    #[test]
    fn test_tenant_context_creation() {
        let tenant_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let ctx = TenantContext { tenant_id, user_id };
        assert_eq!(ctx.tenant_id, tenant_id);
        assert_eq!(ctx.user_id, user_id);
    }

    #[test]
    fn test_tenant_context_clone() {
        let ctx = TenantContext {
            tenant_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
        };
        let cloned = ctx.clone();
        assert_eq!(cloned.tenant_id, ctx.tenant_id);
        assert_eq!(cloned.user_id, ctx.user_id);
    }

    #[test]
    fn test_extract_tenant_id() {
        let tid = Uuid::new_v4();
        let ctx = TenantContext {
            tenant_id: tid,
            user_id: Uuid::new_v4(),
        };
        assert_eq!(extract_tenant_id(&ctx), tid);
    }

    #[tokio::test]
    async fn test_tenant_data_access_new_and_getters() {
        let tid = Uuid::new_v4();
        let opts = sqlx::postgres::PgConnectOptions::new().host("localhost");
        let pool = PgPool::connect_lazy_with(opts);
        let tda = TenantDataAccess::new(pool.clone(), tid);
        assert_eq!(tda.tenant_id(), tid);
        let _ = tda.pool();
    }

    #[test]
    fn test_get_tenant_id_from_claims() {
        let tid = Uuid::new_v4();
        let claims = Claims {
            tenant_id: Some(tid.to_string()),
            sub: Uuid::new_v4().to_string(),
            username: "user".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            department_id: None,
            position_id: None,
            position_code: None,
        };
        let headers = HeaderMap::new();
        let result = get_tenant_id(&claims, &headers);
        assert_eq!(result, tid);
    }

    #[test]
    fn test_get_tenant_id_from_headers_when_claims_missing() {
        let tid = Uuid::new_v4();
        let claims = Claims {
            tenant_id: None,
            sub: Uuid::new_v4().to_string(),
            username: "u".to_string(),
            role: "r".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            department_id: None,
            position_id: None,
            position_code: None,
        };
        let mut headers = HeaderMap::new();
        headers.insert("x-tenant-id", tid.to_string().parse().unwrap());
        let result = get_tenant_id(&claims, &headers);
        assert_eq!(result, tid);
    }

    #[test]
    fn test_get_tenant_id_fallback_when_both_missing() {
        let claims = Claims {
            tenant_id: None,
            sub: Uuid::new_v4().to_string(),
            username: "u".to_string(),
            role: "r".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            department_id: None,
            position_id: None,
            position_code: None,
        };
        let headers = HeaderMap::new();
        let result = get_tenant_id(&claims, &headers);
        assert!(result != Uuid::nil());
    }

    #[test]
    fn test_get_tenant_id_invalid_claims_uuid_falls_back_to_header() {
        let tid = Uuid::new_v4();
        let claims = Claims {
            tenant_id: Some("invalid-uuid".to_string()),
            sub: Uuid::new_v4().to_string(),
            username: "u".to_string(),
            role: "r".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            department_id: None,
            position_id: None,
            position_code: None,
        };
        let mut headers = HeaderMap::new();
        headers.insert("x-tenant-id", tid.to_string().parse().unwrap());
        let result = get_tenant_id(&claims, &headers);
        assert_eq!(result, tid);
    }

    #[test]
    fn test_get_tenant_id_invalid_header_uuid_generates_new() {
        let claims = Claims {
            tenant_id: None,
            sub: Uuid::new_v4().to_string(),
            username: "u".to_string(),
            role: "r".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            department_id: None,
            position_id: None,
            position_code: None,
        };
        let mut headers = HeaderMap::new();
        headers.insert("x-tenant-id", "bad-uuid".parse().unwrap());
        let result = get_tenant_id(&claims, &headers);
        assert!(result != Uuid::nil());
    }
}
