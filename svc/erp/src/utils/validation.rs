// 重新导出共享库的验证模块

// 自定义验证函数（保留原有实现以确保 API 兼容）
use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    static ref EMAIL_REGEX: Regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        .expect("invalid EMAIL_REGEX pattern");
    static ref PHONE_REGEX: Regex =
        Regex::new(r"^1[3-9]\d{9}$").expect("invalid PHONE_REGEX pattern");
    static ref EMPLOYEE_NUMBER_REGEX: Regex =
        Regex::new(r"^[A-Za-z0-9_]{2,20}$").expect("invalid EMPLOYEE_NUMBER_REGEX pattern");
    static ref ASSET_NUMBER_REGEX: Regex =
        Regex::new(r"^[A-Za-z0-9_-]{2,25}$").expect("invalid ASSET_NUMBER_REGEX pattern");
}

#[allow(dead_code)]
pub fn validate_email(email: &str) -> bool {
    EMAIL_REGEX.is_match(email)
}

#[allow(dead_code)]
pub fn validate_phone(phone: &str) -> bool {
    PHONE_REGEX.is_match(phone)
}

#[allow(dead_code)]
pub fn validate_employee_number(number: &str) -> bool {
    EMPLOYEE_NUMBER_REGEX.is_match(number)
}

#[allow(dead_code)]
pub fn validate_asset_number(number: &str) -> bool {
    ASSET_NUMBER_REGEX.is_match(number)
}

pub fn validate_required_field(field: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("{}不能为空", field))
    } else {
        Ok(())
    }
}

