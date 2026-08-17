use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{info, warn};
use uuid::Uuid;

/// 特性开关状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FeatureState {
    /// 全局关闭
    Disabled,
    /// 全局开启
    Enabled,
    /// 按条件开启（灰度）
    Conditional,
}

/// 特性开关条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FeatureCondition {
    /// 按租户白名单
    TenantWhitelist(Vec<Uuid>),
    /// 按用户白名单
    UserWhitelist(Vec<Uuid>),
    /// 按用户百分比（0-100）
    UserPercentage(u8),
    /// 按环境（dev/staging/prod）
    Environment(String),
    /// 组合条件（AND）
    And(Vec<FeatureCondition>),
    /// 组合条件（OR）
    Or(Vec<FeatureCondition>),
}

/// 特性开关定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureFlag {
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub state: FeatureState,
    pub conditions: Vec<FeatureCondition>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<String>,
}

/// 特性开关上下文（用于判断是否开启）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureContext {
    pub tenant_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub environment: String,
    pub metadata: HashMap<String, String>,
}

/// 特性开关服务
pub struct FeatureFlagService {
    flags: Arc<RwLock<HashMap<String, FeatureFlag>>>,
}

impl FeatureFlagService {
    pub fn new() -> Self {
        Self {
            flags: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 注册特性开关
    pub fn register(&self, flag: FeatureFlag) {
        let key = flag.key.clone();
        self.flags.write().insert(key.clone(), flag);
        info!("Feature flag registered: {}", key);
    }

    /// 检查特性是否开启
    pub fn is_enabled(&self, key: &str, context: &FeatureContext) -> bool {
        let flags = self.flags.read();
        let flag = match flags.get(key) {
            Some(f) => f,
            None => {
                warn!("Feature flag not found: {}", key);
                return false;
            }
        };

        match flag.state {
            FeatureState::Disabled => false,
            FeatureState::Enabled => true,
            FeatureState::Conditional => self.evaluate_conditions(&flag.conditions, context),
        }
    }

    /// 批量检查多个特性
    pub fn check_multiple(&self, keys: &[&str], context: &FeatureContext) -> HashMap<String, bool> {
        keys.iter()
            .map(|key| (key.to_string(), self.is_enabled(key, context)))
            .collect()
    }

    /// 更新特性状态
    pub fn update_state(&self, key: &str, state: FeatureState) -> bool {
        let mut flags = self.flags.write();
        if let Some(flag) = flags.get_mut(key) {
            flag.state = state;
            flag.updated_at = Utc::now();
            info!("Feature flag updated: {} -> {:?}", key, state);
            true
        } else {
            false
        }
    }

    /// 列出所有特性开关
    pub fn list_all(&self) -> Vec<FeatureFlag> {
        self.flags.read().values().cloned().collect()
    }

    /// 评估条件
    fn evaluate_conditions(
        &self,
        conditions: &[FeatureCondition],
        context: &FeatureContext,
    ) -> bool {
        for condition in conditions {
            if !self.evaluate_condition(condition, context) {
                return false;
            }
        }
        true
    }

    fn evaluate_condition(&self, condition: &FeatureCondition, context: &FeatureContext) -> bool {
        match condition {
            FeatureCondition::TenantWhitelist(tenants) => {
                context.tenant_id.is_some_and(|t| tenants.contains(&t))
            }
            FeatureCondition::UserWhitelist(users) => {
                context.user_id.is_some_and(|u| users.contains(&u))
            }
            FeatureCondition::UserPercentage(percentage) => {
                // 基于用户ID哈希的稳定百分比
                context.user_id.is_some_and(|u| {
                    let hash = Self::hash_uuid(&u);
                    (hash % 100) < *percentage as u64
                })
            }
            FeatureCondition::Environment(env) => context.environment == *env,
            FeatureCondition::And(conditions) => conditions
                .iter()
                .all(|c| self.evaluate_condition(c, context)),
            FeatureCondition::Or(conditions) => conditions
                .iter()
                .any(|c| self.evaluate_condition(c, context)),
        }
    }

    fn hash_uuid(uuid: &Uuid) -> u64 {
        use std::hash::{Hash, Hasher};
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        uuid.hash(&mut hasher);
        hasher.finish()
    }
}

impl Default for FeatureFlagService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_flag(key: &str, state: FeatureState, conditions: Vec<FeatureCondition>) -> FeatureFlag {
        FeatureFlag {
            key: key.to_string(),
            name: key.to_string(),
            description: None,
            state,
            conditions,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: None,
        }
    }

    fn empty_context() -> FeatureContext {
        FeatureContext {
            tenant_id: None,
            user_id: None,
            environment: "test".to_string(),
            metadata: HashMap::new(),
        }
    }

    #[test]
    fn test_feature_state_disabled_returns_false() {
        let svc = FeatureFlagService::new();
        svc.register(make_flag("f1", FeatureState::Disabled, vec![]));
        assert!(!svc.is_enabled("f1", &empty_context()));
    }

    #[test]
    fn test_feature_state_enabled_returns_true() {
        let svc = FeatureFlagService::new();
        svc.register(make_flag("f1", FeatureState::Enabled, vec![]));
        assert!(svc.is_enabled("f1", &empty_context()));
    }

    #[test]
    fn test_feature_flag_not_found_returns_false() {
        let svc = FeatureFlagService::new();
        assert!(!svc.is_enabled("nonexistent", &empty_context()));
    }

    #[test]
    fn test_conditional_tenant_whitelist() {
        let svc = FeatureFlagService::new();
        let t1 = Uuid::new_v4();
        let t2 = Uuid::new_v4();
        svc.register(make_flag(
            "f1",
            FeatureState::Conditional,
            vec![FeatureCondition::TenantWhitelist(vec![t1])],
        ));
        let mut ctx = empty_context();
        ctx.tenant_id = Some(t1);
        assert!(svc.is_enabled("f1", &ctx));
        ctx.tenant_id = Some(t2);
        assert!(!svc.is_enabled("f1", &ctx));
        ctx.tenant_id = None;
        assert!(!svc.is_enabled("f1", &ctx));
    }

    #[test]
    fn test_conditional_user_whitelist() {
        let svc = FeatureFlagService::new();
        let u1 = Uuid::new_v4();
        svc.register(make_flag(
            "f1",
            FeatureState::Conditional,
            vec![FeatureCondition::UserWhitelist(vec![u1])],
        ));
        let mut ctx = empty_context();
        ctx.user_id = Some(u1);
        assert!(svc.is_enabled("f1", &ctx));
        ctx.user_id = Some(Uuid::new_v4());
        assert!(!svc.is_enabled("f1", &ctx));
    }

    #[test]
    fn test_conditional_environment() {
        let svc = FeatureFlagService::new();
        svc.register(make_flag(
            "f1",
            FeatureState::Conditional,
            vec![FeatureCondition::Environment("prod".to_string())],
        ));
        let mut ctx = empty_context();
        ctx.environment = "prod".to_string();
        assert!(svc.is_enabled("f1", &ctx));
        ctx.environment = "dev".to_string();
        assert!(!svc.is_enabled("f1", &ctx));
    }

    #[test]
    fn test_conditional_and_all_true() {
        let svc = FeatureFlagService::new();
        let t = Uuid::new_v4();
        svc.register(make_flag(
            "f1",
            FeatureState::Conditional,
            vec![FeatureCondition::And(vec![
                FeatureCondition::TenantWhitelist(vec![t]),
                FeatureCondition::Environment("prod".to_string()),
            ])],
        ));
        let mut ctx = empty_context();
        ctx.tenant_id = Some(t);
        ctx.environment = "prod".to_string();
        assert!(svc.is_enabled("f1", &ctx));
        ctx.environment = "dev".to_string();
        assert!(!svc.is_enabled("f1", &ctx));
    }

    #[test]
    fn test_conditional_or_any_true() {
        let svc = FeatureFlagService::new();
        let t1 = Uuid::new_v4();
        let t2 = Uuid::new_v4();
        svc.register(make_flag(
            "f1",
            FeatureState::Conditional,
            vec![FeatureCondition::Or(vec![
                FeatureCondition::TenantWhitelist(vec![t1]),
                FeatureCondition::TenantWhitelist(vec![t2]),
            ])],
        ));
        let mut ctx = empty_context();
        ctx.tenant_id = Some(t2);
        assert!(svc.is_enabled("f1", &ctx));
    }

    #[test]
    fn test_update_state_changes_behavior() {
        let svc = FeatureFlagService::new();
        svc.register(make_flag("f1", FeatureState::Disabled, vec![]));
        assert!(!svc.is_enabled("f1", &empty_context()));
        assert!(svc.update_state("f1", FeatureState::Enabled));
        assert!(svc.is_enabled("f1", &empty_context()));
    }

    #[test]
    fn test_update_state_unknown_key_returns_false() {
        let svc = FeatureFlagService::new();
        assert!(!svc.update_state("missing", FeatureState::Enabled));
    }

    #[test]
    fn test_check_multiple_batch() {
        let svc = FeatureFlagService::new();
        svc.register(make_flag("a", FeatureState::Enabled, vec![]));
        svc.register(make_flag("b", FeatureState::Disabled, vec![]));
        let result = svc.check_multiple(&["a", "b", "c"], &empty_context());
        assert!(*result.get("a").unwrap());
        assert!(!(*result.get("b").unwrap()));
        assert!(!(*result.get("c").unwrap()));
    }

    #[test]
    fn test_list_all_returns_registered() {
        let svc = FeatureFlagService::new();
        svc.register(make_flag("a", FeatureState::Enabled, vec![]));
        svc.register(make_flag("b", FeatureState::Disabled, vec![]));
        assert_eq!(svc.list_all().len(), 2);
    }

    #[test]
    fn test_conditional_user_percentage_stable_for_user() {
        let svc = FeatureFlagService::new();
        svc.register(make_flag(
            "f1",
            FeatureState::Conditional,
            vec![FeatureCondition::UserPercentage(100)],
        ));
        let mut ctx = empty_context();
        ctx.user_id = Some(Uuid::new_v4());
        // 100% 应该对所有用户开启
        assert!(svc.is_enabled("f1", &ctx));
    }

    #[test]
    fn test_conditional_user_percentage_zero_disables() {
        let svc = FeatureFlagService::new();
        svc.register(make_flag(
            "f1",
            FeatureState::Conditional,
            vec![FeatureCondition::UserPercentage(0)],
        ));
        let mut ctx = empty_context();
        ctx.user_id = Some(Uuid::new_v4());
        assert!(!svc.is_enabled("f1", &ctx));
    }
}
