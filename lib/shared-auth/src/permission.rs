use crate::auth::Claims;
use sqlx::PgPool;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
#[non_exhaustive]
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
    // ===== V21.1 R4/R6 对齐：前端 32 模块扩齐（纯加，INV-3：不动 existing） =====
    Admin,
    Aps,
    Asset,
    Automation,
    Bi,
    Finance,
    Lims,
    // [V2026.08 已移除] Lowcode 空壳占位服务
    Mobile,
    Monitor,
    Oa,
    Pdm,
    Plugin,
    Rd,
    Registry,
    Report,
    Shared,
    Ticket,
    Tms,
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
            ModuleCode::Admin => "admin",
            ModuleCode::Aps => "aps",
            ModuleCode::Asset => "asset",
            ModuleCode::Automation => "automation",
            ModuleCode::Bi => "bi",
            ModuleCode::Finance => "finance",
            ModuleCode::Lims => "lims",
            // [V2026.08 已移除] Lowcode 空壳占位服务
            ModuleCode::Mobile => "mobile",
            ModuleCode::Monitor => "monitor",
            ModuleCode::Oa => "oa",
            ModuleCode::Pdm => "pdm",
            ModuleCode::Plugin => "plugin",
            ModuleCode::Rd => "rd",
            ModuleCode::Registry => "registry",
            ModuleCode::Report => "report",
            ModuleCode::Shared => "shared",
            ModuleCode::Ticket => "ticket",
            ModuleCode::Tms => "tms",
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
            "admin" => Some(ModuleCode::Admin),
            "aps" => Some(ModuleCode::Aps),
            "asset" => Some(ModuleCode::Asset),
            "automation" => Some(ModuleCode::Automation),
            "bi" => Some(ModuleCode::Bi),
            "finance" => Some(ModuleCode::Finance),
            "lims" => Some(ModuleCode::Lims),
            // [V2026.08 已移除] Lowcode 空壳占位服务
            "mobile" => Some(ModuleCode::Mobile),
            "monitor" => Some(ModuleCode::Monitor),
            "oa" => Some(ModuleCode::Oa),
            "pdm" => Some(ModuleCode::Pdm),
            "plugin" => Some(ModuleCode::Plugin),
            "rd" => Some(ModuleCode::Rd),
            "registry" => Some(ModuleCode::Registry),
            "report" => Some(ModuleCode::Report),
            "shared" => Some(ModuleCode::Shared),
            "ticket" => Some(ModuleCode::Ticket),
            "tms" => Some(ModuleCode::Tms),
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
        // ===== V21.1 R4/R6 对齐：后端 ModuleCode 扩齐（不含 Shared，Shared 特殊无 module perm） =====
        ModuleCode::Admin,
        ModuleCode::Aps,
        ModuleCode::Asset,
        ModuleCode::Automation,
        ModuleCode::Bi,
        ModuleCode::Finance,
        ModuleCode::Lims,
        // [V2026.08 已移除] Lowcode 空壳占位服务
        ModuleCode::Mobile,
        ModuleCode::Monitor,
        ModuleCode::Oa,
        ModuleCode::Pdm,
        ModuleCode::Plugin,
        ModuleCode::Rd,
        ModuleCode::Registry,
        ModuleCode::Report,
        ModuleCode::Ticket,
        ModuleCode::Tms,
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
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
pub enum PermissionScope {
    /// 所有数据（管理员级别）
    #[default]
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

// ============================================================================
// IAM 权限检查纯函数（可独立单元测试，不依赖数据库）
// ============================================================================

/// 权限检查结果
#[derive(Debug, Clone, PartialEq)]
pub struct PermissionCheckResult {
    pub allowed: bool,
    pub reason: Option<String>,
}

impl PermissionCheckResult {
    pub fn allow() -> Self {
        PermissionCheckResult {
            allowed: true,
            reason: None,
        }
    }

