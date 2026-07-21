//! Quality Management handlers
//!
//! 质量管理模块：质量检验、巡检、质量标准

use axum::{
    routing::{get, put},
    Router,
};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use sqlx::types::BigDecimal;

use crate::AppState;

mod inspection;
mod patrol;
mod standard;

pub use inspection::*;
pub use patrol::*;
pub use standard::*;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        // Quality Inspections
        .route(
            "/quality/inspections",
            get(list_inspections).post(create_inspection),
        )
        .route(
            "/quality/inspections/{id}",
            get(get_inspection)
                .put(update_inspection)
                .delete(delete_inspection),
        )
        // Quality Patrols
        .route("/quality/patrols", get(list_patrols).post(create_patrol))
        .route(
            "/quality/patrols/{id}",
            get(get_patrol).put(update_patrol).delete(delete_patrol),
        )
        // Patrol Items
        .route(
            "/quality/patrols/{patrol_id}/items",
            get(list_patrol_items).post(add_patrol_item),
        )
        .route(
            "/quality/patrol-items/{id}",
            put(update_patrol_item).delete(delete_patrol_item),
        )
        // Quality Standards
        .route(
            "/quality/standards",
            get(list_standards).post(create_standard),
        )
        .route(
            "/quality/standards/{id}",
            get(get_standard)
                .put(update_standard)
                .delete(delete_standard),
        )
}

// ==================== Helper Functions ====================

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    match dt {
        Some(d) => Utc.from_utc_datetime(&d),
        None => Utc::now(),
    }
}

fn datetime_to_string(dt: Option<NaiveDateTime>) -> String {
    naive_to_utc(dt).to_rfc3339()
}

fn opt_big_decimal_to_f64(bd: Option<BigDecimal>) -> Option<f64> {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

fn big_decimal_to_f64_non_opt(bd: BigDecimal) -> f64 {
    bd.to_string().parse::<f64>().unwrap_or(0.0)
}

fn parse_opt_datetime(s: Option<String>) -> Option<NaiveDateTime> {
    s.and_then(|s| NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S").ok())
}

fn parse_opt_date(s: Option<String>) -> Option<NaiveDateTime> {
    s.and_then(|s| NaiveDateTime::parse_from_str(&s, "%Y-%m-%d").ok())
}
