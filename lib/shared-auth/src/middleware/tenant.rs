use crate::auth::{is_public_path, Claims};
use crate::service::is_service_claims;
use axum::{
    body::Body,
    extract::Request,
    http::{header, HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use prometheus::{register_histogram_vec, register_int_counter_vec, HistogramVec, IntCounterVec};
use sqlx::PgPool;
use std::sync::OnceLock;
use uuid::Uuid;

/// 请求级 RLS 事务句柄：由 `tenant_middleware` 创建并挂到请求扩展上，
/// handler 通过 `Extension(txn_arc)` 取出，在**同一条连接**上执行带 `app.tenant_id`
/// GUC 的查询。
pub type RlsTxnCell =
    std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>;

/// 请求事务总耗时（秒）——按成功/失败分标签，供 P99 与长事务告警消费。
pub static RLS_REQUEST_TXN_DURATION: OnceLock<HistogramVec> = OnceLock::new();
/// 请求事务计数——按 success / error 分标签。
pub static RLS_REQUEST_TXN_TOTAL: OnceLock<IntCounterVec> = OnceLock::new();

#[allow(clippy::expect_used)]
fn rls_request_txn_duration_metric() -> &'static HistogramVec {
    RLS_REQUEST_TXN_DURATION.get_or_init(|| {
        register_histogram_vec!(
            "topems_rls_request_txn_duration_seconds",
            "Request-scoped RLS transaction duration in seconds",
            &["outcome"],
            vec![0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0]
        )
        .expect("failed to register topems_rls_request_txn_duration_seconds")
    })
}

#[allow(clippy::expect_used)]
fn rls_request_txn_total_metric() -> &'static IntCounterVec {
    RLS_REQUEST_TXN_TOTAL.get_or_init(|| {
        register_int_counter_vec!(
            "topems_rls_request_txn_total",
            "Request-scoped RLS transaction count by outcome",
            &["outcome"]
        )
        .expect("failed to register topems_rls_request_txn_total")
    })
}

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

/// 请求读作用域（由认证后上下文解析，调用方不再自行判断超管/服务令牌）。
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RequestReadScope {
    /// 系统通道：后台系统身份/服务令牌，跨租户只读（`app.rls_system='on'`）。
    System,
    /// 租户作用域：只能读本租户。
    Tenant(Uuid),
}

/// 当前请求的读作用域；无请求上下文（后台任务/脚本）返回 `None`。
///
/// 语义与 RLS 一致：超管若未显式选择租户也走租户作用域（fail-closed），
/// 只有声明为系统身份的服务令牌才会进入 `System`。
pub fn current_read_scope() -> Option<RequestReadScope> {
    current_request_tenant().map(|ctx| {
        if ctx.system {
            RequestReadScope::System
        } else {
            RequestReadScope::Tenant(ctx.tenant)
        }
    })
}

