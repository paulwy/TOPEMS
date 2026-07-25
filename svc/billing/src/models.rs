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
