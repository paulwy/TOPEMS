#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct BillingPlan {
    pub id: uuid::Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "license_type")]
    pub license_type: String,
    #[serde(rename = "price_cents")]
    pub price_cents: i32,
    #[serde(rename = "price_period")]
    pub price_period: String,
    #[serde(rename = "included_users")]
    pub included_users: i32,
    #[serde(rename = "included_storage_gb")]
    pub included_storage_gb: Option<i64>,
    #[serde(rename = "included_api_calls")]
    pub included_api_calls: Option<i64>,
    #[serde(rename = "included_modules")]
    pub included_modules: Option<Vec<String>>,
    #[serde(rename = "overage_users_cents")]
    pub overage_users_cents: Option<i32>,
    #[serde(rename = "overage_storage_cents")]
    pub overage_storage_cents: Option<i32>,
    #[serde(rename = "overage_api_calls_cents")]
    pub overage_api_calls_cents: Option<i32>,
    #[serde(rename = "is_active")]
    pub is_active: bool,
    #[serde(rename = "is_trial")]
    pub is_trial: bool,
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updated_at")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Subscription {
    pub id: uuid::Uuid,
    #[serde(rename = "tenant_id")]
    pub tenant_id: uuid::Uuid,
    #[serde(rename = "plan_id")]
    pub plan_id: uuid::Uuid,
    pub status: String,
    #[serde(rename = "current_period_start")]
    pub current_period_start: NaiveDate,
    #[serde(rename = "current_period_end")]
    pub current_period_end: NaiveDate,
    #[serde(rename = "is_trial")]
    pub is_trial: bool,
    #[serde(rename = "trial_ends_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial_ends_at: Option<DateTime<Utc>>,
    #[serde(rename = "cancelled_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cancelled_at: Option<DateTime<Utc>>,
    #[serde(rename = "cancel_at_period_end")]
    pub cancel_at_period_end: bool,
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updated_at")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Invoice {
    pub id: uuid::Uuid,
    #[serde(rename = "tenant_id")]
    pub tenant_id: uuid::Uuid,
    #[serde(rename = "subscription_id")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_id: Option<uuid::Uuid>,
    #[serde(rename = "invoice_number")]
    pub invoice_number: String,
    pub status: String,
    #[serde(rename = "subtotal_cents")]
    pub subtotal_cents: i32,
    #[serde(rename = "discount_cents")]
    pub discount_cents: Option<i32>,
    #[serde(rename = "tax_cents")]
    pub tax_cents: Option<i32>,
    #[serde(rename = "total_cents")]
    pub total_cents: i32,
    #[serde(rename = "period_start")]
    pub period_start: NaiveDate,
    #[serde(rename = "period_end")]
    pub period_end: NaiveDate,
    #[serde(rename = "paid_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paid_at: Option<DateTime<Utc>>,
    #[serde(rename = "payment_method")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_method: Option<String>,
    #[serde(rename = "payment_reference")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_reference: Option<String>,
    #[serde(rename = "line_items")]
    pub line_items: Option<serde_json::Value>,
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updated_at")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct UsageRecord {
    pub id: uuid::Uuid,
    #[serde(rename = "tenant_id")]
    pub tenant_id: uuid::Uuid,
    #[serde(rename = "metric_type")]
    pub metric_type: String,
    #[serde(rename = "metric_name")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metric_name: Option<String>,
    pub quantity: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    #[serde(rename = "period_start")]
    pub period_start: DateTime<Utc>,
    #[serde(rename = "period_end")]
    pub period_end: DateTime<Utc>,
    #[serde(rename = "cost_cents")]
    pub cost_cents: Option<i32>,
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateSubscriptionRequest {
    #[serde(rename = "tenant_id")]
    pub tenant_id: uuid::Uuid,
    #[serde(rename = "plan_id")]
    pub plan_id: uuid::Uuid,
    #[serde(rename = "is_trial")]
    #[serde(default)]
    pub is_trial: bool,
    #[serde(rename = "trial_days")]
    #[serde(default = "default_trial_days")]
    pub trial_days: i32,
}

