//! MES Permission Module
//!
//! 权限检查模块，用于验证用户对MES资源的访问权限

use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

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
    MesOrderApprove,
    MesReworkApprove,
    MesConcessionApprove,
    MesAnomalyApprove,
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
            MesPermission::MesOrderApprove => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Approve)
            }
            MesPermission::MesReworkApprove => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Approve)
            }
            MesPermission::MesConcessionApprove => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Approve)
            }
            MesPermission::MesAnomalyApprove => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Approve)
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

#[cfg(test)]
mod tests {
    use super::*;

    // ── MesPermission::to_shared() 映射测试 ─────────────

    #[test]
    fn production_order_read_maps_to_mes_read() {
        let p = MesPermission::ProductionOrderRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn production_order_write_maps_to_mes_write() {
        let p = MesPermission::ProductionOrderWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn production_order_start_maps_to_mes_write() {
        let p = MesPermission::ProductionOrderStart.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn production_order_complete_maps_to_mes_write() {
        let p = MesPermission::ProductionOrderComplete.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn production_order_cancel_maps_to_mes_delete() {
        let p = MesPermission::ProductionOrderCancel.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Delete);
    }

    #[test]
    fn process_read_maps_to_mes_read() {
        let p = MesPermission::ProcessRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn process_write_maps_to_mes_write() {
        let p = MesPermission::ProcessWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn record_read_maps_to_mes_read() {
        let p = MesPermission::RecordRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn record_write_maps_to_mes_write() {
        let p = MesPermission::RecordWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn equipment_read_maps_to_mes_read() {
        let p = MesPermission::EquipmentRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn equipment_write_maps_to_mes_write() {
        let p = MesPermission::EquipmentWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn work_station_read_maps_to_mes_read() {
        let p = MesPermission::WorkStationRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn work_station_write_maps_to_mes_write() {
        let p = MesPermission::WorkStationWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn production_scheduling_read_maps_to_mes_read() {
        let p = MesPermission::ProductionSchedulingRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn production_scheduling_write_maps_to_mes_write() {
        let p = MesPermission::ProductionSchedulingWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn production_scheduling_adjust_maps_to_mes_write() {
        let p = MesPermission::ProductionSchedulingAdjust.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn material_bom_read_maps_to_mes_read() {
        let p = MesPermission::MaterialBomRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn material_bom_write_maps_to_mes_write() {
        let p = MesPermission::MaterialBomWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn material_bom_issue_maps_to_mes_write() {
        let p = MesPermission::MaterialBomIssue.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn material_bom_return_maps_to_mes_write() {
        let p = MesPermission::MaterialBomReturn.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn quality_traceability_read_maps_to_mes_read() {
        let p = MesPermission::QualityTraceabilityRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn equipment_oee_read_maps_to_mes_read() {
        let p = MesPermission::EquipmentOeeRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn equipment_oee_write_maps_to_mes_write() {
        let p = MesPermission::EquipmentOeeWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn wip_read_maps_to_mes_read() {
        let p = MesPermission::WipRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn wip_write_maps_to_mes_write() {
        let p = MesPermission::WipWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn wip_transfer_maps_to_mes_write() {
        let p = MesPermission::WipTransfer.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn production_cost_read_maps_to_mes_read() {
        let p = MesPermission::ProductionCostRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    // ── 审批权限映射测试 ─────────────────────────────────

    #[test]
    fn mes_order_approve_maps_to_mes_approve() {
        let p = MesPermission::MesOrderApprove.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Approve);
    }

    #[test]
    fn mes_rework_approve_maps_to_mes_approve() {
        let p = MesPermission::MesReworkApprove.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Approve);
    }

    #[test]
    fn mes_concession_approve_maps_to_mes_approve() {
        let p = MesPermission::MesConcessionApprove.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Approve);
    }

    #[test]
    fn mes_anomaly_approve_maps_to_mes_approve() {
        let p = MesPermission::MesAnomalyApprove.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Approve);
    }

    #[test]
    fn all_maps_to_mes_admin() {
        let p = MesPermission::All.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Admin);
    }

    // ── Display trait 测试 ───────────────────────────────

    #[test]
    fn display_returns_shared_permission_string() {
        let p = MesPermission::ProductionOrderRead;
        let s = format!("{}", p);
        assert!(!s.is_empty());
    }

    // ── 全变体覆盖测试（确保33个变体都被处理）────────────

    #[test]
    fn all_permissions_map_to_mes_module() {
        let all = vec![
            MesPermission::ProductionOrderRead,
            MesPermission::ProductionOrderWrite,
            MesPermission::ProductionOrderStart,
            MesPermission::ProductionOrderComplete,
            MesPermission::ProductionOrderCancel,
            MesPermission::ProcessRead,
            MesPermission::ProcessWrite,
            MesPermission::RecordRead,
            MesPermission::RecordWrite,
            MesPermission::EquipmentRead,
            MesPermission::EquipmentWrite,
            MesPermission::WorkStationRead,
            MesPermission::WorkStationWrite,
            MesPermission::ProductionSchedulingRead,
            MesPermission::ProductionSchedulingWrite,
            MesPermission::ProductionSchedulingAdjust,
            MesPermission::MaterialBomRead,
            MesPermission::MaterialBomWrite,
            MesPermission::MaterialBomIssue,
            MesPermission::MaterialBomReturn,
            MesPermission::QualityTraceabilityRead,
            MesPermission::EquipmentOeeRead,
            MesPermission::EquipmentOeeWrite,
            MesPermission::WipRead,
            MesPermission::WipWrite,
            MesPermission::WipTransfer,
            MesPermission::ProductionCostRead,
            MesPermission::MesOrderApprove,
            MesPermission::MesReworkApprove,
            MesPermission::MesConcessionApprove,
            MesPermission::MesAnomalyApprove,
            MesPermission::All,
        ];
        assert_eq!(all.len(), 32, "应该有32个权限变体");
        for p in &all {
            assert_eq!(p.to_shared().module, ModuleCode::Mes);
        }
    }
}
