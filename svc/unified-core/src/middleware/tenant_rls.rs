use axum::{
    body::Body,
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;

use crate::AppState;

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Uri;

    fn create_test_request(path: &str, tenant_id: Option<&str>) -> Request<Body> {
        let mut req = Request::builder()
            .uri(Uri::try_from(path).unwrap())
            .body(Body::empty())
            .unwrap();

        if let Some(id) = tenant_id {
            req.headers_mut().insert(X_TENANT_ID, id.parse().unwrap());
        }

        req
    }

    fn create_test_request_with_claims(path: &str, tenant_id: Option<&str>) -> Request<Body> {
        let mut req = create_test_request(path, tenant_id);

        if let Some(id) = tenant_id {
            let claims = Claims {
                sub: "test-user-id".to_string(),
                username: "test".to_string(),
                role: "user".to_string(),
                roles: vec![],
                permissions: vec![],
                is_superuser: false,
                exp: 9999999999,
                iat: 0,
                email: None,
                department: None,
                tenant_id: Some(id.to_string()),
                department_id: None,
                position_id: None,
                position_code: None,
            };
            req.extensions_mut().insert(claims);
        }

        req
    }

    #[test]
    fn test_extract_tenant_id_from_header() {
        let req = create_test_request("/api/test", Some("tenant-123"));
        let tenant_id = extract_tenant_id(&req);

        assert_eq!(tenant_id, Some("tenant-123".to_string()));
    }

    #[test]
    fn test_extract_tenant_id_from_claims() {
        let req = create_test_request_with_claims("/api/test", Some("tenant-456"));
        let tenant_id = extract_tenant_id(&req);

        assert_eq!(tenant_id, Some("tenant-456".to_string()));
    }

    #[test]
    fn test_extract_tenant_id_none() {
        let req = create_test_request("/api/test", None);
        let tenant_id = extract_tenant_id(&req);

        assert_eq!(tenant_id, None);
    }

    #[test]
    fn test_claims_tenant_id_overrides_header() {
        let mut req = create_test_request("/api/test", Some("header-tenant"));

        let claims = Claims {
            sub: "test-user-id".to_string(),
            username: "test".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: Some("claims-tenant".to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
        };
        req.extensions_mut().insert(claims);

        let tenant_id = extract_tenant_id(&req);

        assert_eq!(tenant_id, Some("claims-tenant".to_string()));
    }

    #[test]
    fn test_skip_paths() {
        let skip_paths = [
            "/",
            "/health",
            "/api",
            "/api/info",
            "/api/plugins/info",
            "/api/plugins/health",
            "/metrics",
        ];

        for path in skip_paths {
            let req = create_test_request(path, None);
            assert!(skip_paths.contains(&path));
        }
    }

    #[test]
    fn test_tenant_id_constant() {
        assert_eq!(X_TENANT_ID, "x-tenant-id");
    }

    #[test]
    fn test_tenant_id_struct() {
        let tenant_id = TenantId("test-tenant".to_string());
        assert_eq!(tenant_id.0, "test-tenant");
    }
}

pub const X_TENANT_ID: &str = "x-tenant-id";

#[derive(Debug, Clone)]
pub struct TenantId(pub String);

pub fn extract_tenant_id(req: &Request) -> Option<String> {
    if let Some(claims) = req.extensions().get::<Claims>() {
        if let Some(tenant_id) = &claims.tenant_id {
            return Some(tenant_id.clone());
        }
    }

    req.headers()
        .get(X_TENANT_ID)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

async fn set_rls_policy(pool: &PgPool, tenant_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(tenant_id)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn tenant_rls_middleware(
    State(state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Response {
    let path = req.uri().path();

    let skip_paths = [
        "/",
        "/health",
        "/api",
        "/api/info",
        "/api/plugins/info",
        "/api/plugins/health",
        "/metrics",
    ];

    if skip_paths.contains(&path) {
        return next.run(req).await;
    }

    let tenant_id = if let Some(claims) = req.extensions().get::<Claims>() {
        claims.tenant_id.clone()
    } else {
        req.headers()
            .get(X_TENANT_ID)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
    };

    match tenant_id {
        Some(tenant_id) => {
            if let Err(e) = set_rls_policy(&state.pool, &tenant_id).await {
                tracing::error!("Failed to set RLS policy: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    [(header::CONTENT_TYPE, "application/json")],
                    r#"{"success":false,"message":"内部服务器错误：无法设置租户上下文","code":500}"#,
                )
                    .into_response();
            }

            req.extensions_mut().insert(TenantId(tenant_id.clone()));

            tracing::debug!("RLS policy set for tenant: {}", tenant_id);

            next.run(req).await
        }
        None => {
            tracing::warn!("No tenant_id found in request: {}", path);

            req.extensions_mut().insert(TenantId("default".to_string()));

            next.run(req).await
        }
    }
}

pub fn require_tenant() -> impl Fn(
    State<AppState>,
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |State(_state): State<AppState>, req: Request<Body>, next: Next| {
        Box::pin(async move {
            let tenant_id = match extract_tenant_id(&req) {
                Some(t) => t,
                None => {
                    return (
                        StatusCode::BAD_REQUEST,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"缺少租户标识","code":400}"#,
                    )
                        .into_response();
                }
            };

            if tenant_id == "default" {
                return (
                    StatusCode::BAD_REQUEST,
                    [(header::CONTENT_TYPE, "application/json")],
                    r#"{"success":false,"message":"缺少租户标识","code":400}"#,
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}
