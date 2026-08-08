//! Operation Audit Middleware
//!
//! 自动捕获所有写操作（POST / PUT / PATCH / DELETE）并写入 core_operation_logs。
//! 与 `middleware/audit_log.rs`（HTTP 请求审计）不同，本中间件聚焦业务级
//! CRUD 操作审计，区别于登录日志（`core_login_logs`）。

use axum::{
    body::{Body, Bytes},
    extract::{Request, State},
    http::Method,
    middleware::Next,
    response::Response,
};
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

use crate::middleware::request_id::RequestId;
use crate::AppState;

use super::service::{infer_module_and_operation, record_operation_log};

/// 限制请求体快照长度，避免超大 body 撑爆数据库行
const MAX_REQUEST_SNAPSHOT_BYTES: usize = 8 * 1024;

/// 跳过审计的路径前缀（健康检查、内部探针等不需要写入业务审计）
const SKIP_PATH_PREFIXES: &[&str] = &[
    "/api/core/health",
    "/api/core/iam/auth/login",
    "/api/core/iam/auth/refresh",
    "/api/core/iam/auth/logout",
    "/api/core/search",
    "/api/core/audit/operations",
];

pub async fn operation_audit_middleware(
    State(state): State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let method = request.method().clone();
    let path = request.uri().path().to_string();

    // 只审计写操作
    let is_write = matches!(
        method,
        Method::POST | Method::PUT | Method::PATCH | Method::DELETE
    );

    // 跳过健康检查等
    let should_skip = !is_write
        || SKIP_PATH_PREFIXES
            .iter()
            .any(|prefix| path.starts_with(prefix));

    if should_skip {
        return next.run(request).await;
    }

    // 提取请求元信息（在拆分 body 前完成）
    let (parts, body) = request.into_parts();

    let claims = parts.extensions.get::<Claims>().cloned();
    let request_id = parts
        .extensions
        .get::<RequestId>()
        .map(|id| id.0.clone())
        .or_else(|| {
            parts
                .headers
                .get("x-request-id")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string())
        });

    let ip_address = parts
        .headers
        .get("x-forwarded-for")
        .or_else(|| parts.headers.get("x-real-ip"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(',').next().unwrap_or(s).trim().to_string())
        .or_else(|| {
            parts
                .headers
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string())
        });

    let user_agent = parts
        .headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // 读取 body（最多 MAX_REQUEST_SNAPSHOT_BYTES 字节，超出截断）
    let bytes = match axum::body::to_bytes(body, MAX_REQUEST_SNAPSHOT_BYTES).await {
        Ok(b) => b,
        Err(_) => Bytes::new(),
    };

    let request_data: Option<serde_json::Value> = if bytes.is_empty() {
        None
    } else {
        // 截断超大 body
        let snapshot = if bytes.len() > MAX_REQUEST_SNAPSHOT_BYTES {
            &bytes[..MAX_REQUEST_SNAPSHOT_BYTES]
        } else {
            &bytes[..]
        };
        serde_json::from_slice::<serde_json::Value>(snapshot).ok()
    };

    // 重新组装请求交给下游
    let request = Request::from_parts(parts, Body::from(bytes));
    let response = next.run(request).await;

    let response_status = response.status().as_u16() as i32;

    // 推断 module / operation / resource_type
    let (module, operation, resource_type) = infer_module_and_operation(method.as_str(), &path);

    // 从路径中提取 resource_id（最后一段如果是 UUID 或数字则视为 id）
    let resource_id = extract_resource_id(&path);

    let description = format!("{} {} ({})", method, path, resource_type);

    let tenant_id = claims
        .as_ref()
        .and_then(|c| c.tenant_id.as_ref())
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil());

    let user_id = claims.as_ref().and_then(|c| c.user_id().ok());
    let user_name = claims
        .as_ref()
        .map(|c| c.username.clone())
        .unwrap_or_else(|| "anonymous".to_string());

    let record = super::models::OperationLogRecord {
        tenant_id,
        user_id,
        user_name,
        module,
        operation,
        resource_type,
        resource_id,
        description: Some(description),
        request_data,
        response_status: Some(response_status),
        ip_address,
        user_agent,
        trace_id: request_id,
    };

    // 异步写入日志，不阻塞响应
    let pool = state.pool.clone();
    tokio::spawn(async move {
        if let Err(e) = record_operation_log(&pool, record).await {
            tracing::error!("[OperationAudit] 写入操作审计日志失败: {}", e);
        }
    });

    response
}

/// 从路径最后一段提取 resource_id
fn extract_resource_id(path: &str) -> Option<String> {
    path.split('/')
        .filter(|s| !s.is_empty())
        .last()
        .filter(|seg| {
            // 仅当末段看起来是 ID（UUID 或纯数字）时返回
            Uuid::parse_str(seg).is_ok() || seg.parse::<i64>().is_ok()
        })
        .map(|s| s.to_string())
}
