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

/// 路由层权限硬防线：要求 JWT Claims 精确包含 `permission` 码，否则 403。
///
/// # 权限码命名口径（P0-4 对齐约定，仅立规，不回改历史码）
/// - 规范细粒度码：`module:resource:action`（小写蛇形、冒号分隔，末段 ∈
///   `read/write/delete/approve/admin`），与 `core_permissions` 种子字典主流一致；
/// - `<module>:admin` 为历史模块级管理伞码，作为兼容条目保留，**不要**改名；
/// - `admin:<domain>:<action>` 为管理域前缀码，与既有 `admin:*` 系列同形；
/// - `iam:users_read` 这类"冒号+下划线动作"的内存目录码属遗留方言，禁止新增。
///
/// 非破坏约束：本函数只做精确串匹配，不做前缀/通配展开；新增被保护端点时，
/// 所用 code 必须已存在于 `core_permissions` 种子（字典补缺走幂等迁移，见
/// `database/migrations/20261020000024_iam_seed_missing_gate_permissions.sql`），
/// 但**不得**在此重命名已挂载的历史 code（会直接把现有 200 翻成 403）。
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
            if is_public_path(req.uri().path()) {
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

/// 模块级放行中间件：拥有 `<module>:` 前缀的任一权限码（或 `all`/`*`、超管）即放行。
/// 用于将历史 `<module>:admin` 全局伞码过渡为模块级放行，解锁普通业务角色；
/// 语义上模块内各端点同权，逐端点细粒度化为后续演进方向（见 Claims::has_module_permission）。
pub fn require_module_access(
    module: &'static str,
) -> impl Fn(
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let module = module;
        Box::pin(async move {
            if is_public_path(req.uri().path()) {
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

            if !claims.has_module_permission(module) {
                tracing::warn!(
                    "Permission denied: user={}, module={}",
                    claims.username,
                    module
                );
                return (
                    StatusCode::FORBIDDEN,
                    [(header::CONTENT_TYPE, "application/json")],
                    format!(
                        r#"{{"success":false,"message":"权限不足：需要 {} 模块权限","code":403}}"#,
                        module
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
            if is_public_path(req.uri().path()) {
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
            if is_public_path(req.uri().path()) {
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
            if is_public_path(req.uri().path()) {
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
            if is_public_path(req.uri().path()) {
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
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
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
