use regex::Regex;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationError>,
}

impl ValidationResult {
    pub fn ok() -> Self {
        Self {
            valid: true,
            errors: Vec::new(),
        }
    }

    pub fn error(field: &str, message: &str) -> Self {
        Self {
            valid: false,
            errors: vec![ValidationError {
                field: field.to_string(),
                message: message.to_string(),
            }],
        }
    }

    pub fn merge(mut self, other: Self) -> Self {
        if !other.valid {
            self.valid = false;
            self.errors.extend(other.errors);
        }
        self
    }

    pub fn is_valid(&self) -> bool {
        self.valid
    }

    pub fn get_errors(&self) -> &[ValidationError] {
        &self.errors
    }

    pub fn to_error_response(&self) -> HashMap<String, Vec<String>> {
        let mut result = HashMap::new();
        for error in &self.errors {
            result
                .entry(error.field.clone())
                .or_insert_with(Vec::new)
                .push(error.message.clone());
        }
        result
    }
}

pub struct Validator;

impl Validator {
    pub fn not_empty(value: &Option<String>, field: &str) -> ValidationResult {
        if value.as_ref().map(|s| s.trim().is_empty()).unwrap_or(true) {
            ValidationResult::error(field, "不能为空")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn not_empty_str(value: &str, field: &str) -> ValidationResult {
        if value.trim().is_empty() {
            ValidationResult::error(field, "不能为空")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn min_length(value: &str, min: usize, field: &str) -> ValidationResult {
        if value.len() < min {
            ValidationResult::error(field, &format!("最少{}个字符", min))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn max_length(value: &str, max: usize, field: &str) -> ValidationResult {
        if value.len() > max {
            ValidationResult::error(field, &format!("最多{}个字符", max))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn length_between(value: &str, min: usize, max: usize, field: &str) -> ValidationResult {
        if value.len() < min {
            ValidationResult::error(field, &format!("最少{}个字符", min))
        } else if value.len() > max {
            ValidationResult::error(field, &format!("最多{}个字符", max))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn email(value: &str, field: &str) -> ValidationResult {
        let re =
            Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").expect("Invalid regex");

        if !re.is_match(value) {
            ValidationResult::error(field, "无效的邮箱格式")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn url(value: &str, field: &str) -> ValidationResult {
        if url::Url::parse(value).is_err() {
            ValidationResult::error(field, "无效的URL格式")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn uuid(value: &str, field: &str) -> ValidationResult {
        if uuid::Uuid::parse_str(value).is_err() {
            ValidationResult::error(field, "无效的UUID格式")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn min(value: i64, min: i64, field: &str) -> ValidationResult {
        if value < min {
            ValidationResult::error(field, &format!("不能小于{}", min))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn max(value: i64, max: i64, field: &str) -> ValidationResult {
        if value > max {
            ValidationResult::error(field, &format!("不能大于{}", max))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn range(value: i64, min: i64, max: i64, field: &str) -> ValidationResult {
        if value < min || value > max {
            ValidationResult::error(field, &format!("必须在{}到{}之间", min, max))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn min_u64(value: u64, min: u64, field: &str) -> ValidationResult {
        if value < min {
            ValidationResult::error(field, &format!("不能小于{}", min))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn max_u64(value: u64, max: u64, field: &str) -> ValidationResult {
        if value > max {
            ValidationResult::error(field, &format!("不能大于{}", max))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn range_u64(value: u64, min: u64, max: u64, field: &str) -> ValidationResult {
        if value < min || value > max {
            ValidationResult::error(field, &format!("必须在{}到{}之间", min, max))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn in_list<T: PartialEq + std::fmt::Display>(
        value: &T,
        list: &[T],
        field: &str,
    ) -> ValidationResult {
        if !list.contains(value) {
            let values: Vec<String> = list.iter().map(|v| v.to_string()).collect();
            ValidationResult::error(field, &format!("必须是以下值之一: {}", values.join(", ")))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn in_list_str(value: &str, list: &[&str], field: &str) -> ValidationResult {
        if !list.contains(&value) {
            ValidationResult::error(field, &format!("必须是以下值之一: {}", list.join(", ")))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn custom<F>(check: F, field: &str, message: &str) -> ValidationResult
    where
        F: Fn() -> bool,
    {
        if !check() {
            ValidationResult::error(field, message)
        } else {
            ValidationResult::ok()
        }
    }

    pub fn custom_async<F>(check: F, field: &str, message: &str) -> ValidationResult
    where
        F: Fn() -> bool,
    {
        if !check() {
            ValidationResult::error(field, message)
        } else {
            ValidationResult::ok()
        }
    }

    pub fn matches_regex(
        value: &str,
        pattern: &str,
        field: &str,
        message: &str,
    ) -> ValidationResult {
        let re = match Regex::new(pattern) {
            Ok(r) => r,
            Err(_) => return ValidationResult::error(field, "无效的验证规则"),
        };

        if !re.is_match(value) {
            ValidationResult::error(field, message)
        } else {
            ValidationResult::ok()
        }
    }

    pub fn password_strength(value: &str, field: &str) -> ValidationResult {
        let mut result = ValidationResult::ok();

        if value.len() < 8 {
            result = result.merge(ValidationResult::error(field, "密码至少需要8个字符"));
        }

        if !value.chars().any(|c| c.is_uppercase()) {
            result = result.merge(ValidationResult::error(
                field,
                "密码需要包含至少一个大写字母",
            ));
        }

        if !value.chars().any(|c| c.is_lowercase()) {
            result = result.merge(ValidationResult::error(
                field,
                "密码需要包含至少一个小写字母",
            ));
        }

        if !value.chars().any(|c| c.is_ascii_digit()) {
            result = result.merge(ValidationResult::error(field, "密码需要包含至少一个数字"));
        }

        result
    }

    pub fn phone_number(value: &str, field: &str) -> ValidationResult {
        let re = Regex::new(r"^1[3-9]\d{9}$").expect("Invalid regex");

        if !re.is_match(value) {
            ValidationResult::error(field, "无效的手机号码格式")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn id_card(value: &str, field: &str) -> ValidationResult {
        let re = Regex::new(r"^\d{17}[\dXx]$").expect("Invalid regex");

        if !re.is_match(value) {
            ValidationResult::error(field, "无效的身份证号码格式")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn is_numeric(value: &str, field: &str) -> ValidationResult {
        if value.parse::<f64>().is_err() {
            ValidationResult::error(field, "必须是数字")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn is_integer(value: &str, field: &str) -> ValidationResult {
        if value.parse::<i64>().is_err() {
            ValidationResult::error(field, "必须是整数")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn is_boolean(value: &str, field: &str) -> ValidationResult {
        let lower = value.to_lowercase();
        if lower != "true" && lower != "false" && lower != "1" && lower != "0" {
            ValidationResult::error(field, "必须是布尔值")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn equals(value: &str, expected: &str, field: &str) -> ValidationResult {
        if value != expected {
            ValidationResult::error(field, "值不匹配")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn not_equals(value: &str, not_expected: &str, field: &str) -> ValidationResult {
        if value == not_expected {
            ValidationResult::error(field, "值不能是这个")
        } else {
            ValidationResult::ok()
        }
    }

    pub fn contains(value: &str, substring: &str, field: &str) -> ValidationResult {
        if !value.contains(substring) {
            ValidationResult::error(field, &format!("必须包含'{}'", substring))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn starts_with(value: &str, prefix: &str, field: &str) -> ValidationResult {
        if !value.starts_with(prefix) {
            ValidationResult::error(field, &format!("必须以'{}'开头", prefix))
        } else {
            ValidationResult::ok()
        }
    }

    pub fn ends_with(value: &str, suffix: &str, field: &str) -> ValidationResult {
        if !value.ends_with(suffix) {
            ValidationResult::error(field, &format!("必须以'{}'结尾", suffix))
        } else {
            ValidationResult::ok()
        }
    }
}

/// 归一化业务编号：去首尾空白、转大写、移除内部空白字符。
///
/// 供各服务的 `normalize_*_code` 函数复用，消除重复模板代码。
pub fn normalize_code(code: &str) -> String {
    code.trim().to_uppercase().replace([' ', '\t', '\n'], "")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_not_empty() {
        let result = Validator::not_empty(&Some("hello".to_string()), "name");
        assert!(result.is_valid());

        let result = Validator::not_empty(&Some("".to_string()), "name");
        assert!(!result.is_valid());

        let result = Validator::not_empty(&None, "name");
        assert!(!result.is_valid());
    }

    #[test]
    fn test_email() {
        let result = Validator::email("test@example.com", "email");
        assert!(result.is_valid());

        let result = Validator::email("invalid", "email");
        assert!(!result.is_valid());
    }

    #[test]
    fn test_password_strength() {
        let result = Validator::password_strength("Pass1234", "password");
        assert!(result.is_valid());

        let result = Validator::password_strength("weak", "password");
        assert!(!result.is_valid());
    }

    #[test]
    fn test_phone_number() {
        let result = Validator::phone_number("13812345678", "phone");
        assert!(result.is_valid());

        let result = Validator::phone_number("1234567890", "phone");
        assert!(!result.is_valid());
    }

    #[test]
    fn test_merge() {
        let result1 = ValidationResult::error("field1", "error1");
        let result2 = ValidationResult::error("field2", "error2");
        let merged = result1.merge(result2);

        assert!(!merged.is_valid());
        assert_eq!(merged.errors.len(), 2);
    }

    // ===== 新增：更多 Validator 方法测试 =====
    #[test]
    fn test_not_empty_str() {
        assert!(Validator::not_empty_str("hello", "f").is_valid());
        assert!(!Validator::not_empty_str("", "f").is_valid());
        assert!(!Validator::not_empty_str("   ", "f").is_valid());
    }

    #[test]
    fn test_min_max_length() {
        assert!(Validator::min_length("abc", 2, "f").is_valid());
        assert!(!Validator::min_length("a", 3, "f").is_valid());
        assert!(Validator::max_length("abc", 5, "f").is_valid());
        assert!(!Validator::max_length("abcdef", 3, "f").is_valid());
    }

    #[test]
    fn test_length_between() {
        assert!(Validator::length_between("abc", 2, 5, "f").is_valid());
        assert!(!Validator::length_between("a", 2, 5, "f").is_valid());
        assert!(!Validator::length_between("abcdef", 2, 5, "f").is_valid());
    }

    #[test]
    fn test_url_validator() {
        assert!(Validator::url("https://example.com", "f").is_valid());
        assert!(Validator::url("http://localhost:8080/path", "f").is_valid());
        assert!(!Validator::url("not-a-url", "f").is_valid());
    }

    #[test]
    fn test_uuid_validator() {
        assert!(Validator::uuid("550e8400-e29b-41d4-a716-446655440000", "f").is_valid());
        assert!(!Validator::uuid("not-a-uuid", "f").is_valid());
    }

    #[test]
    fn test_min_max_range_i64() {
        assert!(Validator::min(5, 1, "f").is_valid());
        assert!(!Validator::min(0, 1, "f").is_valid());
        assert!(Validator::max(5, 10, "f").is_valid());
        assert!(!Validator::max(15, 10, "f").is_valid());
        assert!(Validator::range(5, 1, 10, "f").is_valid());
        assert!(!Validator::range(0, 1, 10, "f").is_valid());
        assert!(!Validator::range(11, 1, 10, "f").is_valid());
    }

    #[test]
    fn test_min_max_range_u64() {
        assert!(Validator::min_u64(5, 1, "f").is_valid());
        assert!(!Validator::min_u64(0, 1, "f").is_valid());
        assert!(Validator::max_u64(5, 10, "f").is_valid());
        assert!(!Validator::max_u64(15, 10, "f").is_valid());
        assert!(Validator::range_u64(5, 1, 10, "f").is_valid());
    }

    #[test]
    fn test_in_list_and_in_list_str() {
        assert!(Validator::in_list_str("a", &["a", "b", "c"], "f").is_valid());
        assert!(!Validator::in_list_str("d", &["a", "b", "c"], "f").is_valid());
    }

    #[test]
    fn test_custom_validator() {
        assert!(Validator::custom(|| true, "f", "err").is_valid());
        let r = Validator::custom(|| false, "f", "custom error");
        assert!(!r.is_valid());
        assert_eq!(r.errors[0].message, "custom error");
    }

    #[test]
    fn test_matches_regex() {
        assert!(Validator::matches_regex("abc123", r"^[a-z]+\d+$", "f", "err").is_valid());
        assert!(!Validator::matches_regex("ABC", r"^[a-z]+$", "f", "err").is_valid());
        // 无效正则
        let r = Validator::matches_regex("x", r"[invalid(", "f", "err");
        assert!(!r.is_valid());
    }

    #[test]
    fn test_id_card_validator() {
        // 18 位数字 + 校验位 X
        assert!(Validator::id_card("110101199003078888", "f").is_valid());
        assert!(Validator::id_card("11010119900307888X", "f").is_valid());
        assert!(!Validator::id_card("12345", "f").is_valid());
        assert!(!Validator::id_card("abcdefghijklmnopqr", "f").is_valid());
    }

    #[test]
    fn test_is_numeric_integer_boolean() {
        assert!(Validator::is_numeric("123.45", "f").is_valid());
        assert!(!Validator::is_numeric("abc", "f").is_valid());
        assert!(Validator::is_integer("42", "f").is_valid());
        assert!(!Validator::is_integer("42.5", "f").is_valid());
        assert!(Validator::is_boolean("true", "f").is_valid());
        assert!(Validator::is_boolean("false", "f").is_valid());
        assert!(Validator::is_boolean("1", "f").is_valid());
        assert!(Validator::is_boolean("0", "f").is_valid());
        assert!(!Validator::is_boolean("yes", "f").is_valid());
    }

    #[test]
    fn test_equals_not_equals_contains_starts_ends() {
        assert!(Validator::equals("abc", "abc", "f").is_valid());
        assert!(!Validator::equals("abc", "abd", "f").is_valid());
        assert!(Validator::not_equals("abc", "xyz", "f").is_valid());
        assert!(!Validator::not_equals("abc", "abc", "f").is_valid());
        assert!(Validator::contains("hello world", "world", "f").is_valid());
        assert!(!Validator::contains("hello", "xyz", "f").is_valid());
        assert!(Validator::starts_with("hello", "he", "f").is_valid());
        assert!(!Validator::starts_with("hello", "she", "f").is_valid());
        assert!(Validator::ends_with("hello", "lo", "f").is_valid());
        assert!(!Validator::ends_with("hello", "la", "f").is_valid());
    }

    #[test]
    fn test_validation_result_to_error_response() {
        let r = ValidationResult::error("email", "无效邮箱")
            .merge(ValidationResult::error("email", "不能为空"));
        let resp = r.to_error_response();
        assert!(resp.contains_key("email"));
        assert_eq!(resp.get("email").unwrap().len(), 2);
    }

    #[test]
    fn test_validation_result_ok_is_valid() {
        let r = ValidationResult::ok();
        assert!(r.is_valid());
        assert!(r.get_errors().is_empty());
    }

    #[test]
    fn test_merge_ok_with_error_keeps_error() {
        let ok = ValidationResult::ok();
        let err = ValidationResult::error("f", "e");
        let merged = ok.merge(err);
        assert!(!merged.is_valid());
        assert_eq!(merged.errors.len(), 1);
    }

    #[test]
    fn test_password_strength_multiple_errors() {
        let r = Validator::password_strength("short", "pwd");
        assert!(!r.is_valid());
        // 短 + 无大写 + 无小写（但 short 全是小写） + 无数字 = 至少 3 个错误
        assert!(r.errors.len() >= 3);
    }
}
