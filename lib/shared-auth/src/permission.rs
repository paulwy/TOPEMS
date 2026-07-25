use crate::auth::Claims;
use topems_shared_core::response::ApiResponse;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ModuleCode {
    // 核心模块
    Iam,
    // 业务模块
    Hrm,
    Erp,
    Pm,
    Rs,
    Scm,
    Srm,
    Crm,
    Ai,
    Gis,
    Qms, // 质量管理
    Ehs, // 环境健康安全
    Mes, // 制造执行
    Wms, // 仓储管理
    // 特殊模块
    Workflow,
    // 基础设施模块（与 IAM 联动）
    Doc,
    File,
    Notification,
    Im,
    Integration,
    // 系统模块
    System,
}

impl ModuleCode {
    pub fn as_str(&self) -> &'static str {
        match self {
            ModuleCode::Iam => "iam",
            ModuleCode::Hrm => "hrm",
            ModuleCode::Erp => "erp",
            ModuleCode::Pm => "pm",
            ModuleCode::Rs => "rs",
            ModuleCode::Scm => "scm",
            ModuleCode::Srm => "srm",
            ModuleCode::Crm => "crm",
            ModuleCode::Ai => "ai",
            ModuleCode::Gis => "gis",
            ModuleCode::Qms => "qms",
            ModuleCode::Ehs => "ehs",
            ModuleCode::Mes => "mes",
            ModuleCode::Wms => "wms",
            ModuleCode::Workflow => "workflow",
            ModuleCode::Doc => "doc",
            ModuleCode::File => "file",
            ModuleCode::Notification => "notification",
            ModuleCode::Im => "im",
            ModuleCode::Integration => "integration",
            ModuleCode::System => "system",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "iam" => Some(ModuleCode::Iam),
            "hrm" => Some(ModuleCode::Hrm),
            "erp" => Some(ModuleCode::Erp),
            "pm" => Some(ModuleCode::Pm),
            "rs" => Some(ModuleCode::Rs),
            "scm" => Some(ModuleCode::Scm),
            "srm" => Some(ModuleCode::Srm),
            "crm" => Some(ModuleCode::Crm),
            "ai" => Some(ModuleCode::Ai),
            "gis" => Some(ModuleCode::Gis),
            "qms" => Some(ModuleCode::Qms),
            "ehs" => Some(ModuleCode::Ehs),
            "mes" => Some(ModuleCode::Mes),
            "wms" => Some(ModuleCode::Wms),
            "workflow" => Some(ModuleCode::Workflow),
            "doc" => Some(ModuleCode::Doc),
            "file" => Some(ModuleCode::File),
            "notification" => Some(ModuleCode::Notification),
            "im" => Some(ModuleCode::Im),
            "integration" => Some(ModuleCode::Integration),
            "system" => Some(ModuleCode::System),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PermissionAction {
    Read,
    Write,
    Delete,
    Approve,
    Admin,
}

impl PermissionAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            PermissionAction::Read => "read",
            PermissionAction::Write => "write",
            PermissionAction::Delete => "delete",
            PermissionAction::Approve => "approve",
            PermissionAction::Admin => "admin",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "read" => Some(PermissionAction::Read),
            "write" => Some(PermissionAction::Write),
            "delete" => Some(PermissionAction::Delete),
            "approve" => Some(PermissionAction::Approve),
            "admin" => Some(PermissionAction::Admin),
            _ => None,
        }
    }

    pub fn level(&self) -> u8 {
        match self {
            PermissionAction::Read => 1,
            PermissionAction::Write => 2,
            PermissionAction::Delete => 3,
            PermissionAction::Approve => 3,
            PermissionAction::Admin => 4,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ModulePermission {
    /// V21.0: 公开字段以支持权限中心客户端访问
    pub module: ModuleCode,
    pub action: PermissionAction,
}

impl ModulePermission {
    pub fn new(module: ModuleCode, action: PermissionAction) -> Self {
        ModulePermission { module, action }
    }

    pub fn parse(s: &str) -> Option<Self> {
        let parts: Vec<&str> = s.split(':').collect();
        if parts.len() != 2 {
            return None;
        }
        let module = ModuleCode::from_str(parts[0])?;
        let action = PermissionAction::from_str(parts[1])?;
        Some(ModulePermission { module, action })
    }

    pub fn implies(&self, other: &ModulePermission) -> bool {
        if self.module != other.module {
            return false;
        }
        self.action.level() >= other.action.level()
    }
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}:{}", self.module.as_str(), self.action.as_str())
    }
}

