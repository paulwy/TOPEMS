// V21.0 统一权限中心客户端
// =============================================================================
//
// 各服务通过此客户端与 IAM 权限中心交互：
// 1. 启动时拉取全量权限元数据并缓存
// 2. 订阅 PermissionMetadataChangedEvent 实时更新缓存
// 3. 提供权限查询接口（检查权限是否存在、获取模块所有权限等）

use crate::permission::{PermissionMetadata, PermissionMetadataCache};
use std::sync::Arc;
use topems_shared_core::error::TopemsError;
use topems_shared_event::event::{EventType, PermissionMetadataChangedPayload, RabbitMqSubscriber};
use topems_shared_observability::telemetry::TracedRequestExt;
use tracing::{error, info, warn};

/// V21.0: 统一权限中心客户端
///
/// 封装与 IAM 权限中心的交互逻辑，提供权限元数据缓存和实时同步能力。
///
/// 使用方式：
/// ```ignore
/// let client = PermissionCenterClient::new("erp");
/// client.initialize(&db).await?;
/// client.start_event_subscription(subscriber).await?;
/// ```
pub struct PermissionCenterClient {
    /// 服务名称（用于标识订阅者）
    service_name: String,
    /// 权限元数据缓存
    cache: Arc<PermissionMetadataCache>,
}

impl PermissionCenterClient {
    pub fn new(service_name: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            cache: Arc::new(PermissionMetadataCache::new()),
        }
    }

    /// 获取权限元数据缓存引用
    pub fn cache(&self) -> &Arc<PermissionMetadataCache> {
        &self.cache
    }

    /// V21.0: 初始化权限元数据缓存
    ///
    /// 从本地内置权限定义初始化缓存（无需 IAM 服务可用）。
    /// 后续可通过事件订阅实时更新。
    ///
    /// 设计决策：不强制依赖 IAM 服务在线，使用本地内置权限定义作为 fallback，
    /// 保证服务启动的健壮性。
    pub async fn initialize(&self) -> Result<(), TopemsError> {
        info!(
            "Initializing permission metadata cache for service: {}",
            self.service_name
        );

        // 从内置权限定义生成元数据
        let metadata_list = self.build_builtin_permissions();
        self.cache.load_all(metadata_list);

        let stats = self.cache.stats();
        info!(
            "Permission metadata cache initialized: {} permissions across {} modules",
            stats.total_permissions, stats.total_modules
        );

        Ok(())
    }

    /// V21.0: 从 IAM 服务拉取全量权限元数据（远程模式）
    ///
    /// 从 IAM 服务拉取最新权限元数据。
    /// 失败时保留本地缓存，不影响服务启动。
    pub async fn fetch_from_iam(&self, iam_url: &str) -> Result<(), TopemsError> {
        info!("Fetching permission metadata from IAM service: {}", iam_url);

        let url = format!("{}/permissions/metadata", iam_url);
        let client = reqwest::Client::new();

        match client.get(&url).with_trace().send().await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<serde_json::Value>().await {
                        Ok(json) => {
                            if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
                                let mut permissions: Vec<PermissionMetadata> = Vec::new();
                                for item in data {
                                    let code = item
                                        .get("code")
                                        .and_then(|c| c.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let name = item
                                        .get("name")
                                        .and_then(|n| n.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let category = item
                                        .get("category")
                                        .and_then(|c| c.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let resource = item
                                        .get("resource")
                                        .and_then(|r| r.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let action = item
                                        .get("action")
                                        .and_then(|a| a.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let description = item
                                        .get("description")
                                        .and_then(|d| d.as_str())
                                        .map(|s| s.to_string());

                                    permissions.push(PermissionMetadata {
                                        code,
                                        module: category,
                                        resource,
                                        action,
                                        scope: "all".to_string(),
                                        name,
                                        description,
                                        is_builtin: false,
                                    });
                                }
                                self.cache.load_all(permissions.clone());
                                info!(
                                    "Successfully fetched {} permissions from IAM",
                                    permissions.len()
                                );
                                return Ok(());
                            }
                        }
                        Err(e) => {
                            warn!("Failed to parse IAM response: {}", e);
                        }
                    }
                } else {
                    warn!("IAM service returned status: {}", response.status());
                }
            }
            Err(e) => {
                warn!("Failed to fetch from IAM: {}", e);
            }
        }

        // 降级到本地内置权限定义
        warn!("IAM remote fetch failed, falling back to builtin permissions");
        self.initialize().await
    }

    /// V21.0: 启动权限元数据变更事件订阅
    ///
    /// 订阅 PermissionMetadataChangedEvent，收到事件后实时更新本地缓存。
    pub async fn start_event_subscription(
        &self,
        subscriber: &RabbitMqSubscriber,
    ) -> Result<(), TopemsError> {
        let cache = self.cache.clone();
        let service_name = self.service_name.clone();

        subscriber
            .subscribe(EventType::PermissionMetadataChanged, move |event| {
                let payload = match event
                    .parse_payload::<PermissionMetadataChangedPayload>()
                {
                    Ok(p) => p,
                    Err(e) => {
                        warn!(
                            "Failed to parse PermissionMetadataChanged payload: {}",
                            e
                        );
                        return Ok(());
                    }
                };

                let change_type = payload.change_type.as_str();
                info!(
                    "Permission metadata changed event received: type={}, codes={:?}, service={}",
                    change_type, payload.permission_codes, service_name
                );

                // 根据变更类型更新缓存
                match change_type {
                    "created" | "updated" => {
                        if let Some(metadata_value) = payload.metadata {
                            match serde_json::from_value::<PermissionMetadata>(metadata_value) {
                                Ok(metadata) => {
                                    cache.upsert(metadata);
                                }
                                Err(e) => {
                                    warn!(
                                        "Failed to deserialize PermissionMetadata from event payload: {}",
                                        e
                                    );
                                }
                            }
                        }
                    }
                    "deleted" => {
                        for code in &payload.permission_codes {
                            cache.remove(code);
                        }
                    }
                    "bulk_imported" => {
                        // 批量导入时，重新初始化缓存
                        // 实际实现中应该从事件 payload 获取完整列表，这里简化处理
                        info!("Bulk permission import detected, cache will be refreshed on next restart");
                    }
                    _ => {
                        warn!("Unknown permission change type: {}", change_type);
                    }
                }

                Ok(())
            })
            .await
            .map_err(|e| {
                error!(
                    "Failed to subscribe to PermissionMetadataChanged event: {:?}",
                    e
                );
                TopemsError::Internal(format!("Permission event subscription failed: {:?}", e))
            })?;

        info!(
            "Permission metadata change event subscription started for service: {}",
            self.service_name
        );

        Ok(())
    }

    /// 构建内置权限元数据列表
    ///
    /// 从共享库的 `get_all_module_permissions()` 生成权限元数据，
    /// 作为 IAM 服务不可用时的 fallback。
    fn build_builtin_permissions(&self) -> Vec<PermissionMetadata> {
        let module_permissions = crate::permission::get_all_module_permissions();

        module_permissions
            .iter()
            .map(|mp| {
                let module_str = mp.module.as_str().to_string();
                let action_str = mp.action.as_str().to_string();
                let code = format!("{}:{}:{}", module_str, action_str, "all");
                PermissionMetadata {
                    code: code.clone(),
                    module: module_str.clone(),
                    resource: "*".to_string(),
                    action: action_str.clone(),
                    scope: "all".to_string(),
                    name: format!("{} - {}", module_str, action_str),
                    description: Some(format!("Module {} {} permission", module_str, action_str)),
                    is_builtin: true,
                }
            })
            .collect()
    }
}

