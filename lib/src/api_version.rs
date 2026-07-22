use axum::{
    extract::Request,
    http::{HeaderValue, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use tower::ServiceBuilder;

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

pub fn api_prefix(version: &str) -> String {
    format!("/api/{}", version)
}

pub fn service_api_prefix(service: &str) -> String {
    format!("/api/v1/{}", service)
}

pub fn new_service_prefix(service: &str, is_core: bool) -> String {
    if is_core {
        format!("/api/core/{}", service)
    } else {
        format!("/api/{}", service)
    }
}

pub fn versioned_router<S: Clone + Send + Sync + 'static>(
    version: &str,
    router: Router<S>,
) -> Router<S> {
    let prefix = api_prefix(version);
    Router::new().nest(&prefix, router)
}

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

pub async fn get_api_info_handler(service_name: &'static str) -> impl IntoResponse {
    let api_info = create_api_info(service_name);
    axum::Json(api_info)
}

pub fn create_api_info_router<S: Clone + Send + Sync + 'static>(
    service_name: &'static str,
) -> Router<S> {
    Router::new()
        .route("/api", get(move || get_api_info_handler(service_name)))
        .route("/api/info", get(move || get_api_info_handler(service_name)))
}

async fn deprecation_middleware(req: Request, next: Next) -> Response {
    let uri = req.uri().clone();
    tracing::warn!(target: "route_legacy", "DEPRECATED route called: {}", uri);
    let mut res = next.run(req).await;
    res.headers_mut()
        .insert("Deprecation", HeaderValue::from_static("true"));
    res.headers_mut().insert(
        "Warning",
        HeaderValue::from_static(
            r#"299 - "Route with /v1 is deprecated, use path without /v1 per K8s ingress spec""#,
        ),
    );
    res
}

pub fn register_routes_with_legacy_alias<S>(
    router: Router<S>,
    new_prefix: &str,
    legacy_prefixes: &[&str],
    inner: Router<S>,
) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    let mut r = router.nest(new_prefix, inner.clone());
    for legacy in legacy_prefixes {
        let deprecated: Router<S> = inner
            .clone()
            .layer(ServiceBuilder::new().layer(axum::middleware::from_fn(deprecation_middleware)));
        r = r.nest(legacy, deprecated);
    }
    r
}

pub fn health_check() -> StatusCode {
    StatusCode::OK
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
    fn test_service_api_prefix() {
        assert_eq!(service_api_prefix("core"), "/api/v1/core");
        assert_eq!(service_api_prefix("hrm"), "/api/v1/hrm");
        assert_eq!(service_api_prefix("pm"), "/api/v1/pm");
    }

    #[test]
    fn test_new_service_prefix() {
        assert_eq!(new_service_prefix("iam", true), "/api/core/iam");
        assert_eq!(new_service_prefix("hrm", false), "/api/hrm");
        assert_eq!(new_service_prefix("erp", false), "/api/erp");
    }

    #[test]
    fn test_create_api_info() {
        let info = create_api_info("test-service");
        assert_eq!(info.service_name, "test-service");
        assert_eq!(info.latest_version, "v1");
        assert!(!info.versions.is_empty());
    }
}