pub async fn check_module_permission<T>(
    _db: &PgPool,
    claims: &Claims,
    permission: &ModulePermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    let module_manage = ModulePermission::new(permission.module.clone(), PermissionAction::Admin);
    if claims.has_permission(&module_manage.to_string()) {
        return Ok(());
    }

    if claims.has_permission(&permission.to_string()) {
        return Ok(());
    }

    let module_read = ModulePermission::new(permission.module.clone(), PermissionAction::Read);
    if permission.action.level() == module_read.action.level()
        && claims.has_permission(&module_read.to_string())
    {
        return Ok(());
    }

    Err(axum::Json(ApiResponse::error(
        403,
        &format!("权限不足：需要 {} 权限", permission),
    )))
}

pub async fn check_resource_permission<T>(
    _db: &PgPool,
    claims: &Claims,
    resource_id: &Uuid,
    resource_type: &str,
    manage_permission: &str,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    if claims.has_permission(manage_permission) {
        return Ok(());
    }

    let user_id = match claims.user_id() {
        Ok(id) => id,
        Err(_) => {
            return Err(axum::Json(ApiResponse::error(401, "无效的用户ID")));
        }
    };

    if user_id == *resource_id {
        return Ok(());
    }

    Err(axum::Json(ApiResponse::error(
        403,
        &format!(
            "权限不足：您只能访问自己的 {} 或需要 {} 权限",
            resource_type, manage_permission
        ),
    )))
}

pub fn check_any_module_permission<T>(
    claims: &Claims,
    permissions: &[ModulePermission],
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    for perm in permissions {
        let module_manage = ModulePermission::new(perm.module.clone(), PermissionAction::Admin);
        if claims.has_permission(&module_manage.to_string()) {
            return Ok(());
        }

        if claims.has_permission(&perm.to_string()) {
            return Ok(());
        }
    }

    let perm_strs: Vec<String> = permissions.iter().map(|p| p.to_string()).collect();
    Err(axum::Json(ApiResponse::error(
        403,
        &format!("权限不足：需要以下任一权限: {}", perm_strs.join(", ")),
    )))
}

pub fn get_all_module_permissions() -> Vec<ModulePermission> {
    let modules = [
        // 核心模块
        ModuleCode::Iam,
        // 业务模块
        ModuleCode::Hrm,
        ModuleCode::Erp,
        ModuleCode::Pm,
        ModuleCode::Rs,
        ModuleCode::Scm,
        ModuleCode::Srm,
        ModuleCode::Crm,
        ModuleCode::Ai,
        ModuleCode::Gis,
        ModuleCode::Qms,
        ModuleCode::Ehs,
        ModuleCode::Mes,
        ModuleCode::Wms,
        // 基础设施模块
        ModuleCode::Doc,
        ModuleCode::File,
        ModuleCode::Notification,
        ModuleCode::Im,
        ModuleCode::Integration,
        // 系统模块
        ModuleCode::System,
    ];

    let actions = [
        PermissionAction::Read,
        PermissionAction::Write,
        PermissionAction::Delete,
        PermissionAction::Admin,
    ];

    let mut perms = Vec::new();
    for module in modules.iter() {
        for action in actions.iter() {
            perms.push(ModulePermission::new(module.clone(), action.clone()));
        }
    }

    // Workflow 特殊操作
    perms.push(ModulePermission::new(
        ModuleCode::Workflow,
        PermissionAction::Approve,
    ));

    perms
}

