//! # 敏感字段脱敏模块
//!
//! V79 Phase 3: 提供 tracing 日志脱敏辅助函数。
//! 替代 V78 期间 34 处 `@sensitive` 标注的手动占位。

use serde::Serialize;
use std::collections::HashMap;

/// 敏感字段类型枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SensitiveField {
    Username,
    Password,
    Email,
    Token,
    TenantId,
    Secret,
    Phone,
    IdCard,
    Generic,
}

impl SensitiveField {
    /// 从字段名推断类型
    pub fn from_field_name(name: &str) -> Self {
        let lower = name.to_lowercase();
        if lower.contains("password") || lower.contains("passwd") {
            SensitiveField::Password
        } else if lower.contains("token") || lower.contains("jwt") || lower.contains("session") {
            SensitiveField::Token
        } else if lower.contains("email") || lower.contains("mail") {
            SensitiveField::Email
        } else if lower.contains("tenant") {
            SensitiveField::TenantId
        } else if lower.contains("secret") || lower.contains("api_key") || lower.contains("apikey") {
            SensitiveField::Secret
        } else if lower.contains("phone") || lower.contains("mobile") {
            SensitiveField::Phone
        } else if lower.contains("id_card") || lower.contains("idcard") {
            SensitiveField::IdCard
        } else if lower.contains("username") || lower.contains("user_name") || lower == "user" {
            SensitiveField::Username
        } else {
            SensitiveField::Generic
        }
    }
}

/// 核心脱敏函数：根据字段类型对值进行脱敏
///
/// # 示例
/// ```
/// use topems_shared_auth::security::mask_sensitive::mask_value;
///
/// assert_eq!(mask_value("admin", SensitiveField::Username), "a***n");
/// assert_eq!(mask_value("user@example.com", SensitiveField::Email), "u***@e***.com");
/// assert_eq!(mask_value("secret-jwt-token", SensitiveField::Token), "s***n");
/// assert_eq!(mask_value("mypassword", SensitiveField::Password), "***");
/// ```
pub fn mask_value(value: &str, field_type: SensitiveField) -> String {
    if value.is_empty() {
        return String::new();
    }
    match field_type {
        SensitiveField::Password | SensitiveField::Secret => "***".to_string(),
        SensitiveField::Username => mask_middle(value, 1, 1),
        SensitiveField::Email => mask_email(value),
        SensitiveField::Token => mask_middle(value, 1, 1),
        SensitiveField::TenantId => mask_middle(value, 1, 1),
        SensitiveField::Phone => mask_middle(value, 3, 2),
        SensitiveField::IdCard => mask_middle(value, 3, 2),
        SensitiveField::Generic => mask_middle(value, 1, 1),
    }
}

/// 通过字段名自动推断类型并脱敏
pub fn mask_field(field_name: &str, value: &str) -> String {
    mask_value(value, SensitiveField::from_field_name(field_name))
}

/// 保留首尾 N 个字符，中间用 *** 替代
fn mask_middle(value: &str, prefix: usize, suffix: usize) -> String {
    let chars: Vec<char> = value.chars().collect();
    let len = chars.len();
    if len <= prefix + suffix {
        return "***".to_string();
    }
    let head: String = chars[..prefix].iter().collect();
    let tail: String = chars[len - suffix..].iter().collect();
    format!("{}***{}", head, tail)
}

/// 邮箱脱敏：u***@e***.com
fn mask_email(value: &str) -> String {
    if let Some(at) = value.find('@') {
        let (local, domain) = value.split_at(at);
        let domain = &domain[1..]; // skip @
        let masked_local = if local.len() > 1 {
            format!("{}***", &local[..1])
        } else {
            "***".to_string()
        };
        let masked_domain = if let Some(dot) = domain.find('.') {
            let (d_head, d_tail) = domain.split_at(dot);
            if d_head.len() > 1 {
                format!("{}***{}", &d_head[..1], d_tail)
            } else {
                format!("{}***{}", d_head, d_tail)
            }
        } else {
            mask_middle(domain, 1, 1)
        };
        format!("{}@{}", masked_local, masked_domain)
    } else {
        mask_middle(value, 1, 1)
    }
}

/// 批量脱敏 HashMap 中的字段
pub fn mask_fields(fields: &HashMap<String, String>) -> HashMap<String, String> {
    fields
        .iter()
        .map(|(k, v)| (k.clone(), mask_field(k, v)))
        .collect()
}

/// 对可序列化对象中匹配字段名的值进行脱敏（JSON 层面）
/// 返回脱敏后的 JSON 字符串
pub fn mask_json_fields<T: Serialize>(value: &T, sensitive_keys: &[&str]) -> String {
    let json = serde_json::to_value(value).unwrap_or(serde_json::Value::Null);
    let masked = mask_json_value(&json, sensitive_keys);
    serde_json::to_string(&masked).unwrap_or_else(|_| "{}".to_string())
}

fn mask_json_value(value: &serde_json::Value, sensitive_keys: &[&str]) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut new_map = serde_json::Map::new();
            for (k, v) in map {
                if sensitive_keys.iter().any(|sk| k.eq_ignore_ascii_case(sk)) {
                    if let Some(s) = v.as_str() {
                        new_map.insert(
                            k.clone(),
                            serde_json::Value::String(mask_field(k, s)),
                        );
                    } else {
                        new_map.insert(k.clone(), serde_json::Value::String("***".to_string()));
                    }
                } else {
                    new_map.insert(k.clone(), mask_json_value(v, sensitive_keys));
                }
            }
            serde_json::Value::Object(new_map)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(
                arr.iter()
                    .map(|v| mask_json_value(v, sensitive_keys))
                    .collect(),
            )
        }
        _ => value.clone(),
    }
}

/// 便捷函数：格式化 + 脱敏
/// 用于 tracing 宏中替代直接 {} 插值
pub fn fmt_masked(field_name: &str, value: &str) -> String {
    mask_field(field_name, value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_username() {
        assert_eq!(mask_value("admin", SensitiveField::Username), "a***n");
        assert_eq!(mask_value("a", SensitiveField::Username), "***");
    }

    #[test]
    fn test_mask_password() {
        assert_eq!(mask_value("secret123", SensitiveField::Password), "***");
    }

    #[test]
    fn test_mask_email() {
        let result = mask_value("user@example.com", SensitiveField::Email);
        assert!(result.starts_with("u***@"));
        assert!(result.ends_with(".com"));
    }

    #[test]
    fn test_mask_token() {
        assert_eq!(mask_value("jwt-abc-123", SensitiveField::Token), "j***3");
    }

    #[test]
    fn test_mask_field_by_name() {
        assert_eq!(mask_field("password", "secret"), "***");
        assert_eq!(mask_field("username", "admin"), "a***n");
        assert_eq!(mask_field("tenant_id", "t-001"), "t***1");
    }

    #[test]
    fn test_from_field_name() {
        assert_eq!(SensitiveField::from_field_name("password"), SensitiveField::Password);
        assert_eq!(SensitiveField::from_field_name("access_token"), SensitiveField::Token);
        assert_eq!(SensitiveField::from_field_name("user_email"), SensitiveField::Email);
        assert_eq!(SensitiveField::from_field_name("tenant_id"), SensitiveField::TenantId);
    }
}
