use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tenant {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub status: TenantStatus,
    pub plan: TenantPlan,
    pub settings: TenantSettings,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum TenantStatus {
    Active,
    Suspended,
    Trial,
    Deleted,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum TenantPlan {
    Free,
    Basic,
    Professional,
    Enterprise,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantSettings {
    pub max_users: u32,
    pub max_storage_gb: u64,
    pub max_api_requests_per_day: u64,
    pub features: HashMap<String, bool>,
    pub branding: BrandingSettings,
    pub security: SecuritySettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrandingSettings {
    pub logo_url: Option<String>,
    pub primary_color: String,
    pub secondary_color: String,
    pub custom_domain: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuritySettings {
    pub sso_enabled: bool,
    pub two_factor_required: bool,
    pub ip_whitelist_enabled: bool,
    pub allowed_ip_ranges: Vec<String>,
    pub session_timeout_minutes: u32,
}

impl Default for TenantSettings {
    fn default() -> Self {
        Self {
            max_users: 10,
            max_storage_gb: 10,
            max_api_requests_per_day: 10000,
            features: HashMap::new(),
            branding: BrandingSettings {
                logo_url: None,
                primary_color: "#3B82F6".to_string(),
                secondary_color: "#6B7280".to_string(),
                custom_domain: None,
            },
            security: SecuritySettings {
                sso_enabled: false,
                two_factor_required: false,
                ip_whitelist_enabled: false,
                allowed_ip_ranges: Vec::new(),
                session_timeout_minutes: 60,
            },
        }
    }
}

impl Tenant {
    pub fn new(name: String, slug: String, plan: TenantPlan) -> Self {
        let settings = match plan {
            TenantPlan::Free => TenantSettings {
                max_users: 5,
                max_storage_gb: 5,
                max_api_requests_per_day: 1000,
                ..Default::default()
            },
            TenantPlan::Basic => TenantSettings {
                max_users: 25,
                max_storage_gb: 50,
                max_api_requests_per_day: 50000,
                ..Default::default()
            },
            TenantPlan::Professional => TenantSettings {
                max_users: 100,
                max_storage_gb: 200,
                max_api_requests_per_day: 200000,
                ..Default::default()
            },
            TenantPlan::Enterprise => TenantSettings {
                max_users: u32::MAX,
                max_storage_gb: u64::MAX,
                max_api_requests_per_day: u64::MAX,
                ..Default::default()
            },
        };

        Self {
            id: Uuid::new_v4(),
            name,
            slug,
            status: TenantStatus::Trial,
            plan,
            settings,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            metadata: HashMap::new(),
        }
    }

    pub fn is_active(&self) -> bool {
        self.status == TenantStatus::Active
    }

    pub fn can_use_feature(&self, feature: &str) -> bool {
        self.settings.features.get(feature).copied().unwrap_or(true)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantUser {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub email: String,
    pub role: TenantRole,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum TenantRole {
    Owner,
    Admin,
    Member,
    Guest,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum UserStatus {
    Active,
    Invited,
    Suspended,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub role: TenantRole,
    pub permissions: Vec<String>,
}

impl TenantContext {
    pub fn new(tenant_id: Uuid, user_id: Uuid, role: TenantRole) -> Self {
        let permissions = Self::get_permissions_for_role(role);
        Self {
            tenant_id,
            user_id,
            role,
            permissions,
        }
    }

    fn get_permissions_for_role(role: TenantRole) -> Vec<String> {
        match role {
            TenantRole::Owner => vec![
                "tenant:manage".to_string(),
                "tenant:settings".to_string(),
                "tenant:users".to_string(),
                "tenant:billing".to_string(),
                "data:read".to_string(),
                "data:write".to_string(),
                "data:delete".to_string(),
            ],
            TenantRole::Admin => vec![
                "tenant:settings".to_string(),
                "tenant:users".to_string(),
                "data:read".to_string(),
                "data:write".to_string(),
                "data:delete".to_string(),
            ],
            TenantRole::Member => vec!["data:read".to_string(), "data:write".to_string()],
            TenantRole::Guest => vec!["data:read".to_string()],
        }
    }

    pub fn has_permission(&self, permission: &str) -> bool {
        self.permissions.contains(&permission.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageMetrics {
    pub tenant_id: Uuid,
    pub users_count: u32,
    pub storage_used_gb: f64,
    pub api_requests_today: u64,
    pub updated_at: DateTime<Utc>,
}

impl UsageMetrics {
    pub fn check_limits(&self, settings: &TenantSettings) -> Vec<UsageLimitExceeded> {
        let mut exceeded = Vec::new();

        if self.users_count > settings.max_users {
            exceeded.push(UsageLimitExceeded {
                limit_type: "users".to_string(),
                limit: settings.max_users as f64,
                current: self.users_count as f64,
            });
        }

        if self.storage_used_gb > settings.max_storage_gb as f64 {
            exceeded.push(UsageLimitExceeded {
                limit_type: "storage".to_string(),
                limit: settings.max_storage_gb as f64,
                current: self.storage_used_gb,
            });
        }

        if self.api_requests_today > settings.max_api_requests_per_day {
            exceeded.push(UsageLimitExceeded {
                limit_type: "api_requests".to_string(),
                limit: settings.max_api_requests_per_day as f64,
                current: self.api_requests_today as f64,
            });
        }

        exceeded
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageLimitExceeded {
    pub limit_type: String,
    pub limit: f64,
    pub current: f64,
}

pub struct TenantManager {
    tenants: Arc<RwLock<HashMap<Uuid, Tenant>>>,
    tenants_by_slug: Arc<RwLock<HashMap<String, Uuid>>>,
    tenant_users: Arc<RwLock<HashMap<Uuid, Vec<TenantUser>>>>,
    tenant_contexts: Arc<RwLock<HashMap<Uuid, TenantContext>>>,
}

impl Default for TenantManager {
    fn default() -> Self {
        Self::new()
    }
}

impl TenantManager {
    pub fn new() -> Self {
        Self {
            tenants: Arc::new(RwLock::new(HashMap::new())),
            tenants_by_slug: Arc::new(RwLock::new(HashMap::new())),
            tenant_users: Arc::new(RwLock::new(HashMap::new())),
            tenant_contexts: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_tenant(
        &self,
        name: String,
        slug: String,
        plan: TenantPlan,
    ) -> Result<Tenant, TenantError> {
        let mut by_slug = self.tenants_by_slug.write().await;
        if by_slug.contains_key(&slug) {
            return Err(TenantError::SlugAlreadyExists);
        }

        let tenant = Tenant::new(name, slug.clone(), plan);
        let tenant_id = tenant.id;

        let mut tenants = self.tenants.write().await;
        tenants.insert(tenant_id, tenant.clone());
        by_slug.insert(slug, tenant_id);

        Ok(tenant)
    }

    pub async fn get_tenant(&self, id: Uuid) -> Option<Tenant> {
        let tenants = self.tenants.read().await;
        tenants.get(&id).cloned()
    }

    pub async fn get_tenant_by_slug(&self, slug: &str) -> Option<Tenant> {
        let by_slug = self.tenants_by_slug.read().await;
        let tenants = self.tenants.read().await;
        by_slug.get(slug).and_then(|id| tenants.get(id).cloned())
    }

    pub async fn list_tenants(&self) -> Vec<Tenant> {
        let tenants = self.tenants.read().await;
        tenants.values().cloned().collect()
    }

    pub async fn update_tenant(
        &self,
        id: Uuid,
        updates: TenantUpdate,
    ) -> Result<Tenant, TenantError> {
        let mut tenants = self.tenants.write().await;
        let tenant = tenants.get_mut(&id).ok_or(TenantError::TenantNotFound)?;

        if let Some(name) = updates.name {
            tenant.name = name;
        }
        if let Some(status) = updates.status {
            tenant.status = status;
        }
        if let Some(plan) = updates.plan {
            tenant.plan = plan;
            tenant.settings = Tenant::new(tenant.name.clone(), tenant.slug.clone(), plan).settings;
        }
        if let Some(settings) = updates.settings {
            tenant.settings = settings;
        }

        tenant.updated_at = Utc::now();
        Ok(tenant.clone())
    }

    pub async fn delete_tenant(&self, id: Uuid) -> Result<(), TenantError> {
        let mut tenants = self.tenants.write().await;
        let tenant = tenants.remove(&id).ok_or(TenantError::TenantNotFound)?;

        let mut by_slug = self.tenants_by_slug.write().await;
        by_slug.remove(&tenant.slug);

        let mut users = self.tenant_users.write().await;
        users.remove(&id);

        Ok(())
    }

    pub async fn add_user_to_tenant(
        &self,
        tenant_id: Uuid,
        user_id: Uuid,
        email: String,
        role: TenantRole,
    ) -> Result<TenantUser, TenantError> {
        let tenants = self.tenants.read().await;
        if !tenants.contains_key(&tenant_id) {
            return Err(TenantError::TenantNotFound);
        }

        let tenant_user = TenantUser {
            id: Uuid::new_v4(),
            tenant_id,
            user_id,
            email,
            role,
            status: UserStatus::Active,
            created_at: Utc::now(),
            last_login: None,
        };

        let mut users = self.tenant_users.write().await;
        users
            .entry(tenant_id)
            .or_insert_with(Vec::new)
            .push(tenant_user.clone());

        Ok(tenant_user)
    }

    pub async fn get_tenant_users(&self, tenant_id: Uuid) -> Vec<TenantUser> {
        let users = self.tenant_users.read().await;
        users.get(&tenant_id).cloned().unwrap_or_default()
    }

    pub async fn set_context(&self, context: TenantContext) {
        let mut contexts = self.tenant_contexts.write().await;
        contexts.insert(context.user_id, context);
    }

    pub async fn get_context(&self, user_id: Uuid) -> Option<TenantContext> {
        let contexts = self.tenant_contexts.read().await;
        contexts.get(&user_id).cloned()
    }

    pub async fn get_current_tenant(&self, user_id: Uuid) -> Option<Tenant> {
        let contexts = self.tenant_contexts.read().await;
        let tenant_id = contexts.get(&user_id)?.tenant_id;

        let tenants = self.tenants.read().await;
        tenants.get(&tenant_id).cloned()
    }

    pub async fn validate_feature_access(&self, tenant_id: Uuid, feature: &str) -> bool {
        let tenants = self.tenants.read().await;
        tenants
            .get(&tenant_id)
            .map(|t| t.can_use_feature(feature))
            .unwrap_or(false)
    }

    pub async fn check_usage_limits(&self, tenant_id: Uuid) -> Vec<UsageLimitExceeded> {
        let tenants = self.tenants.read().await;
        let tenant = match tenants.get(&tenant_id) {
            Some(t) => t,
            None => return Vec::new(),
        };

        let users = self.tenant_users.read().await;
        let users_count = users.get(&tenant_id).map(|u| u.len()).unwrap_or(0) as u32;

        let usage = UsageMetrics {
            tenant_id,
            users_count,
            storage_used_gb: 0.0,
            api_requests_today: 0,
            updated_at: Utc::now(),
        };

        usage.check_limits(&tenant.settings)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantUpdate {
    pub name: Option<String>,
    pub status: Option<TenantStatus>,
    pub plan: Option<TenantPlan>,
    pub settings: Option<TenantSettings>,
}

#[derive(Debug, thiserror::Error)]
pub enum TenantError {
    #[error("Tenant not found")]
    TenantNotFound,

    #[error("Slug already exists")]
    SlugAlreadyExists,

    #[error("User not found")]
    UserNotFound,

    #[error("Permission denied")]
    PermissionDenied,

    #[error("Usage limit exceeded")]
    UsageLimitExceeded(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_tenant() -> Result<(), TenantError> {
        let manager = TenantManager::new();

        let tenant = manager
            .create_tenant(
                "Test Company".to_string(),
                "test-company".to_string(),
                TenantPlan::Professional,
            )
            .await?;

        assert_eq!(tenant.name, "Test Company");
        assert_eq!(tenant.plan, TenantPlan::Professional);
        assert!(matches!(tenant.status, TenantStatus::Trial));
        Ok(())
    }

    #[tokio::test]
    async fn test_get_tenant_by_slug() -> Result<(), TenantError> {
        let manager = TenantManager::new();

        manager
            .create_tenant(
                "Test Company".to_string(),
                "test-company".to_string(),
                TenantPlan::Basic,
            )
            .await?;

        let found = manager.get_tenant_by_slug("test-company").await;
        assert!(found.is_some());
        let tenant = found.ok_or(TenantError::TenantNotFound)?;
        assert_eq!(tenant.name, "Test Company");
        Ok(())
    }

    #[tokio::test]
    async fn test_tenant_permissions() {
        let context = TenantContext::new(Uuid::new_v4(), Uuid::new_v4(), TenantRole::Admin);

        assert!(context.has_permission("data:read"));
        assert!(context.has_permission("tenant:users"));
        assert!(!context.has_permission("tenant:billing"));
    }

    #[tokio::test]
    async fn test_usage_limits() {
        let metrics = UsageMetrics {
            tenant_id: Uuid::new_v4(),
            users_count: 15,
            storage_used_gb: 30.0,
            api_requests_today: 50000,
            updated_at: Utc::now(),
        };

        let settings = TenantSettings {
            max_users: 10,
            max_storage_gb: 20,
            max_api_requests_per_day: 10000,
            features: HashMap::new(),
            branding: BrandingSettings {
                logo_url: None,
                primary_color: "#3B82F6".to_string(),
                secondary_color: "#6B7280".to_string(),
                custom_domain: None,
            },
            security: SecuritySettings {
                sso_enabled: false,
                two_factor_required: false,
                ip_whitelist_enabled: false,
                allowed_ip_ranges: Vec::new(),
                session_timeout_minutes: 60,
            },
        };

        let exceeded = metrics.check_limits(&settings);
        assert_eq!(exceeded.len(), 3);
    }

    // ===== 新增：Tenant::new 套餐等级配置测试 =====
    #[test]
    fn test_tenant_free_plan_settings() {
        let t = Tenant::new("F".to_string(), "f".to_string(), TenantPlan::Free);
        assert_eq!(t.settings.max_users, 5);
        assert_eq!(t.settings.max_storage_gb, 5);
        assert_eq!(t.settings.max_api_requests_per_day, 1000);
        assert_eq!(t.status, TenantStatus::Trial);
    }

    #[test]
    fn test_tenant_basic_plan_settings() {
        let t = Tenant::new("B".to_string(), "b".to_string(), TenantPlan::Basic);
        assert_eq!(t.settings.max_users, 25);
        assert_eq!(t.settings.max_storage_gb, 50);
        assert_eq!(t.settings.max_api_requests_per_day, 50000);
    }

    #[test]
    fn test_tenant_professional_plan_settings() {
        let t = Tenant::new("P".to_string(), "p".to_string(), TenantPlan::Professional);
        assert_eq!(t.settings.max_users, 100);
        assert_eq!(t.settings.max_storage_gb, 200);
        assert_eq!(t.settings.max_api_requests_per_day, 200000);
    }

    #[test]
    fn test_tenant_enterprise_plan_unlimited() {
        let t = Tenant::new("E".to_string(), "e".to_string(), TenantPlan::Enterprise);
        assert_eq!(t.settings.max_users, u32::MAX);
        assert_eq!(t.settings.max_storage_gb, u64::MAX);
        assert_eq!(t.settings.max_api_requests_per_day, u64::MAX);
    }

    #[test]
    fn test_tenant_is_active_and_status() {
        let mut t = Tenant::new("A".to_string(), "a".to_string(), TenantPlan::Free);
        assert!(!t.is_active());
        t.status = TenantStatus::Active;
        assert!(t.is_active());
        t.status = TenantStatus::Suspended;
        assert!(!t.is_active());
    }

    #[test]
    fn test_tenant_can_use_feature_default_true() {
        let t = Tenant::new("X".to_string(), "x".to_string(), TenantPlan::Free);
        // 未在 features 中显式设置的 feature 默认为 true
        assert!(t.can_use_feature("beta_feature"));
    }

    #[test]
    fn test_tenant_can_use_feature_explicit_disable() {
        let mut t = Tenant::new("X".to_string(), "x".to_string(), TenantPlan::Free);
        t.settings.features.insert("payments".to_string(), false);
        assert!(!t.can_use_feature("payments"));
        t.settings.features.insert("payments".to_string(), true);
        assert!(t.can_use_feature("payments"));
    }

    // ===== UsageMetrics.check_limits 纯函数更多测试 =====
    #[test]
    fn test_usage_metrics_no_exceeded() {
        let m = UsageMetrics {
            tenant_id: Uuid::new_v4(),
            users_count: 5,
            storage_used_gb: 5.0,
            api_requests_today: 500,
            updated_at: Utc::now(),
        };
        let s = TenantSettings::default();
        assert!(m.check_limits(&s).is_empty());
    }

    #[test]
    fn test_usage_metrics_only_users_exceeded() {
        let m = UsageMetrics {
            tenant_id: Uuid::new_v4(),
            users_count: 1_000_000,
            storage_used_gb: 0.0,
            api_requests_today: 0,
            updated_at: Utc::now(),
        };
        let s = TenantSettings::default();
        let exceeded = m.check_limits(&s);
        assert_eq!(exceeded.len(), 1);
        assert_eq!(exceeded[0].limit_type, "users");
    }

    #[test]
    fn test_usage_metrics_storage_and_api_exceeded() {
        let m = UsageMetrics {
            tenant_id: Uuid::new_v4(),
            users_count: 1,
            storage_used_gb: 99999.0,
            api_requests_today: 99999999,
            updated_at: Utc::now(),
        };
        let s = TenantSettings::default();
        let exceeded = m.check_limits(&s);
        let types: Vec<&str> = exceeded.iter().map(|e| e.limit_type.as_str()).collect();
        assert!(types.contains(&"storage"));
        assert!(types.contains(&"api_requests"));
    }

    // ===== TenantContext 权限测试 =====
    #[test]
    fn test_tenant_context_owner_has_all_permissions() {
        let ctx = TenantContext::new(Uuid::new_v4(), Uuid::new_v4(), TenantRole::Owner);
        assert!(ctx.has_permission("tenant:manage"));
        assert!(ctx.has_permission("tenant:billing"));
        assert!(ctx.has_permission("data:delete"));
    }

    #[test]
    fn test_tenant_context_admin_no_billing() {
        let ctx = TenantContext::new(Uuid::new_v4(), Uuid::new_v4(), TenantRole::Admin);
        assert!(ctx.has_permission("tenant:users"));
        assert!(ctx.has_permission("data:write"));
        assert!(!ctx.has_permission("tenant:manage"));
        assert!(!ctx.has_permission("tenant:billing"));
    }

    #[test]
    fn test_tenant_context_member_can_read_write_not_delete() {
        let ctx = TenantContext::new(Uuid::new_v4(), Uuid::new_v4(), TenantRole::Member);
        assert!(ctx.has_permission("data:read"));
        assert!(ctx.has_permission("data:write"));
        assert!(!ctx.has_permission("data:delete"));
        assert!(!ctx.has_permission("tenant:users"));
    }

    #[test]
    fn test_tenant_context_guest_readonly() {
        let ctx = TenantContext::new(Uuid::new_v4(), Uuid::new_v4(), TenantRole::Guest);
        assert!(ctx.has_permission("data:read"));
        assert!(!ctx.has_permission("data:write"));
        assert!(!ctx.has_permission("data:delete"));
    }

    // ===== TenantSettings 默认值 =====
    #[test]
    fn test_tenant_settings_default_values() {
        let s = TenantSettings::default();
        assert_eq!(s.max_users, 10);
        assert_eq!(s.max_storage_gb, 10);
        assert_eq!(s.max_api_requests_per_day, 10000);
        assert_eq!(s.security.session_timeout_minutes, 60);
        assert!(!s.security.sso_enabled);
    }

    // ===== 枚举变体测试 =====
    #[test]
    fn test_tenant_role_variants_four() {
        use serde_json;
        let roles = [
            TenantRole::Owner,
            TenantRole::Admin,
            TenantRole::Member,
            TenantRole::Guest,
        ];
        for r in &roles {
            let _ = serde_json::to_string(r).unwrap();
        }
        assert_eq!(roles.len(), 4);
    }

    #[test]
    fn test_tenant_plan_basic_equality() {
        assert_eq!(TenantPlan::Free, TenantPlan::Free);
        assert_ne!(TenantPlan::Free, TenantPlan::Enterprise);
        assert_ne!(TenantStatus::Active, TenantStatus::Deleted);
        assert_ne!(UserStatus::Active, UserStatus::Suspended);
    }
}