fn default_trial_days() -> i32 {
    14
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CancelSubscriptionRequest {
    #[serde(rename = "cancel_at_period_end")]
    #[serde(default = "default_cancel_at_end")]
    pub cancel_at_period_end: bool,
}

fn default_cancel_at_end() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UsageSummary {
    #[serde(rename = "tenant_id")]
    pub tenant_id: uuid::Uuid,
    pub period: PeriodInfo,
    pub usage: UsageMetrics,
    pub costs: CostBreakdown,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PeriodInfo {
    #[serde(rename = "start_date")]
    pub start_date: NaiveDate,
    #[serde(rename = "end_date")]
    pub end_date: NaiveDate,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UsageMetrics {
    pub users: MetricUsage,
    pub storage: MetricUsage,
    #[serde(rename = "api_calls")]
    pub api_calls: MetricUsage,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MetricUsage {
    pub current: i64,
    pub quota: i64,
    pub percent_used: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CostBreakdown {
    #[serde(rename = "base_cost_cents")]
    pub base_cost_cents: i32,
    #[serde(rename = "overage_cost_cents")]
    pub overage_cost_cents: i32,
    #[serde(rename = "plugin_cost_cents")]
    pub plugin_cost_cents: i32,
    #[serde(rename = "total_cost_cents")]
    pub total_cost_cents: i32,
}

// =============================================================================
// Pure functions（无 DB / 无 async / 无外部依赖，仅做计算与判定）
// =============================================================================

/// 计算已用百分比（与 handlers::get_usage_summary 中的逻辑等价）。
/// quota ≤ 0 时返回 0.0；负 current 视为 0。
pub fn calculate_percent_used(current: i64, quota: i64) -> f64 {
    if quota <= 0 {
        return 0.0;
    }
    let c = if current < 0 { 0 } else { current };
    c as f64 / quota as f64 * 100.0
}

/// 把以“分”为单位的整数金额转换为以“元”为单位的浮点数。
pub fn cents_to_dollars(cents: i32) -> f64 {
    cents as f64 / 100.0
}

/// 把以“元”为单位的浮点数转换为以“分”为单位的整数（四舍五入）。
pub fn dollars_to_cents(dollars: f64) -> i32 {
    (dollars * 100.0).round() as i32
}

/// 判定订阅状态是否视为“活跃”（active 或 trial）。
pub fn is_subscription_active(status: &str) -> bool {
    matches!(status, "active" | "trial")
}

/// 判定 trial 是否已过期。None 视为未设置（未过期）；now 大于 trial_ends_at 即过期。
pub fn is_trial_expired(trial_ends_at_secs: Option<i64>, now_secs: i64) -> bool {
    match trial_ends_at_secs {
        Some(ends) => now_secs > ends,
        None => false,
    }
}

/// 校验 metric_type 是否为系统支持的类型，返回其展示名。
/// 支持：users / storage / api_calls。其他返回 None。
pub fn parse_metric_type(metric_type: &str) -> Option<&'static str> {
    match metric_type {
        "users" => Some("Active Users"),
        "storage" => Some("Storage in MB"),
        "api_calls" => Some("API Calls"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- calculate_percent_used ----

    #[test]
    fn percent_used_zero_current() {
        assert_eq!(calculate_percent_used(0, 100), 0.0);
    }

    #[test]
    fn percent_used_half() {
        assert_eq!(calculate_percent_used(50, 100), 50.0);
    }

    #[test]
    fn percent_used_full() {
        assert_eq!(calculate_percent_used(100, 100), 100.0);
    }

    #[test]
    fn percent_used_over_quota() {
        assert_eq!(calculate_percent_used(150, 100), 150.0);
    }

    #[test]
    fn percent_used_zero_quota() {
        assert_eq!(calculate_percent_used(50, 0), 0.0);
    }

    #[test]
    fn percent_used_negative_quota() {
        assert_eq!(calculate_percent_used(50, -10), 0.0);
    }

    #[test]
    fn percent_used_negative_current_treated_as_zero() {
        assert_eq!(calculate_percent_used(-5, 100), 0.0);
    }

    // ---- cents_to_dollars ----

    #[test]
    fn cents_to_dollars_zero() {
        assert_eq!(cents_to_dollars(0), 0.0);
    }

    #[test]
    fn cents_to_dollars_exact_dollar() {
        assert_eq!(cents_to_dollars(100), 1.0);
    }

    #[test]
    fn cents_to_dollars_fractional() {
        assert_eq!(cents_to_dollars(12345), 123.45);
    }

    #[test]
    fn cents_to_dollars_negative() {
        assert_eq!(cents_to_dollars(-50), -0.5);
    }

    // ---- dollars_to_cents ----

    #[test]
    fn dollars_to_cents_zero() {
        assert_eq!(dollars_to_cents(0.0), 0);
    }

    #[test]
    fn dollars_to_cents_whole_dollar() {
        assert_eq!(dollars_to_cents(10.0), 1000);
    }

    #[test]
    fn dollars_to_cents_rounds_third_decimal_up() {
        // 1.236 → 123.6 → round → 124（避免 1.005 的浮点表示误差）
        assert_eq!(dollars_to_cents(1.236), 124);
    }

    #[test]
    fn dollars_to_cents_truncates_third_decimal() {
        assert_eq!(dollars_to_cents(1.234), 123);
    }

    #[test]
    fn dollars_to_cents_negative() {
        assert_eq!(dollars_to_cents(-2.5), -250);
    }

    // ---- is_subscription_active ----

    #[test]
    fn subscription_active_status() {
        assert!(is_subscription_active("active"));
    }

    #[test]
    fn subscription_trial_status() {
        assert!(is_subscription_active("trial"));
    }

    #[test]
    fn subscription_cancelled_status() {
        assert!(!is_subscription_active("cancelled"));
    }

    #[test]
    fn subscription_unknown_status() {
        assert!(!is_subscription_active("expired"));
    }

    #[test]
    fn subscription_empty_status() {
        assert!(!is_subscription_active(""));
    }

    #[test]
    fn subscription_case_sensitive() {
        assert!(!is_subscription_active("ACTIVE"));
    }

    // ---- is_trial_expired ----

    #[test]
    fn trial_expired_after_end() {
        assert!(is_trial_expired(Some(1_000), 2_000));
    }

    #[test]
    fn trial_not_expired_before_end() {
        assert!(!is_trial_expired(Some(2_000), 1_000));
    }

    #[test]
    fn trial_at_exact_end_not_expired() {
        assert!(!is_trial_expired(Some(2_000), 2_000));
    }

    #[test]
    fn trial_none_never_expired() {
        assert!(!is_trial_expired(None, 9_999_999));
    }

    #[test]
    fn trial_zero_end_any_positive_now_expired() {
        assert!(is_trial_expired(Some(0), 1));
    }

    // ---- parse_metric_type ----

    #[test]
    fn metric_users() {
        assert_eq!(parse_metric_type("users"), Some("Active Users"));
    }

    #[test]
    fn metric_storage() {
        assert_eq!(parse_metric_type("storage"), Some("Storage in MB"));
    }

    #[test]
    fn metric_api_calls() {
        assert_eq!(parse_metric_type("api_calls"), Some("API Calls"));
    }

    #[test]
    fn metric_unknown_returns_none() {
        assert_eq!(parse_metric_type("bandwidth"), None);
    }

    #[test]
    fn metric_empty_returns_none() {
        assert_eq!(parse_metric_type(""), None);
    }

    #[test]
    fn metric_case_sensitive() {
        assert_eq!(parse_metric_type("Users"), None);
    }
}