pub fn get_module_actions() -> Vec<(String, String)> {
    vec![
        ("read".to_string(), "只读".to_string()),
        ("write".to_string(), "写入".to_string()),
        ("delete".to_string(), "删除".to_string()),
        ("approve".to_string(), "审批".to_string()),
        ("admin".to_string(), "管理".to_string()),
    ]
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Position {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub department_id: Option<Uuid>,
    pub permissions: Vec<ModulePermission>,
}

impl Position {
    pub fn new(id: Uuid, code: String, name: String) -> Self {
        Position {
            id,
            code,
            name,
            department_id: None,
            permissions: Vec::new(),
        }
    }

    pub fn has_permission(&self, permission: &ModulePermission) -> bool {
        self.permissions.iter().any(|p| p.implies(permission))
    }

    pub fn add_permission(&mut self, permission: ModulePermission) {
        if !self.permissions.contains(&permission) {
            self.permissions.push(permission);
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ResourcePermission {
    pub module: ModuleCode,
    pub resource: String,
    pub action: PermissionAction,
    /// V21.0: 数据范围，默认为 All
    pub scope: PermissionScope,
}

impl ResourcePermission {
    pub fn new(module: ModuleCode, resource: String, action: PermissionAction) -> Self {
        ResourcePermission {
            module,
            resource,
            action,
            scope: PermissionScope::All,
        }
    }

    /// V21.0: 带数据范围的构造函数
    pub fn with_scope(
        module: ModuleCode,
        resource: String,
        action: PermissionAction,
        scope: PermissionScope,
    ) -> Self {
        ResourcePermission {
            module,
            resource,
            action,
            scope,
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        let parts: Vec<&str> = s.split(':').collect();
        // V21.0: 支持两种格式：
        // - 3段: module:resource:action（向后兼容，scope=All）
        // - 4段: module:resource:action:scope（新格式）
        match parts.len() {
            3 => {
                let module = ModuleCode::from_str(parts[0])?;
                let action = PermissionAction::from_str(parts[2])?;
                Some(ResourcePermission {
                    module,
                    resource: parts[1].to_string(),
                    action,
                    scope: PermissionScope::All,
                })
            }
            4 => {
                let module = ModuleCode::from_str(parts[0])?;
                let action = PermissionAction::from_str(parts[2])?;
                let scope = PermissionScope::from_str(parts[3])?;
                Some(ResourcePermission {
                    module,
                    resource: parts[1].to_string(),
                    action,
                    scope,
                })
            }
            _ => None,
        }
    }

    pub fn implies(&self, other: &ResourcePermission) -> bool {
        if self.module != other.module || self.resource != other.resource {
            return false;
        }
        // V21.0: 数据范围蕴含关系
        // All 蕴含所有；Department 蕴含 Team 和 Self；Team 蕴含 Self
        self.action.level() >= other.action.level() && self.scope.implies(&other.scope)
    }
}

impl std::fmt::Display for ResourcePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}:{}:{}:{}",
            self.module.as_str(),
            self.resource,
            self.action.as_str(),
            self.scope.as_str()
        )
    }
}

/// V21.0: 数据范围（Scope）- ABAC 属性基访问控制
///
/// 用于控制用户能访问的数据范围，与 RBAC 权限组合使用：
/// - All: 所有数据（最高权限）
/// - Department: 本部门数据
/// - Team: 本团队数据
/// - Self: 仅本人数据（最低权限）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PermissionScope {
    /// 所有数据（管理员级别）
    All,
    /// 本部门数据
    Department,
    /// 本团队数据
    Team,
    /// 仅本人数据
    Self_,
}

impl PermissionScope {
    pub fn as_str(&self) -> &'static str {
        match self {
            PermissionScope::All => "all",
            PermissionScope::Department => "dept",
            PermissionScope::Team => "team",
            PermissionScope::Self_ => "self",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "all" => Some(PermissionScope::All),
            "dept" | "department" => Some(PermissionScope::Department),
            "team" => Some(PermissionScope::Team),
            "self" => Some(PermissionScope::Self_),
            _ => None,
        }
    }

    /// 范围等级，用于蕴含判断
    pub fn level(&self) -> u8 {
        match self {
            PermissionScope::All => 4,
            PermissionScope::Department => 3,
            PermissionScope::Team => 2,
            PermissionScope::Self_ => 1,
        }
    }

    /// 判断当前范围是否蕴含另一个范围
    pub fn implies(&self, other: &PermissionScope) -> bool {
        self.level() >= other.level()
    }
}

impl Default for PermissionScope {
    fn default() -> Self {
        PermissionScope::All
    }
}

impl std::fmt::Display for PermissionScope {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct DataPermission {
    pub resource_type: String,
    pub conditions: Vec<DataCondition>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct DataCondition {
    pub field: String,
    pub operator: ConditionOperator,
    pub value: String,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ConditionOperator {
    Equals,
    NotEquals,
    In,
    NotIn,
    Contains,
    GreaterThan,
    LessThan,
}

#[derive(Debug, Clone)]
pub struct PermissionTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub permissions: Vec<String>,
}

impl PermissionTemplate {
    pub fn new(id: Uuid, name: String) -> Self {
        PermissionTemplate {
            id,
            name,
            description: None,
            permissions: Vec::new(),
        }
    }

    pub fn add_permission(&mut self, permission: &str) {
        if !self.permissions.contains(&permission.to_string()) {
            self.permissions.push(permission.to_string());
        }
    }
}

// ============================================================================
// V21.0 统一权限中心：权限元数据缓存 + 实时同步
// ============================================================================

/// V21.0: 权限元数据
///
/// 描述一个权限的完整定义，包括模块、资源、操作、数据范围、描述等。
/// 由 IAM 服务作为权威源统一管理，各服务启动时拉取并缓存。
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PermissionMetadata {
    /// 权限标识：`module:resource:action:scope`
    pub code: String,
    /// 模块编码
    pub module: String,
    /// 资源名称
    pub resource: String,
    /// 操作类型
    pub action: String,
    /// 数据范围
    pub scope: String,
    /// 权限名称（显示用）
    pub name: String,
    /// 权限描述
    pub description: Option<String>,
    /// 是否为系统内置权限（不可删除）
    pub is_builtin: bool,
}

/// V21.0: 权限元数据缓存
///
/// 各服务启动时从 IAM 服务拉取权限元数据，缓存在内存中。
/// 当权限变更时（通过 PermissionChangedEvent），自动更新缓存。
///
/// 设计要点：
/// - 使用 RwLock 实现读多写少的并发访问
/// - 支持按模块、资源、操作多维度查询
/// - 支持增量更新（仅更新变更的权限）
pub struct PermissionMetadataCache {
    /// 权限代码 → 元数据映射
    cache: parking_lot::RwLock<std::collections::HashMap<String, PermissionMetadata>>,
    /// 模块 → 权限代码集合（用于按模块批量查询）
    module_index: parking_lot::RwLock<std::collections::HashMap<String, Vec<String>>>,
    /// 最后更新时间
    last_updated: parking_lot::RwLock<Option<chrono::DateTime<chrono::Utc>>>,
}

impl PermissionMetadataCache {
    pub fn new() -> Self {
        Self {
            cache: parking_lot::RwLock::new(std::collections::HashMap::new()),
            module_index: parking_lot::RwLock::new(std::collections::HashMap::new()),
            last_updated: parking_lot::RwLock::new(None),
        }
    }

