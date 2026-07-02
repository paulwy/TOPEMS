// HRM 模块验证工具 - 封装 topems_shared::validation
// 提供员工相关的专用验证函数

pub use topems_shared::validation::{ValidationError, ValidationResult, Validator};

pub fn validate_email(email: &str) -> bool {
    Validator::email(email, "email").is_valid()
}

pub fn validate_phone(phone: &str) -> bool {
    if phone.len() != 11 || !phone.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }
    phone.starts_with('1')
}

pub fn validate_employee_number(number: &str) -> bool {
    !number.is_empty() && number.len() <= 20
}

pub fn validate_required_field(field: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("{}不能为空", field))
    } else {
        Ok(())
    }
}

pub fn validate_string_length(
    field: &str,
    value: &str,
    min: usize,
    max: usize,
) -> Result<(), String> {
    let len = value.chars().count();
    if len < min {
        Err(format!("{}长度不能少于{}个字符", field, min))
    } else if len > max {
        Err(format!("{}长度不能超过{}个字符", field, max))
    } else {
        Ok(())
    }
}

pub fn validate_employee_data(
    name: &str,
    email: &str,
    phone: Option<&str>,
    employee_no: &str,
) -> ValidationResult {
    let mut result = Validator::not_empty_str(name, "name");
    result = result.merge(Validator::not_empty_str(employee_no, "employee_no"));
    result = result.merge(Validator::email(email, "email"));
    result = result.merge(Validator::length_between(name, 2, 50, "name"));
    result = result.merge(Validator::length_between(employee_no, 1, 20, "employee_no"));

    if let Some(phone_num) = phone {
        if !validate_phone(phone_num) {
            result = result.merge(ValidationResult::error("phone", "无效的手机号格式"));
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_email() {
        assert!(validate_email("test@example.com"));
        assert!(!validate_email("invalid-email"));
    }

    #[test]
    fn test_validate_phone() {
        assert!(validate_phone("13800138000"));
        assert!(!validate_phone("1234567890"));
        assert!(!validate_phone("23800138000"));
    }

    #[test]
    fn test_validate_employee_data() {
        let result =
            validate_employee_data("张三", "zhang@test.com", Some("13800138000"), "EMP001");
        assert!(result.is_valid());
    }
}
