//! Tenant data models

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Tenant type: independent database or shared database
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TenantType {
    Independent, // One database per tenant
    Shared,      // Row-level isolation via tenant_id
}

impl Default for TenantType {
    fn default() -> Self {
        Self::Shared
    }
}

/// Tenant plan levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TenantPlan {
    Basic,
    Professional,
    Enterprise,
}

impl Default for TenantPlan {
    fn default() -> Self {
        Self::Basic
    }
}

/// Tenant status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TenantStatus {
    Trial,
    Active,
    Suspended,
    Expired,
}

impl Default for TenantStatus {
    fn default() -> Self {
        Self::Trial
    }
}

/// License type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LicenseType {
    Perpetual,    // One-time purchase
    Subscription, // Monthly/annual subscription
}

impl Default for LicenseType {
    fn default() -> Self {
        Self::Subscription
    }
}

/// Tenant entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Tenant {
    pub id: uuid::Uuid,
    pub name: String,
    pub code: String,

    #[sqlx(rename = "tenant_type")]
    #[serde(default)]
    pub tenant_type: String,

    #[serde(default = "default_plan")]
    pub plan: String,

    #[serde(rename = "license_type")]
    #[serde(default)]
    pub license_type: String,

    #[serde(rename = "license_expires_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license_expires_at: Option<DateTime<Utc>>,

    // Database config (for independent mode)
    #[serde(rename = "database_host")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub database_host: Option<String>,

    #[serde(rename = "database_port")]
    pub database_port: Option<i32>,

    #[serde(rename = "database_name")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub database_name: Option<String>,

    // Quota limits
    #[serde(default = "default_quota_users")]
    pub quota_users: i32,

    #[serde(rename = "quota_storage_gb")]
    pub quota_storage_gb: Option<i64>,

    #[serde(rename = "quota_api_calls")]
    pub quota_api_calls: Option<i64>,

    #[serde(rename = "quota_plugins")]
    pub quota_plugins: Option<Vec<String>>,

    // Feature flags
    #[serde(default)]
    pub features: serde_json::Value,

    // Status
    #[serde(default)]
    pub status: String,

    #[serde(rename = "trial_expires_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial_expires_at: Option<DateTime<Utc>>,

    // Metadata
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,

    #[serde(rename = "updated_at")]
    pub updated_at: DateTime<Utc>,

    #[serde(rename = "activated_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub activated_at: Option<DateTime<Utc>>,

    #[serde(rename = "suspended_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suspended_at: Option<DateTime<Utc>>,
}

fn default_plan() -> String {
    "basic".to_string()
}

fn default_quota_users() -> i32 {
    20
}

/// Tenant usage statistics
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TenantUsage {
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,

    pub users_count: i32,
    pub storage_used_mb: i64,
    pub api_calls_count: i64,

    pub period_start: NaiveDate,
    pub period_end: NaiveDate,

    // Using i64 (cents) instead of Decimal for SQL compatibility
    pub base_cost_cents: Option<i64>,
    pub overage_cost_cents: Option<i64>,
    pub plugin_cost_cents: Option<i64>,
    pub total_cost_cents: Option<i64>,

    pub created_at: DateTime<Utc>,
}

/// Tenant module (activated plugin/feature)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TenantModule {
    pub id: uuid::Uuid,
    #[serde(rename = "tenant_id")]
    pub tenant_id: uuid::Uuid,
    #[serde(rename = "module_code")]
    pub module_code: String,
    #[serde(rename = "module_name")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub module_name: Option<String>,
    #[serde(rename = "is_active")]
    pub is_active: bool,
    #[serde(rename = "activated_at")]
    pub activated_at: DateTime<Utc>,
    #[serde(rename = "expires_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
}

/// Request to create a new tenant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTenantRequest {
    pub name: String,
    pub code: String,
    #[serde(default)]
    pub tenant_type: String,
    #[serde(default = "default_plan")]
    pub plan: String,
    #[serde(default)]
    pub license_type: String,
    #[serde(rename = "license_expires_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license_expires_at: Option<DateTime<Utc>>,
    #[serde(rename = "trial_expires_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial_expires_at: Option<DateTime<Utc>>,
}

/// Request to update tenant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTenantRequest {
    pub name: Option<String>,
    pub plan: Option<String>,
    pub status: Option<String>,
    #[serde(rename = "quota_users")]
    pub quota_users: Option<i32>,
    #[serde(rename = "quota_storage_gb")]
    pub quota_storage_gb: Option<i64>,
    #[serde(rename = "quota_api_calls")]
    pub quota_api_calls: Option<i64>,
    pub features: Option<serde_json::Value>,
}

/// Response with tenant quota info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantQuotaResponse {
    pub tenant_id: uuid::Uuid,
    pub plan: String,
    pub quota: QuotaInfo,
    pub usage: UsageInfo,
    pub overage: OverageInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaInfo {
    pub users: i32,
    pub storage_gb: i64,
    pub api_calls: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageInfo {
    pub users: i32,
    pub storage_gb: f64,
    pub api_calls: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverageInfo {
    pub users: Option<OverageItem>,
    pub storage: Option<OverageItem>,
    pub api_calls: Option<OverageItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverageItem {
    pub used: i64,
    pub quota: i64,
    pub overage: i64,
    pub estimated_cost: rust_decimal::Decimal,
}