/// 读路径 SQL 的单参数过滤值：`System` → `None`（跨租户），`Tenant(t)` → `Some(t)`。
///
/// 仅用于请求链路；无请求上下文时同样返回 `None`，调用方须改用
/// `Db::scope_read_system()` / `Db::scope_read_for_tenant()` 显式声明作用域。
pub fn current_read_tenant_filter() -> Option<Uuid> {
    match current_read_scope() {
        Some(RequestReadScope::Tenant(t)) => Some(t),
        _ => None,
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

/// 请求级事务的语句超时；默认 30s，按服务可用 `TOPEMS_STATEMENT_TIMEOUT` 覆盖。
/// 取值直接交给 PostgreSQL `set_config('statement_timeout', ...)`，非法值由 PG 拒绝，
/// 中间件按「租户上下文设置失败」返回 500，不会静默退化成无超时。
fn request_statement_timeout() -> String {
    std::env::var("TOPEMS_STATEMENT_TIMEOUT").unwrap_or_else(|_| "30s".to_string())
}

fn bad_request(message: &str) -> Response {
    (
        StatusCode::BAD_REQUEST,
        [(header::CONTENT_TYPE, "application/json")],
        format!(r#"{{"success":false,"message":"{message}","code":400}}"#),
    )
        .into_response()
}

/// 请求级收尾任务表：收集本请求内 `ScopedTxn::drop` 派生的后台回滚任务。
///
/// sqlx 的 `Transaction::drop` 只把 `ROLLBACK` 排队进连接写缓冲，真正 flush 由
/// `PoolConnection::drop` 里 spawn 的归还任务驱动，调度时机不受请求控制；若响应先
/// 写回客户端，PG 侧会看到「响应已返回、连接仍 idle in transaction」。中间件在把响应
/// 交回 hyper 之前 `drain()` 等待这些任务，保证「响应返回 ⇒ 请求内事务已收尾」。
#[derive(Default)]
pub struct RequestFinalizers {
    tasks: std::sync::Mutex<Vec<tokio::task::JoinHandle<()>>>,
}

tokio::task_local! {
    static REQUEST_FINALIZERS: std::sync::Arc<RequestFinalizers>;
}

impl RequestFinalizers {
    pub fn new() -> std::sync::Arc<Self> {
        std::sync::Arc::new(Self::default())
    }

    fn push(&self, task: tokio::task::JoinHandle<()>) {
        // 锁中毒只影响「是否等待」，不影响任务本身执行；此时丢弃句柄即 detach。
        if let Ok(mut tasks) = self.tasks.lock() {
            tasks.push(task);
        }
    }

    /// 等待所有已登记的收尾任务结束；等待期间新登记的任务会在下一轮被取走。
    pub async fn drain(&self) {
        loop {
            let pending: Vec<_> = match self.tasks.lock() {
                Ok(mut tasks) => std::mem::take(&mut *tasks),
                Err(_) => return,
            };
            if pending.is_empty() {
                return;
            }
            for task in pending {
                if let Err(e) = task.await {
                    tracing::warn!(
                        target: "rls_txn",
                        error = %e,
                        "请求级事务收尾任务异常结束"
                    );
                }
            }
        }
    }
}

/// 把 `ScopedTxn` 的后台回滚任务登记到当前请求。
///
/// 返回 `false` 表示当前不在 `tenant_middleware` 作用域内（后台任务/脚本/CLI），
/// 任务自行 detach 执行，与改造前的行为一致。
pub fn register_request_finalizer(task: tokio::task::JoinHandle<()>) -> bool {
    REQUEST_FINALIZERS
        .try_with(|finalizers| finalizers.push(task))
        .is_ok()
}

/// 提交后动作：返回一个可等待的 future，由中间件在事务提交成功后调用。
pub type PostCommitAction =
    Box<dyn FnOnce() -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>> + Send>;

/// 请求级「提交后动作」队列（K13 试点）。
///
/// handler 把「必须在事务提交后才生效」的副作用（目前只有事件发布）登记进来，
/// 由 `tenant_middleware` 在事务提交成功后统一执行；事务回滚 / 非 2xx / 提交失败时
/// 整队丢弃，因此不会出现「事件已发出、数据已回滚」的幻影事件。
///
/// 只有显式登记的调用方受影响；未登记的发布路径行为不变。
#[derive(Default)]
pub struct PostCommitQueue {
    actions: std::sync::Mutex<Vec<PostCommitAction>>,
}

impl PostCommitQueue {
    pub fn new() -> std::sync::Arc<Self> {
        std::sync::Arc::new(Self::default())
    }

    fn push(&self, action: PostCommitAction) {
        // 锁中毒只影响登记是否成功，不影响已入队动作的执行。
        if let Ok(mut actions) = self.actions.lock() {
            actions.push(action);
        }
    }

    /// 已登记、尚未执行的动作数量。
    pub fn len(&self) -> usize {
        self.actions.lock().map_or(0, |actions| actions.len())
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    fn take(&self) -> Vec<PostCommitAction> {
        match self.actions.lock() {
            Ok(mut actions) => std::mem::take(&mut *actions),
            Err(_) => Vec::new(),
        }
    }

    /// 事务提交成功后按登记顺序执行；单个动作失败由动作自行处理，不阻断后续动作。
    pub async fn flush(&self) {
        for action in self.take() {
            action().await;
        }
    }

    /// 事务未提交时丢弃全部动作，返回丢弃数量（仅用于日志）。
    pub fn discard(&self) -> usize {
        self.take().len()
    }
}

tokio::task_local! {
    static POST_COMMIT_QUEUE: std::sync::Arc<PostCommitQueue>;
}

/// 登记一个「提交后执行」的动作；返回 `false` 表示当前不在请求事务作用域内
/// （后台任务/事件桥/CLI），调用方应保持原有的立即执行语义。
pub fn defer_post_commit(action: PostCommitAction) -> bool {
    POST_COMMIT_QUEUE
        .try_with(|queue| queue.push(action))
        .is_ok()
}

/// 请求收尾统一处理：2xx 提交，非 2xx 回滚。
///
/// `sqlx::Transaction` 未显式 commit 时 drop 即 ROLLBACK（写丢失）。handler 可能
/// 自行 `commit()`（此时 Option 已被 take 成 None，本函数为空操作）；未自行提交的
/// 写入在 2xx 时统一落地，非 2xx 时统一回滚——不再"报错也提交"，避免错误响应下
/// 请求事务内的写入变成孤儿行。
async fn finalize_request_txn(
    cell: RlsTxnCell,
    status: StatusCode,
    method: &axum::http::Method,
    path: &str,
) -> Result<(), sqlx::Error> {
    let mut guard = cell.lock().await;
    let Some(txn) = guard.take() else {
        return Ok(());
    };
    if status.is_success() {
        return txn.commit().await;
    }
    tracing::info!(
        target: "rls_txn",
        method = %method,
        path = %path,
        status = status.as_u16(),
        "非 2xx 响应，回滚请求事务"
    );
    txn.rollback().await
}

/// 收尾成功透传原响应；收尾失败且原响应是 2xx 时改为 500，避免向调用方谎报成功。
async fn finish_response(
    resp: Response,
    cell: RlsTxnCell,
    method: &axum::http::Method,
    path: &str,
    finalizers: std::sync::Arc<RequestFinalizers>,
    post_commit: std::sync::Arc<PostCommitQueue>,
) -> Response {
    let status = resp.status();
    let finalize_result = finalize_request_txn(cell, status, method, path).await;
    // handler 内 `ScopedTxn` 的回滚必须在这里等完：否则响应先返回，连接还开着事务。
    finalizers.drain().await;
    // 只有「事务确实提交成功」才执行提交后动作；回滚/非 2xx 整队丢弃。
    if finalize_result.is_ok() && status.is_success() {
        post_commit.flush().await;
    } else {
        let discarded = post_commit.discard();
        if discarded > 0 {
            tracing::info!(
                target: "rls_txn",
                method = %method,
                path = %path,
                status = status.as_u16(),
                discarded,
                "事务未提交，丢弃待发事件"
            );
        }
    }
    match finalize_result {
        Ok(()) => resp,
        Err(e) => {
            tracing::error!(
                target: "rls_txn",
                method = %method,
                path = %path,
                status = status.as_u16(),
                error = %e,
                "RLS 请求事务收尾失败"
            );
            if !status.is_success() {
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
    try_tenant_id(claims, headers)
}

/// 严格租户解析的具名实现（W7 阶段三 B0）：与 [`require_tenant`] 完全等价。
///
/// 单独成函数是为了让迁移中的调用点一眼看出「这是严格路径」，避免和
/// `get_tenant_id` 混读；后续阶段四删除宽松 API 时，只需保留本函数。
pub fn try_tenant_id(claims: &Claims, headers: &HeaderMap) -> Result<Uuid, (u16, String)> {
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
/// 仅用于**读取/过滤**：系统通道（超管/服务令牌/无租户）返回
/// [`PLATFORM_TENANT_ID`](super::tenant_scope::PLATFORM_TENANT_ID)。
/// **写路径禁止使用本函数给业务行兜底**——必须用 [`try_tenant_id_from_claims`]
/// 或 [`resolve_create_tenant`]，缺失/非法租户应显式 400 或走系统事件通道。
pub fn get_tenant_id_from_claims(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .filter(|t| !t.is_nil())
        .unwrap_or(super::tenant_scope::PLATFORM_TENANT_ID)
}

/// 仅从 claims 严格解析租户（W7 阶段三 B0）。
///
/// 缺失、非法或 nil 一律返回 `Err((400, 说明))`，供没有 `HeaderMap` 的
/// service/handler 使用；与 [`try_tenant_id`] 的差异只是不回退 `x-tenant-id`。
pub fn try_tenant_id_from_claims(claims: &Claims) -> Result<Uuid, (u16, String)> {
    match claims.tenant_id.as_deref() {
        None => Err((400, "缺少租户上下文".to_string())),
        Some(raw) => Uuid::parse_str(raw)
            .ok()
            .filter(|t| !t.is_nil())
            .ok_or_else(|| (400, "无效的租户ID".to_string())),
    }
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

/// 请求租户前置解析（**不申请数据库连接**）。
///
/// 返回 `(claims 已改写后的请求, tenant_id, user_id, system)`；任何校验失败直接返回响应。
/// `system=true` 表示服务身份：nil 租户 + `app.rls_system='on'`。
///
/// 抽出来的目的：`tenant_middleware` 与 `tenant_middleware_no_txn` 共享同一份
/// 身份/租户判定，避免两套实现漂移（尤其超管 `x-tenant-id` 显式选租户这条）。
async fn prepare_tenant_request(
    mut req: Request<Body>,
) -> Result<(Request<Body>, Uuid, Uuid, bool), Response> {
    let mut claims = match req.extensions().get::<Claims>() {
        Some(c) => c.clone(),
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"未授权：缺少认证信息","code":401}"#,
            )
                .into_response());
        }
    };

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
            None => return Err(bad_request("缺少租户上下文")),
            Some(raw) => match Uuid::parse_str(raw) {
                Ok(id) => id,
                Err(_) => return Err(bad_request("无效的租户ID格式")),
            },
        };
        claims.tenant_id = Some(tenant_id.to_string());
        req.extensions_mut().insert(claims.clone());
    }

    // 服务身份（service token）豁免租户上下文：服务间调用是全局基础设施，
    // 无租户维度（service token 不携带 tenant_id），固定 nil 租户并打开系统通道。
    if is_service_claims(&claims) {
        tracing::debug!(
            "service claims: set nil tenant context for {}",
            claims.username
        );
        return Ok((req, Uuid::nil(), Uuid::nil(), true));
    }

    let tenant_id_str = match claims.tenant_id.as_ref() {
        Some(id) => id,
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"缺少租户ID","code":400}"#,
            )
                .into_response());
        }
    };
    let tenant_id = match Uuid::parse_str(tenant_id_str) {
        Ok(id) => id,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"无效的租户ID格式","code":400}"#,
            )
                .into_response());
        }
    };
    let user_id = match claims.user_id() {
        Ok(id) => id,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                [(header::CONTENT_TYPE, "application/json")],
                r#"{"success":false,"message":"无效的用户ID","code":400}"#,
            )
                .into_response());
        }
    };

    Ok((req, tenant_id, user_id, false))
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
            let (mut req, tenant_id, user_id, system) = match prepare_tenant_request(req).await {
                Ok(v) => v,
                Err(resp) => return resp,
            };

            let txn_started = std::time::Instant::now();
            let mut txn = match pool.begin().await {
                Ok(t) => t,
                Err(e) => {
                    tracing::error!("Failed to begin RLS txn: {}", e);
                    return internal_error("事务开启失败");
                }
            };
            // 事务级租户上下文：service 身份走 nil + 系统通道，普通租户走真实租户 +
            // 关闭系统通道（即使连接上有残留会话级开关也不会被提升为跨租户放行）。
            // 三个 GUC 合成一条语句设置，省往返；均为 set_config(..., true) 仅本事务生效。
            // statement_timeout 兜住「一条卡住的查询长期占用唯一连接」，默认 30s。
            if let Err(e) = sqlx::query(
                "SELECT set_config('app.tenant_id', $1, true), \
                        set_config('app.rls_system', $2, true), \
                        set_config('statement_timeout', $3, true)",
            )
            .bind(tenant_id.to_string())
            .bind(if system { "on" } else { "off" })
            .bind(request_statement_timeout())
            .execute(&mut *txn)
            .await
            {
                tracing::error!("Failed to set RLS context: {}", e);
                let _ = txn.rollback().await;
                return internal_error("租户上下文设置失败");
            }
            tracing::debug!(
                "Applied RLS context for tenant: {} (system: {})",
                tenant_id,
                system
            );

            // 公司维度上下文：租户 GUC 已就位，才能用 core_user_company_scopes 校验归属。
            // 未声明 x-company-id 时按「唯一成员推断」兜底（多条或无记录 → ctx=None，
            // 公司 GUC 写空值，数据库侧 fail-closed）。
            let company_ctx = match super::company::resolve_company_context(
                &mut *txn,
                tenant_id,
                user_id,
                system,
                req.headers(),
            )
            .await
            {
                Ok(ctx) => ctx,
                Err((code, message)) => {
                    let _ = txn.rollback().await;
                    let status =
                        StatusCode::from_u16(code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
                    return (
                        status,
                        [(header::CONTENT_TYPE, "application/json")],
                        format!(
                            r#"{{"success":false,"message":"{message}","code":{}}}"#,
                            status.as_u16()
                        ),
                    )
                        .into_response();
                }
            };
            if let Err(e) = super::company::set_company_gucs(&mut *txn, company_ctx.as_ref()).await
            {
                tracing::error!("Failed to set company RLS context: {}", e);
                let _ = txn.rollback().await;
                return internal_error("公司上下文设置失败");
            }

            let txn_cell: RlsTxnCell = std::sync::Arc::new(tokio::sync::Mutex::new(Some(txn)));
            req.extensions_mut().insert(txn_cell.clone());
            req.extensions_mut()
                .insert(TenantContext { tenant_id, user_id });

            let method = req.method().clone();
            let path = req.uri().path().to_string();
            let finalizers = RequestFinalizers::new();
            let post_commit = PostCommitQueue::new();
            let next_fut = POST_COMMIT_QUEUE.scope(
                post_commit.clone(),
                REQUEST_FINALIZERS.scope(finalizers.clone(), next.run(req)),
            );
            // 发布 RLS task-local：下游 `Db::scope_with()` / `Db::scope*()` 只认 task-local
            // （shared-db/src/scope.rs:450）。shared-auth 的 auth_middleware 会发，但自定义
            // JWT 层（如插件模块的 jwt_auth_middleware）不会——此处兜底，
            // 避免“请求事务与 GUC 都在、task-local 却缺失”导致误报 RLS context missing。
            let next_fut = scope_request_tenant(
                RlsRequestTenant {
                    tenant: tenant_id,
                    system,
                },
                next_fut,
            );
            let resp = match company_ctx {
                Some(ctx) => crate::company_context::scope(ctx, next_fut).await,
                None => next_fut.await,
            };
            let response =
                finish_response(resp, txn_cell, &method, &path, finalizers, post_commit).await;
            let outcome = if response.status().is_success() {
                "success"
            } else {
                "error"
            };
            rls_request_txn_duration_metric()
                .with_label_values(&[outcome])
                .observe(txn_started.elapsed().as_secs_f64());
            rls_request_txn_total_metric()
                .with_label_values(&[outcome])
                .inc();
            response
        })
    }
}

