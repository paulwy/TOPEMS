use chrono::{DateTime, Datelike, TimeZone, Timelike, Utc};

pub(crate) fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
}

pub(crate) fn opt_naive_to_utc(dt: Option<DateTime<Utc>>) -> Option<DateTime<Utc>> {
    dt
}

pub(crate) fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    dt.map(|d| d.to_rfc3339()).unwrap_or_default()
}

pub(crate) fn opt_datetime_to_string(dt: Option<DateTime<Utc>>) -> Option<String> {
    dt.map(|d| d.to_rfc3339())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::types::BigDecimal;
    use topems_shared_db::decimal::big_decimal_to_f64;

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 7, 1, 9, 45, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.date_naive(), dt.date_naive());
        assert_eq!(utc.time(), dt.time());
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    #[test]
    fn opt_naive_to_utc_some() {
        let dt = Utc.with_ymd_and_hms(2024, 2, 28, 23, 59, 59).unwrap();
        let r = opt_naive_to_utc(Some(dt)).unwrap();
        assert_eq!(r.year(), 2024);
        assert_eq!(r.month(), 2);
        assert_eq!(r.day(), 28);
        assert_eq!(r.hour(), 23);
        assert_eq!(r.second(), 59);
    }

    #[test]
    fn opt_naive_to_utc_none() {
        assert!(opt_naive_to_utc(None).is_none());
    }

    #[test]
    fn datetime_to_string_some_rfc3339() {
        let dt = Utc.with_ymd_and_hms(2024, 3, 1, 0, 0, 0).unwrap();
        let s = datetime_to_string(Some(dt));
        assert!(s.starts_with("2024-03-01T00:00:00"), "got {}", s);
    }

    #[test]
    fn datetime_to_string_none_valid() {
        let s = datetime_to_string(None);
        assert!(s.is_empty());
    }

    #[test]
    fn opt_datetime_to_string_some() {
        let dt = Utc.with_ymd_and_hms(2024, 6, 15, 12, 0, 0).unwrap();
        let r = opt_datetime_to_string(Some(dt));
        assert!(r.is_some());
        assert!(r.unwrap().starts_with("2024-06-15T12:00:00"));
    }

    #[test]
    fn opt_datetime_to_string_none() {
        assert!(opt_datetime_to_string(None).is_none());
    }

    #[test]
    fn big_decimal_to_f64_some() {
        let bd: BigDecimal = "1.25".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1.25);
    }

    #[test]
    fn big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }

    #[test]
    fn big_decimal_to_f64_negative() {
        let bd: BigDecimal = "-7.5".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), -7.5);
    }

    // ---- 边界补充 ----
    #[test]
    fn bom_big_decimal_large_value() {
        let bd: BigDecimal = "1234567.89".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1234567.89);
    }

    #[test]
    fn bom_naive_to_utc_year_boundary() {
        let dt = Utc.with_ymd_and_hms(2023, 12, 31, 23, 59, 59).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.date_naive(), dt.date_naive());
    }

    #[test]
    fn bom_opt_naive_to_utc_midnight() {
        let dt = Utc.with_ymd_and_hms(2024, 1, 1, 0, 0, 0).unwrap();
        let r = opt_naive_to_utc(Some(dt)).unwrap();
        assert_eq!(r.year(), 2024);
        assert_eq!(r.hour(), 0);
    }
}
