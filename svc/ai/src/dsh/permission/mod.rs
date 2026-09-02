//! DSH AI 权限映射适配器模块
//!
//! 提供 TOPEMS RBAC 权限到 MCP 权限模型的映射、租户隔离校验、操作类型校验、权限缓存等能力。

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info};

// ============================================================================
// 类型定义
// ============================================================================

/// 权限检查结果
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PermissionResult {
    /// 允许
    Allow,
    /// 拒绝
    Deny,
    /// 未找到权限规则
    NotFound,
}

/// 操作类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum OperationType {
    /// 读取
    Read,
    /// 写入
    Write,
    /// 执行
    Execute,
    /// 管理
    Admin,
    /// 订阅
    Subscribe,
    /// 自定义
    Custom,
}

impl OperationType {
    pub fn as_str(&self) -> &str {
        match self {
            OperationType::Read => "read",
            OperationType::Write => "write",
            OperationType::Execute => "execute",
            OperationType::Admin => "admin",
            OperationType::Subscribe => "subscribe",
            OperationType::Custom => "custom",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "read" => OperationType::Read,
            "write" => OperationType::Write,
            "execute" => OperationType::Execute,
            "admin" => OperationType::Admin,
            "subscribe" => OperationType::Subscribe,
            _ => OperationType::Custom,
        }
    }
}

/// 资源类型
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ResourceCategory {
    /// MCP 工具
    McpTool,
    /// MCP 资源
    McpResource,
    /// MCP 提示词
    McpPrompt,
    /// Agent
    Agent,
    /// 工作流
    Workflow,
    /// 知识图谱
    KnowledgeGraph,
    /// RAG 检索
    RagRetrieval,
    /// 自定义
    Custom(String),
}

/// 权限规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionRule {
    /// 规则 ID
    pub rule_id: String,
    /// 角色名称
    pub role: String,
    /// 资源类别
    pub resource_category: ResourceCategory,
    /// 资源模式（支持通配符 *）
    pub resource_pattern: String,
    /// 允许的操作
    pub allowed_operations: Vec<OperationType>,
    /// 是否允许（true=允许，false=拒绝）
    pub effect: bool,
    /// 优先级（数字越大优先级越高）
    pub priority: u32,
    /// 规则描述
    pub description: String,
    /// 是否启用
    pub enabled: bool,
    /// 创建时间
    pub created_at: String,
}

/// 角色定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleDefinition {
    /// 角色名称
    pub name: String,
    /// 角色描述
    pub description: String,
    /// 继承的角色列表
    pub inherits_from: Vec<String>,
    /// 是否为系统角色（不可删除）
    pub is_system: bool,
    /// 创建时间
    pub created_at: String,
}

/// 权限检查请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionCheckRequest {
    /// 用户 ID
    pub user_id: String,
    /// 租户 ID
    pub tenant_id: String,
    /// 角色列表
    pub roles: Vec<String>,
    /// 资源类别
    pub resource_category: ResourceCategory,
    /// 资源 ID
    pub resource_id: String,
    /// 操作类型
    pub operation: OperationType,
}

/// 权限检查响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionCheckResponse {
    /// 是否允许
    pub allowed: bool,
    /// 结果
    pub result: PermissionResult,
    /// 匹配的规则 ID
    pub matched_rule_id: Option<String>,
    /// 拒绝原因
    pub reason: Option<String>,
    /// 检查耗时（毫秒）
    pub check_duration_ms: u64,
}

/// 权限缓存条目
#[derive(Debug, Clone)]
struct CacheEntry {
    /// 权限结果
    result: PermissionResult,
    /// 匹配的规则 ID
    matched_rule_id: Option<String>,
    /// 缓存时间
    cached_at: Instant,
}

/// 权限映射配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionMapperConfig {
    /// 是否启用
    pub enabled: bool,
    /// 是否启用租户隔离
    pub enable_tenant_isolation: bool,
    /// 是否启用权限缓存
    pub enable_cache: bool,
    /// 缓存 TTL（秒）
    pub cache_ttl_seconds: u64,
    /// 缓存最大条目数
    pub cache_max_entries: usize,
    /// 默认策略（未找到规则时的默认行为）
    pub default_policy: PermissionResult,
    /// 是否记录权限检查日志
    pub enable_audit_log: bool,
}

