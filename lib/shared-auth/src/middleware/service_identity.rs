//! # 服务身份中间件（Service Identity Middleware）
//!
//! 在 `auth_middleware` 之后运行（此时 Claims 已解析并放入 request extensions）。
//! 识别 **service-to-service** 调用（`is_service_claims`），实现：
//!
//! - **审计 / 告警区分**：对服务调用打 `info` 审计日志（服务名 + 方法 + 路径），
//!   与真实用户调用在日志中明确区分。
//! - **下游消费**：将 [`ServiceIdentity`] 放入 request extensions，
//!   供下游中间件 / 处理器读取（如 RLS 豁免、限流差异、审计记录）。
//!
//! 真实用户调用（非 service）直接放行，不做额外处理。

use crate::auth::Claims;
use crate::service::is_service_claims;
use axum::{body::Body, extract::Request, middleware::Next, response::Response};

/// 服务调用身份（放入 request extensions，供下游消费）
#[derive(Debug, Clone)]
pub struct ServiceIdentity {
    /// 调用方服务名（如 "erp-service"）
    pub service_name: String,
    /// 本次调用声明的权限集合
    pub permissions: Vec<String>,
}

/// 服务身份识别中间件。
///
/// 依赖前置 `auth_middleware` 已把 `Claims` 放入 extensions；
/// 若 Claims 为服务身份，则记录审计日志并注入 [`ServiceIdentity`]。
pub async fn service_identity_middleware(req: Request<Body>, next: Next) -> Response {
    let mut req = req;
    if let Some(claims) = req.extensions().get::<Claims>().cloned() {
        if is_service_claims(&claims) {
            tracing::info!(
                service = %claims.username,
                method = %req.method().as_str(),
                path = %req.uri().path(),
                "服务间调用（service-to-service）"
            );
            req.extensions_mut().insert(ServiceIdentity {
                service_name: claims.username.clone(),
                permissions: claims.permissions.clone(),
            });
        }
    }
    next.run(req).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::service::issue_service_token;
    use crate::auth::verify_jwt_token;
    use axum::{body::Body, http::Request, routing::get, Router};
    use tower::ServiceExt;

    const TEST_SECRET: &str = "topems-test-jwt-secret-key-at-least-32-characters-long";

    fn build_app() -> Router {
        Router::new()
            .route("/protected", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn(service_identity_middleware))
    }

    #[tokio::test]
    async fn test_service_token_gets_identity() {
        let token = issue_service_token(TEST_SECRET, "erp-service", &["wms:admin"], None).unwrap();
        let claims = verify_jwt_token(&token, TEST_SECRET).unwrap();
        let app = build_app();
        let mut req = Request::builder().uri("/protected").body(Body::empty()).unwrap();
        req.extensions_mut().insert(claims);
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), 200);
    }

    #[tokio::test]
    async fn test_service_identity_extension_injected() {
        // 通过中间件注入后，内部处理器读取 ServiceIdentity（简化：直接验证日志分支不 panic）
        let token = issue_service_token(TEST_SECRET, "portal-service", &["erp:read"], None).unwrap();
        let claims = verify_jwt_token(&token, TEST_SECRET).unwrap();
        let app = Router::new()
            .route(
                "/protected",
                get(|ext: axum::extract::Extension<ServiceIdentity>| async move {
                    format!("{}:{}", ext.service_name, ext.permissions.join(","))
                }),
            )
            .layer(axum::middleware::from_fn(service_identity_middleware));
        let mut req = Request::builder().uri("/protected").body(Body::empty()).unwrap();
        req.extensions_mut().insert(claims);
        let resp = app.oneshot(req).await.unwrap();
        assert_eq!(resp.status(), 200);
        let body = axum::body::to_bytes(resp.into_body(), usize::MAX).await.unwrap();
        assert_eq!(String::from_utf8(body.to_vec()).unwrap(), "portal-service:erp:read");
    }
}
