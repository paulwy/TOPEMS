use axum::{
    body::Body,
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use sqlx::PgPool;
use topems_shared::auth::Claims;

use crate::AppState;

pub const X_TENANT_ID: &str = "x-tenant-id";

#[derive(Debug, Clone)]
pub struct TenantId(pub String);

pub fn extract_tenant_id(req: &Request) -> Option<String> {
    req.extensions().get::<TenantId>().map(|t| t.0.clone())
}

async fn set_rls_policy(pool: &PgPool, tenant_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("SELECT set_config('app.current_tenant_id', $1, true)")
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
