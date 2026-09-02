use crate::auth::Claims;
use axum::{
    body::Body,
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::IntoResponse,
};

use crate::auth::is_public_path;

fn extract_claims(req: &Request<Body>) -> Option<Claims> {
    req.extensions().get::<Claims>().cloned()
}

pub fn require_permission(
    permission: &'static str,
) -> impl Fn(
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let permission = permission;
        Box::pin(async move {
            // 与 auth_middleware 一致：public 路径（/health、auth 端点等）豁免。
            // axum nest 剥离前缀后 /api/{svc}/health → /health，auth_middleware 已豁免
            // （Claims 不注入），此处若不复核会对 public 路径误判 401。
            if is_public_path(&req.uri().path().to_string()) {
                return next.run(req).await;
            }
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
) -> impl Fn(
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let role = role;
        Box::pin(async move {
            // 与 auth_middleware 一致：public 路径（/health、auth 端点等）豁免。
            // axum nest 剥离前缀后 /api/{svc}/health → /health，auth_middleware 已豁免
            // （Claims 不注入），此处若不复核会对 public 路径误判 401。
            if is_public_path(&req.uri().path().to_string()) {
                return next.run(req).await;
            }
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

pub fn require_superuser() -> impl Fn(
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        Box::pin(async move {
            // 与 auth_middleware 一致：public 路径（/health、auth 端点等）豁免。
            // axum nest 剥离前缀后 /api/{svc}/health → /health，auth_middleware 已豁免
            // （Claims 不注入），此处若不复核会对 public 路径误判 401。
            if is_public_path(&req.uri().path().to_string()) {
                return next.run(req).await;
            }
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
) -> impl Fn(
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let permissions = permissions;
        Box::pin(async move {
            // 与 auth_middleware 一致：public 路径（/health、auth 端点等）豁免。
            // axum nest 剥离前缀后 /api/{svc}/health → /health，auth_middleware 已豁免
            // （Claims 不注入），此处若不复核会对 public 路径误判 401。
            if is_public_path(&req.uri().path().to_string()) {
                return next.run(req).await;
            }
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
) -> impl Fn(
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let permissions = permissions;
        Box::pin(async move {
            // 与 auth_middleware 一致：public 路径（/health、auth 端点等）豁免。
            // axum nest 剥离前缀后 /api/{svc}/health → /health，auth_middleware 已豁免
            // （Claims 不注入），此处若不复核会对 public 路径误判 401。
            if is_public_path(&req.uri().path().to_string()) {
                return next.run(req).await;
            }
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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request, routing::get, Router};
    use tower::ServiceExt;

    fn make_claims(perms: &[&str], is_superuser: bool, roles: &[&str]) -> Claims {
        Claims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            username: "tester".to_string(),
            role: "user".to_string(),
            roles: roles.iter().map(|s| s.to_string()).collect(),
            permissions: perms.iter().map(|s| s.to_string()).collect(),
            is_superuser,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    fn build_app<F>(mw: F) -> Router
    where
        F: Fn(
                Request<Body>,
                Next,
            ) -> std::pin::Pin<
                Box<dyn std::future::Future<Output = axum::response::Response> + Send>,
            > + Clone
            + Send
            + Sync
            + 'static,
    {
        Router::new()
            .route("/protected", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn(mw))
    }

    async fn send<F>(mw: F, claims: Option<Claims>) -> StatusCode
    where
        F: Fn(
                Request<Body>,
                Next,
            ) -> std::pin::Pin<
                Box<dyn std::future::Future<Output = axum::response::Response> + Send>,
            > + Clone
            + Send
            + Sync
            + 'static,
    {
        let app = build_app(mw);
        let mut req = Request::builder()
            .uri("/protected")
            .body(Body::empty())
            .unwrap();
        if let Some(c) = claims {
            req.extensions_mut().insert(c);
        }
        app.oneshot(req).await.expect("infallible").status()
    }

    fn build_req(claims: Option<Claims>) -> Request<Body> {
        let mut req = Request::builder().uri("/x").body(Body::empty()).unwrap();
        if let Some(c) = claims {
            req.extensions_mut().insert(c);
        }
        req
    }

    // ===== extract_claims =====
    #[test]
    fn test_extract_claims_none_when_missing() {
        let req = build_req(None);
        assert!(extract_claims(&req).is_none());
    }

    #[test]
    fn test_extract_claims_some_when_present() {
        let req = build_req(Some(make_claims(&["p"], false, &[])));
        let c = extract_claims(&req);
        assert!(c.is_some());
        assert_eq!(c.unwrap().username, "tester");
    }

    // ===== require_permission =====
    #[tokio::test]
    async fn test_require_permission_unauthorized_without_claims() {
        let status = send(require_permission("iam:dashboard:read"), None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_require_permission_forbidden_when_missing() {
        let claims = make_claims(&["other:perm"], false, &[]);
        let status = send(require_permission("iam:dashboard:read"), Some(claims)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_require_permission_ok_when_has() {
        let claims = make_claims(&["iam:dashboard:read"], false, &[]);
        let status = send(require_permission("iam:dashboard:read"), Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_permission_ok_for_superuser() {
        let claims = make_claims(&[], true, &[]);
        let status = send(
            require_permission("admin:iam:dashboard:approve"),
            Some(claims),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    }

    // ===== require_role =====
    #[tokio::test]
    async fn test_require_role_unauthorized_without_claims() {
        let status = send(require_role("admin"), None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_require_role_forbidden_when_missing() {
        let claims = make_claims(&[], false, &["user"]);
        let status = send(require_role("admin"), Some(claims)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_require_role_ok_when_has() {
        let claims = make_claims(&[], false, &["admin"]);
        let status = send(require_role("admin"), Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }

    // ===== require_superuser =====
    #[tokio::test]
    async fn test_require_superuser_unauthorized_without_claims() {
        let status = send(require_superuser(), None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_require_superuser_forbidden_for_normal_user() {
        let claims = make_claims(&[], false, &[]);
        let status = send(require_superuser(), Some(claims)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_require_superuser_ok_for_superuser() {
        let claims = make_claims(&[], true, &[]);
        let status = send(require_superuser(), Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }

    // ===== require_any_permission =====
    #[tokio::test]
    async fn test_require_any_permission_forbidden_when_none_match() {
        let claims = make_claims(&["a", "b"], false, &[]);
        let status = send(require_any_permission(&["x", "y"]), Some(claims)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_require_any_permission_ok_when_one_matches() {
        let claims = make_claims(&["a", "b"], false, &[]);
        let status = send(require_any_permission(&["x", "b"]), Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }

    // ===== require_all_permissions =====
    #[tokio::test]
    async fn test_require_all_permissions_forbidden_on_partial_match() {
        let claims = make_claims(&["a", "b"], false, &[]);
        let status = send(require_all_permissions(&["a", "b", "c"]), Some(claims)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_require_all_permissions_ok_when_all_match() {
        let claims = make_claims(&["a", "b", "c"], false, &[]);
        let status = send(require_all_permissions(&["a", "b", "c"]), Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }
}
