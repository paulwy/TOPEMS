use crate::auth::Claims;
use crate::permission::{ModuleCode, PermissionAction};
use axum::{
    body::Body,
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::IntoResponse,
};

pub fn require_module_active(
    module: ModuleCode,
) -> impl Fn(
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let module = module.clone();
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
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

            if claims.is_superuser {
                return next.run(req).await;
            }

            let permission = format!("{}:read", module.as_str());
            if claims.has_permission(&permission) {
                return next.run(req).await;
            }

            let admin_permission = format!("{}:admin", module.as_str());
            if claims.has_permission(&admin_permission) {
                return next.run(req).await;
            }

            tracing::warn!(
                "Module access denied: user={}, module={}",
                claims.username,
                module.as_str()
            );
            (
                StatusCode::FORBIDDEN,
                [(header::CONTENT_TYPE, "application/json")],
                format!(
                    r#"{{"success":false,"message":"模块未激活或权限不足：{}","code":403}}"#,
                    module.as_str()
                ),
            )
                .into_response()
        })
    }
}

pub fn require_module_permission(
    module: ModuleCode,
    action: PermissionAction,
) -> impl Fn(
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let module = module.clone();
        let action = action.clone();
        Box::pin(async move {
            let claims = match req.extensions().get::<Claims>() {
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

            if claims.is_superuser {
                return next.run(req).await;
            }

            let permission = format!("{}:{}", module.as_str(), action.as_str());
            if claims.has_permission(&permission) {
                return next.run(req).await;
            }

            let admin_permission = format!("{}:admin", module.as_str());
            if claims.has_permission(&admin_permission) {
                return next.run(req).await;
            }

            if action.level() <= PermissionAction::Read.level() {
                let read_permission = format!("{}:read", module.as_str());
                if claims.has_permission(&read_permission) {
                    return next.run(req).await;
                }
            }

            tracing::warn!(
                "Module permission denied: user={}, module={}, action={}",
                claims.username,
                module.as_str(),
                action.as_str()
            );
            (
                StatusCode::FORBIDDEN,
                [(header::CONTENT_TYPE, "application/json")],
                format!(
                    r#"{{"success":false,"message":"权限不足：需要 {}:{} 权限","code":403}}"#,
                    module.as_str(),
                    action.as_str()
                ),
            )
                .into_response()
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request, routing::get, Router};
    use tower::ServiceExt;

    fn make_claims(perms: &[&str], is_superuser: bool) -> Claims {
        Claims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            username: "tester".to_string(),
            role: "user".to_string(),
            roles: vec![],
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

    async fn send<F>(mw: F, claims: Option<Claims>) -> StatusCode
    where
        F: Fn(Request<Body>, Next) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
            + Clone
            + Send
            + Sync
            + 'static,
    {
        let app = Router::new()
            .route("/protected", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn(mw));
        let mut req = Request::builder()
            .uri("/protected")
            .body(Body::empty())
            .unwrap();
        if let Some(c) = claims {
            req.extensions_mut().insert(c);
        }
        app.oneshot(req).await.expect("infallible").status()
    }

    // ===== require_module_active =====
    #[tokio::test]
    async fn test_require_module_active_unauthorized_without_claims() {
        let status = send(require_module_active(ModuleCode::Iam), None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_require_module_active_ok_for_superuser() {
        let claims = make_claims(&[], true);
        let status = send(require_module_active(ModuleCode::Iam), Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_module_active_ok_with_read_permission() {
        let claims = make_claims(&["iam:read"], false);
        let status = send(require_module_active(ModuleCode::Iam), Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_module_active_ok_with_admin_permission() {
        let claims = make_claims(&["iam:admin"], false);
        let status = send(require_module_active(ModuleCode::Iam), Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_module_active_forbidden_without_permission() {
        let claims = make_claims(&["hrm:read"], false);
        let status = send(require_module_active(ModuleCode::Iam), Some(claims)).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }

    // ===== require_module_permission =====
    #[tokio::test]
    async fn test_require_module_permission_unauthorized_without_claims() {
        let status = send(
            require_module_permission(ModuleCode::Iam, PermissionAction::Read),
            None,
        )
        .await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_require_module_permission_ok_for_superuser() {
        let claims = make_claims(&[], true);
        let status = send(
            require_module_permission(ModuleCode::Iam, PermissionAction::Write),
            Some(claims),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_module_permission_ok_with_exact_permission() {
        let claims = make_claims(&["iam:write"], false);
        let status = send(
            require_module_permission(ModuleCode::Iam, PermissionAction::Write),
            Some(claims),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_module_permission_ok_with_admin_permission() {
        let claims = make_claims(&["iam:admin"], false);
        let status = send(
            require_module_permission(ModuleCode::Iam, PermissionAction::Write),
            Some(claims),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_module_permission_read_ok_with_read_only() {
        let claims = make_claims(&["iam:read"], false);
        let status = send(
            require_module_permission(ModuleCode::Iam, PermissionAction::Read),
            Some(claims),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_module_permission_write_forbidden_with_read_only() {
        // read 不蕴含 write
        let claims = make_claims(&["iam:read"], false);
        let status = send(
            require_module_permission(ModuleCode::Iam, PermissionAction::Write),
            Some(claims),
        )
        .await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_require_module_permission_forbidden_without_permission() {
        let claims = make_claims(&["hrm:read"], false);
        let status = send(
            require_module_permission(ModuleCode::Iam, PermissionAction::Read),
            Some(claims),
        )
        .await;
        assert_eq!(status, StatusCode::FORBIDDEN);
    }
}
