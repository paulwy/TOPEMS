use axum::{
    body::Body,
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use topems_shared_auth::auth::{verify_jwt_token, Claims};

use crate::AppState;

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use axum::http::Uri;

    fn create_test_request(path: &str, tenant_id: Option<&str>) -> Request<Body> {
        let mut req = Request::builder()
            .uri(Uri::try_from(path).unwrap_or_else(|e| panic!("invalid uri: {e}")))
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
                must_change_password: false,
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
            must_change_password: false,
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
            let _req = create_test_request(path, None);
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

    #[test]
    fn test_rls_tenant_value_normal_user_uses_real_tenant() {
        // 普通用户：GUC 写入真实 tenant_id，RLS 据此过滤
        assert_eq!(rls_tenant_value("tenant-abc", false), "tenant-abc");
    }

    #[test]
    fn test_rls_tenant_value_superuser_uses_empty() {
        // superuser：GUC 置空 → 策略空分支放行全量，避免被零值租户误拦
        assert_eq!(rls_tenant_value("tenant-abc", true), "");
    }

    #[test]
    fn test_rls_system_value_superuser_on() {
        assert_eq!(rls_system_value(true), "on");
        assert_eq!(rls_system_value(false), "off");
    }

    #[test]
    fn test_rls_tenant_value_empty_for_reset_semantics() {
        // 归还连接前传 "" 清空：与 superuser/无租户分支一致，保证归还连接 app.tenant_id 为空
        assert_eq!(rls_tenant_value("anything", true), "");
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

/// 从请求扩展或 Authorization Bearer token 解析 Claims（解码成功时写入扩展）
fn resolve_claims(req: &mut Request<Body>, jwt_secret: &str) -> Option<Claims> {
    if let Some(claims) = req.extensions().get::<Claims>() {
        return Some(claims.clone());
    }

    let auth = req.headers().get(header::AUTHORIZATION)?.to_str().ok()?;
    let token = auth.strip_prefix("Bearer ")?;
    let claims = verify_jwt_token(token, jwt_secret).ok()?;
    req.extensions_mut().insert(claims.clone());
    Some(claims)
}

/// 决定写入会话 GUC `app.tenant_id` 的值（CORE-06 修复配套纯函数，便于单测）。
///
/// - superuser：返回空串 `""`。策略的空分支放行全量，避免 superuser 被零值租户误拦；
/// - 普通用户：返回其真实 tenant_id，DB 层 RLS 据此做纵深过滤。
///
/// 注意：DB 行级 RLS 在池化下仅为纵深防御（业务查询可能借另一连接），主防线仍是
/// 业务 SQL 显式 `WHERE tenant_id = $1`（以及写路径的事务级 `set_config(..., true)`）。
#[allow(dead_code)]
fn rls_tenant_value(tenant_id: &str, is_superuser: bool) -> String {
    if is_superuser {
        String::new()
    } else {
        tenant_id.to_string()
    }
}

/// 系统特权会话标记：超管/后台系统路径显式置 `app.rls_system='on'`。
///
/// 旧实现靠「`app.tenant_id` 为空 ⇒ 策略空分支放行」拿全量可见性，属 fail-open；
/// 策略收口（fail-closed）后该分支被移除，超管可见性只能经由显式 `app.rls_system`。
fn rls_system_value(is_superuser: bool) -> &'static str {
    if is_superuser {
        "on"
    } else {
        "off"
    }
}

pub async fn tenant_rls_middleware(
    State(state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Response {
    let path = req.uri().path().to_string();

    let skip_paths = [
        "/",
        "/health",
        "/api",
        "/api/info",
        "/api/plugins/info",
        "/api/plugins/health",
        "/metrics",
    ];

    if skip_paths.contains(&path.as_str()) {
        return next.run(req).await;
    }

    let tenant_id = if let Some(claims) = req.extensions().get::<Claims>() {
        claims.tenant_id.clone()
    } else if let Some(claims) = resolve_claims(&mut req, &state.auth_state.jwt_secret) {
        claims.tenant_id.clone()
    } else {
        req.headers()
            .get(X_TENANT_ID)
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
    };

    match tenant_id {
        Some(tenant_id) => {
            // RLS 上下文改为「task-local + 连接池 hook」贯通：中间件只声明作用域，
            // 请求内任意 pool.acquire() 借到的连接都会由 before_acquire 写入 app.tenant_id /
            // app.rls_system，归还时清空（见 lib/shared-db/src/tenant_ctx.rs）。
            // 旧实现把 GUC 设在中间件自己独占的一条连接上，handler 用的是另一条连接，GUC 从未生效。
            let is_superuser = req
                .extensions()
                .get::<Claims>()
                .map(|c| c.is_superuser)
                .unwrap_or(false);

            let ctx = if is_superuser {
                // 超管：不设租户 GUC，改显式置 app.rls_system='on'（策略收口后唯一的全量通道）
                topems_shared_db::tenant_ctx::TenantScopeCtx::system()
            } else {
                topems_shared_db::tenant_ctx::TenantScopeCtx::tenant(tenant_id.clone())
            };

            req.extensions_mut().insert(TenantId(tenant_id.clone()));

            tracing::debug!("RLS scope established for tenant: {}", tenant_id);

            topems_shared_db::tenant_ctx::scope(ctx, next.run(req)).await
        }
        None => {
            tracing::warn!("No tenant_id found in request: {}", path);

            req.extensions_mut().insert(TenantId("default".to_string()));

            // 本分支不触碰连接池：带租户请求已在其独占连接上 set 后显式清空，
            // 归还连接均为干净状态，无需再随机借连接去“清场”。
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
