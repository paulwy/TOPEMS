use crate::auth::{is_public_path, Claims};
use crate::service::is_service_claims;
use axum::{
    body::Body,
    extract::Request,
    http::{header, HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use sqlx::PgPool;
use uuid::Uuid;

/// 请求级 RLS 事务句柄：由 `tenant_middleware` 创建并挂到请求扩展上，
/// handler 通过 `Extension(txn_arc)` 取出，在**同一条连接**上执行带 `app.tenant_id`
/// GUC 的查询。同时该句柄会被放进 task-local（见 [`crate::scoped_pool`]），
/// 让 `ScopedPool` 的查询直接复用同一事务。
pub type RlsTxnCell = crate::scoped_pool::ScopedTxnCell;

fn internal_error(message: &str) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        [(header::CONTENT_TYPE, "application/json")],
        format!(r#"{{"success":false,"message":"{message}","code":500}}"#),
    )
        .into_response()
}

/// 开启请求事务并写入租户 GUC。失败即返回 500（fail-closed），
/// 不再以"无上下文"继续执行 handler。
async fn begin_scoped_txn(pool: &PgPool, tenant: &str) -> Result<RlsTxnCell, Response> {
    let mut txn = match pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin RLS txn: {}", e);
            return Err(internal_error("事务开启失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(tenant)
        .execute(&mut *txn)
        .await
    {
        tracing::error!("Failed to set RLS context: {}", e);
        // txn 随 Result 返回的被丢弃 → ROLLBACK，连接不带着半初始化状态归还。
        return Err(internal_error("租户上下文设置失败"));
    }
    Ok(std::sync::Arc::new(tokio::sync::Mutex::new(Some(txn))))
}

/// 请求收尾统一提交。
///
/// `sqlx::Transaction` 未显式 commit 时 drop 即 ROLLBACK（写丢失）。handler 可能
/// 自行 `commit()`（此时 Option 已被 take 成 None，本函数为空操作）；未自行提交的
/// 写入在此统一落地，避免"每个 handler 都要记得 commit"的散点风险。
async fn commit_request_txn(cell: RlsTxnCell) -> Result<(), sqlx::Error> {
    let mut guard = cell.lock().await;
    match guard.take() {
        Some(txn) => txn.commit().await,
        None => Ok(()),
    }
}

/// 提交成功透传原响应；提交失败且原响应是 2xx 时改为 500，避免向调用方谎报成功。
async fn finish_response(resp: Response, cell: RlsTxnCell) -> Response {
    match commit_request_txn(cell).await {
        Ok(()) => resp,
        Err(e) => {
            tracing::error!("RLS 事务提交失败: {}", e);
            if !resp.status().is_success() {
                return resp;
            }
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"事务提交失败","code":500}"#,
            )
                .into_response()
        }
    }
}

#[derive(Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
}

impl TenantContext {
    pub fn from_request(req: &Request<Body>) -> Option<Self> {
        let claims = req.extensions().get::<Claims>()?;
        let tenant_id = claims.tenant_id.as_ref()?.parse::<Uuid>().ok()?;
        let user_id = claims.user_id().ok()?;
        Some(Self { tenant_id, user_id })
    }
}

pub fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

/// 仅从 `Claims.tenant_id` 解析租户 ID，不回退到 header。
///
/// 适用于 service 层或无 `HeaderMap` 可用的调用点；解析失败返回 nil UUID
/// （`Uuid::default()`），与各业务服务历史单参数实现行为一致。
pub fn get_tenant_id_from_claims(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}

/// 解析创建行要落库的 tenant_id：
/// - 超管（`is_superuser`）→ `Ok(None)`，落公共行（`tenant_id = NULL`）；
/// - 服务身份（service token，无租户维度）→ `Ok(None)` 同超管语义：
///   服务间调用是全局基础设施，落 nil 租户配合 RLS `current = nil` 豁免全量可见
///   （与 tenant_middleware 对 service claims 固定 nil 上下文一致）；否则 mobile
///   等模块以 service token 调 CRM/HRM/WMS 写路径会 400「缺少租户ID」→ 冒烟 500。
/// - 普通用户 → 必须携带可解析的 `claims.tenant_id`，缺失或非法返回
///   `Err((400, 说明))`，由调用方直接回 400，禁止静默落全零 UUID
///   （全零行在 RLS 租户过滤下对本租户不可见）。
pub fn resolve_create_tenant(claims: &Claims) -> Result<Option<Uuid>, (u16, String)> {
    if claims.is_superuser || is_service_claims(claims) {
        return Ok(None);
    }
    match claims.tenant_id.as_deref() {
        None => Err((400, "缺少租户ID".to_string())),
        Some(raw) => Uuid::parse_str(raw)
            .map(Some)
            .map_err(|_| (400, "无效的租户ID".to_string())),
    }
}

