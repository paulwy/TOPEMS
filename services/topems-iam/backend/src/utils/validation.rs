use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    static ref EMAIL_REGEX: Regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    static ref USERNAME_REGEX: Regex = Regex::new(r"^[^\s\p{C}]{2,50}$").unwrap();
}

fn validate_email(email: &str) -> Result<(), String> {
    if !EMAIL_REGEX.is_match(email) {
        return Err("请输入有效的邮箱地址".to_string());
    }
    Ok(())
}

fn validate_username(username: &str) -> Result<(), String> {
    if !USERNAME_REGEX.is_match(username) {
        return Err("用户名长度应在2-50位之间，且不能包含控制字符或空格".to_string());
    }
    Ok(())
}

fn validate_password(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("密码长度至少为8位".to_string());
    }
    
    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_number = password.chars().any(|c| c.is_numeric());
    let has_special = password.chars().any(|c| !c.is_alphanumeric());
    
    if !has_uppercase || !has_lowercase || !has_number || !has_special {
        return Err("密码需要包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符".to_string());
    }
    
    Ok(())
}
