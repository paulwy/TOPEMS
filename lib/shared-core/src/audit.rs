//! 审计日志敏感字段脱敏。
//!
//! 所有审计写入（中间件、`AuditLogService`、各服务 `log_audit_event`、IAM 用户操作）
//! 在落库前统一调用 [`redact_sensitive_json`]，避免密码、令牌等凭据进入 `audit_logs`。

use serde_json::{Map, Value};

/// 敏感字段被替换后的占位值。
pub const REDACTED_PLACEHOLDER: &str = "[REDACTED]";

/// 判断 JSON 字段名是否属于需要脱敏的凭据类字段。
///
/// 归一化规则：忽略大小写、下划线、连字符与点号，使 `confirmPassword`、
/// `confirm_password`、`new-password`、`api.key` 等写法都能命中。
pub fn is_sensitive_audit_key(key: &str) -> bool {
    let normalized: String = key
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_lowercase())
        .collect();

    if normalized.is_empty() {
        return false;
    }

    // 精确命中的短字段名（避免 `pk` 之类误伤，因此只列明确凭据名）。
    if matches!(
        normalized.as_str(),
        "pwd"
            | "passwd"
            | "password"
            | "token"
            | "secret"
            | "authorization"
            | "credential"
            | "credentials"
            | "apikey"
            | "accesskey"
            | "privatekey"
            | "cookie"
    ) {
        return true;
    }

    // 前缀/包含命中：覆盖 confirmPassword / oldPassword / newPassword /
    // refresh_token / access_token / client_secret / api_key 等组合字段。
    normalized.contains("password")
        || normalized.contains("passwd")
        || normalized.contains("secret")
        || normalized.contains("token")
        || normalized.ends_with("apikey")
        || normalized.ends_with("accesskey")
        || normalized.ends_with("privatekey")
}

/// 递归脱敏 JSON 中的凭据字段，保持原有对象/数组结构不变。
pub fn redact_sensitive_json(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut redacted = Map::with_capacity(map.len());
            for (key, child) in map {
                if is_sensitive_audit_key(key) {
                    redacted.insert(key.clone(), Value::String(REDACTED_PLACEHOLDER.to_string()));
                } else {
                    redacted.insert(key.clone(), redact_sensitive_json(child));
                }
            }
            Value::Object(redacted)
        }
        Value::Array(items) => Value::Array(
            items
                .iter()
                .map(redact_sensitive_json)
                .collect::<Vec<Value>>(),
        ),
        other => other.clone(),
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_is_sensitive_audit_key_variants() {
        for key in [
            "password",
            "Password",
            "confirmPassword",
            "confirm_password",
            "oldPassword",
            "new-password",
            "passwd",
            "pwd",
            "token",
            "refresh_token",
            "accessToken",
            "secret",
            "client_secret",
            "apiKey",
            "api_key",
            "privateKey",
            "authorization",
            "credentials",
        ] {
            assert!(is_sensitive_audit_key(key), "应视为敏感字段: {key}");
        }

        for key in ["username", "email", "full_name", "id", "status", "count"] {
            assert!(!is_sensitive_audit_key(key), "不应视为敏感字段: {key}");
        }
    }

    #[test]
    fn test_redact_create_user_payload() {
        let payload = json!({
            "username": "bob",
            "email": "bob@example.com",
            "password": "Test@123456",
            "confirmPassword": "Test@123456",
            "profile": {
                "oldPassword": "old-secret",
                "newPassword": "new-secret",
                "token": "abc123"
            },
            "roles": [
                {"name": "admin", "secret": "hidden"}
            ],
            "nonce": "keep-me"
        });

        let redacted = redact_sensitive_json(&payload);

        assert_eq!(redacted["username"], "bob");
        assert_eq!(redacted["email"], "bob@example.com");
        assert_eq!(redacted["nonce"], "keep-me");
        assert_eq!(redacted["password"], REDACTED_PLACEHOLDER);
        assert_eq!(redacted["confirmPassword"], REDACTED_PLACEHOLDER);
        assert_eq!(redacted["profile"]["oldPassword"], REDACTED_PLACEHOLDER);
        assert_eq!(redacted["profile"]["newPassword"], REDACTED_PLACEHOLDER);
        assert_eq!(redacted["profile"]["token"], REDACTED_PLACEHOLDER);
        assert_eq!(redacted["roles"][0]["name"], "admin");
        assert_eq!(redacted["roles"][0]["secret"], REDACTED_PLACEHOLDER);
    }

    #[test]
    fn test_redact_preserves_non_object_values() {
        assert_eq!(redact_sensitive_json(&json!(null)), json!(null));
        assert_eq!(redact_sensitive_json(&json!(42)), json!(42));
        assert_eq!(redact_sensitive_json(&json!("plain")), json!("plain"));
        assert_eq!(redact_sensitive_json(&json!(true)), json!(true));
    }
}