#[derive(Debug, Clone)]
pub struct TenantDataAccess {
    pub tenant_id: Uuid,
    pub pool: PgPool,
}

impl TenantDataAccess {
    pub fn new(tenant_id: Uuid, pool: PgPool) -> Self {
        Self { tenant_id, pool }
    }

    pub fn tenant_id(&self) -> Uuid {
        self.tenant_id
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

pub fn tenant_middleware() -> impl Fn(
    axum::extract::State<PgPool>,
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |axum::extract::State(pool): axum::extract::State<PgPool>,
          req: Request<Body>,
          next: Next| {
        Box::pin(async move {
            // 与 auth_middleware 一致：public 路径（/health、auth 端点等）豁免——
            // axum nest 剥离前缀后 /api/{svc}/health → /health，auth_middleware 已豁免
            // （Claims 不注入），此处对齐避免 public 路径误判 401。
            if is_public_path(req.uri().path()) {
                return next.run(req).await;
            }
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

            // 服务身份（service token）与超管会话豁免租户上下文：服务间调用是全局
            // 基础设施，无租户维度（service token 不携带 tenant_id）；超管亦无
            // tenant_id。两者都将租户上下文固定为 nil UUID —— 配合 RLS 策略中的
            // `OR current = nil` 豁免条件，超管/服务间调用在受限 DB 用户下仍可全量
            // 访问（与 owner 绕过行为一致），而普通用户请求维持租户隔离。
            if is_service_claims(claims) || claims.is_superuser {
                tracing::debug!(
                    "service claims: set nil tenant context for {}",
                    claims.username
                );
                let nil = Uuid::nil().to_string();
                let txn_cell = match begin_scoped_txn(&pool, &nil).await {
                    Ok(c) => c,
                    Err(resp) => return resp,
                };
                let mut req = req;
                req.extensions_mut().insert(txn_cell.clone());
                req.extensions_mut().insert(TenantContext {
                    tenant_id: Uuid::nil(),
                    user_id: Uuid::nil(),
                });
                let ctx = crate::scoped_pool::ScopedCtx {
                    txn: txn_cell.clone(),
                    tenant: nil,
                };
                let resp = crate::scoped_pool::scope(ctx, next.run(req)).await;
                return finish_response(resp, txn_cell).await;
            }

            let tenant_id_str = match claims.tenant_id.as_ref() {
                Some(id) => id,
                None => {
                    return (
                        StatusCode::BAD_REQUEST,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"缺少租户ID","code":400}"#,
                    )
                        .into_response();
                }
            };

            let tenant_id = match Uuid::parse_str(tenant_id_str) {
                Ok(id) => id,
                Err(_) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"无效的租户ID格式","code":400}"#,
                    )
                        .into_response();
                }
            };

            let mut txn = match pool.begin().await {
                Ok(t) => t,
                Err(e) => {
                    tracing::error!("Failed to begin RLS txn: {}", e);
                    return internal_error("事务开启失败");
                }
            };
            // superuser 会话：RLS 使用 nil 租户（配合策略零值豁免条件全量可见），
            // TenantContext 保留实际租户供业务过滤使用
            let rls_tenant = if claims.is_superuser {
                Uuid::nil()
            } else {
                tenant_id
            };
            let rls_tenant_str = rls_tenant.to_string();
            match sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
                .bind(&rls_tenant_str)
                .execute(&mut *txn)
                .await
            {
                Ok(_) => tracing::debug!(
                    "Applied RLS context for tenant: {} (rls: {})",
                    tenant_id,
                    rls_tenant
                ),
                Err(e) => {
                    tracing::error!("Failed to set RLS context: {}", e);
                    return internal_error("租户上下文设置失败");
                }
            }

            let user_id = match claims.user_id() {
                Ok(id) => id,
                Err(_) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"无效的用户ID","code":400}"#,
                    )
                        .into_response();
                }
            };

            let mut req = req;
            let txn_cell: RlsTxnCell = std::sync::Arc::new(tokio::sync::Mutex::new(Some(txn)));
            req.extensions_mut().insert(txn_cell.clone());
            req.extensions_mut()
                .insert(TenantContext { tenant_id, user_id });

            let ctx = crate::scoped_pool::ScopedCtx {
                txn: txn_cell.clone(),
                tenant: rls_tenant_str,
            };
            let resp = crate::scoped_pool::scope(ctx, next.run(req)).await;
            finish_response(resp, txn_cell).await
        })
    }
}

