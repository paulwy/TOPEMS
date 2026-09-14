//! 订阅与商业化支撑模块
//!
//! 提供 tier 分层定义、功能清单矩阵、权限自动关联和运行期模块裁剪框架。
//! 基础设施已就绪，具体功能清单可根据商业模式调整。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// 订阅层级
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
#[serde(rename_all = "lowercase")]
pub enum PlanTier {
    /// 免费版
    Free,
    /// 基础版
    Basic,
    /// 高级版
    Advanced,
}

impl PlanTier {
    /// 从字符串解析
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "free" => Some(Self::Free),
            "basic" => Some(Self::Basic),
            "advanced" => Some(Self::Advanced),
            _ => None,
        }
    }

    /// 转为字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Free => "free",
            Self::Basic => "basic",
            Self::Advanced => "advanced",
        }
    }

    /// 层级排序值（用于比较）
    pub fn level(&self) -> u8 {
        match self {
            Self::Free => 0,
            Self::Basic => 1,
            Self::Advanced => 2,
        }
    }

    /// 是否包含指定层级（当前层级 >= 目标层级）
    pub fn includes(&self, other: &Self) -> bool {
        self.level() >= other.level()
    }
}

impl Default for PlanTier {
    fn default() -> Self {
        Self::Basic
    }
}

impl std::fmt::Display for PlanTier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// 模块功能定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleFeature {
    /// 模块标识（如 "mes", "wms"）
    pub module: String,
    /// 模块名称
    pub name: String,
    /// 模块描述
    pub description: Option<String>,
    /// 最低可用层级
    pub min_tier: PlanTier,
    /// 功能点列表
    pub features: Vec<String>,
}

/// 三层功能清单矩阵
///
/// 基于现有 30+ 服务模块的默认分层，可根据商业模式调整。
pub struct TierFeatureMatrix;