    pub fn deny(reason: impl Into<String>) -> Self {
        PermissionCheckResult {
            allowed: false,
            reason: Some(reason.into()),
        }
    }
}

/// IAM 操作类型
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IamAction {
    ListUsers,
    CreateUser,
    DeleteUser,
    AssignRole,
    ChangeOwnPassword,
    ChangeOthersPassword,
    CrossTenantAccess,
}

/// IAM 权限检查纯函数
///
/// # 参数
/// - `is_superuser`: 是否为超级管理员
/// - `user_roles`: 用户拥有的角色列表
/// - `user_permissions`: 用户拥有的权限码列表
/// - `action`: 要执行的 IAM 操作
///
/// # 返回
/// - `PermissionCheckResult`: 包含是否允许和原因
pub fn check_iam_permission(
    is_superuser: bool,
    user_roles: &[String],
    user_permissions: &[String],
    action: IamAction,
) -> PermissionCheckResult {
    // 超级管理员拥有所有权限（IAM-001, IAM-006, IAM-007）
    if is_superuser {
        return PermissionCheckResult::allow();
    }

    let has_permission = |code: &str| -> bool { user_permissions.contains(&code.to_string()) };

    match action {
        // IAM-002: 普通用户查看用户列表 - 需要 iam:users_read
        IamAction::ListUsers => {
            if has_permission("iam:users_read") || has_permission("iam:read") {
                PermissionCheckResult::allow()
            } else {
                PermissionCheckResult::deny("需要 iam:users_read 权限")
            }
        }
        // IAM-003: 管理员创建用户 - 需要 iam:users_write 或 iam:admin
        IamAction::CreateUser => {
            if has_permission("iam:users_write") || has_permission("iam:admin") {
                PermissionCheckResult::allow()
            } else {
                PermissionCheckResult::deny("需要 iam:users_write 权限")
            }
        }
        // IAM-004: 无权限用户创建用户 - 任何非 admin 权限都不允许
        // IAM-005: 删除用户 - 需要 iam:users_delete 或 iam:admin
        IamAction::DeleteUser => {
            if has_permission("iam:users_delete") || has_permission("iam:admin") {
                PermissionCheckResult::allow()
            } else {
                PermissionCheckResult::deny("需要 iam:users_delete 权限")
            }
        }
        // IAM-006: 分配角色 - 需要 iam:roles_write 或 iam:admin
        IamAction::AssignRole => {
            if has_permission("iam:roles_write") || has_permission("iam:admin") {
                PermissionCheckResult::allow()
            } else {
                PermissionCheckResult::deny("需要 iam:roles_write 权限")
            }
        }
        // IAM-008: 修改自己密码 - 任何已认证用户均可
        IamAction::ChangeOwnPassword => PermissionCheckResult::allow(),
        // IAM-009: 修改他人密码 - 需要 iam:users_write 或 iam:admin
        IamAction::ChangeOthersPassword => {
            if has_permission("iam:users_write") || has_permission("iam:admin") {
                PermissionCheckResult::allow()
            } else {
                PermissionCheckResult::deny("需要 iam:users_write 权限")
            }
        }
        // IAM-007: 跨租户访问 - 仅超级管理员或拥有 iam:cross_tenant 权限
        IamAction::CrossTenantAccess => {
            if has_permission("iam:cross_tenant") || user_roles.iter().any(|r| r == "tenant_admin")
            {
                PermissionCheckResult::allow()
            } else {
                PermissionCheckResult::deny("需要 iam:cross_tenant 权限或 tenant_admin 角色")
            }
        }
    }
}

/// 验证权限码格式是否合法
///
/// 合法格式：`module:action` 或 `module:resource:action` 或 `module:resource:action:scope`
pub fn validate_permission_code(code: &str) -> Result<(), String> {
    let parts: Vec<&str> = code.split(':').collect();

    if parts.len() < 2 || parts.len() > 4 {
        return Err(format!(
            "权限码格式错误：需要 2-4 段（实际 {} 段）",
            parts.len()
        ));
    }

    let module = ModuleCode::from_str(parts[0]);
    if module.is_none() {
        return Err(format!("无效的模块码: {}", parts[0]));
    }

    let action_idx = if parts.len() == 2 { 1 } else { 2 };
    let action = PermissionAction::from_str(parts[action_idx]);
    if action.is_none() {
        return Err(format!("无效的权限动作: {}", parts[action_idx]));
    }

    if parts.len() == 4 {
        let scope = PermissionScope::from_str(parts[3]);
        if scope.is_none() {
            return Err(format!("无效的数据范围: {}", parts[3]));
        }
    }

    Ok(())
}

/// 计算用户拥有的所有有效权限码（包括角色蕴含）
pub fn compute_effective_permissions(
    is_superuser: bool,
    direct_permissions: &[String],
    role_permissions: &[String],
) -> Vec<String> {
    if is_superuser {
        return get_all_permission_codes();
    }

    let mut effective = Vec::new();
    effective.extend_from_slice(direct_permissions);
    effective.extend_from_slice(role_permissions);

    // 去重
    effective.sort();
    effective.dedup();
    effective
}

/// 获取所有权限码（超级管理员拥有全部）
fn get_all_permission_codes() -> Vec<String> {
    let all_perms = get_all_module_permissions();
    let mut codes: Vec<String> = all_perms.iter().map(|p| p.to_string()).collect();
    codes.push("iam:cross_tenant".to_string());
    codes.sort();
    codes.dedup();
    codes
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== IAM-001: 超级管理员查看用户列表 =====
    #[test]
    fn test_iam_001_superuser_list_users() {
        let result = check_iam_permission(true, &[], &[], IamAction::ListUsers);
        assert!(result.allowed, "超级管理员应允许查看用户列表");
        assert!(result.reason.is_none());
    }

    // ===== IAM-002: 普通用户查看用户列表 =====
    #[test]
    fn test_iam_002_employee_list_users() {
        // 有权限的普通用户
        let result = check_iam_permission(
            false,
            &["user".to_string()],
            &["iam:users_read".to_string()],
            IamAction::ListUsers,
        );
        assert!(
            result.allowed,
            "拥有 iam:users_read 的普通用户应允许查看用户列表"
        );

        // 无权限的普通用户
        let result = check_iam_permission(false, &["user".to_string()], &[], IamAction::ListUsers);
        assert!(!result.allowed, "无权限的普通用户不应允许查看用户列表");
        assert!(result.reason.unwrap().contains("iam:users_read"));
    }

    // ===== IAM-003: 管理员创建用户 =====
    #[test]
    fn test_iam_003_admin_create_user() {
        // 拥有 iam:users_write 权限
        let result = check_iam_permission(
            false,
            &["admin".to_string()],
            &["iam:users_write".to_string()],
            IamAction::CreateUser,
        );
        assert!(result.allowed);

        // 拥有 iam:admin 权限
        let result = check_iam_permission(
            false,
            &["admin".to_string()],
            &["iam:admin".to_string()],
            IamAction::CreateUser,
        );
        assert!(result.allowed);
    }

    // ===== IAM-004: 无权限用户创建用户 =====
    #[test]
    fn test_iam_004_unauthorized_create_user() {
        let result = check_iam_permission(
            false,
            &["user".to_string()],
            &["iam:users_read".to_string()],
            IamAction::CreateUser,
        );
        assert!(!result.allowed);
        assert!(result.reason.unwrap().contains("iam:users_write"));
    }

    // ===== IAM-005: 管理员删除用户 =====
    #[test]
    fn test_iam_005_admin_delete_user() {
        // 拥有 iam:users_delete 权限
        let result = check_iam_permission(
            false,
            &["admin".to_string()],
            &["iam:users_delete".to_string()],
            IamAction::DeleteUser,
        );
        assert!(result.allowed);

        // 无权限
        let result = check_iam_permission(
            false,
            &["user".to_string()],
            &["iam:users_read".to_string()],
            IamAction::DeleteUser,
        );
        assert!(!result.allowed);
    }

    // ===== IAM-006: 超级管理员分配角色 =====
    #[test]
    fn test_iam_006_superuser_assign_role() {
        // 超级管理员直接通过
        let result = check_iam_permission(true, &[], &[], IamAction::AssignRole);
        assert!(result.allowed);

        // 拥有 iam:roles_write 权限
        let result = check_iam_permission(
            false,
            &["admin".to_string()],
            &["iam:roles_write".to_string()],
            IamAction::AssignRole,
        );
        assert!(result.allowed);

        // 无权限
        let result = check_iam_permission(
            false,
            &["user".to_string()],
            &["iam:users_read".to_string()],
            IamAction::AssignRole,
        );
        assert!(!result.allowed);
    }

    // ===== IAM-007: 跨租户访问 =====
    #[test]
    fn test_iam_007_cross_tenant_access() {
        // 超级管理员
        let result = check_iam_permission(true, &[], &[], IamAction::CrossTenantAccess);
        assert!(result.allowed);

        // 拥有 iam:cross_tenant 权限
        let result = check_iam_permission(
            false,
            &["admin".to_string()],
            &["iam:cross_tenant".to_string()],
            IamAction::CrossTenantAccess,
        );
        assert!(result.allowed);

        // 拥有 tenant_admin 角色
        let result = check_iam_permission(
            false,
            &["tenant_admin".to_string()],
            &[],
            IamAction::CrossTenantAccess,
        );
        assert!(result.allowed);

        // 无权限
        let result = check_iam_permission(
            false,
            &["user".to_string()],
            &[],
            IamAction::CrossTenantAccess,
        );
        assert!(!result.allowed);
    }

    // ===== IAM-008: 用户修改自己密码 =====
    #[test]
    fn test_iam_008_user_change_own_password() {
        // 任何已认证用户均可修改自己密码
        let result = check_iam_permission(
            false,
            &["user".to_string()],
            &[],
            IamAction::ChangeOwnPassword,
        );
        assert!(result.allowed);

        let result = check_iam_permission(
            false,
            &["hr".to_string()],
            &["hr:read".to_string()],
            IamAction::ChangeOwnPassword,
        );
        assert!(result.allowed);
    }

    // ===== IAM-009: 用户修改他人密码 =====
    #[test]
    fn test_iam_009_user_change_others_password() {
        // 拥有 iam:users_write 权限
        let result = check_iam_permission(
            false,
            &["admin".to_string()],
            &["iam:users_write".to_string()],
            IamAction::ChangeOthersPassword,
        );
        assert!(result.allowed);

        // 无权限
        let result = check_iam_permission(
            false,
            &["user".to_string()],
            &[],
            IamAction::ChangeOthersPassword,
        );
        assert!(!result.allowed);
    }

    // ===== 权限码格式验证 =====
    #[test]
    fn test_validate_permission_code() {
        // 合法格式
        assert!(validate_permission_code("iam:read").is_ok());
        assert!(validate_permission_code("iam:users:read").is_ok());
        assert!(validate_permission_code("iam:users:read:all").is_ok());
        assert!(validate_permission_code("hrm:employee:write:self").is_ok());

        // 非法格式
        assert!(validate_permission_code("").is_err(), "空字符串");
        assert!(validate_permission_code("iam").is_err(), "缺少 action");
        assert!(
            validate_permission_code("iam:users:read:all:extra").is_err(),
            "超过 4 段"
        );
        assert!(
            validate_permission_code("invalid_module:read").is_err(),
            "无效模块"
        );
        assert!(
            validate_permission_code("iam:invalid_action").is_err(),
            "无效动作"
        );
    }

    // ===== ModuleCode 解析 =====
    #[test]
    fn test_module_code_from_str() {
        assert_eq!(ModuleCode::from_str("iam"), Some(ModuleCode::Iam));
        assert_eq!(ModuleCode::from_str("hrm"), Some(ModuleCode::Hrm));
        assert_eq!(ModuleCode::from_str("pm"), Some(ModuleCode::Pm));
        assert_eq!(ModuleCode::from_str("nonexistent"), None);
    }

    // ===== PermissionAction 解析 =====
    #[test]
    fn test_permission_action_from_str() {
        assert_eq!(
            PermissionAction::from_str("read"),
            Some(PermissionAction::Read)
        );
        assert_eq!(
            PermissionAction::from_str("write"),
            Some(PermissionAction::Write)
        );
        assert_eq!(
            PermissionAction::from_str("delete"),
            Some(PermissionAction::Delete)
        );
        assert_eq!(
            PermissionAction::from_str("admin"),
            Some(PermissionAction::Admin)
        );
        assert_eq!(PermissionAction::from_str("invalid"), None);
    }

    // ===== PermissionAction 层级 =====
    #[test]
    fn test_permission_action_level() {
        assert_eq!(PermissionAction::Read.level(), 1);
        assert_eq!(PermissionAction::Write.level(), 2);
        assert_eq!(PermissionAction::Delete.level(), 3);
        assert_eq!(PermissionAction::Approve.level(), 3);
        assert_eq!(PermissionAction::Admin.level(), 4);
    }

    // ===== PermissionScope 解析与蕴含 =====
    #[test]
    fn test_permission_scope() {
        // 解析
        assert_eq!(PermissionScope::from_str("all"), Some(PermissionScope::All));
        assert_eq!(
            PermissionScope::from_str("dept"),
            Some(PermissionScope::Department)
        );
        assert_eq!(
            PermissionScope::from_str("self"),
            Some(PermissionScope::Self_)
        );

        // 蕴含关系
        assert!(PermissionScope::All.implies(&PermissionScope::Department));
        assert!(PermissionScope::All.implies(&PermissionScope::Self_));
        assert!(PermissionScope::Department.implies(&PermissionScope::Team));
        assert!(PermissionScope::Team.implies(&PermissionScope::Self_));
        assert!(!PermissionScope::Self_.implies(&PermissionScope::All));
    }

    // ===== ModulePermission 解析与蕴含 =====
    #[test]
    fn test_module_permission() {
        // 解析
        let perm = ModulePermission::parse("iam:read");
        assert!(perm.is_some());
        let perm = perm.unwrap();
        assert_eq!(perm.module, ModuleCode::Iam);
        assert_eq!(perm.action, PermissionAction::Read);

        // 蕴含关系：admin 蕴含 read
        let admin = ModulePermission::new(ModuleCode::Iam, PermissionAction::Admin);
        let read = ModulePermission::new(ModuleCode::Iam, PermissionAction::Read);
        assert!(admin.implies(&read));

        // 跨模块不蕴含
        let hrm_read = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read);
        assert!(!admin.implies(&hrm_read));
    }

