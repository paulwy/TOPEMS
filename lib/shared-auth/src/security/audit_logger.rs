use axum::{
    body::{to_bytes, Body},
    http::Request,
    middleware::Next,
    response::Response,
};
use serde_json::{json, Value};
use sqlx::{Pool, Postgres};
use std::sync::Arc;
use topems_shared_core::audit::redact_sensitive_json;
use uuid::Uuid;

use crate::auth::Claims;

/// 请求级审计上下文。
///
/// 由外层审计中间件创建（IP / User-Agent），内层认证中间件补充用户与租户；
/// 同一次请求内的 handler 审计写入（如 IAM `record_audit_log`）通过 task-local
/// 读取该上下文，无需在调用点重造 IP / User-Agent / 租户。
#[derive(Debug, Clone, Default)]
pub struct AuditRequestContext {
    pub user_id: Option<Uuid>,
    pub user_name: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

/// 跨中间件共享的审计上下文槽位：外层审计中间件放入请求扩展，
/// 内层认证中间件填充后再由外层在响应阶段读取。
pub type AuditContextSlot = Arc<std::sync::Mutex<AuditRequestContext>>;

tokio::task_local! {
    static AUDIT_REQUEST_CONTEXT: AuditRequestContext;
}

/// 当前请求的审计上下文；处于审计/认证中间件作用域外时返回 `None`。
pub fn current_audit_context() -> Option<AuditRequestContext> {
    AUDIT_REQUEST_CONTEXT.try_with(|ctx| ctx.clone()).ok()
}

/// 在请求作用域内携带审计上下文执行后续链路。
pub async fn scope_audit_context<F, T>(ctx: AuditRequestContext, fut: F) -> T
where
    F: std::future::Future<Output = T>,
{
    AUDIT_REQUEST_CONTEXT.scope(ctx, fut).await
}

/// 用已验签的 Claims 填充共享槽位（由认证中间件调用）。
pub fn apply_claims_to_audit_context(slot: &AuditContextSlot, claims: &Claims) {
    if let Ok(mut ctx) = slot.lock() {
        ctx.user_id = Uuid::parse_str(&claims.sub).ok();
        ctx.user_name = Some(claims.username.clone());
        ctx.tenant_id = claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok());
    }
}

/// 在已有审计上下文基础上补充 Claims 的用户/租户信息（保留 IP / UA）。
pub fn audit_context_from_claims(
    claims: &Claims,
    base: AuditRequestContext,
) -> AuditRequestContext {
    AuditRequestContext {
        user_id: Uuid::parse_str(&claims.sub).ok(),
        user_name: Some(claims.username.clone()),
        tenant_id: claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok()),
        ..base
    }
}

/// 审计日志数据（本地结构，不依赖主 crate 的 audit 模块）
///
/// 此结构镜像 `CreateAuditLogRequest` 的字段，使 shared-auth 能够独立编译。
/// audit 集成由主 crate 的 AuditLoggerExt 扩展 trait 提供（如需与主 crate 交互）。
#[derive(Debug, Clone)]
pub struct AuditLogData {
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub entity_ids: Option<serde_json::Value>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub response_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub tenant_id: Option<Uuid>,
}

impl AuditLogData {
    pub fn new(action: String, entity_type: String, status: String) -> Self {
        Self {
            action,
            entity_type,
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status,
            error_message: None,
            ip_address: None,
            user_agent: None,
            tenant_id: None,
        }
    }

    pub fn with_tenant_id(mut self, tenant_id: Option<Uuid>) -> Self {
        self.tenant_id = tenant_id;
        self
    }

    pub fn with_entity_id(mut self, entity_id: Uuid) -> Self {
        self.entity_id = Some(entity_id);
        self
    }

    pub fn with_user(mut self, user_id: String, user_name: String) -> Self {
        self.user_id = Some(user_id);
        self.user_name = Some(user_name);
        self
    }

    pub fn with_request_details(mut self, details: serde_json::Value) -> Self {
        self.request_details = Some(details);
        self
    }

    pub fn with_response_details(mut self, details: serde_json::Value) -> Self {
        self.response_details = Some(details);
        self
    }

    pub fn with_error(mut self, error_message: String) -> Self {
        self.error_message = Some(error_message);
        self
    }

