use topems_erp::utils::validation::{
    validate_asset_number, validate_email, validate_employee_number, validate_phone,
    validate_required_field, validate_string_length,
};

#[test]
fn test_validate_email_valid() {
    let valid_emails = vec![
        "user@example.com",
        "user.name@example.com",
        "user+test@example.com",
        "USER@EXAMPLE.COM",
        "user123@example.co.uk",
    ];

    for email in valid_emails {
        assert!(validate_email(email), "Expected valid email: {}", email);
    }
}

#[test]
fn test_validate_email_invalid() {
    let invalid_emails = vec![
        "userexample.com",
        "@example.com",
        "user@",
        "user@.com",
        "",
        "   ",
    ];

    for email in invalid_emails {
        assert!(!validate_email(email), "Expected invalid email: {}", email);
    }
}

#[test]
fn test_validate_phone_valid() {
    let valid_phones = vec!["13812345678", "15900001111", "18612345678", "17799998888"];

    for phone in valid_phones {
        assert!(validate_phone(phone), "Expected valid phone: {}", phone);
    }
}

#[test]
fn test_validate_phone_invalid() {
    let invalid_phones = vec![
        "12812345678",
        "1381234567",
        "138123456789",
        "138 1234 5678",
        "03812345678",
        "",
        "abcdefghijk",
    ];

    for phone in invalid_phones {
        assert!(!validate_phone(phone), "Expected invalid phone: {}", phone);
    }
}

#[test]
fn test_validate_employee_number_valid() {
    let valid_numbers = vec![
        "EMP001",
        "user123",
        "ABC123",
        "emp_001",
        "A1",
        "ABCDEFGHIJKLMNOPQRST",
    ];

    for number in valid_numbers {
        assert!(
            validate_employee_number(number),
            "Expected valid employee number: {}",
            number
        );
    }
}

#[test]
fn test_validate_employee_number_invalid() {
    let invalid_numbers = vec![
        "A",
        "",
        "   ",
        "ABCDEFGHIJKLMNOPQRSTU",
        "员工001",
        "emp#001",
    ];

    for number in invalid_numbers {
        assert!(
            !validate_employee_number(number),
            "Expected invalid employee number: {}",
            number
        );
    }
}

#[test]
fn test_validate_asset_number_valid() {
    let valid_numbers = vec![
        "ASSET001",
        "AST-001",
        "EQP12345",
        "A1",
        "ASSET12345678901234567890",
    ];

    for number in valid_numbers {
        assert!(
            validate_asset_number(number),
            "Expected valid asset number: {}",
            number
        );
    }
}

#[test]
fn test_validate_asset_number_invalid() {
    let invalid_numbers = vec![
        "A",
        "",
        "   ",
        "ASSET123456789012345678901",
        "资产001",
        "asset#001",
    ];

    for number in invalid_numbers {
        assert!(
            !validate_asset_number(number),
            "Expected invalid asset number: {}",
            number
        );
    }
}

#[test]
fn test_validate_required_field_valid() {
    let result = validate_required_field("名称", "测试名称");
    assert!(result.is_ok());

    let result = validate_required_field("名称", "  测试名称  ");
    assert!(result.is_ok());
}

#[test]
fn test_validate_required_field_invalid() {
    let result = validate_required_field("名称", "");
    assert!(result.is_err());
    assert_eq!(result.err().unwrap(), "名称不能为空");

    let result = validate_required_field("名称", "   ");
    assert!(result.is_err());
    assert_eq!(result.err().unwrap(), "名称不能为空");
}

#[test]
fn test_validate_string_length_valid() {
    let result = validate_string_length("名称", "测试", 2, 10);
    assert!(result.is_ok());

    let result = validate_string_length("名称", "a", 1, 1);
    assert!(result.is_ok());

    let result = validate_string_length("描述", "测试描述内容", 1, 100);
    assert!(result.is_ok());
}

#[test]
fn test_validate_string_length_invalid_too_short() {
    let result = validate_string_length("名称", "a", 2, 10);
    assert!(result.is_err());
    assert_eq!(result.err().unwrap(), "名称长度不能少于2个字符");
}

#[test]
fn test_validate_string_length_invalid_too_long() {
    let result = validate_string_length("名称", "这是一个非常长的名称超过了十个字符", 2, 10);
    assert!(result.is_err());
    assert_eq!(result.err().unwrap(), "名称长度不能超过10个字符");
}

#[test]
fn test_validate_string_length_edge_cases() {
    let result = validate_string_length("名称", "", 0, 10);
    assert!(result.is_ok());

    let result = validate_string_length("名称", "", 1, 10);
    assert!(result.is_err());

    let result = validate_string_length("名称", "测试", 0, 0);
    assert!(result.is_err());
}

#[test]
fn test_validate_string_length_unicode() {
    let result = validate_string_length("名称", "测试名称", 2, 10);
    assert!(result.is_ok());

    let result = validate_string_length("名称", "测试名称测试名称测试名称测试名称", 2, 10);
    assert!(result.is_err());
}
