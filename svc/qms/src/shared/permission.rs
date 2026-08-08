use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum QmsPermission {
    CheckRead,
    CheckWrite,
    IssueRead,
    IssueWrite,
    StandardRead,
    StandardWrite,
    ActionRead,
    ActionWrite,
    AuditPlanRead,
    AuditPlanWrite,
    AuditTaskRead,
    AuditTaskWrite,
    AuditFindingRead,
    AuditFindingWrite,
    SpcRead,
    SpcWrite,
    QualityCostRead,
    QualityCostWrite,
    EightdRead,
    EightdWrite,
    FmeaRead,
    FmeaWrite,
    DashboardRead,
    AlertRuleRead,
    AlertRuleWrite,
    ApqpRead,
    ApqpWrite,
    SyncRead,
    SyncWrite,
    All,
}

impl QmsPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            QmsPermission::CheckRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::CheckWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::IssueRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::IssueWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::StandardRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::StandardWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::ActionRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::ActionWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::AuditPlanRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::AuditPlanWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::AuditTaskRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::AuditTaskWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::AuditFindingRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::AuditFindingWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::SpcRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::SpcWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::QualityCostRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::QualityCostWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::EightdRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::EightdWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::FmeaRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::FmeaWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::DashboardRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::AlertRuleRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::AlertRuleWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::ApqpRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::ApqpWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::SyncRead => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Read)
            }
            QmsPermission::SyncWrite => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Write)
            }
            QmsPermission::All => {
                SharedModulePermission::new(ModuleCode::Qms, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for QmsPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = QmsPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &QmsPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub fn has_qms_permission(claims: &Claims, action: &str) -> bool {
    if claims.is_superuser {
        return true;
    }

    let permission_str = format!("qms:{}", action);
    claims.has_permission(&permission_str)
        || claims.has_permission("qms:admin")
        || claims.has_permission("all")
}