    /// 批量加载权限元数据（启动时调用）
    pub fn load_all(&self, metadata_list: Vec<PermissionMetadata>) {
        let mut cache = self.cache.write();
        let mut module_index = self.module_index.write();
        cache.clear();
        module_index.clear();

        for metadata in metadata_list {
            let module = metadata.module.clone();
            let code = metadata.code.clone();
            module_index.entry(module).or_default().push(code.clone());
            cache.insert(code, metadata);
        }

        *self.last_updated.write() = Some(chrono::Utc::now());
    }

    /// 增量更新单个权限元数据（权限变更事件触发）
    pub fn upsert(&self, metadata: PermissionMetadata) {
        let code = metadata.code.clone();
        let module = metadata.module.clone();
        let mut cache = self.cache.write();
        let mut module_index = self.module_index.write();

        // 如果权限已存在且模块变更，需要更新索引
        if let Some(old) = cache.get(&code) {
            if old.module != module {
                if let Some(codes) = module_index.get_mut(&old.module) {
                    codes.retain(|c| c != &code);
                }
            }
        }

        module_index.entry(module).or_default().push(code.clone());
        cache.insert(code, metadata);
        *self.last_updated.write() = Some(chrono::Utc::now());
    }

    /// 删除权限元数据
    pub fn remove(&self, code: &str) {
        let mut cache = self.cache.write();
        let mut module_index = self.module_index.write();

        if let Some(metadata) = cache.remove(code) {
            if let Some(codes) = module_index.get_mut(&metadata.module) {
                codes.retain(|c| c != code);
            }
        }
        *self.last_updated.write() = Some(chrono::Utc::now());
    }

    /// 查询单个权限元数据
    pub fn get(&self, code: &str) -> Option<PermissionMetadata> {
        self.cache.read().get(code).cloned()
    }

    /// 按模块查询所有权限
    pub fn list_by_module(&self, module: &str) -> Vec<PermissionMetadata> {
        let cache = self.cache.read();
        let module_index = self.module_index.read();
        module_index
            .get(module)
            .map(|codes| {
                codes
                    .iter()
                    .filter_map(|code| cache.get(code).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }

    /// 获取所有权限元数据
    pub fn list_all(&self) -> Vec<PermissionMetadata> {
        self.cache.read().values().cloned().collect()
    }

    /// 获取缓存统计信息
    pub fn stats(&self) -> PermissionCacheStats {
        let cache = self.cache.read();
        let module_index = self.module_index.read();
        PermissionCacheStats {
            total_permissions: cache.len(),
            total_modules: module_index.len(),
            last_updated: *self.last_updated.read(),
        }
    }

    /// 清空缓存
    pub fn clear(&self) {
        self.cache.write().clear();
        self.module_index.write().clear();
        *self.last_updated.write() = None;
    }
}

impl Default for PermissionMetadataCache {
    fn default() -> Self {
        Self::new()
    }
}

/// V21.0: 权限缓存统计信息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PermissionCacheStats {
    pub total_permissions: usize,
    pub total_modules: usize,
    pub last_updated: Option<chrono::DateTime<chrono::Utc>>,
}

/// V21.0: 权限变更操作类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum PermissionChangeType {
    /// 新增权限
    Created,
    /// 更新权限
    Updated,
    /// 删除权限
    Deleted,
    /// 批量导入
    BulkImported,
}

impl PermissionChangeType {
    pub fn as_str(&self) -> &'static str {
        match self {
            PermissionChangeType::Created => "created",
            PermissionChangeType::Updated => "updated",
            PermissionChangeType::Deleted => "deleted",
            PermissionChangeType::BulkImported => "bulk_imported",
        }
    }
}

impl std::fmt::Display for PermissionChangeType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}