#[allow(dead_code)]
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

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // validate_email
    // -----------------------------------------------------------------------

    #[test]
    fn test_validate_email_valid_common() {
        assert!(validate_email("user@example.com"));
        assert!(validate_email("a@b.co"));
        assert!(validate_email("first.last+tag@sub-domain.example.org"));
        assert!(validate_email("123+456@x.ai"));
        assert!(validate_email("UPPER_CASE@MIXED-CASE.COM"));
    }

    #[test]
    fn test_validate_email_invalid() {
        assert!(!validate_email(""));
        assert!(!validate_email("notanemail")); // no @
        assert!(!validate_email("missing@tld")); // no tld dot part (regex {2,} after final dot requires second label; single label "tld" has no dot at all → match fails)
        assert!(!validate_email("@nodomain.com")); // empty local (regex ^[chars]+ requires ≥1 char before @)
        assert!(!validate_email("user@.com")); // empty domain label (chars+ before \. → chars+@\. means after @ must have ≥1 non-dot char)
        assert!(!validate_email("a b@example.com")); // space (regex has no " ")
        assert!(!validate_email("user@example")); // single label after @ (nothing matches final \.[a-zA-Z]{2,}$)
        assert!(!validate_email("user@example.com ")); // trailing space (^..$ anchors)
        assert!(!validate_email("x@y.c")); // TLD length 1 fails {2,}
    }

    #[test]
    fn test_validate_email_edge_singleletter() {
        // minimal TLD length allowed by regex: 2 chars -> ".co" passes
        assert!(validate_email("x@y.co"));
        // 1-char TLD should fail: "x@y.c" (regex {2,})
        assert!(!validate_email("x@y.c"));
    }

    // -----------------------------------------------------------------------
    // validate_phone (Chinese mobile: ^1[3-9]\d{9}$)
    // -----------------------------------------------------------------------

    #[test]
    fn test_validate_phone_valid_prefixes() {
        // All 2nd digits in [3..9]
        assert!(validate_phone("13012345678"));
        assert!(validate_phone("14012345678"));
        assert!(validate_phone("15012345678"));
        assert!(validate_phone("16012345678"));
        assert!(validate_phone("17012345678"));
        assert!(validate_phone("18012345678"));
        assert!(validate_phone("19012345678"));
    }

    #[test]
    fn test_validate_phone_invalid() {
        // wrong length
        assert!(!validate_phone("1301234567")); // 10 digits
        assert!(!validate_phone("130123456789")); // 12 digits
                                                  // wrong first digit
        assert!(!validate_phone("23012345678"));
        // wrong second digit (1, 2 are outside [3-9])
        assert!(!validate_phone("11012345678"));
        assert!(!validate_phone("12012345678"));
        // empty
        assert!(!validate_phone(""));
        // non-digit chars
        assert!(!validate_phone("13a12345678"));
        assert!(!validate_phone("130 12345678"));
    }

    // -----------------------------------------------------------------------
    // validate_employee_number ([A-Za-z0-9_]{2,20})
    // -----------------------------------------------------------------------

    #[test]
    fn test_validate_employee_number_valid() {
        assert!(validate_employee_number("AB")); // 2 min
        assert!(validate_employee_number("a1"));
        assert!(validate_employee_number("abc123_XYZ"));
        assert!(validate_employee_number("USER_2024_0001")); // 15 chars
        assert!(validate_employee_number("a_b_c_1_2_3_4_5_6")); // 20 chars max
    }

    #[test]
    fn test_validate_employee_number_invalid() {
        assert!(!validate_employee_number(""));
        assert!(!validate_employee_number("A")); // too short
        assert!(!validate_employee_number("a-b-c")); // hyphen not allowed
        assert!(!validate_employee_number("user@name")); // @ not allowed
        assert!(!validate_employee_number("abc def")); // space
        assert!(!validate_employee_number("abcdefghij0123456789X")); // 21 chars
        assert!(!validate_employee_number("中文")); // non-ascii
    }

    // -----------------------------------------------------------------------
    // validate_asset_number ([A-Za-z0-9_-]{2,25})
    // -----------------------------------------------------------------------

    #[test]
    fn test_validate_asset_number_valid() {
        assert!(validate_asset_number("AB")); // 2 min
        assert!(validate_asset_number("IT-2024-001")); // hyphens allowed
        assert!(validate_asset_number("ASSET_LAPTOP_007"));
        assert!(validate_asset_number("a-b-c-1-2-3-4-5-6-7-8-9-0")); // 25 max
    }

    #[test]
    fn test_validate_asset_number_invalid() {
        assert!(!validate_asset_number(""));
        assert!(!validate_asset_number("A")); // too short
        assert!(!validate_asset_number("a@b")); // @ invalid
        assert!(!validate_asset_number("AB CD")); // space
        assert!(!validate_asset_number("asset/2024")); // slash
        assert!(!validate_asset_number("aaaaaaaaaaaaaaaaaaaaaaaaaa")); // 26 chars
        assert!(!validate_asset_number("资产编号")); // non-ascii
    }

    // -----------------------------------------------------------------------
    // validate_required_field
    // -----------------------------------------------------------------------

    #[test]
    fn test_validate_required_ok() {
        assert_eq!(validate_required_field("姓名", "张三"), Ok(()));
        assert_eq!(validate_required_field("备注", "."), Ok(()));
        assert_eq!(validate_required_field("field", "   x   "), Ok(()));
    }

    #[test]
    fn test_validate_required_errors() {
        let e = validate_required_field("姓名", "").unwrap_err();
        assert!(e.contains("姓名") && e.contains("不能为空"), "err={}", e);

        // All whitespace → counted as empty
        let e = validate_required_field("名称", "   ").unwrap_err();
        assert!(e.contains("名称"), "err={}", e);

        let e = validate_required_field("备注", "\t\n").unwrap_err();
        assert!(e.contains("备注"));
    }

    // -----------------------------------------------------------------------
    // validate_string_length
    // -----------------------------------------------------------------------

    #[test]
    fn test_validate_string_length_boundaries_and_within() {
        assert_eq!(validate_string_length("名称", "ab", 2, 5), Ok(())); // exactly min
        assert_eq!(validate_string_length("名称", "abcde", 2, 5), Ok(())); // exactly max
        assert_eq!(validate_string_length("名称", "abc", 2, 5), Ok(())); // within
        assert_eq!(validate_string_length("名称", "", 0, 10), Ok(())); // min=0, empty ok
    }

    #[test]
    fn test_validate_string_length_too_short() {
        let e = validate_string_length("密码", "a", 6, 20).unwrap_err();
        assert!(
            e.contains("密码") && e.contains("少于") && e.contains("6"),
            "err={}",
            e
        );
    }

    #[test]
    fn test_validate_string_length_too_long() {
        let e = validate_string_length("标题", "abcdefghijk", 2, 10).unwrap_err();
        assert!(
            e.contains("标题") && e.contains("超过") && e.contains("10"),
            "err={}",
            e
        );
    }

    #[test]
    fn test_validate_string_length_counts_chars_not_bytes() {
        // CJK chars count 1 per codepoint (not 3-4 bytes)
        // 5 chars, min=3 max=5 → ok
        assert_eq!(validate_string_length("字段", "你好世界!", 3, 5), Ok(()));
        // 6 chars → exceed
        let e = validate_string_length("字段", "你好世界!?", 1, 5).unwrap_err();
        assert!(e.contains("超过"), "err={}", e);
    }
}
