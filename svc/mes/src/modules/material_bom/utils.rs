use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use sqlx::types::BigDecimal;

pub(crate) fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.map(|d| d)
        .unwrap_or_else(Utc::now)
}

pub(crate) fn opt_naive_to_utc(dt: Option<DateTime<Utc>>) -> Option<DateTime<Utc>> {
    dt.map(|d| d)
}

pub(crate) fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    naive_to_utc(dt).to_rfc3339()
}

pub(crate) fn opt_datetime_to_string(dt: Option<NaiveDateTime>) -> Option<String> {
    dt.map(|d| Utc.from_utc_datetime(&d).to_rfc3339())
}

pub(crate) fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Datelike, NaiveDate, Timelike};

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = NaiveDate::from_ymd_opt(2024, 7, 1)
            .unwrap()
            .and_hms_opt(9, 45, 0)
            .unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.naive_utc().date(), dt.date());
        assert_eq!(utc.naive_utc().time(), dt.time());
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
        let dt = NaiveDate::from_ymd_opt(2024, 2, 28)
            .unwrap()
            .and_hms_opt(23, 59, 59)
            .unwrap();
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
        let dt = NaiveDate::from_ymd_opt(2024, 3, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        let s = datetime_to_string(Some(dt));
        assert!(s.starts_with("2024-03-01T00:00:00"), "got {}", s);
    }

    #[test]
    fn datetime_to_string_none_valid() {
        let s = datetime_to_string(None);
        assert!(s.contains('T'));
    }

    #[test]
    fn opt_datetime_to_string_some() {
        let dt = NaiveDate::from_ymd_opt(2024, 6, 15)
            .unwrap()
            .and_hms_opt(12, 0, 0)
            .unwrap();
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
        let dt = NaiveDate::from_ymd_opt(2023, 12, 31)
            .unwrap()
            .and_hms_opt(23, 59, 59)
            .unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.naive_utc().date(), dt.date());
    }

    #[test]
    fn bom_opt_naive_to_utc_midnight() {
        let dt = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        let r = opt_naive_to_utc(Some(dt)).unwrap();
        assert_eq!(r.year(), 2024);
        assert_eq!(r.hour(), 0);
    }
}