    // ===== ResourcePermission 解析与蕴含 =====
    #[test]
    fn test_resource_permission() {
        // 解析 3 段
        let perm = ResourcePermission::parse("iam:users:read");
        assert!(perm.is_some());
        assert_eq!(perm.as_ref().unwrap().module, ModuleCode::Iam);
        assert_eq!(perm.as_ref().unwrap().action, PermissionAction::Read);

        // 解析 4 段（带 scope）
        let perm = ResourcePermission::parse("iam:users:read:dept");
        assert!(perm.is_some());
        assert_eq!(perm.as_ref().unwrap().scope, PermissionScope::Department);

        // 蕴含关系：admin + All 蕴含 read + Self
        let admin_all = ResourcePermission::with_scope(
            ModuleCode::Iam,
            "users".to_string(),
            PermissionAction::Admin,
            PermissionScope::All,
        );
        let read_self = ResourcePermission::with_scope(
            ModuleCode::Iam,
            "users".to_string(),
            PermissionAction::Read,
            PermissionScope::Self_,
        );
        assert!(admin_all.implies(&read_self));

        // 不同资源不蕴含
        let admin_roles = ResourcePermission::new(
            ModuleCode::Iam,
            "roles".to_string(),
            PermissionAction::Admin,
        );
        assert!(!admin_all.implies(&admin_roles));
    }

