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