impl TierFeatureMatrix {
    /// 获取所有模块功能定义
    pub fn all_modules() -> Vec<ModuleFeature> {
        vec![
            // === Free 层（基础功能）===
            ModuleFeature {
                module: "iam".to_string(),
                name: "身份认证与权限".to_string(),
                description: Some("用户、角色、权限、认证".to_string()),
                min_tier: PlanTier::Free,
                features: vec!["用户管理".to_string(), "角色管理".to_string(), "权限控制".to_string(), "登录认证".to_string()],
            },
            ModuleFeature {
                module: "tenant".to_string(),
                name: "租户管理".to_string(),
                description: Some("多租户隔离与管理".to_string()),
                min_tier: PlanTier::Free,
                features: vec!["租户创建".to_string(), "租户配置".to_string(), "数据隔离".to_string()],
            },
            ModuleFeature {
                module: "master-data".to_string(),
                name: "基础数据".to_string(),
                description: Some("物料、客户、供应商等基础数据".to_string()),
                min_tier: PlanTier::Free,
                features: vec!["物料管理".to_string(), "客户管理".to_string(), "供应商管理".to_string()],
            },
            ModuleFeature {
                module: "ticket".to_string(),
                name: "工单管理".to_string(),
                description: Some("工单创建、分配、跟踪".to_string()),
                min_tier: PlanTier::Free,
                features: vec!["工单创建".to_string(), "工单分配".to_string(), "工单跟踪".to_string()],
            },
            ModuleFeature {
                module: "communication".to_string(),
                name: "通讯中心".to_string(),
                description: Some("消息、通知、实时通讯".to_string()),
                min_tier: PlanTier::Free,
                features: vec!["消息通知".to_string(), "站内信".to_string()],
            },

            // === Basic 层（核心业务）===
            ModuleFeature {
                module: "mes".to_string(),
                name: "制造执行系统".to_string(),
                description: Some("生产订单、工单、报工、质量".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["生产订单".to_string(), "工单管理".to_string(), "生产报工".to_string(), "质量检验".to_string(), "设备管理".to_string()],
            },
            ModuleFeature {
                module: "wms".to_string(),
                name: "仓储管理系统".to_string(),
                description: Some("入库、出库、库存、盘点".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["入库管理".to_string(), "出库管理".to_string(), "库存管理".to_string(), "盘点管理".to_string()],
            },
            ModuleFeature {
                module: "qms".to_string(),
                name: "质量管理系统".to_string(),
                description: Some("质量标准、检验、不合格品".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["质量标准".to_string(), "质量检验".to_string(), "不合格品".to_string(), "质量追溯".to_string()],
            },
            ModuleFeature {
                module: "scm".to_string(),
                name: "供应链管理".to_string(),
                description: Some("采购、需求、计划".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["采购管理".to_string(), "需求计划".to_string(), "供应链协同".to_string()],
            },
            ModuleFeature {
                module: "srm".to_string(),
                name: "供应商关系管理".to_string(),
                description: Some("供应商评估、绩效、协同".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["供应商档案".to_string(), "供应商评估".to_string(), "供应商绩效".to_string()],
            },
            ModuleFeature {
                module: "crm".to_string(),
                name: "客户关系管理".to_string(),
                description: Some("客户、商机、合同".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["客户管理".to_string(), "商机管理".to_string(), "合同管理".to_string()],
            },
            ModuleFeature {
                module: "finance".to_string(),
                name: "财务管理".to_string(),
                description: Some("应收、应付、总账、报表".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["应收管理".to_string(), "应付管理".to_string(), "财务报表".to_string()],
            },
            ModuleFeature {
                module: "hrm".to_string(),
                name: "人力资源管理".to_string(),
                description: Some("员工、组织、考勤、薪酬".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["员工管理".to_string(), "组织管理".to_string(), "考勤管理".to_string()],
            },
            ModuleFeature {
                module: "analytics".to_string(),
                name: "数据分析（基础）".to_string(),
                description: Some("报表、仪表盘、基础分析".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["报表管理".to_string(), "仪表盘".to_string(), "基础数据分析".to_string()],
            },
            ModuleFeature {
                module: "erp".to_string(),
                name: "企业资源计划".to_string(),
                description: Some("ERP 核心模块".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["ERP 核心".to_string()],
            },
            ModuleFeature {
                module: "ehs".to_string(),
                name: "环境健康安全".to_string(),
                description: Some("EHS 管理".to_string()),
                min_tier: PlanTier::Basic,
                features: vec!["EHS 基础".to_string()],
            },

            // === Advanced 层（全功能）===
            ModuleFeature {
                module: "ai".to_string(),
                name: "AI 智能".to_string(),
                description: Some("AI Copilot、智能分析、预测".to_string()),
                min_tier: PlanTier::Advanced,
                features: vec!["AI Copilot".to_string(), "智能分析".to_string(), "预测模型".to_string(), "MCP 工具".to_string()],
            },
            ModuleFeature {
                module: "lims".to_string(),
                name: "实验室管理".to_string(),
                description: Some("样品、检验、仪器、校准".to_string()),
                min_tier: PlanTier::Advanced,
                features: vec!["样品管理".to_string(), "检验管理".to_string(), "仪器管理".to_string(), "校准管理".to_string()],
            },
            ModuleFeature {
                module: "pdm".to_string(),
                name: "产品数据管理".to_string(),
                description: Some("BOM、工艺、文档".to_string()),
                min_tier: PlanTier::Advanced,
                features: vec!["BOM 管理".to_string(), "工艺管理".to_string(), "文档管理".to_string()],
            },
            ModuleFeature {
                module: "rd".to_string(),
                name: "研发管理".to_string(),
                description: Some("项目、任务、成果".to_string()),
                min_tier: PlanTier::Advanced,
                features: vec!["研发项目".to_string(), "研发任务".to_string()],
            },
            ModuleFeature {
                module: "pm".to_string(),
                name: "项目管理".to_string(),
                description: Some("项目、任务、甘特图".to_string()),
                min_tier: PlanTier::Advanced,
                features: vec!["项目管理".to_string(), "任务管理".to_string(), "甘特图".to_string()],
            },
            ModuleFeature {
                module: "tms".to_string(),
                name: "运输管理".to_string(),
                description: Some("运输、配送、轨迹".to_string()),
                min_tier: PlanTier::Advanced,
                features: vec!["运输管理".to_string(), "配送管理".to_string()],
            },
            ModuleFeature {
                module: "gis".to_string(),
                name: "地理信息".to_string(),
                description: Some("地图、位置、空间分析".to_string()),
                min_tier: PlanTier::Advanced,
                features: vec!["地图服务".to_string(), "位置管理".to_string()],
            },
            ModuleFeature {
                module: "monitor".to_string(),
                name: "监控中心".to_string(),
                description: Some("系统监控、告警、性能".to_string()),
                min_tier: PlanTier::Advanced,
                features: vec!["系统监控".to_string(), "告警管理".to_string()],
            },
            ModuleFeature {
                module: "integration".to_string(),
                name: "系统集成".to_string(),
                description: Some("API、ESB、数据同步".to_string()),
                min_tier: PlanTier::Advanced,
                features: vec!["API 管理".to_string(), "数据同步".to_string()],
            },
            ModuleFeature {
                module: "search".to_string(),
                name: "企业搜索".to_string(),
                description: Some("全文搜索、语义搜索".to_string()),
                min_tier: PlanTier::Advanced,
                features: vec!["全文搜索".to_string(), "语义搜索".to_string()],
            },
        ]
    }

    /// 获取指定层级可用的模块
    pub fn modules_for_tier(tier: &PlanTier) -> Vec<ModuleFeature> {
        Self::all_modules()
            .into_iter()
            .filter(|m| tier.includes(&m.min_tier))
            .collect()
    }

    /// 获取指定层级不可用的模块
    pub fn modules_not_for_tier(tier: &PlanTier) -> Vec<ModuleFeature> {
        Self::all_modules()
            .into_iter()
            .filter(|m| !tier.includes(&m.min_tier))
            .collect()
    }

    /// 检查模块是否对指定层级可用
    pub fn is_module_available(module: &str, tier: &PlanTier) -> bool {
        Self::all_modules()
            .iter()
            .find(|m| m.module == module)
            .map(|m| tier.includes(&m.min_tier))
            .unwrap_or(false)
    }

    /// 获取层级统计
    pub fn tier_stats() -> HashMap<&'static str, usize> {
        let mut stats = HashMap::new();
        for module in Self::all_modules() {
            let tier = module.min_tier.as_str();
            *stats.entry(tier).or_insert(0) += 1;
        }
        stats
    }
}

/// 租户订阅信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantSubscription {
    pub tenant_id: Uuid,
    pub plan_tier: PlanTier,
    pub status: SubscriptionStatus,
    pub features: HashMap<String, bool>,
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// 订阅状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SubscriptionStatus {
    /// 活跃
    Active,
    /// 已过期
    Expired,
    /// 已取消
    Cancelled,
    /// 试用期
    Trial,
}

impl Default for SubscriptionStatus {
    fn default() -> Self {
        Self::Active
    }
}

/// 订阅生命周期服务
///
/// 管理订阅的周期计算、到期检查、自动降级和状态变更。
pub struct SubscriptionLifecycleService;

impl SubscriptionLifecycleService {
    /// 计算订阅剩余天数
    ///
    /// 如果没有设置 expires_at，返回 None（表示永久有效）。
    pub fn days_remaining(subscription: &TenantSubscription) -> Option<i64> {
        let expires_at = subscription.expires_at?;
        let now = chrono::Utc::now();
        let duration = expires_at - now;
        Some(duration.num_days())
    }

    /// 检查订阅是否即将到期（7 天内）
    pub fn is_expiring_soon(subscription: &TenantSubscription) -> bool {
        match Self::days_remaining(subscription) {
            Some(days) => days <= 7 && days >= 0,
            None => false,
        }
    }

    /// 检查订阅是否已过期
    pub fn is_expired(subscription: &TenantSubscription) -> bool {
        match subscription.expires_at {
            Some(expires_at) => chrono::Utc::now() > expires_at,
            None => false,
        }
    }

    /// 检查订阅是否活跃（未过期且状态为 Active/Trial）
    pub fn is_active(subscription: &TenantSubscription) -> bool {
        if Self::is_expired(subscription) {
            return false;
        }
        matches!(
            subscription.status,
            SubscriptionStatus::Active | SubscriptionStatus::Trial
        )
    }

    /// 自动降级：根据订阅状态返回应有的 tier
    ///
    /// - 活跃订阅：保持原 tier
    /// - 过期订阅：降级到 free
    /// - 取消订阅：降级到 free
    pub fn auto_downgrade_tier(subscription: &TenantSubscription) -> PlanTier {
        if Self::is_active(subscription) {
            subscription.plan_tier
        } else {
            PlanTier::Free
        }
    }

    /// 订阅状态变更结果
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct SubscriptionChangeResult {
        pub tenant_id: Uuid,
        pub old_status: SubscriptionStatus,
        pub new_status: SubscriptionStatus,
        pub old_tier: PlanTier,
        pub new_tier: PlanTier,
        pub permissions_resynced: bool,
        pub reason: String,
    }

    /// 处理订阅到期（自动降级到 free）
    pub fn handle_expiration(subscription: &mut TenantSubscription) -> SubscriptionChangeResult {
        let old_status = subscription.status;
        let old_tier = subscription.plan_tier;

        subscription.status = SubscriptionStatus::Expired;
        subscription.plan_tier = PlanTier::Free;

        // 重新同步权限
        let sync_result = TierPermissionService::sync_permissions_for_tenant(
            subscription.tenant_id,
            &PlanTier::Free,
        );

        SubscriptionChangeResult {
            tenant_id: subscription.tenant_id,
            old_status,
            new_status: SubscriptionStatus::Expired,
            old_tier,
            new_tier: PlanTier::Free,
            permissions_resynced: true,
            reason: format!(
                "Subscription expired, auto-downgraded from {} to free, {} permissions synced",
                old_tier, sync_result.permissions_synced
            ),
        }
    }

    /// 处理订阅升级
    pub fn handle_upgrade(
        subscription: &mut TenantSubscription,
        new_tier: PlanTier,
        duration_days: Option<i64>,
    ) -> SubscriptionChangeResult {
        let old_status = subscription.status;
        let old_tier = subscription.plan_tier;

        subscription.plan_tier = new_tier;
        subscription.status = SubscriptionStatus::Active;
        subscription.started_at = Some(chrono::Utc::now());

        if let Some(days) = duration_days {
            subscription.expires_at = Some(
                chrono::Utc::now() + chrono::Duration::days(days),
            );
        }

        // 重新同步权限
        let sync_result = TierPermissionService::sync_permissions_for_tenant(
            subscription.tenant_id,
            &new_tier,
        );

        SubscriptionChangeResult {
            tenant_id: subscription.tenant_id,
            old_status,
            new_status: SubscriptionStatus::Active,
            old_tier,
            new_tier,
            permissions_resynced: true,
            reason: format!(
                "Subscription upgraded from {} to {}, {} permissions synced",
                old_tier, new_tier, sync_result.permissions_synced
            ),
        }
    }

    /// 处理订阅取消（保持当前 tier 直到到期，然后降级）
    pub fn handle_cancellation(subscription: &mut TenantSubscription) -> SubscriptionChangeResult {
        let old_status = subscription.status;
        let old_tier = subscription.plan_tier;

        subscription.status = SubscriptionStatus::Cancelled;

        SubscriptionChangeResult {
            tenant_id: subscription.tenant_id,
            old_status,
            new_status: SubscriptionStatus::Cancelled,
            old_tier,
            new_tier: old_tier,
            permissions_resynced: false,
            reason: format!(
                "Subscription cancelled, will remain at {} tier until expiration",
                old_tier
            ),
        }
    }

    /// 生成到期提醒消息
    pub fn expiration_reminder(subscription: &TenantSubscription) -> Option<String> {
        if !Self::is_expiring_soon(subscription) {
            return None;
        }

        let days = Self::days_remaining(subscription)?;
        Some(format!(
            "您的订阅将在 {} 天后到期（当前层级：{}）。请及时续费以避免服务降级。",
            days, subscription.plan_tier
        ))
    }
}

/// 权限自动关联服务
///
/// 在租户创建/升级时根据 plan tier 自动分配默认角色和权限集。
pub struct TierPermissionService;

impl TierPermissionService {
    /// 获取指定层级的默认角色列表
    pub fn default_roles_for_tier(tier: &PlanTier) -> Vec<&'static str> {
        match tier {
            PlanTier::Free => vec!["tenant_admin", "user"],
            PlanTier::Basic => vec!["tenant_admin", "department_manager", "user", "viewer"],
            PlanTier::Advanced => vec![
                "tenant_admin",
                "department_manager",
                "project_manager",
                "user",
                "viewer",
                "auditor",
            ],
        }
    }

    /// 获取指定层级的默认权限集
    pub fn default_permissions_for_tier(tier: &PlanTier) -> Vec<String> {
        let modules = TierFeatureMatrix::modules_for_tier(tier);
        let mut permissions = Vec::new();

        // 基础权限
        permissions.push("system:read".to_string());
        permissions.push("profile:read".to_string());
        permissions.push("profile:write".to_string());

        // 模块权限
        for module in modules {
            permissions.push(format!("{}:read", module.module));
            if tier.includes(&PlanTier::Basic) {
                permissions.push(format!("{}:write", module.module));
            }
            if tier.includes(&PlanTier::Advanced) {
                permissions.push(format!("{}:admin", module.module));
            }
        }

        // 层级特有权限
        match tier {
            PlanTier::Free => {}
            PlanTier::Basic => {
                permissions.push("report:export".to_string());
            }
            PlanTier::Advanced => {
                permissions.push("report:export".to_string());
                permissions.push("ai:use".to_string());
                permissions.push("integration:manage".to_string());
                permissions.push("audit:view".to_string());
            }
        }

        permissions
    }

    /// 检查租户是否有指定模块的访问权限
    pub fn has_module_access(
        subscription: &TenantSubscription,
        module: &str,
    ) -> bool {
        if subscription.status != SubscriptionStatus::Active
            && subscription.status != SubscriptionStatus::Trial
        {
            return false;
        }

        // 检查 features 覆盖
        if let Some(enabled) = subscription.features.get(module) {
            return *enabled;
        }

        // 默认按 tier 判断
        TierFeatureMatrix::is_module_available(module, &subscription.plan_tier)
    }

    /// 权限同步结果
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct PermissionSyncResult {
        pub tenant_id: Uuid,
        pub plan_tier: PlanTier,
        pub roles_synced: Vec<String>,
        pub permissions_synced: usize,
        pub modules_enabled: Vec<String>,
        pub modules_disabled: Vec<String>,
    }

    /// 为租户同步默认权限集（基于 plan tier）
    ///
    /// 在租户创建或升级时调用，根据 plan tier 自动分配默认角色和权限集。
    ///
    /// # 注意
    /// 当前实现为框架版本，返回应同步的角色和权限列表。
    /// 实际写入数据库（core_roles/core_permissions/core_role_permissions/core_user_roles）
    /// 需结合现有权限系统的 schema 约束后续完善。
    pub fn sync_permissions_for_tenant(
        tenant_id: Uuid,
        plan_tier: &PlanTier,
    ) -> PermissionSyncResult {
        let roles = Self::default_roles_for_tier(plan_tier);
        let permissions = Self::default_permissions_for_tier(plan_tier);
        let enabled_modules = TierFeatureMatrix::modules_for_tier(plan_tier)
            .into_iter()
            .map(|m| m.module)
            .collect();
        let disabled_modules = TierFeatureMatrix::modules_not_for_tier(plan_tier)
            .into_iter()
            .map(|m| m.module)
            .collect();

        tracing::info!(
            "Permission sync for tenant {}: tier={}, roles={:?}, permissions={}",
            tenant_id,
            plan_tier,
            roles,
            permissions.len()
        );

        PermissionSyncResult {
            tenant_id,
            plan_tier: *plan_tier,
            roles_synced: roles.into_iter().map(|r| r.to_string()).collect(),
            permissions_synced: permissions.len(),
            modules_enabled,
            modules_disabled,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plan_tier_from_str() {
        assert_eq!(PlanTier::from_str("free"), Some(PlanTier::Free));
        assert_eq!(PlanTier::from_str("basic"), Some(PlanTier::Basic));
        assert_eq!(PlanTier::from_str("advanced"), Some(PlanTier::Advanced));
        assert_eq!(PlanTier::from_str("enterprise"), None);
    }

    #[test]
    fn test_plan_tier_includes() {
        assert!(PlanTier::Advanced.includes(&PlanTier::Free));
        assert!(PlanTier::Advanced.includes(&PlanTier::Basic));
        assert!(PlanTier::Advanced.includes(&PlanTier::Advanced));
        assert!(PlanTier::Basic.includes(&PlanTier::Free));
        assert!(!PlanTier::Basic.includes(&PlanTier::Advanced));
        assert!(!PlanTier::Free.includes(&PlanTier::Basic));
    }

    #[test]
    fn test_tier_feature_matrix_all_modules() {
        let modules = TierFeatureMatrix::all_modules();
        assert!(!modules.is_empty());
        // 至少包含 free/basic/advanced 三层
        let has_free = modules.iter().any(|m| m.min_tier == PlanTier::Free);
        let has_basic = modules.iter().any(|m| m.min_tier == PlanTier::Basic);
        let has_advanced = modules.iter().any(|m| m.min_tier == PlanTier::Advanced);
        assert!(has_free);
        assert!(has_basic);
        assert!(has_advanced);
    }

    #[test]
    fn test_modules_for_tier() {
        let free_modules = TierFeatureMatrix::modules_for_tier(&PlanTier::Free);
        let basic_modules = TierFeatureMatrix::modules_for_tier(&PlanTier::Basic);
        let advanced_modules = TierFeatureMatrix::modules_for_tier(&PlanTier::Advanced);

        // advanced 应该包含最多模块
        assert!(advanced_modules.len() >= basic_modules.len());
        assert!(basic_modules.len() >= free_modules.len());

        // free 模块应该在 basic 和 advanced 中都有
        for m in &free_modules {
            assert!(basic_modules.iter().any(|bm| bm.module == m.module));
            assert!(advanced_modules.iter().any(|am| am.module == m.module));
        }
    }

    #[test]
    fn test_is_module_available() {
        assert!(TierFeatureMatrix::is_module_available("iam", &PlanTier::Free));
        assert!(TierFeatureMatrix::is_module_available("mes", &PlanTier::Basic));
        assert!(!TierFeatureMatrix::is_module_available("mes", &PlanTier::Free));
        assert!(TierFeatureMatrix::is_module_available("ai", &PlanTier::Advanced));
        assert!(!TierFeatureMatrix::is_module_available("ai", &PlanTier::Basic));
    }

    #[test]
    fn test_default_roles_for_tier() {
        let free_roles = TierPermissionService::default_roles_for_tier(&PlanTier::Free);
        let basic_roles = TierPermissionService::default_roles_for_tier(&PlanTier::Basic);
        let advanced_roles = TierPermissionService::default_roles_for_tier(&PlanTier::Advanced);

        assert!(advanced_roles.len() >= basic_roles.len());
        assert!(basic_roles.len() >= free_roles.len());
    }

    #[test]
    fn test_default_permissions_for_tier() {
        let free_perms = TierPermissionService::default_permissions_for_tier(&PlanTier::Free);
        let basic_perms = TierPermissionService::default_permissions_for_tier(&PlanTier::Basic);
        let advanced_perms = TierPermissionService::default_permissions_for_tier(&PlanTier::Advanced);

        assert!(advanced_perms.len() >= basic_perms.len());
        assert!(basic_perms.len() >= free_perms.len());

        // advanced 应该有 ai:use 权限
        assert!(advanced_perms.contains(&"ai:use".to_string()));
        assert!(!free_perms.contains(&"ai:use".to_string()));
    }

    #[test]
    fn test_has_module_access() {
        let mut subscription = TenantSubscription {
            tenant_id: Uuid::new_v4(),
            plan_tier: PlanTier::Basic,
            status: SubscriptionStatus::Active,
            features: HashMap::new(),
            started_at: None,
            expires_at: None,
        };

        // basic 层级应该有 mes 访问权限
        assert!(TierPermissionService::has_module_access(&subscription, "mes"));
        // basic 层级不应该有 ai 访问权限
        assert!(!TierPermissionService::has_module_access(&subscription, "ai"));

        // features 覆盖
        subscription.features.insert("ai".to_string(), true);
        assert!(TierPermissionService::has_module_access(&subscription, "ai"));

        // 过期订阅不应该有访问权限
        subscription.status = SubscriptionStatus::Expired;
        assert!(!TierPermissionService::has_module_access(&subscription, "mes"));
    }

    // ===== 订阅生命周期服务测试 =====

    fn make_test_subscription(tier: PlanTier, expires_in_days: Option<i64>) -> TenantSubscription {
        let expires_at = expires_in_days.map(|days| {
            chrono::Utc::now() + chrono::Duration::days(days)
        });
        TenantSubscription {
            tenant_id: Uuid::new_v4(),
            plan_tier: tier,
            status: SubscriptionStatus::Active,
            features: HashMap::new(),
            started_at: Some(chrono::Utc::now()),
            expires_at,
        }
    }

    #[test]
    fn test_subscription_is_active() {
        let active = make_test_subscription(PlanTier::Basic, Some(30));
        assert!(SubscriptionLifecycleService::is_active(&active));

        let expired = make_test_subscription(PlanTier::Basic, Some(-1));
        assert!(!SubscriptionLifecycleService::is_active(&expired));

        let cancelled = make_test_subscription(PlanTier::Basic, Some(30));
        let mut cancelled = cancelled;
        cancelled.status = SubscriptionStatus::Cancelled;
        assert!(!SubscriptionLifecycleService::is_active(&cancelled));
    }

    #[test]
    fn test_subscription_is_expiring_soon() {
        let expiring = make_test_subscription(PlanTier::Basic, Some(3));
        assert!(SubscriptionLifecycleService::is_expiring_soon(&expiring));

        let not_expiring = make_test_subscription(PlanTier::Basic, Some(30));
        assert!(!SubscriptionLifecycleService::is_expiring_soon(&not_expiring));

        let expired = make_test_subscription(PlanTier::Basic, Some(-1));
        assert!(!SubscriptionLifecycleService::is_expiring_soon(&expired));
    }

    #[test]
    fn test_subscription_days_remaining() {
        let sub = make_test_subscription(PlanTier::Basic, Some(15));
        let days = SubscriptionLifecycleService::days_remaining(&sub);
        assert!(days.is_some());
        assert!(days.unwrap() <= 15);
        assert!(days.unwrap() >= 14);

        let no_expiry = make_test_subscription(PlanTier::Basic, None);
        assert!(SubscriptionLifecycleService::days_remaining(&no_expiry).is_none());
    }

    #[test]
    fn test_subscription_auto_downgrade() {
        let active = make_test_subscription(PlanTier::Advanced, Some(30));
        assert_eq!(
            SubscriptionLifecycleService::auto_downgrade_tier(&active),
            PlanTier::Advanced
        );

        let expired = make_test_subscription(PlanTier::Advanced, Some(-1));
        assert_eq!(
            SubscriptionLifecycleService::auto_downgrade_tier(&expired),
            PlanTier::Free
        );
    }

    #[test]
    fn test_subscription_handle_expiration() {
        let mut sub = make_test_subscription(PlanTier::Advanced, Some(-1));
        let result = SubscriptionLifecycleService::handle_expiration(&mut sub);

        assert_eq!(result.new_status, SubscriptionStatus::Expired);
        assert_eq!(result.new_tier, PlanTier::Free);
        assert!(result.permissions_resynced);
        assert_eq!(sub.status, SubscriptionStatus::Expired);
        assert_eq!(sub.plan_tier, PlanTier::Free);
    }

    #[test]
    fn test_subscription_handle_upgrade() {
        let mut sub = make_test_subscription(PlanTier::Free, Some(30));
        let result = SubscriptionLifecycleService::handle_upgrade(
            &mut sub,
            PlanTier::Advanced,
            Some(365),
        );

        assert_eq!(result.new_tier, PlanTier::Advanced);
        assert_eq!(result.new_status, SubscriptionStatus::Active);
        assert!(result.permissions_resynced);
        assert_eq!(sub.plan_tier, PlanTier::Advanced);
        assert!(sub.expires_at.is_some());
    }

    #[test]
    fn test_subscription_handle_cancellation() {
        let mut sub = make_test_subscription(PlanTier::Advanced, Some(30));
        let result = SubscriptionLifecycleService::handle_cancellation(&mut sub);

        assert_eq!(result.new_status, SubscriptionStatus::Cancelled);
        assert_eq!(result.new_tier, PlanTier::Advanced); // 保持当前 tier 直到到期
        assert!(!result.permissions_resynced);
        assert_eq!(sub.status, SubscriptionStatus::Cancelled);
    }

    #[test]
    fn test_subscription_expiration_reminder() {
        let expiring = make_test_subscription(PlanTier::Basic, Some(3));
        let reminder = SubscriptionLifecycleService::expiration_reminder(&expiring);
        assert!(reminder.is_some());
        assert!(reminder.unwrap().contains("3"));

        let not_expiring = make_test_subscription(PlanTier::Basic, Some(30));
        assert!(SubscriptionLifecycleService::expiration_reminder(&not_expiring).is_none());
    }

    #[test]
    fn test_permission_sync_result() {
        let result = TierPermissionService::sync_permissions_for_tenant(
            Uuid::new_v4(),
            &PlanTier::Basic,
        );
        assert_eq!(result.plan_tier, PlanTier::Basic);
        assert!(!result.roles_synced.is_empty());
        assert!(result.permissions_synced > 0);
        assert!(!result.modules_enabled.is_empty());
    }
}
