use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    Extension,
};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared::{ApiResponse, Claims};
use topems_shared_core::response::api_error;

#[derive(Debug, Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub pool: PgPool,
}

#[derive(Debug, Clone)]
pub struct TenantDataAccess {
    pub tenant_id: Uuid,
    pub pool: PgPool,
}

impl TenantDataAccess {
    pub fn new(tenant_id: Uuid, pool: PgPool) -> Self {
        Self { tenant_id, pool }
    }

    pub fn tenant_id(&self) -> Uuid {
        self.tenant_id
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

pub struct TenantRequest {
    pub ctx: TenantContext,
}

impl<S> FromRequestParts<S> for TenantRequest
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, axum::Json<ApiResponse<()>>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let tenant_ctx = parts
            .extensions
            .get::<TenantContext>()
            .cloned()
            .ok_or_else(|| {
                (
                    StatusCode::UNAUTHORIZED,
                    axum::Json(api_error(401, "缺少租户上下文信息")),
                )
            })?;

        Ok(TenantRequest { ctx: tenant_ctx })
    }
}

pub fn extract_tenant_id(ctx: &TenantContext) -> Uuid {
    ctx.tenant_id
}

impl TenantContext {
    pub fn into_extension(self) -> Extension<Self> {
        Extension(self)
    }
}

pub async fn tenant_middleware(
    Extension(claims): Extension<Claims>,
    axum::extract::State(pool): axum::extract::State<PgPool>,
    headers: axum::http::HeaderMap,
    mut req: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let tenant_id = get_tenant_id(&claims, &headers);

    let ctx = TenantContext {
        tenant_id,
        pool: pool.clone(),
    };

    req.extensions_mut().insert(ctx);

    next.run(req).await
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

    #[tokio::test]
    async fn test_tenant_context_creation() {
        let tenant_id = Uuid::new_v4();
        let pool = PgPool::connect_lazy("postgres://localhost/test").unwrap();
        let ctx = TenantContext { tenant_id, pool };
        assert_eq!(ctx.tenant_id, tenant_id);
    }

    #[tokio::test]
    async fn test_tenant_data_access_new() {
        let tenant_id = Uuid::new_v4();
        let pool = PgPool::connect_lazy("postgres://localhost/test").unwrap();
        let tda = TenantDataAccess::new(tenant_id, pool.clone());
        assert_eq!(tda.tenant_id(), tenant_id);
    }
}