    // ===== Position 权限检查 =====
    #[test]
    fn test_position_permission() {
        let mut pos = Position::new(
            uuid::Uuid::new_v4(),
            "ADMIN001".to_string(),
            "系统管理员".to_string(),
        );
        pos.add_permission(ModulePermission::new(
            ModuleCode::Iam,
            PermissionAction::Admin,
        ));

        // admin 蕴含 read
        let read = ModulePermission::new(ModuleCode::Iam, PermissionAction::Read);
        assert!(pos.has_permission(&read));

        // admin 蕴含 write
        let write = ModulePermission::new(ModuleCode::Iam, PermissionAction::Write);
        assert!(pos.has_permission(&write));

        // 不具备其他模块权限
        let hrm_read = ModulePermission::new(ModuleCode::Hrm, PermissionAction::Read);
        assert!(!pos.has_permission(&hrm_read));
    }

    // ===== 有效权限计算 =====
    #[test]
    fn test_compute_effective_permissions() {
        // 超级管理员 - 全部权限
        let perms = compute_effective_permissions(true, &[], &[]);
        assert!(!perms.is_empty(), "超级管理员应有全部权限");
        assert!(perms.iter().any(|p| p == "iam:read"));
        assert!(perms.iter().any(|p| p == "iam:admin"));
        assert!(perms.iter().any(|p| p == "iam:cross_tenant"));

        // 普通用户 - 直接权限 + 角色权限
        let perms = compute_effective_permissions(
            false,
            &["custom:perm".to_string()],
            &["role:perm".to_string()],
        );
        assert!(perms.contains(&"custom:perm".to_string()));
        assert!(perms.contains(&"role:perm".to_string()));
        assert!(
            !perms.iter().any(|p| p == "iam:read"),
            "普通用户不应有默认权限"
        );

        // 去重
        let perms =
            compute_effective_permissions(false, &["dup".to_string(), "dup".to_string()], &[]);
        assert_eq!(
            perms.iter().filter(|p| p.as_str() == "dup").count(),
            1,
            "应去重"
        );
    }

