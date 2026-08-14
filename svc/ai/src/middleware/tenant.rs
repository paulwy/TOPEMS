use axum::{extract::FromRequestParts, http::request::Parts, Extension};
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
}

#[allow(dead_code)]
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

#[allow(dead_code)]
pub fn extract_tenant_id(ctx: &TenantContext) -> Uuid {
    ctx.tenant_id
}

impl TenantContext {
    #[allow(dead_code)]
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

    #[test]
    fn test_tenant_context_with_nil_uuids() {
        let ctx = TenantContext {
            tenant_id: Uuid::nil(),
            user_id: Uuid::nil(),
        };
        assert_eq!(ctx.tenant_id, Uuid::nil());
        assert_eq!(ctx.user_id, Uuid::nil());
    }

    #[test]
    fn test_extract_tenant_id() {
        let tenant_id = Uuid::new_v4();
        let ctx = TenantContext {
            tenant_id,
            user_id: Uuid::new_v4(),
        };
        assert_eq!(extract_tenant_id(&ctx), tenant_id);
    }

    #[test]
    fn test_extract_tenant_id_nil() {
        let ctx = TenantContext {
            tenant_id: Uuid::nil(),
            user_id: Uuid::new_v4(),
        };
        assert_eq!(extract_tenant_id(&ctx), Uuid::nil());
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
    fn test_tenant_context_debug() {
        let ctx = TenantContext {
            tenant_id: Uuid::nil(),
            user_id: Uuid::nil(),
        };
        let debug_str = format!("{:?}", ctx);
        assert!(debug_str.contains("TenantContext"));
    }

    #[test]
    fn test_tenant_context_into_extension() {
        let ctx = TenantContext {
            tenant_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
        };
        let extension = ctx.into_extension();
        // Extension wraps the value; just verify it was created
        let _ = extension;
    }

    #[test]
    fn test_tenant_request_struct() {
        let ctx = TenantContext {
            tenant_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
        };
        let req = TenantRequest { ctx: ctx.clone() };
        assert_eq!(req.ctx.tenant_id, ctx.tenant_id);
    }
}
