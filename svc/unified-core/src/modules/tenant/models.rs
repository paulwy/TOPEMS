//! Tenant data models

use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Tenant type: independent database or shared database
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum TenantType {
    Independent, // One database per tenant
    #[default]
    Shared, // Row-level isolation via tenant_id
}

/// Tenant plan levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum TenantPlan {
    #[default]
    Basic,
    Professional,
    Enterprise,
}

/// Tenant status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum TenantStatus {
    #[default]
    Trial,
    Active,
    Suspended,
    Expired,
}

/// License type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum LicenseType {
    Perpetual, // One-time purchase
    #[default]
    Subscription, // Monthly/annual subscription
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
    pub license_expires_at: Option<NaiveDateTime>,

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
    pub trial_expires_at: Option<NaiveDateTime>,

    // Metadata
    #[serde(rename = "created_at")]
    pub created_at: NaiveDateTime,

    #[serde(rename = "updated_at")]
    pub updated_at: NaiveDateTime,

    #[serde(rename = "activated_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub activated_at: Option<NaiveDateTime>,

    #[serde(rename = "suspended_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suspended_at: Option<NaiveDateTime>,
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

    pub created_at: NaiveDateTime,
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
    pub activated_at: NaiveDateTime,
    #[serde(rename = "expires_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<NaiveDateTime>,
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
    pub license_expires_at: Option<NaiveDateTime>,
    #[serde(rename = "trial_expires_at")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trial_expires_at: Option<NaiveDateTime>,
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
    pub created_at: NaiveDateTime,
    #[serde(rename = "last_login")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_login: Option<NaiveDateTime>,
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
    pub updated_at: NaiveDateTime,
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
    pub period_start: NaiveDateTime,
    #[serde(rename = "period_end")]
    pub period_end: NaiveDateTime,
    #[serde(rename = "created_at")]
    pub created_at: NaiveDateTime,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paid_at: Option<NaiveDateTime>,
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDateTime;
    use serde_json;
    use uuid::Uuid;

    fn sample_naive_dt() -> NaiveDateTime {
        NaiveDateTime::parse_from_str("2024-01-15 10:30:00", "%Y-%m-%d %H:%M:%S").unwrap()
    }

    #[test]
    fn test_tenant_type_default_and_serde() {
        assert_eq!(TenantType::default(), TenantType::Shared);
        let json = serde_json::to_string(&TenantType::Independent).unwrap();
        assert_eq!(json, "\"independent\"");
        let de: TenantType = serde_json::from_str("\"shared\"").unwrap();
        assert_eq!(de, TenantType::Shared);
    }

    #[test]
    fn test_tenant_plan_default_and_variants() {
        assert_eq!(TenantPlan::default(), TenantPlan::Basic);
        let all = [
            TenantPlan::Basic,
            TenantPlan::Professional,
            TenantPlan::Enterprise,
        ];
        for plan in all.iter() {
            let json = serde_json::to_string(plan).unwrap();
            let de: TenantPlan = serde_json::from_str(&json).unwrap();
            assert_eq!(&de, plan);
        }
    }

    #[test]
    fn test_tenant_status_default_and_variants() {
        assert_eq!(TenantStatus::default(), TenantStatus::Trial);
        let statuses = [
            TenantStatus::Trial,
            TenantStatus::Active,
            TenantStatus::Suspended,
            TenantStatus::Expired,
        ];
        for s in statuses.iter() {
            let json = serde_json::to_string(s).unwrap();
            let de: TenantStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(&de, s);
        }
    }

    #[test]
    fn test_license_type_default_and_variants() {
        assert_eq!(LicenseType::default(), LicenseType::Subscription);
        let json = serde_json::to_string(&LicenseType::Perpetual).unwrap();
        assert_eq!(json, "\"perpetual\"");
        let de: LicenseType = serde_json::from_str("\"subscription\"").unwrap();
        assert_eq!(de, LicenseType::Subscription);
    }

    #[test]
    fn test_tenant_serde() {
        let tenant = Tenant {
            id: Uuid::new_v4(),
            name: "测试公司".to_string(),
            code: "TEST001".to_string(),
            tenant_type: "shared".to_string(),
            plan: "professional".to_string(),
            license_type: "subscription".to_string(),
            license_expires_at: Some(sample_naive_dt()),
            database_host: None,
            database_port: Some(5432),
            database_name: None,
            quota_users: 50,
            quota_storage_gb: Some(100),
            quota_api_calls: Some(500000),
            quota_plugins: Some(vec!["plugin-a".to_string()]),
            features: serde_json::json!({"ai": true, "workflow": true}),
            status: "active".to_string(),
            trial_expires_at: Some(sample_naive_dt()),
            created_at: sample_naive_dt(),
            updated_at: sample_naive_dt(),
            activated_at: Some(sample_naive_dt()),
            suspended_at: None,
        };
        let cloned = tenant.clone();
        assert_eq!(cloned.name, tenant.name);
        let json = serde_json::to_string(&tenant).unwrap();
        let de: Tenant = serde_json::from_str(&json).unwrap();
        assert_eq!(de.code, "TEST001");
        assert_eq!(de.quota_users, 50);
        assert!(de.license_expires_at.is_some());
    }

    #[test]
    fn test_tenant_usage_and_module() {
        let usage = TenantUsage {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            users_count: 30,
            storage_used_mb: 500,
            api_calls_count: 12000,
            period_start: chrono::NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            period_end: chrono::NaiveDate::from_ymd_opt(2024, 1, 31).unwrap(),
            base_cost_cents: Some(9900),
            overage_cost_cents: Some(500),
            plugin_cost_cents: Some(2000),
            total_cost_cents: Some(12400),
            created_at: sample_naive_dt(),
        };
        let json = serde_json::to_string(&usage).unwrap();
        let de: TenantUsage = serde_json::from_str(&json).unwrap();
        assert_eq!(de.users_count, 30);

        let tm = TenantModule {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            module_code: "workflow".to_string(),
            module_name: Some("工作流".to_string()),
            tier: "advanced".to_string(),
            is_active: true,
            activated_at: sample_naive_dt(),
            expires_at: None,
        };
        let json2 = serde_json::to_string(&tm).unwrap();
        let de2: TenantModule = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.tier, "advanced");
        assert!(de2.is_active);
    }

    #[test]
    fn test_tenant_requests_serde() {
        let ctr = CreateTenantRequest {
            name: "新租户".to_string(),
            code: "NEW001".to_string(),
            tenant_type: "shared".to_string(),
            plan: "basic".to_string(),
            license_type: "subscription".to_string(),
            license_expires_at: None,
            trial_expires_at: Some(sample_naive_dt()),
        };
        let json = serde_json::to_string(&ctr).unwrap();
        let de: CreateTenantRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.code, "NEW001");

        let utr = UpdateTenantRequest {
            name: Some("更新名".to_string()),
            plan: Some("enterprise".to_string()),
            status: Some("suspended".to_string()),
            quota_users: Some(200),
            quota_storage_gb: Some(500),
            quota_api_calls: Some(1_000_000),
            features: Some(serde_json::json!({"sso": true})),
        };
        let json2 = serde_json::to_string(&utr).unwrap();
        let de2: UpdateTenantRequest = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.plan, Some("enterprise".to_string()));
    }

    #[test]
    fn test_tenant_user_and_stats() {
        let tu = TenantUser {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            email: "user@tenant.com".to_string(),
            role: "admin".to_string(),
            status: "active".to_string(),
            created_at: sample_naive_dt(),
            last_login: Some(sample_naive_dt()),
        };
        let json = serde_json::to_string(&tu).unwrap();
        let de: TenantUser = serde_json::from_str(&json).unwrap();
        assert_eq!(de.role, "admin");

        let ts = TenantStats {
            total_users: 50,
            active_users: 40,
            storage_used_gb: 25.5,
            api_requests_today: 15000,
            monthly_active_users: 45,
            last_30d_logins: 1200,
        };
        let json2 = serde_json::to_string(&ts).unwrap();
        let de2: TenantStats = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.total_users, 50);
    }

    #[test]
    fn test_onboard_and_response() {
        let otr = OnboardTenantRequest {
            name: "新公司".to_string(),
            code: "NEWCORP".to_string(),
            tenant_type: "shared".to_string(),
            plan: "basic".to_string(),
            license_type: "subscription".to_string(),
            admin_username: "admin".to_string(),
            admin_email: "admin@newcorp.com".to_string(),
            admin_password: "Admin12345".to_string(),
            default_department_name: "总部".to_string(),
            default_department_description: Some("总部部门".to_string()),
        };
        let json = serde_json::to_string(&otr).unwrap();
        let de: OnboardTenantRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.admin_username, "admin");

        let resp = OnboardTenantResponse {
            tenant: Tenant {
                id: Uuid::new_v4(),
                name: "新公司".to_string(),
                code: "NEWCORP".to_string(),
                tenant_type: "shared".to_string(),
                plan: "basic".to_string(),
                license_type: "subscription".to_string(),
                license_expires_at: None,
                database_host: None,
                database_port: None,
                database_name: None,
                quota_users: 20,
                quota_storage_gb: None,
                quota_api_calls: None,
                quota_plugins: None,
                features: serde_json::json!({}),
                status: "trial".to_string(),
                trial_expires_at: None,
                created_at: sample_naive_dt(),
                updated_at: sample_naive_dt(),
                activated_at: None,
                suspended_at: None,
            },
            admin_user_id: Uuid::new_v4(),
            admin_username: "admin".to_string(),
            admin_email: "admin@newcorp.com".to_string(),
        };
        let json2 = serde_json::to_string(&resp).unwrap();
        let de2: OnboardTenantResponse = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.admin_email, "admin@newcorp.com");
    }

    #[test]
    fn test_tenant_quota_and_list_responses() {
        let qr = TenantQuotaResponse {
            tenant_id: Uuid::new_v4(),
            plan: "professional".to_string(),
            quota: QuotaInfo {
                users: 50,
                storage_gb: 100,
                api_calls: 500000,
            },
            usage: UsageInfo {
                users: 30,
                storage_gb: 25.5,
                api_calls: 12000,
            },
            overage: OverageInfo {
                users: None,
                storage: None,
                api_calls: Some(OverageItem {
                    used: 500001,
                    quota: 500000,
                    overage: 1,
                    estimated_cost: rust_decimal::Decimal::from(10),
                }),
            },
        };
        let json = serde_json::to_string(&qr).unwrap();
        let de: TenantQuotaResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(de.quota.users, 50);
        assert!(de.overage.api_calls.is_some());

        let ltr = ListTenantsResponse {
            items: vec![],
            total: 0,
            page: 1,
            page_size: 20,
        };
        let json2 = serde_json::to_string(&ltr).unwrap();
        let de2: ListTenantsResponse = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.total, 0);

        let ltusr = ListTenantUsersResponse {
            items: vec![],
            total: 5,
            page: 1,
            page_size: 10,
        };
        let json3 = serde_json::to_string(&ltusr).unwrap();
        let de3: ListTenantUsersResponse = serde_json::from_str(&json3).unwrap();
        assert_eq!(de3.total, 5);
    }

    #[test]
    fn test_switch_and_list_queries() {
        let lq = ListTenantsQuery {
            page: Some(2),
            page_size: Some(50),
            search: Some("tech".to_string()),
            status: Some("active".to_string()),
            plan: Some("enterprise".to_string()),
        };
        let json = serde_json::to_string(&lq).unwrap();
        let de: ListTenantsQuery = serde_json::from_str(&json).unwrap();
        assert_eq!(de.search, Some("tech".to_string()));

        let luq = ListTenantUsersQuery {
            page: None,
            page_size: None,
            search: Some("zhang".to_string()),
            role: Some("admin".to_string()),
            status: None,
        };
        let json2 = serde_json::to_string(&luq).unwrap();
        let de2: ListTenantUsersQuery = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.role, Some("admin".to_string()));

        let str = SwitchTenantRequest {
            tenant_id: "tenant-uuid-123".to_string(),
        };
        let json3 = serde_json::to_string(&str).unwrap();
        let de3: SwitchTenantRequest = serde_json::from_str(&json3).unwrap();
        assert_eq!(de3.tenant_id, "tenant-uuid-123");
    }

    #[test]
    fn test_invite_and_member_role() {
        let imr = InviteMemberRequest {
            email: "new@member.com".to_string(),
            role: "member".to_string(),
        };
        let json = serde_json::to_string(&imr).unwrap();
        let de: InviteMemberRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.role, "member");

        let umrr = UpdateMemberRoleRequest {
            role: "admin".to_string(),
        };
        let json2 = serde_json::to_string(&umrr).unwrap();
        let de2: UpdateMemberRoleRequest = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.role, "admin");
    }
}
