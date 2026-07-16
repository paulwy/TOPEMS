//! Inline handler functions and middleware wrappers for the unified-core service.
//!
//! Extracted from `main.rs` to keep the entry point focused on startup and
//! server configuration. All functions here are `pub(crate)` so they can be
//! referenced from `routes.rs` and `main.rs` without leaking into the crate's
//! public API.

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{Request, StatusCode};
use axum::response::Response;
use axum::Json;

use topems_shared::{
    audit_logger_middleware, body_limit_middleware, security_headers_middleware,
    simple_health_check, ApiResponse, ServiceHealth,
};

use crate::middleware;
use crate::AppState;

// ==================== 插件代理处理函数 ====================

/// 插件代理处理器
pub(crate) async fn plugin_proxy(
    Path((plugin_code, remaining)): Path<(String, String)>,
    State(state): State<AppState>,
    request: Request<Body>,
) -> Result<Response, (StatusCode, String)> {
    // 1. 查询插件 runtime_url
    let plugin_info: Option<(String, String)> = sqlx::query_as(
        r#"
        SELECT pi.runtime_url, pi.base_path
        FROM core_plugin_instances pi
        JOIN core_plugins p ON pi.plugin_id = p.id
        WHERE p.code = $1 AND pi.runtime_status = 'running'
        "#,
    )
    .bind(&plugin_code)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let (runtime_url, base_path) = match plugin_info {
        Some((url, path)) => (url, path),
        None => {
            return Err((
                StatusCode::NOT_FOUND,
                "Plugin not found or not running".to_string(),
            ))
        }
    };

    // 2. 构造目标 URL
    // base_path 格式如 "/api/plugins/erp"，remaining 格式如 "api/plugins/erp/xxx"
    // 需要去掉 base_path 前缀得到 "/xxx"
    let base_path_str = base_path.trim_start_matches('/');
    let path_suffix: String = if remaining.starts_with(&base_path) {
        remaining
            .strip_prefix(&base_path)
            .unwrap_or(&remaining)
            .to_string()
    } else if remaining.starts_with(base_path_str) {
        remaining
            .strip_prefix(base_path_str)
            .unwrap_or(&remaining)
            .to_string()
    } else {
        // 如果都不匹配，直接使用剩余路径（加上前导斜杠）
        format!("/{}", remaining)
    };
    let target_url = format!("{}{}", runtime_url.trim_end_matches('/'), path_suffix);

    tracing::info!(
        "[Plugin Proxy] Forwarding {} -> {}",
        request.uri(),
        target_url
    );

    // 3. 构造代理请求
    let method = request.method().clone();

    // 4. 构建 reqwest 请求，逐步添加头部
    let mut req_builder = state.http_client.request(method.clone(), &target_url);

    // 复制原始请求的头部，但跳过 host 和 content-length
    for (key, value) in request.headers().iter() {
        if key != axum::http::header::HOST && key != axum::http::header::CONTENT_LENGTH {
            if let Ok(value_str) = value.to_str() {
                req_builder = req_builder.header(key.as_str(), value_str);
            }
        }
    }

    // 5. 发送请求到目标插件
    let response = req_builder.send().await.map_err(|e| {
        tracing::info!("[Plugin Proxy] Failed to forward request: {}", e);
        (StatusCode::BAD_GATEWAY, e.to_string())
    })?;

    // 6. 转换响应
    let status = StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::OK);
    let mut builder = Response::builder().status(status);

    for (key, value) in response.headers().iter() {
        builder = builder.header(key.as_str(), value.as_bytes());
    }

    let body = response
        .bytes()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    Ok(builder
        .body(Body::from(body))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?)
}

// ==================== 公共处理函数 ====================

pub(crate) async fn home() -> &'static str {
    "TOPEMS Unified Core Platform API\n\n\
     Contains: IAM + Flow + File + Communication\n\n\
     - /health - Health check\n\
     - /api/info - API information"
}

pub(crate) async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

pub(crate) async fn plugin_health_check() -> Json<ServiceHealth> {
    Json(topems_shared::build_health_response(
        "topems-workflow",
        true,
    ))
}

pub(crate) async fn detailed_health(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "unified-core-service",
        "version": "1.0.0",
        "description": "TOPEMS Unified Core Platform",
        "modules": {
            "iam": "active",
            "flow": "active",
            "file": "active",
            "communication": "active",
            "tenant": "active",
            "billing": "active",
            "plugin": "active",
            "sync": "active"
        },
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "dependencies": [
            { "name": "postgresql", "status": db_status }
        ]
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}

// ==================== 中间件包装函数 ====================

pub(crate) async fn rate_limit_middleware_fn(
    state: State<AppState>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    middleware::rate_limit::rate_limit_middleware(state, req, next).await
}

pub(crate) async fn security_headers_middleware_fn(
    State(state): State<AppState>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    security_headers_middleware(state.security_headers_layer.clone(), req, next).await
}

pub(crate) async fn compression_middleware_fn(
    State(state): State<AppState>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    state
        .compression_middleware
        .clone()
        .middleware(req, next)
        .await
}

pub(crate) async fn body_limit_middleware_fn(
    State(state): State<AppState>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    body_limit_middleware(state.body_limit_middleware.clone(), req, next).await
}

pub(crate) async fn audit_logger_middleware_fn(
    State(state): State<AppState>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    audit_logger_middleware(state.audit_logger_middleware.clone(), req, next).await
}
