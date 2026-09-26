use sqlx::types::BigDecimal;

/// 将 Option<BigDecimal> 转换为 f64，None 或转换失败时返回 0.0
pub fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|b| b.to_string().parse::<f64>().ok()).unwrap_or(0.0)
}

/// 将 Option<BigDecimal> 转换为 Option<f64>，None 或转换失败时返回 None
pub fn big_decimal_to_f64_opt(bd: Option<BigDecimal>) -> Option<f64> {
    bd.and_then(|b| b.to_string().parse::<f64>().ok())
}

/// 将 BigDecimal 转换为 f64，转换失败时返回 0.0
pub fn big_decimal_to_f64_non_opt(bd: BigDecimal) -> f64 {
    bd.to_string().parse::<f64>().unwrap_or(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::types::BigDecimal;
    use std::str::FromStr;

    #[test]
    fn test_big_decimal_to_f64_some() {
        let bd = BigDecimal::from_str("123.45").unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 123.45);
    }

    #[test]
    fn test_big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }

    #[test]
    fn test_big_decimal_to_f64_negative() {
        let bd = BigDecimal::from_str("-123.45").unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), -123.45);
    }

    #[test]
    fn test_big_decimal_to_f64_opt_some() {
        let bd = BigDecimal::from_str("123.45").unwrap();
        assert_eq!(big_decimal_to_f64_opt(Some(bd)), Some(123.45));
    }

    #[test]
    fn test_big_decimal_to_f64_opt_none() {
        assert_eq!(big_decimal_to_f64_opt(None), None);
    }

    #[test]
    fn test_big_decimal_to_f64_non_opt() {
        let bd = BigDecimal::from_str("123.45").unwrap();
        assert_eq!(big_decimal_to_f64_non_opt(bd), 123.45);
    }
}