    // ===== 新增：PermissionMetadataCache 纯函数测试 =====
    #[test]
    fn test_permission_cache_new_and_default_are_empty() {
        let c = PermissionMetadataCache::new();
        let s = c.stats();
        assert_eq!(s.total_permissions, 0);
        assert_eq!(s.total_modules, 0);
        assert!(s.last_updated.is_none());

        let c2 = PermissionMetadataCache::default();
        assert_eq!(c2.list_all().len(), 0);
    }

    fn make_meta(code: &str, module: &str, name: &str) -> PermissionMetadata {
        PermissionMetadata {
            code: code.to_string(),
            module: module.to_string(),
            resource: "r".to_string(),
            action: "read".to_string(),
            scope: "all".to_string(),
            name: name.to_string(),
            description: None,
            is_builtin: false,
        }
    }

    #[test]
    fn test_permission_cache_load_all_populates() {
        let c = PermissionMetadataCache::new();
        let items = vec![
            make_meta("iam:users:read", "iam", "读用户"),
            make_meta("iam:users:write", "iam", "写用户"),
            make_meta("hrm:employee:read", "hrm", "读员工"),
        ];
        c.load_all(items);
        let s = c.stats();
        assert_eq!(s.total_permissions, 3);
        assert_eq!(s.total_modules, 2);
        assert!(s.last_updated.is_some());
    }

