//! Quality Management handlers
//!
//! 质量管理模块：质量检验、巡检、质量标准

use axum::{
    routing::{get, post, put},
    Router,
};
use chrono::{DateTime, NaiveDateTime, Utc};
use sqlx::types::BigDecimal;

use crate::AppState;
use crate::shared::utils::big_decimal_to_f64;


pub mod inspection;
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
        // APV-3: 质量让步审批端点
        .route(
            "/quality/inspections/{id}/approval/start",
            post(start_concession_approval),
        )
        .route(
            "/quality/inspections/{id}/approval/approve",
            post(approve_concession),
        )
        .route(
            "/quality/inspections/{id}/approval/reject",
            post(reject_concession),
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

pub fn naive_to_utc<T: Into<Option<DateTime<Utc>>>>(dt: T) -> DateTime<Utc> {
    match dt.into() {
        Some(d) => d,
        None => Utc::now(),
    }
}

pub fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    dt.map(|d| d.to_rfc3339()).unwrap_or_default()
}



#[allow(dead_code)]
fn parse_opt_datetime(s: Option<String>) -> Option<DateTime<Utc>> {
    s.and_then(|s| {
        NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S")
            .map(|dt| dt.and_utc())
            .ok()
    })
}

#[allow(dead_code)]
fn parse_opt_date(s: Option<String>) -> Option<DateTime<Utc>> {
    s.and_then(|s| {
        NaiveDateTime::parse_from_str(&s, "%Y-%m-%d")
            .map(|dt| dt.and_utc())
            .ok()
    })
}
