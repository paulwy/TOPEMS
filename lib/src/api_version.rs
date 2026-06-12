use axum::{response::IntoResponse, routing::get, Router};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiVersionInfo {
    pub version: String,
    pub latest: bool,
    pub deprecated: bool,
    pub sunset_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiInfo {
    pub service_name: String,
    pub versions: Vec<ApiVersionInfo>,
    pub latest_version: String,
}

/// 创建一个版本化路由前缀
pub fn api_prefix(version: &str) -> String {
    format!("/api/{}", version)
}

/// 创建一个版本化的 API 路由
pub fn versioned_router<S: Clone + Send + Sync + 'static>(
    version: &str,
    router: Router<S>,
) -> Router<S> {
    let prefix = api_prefix(version);
    Router::new().nest(&prefix, router)
}

/// 创建一个默认的 API 路由，同时支持 v1 和 /api 前缀（为了向后兼容）
pub fn default_versioned_router<S: Clone + Send + Sync + 'static>(router: Router<S>) -> Router<S> {
    Router::new()
        // 主要的版本化路由
        .nest("/api/v1", router.clone())
        // 为了向后兼容，保留没有版本号的旧路径
        .nest("/api", router)
}

/// 创建 API 信息响应
pub fn create_api_info(service_name: &str) -> ApiInfo {
    ApiInfo {
        service_name: service_name.to_string(),
        versions: vec![ApiVersionInfo {
            version: "v1".to_string(),
            latest: true,
            deprecated: false,
            sunset_date: None,
        }],
        latest_version: "v1".to_string(),
    }
}

/// API 信息路由处理函数（无状态版本）
pub async fn get_api_info_handler(service_name: &'static str) -> impl IntoResponse {
    let api_info = create_api_info(service_name);
    axum::Json(api_info)
}

/// 创建 API 信息路由（无状态版本，适合合并到有状态路由）
pub fn create_api_info_router<S: Clone + Send + Sync + 'static>(
    service_name: &'static str,
) -> Router<S> {
    Router::new()
        .route("/api", get(move || get_api_info_handler(service_name)))
        .route("/api/info", get(move || get_api_info_handler(service_name)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_prefix() {
        assert_eq!(api_prefix("v1"), "/api/v1");
        assert_eq!(api_prefix("v2"), "/api/v2");
    }

    #[test]
    fn test_create_api_info() {
        let info = create_api_info("test-service");
        assert_eq!(info.service_name, "test-service");
        assert_eq!(info.latest_version, "v1");
        assert!(!info.versions.is_empty());
    }
}
