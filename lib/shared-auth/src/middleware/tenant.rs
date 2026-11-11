use crate::auth::{is_public_path, Claims};
use crate::service::is_service_claims;
use axum::{
    body::Body,
    extract::Request,
    http::{header, HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use prometheus::{register_int_counter_vec, IntCounterVec};
use sqlx::PgPool;
use std::sync::OnceLock;
use uuid::Uuid;

/// 请求级 RLS 事务句柄：由 `tenant_middleware` 创建并挂到请求扩展上，
/// handler 通过 `Extension(txn_arc)` 取出，在**同一条连接**上执行带 `app.tenant_id`
/// GUC 的查询。
pub type RlsTxnCell =
    std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>;

/// 请求的 RLS 租户上下文（供 `shared-db::Db` 的独立作用域事务使用）。
///
/// `tenant_middleware` 只覆盖复用它事务的 `scope_with` 路径；`Db::scope()` /
/// `scope_read()` 会各自 `BEGIN`，若不带 GUC，策略/内联谓词里的
/// `current_setting('app.tenant_id', true)` 为 NULL 会命中「未设即豁免」分支，
/// 等于跨租户放行。`auth_middleware` 在验签后把该上下文写入 task-local，
/// `Db` 在每个作用域事务开始处据此 `set_config`（见 shared-db/src/scope.rs）。
#[derive(Clone, Copy, Debug)]
pub struct RlsRequestTenant {
    pub tenant: Uuid,
    /// 系统通道（超管 / service-to-service）：`app.rls_system='on'`。
    pub system: bool,
}

tokio::task_local! {
    static RLS_REQUEST_TENANT: RlsRequestTenant;
}

/// 当前请求的 RLS 上下文；无请求上下文（后台任务/脚本）返回 `None`。
pub fn current_request_tenant() -> Option<RlsRequestTenant> {
    RLS_REQUEST_TENANT.try_with(|ctx| *ctx).ok()
}

/// 在请求作用域内携带 RLS 上下文执行后续链路。
pub async fn scope_request_tenant<F, T>(ctx: RlsRequestTenant, fut: F) -> T
where
    F: std::future::Future<Output = T>,
{
    RLS_REQUEST_TENANT.scope(ctx, fut).await
}

/// 由认证后的 Claims 推导 RLS 上下文：
/// - Claims 携带可解析的 `tenant_id`（普通用户，或超管显式选择了租户）→ 租户作用域；
/// - 否则仅 service 身份走系统通道（nil + `app.rls_system='on'`）；
/// - 其余一律 nil 且不开系统通道（fail-closed，由策略/内联谓词拦截）。
pub fn rls_request_tenant(claims: &crate::auth::Claims) -> RlsRequestTenant {
    let service = is_service_claims(claims);
    let explicit = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());
    match (explicit, service) {
        (Some(tenant), false) => RlsRequestTenant {
            tenant,
            system: false,
        },
        _ => RlsRequestTenant {
            tenant: Uuid::nil(),
            system: service,
        },
    }
}

/// 事务/租户上下文初始化失败统一返回 500（fail-closed）。
///
/// 不允许 `return next.run(req)` 继续处理：那会让 handler 在没有租户 GUC 的
/// 连接上执行查询，结果取决于策略是否 fail-closed，属于被明确否决的放行路径。
fn internal_error(message: &str) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        [(header::CONTENT_TYPE, "application/json")],
        format!(r#"{{"success":false,"message":"{message}","code":500}}"#),
    )
        .into_response()
}