/// V21.0: 权限检查辅助函数
///
/// 检查用户是否拥有指定权限，考虑数据范围。
/// 在 RBAC 基础上叠加 ABAC 数据范围控制。
pub fn check_permission_with_scope(
    user_permissions: &[String],
    required: &crate::permission::ResourcePermission,
) -> bool {
    // 超级管理员拥有所有权限
    if user_permissions.iter().any(|p| p == "superuser") {
        return true;
    }

    // 检查用户是否拥有匹配的权限
    for user_perm_str in user_permissions {
        if let Some(user_perm) = crate::permission::ResourcePermission::parse(user_perm_str) {
            if user_perm.implies(required) {
                return true;
            }
        }
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::permission::{PermissionScope, ResourcePermission};

    // ===== PermissionCenterClient::new =====
    #[test]
    fn test_client_new_initializes_empty_cache() {
        let client = PermissionCenterClient::new("test-svc");
        let stats = client.cache().stats();
        assert_eq!(stats.total_permissions, 0);
        assert_eq!(stats.total_modules, 0);
    }

    #[test]
    fn test_client_cache_returns_arc_handle() {
        let client = PermissionCenterClient::new("svc");
        let cache1 = client.cache();
        let cache2 = client.cache();
        // 同一 Arc 引用
        assert!(std::sync::Arc::ptr_eq(cache1, cache2));
    }

    #[test]
    fn test_client_cache_is_shared_reference() {
        let client = PermissionCenterClient::new("svc");
        let cache = client.cache().clone();
        // 在 clone 上写入，应反映到 client.cache()
        cache.upsert(crate::permission::PermissionMetadata {
            code: "test:read".to_string(),
            module: "test".to_string(),
            resource: "*".to_string(),
            action: "read".to_string(),
            scope: "all".to_string(),
            name: "Test".to_string(),
            description: None,
            is_builtin: false,
        });
        assert_eq!(client.cache().stats().total_permissions, 1);
    }

    // ===== initialize (本地内置权限加载) =====
    #[tokio::test]
    async fn test_initialize_loads_builtin_permissions() {
        let client = PermissionCenterClient::new("svc");
        let result = client.initialize().await;
        assert!(result.is_ok(), "initialize should succeed");
        let stats = client.cache().stats();
        // 内置权限应非空（21 个模块 * 4 动作 + 1 个 workflow:approve = 85）
        assert!(stats.total_permissions > 0, "builtin permissions loaded");
        assert!(stats.total_modules > 0);
        assert!(stats.last_updated.is_some());
    }

    #[tokio::test]
    async fn test_initialize_idempotent_reload() {
        let client = PermissionCenterClient::new("svc");
        client.initialize().await.unwrap();
        let count1 = client.cache().stats().total_permissions;

        // 再次初始化应替换而非追加
        client.initialize().await.unwrap();
        let count2 = client.cache().stats().total_permissions;
        assert_eq!(count1, count2, "re-init should replace not append");
    }

    // ===== fetch_from_iam (不可达地址 → fallback) =====
    #[tokio::test]
    async fn test_fetch_from_iam_unreachable_falls_back_to_builtin() {
        let client = PermissionCenterClient::new("svc");
        // 不可达地址（端口 1 通常被拒绝/超时）
        let result = client.fetch_from_iam("http://127.0.0.1:1").await;
        assert!(
            result.is_ok(),
            "should fall back to builtin on fetch failure"
        );
        let stats = client.cache().stats();
        assert!(stats.total_permissions > 0, "fallback should load builtin");
    }

    // ===== build_builtin_permissions =====
    #[test]
    fn test_build_builtin_permissions_includes_iam_read() {
        let client = PermissionCenterClient::new("svc");
        let perms = client.build_builtin_permissions();
        assert!(!perms.is_empty());
        // 应包含 iam 模块的权限
        let has_iam = perms.iter().any(|p| p.module == "iam");
        assert!(has_iam);
        // 所有内置权限应标记 is_builtin=true
        assert!(perms.iter().all(|p| p.is_builtin));
    }

    #[test]
    fn test_build_builtin_permissions_code_format() {
        let client = PermissionCenterClient::new("svc");
        let perms = client.build_builtin_permissions();
        let first = perms.first().expect("non-empty");
        // code 格式为 module:action:all
        assert!(first.code.contains(":all"));
        let parts: Vec<&str> = first.code.split(':').collect();
        assert_eq!(parts.len(), 3);
    }

    // ===== check_permission_with_scope =====
    #[test]
    fn test_check_permission_with_scope_superuser_bypass() {
        let required = ResourcePermission::new(
            crate::permission::ModuleCode::Iam,
            "users".to_string(),
            crate::permission::PermissionAction::Read,
        );
        let user_perms = vec!["superuser".to_string()];
        assert!(check_permission_with_scope(&user_perms, &required));
    }

    #[test]
    fn test_check_permission_with_scope_exact_match_allows() {
        let required = ResourcePermission::new(
            crate::permission::ModuleCode::Iam,
            "users".to_string(),
            crate::permission::PermissionAction::Read,
        );
        let user_perms = vec!["iam:users:read:all".to_string()];
        assert!(check_permission_with_scope(&user_perms, &required));
    }

    #[test]
    fn test_check_permission_with_scope_admin_implies_read() {
        let required = ResourcePermission::new(
            crate::permission::ModuleCode::Iam,
            "users".to_string(),
            crate::permission::PermissionAction::Read,
        );
        // admin + All 应蕴含 read + All
        let user_perms = vec!["iam:users:admin:all".to_string()];
        assert!(check_permission_with_scope(&user_perms, &required));
    }

    #[test]
    fn test_check_permission_with_scope_different_resource_denies() {
        let required = ResourcePermission::new(
            crate::permission::ModuleCode::Iam,
            "users".to_string(),
            crate::permission::PermissionAction::Read,
        );
        let user_perms = vec!["iam:roles:read:all".to_string()];
        assert!(!check_permission_with_scope(&user_perms, &required));
    }

    #[test]
    fn test_check_permission_with_scope_insufficient_scope_denies() {
        // 用户拥有 self scope，但要求 all scope
        let required = ResourcePermission::with_scope(
            crate::permission::ModuleCode::Iam,
            "users".to_string(),
            crate::permission::PermissionAction::Read,
            PermissionScope::All,
        );
        let user_perms = vec!["iam:users:read:self".to_string()];
        // self 不蕴含 all
        assert!(!check_permission_with_scope(&user_perms, &required));
    }

    #[test]
    fn test_check_permission_with_scope_invalid_string_ignored() {
        let required = ResourcePermission::new(
            crate::permission::ModuleCode::Iam,
            "users".to_string(),
            crate::permission::PermissionAction::Read,
        );
        // 无效的权限字符串应被忽略，不报错
        let user_perms = vec!["garbage".to_string(), "iam:users:read:all".to_string()];
        assert!(check_permission_with_scope(&user_perms, &required));
    }

    #[test]
    fn test_check_permission_with_scope_empty_perms_denies() {
        let required = ResourcePermission::new(
            crate::permission::ModuleCode::Iam,
            "users".to_string(),
            crate::permission::PermissionAction::Read,
        );
        let user_perms: Vec<String> = vec![];
        assert!(!check_permission_with_scope(&user_perms, &required));
    }
}