    pub fn with_request_info(
        mut self,
        ip_address: Option<String>,
        user_agent: Option<String>,
    ) -> Self {
        self.ip_address = ip_address;
        self.user_agent = user_agent;
        self
    }
}

#[derive(Debug, Clone)]
pub struct AuditLoggerConfig {
    pub enabled: bool,
    pub max_request_body_size: usize,
    pub max_response_body_size: usize,
    pub skip_paths: Vec<String>,
    pub skip_methods: Vec<String>,
}

impl Default for AuditLoggerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_request_body_size: 1024 * 1024,
            max_response_body_size: 1024 * 1024,
            skip_paths: vec![
                "/health".to_string(),
                "/api/sse/".to_string(),
                "/api/core/iam/auth/login".to_string(),
                "/api/core/iam/auth/refresh".to_string(),
                "/api/core/iam/auth/register".to_string(),
            ],
            skip_methods: vec!["OPTIONS".to_string()],
        }
    }
}

impl AuditLoggerConfig {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_enabled(mut self, enabled: bool) -> Self {
        self.enabled = enabled;
        self
    }

    pub fn with_max_body_size(mut self, max_size: usize) -> Self {
        self.max_request_body_size = max_size;
        self.max_response_body_size = max_size;
        self
    }

    pub fn with_skip_paths(mut self, paths: Vec<String>) -> Self {
        self.skip_paths = paths;
        self
    }

    pub fn add_skip_path(mut self, path: &str) -> Self {
        self.skip_paths.push(path.to_string());
        self
    }

    pub fn with_skip_methods(mut self, methods: Vec<String>) -> Self {
        self.skip_methods = methods;
        self
    }

    pub fn add_skip_method(mut self, method: &str) -> Self {
        self.skip_methods.push(method.to_string());
        self
    }

    fn should_skip(&self, path: &str, method: &str) -> bool {
        if self.skip_methods.contains(&method.to_string()) {
            return true;
        }
        self.skip_paths.iter().any(|p| path.starts_with(p))
    }
}

#[derive(Debug, Clone)]
pub struct AuditLoggerMiddleware {
    config: AuditLoggerConfig,
    db_pool: Arc<Pool<Postgres>>,
}

impl AuditLoggerMiddleware {
    pub fn new(config: AuditLoggerConfig, db_pool: Pool<Postgres>) -> Self {
        Self {
            config,
            db_pool: Arc::new(db_pool),
        }
    }

    pub fn config(&self) -> &AuditLoggerConfig {
        &self.config
    }
}

async fn read_body_bytes(body: Body, max_size: usize) -> (Body, Vec<u8>) {
    let bytes = to_bytes(body, max_size + 1).await.unwrap_or_default();
    let limited = if bytes.len() > max_size {
        bytes.slice(..max_size).to_vec()
    } else {
        bytes.to_vec()
    };
    (Body::from(bytes), limited)
}

fn extract_entity_info(path: &str, method: &str) -> (String, String) {
    let path_parts: Vec<&str> = path.split('/').filter(|p| !p.is_empty()).collect();

    // 已知的非实体前缀（按顺序用于跳过）
    let known_non_entity_prefixes: &[&str] = &[
        "api",
        "core",
        "v1",
        // Group1 模块名
        "iam",
        "flow",
        "file",
        "mail",
        "im",
        "notification",
        "master",
        "migration",
        "comm",
        "plugin",
        "dict",
        "tenant",
        "billing",
        "sync",
        "help",
        "menu",
        "login_log",
        "search",
        // Group2 服务名
        "erp",
        "finance",
        "doc",
        "ai",
        "hrm",
        "pm",
        "crm",
        "mes",
        "pdm",
        "scm",
        "wms",
        "srm",
        "qms",
        "lims",
        "ehs",
        "rd",
        "rs",
        "bi",
        "analytics",
        "report",
        "monitor",
        "portal",
        "mobile",
        "gis",
        "integration",
        "manufacturing",
        "qualityAssurance",
    ];

    // 定位第一个"实体段"：跳过所有 known 前缀 + v1 + api/core
    let entity_idx = path_parts
        .iter()
        .position(|p| !known_non_entity_prefixes.contains(p))
        .unwrap_or(path_parts.len().saturating_sub(1));

    let entity_raw = path_parts.get(entity_idx).copied().unwrap_or("unknown");

    let entity_type = match entity_raw {
        "users" => "user".to_string(),
        "roles" => "role".to_string(),
        "permissions" => "permission".to_string(),
        "dictionaries" | "dict-types" | "dict-items" => "dictionary".to_string(),
        "workflows" => "workflow".to_string(),
        "projects" => "project".to_string(),
        "documents" => "document".to_string(),
        "audit-logs" => "audit_log".to_string(),
        "plugins" => "plugin".to_string(),
        "settings" => "setting".to_string(),
        "orders" => "order".to_string(),
        "tasks" => "task".to_string(),
        "departments" => "department".to_string(),
        "employees" => "employee".to_string(),
        "instances" => "workflow_instance".to_string(),
        other => other.to_string(),
    };

    let action = match method {
        "POST" => "create".to_string(),
        "PUT" => "update".to_string(),
        "DELETE" => "delete".to_string(),
        "GET" => "read".to_string(),
        "PATCH" => "partial_update".to_string(),
        _ => method.to_lowercase(),
    };

    (entity_type, action)
}