impl Default for PermissionMapperConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            enable_tenant_isolation: true,
            enable_cache: true,
            cache_ttl_seconds: 300,
            cache_max_entries: 10000,
            default_policy: PermissionResult::Deny,
            enable_audit_log: true,
        }
    }
}

/// 权限映射器统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionMapperStats {
    /// 总检查次数
    pub total_checks: u64,
    /// 允许次数
    pub allowed_count: u64,
    /// 拒绝次数
    pub denied_count: u64,
    /// 缓存命中次数
    pub cache_hits: u64,
    /// 缓存未命中次数
    pub cache_misses: u64,
    /// 缓存命中率
    pub cache_hit_rate: f64,
    /// 权限规则数
    pub total_rules: u64,
    /// 角色数
    pub total_roles: u64,
}

// ============================================================================
// 权限映射器
// ============================================================================

/// 权限映射适配器
#[derive(Clone)]
pub struct PermissionMapper {
    /// 配置
    config: PermissionMapperConfig,
    /// 权限规则（规则 ID -> 规则）
    rules: Arc<Mutex<HashMap<String, PermissionRule>>>,
    /// 角色定义（角色名 -> 角色定义）
    roles: Arc<Mutex<HashMap<String, RoleDefinition>>>,
    /// 权限缓存（缓存键 -> 缓存条目）
    cache: Arc<Mutex<HashMap<String, CacheEntry>>>,
    /// 统计
    stats: Arc<Mutex<PermissionMapperStats>>,
}

