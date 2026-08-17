use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use serde_json::json;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct BodyLimitConfig {
    pub max_size_bytes: u64,
    pub allowed_content_types: Vec<String>,
}

impl Default for BodyLimitConfig {
    fn default() -> Self {
        Self {
            max_size_bytes: 10 * 1024 * 1024,
            allowed_content_types: vec![
                "application/json".to_string(),
                "application/x-www-form-urlencoded".to_string(),
                "multipart/form-data".to_string(),
                "text/plain".to_string(),
                "application/octet-stream".to_string(),
            ],
        }
    }
}

impl BodyLimitConfig {
    pub fn new(max_size_bytes: u64) -> Self {
        Self {
            max_size_bytes,
            ..Default::default()
        }
    }

    pub fn with_size(mut self, max_size_bytes: u64) -> Self {
        self.max_size_bytes = max_size_bytes;
        self
    }

    pub fn with_content_types(mut self, content_types: Vec<String>) -> Self {
        self.allowed_content_types = content_types;
        self
    }

    pub fn add_content_type(mut self, content_type: &str) -> Self {
        self.allowed_content_types.push(content_type.to_string());
        self
    }

    pub fn strict() -> Self {
        Self {
            max_size_bytes: 1024 * 1024,
            allowed_content_types: vec!["application/json".to_string()],
        }
    }

    pub fn for_file_upload() -> Self {
        Self {
            max_size_bytes: 100 * 1024 * 1024,
            allowed_content_types: vec![
                "multipart/form-data".to_string(),
                "application/octet-stream".to_string(),
                "image/jpeg".to_string(),
                "image/png".to_string(),
                "application/pdf".to_string(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
                "application/vnd.ms-excel".to_string(),
            ],
        }
    }
}

#[derive(Debug, Clone)]
pub struct BodyLimitMiddleware {
    config: BodyLimitConfig,
}

impl BodyLimitMiddleware {
    pub fn new(config: BodyLimitConfig) -> Self {
        Self { config }
    }

    pub fn config(&self) -> &BodyLimitConfig {
        &self.config
    }
}

async fn read_body(req: Request<Body>, max_size: usize) -> (Request<Body>, usize) {
    let (parts, body) = req.into_parts();
    let bytes = to_bytes(body, max_size + 1).await.unwrap_or_default();
    let size = bytes.len();
    (Request::from_parts(parts, Body::from(bytes)), size)
}

fn extract_content_type(req: &Request<Body>) -> Option<String> {
    req.headers()
        .get(axum::http::header::CONTENT_TYPE)
        .and_then(|h| h.to_str().ok())
        .map(|s| {
            s.split(';')
                .next()
                .map(|s| s.trim().to_lowercase())
                .unwrap_or_default()
        })
}

fn is_content_type_allowed(config: &BodyLimitConfig, content_type: &str) -> bool {
    config.allowed_content_types.is_empty()
        || config
            .allowed_content_types
            .iter()
            .any(|allowed| content_type.starts_with(allowed))
}

pub async fn body_limit_middleware(
    middleware: Arc<BodyLimitMiddleware>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let content_type = extract_content_type(&req);

    if let Some(ct) = &content_type {
        if !is_content_type_allowed(&middleware.config, ct) {
            let body = json!({
                "code": 415,
                "success": false,
                "message": format!("不支持的内容类型: {}", ct),
                "data": null,
            })
            .to_string();

            return Response::builder()
                .status(StatusCode::UNSUPPORTED_MEDIA_TYPE)
                .header("Content-Type", "application/json")
                .body(Body::from(body))
                .expect("building response with UNSUPPORTED_MEDIA_TYPE should always succeed");
        }
    }

    let (req, size) = read_body(req, middleware.config.max_size_bytes as usize).await;

    if size as u64 > middleware.config.max_size_bytes {
        let body = json!({
            "code": 413,
            "success": false,
            "message": format!("请求体大小超出限制 (最大 {} MB)", middleware.config.max_size_bytes / 1024 / 1024),
            "data": null,
        })
        .to_string();

        return Response::builder()
            .status(StatusCode::PAYLOAD_TOO_LARGE)
            .header("Content-Type", "application/json")
            .header("Content-Length", size.to_string())
            .body(Body::from(body))
            .expect("building response with PAYLOAD_TOO_LARGE should always succeed");
    }

    next.run(req).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Method;

    #[test]
    fn test_config_default() {
        let config = BodyLimitConfig::default();
        assert_eq!(config.max_size_bytes, 10 * 1024 * 1024);
        assert!(!config.allowed_content_types.is_empty());
    }

    #[test]
    fn test_config_strict() {
        let config = BodyLimitConfig::strict();
        assert_eq!(config.max_size_bytes, 1024 * 1024);
        assert_eq!(config.allowed_content_types, vec!["application/json"]);
    }

    #[test]
    fn test_config_file_upload() {
        let config = BodyLimitConfig::for_file_upload();
        assert_eq!(config.max_size_bytes, 100 * 1024 * 1024);
    }

    #[test]
    fn test_is_content_type_allowed() {
        let config = BodyLimitConfig::default();
        assert!(is_content_type_allowed(&config, "application/json"));
        assert!(is_content_type_allowed(&config, "multipart/form-data"));
        assert!(!is_content_type_allowed(&config, "text/html"));
    }

    #[test]
    fn test_content_type_wildcard() {
        let config =
            BodyLimitConfig::new(10 * 1024 * 1024).with_content_types(vec!["image/".to_string()]);
        assert!(is_content_type_allowed(&config, "image/jpeg"));
        assert!(is_content_type_allowed(&config, "image/png"));
        assert!(!is_content_type_allowed(&config, "application/pdf"));
    }

    #[test]
    fn test_extract_content_type() {
        let mut req = Request::builder()
            .method(Method::POST)
            .uri("/")
            .header("Content-Type", "application/json; charset=utf-8")
            .body(Body::empty())
            .unwrap();

        let ct = extract_content_type(&req);
        assert_eq!(ct, Some("application/json".to_string()));

        req = Request::builder()
            .method(Method::GET)
            .uri("/")
            .body(Body::empty())
            .unwrap();

        let ct = extract_content_type(&req);
        assert_eq!(ct, None);
    }
}
