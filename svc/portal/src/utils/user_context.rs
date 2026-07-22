//! 用户上下文工具 - 用于透传用户身份到下游服务
//!
//! 从请求中提取 JWT token，注入到服务客户端或 HTTP 请求中，
//! 使下游服务能够获取用户专属数据。

use axum::http::HeaderMap;

/// 从请求头中提取 Bearer Token
pub fn extract_bearer_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| {
            if v.starts_with("Bearer ") {
                Some(v["Bearer ".len()..].to_string())
            } else {
                None
            }
        })
        .or_else(|| {
            headers
                .get("x-auth-token")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string())
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[test]
    fn test_extract_bearer_token() {
        let mut headers = HeaderMap::new();
        headers.insert("authorization", HeaderValue::from_static("Bearer abc123"));
        assert_eq!(extract_bearer_token(&headers), Some("abc123".to_string()));
    }

    #[test]
    fn test_extract_x_auth_token() {
        let mut headers = HeaderMap::new();
        headers.insert("x-auth-token", HeaderValue::from_static("xyz789"));
        assert_eq!(extract_bearer_token(&headers), Some("xyz789".to_string()));
    }

    #[test]
    fn test_no_token() {
        let headers = HeaderMap::new();
        assert_eq!(extract_bearer_token(&headers), None);
    }
}
