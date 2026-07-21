use crate::auth::Claims;
use crate::response::ApiResponse;
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
    module: ModuleCode,
    action: PermissionAction,
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
}

impl ResourcePermission {
    pub fn new(module: ModuleCode, resource: String, action: PermissionAction) -> Self {
        ResourcePermission {
            module,
            resource,
            action,
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        let parts: Vec<&str> = s.split(':').collect();
        if parts.len() != 3 {
            return None;
        }
        let module = ModuleCode::from_str(parts[0])?;
        let action = PermissionAction::from_str(parts[2])?;
        Some(ResourcePermission {
            module,
            resource: parts[1].to_string(),
            action,
        })
    }

    pub fn implies(&self, other: &ResourcePermission) -> bool {
        if self.module != other.module || self.resource != other.resource {
            return false;
        }
        self.action.level() >= other.action.level()
    }
}

impl std::fmt::Display for ResourcePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}:{}:{}",
            self.module.as_str(),
            self.resource,
            self.action.as_str()
        )
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
