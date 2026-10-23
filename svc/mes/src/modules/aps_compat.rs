//! APS API 兼容层
//!
//! 提供旧的 /api/aps/* 路由，重定向到新的 /api/mes/* 路由。
//! 用于平滑迁移，避免前端或第三方集成立即断裂。
//!
//! 路径映射:
//!   /api/aps/production-plans  → /api/mes/production-plans
//!   /api/aps/capacities        → /api/mes/capacities
//!   /api/aps/forecasts         → /api/mes/demand-forecasts
//!
//! 使用方式:
//!   1. 在 main.rs 中注册本模块的路由，使用 /api/aps 前缀
//!   2. 或者在网关层配置重定向（写方法须用 307，勿用会被缓存的永久重定向）

use axum::{
    extract::OriginalUri,
    http::{Method, StatusCode},
    response::{IntoResponse, Redirect, Response},
    routing::any,
    Router,
};

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // production-plans: 路径相同，直接重定向
        .route("/production-plans", any(redirect_to_mes))
        .route("/production-plans/{id}", any(redirect_to_mes))
        .route("/production-plans/{id}/submit", any(redirect_to_mes))
        .route("/production-plans/{id}/approve", any(redirect_to_mes))
        .route("/production-plans/{id}/reject", any(redirect_to_mes))
        // capacities: 路径相同，直接重定向
        .route("/capacities", any(redirect_to_mes))
        .route("/capacities/{id}", any(redirect_to_mes))
        .route("/capacities/{id}/allocate", any(redirect_to_mes))
        .route("/capacities/{id}/release", any(redirect_to_mes))
        .route("/capacities/{id}/maintenance", any(redirect_to_mes))
        // forecasts → demand-forecasts: 路径名不同，需要特殊处理
        .route("/forecasts", any(redirect_forecasts))
        .route("/forecasts/{id}", any(redirect_forecasts))
        .route("/forecasts/{id}/calculate", any(redirect_forecasts))
        .route("/forecasts/{id}/validate", any(redirect_forecasts))
        .route("/forecasts/{id}/adopt", any(redirect_forecasts))
        // 通用兜底：其他 APS 路由重定向到 MES 根路径
        .route("/{*path}", any(redirect_generic))
}

/// 根据请求方法选择重定向状态码。
///
/// P1-5 修复：写方法（POST/PUT/DELETE/PATCH）统一使用 307 Temporary Redirect，
/// 保留原请求方法与消息体，且不被客户端缓存（本兼容层为临时迁移层，将于 2026-11-28
/// 移除，绝不能把写请求缓存成永久重定向）。
///
/// 安全方法（GET/HEAD/OPTIONS）保留 308 Permanent Redirect：目标 /api/mes/* 在
/// 兼容层移除后依然存在，永久重定向有助于客户端平滑迁移到新路径，且安全方法无
/// 方法/消息体语义被改写的风险。
fn build_redirect(target: &str, method: &Method) -> Response {
    if method == Method::POST
        || method == Method::PUT
        || method == Method::DELETE
        || method == Method::PATCH
    {
        Redirect::temporary(target).into_response()
    } else {
        Redirect::permanent(target).into_response()
    }
}

/// 通用重定向：将 /api/aps/xxx 重定向到 /api/mes/xxx
async fn redirect_to_mes(method: Method, OriginalUri(uri): OriginalUri) -> Response {
    let path = uri.path();
    let query = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    let new_path = path.replacen("/api/aps", "/api/mes", 1);
    let target = format!("{}{}", new_path, query);
    build_redirect(&target, &method)
}

/// forecasts 特殊重定向：/api/aps/forecasts → /api/mes/demand-forecasts
async fn redirect_forecasts(method: Method, OriginalUri(uri): OriginalUri) -> Response {
    let path = uri.path();
    let query = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    let new_path = path.replacen("/api/aps/forecasts", "/api/mes/demand-forecasts", 1);
    let target = format!("{}{}", new_path, query);
    build_redirect(&target, &method)
}

/// 通用兜底重定向
async fn redirect_generic(method: Method, OriginalUri(uri): OriginalUri) -> Response {
    let path = uri.path();
    let query = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    let new_path = path.replacen("/api/aps", "/api/mes", 1);
    let target = format!("{}{}", new_path, query);
    build_redirect(&target, &method)
}

/// 返回兼容层信息（用于健康检查和文档）
pub async fn compat_info() -> impl IntoResponse {
    (
        StatusCode::OK,
        [("Content-Type", "application/json")],
        r#"{
            "service": "aps-compat-layer",
            "status": "deprecated",
            "message": "APS API has been merged into MES. Please use /api/mes/* instead of /api/aps/*",
            "migrations": {
                "/api/aps/production-plans": "/api/mes/production-plans",
                "/api/aps/capacities": "/api/mes/capacities",
                "/api/aps/forecasts": "/api/mes/demand-forecasts"
            },
            "deprecated_since": "2026-08-28",
            "removal_date": "2026-11-28"
        }"#,
    )
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {

    #[test]
    fn test_redirect_path_mapping() {
        // 测试路径映射逻辑
        let path = "/api/aps/production-plans";
        let new_path = path.replacen("/api/aps", "/api/mes", 1);
        assert_eq!(new_path, "/api/mes/production-plans");

        let path = "/api/aps/capacities/123";
        let new_path = path.replacen("/api/aps", "/api/mes", 1);
        assert_eq!(new_path, "/api/mes/capacities/123");
    }

    #[test]
    fn test_forecasts_path_mapping() {
        let path = "/api/aps/forecasts";
        let new_path = path.replacen("/api/aps/forecasts", "/api/mes/demand-forecasts", 1);
        assert_eq!(new_path, "/api/mes/demand-forecasts");

        let path = "/api/aps/forecasts/123/calculate";
        let new_path = path.replacen("/api/aps/forecasts", "/api/mes/demand-forecasts", 1);
        assert_eq!(new_path, "/api/mes/demand-forecasts/123/calculate");
    }

    #[test]
    fn test_query_preservation() {
        let path = "/api/aps/production-plans";
        let query = Some("page=1&size=20");
        let query_str = query.map(|q| format!("?{}", q)).unwrap_or_default();
        let new_path = path.replacen("/api/aps", "/api/mes", 1);
        let target = format!("{}{}", new_path, query_str);
        assert_eq!(target, "/api/mes/production-plans?page=1&size=20");
    }
}
