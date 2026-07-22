//! MES Permission Module
//!
//! 权限检查模块，用于验证用户对MES资源的访问权限

use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum MesPermission {
    ProductionOrderRead,
    ProductionOrderWrite,
    ProductionOrderStart,
    ProductionOrderComplete,
    ProductionOrderCancel,
    ProcessRead,
    ProcessWrite,
    RecordRead,
    RecordWrite,
    EquipmentRead,
    EquipmentWrite,
    WorkStationRead,
    WorkStationWrite,
    ProductionSchedulingRead,
    ProductionSchedulingWrite,
    ProductionSchedulingAdjust,
    MaterialBomRead,
    MaterialBomWrite,
    MaterialBomIssue,
    MaterialBomReturn,
    QualityTraceabilityRead,
    EquipmentOeeRead,
    EquipmentOeeWrite,
    WipRead,
    WipWrite,
    WipTransfer,
    ProductionCostRead,
    All,
}

impl MesPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            MesPermission::ProductionOrderRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::ProductionOrderWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::ProductionOrderStart => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::ProductionOrderComplete => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::ProductionOrderCancel => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Delete)
            }
            MesPermission::ProcessRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::ProcessWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::RecordRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::RecordWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::EquipmentRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::EquipmentWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::WorkStationRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::WorkStationWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::ProductionSchedulingRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::ProductionSchedulingWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::ProductionSchedulingAdjust => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::MaterialBomRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::MaterialBomWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::MaterialBomIssue => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::MaterialBomReturn => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::QualityTraceabilityRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::EquipmentOeeRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::EquipmentOeeWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::WipRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::WipWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::WipTransfer => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            MesPermission::ProductionCostRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            MesPermission::All => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for MesPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = MesPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &MesPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}
