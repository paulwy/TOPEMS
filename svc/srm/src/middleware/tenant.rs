use axum::{extract::FromRequestParts, http::request::Parts, Extension};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub pool: PgPool,
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

pub async fn tenant_middleware(
    axum::extract::State(pool): axum::extract::State<PgPool>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    mut request: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let tenant_id = claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4);

    let ctx = TenantContext { tenant_id, pool };

    request.extensions_mut().insert(ctx);

    next.run(request).await
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

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_auth::auth::Claims;

    fn sample_claims(tenant_id: Option<&str>) -> Claims {
        Claims {
            sub: "00000000-0000-0000-0000-000000000001".to_string(),
            username: "tester".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant_id.map(|s| s.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    fn make_headers(tenant_id: Option<&str>) -> axum::http::HeaderMap {
        let mut headers = axum::http::HeaderMap::new();
        if let Some(tid) = tenant_id {
            headers.insert("x-tenant-id", tid.parse().unwrap());
        }
        headers
    }

    #[tokio::test]
    async fn test_tenant_context_creation() {
        let tenant_id = Uuid::new_v4();
        let pool = PgPool::connect_lazy("postgres://localhost/test").unwrap();
        let ctx = TenantContext { tenant_id, pool };
        assert_eq!(ctx.tenant_id, tenant_id);
    }

    #[tokio::test]
    async fn test_extract_tenant_id_returns_context_id() {
        let tenant_id = Uuid::new_v4();
        let pool = PgPool::connect_lazy("postgres://localhost/test").unwrap();
        let ctx = TenantContext { tenant_id, pool };
        assert_eq!(extract_tenant_id(&ctx), tenant_id);
    }

    #[test]
    fn test_get_tenant_id_from_claims() {
        let tid = "550e8400-e29b-41d4-a716-446655440000";
        let claims = sample_claims(Some(tid));
        let headers = axum::http::HeaderMap::new();
        let result = get_tenant_id(&claims, &headers);
        assert_eq!(result.to_string(), tid);
    }

    #[test]
    fn test_get_tenant_id_from_headers_when_claims_missing() {
        let claims = sample_claims(None);
        let tid = "550e8400-e29b-41d4-a716-446655440000";
        let headers = make_headers(Some(tid));
        let result = get_tenant_id(&claims, &headers);
        assert_eq!(result.to_string(), tid);
    }

    #[test]
    fn test_get_tenant_id_headers_override_when_claims_invalid() {
        let claims = sample_claims(Some("not-a-uuid"));
        let tid = "550e8400-e29b-41d4-a716-446655440000";
        let headers = make_headers(Some(tid));
        let result = get_tenant_id(&claims, &headers);
        assert_eq!(result.to_string(), tid);
    }

    #[test]
    fn test_get_tenant_id_generates_random_when_both_missing() {
        let claims = sample_claims(None);
        let headers = axum::http::HeaderMap::new();
        let result = get_tenant_id(&claims, &headers);
        // Should generate a valid UUID (not nil)
        assert_ne!(result, Uuid::nil());
    }

    #[test]
    fn test_get_tenant_id_invalid_header_fallback() {
        let claims = sample_claims(None);
        let mut headers = axum::http::HeaderMap::new();
        headers.insert("x-tenant-id", "garbage".parse().unwrap());
        let result = get_tenant_id(&claims, &headers);
        // Should generate a random UUID
        assert_ne!(result, Uuid::nil());
    }

    #[tokio::test]
    async fn test_tenant_data_access_new() {
        let pool = PgPool::connect_lazy("postgres://localhost/test").unwrap();
        let tenant_id = Uuid::new_v4();
        let access = TenantDataAccess::new(pool, tenant_id);
        assert_eq!(access.tenant_id(), tenant_id);
    }

    #[tokio::test]
    async fn test_tenant_data_access_pool() {
        let pool = PgPool::connect_lazy("postgres://localhost/test").unwrap();
        let tenant_id = Uuid::new_v4();
        let access = TenantDataAccess::new(pool, tenant_id);
        // A lazy pool should not be closed (it just hasn't connected yet)
        assert!(!access.pool().is_closed());
    }

    #[tokio::test]
    async fn test_tenant_context_clone() {
        let tenant_id = Uuid::new_v4();
        let pool = PgPool::connect_lazy("postgres://localhost/test").unwrap();
        let ctx = TenantContext { tenant_id, pool };
        let cloned = ctx.clone();
        assert_eq!(cloned.tenant_id, tenant_id);
    }

    #[tokio::test]
    async fn test_tenant_context_into_extension() {
        let tenant_id = Uuid::new_v4();
        let pool = PgPool::connect_lazy("postgres://localhost/test").unwrap();
        let ctx = TenantContext { tenant_id, pool };
        let ext = ctx.into_extension();
        assert_eq!(ext.0.tenant_id, tenant_id);
    }

    #[tokio::test]
    async fn test_tenant_request_struct_holds_context() {
        let tenant_id = Uuid::new_v4();
        let pool = PgPool::connect_lazy("postgres://localhost/test").unwrap();
        let ctx = TenantContext { tenant_id, pool };
        let req = TenantRequest { ctx: ctx.clone() };
        assert_eq!(req.ctx.tenant_id, tenant_id);
    }

    #[test]
    fn test_get_tenant_id_claims_takes_precedence_over_headers() {
        let claims_tid = "550e8400-e29b-41d4-a716-446655440000";
        let header_tid = "660e8400-e29b-41d4-a716-446655440000";
        let claims = sample_claims(Some(claims_tid));
        let headers = make_headers(Some(header_tid));
        let result = get_tenant_id(&claims, &headers);
        assert_eq!(result.to_string(), claims_tid);
    }
}
