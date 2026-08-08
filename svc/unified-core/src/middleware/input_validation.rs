use axum::extract::State;
use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Json, Response},
};
use topems_shared_core::response::api_error;

#[derive(Debug, Clone)]
pub struct InputValidationConfig {
    pub max_path_length: usize,
    pub max_query_length: usize,
    pub detect_sql_injection: bool,
    pub detect_xss: bool,
    pub detect_path_traversal: bool,
    pub allowed_content_types: Vec<String>,
    pub skip_paths: Vec<String>,
}

impl Default for InputValidationConfig {
    fn default() -> Self {
        Self {
            max_path_length: 2048,
            max_query_length: 4096,
            detect_sql_injection: true,
            detect_xss: true,
            detect_path_traversal: true,
            allowed_content_types: vec![
                "application/json".to_string(),
                "application/json; charset=utf-8".to_string(),
                "multipart/form-data".to_string(),
                "text/plain".to_string(),
                "*/*".to_string(),
            ],
            skip_paths: vec!["/health".to_string(), "/api/core/health".to_string()],
        }
    }
}

impl InputValidationConfig {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_max_path_length(mut self, max: usize) -> Self {
        self.max_path_length = max;
        self
    }

    pub fn with_max_query_length(mut self, max: usize) -> Self {
        self.max_query_length = max;
        self
    }

    pub fn add_skip_path(mut self, path: impl Into<String>) -> Self {
        self.skip_paths.push(path.into());
        self
    }

    pub fn add_allowed_content_type(mut self, ct: impl Into<String>) -> Self {
        self.allowed_content_types.push(ct.into());
        self
    }

    fn should_skip(&self, path: &str) -> bool {
        self.skip_paths.iter().any(|skip| {
            if skip.ends_with('/') {
                path.starts_with(skip)
            } else {
                path == *skip || path.starts_with(&format!("{}/", skip))
            }
        })
    }
}

pub async fn input_validation_middleware(
    State(config): State<InputValidationConfig>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let path = request.uri().path();
    let query = request.uri().query().unwrap_or("");

    if config.should_skip(path) {
        return next.run(request).await;
    }

    if path.len() > config.max_path_length {
        return bad_request("Path too long").into_response();
    }

    if query.len() > config.max_query_length {
        return bad_request("Query string too long").into_response();
    }

    if config.detect_path_traversal {
        if detect_path_traversal(path) || detect_path_traversal(query) {
            return bad_request("Invalid path detected").into_response();
        }
    }

    if config.detect_sql_injection {
        if detect_sql_injection(query) {
            return bad_request("Invalid query parameters").into_response();
        }
    }

    if config.detect_xss {
        if detect_xss(query) {
            return bad_request("Invalid query parameters").into_response();
        }
    }

    if let Some(content_type) = request
        .headers()
        .get(axum::http::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
    {
        let ct_lower = content_type.to_lowercase();
        let is_valid = config.allowed_content_types.iter().any(|allowed| {
            let allowed_lower = allowed.to_lowercase();
            ct_lower.starts_with(&allowed_lower)
                || allowed_lower == "*/*"
                || ct_lower.starts_with("multipart/form-data")
        });

        if !is_valid {
            return bad_request("Unsupported Content-Type").into_response();
        }
    }

    next.run(request).await
}

fn detect_path_traversal(input: &str) -> bool {
    let lower = input.to_lowercase();
    lower.contains("..")
        && (lower.contains("/..") || lower.contains("..%2f") || lower.contains("..%5c"))
}

fn detect_sql_injection(input: &str) -> bool {
    let lower = input.to_lowercase();
    let patterns = [
        "' or 1=1",
        "' or '1'='1",
        "union select",
        "drop table",
        "delete from",
        "insert into",
        "update set",
        "-- ",
        "/*",
        "*/",
        "xp_cmdshell",
        "exec(",
        "execute(",
    ];

    patterns.iter().any(|p| lower.contains(p))
}

fn detect_xss(input: &str) -> bool {
    let lower = input.to_lowercase();
    let patterns = [
        "<script",
        "</script",
        "javascript:",
        "onerror=",
        "onload=",
        "onclick=",
        "<iframe",
        "<img",
        "<svg",
        "eval(",
    ];

    patterns.iter().any(|p| lower.contains(p))
}

fn bad_request(message: &str) -> impl IntoResponse {
    (StatusCode::BAD_REQUEST, Json(api_error::<()>(400, message)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_path_traversal() {
        assert!(detect_path_traversal("/../etc/passwd"));
        assert!(detect_path_traversal("/..%2fetc%2fpasswd"));
        assert!(!detect_path_traversal("/api/users"));
    }

    #[test]
    fn test_detect_sql_injection() {
        assert!(detect_sql_injection("id=1' OR 1=1--"));
        assert!(detect_sql_injection("q='; DROP TABLE users;--"));
        assert!(!detect_sql_injection("q=hello world"));
    }

    #[test]
    fn test_detect_xss() {
        assert!(detect_xss("<script>alert(1)</script>"));
        assert!(detect_xss("<img src=x onerror=alert(1)>"));
        assert!(!detect_xss("q=hello world"));
    }
}
