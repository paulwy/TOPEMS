use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, check_resource_permission, ModuleCode,
    ModulePermission as SharedModulePermission, PermissionAction,
};
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub enum ScmPermission {
    SupplierRead,
    SupplierWrite,
    PurchaseOrderRead,
    PurchaseOrderWrite,
    PurchaseOrderApprove,
    PurchaseItemRead,
    PurchaseItemWrite,
    SupplierEvaluationRead,
    SupplierEvaluationWrite,
    SupplierDeliveryAppointmentRead,
    SupplierDeliveryAppointmentWrite,
    SupplierDeliveryAppointmentApprove,
    PriceComparisonRead,
    PriceComparisonWrite,
    All,
}

impl ScmPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            ScmPermission::SupplierRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::SupplierWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::PurchaseOrderRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::PurchaseOrderWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::PurchaseOrderApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Approve)
            }
            ScmPermission::PurchaseItemRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::PurchaseItemWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::SupplierEvaluationRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::SupplierEvaluationWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::SupplierDeliveryAppointmentRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::SupplierDeliveryAppointmentWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::SupplierDeliveryAppointmentApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Approve)
            }
            ScmPermission::PriceComparisonRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::PriceComparisonWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::All => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for ScmPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = ScmPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &ScmPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub async fn check_supplier_permission<T>(
    db: &PgPool,
    claims: &Claims,
    supplier_id: &Uuid,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_resource_permission(db, claims, supplier_id, "supplier", "scm:admin").await
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_auth::permission::{ModuleCode, PermissionAction};

    fn shared(p: &ScmPermission) -> SharedModulePermission {
        p.to_shared()
    }

    #[test]
    fn supplier_read_maps_to_scm_read() {
        let s = shared(&ScmPermission::SupplierRead);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Read);
    }

    #[test]
    fn supplier_write_maps_to_scm_write() {
        let s = shared(&ScmPermission::SupplierWrite);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Write);
    }

    #[test]
    fn purchase_order_read_maps_to_scm_read() {
        let s = shared(&ScmPermission::PurchaseOrderRead);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Read);
    }

    #[test]
    fn purchase_order_write_maps_to_scm_write() {
        let s = shared(&ScmPermission::PurchaseOrderWrite);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Write);
    }

    #[test]
    fn purchase_order_approve_maps_to_scm_approve() {
        let s = shared(&ScmPermission::PurchaseOrderApprove);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Approve);
    }

    #[test]
    fn purchase_item_read_maps_to_scm_read() {
        let s = shared(&ScmPermission::PurchaseItemRead);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Read);
    }

    #[test]
    fn purchase_item_write_maps_to_scm_write() {
        let s = shared(&ScmPermission::PurchaseItemWrite);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Write);
    }

    #[test]
    fn supplier_evaluation_read_maps_to_scm_read() {
        let s = shared(&ScmPermission::SupplierEvaluationRead);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Read);
    }

    #[test]
    fn supplier_evaluation_write_maps_to_scm_write() {
        let s = shared(&ScmPermission::SupplierEvaluationWrite);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Write);
    }

    #[test]
    fn supplier_delivery_appointment_read_maps_to_scm_read() {
        let s = shared(&ScmPermission::SupplierDeliveryAppointmentRead);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Read);
    }

    #[test]
    fn supplier_delivery_appointment_write_maps_to_scm_write() {
        let s = shared(&ScmPermission::SupplierDeliveryAppointmentWrite);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Write);
    }

    #[test]
    fn supplier_delivery_appointment_approve_maps_to_scm_approve() {
        let s = shared(&ScmPermission::SupplierDeliveryAppointmentApprove);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Approve);
    }

    #[test]
    fn price_comparison_read_maps_to_scm_read() {
        let s = shared(&ScmPermission::PriceComparisonRead);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Read);
    }

    #[test]
    fn price_comparison_write_maps_to_scm_write() {
        let s = shared(&ScmPermission::PriceComparisonWrite);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Write);
    }

    #[test]
    fn all_maps_to_scm_admin() {
        let s = shared(&ScmPermission::All);
        assert_eq!(s.module, ModuleCode::Scm);
        assert_eq!(s.action, PermissionAction::Admin);
    }

    #[test]
    fn display_outputs_module_colon_action() {
        let perms = vec![
            ScmPermission::SupplierRead,
            ScmPermission::SupplierWrite,
            ScmPermission::PurchaseOrderRead,
            ScmPermission::PurchaseOrderWrite,
            ScmPermission::PurchaseOrderApprove,
            ScmPermission::PurchaseItemRead,
            ScmPermission::PurchaseItemWrite,
            ScmPermission::SupplierEvaluationRead,
            ScmPermission::SupplierEvaluationWrite,
            ScmPermission::SupplierDeliveryAppointmentRead,
            ScmPermission::SupplierDeliveryAppointmentWrite,
            ScmPermission::SupplierDeliveryAppointmentApprove,
            ScmPermission::PriceComparisonRead,
            ScmPermission::PriceComparisonWrite,
            ScmPermission::All,
        ];
        for p in perms {
            let s = format!("{}", p);
            assert!(
                s.starts_with("scm:"),
                "display should start with scm: got {}",
                s
            );
        }
    }

    #[test]
    fn enum_equality_and_clone_hold() {
        let a = ScmPermission::SupplierRead;
        let b = a.clone();
        assert_eq!(a, b);
        assert_ne!(a, ScmPermission::SupplierWrite);
    }

    #[test]
    fn module_permission_type_alias_resolves() {
        let p: ModulePermission = ScmPermission::PurchaseOrderApprove;
        assert_eq!(p.to_shared().action, PermissionAction::Approve);
    }
}