    #[test]
    fn test_permission_cache_get_and_list_by_module() {
        let c = PermissionMetadataCache::new();
        c.load_all(vec![
            make_meta("iam:read", "iam", "读"),
            make_meta("hrm:read", "hrm", "读"),
        ]);
        assert!(c.get("iam:read").is_some());
        assert!(c.get("missing").is_none());
        assert_eq!(c.list_by_module("iam").len(), 1);
        assert_eq!(c.list_by_module("unknown").len(), 0);
    }

    #[test]
    fn test_permission_cache_upsert_and_remove() {
        let c = PermissionMetadataCache::new();
        // 插入
        let m1 = make_meta("iam:read", "iam", "读");
        c.upsert(m1);
        assert_eq!(c.list_all().len(), 1);

        // 覆盖更新
        let m1_v2 = make_meta("iam:read", "iam", "读 V2");
        c.upsert(m1_v2);
        assert_eq!(c.list_all().len(), 1);
        assert_eq!(c.get("iam:read").unwrap().name, "读 V2");

        // 删除
        c.remove("iam:read");
        assert!(c.get("iam:read").is_none());
        assert_eq!(c.stats().total_permissions, 0);
    }

    #[test]
    fn test_permission_cache_clear_resets() {
        let c = PermissionMetadataCache::new();
        c.load_all(vec![
            make_meta("a:b", "m1", "A"),
            make_meta("c:d", "m2", "B"),
        ]);
        assert!(c.stats().total_permissions > 0);
        c.clear();
        assert_eq!(c.stats().total_permissions, 0);
        assert_eq!(c.stats().total_modules, 0);
        assert!(c.stats().last_updated.is_none());
    }

