use axum::{
    body::Body,
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use crate::auth::Claims;

fn extract_claims(req: &Request<Body>) -> Option<Claims> {
    req.extensions().get::<Claims>().cloned()
}

pub fn require_permission(
    permission: &'static str,
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let permission = permission;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !claims.has_permission(permission) {
                tracing::warn!(
                    "Permission denied: user={}, permission={}",
                    claims.username,
                    permission
                );
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要 {} 权限","code":403}}"#,
                        permission
                    ),
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

pub fn require_role(
    role: &'static str,
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let role = role;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !claims.has_role(role) {
                tracing::warn!("Role denied: user={}, role={}", claims.username, role);
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要 {} 角色","code":403}}"#,
                        role
                    ),
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

pub fn require_superuser() -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !claims.is_superuser {
                tracing::warn!("Superuser access denied: user={}", claims.username);
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    r#"{"success":false,"message":"权限不足：需要超级管理员权限","code":403}"#,
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

pub fn require_any_permission(
    permissions: &'static [&'static str],
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let permissions = permissions;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !claims.has_any_permission(permissions) {
                tracing::warn!(
                    "Permission denied: user={}, required_any={:?}",
                    claims.username,
                    permissions
                );
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要以下任一权限: {}","code":403}}"#,
                        permissions.join(", ")
                    ),
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}

pub fn require_all_permissions(
    permissions: &'static [&'static str],
) -> impl Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let permissions = permissions;
        Box::pin(async move {
            let claims = match extract_claims(&req) {
                Some(c) => c,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            if !claims.has_all_permissions(permissions) {
                tracing::warn!(
                    "Permission denied: user={}, required_all={:?}",
                    claims.username,
                    permissions
                );
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要以下所有权限: {}","code":403}}"#,
                        permissions.join(", ")
                    ),
                )
                    .into_response();
            }

            next.run(req).await
        })
    }
}