fn bad_request(message: &str) -> Response {
    (
        StatusCode::BAD_REQUEST,
        [(header::CONTENT_TYPE, "application/json")],
        format!(r#"{{"success":false,"message":"{message}","code":400}}"#),
    )
        .into_response()
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

/// 兜底分支计数器（仅观测，不改变行为）。
///
/// `reason` 取值：`no_claims_no_header` / `invalid_claims_no_header` /
/// `no_claims_invalid_header` / `invalid_claims_invalid_header`。
static TENANT_FALLBACK: OnceLock<IntCounterVec> = OnceLock::new();

#[allow(clippy::expect_used)]
fn tenant_fallback_metric() -> &'static IntCounterVec {
    TENANT_FALLBACK.get_or_init(|| {
        register_int_counter_vec!(
            "topems_tenant_id_fallback_total",
            "get_tenant_id 进入随机 UUID 兜底的次数（按缺失原因）",
            &["reason"]
        )
        .expect("failed to register topems_tenant_id_fallback_total")
    })
}

tokio::task_local! {
    /// 当前请求路径（仅用于兜底告警定位端点，不参与任何业务判定）。
    static REQUEST_PATH: String;
}

/// 在请求作用域内携带 URI 路径，供 `get_tenant_id` 兜底告警标注端点。
pub async fn scope_request_path<F, T>(path: String, fut: F) -> T
where
    F: std::future::Future<Output = T>,
{
    REQUEST_PATH.scope(path, fut).await
}

fn current_request_path() -> String {
    REQUEST_PATH
        .try_with(|p| p.clone())
        .unwrap_or_else(|_| "-".to_string())
}

pub fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    if let Some(tenant) = claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
    {
        return tenant;
    }
    let header_raw = headers.get("x-tenant-id").and_then(|v| v.to_str().ok());
    if let Some(tenant) = header_raw.and_then(|s| Uuid::parse_str(s).ok()) {
        return tenant;
    }

    // W7 get_tenant_id 改造第一步：只观测，不改变返回值。
    // 该路径返回随机 UUID，任何按它读写的行都会落到不存在的租户（fail-closed 读 0 行/
    // 写入孤儿行），因此先摸清真实触发频次与端点分布，再决定是否删除兜底。
    let reason = match (claims.tenant_id.as_deref(), header_raw) {
        (None, None) => "no_claims_no_header",
        (Some(_), None) => "invalid_claims_no_header",
        (None, Some(_)) => "no_claims_invalid_header",
        (Some(_), Some(_)) => "invalid_claims_invalid_header",
    };
    tracing::warn!(
        target: "tenant_fallback",
        reason,
        user = %claims.username,
        is_superuser = claims.is_superuser,
        path = %current_request_path(),
        "get_tenant_id 缺少租户上下文，进入随机 UUID 兜底（W7 观测，未改变行为）"
    );
    tenant_fallback_metric().with_label_values(&[reason]).inc();
    Uuid::new_v4()
}

