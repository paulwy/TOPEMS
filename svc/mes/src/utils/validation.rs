// 重新导出共享库的验证模块
pub use topems_shared::validation::{Validator, ValidationError, ValidationResult};

// 自定义验证函数（保留原有实现以确保 API 兼容）
use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    static ref EMAIL_REGEX: Regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    static ref PHONE_REGEX: Regex = Regex::new(r"^1[3-9]\d{9}$").unwrap();
}

pub fn validate_email(email: &str) -> bool {
    EMAIL_REGEX.is_match(email)
}

pub fn validate_phone(phone: &str) -> bool {
    PHONE_REGEX.is_match(phone)
}

pub fn validate_required_field(field: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("{}不能为空", field))
    } else {
        Ok(())
    }
}

pub fn validate_string_length(field: &str, value: &str, min: usize, max: usize) -> Result<(), String> {
    let len = value.chars().count();
    if len < min {
        Err(format!("{}长度不能少于{}个字符", field, min))
    } else if len > max {
        Err(format!("{}长度不能超过{}个字符", field, max))
    } else {
        Ok(())
    }
}