impl PermissionMapper {
    /// 创建新的权限映射器
    pub fn new(config: PermissionMapperConfig) -> Self {
        let stats = PermissionMapperStats {
            total_checks: 0,
            allowed_count: 0,
            denied_count: 0,
            cache_hits: 0,
            cache_misses: 0,
            cache_hit_rate: 0.0,
            total_rules: 0,
            total_roles: 0,
        };

        let mapper = Self {
            config,
            rules: Arc::new(Mutex::new(HashMap::new())),
            roles: Arc::new(Mutex::new(HashMap::new())),
            cache: Arc::new(Mutex::new(HashMap::new())),
            stats: Arc::new(Mutex::new(stats)),
        };

        // 初始化默认角色和规则
        mapper.init_defaults();

        mapper
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(PermissionMapperConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &PermissionMapperConfig {
        &self.config
    }

    /// 初始化默认角色和规则
    fn init_defaults(&self) {
        // 默认角色
        let default_roles = vec![
            RoleDefinition {
                name: "admin".to_string(),
                description: "系统管理员，拥有所有权限".to_string(),
                inherits_from: vec![],
                is_system: true,
                created_at: chrono::Utc::now().to_rfc3339(),
            },
            RoleDefinition {
                name: "user".to_string(),
                description: "普通用户，拥有基本权限".to_string(),
                inherits_from: vec![],
                is_system: true,
                created_at: chrono::Utc::now().to_rfc3339(),
            },
            RoleDefinition {
                name: "viewer".to_string(),
                description: "只读用户，仅拥有读取权限".to_string(),
                inherits_from: vec![],
                is_system: true,
                created_at: chrono::Utc::now().to_rfc3339(),
            },
        ];

        for role in default_roles {
            self.roles.lock().insert(role.name.clone(), role);
        }

        // 默认规则 - admin 拥有所有权限
        self.add_rule(PermissionRule {
            rule_id: "default_admin_all".to_string(),
            role: "admin".to_string(),
            resource_category: ResourceCategory::Custom("*".to_string()),
            resource_pattern: "*".to_string(),
            allowed_operations: vec![
                OperationType::Read,
                OperationType::Write,
                OperationType::Execute,
                OperationType::Admin,
                OperationType::Subscribe,
            ],
            effect: true,
            priority: 1000,
            description: "管理员拥有所有权限".to_string(),
            enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        });

        // 默认规则 - user 拥有基本读写权限
        self.add_rule(PermissionRule {
            rule_id: "default_user_read".to_string(),
            role: "user".to_string(),
            resource_category: ResourceCategory::Custom("*".to_string()),
            resource_pattern: "*".to_string(),
            allowed_operations: vec![OperationType::Read, OperationType::Execute],
            effect: true,
            priority: 100,
            description: "普通用户拥有读取和执行权限".to_string(),
            enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        });

        // 默认规则 - viewer 拥有只读权限
        self.add_rule(PermissionRule {
            rule_id: "default_viewer_read".to_string(),
            role: "viewer".to_string(),
            resource_category: ResourceCategory::Custom("*".to_string()),
            resource_pattern: "*".to_string(),
            allowed_operations: vec![OperationType::Read],
            effect: true,
            priority: 50,
            description: "只读用户仅拥有读取权限".to_string(),
            enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        });

        info!("Default roles and rules initialized");
    }

    /// 添加权限规则
    pub fn add_rule(&self, rule: PermissionRule) -> String {
        let rule_id = rule.rule_id.clone();
        self.rules.lock().insert(rule_id.clone(), rule);
        self.stats.lock().total_rules += 1;
        debug!(rule_id = %rule_id, "Permission rule added");
        rule_id
    }

    /// 获取权限规则
    pub fn get_rule(&self, rule_id: &str) -> Option<PermissionRule> {
        self.rules.lock().get(rule_id).cloned()
    }

    /// 删除权限规则
    pub fn remove_rule(&self, rule_id: &str) -> bool {
        let removed = self.rules.lock().remove(rule_id).is_some();
        if removed {
            self.stats.lock().total_rules -= 1;
            // 清除缓存
            self.cache.lock().clear();
            debug!(rule_id = %rule_id, "Permission rule removed");
        }
        removed
    }

    /// 列出所有权限规则
    pub fn list_rules(&self, role_filter: Option<&str>) -> Vec<PermissionRule> {
        let rules = self.rules.lock();
        let mut result: Vec<PermissionRule> = if let Some(role) = role_filter {
            rules.values().filter(|r| r.role == role).cloned().collect()
        } else {
            rules.values().cloned().collect()
        };
        result.sort_by(|a, b| b.priority.cmp(&a.priority));
        result
    }

    /// 添加角色
    pub fn add_role(&self, role: RoleDefinition) {
        self.roles.lock().insert(role.name.clone(), role);
        self.stats.lock().total_roles += 1;
    }

    /// 获取角色
    pub fn get_role(&self, role_name: &str) -> Option<RoleDefinition> {
        self.roles.lock().get(role_name).cloned()
    }

    /// 获取角色及其继承的所有角色
    pub fn get_effective_roles(&self, role_name: &str) -> Vec<String> {
        let mut result = vec![role_name.to_string()];
        let mut visited = HashSet::new();
        visited.insert(role_name.to_string());

        let mut queue = vec![role_name.to_string()];
        while let Some(current) = queue.pop() {
            if let Some(role) = self.roles.lock().get(&current) {
                for inherited in &role.inherits_from {
                    if !visited.contains(inherited) {
                        visited.insert(inherited.clone());
                        result.push(inherited.clone());
                        queue.push(inherited.clone());
                    }
                }
            }
        }

        result
    }

    /// 检查权限
    pub fn check_permission(&self, request: PermissionCheckRequest) -> PermissionCheckResponse {
        let start = Instant::now();

        if !self.config.enabled {
            return PermissionCheckResponse {
                allowed: true,
                result: PermissionResult::Allow,
                matched_rule_id: None,
                reason: Some("权限检查未启用".to_string()),
                check_duration_ms: start.elapsed().as_micros() as u64 / 1000,
            };
        }

        // 租户隔离检查
        if self.config.enable_tenant_isolation && request.tenant_id.is_empty() {
            return PermissionCheckResponse {
                allowed: false,
                result: PermissionResult::Deny,
                matched_rule_id: None,
                reason: Some("租户 ID 不能为空".to_string()),
                check_duration_ms: start.elapsed().as_micros() as u64 / 1000,
            };
        }

        // 生成缓存键
        let cache_key = format!(
            "{}:{}:{:?}:{}:{}",
            request.tenant_id,
            request.roles.join(","),
            request.resource_category,
            request.resource_id,
            request.operation.as_str()
        );

        // 检查缓存
        if self.config.enable_cache {
            if let Some(cache_entry) = self.cache.lock().get(&cache_key) {
                if cache_entry.cached_at.elapsed()
                    < Duration::from_secs(self.config.cache_ttl_seconds)
                {
                    let mut stats = self.stats.lock();
                    stats.total_checks += 1;
                    stats.cache_hits += 1;
                    if cache_entry.result == PermissionResult::Allow {
                        stats.allowed_count += 1;
                    } else {
                        stats.denied_count += 1;
                    }
                    drop(stats);

                    return PermissionCheckResponse {
                        allowed: cache_entry.result == PermissionResult::Allow,
                        result: cache_entry.result,
                        matched_rule_id: cache_entry.matched_rule_id.clone(),
                        reason: None,
                        check_duration_ms: start.elapsed().as_micros() as u64 / 1000,
                    };
                }
            }
        }

        // 获取有效角色（包括继承的角色）
        let mut effective_roles = Vec::new();
        for role in &request.roles {
            effective_roles.extend(self.get_effective_roles(role));
        }
        effective_roles.dedup();

        // 匹配规则
        let rules = self.rules.lock();
        let mut matched_rules: Vec<&PermissionRule> = rules
            .values()
            .filter(|r| {
                r.enabled
                    && effective_roles.contains(&r.role)
                    && self
                        .match_resource_category(&r.resource_category, &request.resource_category)
                    && self.match_resource_pattern(&r.resource_pattern, &request.resource_id)
                    && r.allowed_operations.contains(&request.operation)
            })
            .collect();

        // 按优先级排序
        matched_rules.sort_by(|a, b| b.priority.cmp(&a.priority));

        let (result, matched_rule_id, reason) = if let Some(rule) = matched_rules.first() {
            if rule.effect {
                (PermissionResult::Allow, Some(rule.rule_id.clone()), None)
            } else {
                (
                    PermissionResult::Deny,
                    Some(rule.rule_id.clone()),
                    Some(format!("规则 {} 拒绝该操作", rule.rule_id)),
                )
            }
        } else {
            (
                self.config.default_policy,
                None,
                Some("未找到匹配的权限规则".to_string()),
            )
        };

        drop(rules);

        // 更新缓存
        if self.config.enable_cache {
            let mut cache = self.cache.lock();
            if cache.len() >= self.config.cache_max_entries {
                // 简单的 LRU：清除一半缓存
                let keys: Vec<String> = cache.keys().take(cache.len() / 2).cloned().collect();
                for key in keys {
                    cache.remove(&key);
                }
            }
            cache.insert(
                cache_key,
                CacheEntry {
                    result,
                    matched_rule_id: matched_rule_id.clone(),
                    cached_at: Instant::now(),
                },
            );
            drop(cache);
        }

        // 更新统计
        let mut stats = self.stats.lock();
        stats.total_checks += 1;
        stats.cache_misses += 1;
        if result == PermissionResult::Allow {
            stats.allowed_count += 1;
        } else {
            stats.denied_count += 1;
        }
        drop(stats);

        PermissionCheckResponse {
            allowed: result == PermissionResult::Allow,
            result,
            matched_rule_id,
            reason,
            check_duration_ms: start.elapsed().as_micros() as u64 / 1000,
        }
    }

    /// 匹配资源类别
    fn match_resource_category(
        &self,
        rule_category: &ResourceCategory,
        request_category: &ResourceCategory,
    ) -> bool {
        match rule_category {
            ResourceCategory::Custom(pattern) if pattern == "*" => true,
            _ => rule_category == request_category,
        }
    }

    /// 匹配资源模式（支持通配符 *）
    fn match_resource_pattern(&self, pattern: &str, resource_id: &str) -> bool {
        if pattern == "*" {
            return true;
        }

        // 简单的通配符匹配
        if pattern.ends_with('*') {
            let prefix = &pattern[..pattern.len() - 1];
            return resource_id.starts_with(prefix);
        }

        if pattern.starts_with('*') {
            let suffix = &pattern[1..];
            return resource_id.ends_with(suffix);
        }

        pattern == resource_id
    }

    /// 清除权限缓存
    pub fn clear_cache(&self) {
        self.cache.lock().clear();
        info!("Permission cache cleared");
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> PermissionMapperStats {
        let mut stats = self.stats.lock().clone();
        stats.total_rules = self.rules.lock().len() as u64;
        stats.total_roles = self.roles.lock().len() as u64;

        if stats.cache_hits + stats.cache_misses > 0 {
            stats.cache_hit_rate =
                stats.cache_hits as f64 / (stats.cache_hits + stats.cache_misses) as f64;
        }

        stats
    }
}

use std::collections::HashSet;

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_mapper() -> PermissionMapper {
        PermissionMapper::with_defaults()
    }

    #[test]
    fn test_operation_type_as_str() {
        assert_eq!(OperationType::Read.as_str(), "read");
        assert_eq!(OperationType::Write.as_str(), "write");
        assert_eq!(OperationType::Execute.as_str(), "execute");
        assert_eq!(OperationType::Admin.as_str(), "admin");
    }

    #[test]
    fn test_operation_type_from_str() {
        assert_eq!(OperationType::from_str("read"), OperationType::Read);
        assert_eq!(OperationType::from_str("write"), OperationType::Write);
        assert_eq!(OperationType::from_str("unknown"), OperationType::Custom);
    }

    #[test]
    fn test_permission_mapper_config_default() {
        let config = PermissionMapperConfig::default();
        assert!(config.enabled);
        assert!(config.enable_tenant_isolation);
        assert!(config.enable_cache);
        assert_eq!(config.cache_ttl_seconds, 300);
    }

    #[test]
    fn test_mapper_creation() {
        let mapper = create_test_mapper();
        assert!(mapper.config().enabled);
    }

    #[test]
    fn test_default_roles() {
        let mapper = create_test_mapper();
        assert!(mapper.get_role("admin").is_some());
        assert!(mapper.get_role("user").is_some());
        assert!(mapper.get_role("viewer").is_some());
    }

    #[test]
    fn test_default_rules() {
        let mapper = create_test_mapper();
        let rules = mapper.list_rules(None);
        assert!(!rules.is_empty());
    }

    #[test]
    fn test_admin_permission() {
        let mapper = create_test_mapper();
        let request = PermissionCheckRequest {
            user_id: "user1".to_string(),
            tenant_id: "tenant1".to_string(),
            roles: vec!["admin".to_string()],
            resource_category: ResourceCategory::McpTool,
            resource_id: "test_tool".to_string(),
            operation: OperationType::Execute,
        };

        let response = mapper.check_permission(request);
        assert!(response.allowed);
        assert_eq!(response.result, PermissionResult::Allow);
    }

    #[test]
    fn test_user_permission() {
        let mapper = create_test_mapper();
        let request = PermissionCheckRequest {
            user_id: "user1".to_string(),
            tenant_id: "tenant1".to_string(),
            roles: vec!["user".to_string()],
            resource_category: ResourceCategory::McpTool,
            resource_id: "test_tool".to_string(),
            operation: OperationType::Read,
        };

        let response = mapper.check_permission(request);
        assert!(response.allowed);
    }

    #[test]
    fn test_viewer_write_denied() {
        let mapper = create_test_mapper();
        let request = PermissionCheckRequest {
            user_id: "user1".to_string(),
            tenant_id: "tenant1".to_string(),
            roles: vec!["viewer".to_string()],
            resource_category: ResourceCategory::McpTool,
            resource_id: "test_tool".to_string(),
            operation: OperationType::Write,
        };

        let response = mapper.check_permission(request);
        assert!(!response.allowed);
        assert_eq!(response.result, PermissionResult::Deny);
    }

    #[test]
    fn test_tenant_isolation() {
        let mapper = create_test_mapper();
        let request = PermissionCheckRequest {
            user_id: "user1".to_string(),
            tenant_id: "".to_string(), // 空租户 ID
            roles: vec!["admin".to_string()],
            resource_category: ResourceCategory::McpTool,
            resource_id: "test_tool".to_string(),
            operation: OperationType::Execute,
        };

        let response = mapper.check_permission(request);
        assert!(!response.allowed);
    }

    #[test]
    fn test_add_custom_rule() {
        let mapper = create_test_mapper();

        let custom_role = RoleDefinition {
            name: "custom_role".to_string(),
            description: "自定义角色".to_string(),
            inherits_from: vec!["user".to_string()],
            is_system: false,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        mapper.add_role(custom_role);

        let custom_rule = PermissionRule {
            rule_id: "custom_rule_1".to_string(),
            role: "custom_role".to_string(),
            resource_category: ResourceCategory::McpTool,
            resource_pattern: "custom_*".to_string(),
            allowed_operations: vec![OperationType::Write],
            effect: true,
            priority: 200,
            description: "自定义规则".to_string(),
            enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        mapper.add_rule(custom_rule);

        let request = PermissionCheckRequest {
            user_id: "user1".to_string(),
            tenant_id: "tenant1".to_string(),
            roles: vec!["custom_role".to_string()],
            resource_category: ResourceCategory::McpTool,
            resource_id: "custom_tool".to_string(),
            operation: OperationType::Write,
        };

        let response = mapper.check_permission(request);
        assert!(response.allowed);
    }

    #[test]
    fn test_role_inheritance() {
        let mapper = create_test_mapper();

        let custom_role = RoleDefinition {
            name: "senior_user".to_string(),
            description: "高级用户".to_string(),
            inherits_from: vec!["user".to_string()],
            is_system: false,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        mapper.add_role(custom_role);

        let effective_roles = mapper.get_effective_roles("senior_user");
        assert!(effective_roles.contains(&"senior_user".to_string()));
        assert!(effective_roles.contains(&"user".to_string()));
    }

    #[test]
    fn test_cache_hit() {
        let mapper = create_test_mapper();

        let request = PermissionCheckRequest {
            user_id: "user1".to_string(),
            tenant_id: "tenant1".to_string(),
            roles: vec!["admin".to_string()],
            resource_category: ResourceCategory::McpTool,
            resource_id: "test_tool".to_string(),
            operation: OperationType::Execute,
        };

        // 第一次检查（缓存未命中）
        let _ = mapper.check_permission(request.clone());

        // 第二次检查（缓存命中）
        let _ = mapper.check_permission(request.clone());

        let stats = mapper.get_stats();
        assert!(stats.cache_hits >= 1);
    }

    #[test]
    fn test_clear_cache() {
        let mapper = create_test_mapper();

        let request = PermissionCheckRequest {
            user_id: "user1".to_string(),
            tenant_id: "tenant1".to_string(),
            roles: vec!["admin".to_string()],
            resource_category: ResourceCategory::McpTool,
            resource_id: "test_tool".to_string(),
            operation: OperationType::Execute,
        };

        let _ = mapper.check_permission(request);
        mapper.clear_cache();

        let stats = mapper.get_stats();
        assert_eq!(stats.cache_hits, 0); // 清除缓存后，之前的缓存命中不计入新的检查
    }

    #[test]
    fn test_get_stats() {
        let mapper = create_test_mapper();

        let request = PermissionCheckRequest {
            user_id: "user1".to_string(),
            tenant_id: "tenant1".to_string(),
            roles: vec!["admin".to_string()],
            resource_category: ResourceCategory::McpTool,
            resource_id: "test_tool".to_string(),
            operation: OperationType::Execute,
        };

        let _ = mapper.check_permission(request);

        let stats = mapper.get_stats();
        assert!(stats.total_checks >= 1);
        assert!(stats.total_rules > 0);
        assert!(stats.total_roles > 0);
    }

    #[test]
    fn test_remove_rule() {
        let mapper = create_test_mapper();

        let rule = PermissionRule {
            rule_id: "temp_rule".to_string(),
            role: "user".to_string(),
            resource_category: ResourceCategory::McpTool,
            resource_pattern: "temp_*".to_string(),
            allowed_operations: vec![OperationType::Admin],
            effect: true,
            priority: 500,
            description: "临时规则".to_string(),
            enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        mapper.add_rule(rule);

        assert!(mapper.get_rule("temp_rule").is_some());
        assert!(mapper.remove_rule("temp_rule"));
        assert!(mapper.get_rule("temp_rule").is_none());
    }

    #[test]
    fn test_list_rules_by_role() {
        let mapper = create_test_mapper();
        let admin_rules = mapper.list_rules(Some("admin"));
        assert!(!admin_rules.is_empty());
        assert!(admin_rules.iter().all(|r| r.role == "admin"));
    }
}