fn extract_entity_id(path: &str) -> Option<Uuid> {
    let path_parts: Vec<&str> = path.split('/').filter(|p| !p.is_empty()).collect();

    for part in path_parts.iter().rev() {
        if let Ok(uuid) = Uuid::parse_str(part) {
            return Some(uuid);
        }
    }
    None
}

fn extract_user_info(req: &Request<Body>) -> (Option<String>, Option<String>) {
    if let Some(claims) = req.extensions().get::<Claims>() {
        (Some(claims.sub.clone()), Some(claims.username.clone()))
    } else {
        (None, None)
    }
}

/// 从已解析的 Claims 扩展提取租户；没有（外层中间件早于认证）返回 None，
/// 由 `save_audit_log` 落系统 nil 租户。
fn extract_tenant_id(req: &Request<Body>) -> Option<Uuid> {
    req.extensions()
        .get::<Claims>()
        .and_then(|claims| claims.tenant_id.as_deref())
        .and_then(|s| Uuid::parse_str(s).ok())
}

fn extract_client_ip(req: &Request<Body>) -> Option<String> {
    req.headers()
        .get("X-Forwarded-For")
        .and_then(|h| h.to_str().ok())
        .map(|s| {
            s.split(',')
                .next()
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|| "unknown".to_string())
        })
        .or_else(|| {
            req.headers()
                .get("X-Real-IP")
                .and_then(|h| h.to_str().ok())
                .map(|s| s.to_string())
        })
}

fn extract_user_agent(req: &Request<Body>) -> Option<String> {
    req.headers()
        .get("User-Agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
}

fn truncate_value(value: &Value, max_size: usize) -> Value {
    let json_str = serde_json::to_string(value).unwrap_or_default();
    if json_str.len() > max_size {
        let truncated = &json_str[..max_size];
        json!({
            "truncated": true,
            "original_length": json_str.len(),
            "content": truncated
        })
    } else {
        value.clone()
    }
}

/// 审计详情统一入口：先脱敏凭据字段，再按大小上限截断，确保密码等明文不落库。
fn parse_and_redact_details(bytes: &[u8], max_size: usize) -> Option<Value> {
    if bytes.is_empty() {
        return None;
    }
    let value: Value = serde_json::from_slice(bytes).ok()?;
    Some(truncate_value(&redact_sensitive_json(&value), max_size))
}

/// `Claims.sub` 是字符串，而 `public.audit_logs.user_id` 是 uuid 列；
/// 必须先解析为 Uuid 再绑定，解析失败写 NULL，不阻断其余审计字段。
fn parse_user_uuid(user_id: Option<&str>) -> Option<Uuid> {
    user_id.and_then(|s| Uuid::parse_str(s).ok())
}

async fn save_audit_log(
    db_pool: &Pool<Postgres>,
    request: AuditLogData,
) -> Result<(), sqlx::Error> {
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    // 中间件在响应后写审计，认证中间件的 task-local 已结束；
    // 这里显式使用系统通道（nil UUID + system=on）并显式绑定行租户，
    // 避免裸连接无 GUC 时被 RLS `WITH CHECK` 拒绝（静默丢审计）。
    let tenant_id = request.tenant_id.unwrap_or_else(Uuid::nil);
    // public.audit_logs.user_id 为 uuid；Claims.sub 是字符串，必须解析后再绑定，
    // 否则 PostgreSQL 报 "column user_id is of type uuid but expression is of type text"。
    let user_id = parse_user_uuid(request.user_id.as_deref());
    // 双保险：即使调用方直接构造 AuditLogData，也在此处再脱敏一次。
    let request_details = request.request_details.as_ref().map(redact_sensitive_json);
    let response_details = request.response_details.as_ref().map(redact_sensitive_json);

    let mut tx = db_pool.begin().await?;
    sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true), \
                set_config('app.rls_system', 'on', true)",
    )
    .bind(tenant_id.to_string())
    .execute(&mut *tx)
    .await?;

    let result = sqlx::query(
        r#"INSERT INTO public.audit_logs (
            id, tenant_id, action, entity_type, entity_id, entity_ids,
            user_id, user_name, request_details, response_details,
            status, error_message, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)"#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&request.action)
    .bind(&request.entity_type)
    .bind(request.entity_id)
    .bind(request.entity_ids)
    .bind(user_id)
    .bind(request.user_name)
    .bind(request_details)
    .bind(response_details)
    .bind(&request.status)
    .bind(request.error_message)
    .bind(request.ip_address)
    .bind(request.user_agent)
    .bind(now)
    .execute(&mut *tx)
    .await;

    match result {
        Ok(_) => tx.commit().await,
        Err(e) => {
            let _ = tx.rollback().await;
            Err(e)
        }
    }
}

