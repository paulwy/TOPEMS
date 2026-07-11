use axum::{extract::FromRequestParts, http::request::Parts, Extension};
use topems_shared::auth::Claims;
use uuid::Uuid;

use topems_shared::ApiResponse;

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

impl TenantContext {
    pub fn into_extension(self) -> Extension<Self> {
        Extension(self)
    }
}

pub async fn tenant_middleware(
    Extension(claims): Extension<Claims>,
    mut req: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let tenant_id = claims
        .tenant_id
        .clone()
        .and_then(|id| Uuid::parse_str(&id).ok())
        .unwrap_or(Uuid::nil());

    let user_id = claims.user_id().unwrap_or(Uuid::nil());

    let tenant_context = TenantContext { tenant_id, user_id };
    req.extensions_mut().insert(tenant_context);

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
