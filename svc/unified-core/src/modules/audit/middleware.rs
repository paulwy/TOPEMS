//! Operation Audit Middleware
//!
//! 自动捕获所有写操作（POST / PUT / PATCH / DELETE）并写入 core_operation_logs。
//! 与 `middleware/audit_log.rs`（HTTP 请求审计）不同，本中间件聚焦业务级
//! CRUD 操作审计，区别于登录日志（`core_login_logs`）。

use axum::{
    body::Body,
    extract::{Request, State},
    http::{header, Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

use crate::middleware::request_id::RequestId;
use crate::AppState;

use super::service::{infer_module_and_operation, record_operation_log};

/// 限制请求体快照长度，避免超大 body 撑爆数据库行
const MAX_REQUEST_SNAPSHOT_BYTES: usize = 8 * 1024;

/// 允许读取并原样转发的最长 JSON 请求体，与 `middleware::input_validation`
/// 的 `max_body_bytes`（10MB）同口径。外层 body_limit 已先拦截更大请求；
/// 此处超限直接返回 413，绝不把请求体回退成空 body（否则会打断主流程）。
const BODY_READ_LIMIT: usize = 10 * 1024 * 1024;

/// 跳过审计的路径前缀（健康检查、内部探针等不需要写入业务审计）
const SKIP_PATH_PREFIXES: &[&str] = &[
    "/api/core/health",
    "/api/core/iam/auth/login",
    "/api/core/iam/auth/refresh",
    "/api/core/iam/auth/logout",
    "/api/core/search",
    "/api/core/audit/operations",
];

#[allow(clippy::as_conversions)]
#[allow(clippy::indexing_slicing)]
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

    // 仅 JSON 请求才读取 body 做快照：multipart / octet-stream 等一律不读、原样透传，
    // 既避免把上传流缓冲进内存，也避免读取失败时把请求体吞掉。
    let is_json = parts
        .headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|ct| {
            ct.split(';')
                .next()
                .unwrap_or(ct)
                .trim()
                .to_ascii_lowercase()
        })
        .is_some_and(|ct| ct == "application/json" || ct.ends_with("+json"));

    let (request_data, forwarded_body) = if is_json {
        match axum::body::to_bytes(body, BODY_READ_LIMIT).await {
            Ok(bytes) => {
                // 只保留前 8KB 做快照；截断后的 JSON 解析失败则记 None，不影响转发。
                let snapshot_len = bytes.len().min(MAX_REQUEST_SNAPSHOT_BYTES);
                let request_data = if snapshot_len == 0 {
                    None
                } else {
                    serde_json::from_slice::<serde_json::Value>(&bytes[..snapshot_len]).ok()
                };
                (request_data, Body::from(bytes))
            }
            Err(e) => {
                // 外层 body_limit 已把超限请求拦在前面，走到这里说明读取异常；
                // 直接 413，绝不把请求体回退成空 body 交给下游。
                tracing::warn!(
                    audit_kind = "operation_log",
                    path = %path,
                    error = %e,
                    "[OperationAudit] 请求体读取超限或中断，返回 413"
                );
                return (
                    StatusCode::PAYLOAD_TOO_LARGE,
                    [(header::CONTENT_TYPE, "application/json")],
                    r#"{"success":false,"message":"请求体过大","code":413}"#,
                )
                    .into_response();
            }
        }
    } else {
        (None, body)
    };

    // 重新组装请求交给下游
    let request = Request::from_parts(parts, forwarded_body);
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

    // 异步写入日志，不阻塞响应。
    //
    // `tokio::spawn` 会丢弃请求的 task-local 租户上下文，因此这里不能用
    // `Db::scope()`（fail-closed 会直接报 "RLS context missing"），而是把
    // `record.tenant_id` 显式带过去，由 `record_operation_log` 按租户/系统通道写入。
    let db = state.db.clone();
    tokio::spawn(async move {
        if let Err(e) = record_operation_log(&db, record).await {
            topems_shared_core::metrics::AUDIT_WRITE_FAILURES_TOTAL
                .with_label_values(&["operation_log"])
                .inc();
            tracing::error!(
                audit_write_failed = true,
                audit_kind = "operation_log",
                error = %e,
                "[OperationAudit] 写入操作审计日志失败"
            );
        }
    });

    response
}

/// 从路径最后一段提取 resource_id
fn extract_resource_id(path: &str) -> Option<String> {
    path.split('/')
        .rfind(|s| !s.is_empty())
        .filter(|seg| {
            // 仅当末段看起来是 ID（UUID 或纯数字）时返回
            Uuid::parse_str(seg).is_ok() || seg.parse::<i64>().is_ok()
        })
        .map(|s| s.to_string())
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_resource_id_uuid() {
        let path = "/api/core/iam/users/550e8400-e29b-41d4-a716-446655440000";
        let id = extract_resource_id(path);
        assert_eq!(id.as_deref(), Some("550e8400-e29b-41d4-a716-446655440000"));
    }

    #[test]
    fn test_extract_resource_id_numeric() {
        let path = "/api/core/iam/users/12345";
        let id = extract_resource_id(path);
        assert_eq!(id.as_deref(), Some("12345"));
    }

    #[test]
    fn test_extract_resource_id_non_id_segment() {
        let path = "/api/core/iam/users/list";
        let id = extract_resource_id(path);
        assert!(id.is_none());
    }

    #[test]
    fn test_extract_resource_id_empty_path() {
        let path = "";
        let id = extract_resource_id(path);
        assert!(id.is_none());
    }

    #[test]
    fn test_extract_resource_id_root_path() {
        let path = "/";
        let id = extract_resource_id(path);
        assert!(id.is_none());
    }

    #[test]
    fn test_extract_resource_id_trailing_slash() {
        let path = "/api/core/iam/users/550e8400-e29b-41d4-a716-446655440000/";
        let id = extract_resource_id(path);
        assert_eq!(id.as_deref(), Some("550e8400-e29b-41d4-a716-446655440000"));
    }

    #[test]
    fn test_extract_resource_id_mixed_path() {
        let path = "/api/core/iam/users/550e8400-e29b-41d4-a716-446655440000/roles";
        let id = extract_resource_id(path);
        assert!(id.is_none());
    }

    #[test]
    fn test_max_request_snapshot_bytes() {
        assert_eq!(MAX_REQUEST_SNAPSHOT_BYTES, 8 * 1024);
    }

    #[test]
    fn test_skip_path_prefixes_contains_health() {
        assert!(SKIP_PATH_PREFIXES.contains(&"/api/core/health"));
    }

    #[test]
    fn test_skip_path_prefixes_contains_login() {
        assert!(SKIP_PATH_PREFIXES.contains(&"/api/core/iam/auth/login"));
    }
}