pub async fn audit_logger_middleware(
    middleware: Arc<AuditLoggerMiddleware>,
    req: Request<Body>,
    next: Next,
) -> Response {
    if !middleware.config.enabled {
        return next.run(req).await;
    }

    let path = req.uri().path().to_string();
    let method = req.method().as_str().to_string();

    if middleware.config.should_skip(&path, &method) {
        return next.run(req).await;
    }

    let (user_id, user_name) = extract_user_info(&req);
    let ip_address = extract_client_ip(&req);
    let user_agent = extract_user_agent(&req);
    let tenant_id = extract_tenant_id(&req);
    let (entity_type, action) = extract_entity_info(&path, &method);
    let entity_id = extract_entity_id(&path);

    // 外层中间件先记录 IP / UA；内层认证中间件会通过该槽位补充用户与租户，
    // 从而解决外层读不到内层 Claims 扩展的问题。
    let audit_context = AuditRequestContext {
        user_id: parse_user_uuid(user_id.as_deref()),
        user_name: user_name.clone(),
        tenant_id,
        ip_address: ip_address.clone(),
        user_agent: user_agent.clone(),
    };
    let context_slot: AuditContextSlot = Arc::new(std::sync::Mutex::new(audit_context.clone()));

    let (mut parts, body) = req.into_parts();
    parts.extensions.insert(context_slot.clone());
    let (new_body, request_body) =
        read_body_bytes(body, middleware.config.max_request_body_size).await;
    let req = Request::from_parts(parts, new_body);

    // 登录 / 改密 / 注册等入口同样经过此中间件，必须先脱敏再落库。
    let request_details =
        parse_and_redact_details(&request_body, middleware.config.max_request_body_size);

    // task-local 让 handler 内的审计写入也能拿到本次请求的 IP / UA / 租户。
    let response = scope_audit_context(audit_context, next.run(req)).await;

    // 认证中间件执行完毕后从共享槽位取回用户与租户（失败时不阻断审计写入）。
    let enriched = context_slot
        .lock()
        .map(|ctx| ctx.clone())
        .unwrap_or_default();
    let user_id = enriched.user_id.map(|u| u.to_string()).or(user_id);
    let user_name = enriched.user_name.or(user_name);
    let tenant_id = enriched.tenant_id.or(tenant_id);
    let ip_address = enriched.ip_address.or(ip_address);
    let user_agent = enriched.user_agent.or(user_agent);

    let status = response.status();
    let status_str = if status.is_success() {
        "success".to_string()
    } else if status.is_server_error() {
        "error".to_string()
    } else if status.is_client_error() {
        "failed".to_string()
    } else {
        "unknown".to_string()
    };

    let error_message = if status.is_client_error() || status.is_server_error() {
        Some(format!("HTTP {}", status.as_u16()))
    } else {
        None
    };

    let (response_parts, response_body) = {
        let (parts, body) = response.into_parts();
        // SSE 流式响应（text/event-stream）不能缓冲读取——无限流会被
        // read_body_bytes 阻塞到连接关闭，导致客户端 0 字节。
        // 通用保护：event-stream 一律透传（不做响应体审计）。
        let is_sse_stream = parts
            .headers
            .get(axum::http::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .is_some_and(|ct| ct.to_lowercase().contains("text/event-stream"));
        if is_sse_stream {
            (parts, (body, Vec::new()))
        } else {
            let (body, bytes) =
                read_body_bytes(body, middleware.config.max_response_body_size).await;
            (parts, (body, bytes))
        }
    };

    let (response_body, response_bytes) = response_body;
    // 响应体同样可能回显凭据，统一脱敏。
    let response_details =
        parse_and_redact_details(&response_bytes, middleware.config.max_response_body_size);

    let mut audit_request = AuditLogData::new(action, entity_type, status_str)
        .with_entity_id(entity_id.unwrap_or_else(Uuid::new_v4))
        .with_request_details(request_details.unwrap_or(json!({})))
        .with_response_details(response_details.unwrap_or(json!({})))
        .with_request_info(ip_address, user_agent)
        .with_tenant_id(tenant_id);
    // 仅在有真实操作者时写入，避免把空字符串当成用户。
    if let Some(uid) = user_id {
        audit_request.user_id = Some(uid);
    }
    if let Some(name) = user_name {
        audit_request.user_name = Some(name);
    }

    let result = if let Some(msg) = error_message {
        save_audit_log(&middleware.db_pool, audit_request.with_error(msg)).await
    } else {
        save_audit_log(&middleware.db_pool, audit_request).await
    };
    if let Err(e) = result {
        tracing::error!("请求审计写入失败（不静默丢弃）: {}", e);
    }

    Response::from_parts(response_parts, response_body)
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use sqlx::Row;
    use topems_shared_core::audit::REDACTED_PLACEHOLDER;

    #[test]
    fn test_config_default() {
        let config = AuditLoggerConfig::default();
        assert!(config.enabled);
        assert_eq!(config.max_request_body_size, 1024 * 1024);
        assert!(config.skip_paths.contains(&"/health".to_string()));
    }

    #[test]
    fn test_should_skip() {
        let config = AuditLoggerConfig::default();
        assert!(config.should_skip("/health", "GET"));
        assert!(config.should_skip("/api/core/iam/auth/login", "POST"));
        assert!(!config.should_skip("/api/core/iam/users", "GET"));
    }

    #[test]
    fn test_extract_entity_info() {
        let (entity_type, action) = extract_entity_info("/api/core/iam/users", "POST");
        assert_eq!(entity_type, "user");
        assert_eq!(action, "create");

        let (entity_type, action) = extract_entity_info("/api/core/flow/workflows", "GET");
        assert_eq!(entity_type, "workflow");
        assert_eq!(action, "read");
    }

    #[test]
    fn test_extract_entity_id() {
        let id_str = "550e8400-e29b-41d4-a716-446655440000";
        let path = format!("/api/core/iam/users/{}", id_str);
        let entity_id = extract_entity_id(&path);
        assert!(entity_id.is_some());
        assert_eq!(entity_id.unwrap().to_string(), id_str);
    }

    #[test]
    fn test_truncate_value() {
        let large_value = json!({"data": "x".repeat(2000)});
        let truncated = truncate_value(&large_value, 1000);
        assert!(truncated.as_object().unwrap().contains_key("truncated"));
    }

    #[test]
    fn test_config_builders() {
        let config = AuditLoggerConfig::new()
            .with_enabled(false)
            .add_skip_path("/metrics")
            .add_skip_method("HEAD");

        assert!(!config.enabled);
        assert!(config.skip_paths.contains(&"/metrics".to_string()));
        assert!(config.skip_methods.contains(&"HEAD".to_string()));
    }

    fn test_claims() -> Claims {
        Claims {
            sub: "550e8400-e29b-41d4-a716-446655440000".to_string(),
            username: "alice".to_string(),
            role: "admin".to_string(),
            roles: vec!["admin".to_string()],
            permissions: vec!["iam:admin".to_string()],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: Some("00000000-0000-0000-0000-000000000001".to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    #[test]
    fn test_login_request_details_masks_password() {
        let body = br#"{"username":"alice","password":"Test@123456","remember_me":true}"#;
        let details = parse_and_redact_details(body, 1024).expect("应解析成功");

        assert_eq!(details["username"], "alice");
        assert_eq!(details["remember_me"], true);
        assert_eq!(details["password"], REDACTED_PLACEHOLDER);
        assert!(!details.to_string().contains("Test@123456"));
    }

    #[test]
    fn test_parse_user_uuid_rejects_text() {
        assert!(parse_user_uuid(Some("550e8400-e29b-41d4-a716-446655440000")).is_some());
        assert!(parse_user_uuid(Some("not-a-uuid")).is_none());
        assert!(parse_user_uuid(Some("")).is_none());
        assert!(parse_user_uuid(None).is_none());
    }

    #[test]
    fn test_audit_context_from_claims_keeps_ip_and_fills_tenant() {
        let base = AuditRequestContext {
            ip_address: Some("10.0.0.1".to_string()),
            user_agent: Some("curl/8".to_string()),
            ..Default::default()
        };
        let ctx = audit_context_from_claims(&test_claims(), base);

        assert_eq!(
            ctx.user_id.unwrap().to_string(),
            "550e8400-e29b-41d4-a716-446655440000"
        );
        assert_eq!(ctx.user_name.as_deref(), Some("alice"));
        assert_eq!(
            ctx.tenant_id.unwrap().to_string(),
            "00000000-0000-0000-0000-000000000001"
        );
        assert_eq!(ctx.ip_address.as_deref(), Some("10.0.0.1"));
        assert_eq!(ctx.user_agent.as_deref(), Some("curl/8"));
    }

    #[test]
    fn test_apply_claims_to_audit_context_slot() {
        let slot: AuditContextSlot = Arc::new(std::sync::Mutex::new(AuditRequestContext {
            ip_address: Some("10.0.0.1".to_string()),
            ..Default::default()
        }));
        apply_claims_to_audit_context(&slot, &test_claims());

        let ctx = slot.lock().unwrap().clone();
        assert_eq!(
            ctx.user_id.unwrap().to_string(),
            "550e8400-e29b-41d4-a716-446655440000"
        );
        assert_eq!(
            ctx.tenant_id.unwrap().to_string(),
            "00000000-0000-0000-0000-000000000001"
        );
        assert_eq!(ctx.ip_address.as_deref(), Some("10.0.0.1"));
    }

    #[sqlx::test(migrations = false)]
    async fn test_save_audit_log_masks_password_and_persists_context(pool: sqlx::PgPool) {
        sqlx::query(
            r#"CREATE TABLE public.audit_logs (
                id UUID PRIMARY KEY,
                tenant_id UUID,
                action TEXT,
                entity_type TEXT,
                entity_id UUID,
                entity_ids JSONB,
                user_id UUID,
                user_name TEXT,
                request_details JSONB,
                response_details JSONB,
                status TEXT,
                error_message TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMPTZ
            )"#,
        )
        .execute(&pool)
        .await
        .unwrap();

        let mut request = AuditLogData::new(
            "create".to_string(),
            "auth".to_string(),
            "success".to_string(),
        )
        .with_tenant_id(Some(
            Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
        ))
        .with_request_info(Some("10.0.0.1".to_string()), Some("curl/8".to_string()))
        .with_request_details(json!({
            "username": "alice",
            "password": "Test@123456",
            "confirmPassword": "Test@123456"
        }));
        request.user_id = Some("550e8400-e29b-41d4-a716-446655440000".to_string());

        save_audit_log(&pool, request).await.unwrap();

        let row = sqlx::query(
            r#"SELECT tenant_id, user_id::text AS user_id, ip_address, user_agent, request_details
               FROM public.audit_logs"#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let details: Value = row.get("request_details");

        assert_eq!(
            row.get::<Option<Uuid>, _>("tenant_id")
                .map(|t| t.to_string())
                .as_deref(),
            Some("00000000-0000-0000-0000-000000000001")
        );
        assert_eq!(
            row.get::<Option<String>, _>("user_id").as_deref(),
            Some("550e8400-e29b-41d4-a716-446655440000")
        );
        assert_eq!(
            row.get::<Option<String>, _>("ip_address").as_deref(),
            Some("10.0.0.1")
        );
        assert_eq!(
            row.get::<Option<String>, _>("user_agent").as_deref(),
            Some("curl/8")
        );
        assert_eq!(details["password"], REDACTED_PLACEHOLDER);
        assert_eq!(details["confirmPassword"], REDACTED_PLACEHOLDER);
        assert!(!details.to_string().contains("Test@123456"));
    }
}