/// 无请求事务的租户中间件：只做身份/租户判定与 `TenantContext` 注入，**不申请连接**。
///
/// 适用前提：该服务的所有 handler 都经 `Db::scope*` 自行开启作用域事务（租户 GUC 由
/// `Db::scope*` 在事务级设置）。此时再为每个请求预先 `BEGIN` 一条事务连接，会让每个
/// 请求同时占住「请求事务 + 作用域事务」两条连接；生产嵌入池 `max=2` 下两个并发请求
/// 即互相等待到 `acquire_timeout`（W7-B4-EHS-FOLLOWUP-1）。
///
/// 仍需要请求级事务的服务（handler 取 `RlsTxnCell` 用 `scope_with` 复用）继续使用
/// [`tenant_middleware`]。
pub fn tenant_middleware_no_txn() -> impl Fn(
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
            // 与 tenant_middleware 对齐：public 路径豁免（Claims 不注入）。
            if is_public_path(req.uri().path()) {
                return next.run(req).await;
            }
            let (mut req, tenant_id, user_id, system) = match prepare_tenant_request(req).await {
                Ok(v) => v,
                Err(resp) => return resp,
            };
            req.extensions_mut()
                .insert(TenantContext { tenant_id, user_id });

            // 公司上下文只在请求声明了 x-company-id 时解析：无公司头不申请连接。
            // 注：此处不套用「唯一成员 / is_default 推断」——那需要每请求多开一条解析事务，
            // 与本中间件「不申请连接」的前提（W7-B4-EHS-FOLLOWUP-1）冲突。
            let company_ctx = if req.headers().contains_key(super::company::X_COMPANY_ID) {
                match super::company::resolve_company_context_isolated(
                    &pool,
                    tenant_id,
                    user_id,
                    system,
                    req.headers(),
                )
                .await
                {
                    Ok(ctx) => ctx,
                    Err((code, message)) => {
                        let status =
                            StatusCode::from_u16(code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
                        return (
                            status,
                            [(header::CONTENT_TYPE, "application/json")],
                            format!(
                                r#"{{"success":false,"message":"{message}","code":{}}}"#,
                                status.as_u16()
                            ),
                        )
                            .into_response();
                    }
                }
            } else {
                None
            };

            let finalizers = RequestFinalizers::new();
            let next_fut = REQUEST_FINALIZERS.scope(finalizers.clone(), next.run(req));
            // 同上：不依赖上游 JWT 层是否发布 task-local（本中间件不开事务，handler 自开 scope）。
            let next_fut = scope_request_tenant(
                RlsRequestTenant {
                    tenant: tenant_id,
                    system,
                },
                next_fut,
            );
            let resp = match company_ctx {
                Some(ctx) => crate::company_context::scope(ctx, next_fut).await,
                None => next_fut.await,
            };
            // handler 内 ScopedTxn 的后台回滚仍需在响应写回前收尾。
            finalizers.drain().await;
            resp
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

    // ===== try_tenant_id / try_tenant_id_from_claims（阶段三 B0） =====
    fn headers_with_tenant(value: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert("x-tenant-id", value.parse().unwrap());
        headers
    }

    #[test]
    fn test_try_tenant_id_prefers_claims() {
        let claims = make_claims(Some(TENANT_ID), USER_ID, false);
        let headers = headers_with_tenant("123e4567-e89b-12d3-a456-426614174999");
        let tenant = try_tenant_id(&claims, &headers).expect("claims 有租户");
        assert_eq!(tenant.to_string(), TENANT_ID);
    }

    #[test]
    fn test_try_tenant_id_falls_back_to_header() {
        let claims = make_claims(None, USER_ID, false);
        let headers = headers_with_tenant(TENANT_ID);
        let tenant = try_tenant_id(&claims, &headers).expect("header 有租户");
        assert_eq!(tenant.to_string(), TENANT_ID);
    }

    #[test]
    fn test_try_tenant_id_rejects_missing_context() {
        let claims = make_claims(None, USER_ID, false);
        let err = try_tenant_id(&claims, &HeaderMap::new()).expect_err("缺少租户必须报错");
        assert_eq!(err.0, 400);
    }

    #[test]
    fn test_try_tenant_id_rejects_nil_uuid() {
        let claims = make_claims(Some("00000000-0000-0000-0000-000000000000"), USER_ID, false);
        let err = try_tenant_id(&claims, &HeaderMap::new()).expect_err("nil 不是有效租户");
        assert_eq!(err.0, 400);
    }

    #[test]
    fn test_try_tenant_id_from_claims_ok() {
        let claims = make_claims(Some(TENANT_ID), USER_ID, false);
        let tenant = try_tenant_id_from_claims(&claims).expect("claims 有租户");
        assert_eq!(tenant.to_string(), TENANT_ID);
    }

    #[test]
    fn test_try_tenant_id_from_claims_rejects_missing_and_invalid() {
        let missing = make_claims(None, USER_ID, false);
        assert_eq!(
            try_tenant_id_from_claims(&missing)
                .expect_err("缺失必须报错")
                .0,
            400
        );
        let invalid = make_claims(Some("garbage"), USER_ID, false);
        assert_eq!(
            try_tenant_id_from_claims(&invalid)
                .expect_err("非法必须报错")
                .0,
            400
        );
    }
}

#[cfg(test)]
mod rls_task_local_tests {
    use super::*;

    /// 两个中间件都可能 scope（auth_middleware + tenant_middleware），必须可嵌套：
    /// 内层覆盖、退出后恢复外层，而不是 panic 或丢失上下文。
    #[tokio::test]
    async fn scope_request_tenant_nests_and_restores() {
        let outer = RlsRequestTenant {
            tenant: Uuid::nil(),
            system: true,
        };
        let inner = RlsRequestTenant {
            tenant: Uuid::new_v4(),
            system: false,
        };
        let (in_outer, in_inner, after) = scope_request_tenant(outer, async move {
            let in_outer = current_request_tenant();
            let in_inner = scope_request_tenant(inner, async { current_request_tenant() }).await;
            let after = current_request_tenant();
            (in_outer, in_inner, after)
        })
        .await;

        assert!(matches!(in_outer, Some(ctx) if ctx.tenant == outer.tenant && ctx.system));
        assert!(matches!(in_inner, Some(ctx) if ctx.tenant == inner.tenant && !ctx.system));
        assert!(matches!(after, Some(ctx) if ctx.tenant == outer.tenant && ctx.system));
    }
}

#[cfg(test)]
mod request_finalizer_tests {
    use super::*;

    /// 无请求事务中间件的前置解析不依赖数据库：缺 Claims 时直接 401，
    /// 证明拒绝路径不会申请连接（紧池下这一点决定了并发是否自锁）。
    #[tokio::test]
    async fn prepare_tenant_request_rejects_without_claims() {
        let req = Request::new(Body::empty());
        let resp = match prepare_tenant_request(req).await {
            Ok(_) => panic!("缺少 Claims 时应拒绝"),
            Err(resp) => resp,
        };
        assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
    }
    use std::sync::atomic::{AtomicBool, Ordering};

    #[tokio::test]
    async fn drain_waits_registered_task() {
        let finalizers = RequestFinalizers::new();
        let done = std::sync::Arc::new(AtomicBool::new(false));
        let flag = done.clone();
        let task = tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(20)).await;
            flag.store(true, Ordering::SeqCst);
        });
        finalizers.push(task);
        finalizers.drain().await;
        assert!(done.load(Ordering::SeqCst), "drain 必须等待已登记任务结束");
    }

    #[tokio::test]
    async fn drain_returns_immediately_when_empty() {
        RequestFinalizers::new().drain().await;
    }

    #[tokio::test]
    async fn register_requires_request_scope() {
        assert!(
            !register_request_finalizer(tokio::spawn(async {})),
            "无请求作用域时不应登记"
        );
        let finalizers = RequestFinalizers::new();
        let inside = REQUEST_FINALIZERS
            .scope(finalizers.clone(), async {
                register_request_finalizer(tokio::spawn(async {}))
            })
            .await;
        assert!(inside, "请求作用域内应登记成功");
        finalizers.drain().await;
    }

    #[test]
    fn defer_post_commit_requires_request_scope() {
        assert!(
            !defer_post_commit(Box::new(|| Box::pin(async {}))),
            "无请求作用域时应返回 false，由调用方保持立即发布"
        );
    }

    #[tokio::test]
    async fn flush_runs_post_commit_actions() {
        let queue = PostCommitQueue::new();
        let counter = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let c = counter.clone();
        let registered = POST_COMMIT_QUEUE
            .scope(queue.clone(), async move {
                defer_post_commit(Box::new(move || {
                    let c = c.clone();
                    Box::pin(async move {
                        c.fetch_add(1, Ordering::SeqCst);
                    })
                }))
            })
            .await;
        assert!(registered, "请求作用域内应登记成功");
        assert_eq!(queue.len(), 1);
        queue.flush().await;
        assert_eq!(counter.load(Ordering::SeqCst), 1, "提交成功后必须执行");
        assert_eq!(queue.len(), 0);
    }

    /// 回滚 / 非 2xx 路径的证据：中间件丢弃队列后，动作不会被执行。
    #[tokio::test]
    async fn discard_drops_post_commit_actions() {
        let queue = PostCommitQueue::new();
        let counter = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let c = counter.clone();
        POST_COMMIT_QUEUE
            .scope(queue.clone(), async move {
                assert!(defer_post_commit(Box::new(move || {
                    let c = c.clone();
                    Box::pin(async move {
                        c.fetch_add(1, Ordering::SeqCst);
                    })
                })));
            })
            .await;
        assert_eq!(queue.discard(), 1, "回滚时应丢弃 1 个待发事件");
        queue.flush().await;
        assert_eq!(
            counter.load(Ordering::SeqCst),
            0,
            "被丢弃的事件不得在后续 flush 中补发"
        );
    }
}
