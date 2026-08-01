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
    /// P34-4: 'basic' | 'advanced' | 'infrastructure'. Defaults to 'basic'.
    #[serde(default = "default_module_tier")]
    pub tier: String,
    #[serde(rename = "is_active")]
    pub is_active: bool,
    #[serde(rename = "activated_at")]
    pub activated_at: DateTime<Utc>,
    #[serde(rename = "expires_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
}

fn default_module_tier() -> String {
    "basic".to_string()
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

/// Default department name seeded for new tenants.
fn default_department_name() -> String {
    "总部".to_string()
}

/// Request to onboard a new tenant with a pre-seeded admin and defaults.
/// Backs the `POST /tenant/onboard` endpoint (P36-2 初始化向导).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardTenantRequest {
    pub name: String,
    pub code: String,
    #[serde(default)]
    pub tenant_type: String,
    #[serde(default = "default_plan")]
    pub plan: String,
    #[serde(default)]
    pub license_type: String,
    pub admin_username: String,
    pub admin_email: String,
    pub admin_password: String,
    #[serde(default = "default_department_name")]
    pub default_department_name: String,
    #[serde(default)]
    pub default_department_description: Option<String>,
}

/// Response returned after a tenant has been onboarded.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnboardTenantResponse {
    pub tenant: Tenant,
    #[serde(rename = "admin_user_id")]
    pub admin_user_id: uuid::Uuid,
    #[serde(rename = "admin_username")]
    pub admin_username: String,
    #[serde(rename = "admin_email")]
    pub admin_email: String,
}

/// Tenant user entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TenantUser {
    pub id: uuid::Uuid,
    #[serde(rename = "tenant_id")]
    pub tenant_id: uuid::Uuid,
    #[serde(rename = "user_id")]
    pub user_id: uuid::Uuid,
    pub email: String,
    pub role: String,
    pub status: String,
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "last_login")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_login: Option<DateTime<Utc>>,
}

/// Tenant stats response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantStats {
    #[serde(rename = "total_users")]
    pub total_users: i32,
    #[serde(rename = "active_users")]
    pub active_users: i32,
    #[serde(rename = "storage_used_gb")]
    pub storage_used_gb: f64,
    #[serde(rename = "api_requests_today")]
    pub api_requests_today: i64,
    #[serde(rename = "monthly_active_users")]
    pub monthly_active_users: i32,
    #[serde(rename = "last_30d_logins")]
    pub last_30d_logins: i32,
}

/// Usage metrics response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageMetrics {
    #[serde(rename = "tenant_id")]
    pub tenant_id: uuid::Uuid,
    #[serde(rename = "users_count")]
    pub users_count: i32,
    #[serde(rename = "storage_used_gb")]
    pub storage_used_gb: f64,
    #[serde(rename = "api_requests_today")]
    pub api_requests_today: i64,
    #[serde(rename = "updated_at")]
    pub updated_at: DateTime<Utc>,
}

/// Tenant billing info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantBillingInfo {
    pub plan: String,
    #[serde(rename = "current_period_start")]
    pub current_period_start: DateTime<Utc>,
    #[serde(rename = "current_period_end")]
    pub current_period_end: DateTime<Utc>,
    #[serde(rename = "next_billing_date")]
    pub next_billing_date: DateTime<Utc>,
    pub status: String,
}

/// Tenant invoice
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantInvoice {
    pub id: uuid::Uuid,
    pub amount: f64,
    pub currency: String,
    pub status: String,
    #[serde(rename = "period_start")]
    pub period_start: DateTime<Utc>,
    #[serde(rename = "period_end")]
    pub period_end: DateTime<Utc>,
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "paid_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paid_at: Option<DateTime<Utc>>,
}

/// Tenant context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantContext {
    #[serde(rename = "tenant_id")]
    pub tenant_id: uuid::Uuid,
    #[serde(rename = "user_id")]
    pub user_id: uuid::Uuid,
    pub role: String,
    pub permissions: Vec<String>,
}

/// Invite member request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InviteMemberRequest {
    pub email: String,
    pub role: String,
}

/// Update member role request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMemberRoleRequest {
    pub role: String,
}

/// List tenants query parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListTenantsQuery {
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub plan: Option<String>,
}

/// List tenant users query parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListTenantUsersQuery {
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub role: Option<String>,
    pub status: Option<String>,
}

/// Switch tenant request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwitchTenantRequest {
    #[serde(rename = "tenant_id")]
    pub tenant_id: String,
}

/// List response wrapper for tenants
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListTenantsResponse {
    pub items: Vec<Tenant>,
    pub total: i64,
    pub page: i64,
    #[serde(rename = "pageSize")]
    pub page_size: i64,
}

/// List response wrapper for tenant users
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListTenantUsersResponse {
    pub items: Vec<TenantUser>,
    pub total: i64,
    pub page: i64,
    #[serde(rename = "pageSize")]
    pub page_size: i64,
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
