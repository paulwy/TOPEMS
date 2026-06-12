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
            let values: Vec<String> = list.iter().map(|v| format!("{}", v)).collect();
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
}
