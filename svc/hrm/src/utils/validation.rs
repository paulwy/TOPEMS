// 验证模块 - 当前未使用，保留接口以备将来扩展
// TODO: 后续可整合 topems_shared::validation 模块

#[allow(dead_code)]
pub fn validate_email(email: &str) -> bool {
    email.contains('@') && email.contains('.')
}

#[allow(dead_code)]
pub fn validate_phone(phone: &str) -> bool {
    phone.len() == 11 && phone.chars().all(|c| c.is_ascii_digit())
}

#[allow(dead_code)]
pub fn validate_employee_number(number: &str) -> bool {
    !number.is_empty() && number.len() <= 20
}

#[allow(dead_code)]
pub fn validate_required_field(field: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("{}不能为空", field))
    } else {
        Ok(())
    }
}

#[allow(dead_code)]
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