pub fn require_tenant_status(
    status: &'static str,
) -> impl Fn(
    Request<Body>,
    Next,
) -> std::pin::Pin<Box<dyn std::future::Future<Output = axum::response::Response> + Send>>
       + Clone
       + Send
       + Sync {
    move |req: Request<Body>, next: Next| {
        let _status = status;
        Box::pin(async move {
            // 与 auth_middleware 一致：public 路径（/health、auth 端点等）豁免——
            // axum nest 剥离前缀后 /api/{svc}/health → /health，auth_middleware 已豁免
            // （Claims 不注入），此处对齐避免 public 路径误判 401。
            if is_public_path(req.uri().path()) {
                return next.run(req).await;
            }
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

            next.run(req).await
        })
    }
}

/// 是否需要对结果做租户隔离。
///
/// 服务间调用（`is_service_claims`，如 portal 聚合读）默认不做租户过滤，
/// 以 nil 租户上下文全量访问（配合 DB 层 RLS 的 nil 豁免策略）。
pub fn is_tenant_scoped(claims: &Claims) -> bool {
    !crate::service::is_service_claims(claims)
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request, routing::get, Router};
    use tower::ServiceExt;

    const TENANT_ID: &str = "123e4567-e89b-12d3-a456-426614174000";
    const USER_ID: &str = "123e4567-e89b-12d3-a456-426614174001";

    fn make_claims(tenant_id: Option<&str>, user_id: &str, is_superuser: bool) -> Claims {
        Claims {
            sub: user_id.to_string(),
            username: "tester".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant_id.map(|s| s.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    fn build_req(claims: Option<Claims>) -> Request<Body> {
        let mut req = Request::builder().uri("/x").body(Body::empty()).unwrap();
        if let Some(c) = claims {
            req.extensions_mut().insert(c);
        }
        req
    }

    async fn send_require_tenant_status(claims: Option<Claims>) -> StatusCode {
        let app = Router::new()
            .route("/protected", get(|| async { "ok" }))
            .layer(axum::middleware::from_fn(require_tenant_status("active")));
        let mut req = Request::builder()
            .uri("/protected")
            .body(Body::empty())
            .unwrap();
        if let Some(c) = claims {
            req.extensions_mut().insert(c);
        }
        app.oneshot(req).await.expect("infallible").status()
    }

    // ===== TenantContext::from_request =====
    #[test]
    fn test_tenant_context_none_without_claims() {
        let req = build_req(None);
        assert!(TenantContext::from_request(&req).is_none());
    }

    #[test]
    fn test_tenant_context_none_when_tenant_id_missing() {
        let req = build_req(Some(make_claims(None, USER_ID, false)));
        assert!(TenantContext::from_request(&req).is_none());
    }

    #[test]
    fn test_tenant_context_none_for_invalid_user_id() {
        // sub 不是合法 UUID
        let req = build_req(Some(make_claims(Some(TENANT_ID), "not-a-uuid", false)));
        assert!(TenantContext::from_request(&req).is_none());
    }

    #[test]
    fn test_tenant_context_none_for_invalid_tenant_id() {
        let req = build_req(Some(make_claims(Some("garbage"), USER_ID, false)));
        assert!(TenantContext::from_request(&req).is_none());
    }

    #[test]
    fn test_tenant_context_parses_valid_ids() {
        let req = build_req(Some(make_claims(Some(TENANT_ID), USER_ID, false)));
        let ctx = TenantContext::from_request(&req).expect("some");
        assert_eq!(ctx.tenant_id.to_string(), TENANT_ID);
        assert_eq!(ctx.user_id.to_string(), USER_ID);
    }

    #[test]
    fn test_tenant_context_clone_preserves_ids() {
        let ctx = TenantContext {
            tenant_id: Uuid::parse_str(TENANT_ID).unwrap(),
            user_id: Uuid::parse_str(USER_ID).unwrap(),
        };
        let cloned = ctx.clone();
        assert_eq!(ctx.tenant_id, cloned.tenant_id);
        assert_eq!(ctx.user_id, cloned.user_id);
    }

    // ===== require_tenant_status =====
    #[tokio::test]
    async fn test_require_tenant_status_unauthorized_without_claims() {
        let status = send_require_tenant_status(None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_require_tenant_status_ok_for_superuser() {
        let claims = make_claims(Some(TENANT_ID), USER_ID, true);
        let status = send_require_tenant_status(Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }

    #[tokio::test]
    async fn test_require_tenant_status_ok_for_normal_user() {
        let claims = make_claims(Some(TENANT_ID), USER_ID, false);
        let status = send_require_tenant_status(Some(claims)).await;
        assert_eq!(status, StatusCode::OK);
    }
}