/// 严格租户解析（W7 第二阶段）：claims → `x-tenant-id` → 400，禁止随机兜底。
///
/// 与 [`get_tenant_id`] 的区别：缺失或非法租户一律返回 `Err((400, 说明))`，
/// 不会生成随机 UUID，也不会把 nil 当作可用租户。
///
/// 系统通道白名单仅四类：字典、主数据、健康检查、后台任务。这些路径必须显式
/// 使用 `scope_system` / `scope_read_system`，并在调用处标注
/// `// tenant-system: <原因>`；其余路径一律要求请求携带租户上下文。
pub fn require_tenant(claims: &Claims, headers: &HeaderMap) -> Result<Uuid, (u16, String)> {
    if let Some(tenant) = claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .filter(|t| !t.is_nil())
    {
        return Ok(tenant);
    }
    if let Some(tenant) = headers
        .get("x-tenant-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .filter(|t| !t.is_nil())
    {
        return Ok(tenant);
    }
    Err((400, "缺少租户上下文".to_string()))
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
/// - 服务身份（service token，无租户维度）→ `Ok(None)` 落公共行：服务间调用是
///   全局基础设施，落 nil 租户配合 RLS 系统通道全量可见（与 tenant_middleware
///   对 service claims 固定 nil 上下文一致）；否则 mobile 等模块以 service token
///   调 CRM/HRM/WMS 写路径会 400「缺少租户ID」→ 冒烟 500。
/// - 其余身份（含超管）→ 必须携带可解析的 `claims.tenant_id`，缺失或非法返回
///   `Err((400, 说明))`，由调用方直接回 400，禁止静默落全零 UUID。
///   超管的租户由 tenant_middleware 从显式 `x-tenant-id` 解析后写入 Claims；
///   未携带租户头的超管请求在中间件即 400，到不了这里。
pub fn resolve_create_tenant(claims: &Claims) -> Result<Option<Uuid>, (u16, String)> {
    if is_service_claims(claims) {
        return Ok(None);
    }
    match claims.tenant_id.as_deref() {
        None => Err((400, "缺少租户上下文".to_string())),
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
            let mut claims = match req.extensions().get::<Claims>() {
                Some(c) => c.clone(),
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        [(header::CONTENT_TYPE, "application/json")],
                        r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
                    )
                        .into_response();
                }
            };

            let mut req = req;

            // 超管必须显式选择租户（`x-tenant-id`）：显式选择即按该租户身份读写，
            // 不做隐式跨租户。未携带租户头直接 400，不再抹成 None 走系统通道。
            // 普通用户的租户恒取自 Claims，忽略该头（防止伪造头越权）。
            if claims.is_superuser && !is_service_claims(&claims) {
                let header_tenant = req
                    .headers()
                    .get("x-tenant-id")
                    .and_then(|v| v.to_str().ok())
                    .map(str::trim)
                    .filter(|s| !s.is_empty());
                let tenant_id = match header_tenant {
                    None => return bad_request("缺少租户上下文"),
                    Some(raw) => match Uuid::parse_str(raw) {
                        Ok(id) => id,
                        Err(_) => return bad_request("无效的租户ID格式"),
                    },
                };
                claims.tenant_id = Some(tenant_id.to_string());
                req.extensions_mut().insert(claims.clone());
            }

            // 服务身份（service token）豁免租户上下文：服务间调用是全局
            // 基础设施，无租户维度（service token 不携带 tenant_id）。
            // 其事务固定 nil 租户并打开显式系统通道 `app.rls_system='on'` ——
            // 新策略只认这一开关做全量放行；普通租户请求维持租户隔离。
            if is_service_claims(&claims) {
                tracing::debug!(
                    "service claims: set nil tenant context for {}",
                    claims.username
                );
                let mut txn = match pool.begin().await {
                    Ok(t) => t,
                    Err(e) => {
                        tracing::error!("Failed to begin RLS txn: {}", e);
                        return internal_error("事务开启失败");
                    }
                };
                if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
                    .bind(Uuid::nil().to_string())
                    .execute(&mut *txn)
                    .await
                {
                    tracing::error!("Failed to set nil RLS context: {}", e);
                    let _ = txn.rollback().await;
                    return internal_error("租户上下文设置失败");
                }
                if let Err(e) = sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
                    .execute(&mut *txn)
                    .await
                {
                    tracing::error!("Failed to enable RLS system channel: {}", e);
                    let _ = txn.rollback().await;
                    return internal_error("系统通道设置失败");
                }
                let txn_cell: RlsTxnCell = std::sync::Arc::new(tokio::sync::Mutex::new(Some(txn)));
                req.extensions_mut().insert(txn_cell.clone());
                req.extensions_mut().insert(TenantContext {
                    tenant_id: Uuid::nil(),
                    user_id: Uuid::nil(),
                });
                let resp = next.run(req).await;
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
            // 普通租户请求：RLS 使用 claims 中的真实租户；超管/service 已在上面
            // 的系统通道分支返回，不会走到这里。
            let rls_tenant = tenant_id;
            match sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
                .bind(rls_tenant.to_string())
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
                    let _ = txn.rollback().await;
                    return internal_error("租户上下文设置失败");
                }
            }
            // 普通租户请求显式关闭系统通道：即使连接上有残留会话级开关，
            // 也不会把本请求提升为跨租户放行。
            if let Err(e) = sqlx::query("SELECT set_config('app.rls_system', 'off', true)")
                .execute(&mut *txn)
                .await
            {
                tracing::error!("Failed to disable RLS system channel: {}", e);
                let _ = txn.rollback().await;
                return internal_error("系统通道设置失败");
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

            let txn_cell: RlsTxnCell = std::sync::Arc::new(tokio::sync::Mutex::new(Some(txn)));
            req.extensions_mut().insert(txn_cell.clone());
            req.extensions_mut()
                .insert(TenantContext { tenant_id, user_id });

            let resp = next.run(req).await;
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
