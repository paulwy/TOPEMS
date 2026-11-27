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
    if is_superuser { "on" } else { "off" }
}

/// 在【指定的、本请求独占的连接】上设置租户上下文。
///
/// CORE-06 根因：旧实现 `set_config(..., false)` 直接作用于 `&PgPool`，sqlx 会随机借取
/// 一条池连接——(a) 业务 handler 后续查询可能借到另一条连接，GUC 不生效；(b) 会话级 GUC
/// 在该连接归还后残留，污染后续请求。
///
/// 修复：调用方先 `pool.acquire()` 独占一条连接贯穿本请求，在其上 set；请求结束后在
/// 【同一连接】再次调用本函数传 `""` 显式清空，再归还连接池 → 归还连接不残留会话租户状态。
async fn set_rls_policy_conn(
    conn: &mut sqlx::pool::PoolConnection<sqlx::Postgres>,
    tenant_id: &str,
    is_superuser: bool,
) -> Result<(), sqlx::Error> {
    // is_local=false：会话级。仅作用于本请求独占连接，且请求结束后显式清空，不污染池。
    if tenant_id.is_empty() {
        // superuser/空租户：RESET app.tenant_id。
        // PG18 实测：SET 过再 RESET 后 current_setting(..., true) 回落为空串 ''（非 NULL），
        // 业务 SQL/策略中 ((current_setting(...))::uuid) 必须经 NULLIF 包裹兜底
        // （database/migrations/20261102210000_fix_tenant_policy_nullif.sql），否则 uuid cast 空串报错。
        // 不能 SET ''（旧实现）：部分策略 qual 对 '' 直接 ::uuid（无 NULLIF），
        // PG 即使 OR 有 ='' 分支仍可能评估后续 cast → invalid input syntax for type uuid: ""
        sqlx::query("RESET app.tenant_id")
            .execute(&mut **conn)
            .await?;
        // fail-closed 改造配套：超管全量访问改走显式系统开关，不再依赖「GUC 为空即全开」
        sqlx::query("SELECT set_config('app.rls_system', 'on', false)")
            .execute(&mut **conn)
            .await?;
    } else {
        sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
            .bind(tenant_id)
            .execute(&mut **conn)
            .await?;
        sqlx::query("SELECT set_config('app.rls_system', 'off', false)")
            .execute(&mut **conn)
            .await?;
    }

    // 系统特权标记：超管置 on，普通用户显式置 off，避免继承上一条连接的残留值。
    sqlx::query("SELECT set_config('app.rls_system', $1, false)")
        .bind(rls_system_value(is_superuser))
        .execute(&mut **conn)
        .await?;

    Ok(())
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
            // superuser：置空 GUC（策略空分支放行全量），避免零值误拦；
            // 普通用户：置实际租户（SQL 层显式租户条件是主防线，RLS 作纵深防御）
            let is_superuser = req
                .extensions()
                .get::<Claims>()
                .map(|c| c.is_superuser)
                .unwrap_or(false);
            let rls_tenant = rls_tenant_value(&tenant_id, is_superuser);

            // CORE-06 修复：acquire 独占本请求连接，在其上设置租户上下文；请求结束后在
            // 【同一连接】显式清空 app.tenant_id 再归还连接池。
            // 不再对 &PgPool 随机借连接 set 会话级 GUC（旧实现：借连接不保证生效 + 归还残留污染）。
            let mut conn = match state.pool.acquire().await {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("Failed to acquire DB connection for RLS: {}", e);
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"内部服务器错误：无法获取数据库连接","code":500}"#,
                    )
                        .into_response();
                }
            };

            if let Err(e) = set_rls_policy_conn(&mut conn, &rls_tenant, is_superuser).await {
                tracing::error!("Failed to set RLS policy: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    [(header::CONTENT_TYPE, "application/json")],
                    r#"{"success":false,"message":"内部服务器错误：无法设置租户上下文","code":500}"#,
                )
                    .into_response();
            }

            req.extensions_mut().insert(TenantId(tenant_id.clone()));

            tracing::debug!(
                "RLS policy set for tenant: {} (rls: {})",
                tenant_id,
                tenant_id
            );

            let resp = next.run(req).await;

            // 归还前显式清空：RESET 恢复「未 SET」状态（旧实现 SET '' 会把 GUC 置为空串，
            // 而 RLS policy 恒真分支依赖未 SET 返回 nil UUID 字符串——SET '' 后 NULLIF 分支失效，
            // 池化下后续请求借到该连接时绑租户 INSERT 会被 RLS 拒绝）
            if let Err(e) = sqlx::query("RESET app.tenant_id").execute(&mut *conn).await {
                tracing::error!("Failed to reset RLS policy on connection return: {}", e);
            }
            if let Err(e) = sqlx::query("RESET app.rls_system").execute(&mut *conn).await {
                tracing::error!("Failed to reset RLS system flag on connection return: {}", e);
            }
            if let Err(e) = sqlx::query("SELECT set_config('app.rls_system', 'off', false)")
                .execute(&mut *conn)
                .await
            {
                tracing::error!("Failed to reset app.rls_system on connection return: {}", e);
            }
            drop(conn); // 归还连接池（此时已清空会话租户状态）

            resp
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
