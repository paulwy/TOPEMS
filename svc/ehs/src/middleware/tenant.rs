use axum::{
    body::Body,
    extract::FromRequestParts,
    http::{request::Parts, Request},
    middleware::Next,
    response::Response,
    Extension,
};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared::{ApiResponse, Claims};

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

pub async fn tenant_middleware(mut req: Request<Body>, next: Next) -> Response {
    let claims = req.extensions().get::<Claims>().cloned();

    let tenant_id = claims
        .as_ref()
        .and_then(|c| c.tenant_id.as_ref())
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            req.headers()
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4);

    let user_id = claims
        .as_ref()
        .and_then(|c| Uuid::parse_str(&c.sub).ok())
        .unwrap_or_else(Uuid::new_v4);

    let ctx = TenantContext { tenant_id, user_id };
    req.extensions_mut().insert(ctx);

    next.run(req).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tenant_context_creation() {
        let tenant_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let ctx = TenantContext { tenant_id, user_id };
        assert_eq!(ctx.tenant_id, tenant_id);
        assert_eq!(ctx.user_id, user_id);
    }
}
