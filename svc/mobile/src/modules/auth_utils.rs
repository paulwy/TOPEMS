use axum::http::HeaderMap;
use topems_shared_auth::auth::verify_jwt_token;

pub fn extract_user_id_from_token(headers: &HeaderMap, secret: &str) -> Result<String, ()> {
    let auth_header = headers.get("Authorization").and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => return Err(()),
    };

    match verify_jwt_token(token, secret) {
        Ok(claims) => Ok(claims.sub),
        Err(_) => Err(()),
    }
}

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
}

/// 判断 Authorization 头的字符串值是否为 Bearer 模式（不区分大小写的前缀）。
pub fn is_bearer_token(auth_header: &str) -> bool {
    auth_header.len() >= 7 && auth_header[..7].eq_ignore_ascii_case("Bearer ")
}

/// 从 Authorization 头的字符串值中提取 Bearer token 部分。
/// 若不是 Bearer 模式则返回 None。
pub fn extract_token_value(auth_header: &str) -> Option<&str> {
    if is_bearer_token(auth_header) {
        Some(&auth_header[7..])
    } else {
        None
    }
}

/// 简单校验用户 ID 字符串格式：非空且为可打印 ASCII 字符。
pub fn is_valid_user_id_format(id: &str) -> bool {
    !id.is_empty() && id.chars().all(|c| c.is_ascii_graphic() || c == ' ')
}

/// 校验 JWT secret 是否非空且不包含前后空白。
pub fn is_valid_jwt_secret(secret: &str) -> bool {
    !secret.is_empty() && secret == secret.trim()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- is_bearer_token ----

    #[test]
    fn test_is_bearer_token_valid() {
        assert!(is_bearer_token("Bearer abc123"));
        assert!(is_bearer_token("bearer abc"));
        assert!(is_bearer_token("BEARER xyz"));
    }

    #[test]
    fn test_is_bearer_token_invalid_prefix() {
        assert!(!is_bearer_token("Basic abc"));
        assert!(!is_bearer_token("Token abc"));
    }

    #[test]
    fn test_is_bearer_token_empty() {
        assert!(!is_bearer_token(""));
    }

    #[test]
    fn test_is_bearer_token_too_short() {
        assert!(!is_bearer_token("Bearer"));
        assert!(!is_bearer_token("Bearer"));
        assert!(!is_bearer_token("B"));
    }

    #[test]
    fn test_is_bearer_token_only_prefix() {
        // 长度刚好 7，但 token 部分为空 -> 仍视为 Bearer 模式
        assert!(is_bearer_token("Bearer "));
    }

    #[test]
    fn test_is_bearer_token_missing_space() {
        assert!(!is_bearer_token("Bearerabc"));
        assert!(!is_bearer_token("bearerabc"));
    }

    // ---- extract_token_value ----

    #[test]
    fn test_extract_token_value_valid() {
        assert_eq!(extract_token_value("Bearer abc123"), Some("abc123"));
        assert_eq!(extract_token_value("bearer XYZ"), Some("XYZ"));
    }

    #[test]
    fn test_extract_token_value_invalid() {
        assert_eq!(extract_token_value("Basic abc"), None);
        assert_eq!(extract_token_value(""), None);
        assert_eq!(extract_token_value("Bearer"), None);
    }

    #[test]
    fn test_extract_token_value_empty_token() {
        // "Bearer " 后没有内容
        assert_eq!(extract_token_value("Bearer "), Some(""));
    }

    #[test]
    fn test_extract_token_value_with_spaces_in_token() {
        // token 中包含空格仍然会被一并返回
        assert_eq!(extract_token_value("Bearer a b c"), Some("a b c"));
    }

    // ---- is_valid_user_id_format ----

    #[test]
    fn test_is_valid_user_id_format_valid() {
        assert!(is_valid_user_id_format("user-123"));
        assert!(is_valid_user_id_format("abc.def@ghi"));
        assert!(is_valid_user_id_format(
            "550e8400-e29b-41d4-a716-446655440000"
        ));
    }

    #[test]
    fn test_is_valid_user_id_format_empty() {
        assert!(!is_valid_user_id_format(""));
    }

    #[test]
    fn test_is_valid_user_id_format_with_space() {
        // 包含空格也算合法（用户 ID 中的可打印 ASCII）
        assert!(is_valid_user_id_format("user 123"));
    }

    #[test]
    fn test_is_valid_user_id_format_with_control_chars() {
        assert!(!is_valid_user_id_format("user\n123"));
        assert!(!is_valid_user_id_format("user\t123"));
    }

    #[test]
    fn test_is_valid_user_id_format_non_ascii() {
        assert!(!is_valid_user_id_format("用户123"));
    }

    // ---- is_valid_jwt_secret ----

    #[test]
    fn test_is_valid_jwt_secret_valid() {
        assert!(is_valid_jwt_secret("my-secret-key"));
        assert!(is_valid_jwt_secret("a"));
    }

    #[test]
    fn test_is_valid_jwt_secret_empty() {
        assert!(!is_valid_jwt_secret(""));
    }

    #[test]
    fn test_is_valid_jwt_secret_with_leading_whitespace() {
        assert!(!is_valid_jwt_secret(" my-secret"));
    }

    #[test]
    fn test_is_valid_jwt_secret_with_trailing_whitespace() {
        assert!(!is_valid_jwt_secret("my-secret "));
    }

    #[test]
    fn test_is_valid_jwt_secret_with_internal_spaces() {
        // 内部空格是允许的
        assert!(is_valid_jwt_secret("my secret key"));
    }
}
