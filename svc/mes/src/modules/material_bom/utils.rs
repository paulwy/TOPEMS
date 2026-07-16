use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use sqlx::types::BigDecimal;

pub(crate) fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d))
        .unwrap_or_else(Utc::now)
}

pub(crate) fn opt_naive_to_utc(dt: Option<NaiveDateTime>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d))
}

pub(crate) fn datetime_to_string(dt: Option<NaiveDateTime>) -> String {
    naive_to_utc(dt).to_rfc3339()
}

pub(crate) fn opt_datetime_to_string(dt: Option<NaiveDateTime>) -> Option<String> {
    opt_naive_to_utc(dt).map(|d| d.to_rfc3339())
}

pub(crate) fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}