    #[test]
    fn test_permission_cache_upsert_module_change_updates_index() {
        let c = PermissionMetadataCache::new();
        // 先在 module1 插入 code
        let m1 = PermissionMetadata {
            code: "shared:code".to_string(),
            module: "mod_a".to_string(),
            resource: "r".to_string(),
            action: "a".to_string(),
            scope: "s".to_string(),
            name: "n".to_string(),
            description: None,
            is_builtin: false,
        };
        c.upsert(m1);
        assert_eq!(c.list_by_module("mod_a").len(), 1);

        // 再把同一个 code 的 module 改成 mod_b
        let m2 = PermissionMetadata {
            code: "shared:code".to_string(),
            module: "mod_b".to_string(),
            resource: "r".to_string(),
            action: "a".to_string(),
            scope: "s".to_string(),
            name: "n".to_string(),
            description: None,
            is_builtin: false,
        };
        c.upsert(m2);
        // mod_a 应该不再包含这个 code
        assert_eq!(c.list_by_module("mod_a").len(), 0);
        assert_eq!(c.list_by_module("mod_b").len(), 1);
    }

    // ===== PermissionCheckResult / PermissionChangeType 测试 =====
    #[test]
    fn test_permission_check_result_allow_and_deny() {
        let ok = PermissionCheckResult::allow();
        assert!(ok.allowed);
        assert!(ok.reason.is_none());

        let deny = PermissionCheckResult::deny("因为 X");
        assert!(!deny.allowed);
        assert_eq!(deny.reason.as_deref(), Some("因为 X"));
    }

    #[test]
    fn test_permission_change_type_as_str() {
        assert_eq!(PermissionChangeType::Created.as_str(), "created");
        assert_eq!(PermissionChangeType::Updated.as_str(), "updated");
        assert_eq!(PermissionChangeType::Deleted.as_str(), "deleted");
        assert_eq!(PermissionChangeType::BulkImported.as_str(), "bulk_imported");
    }

    #[test]
    fn test_permission_change_type_display() {
        assert_eq!(format!("{}", PermissionChangeType::Created), "created");
    }

    // ===== get_all_module_permissions 数量 =====
    #[test]
    fn test_get_all_module_permissions_includes_workflow_approve() {
        let all = get_all_module_permissions();
        // 20 modules * 4 actions + 1 workflow:approve = 81
        assert!(all.len() >= 81);
        let workflow_approve =
            ModulePermission::new(ModuleCode::Workflow, PermissionAction::Approve);
        assert!(all.contains(&workflow_approve));
    }

    // ===== get_module_actions =====
    #[test]
    fn test_get_module_actions_has_five_entries() {
        let actions = get_module_actions();
        assert_eq!(actions.len(), 5);
        assert!(actions.iter().any(|(k, _)| k == "read"));
        assert!(actions.iter().any(|(k, _)| k == "admin"));
    }

    // ===== PermissionTemplate / Position 更多测试 =====
    #[test]
    fn test_permission_template_new_and_add_permission_no_duplicates() {
        let mut tpl = PermissionTemplate::new(Uuid::new_v4(), "tpl1".to_string());
        tpl.add_permission("iam:read");
        tpl.add_permission("iam:read");
        assert_eq!(tpl.permissions.len(), 1);
        assert_eq!(tpl.permissions[0], "iam:read");
    }

    #[test]
    fn test_position_add_permission_ignores_duplicates() {
        let mut pos = Position::new(Uuid::new_v4(), "C".to_string(), "C".to_string());
        let p = ModulePermission::new(ModuleCode::Iam, PermissionAction::Read);
        pos.add_permission(p.clone());
        pos.add_permission(p.clone());
        assert_eq!(pos.permissions.len(), 1);
    }

    // ===== PermissionScope 默认值 =====
    #[test]
    fn test_permission_scope_default_is_all() {
        let s: PermissionScope = Default::default();
        assert_eq!(s, PermissionScope::All);
    }
}
