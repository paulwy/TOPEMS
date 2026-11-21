use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission_claims, check_resource_permission_claims, ModuleCode,
    ModulePermission as SharedModulePermission, PermissionAction,
};
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
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

/// 解析当前请求的租户绑定值（用于写入 `tenant_id` 或作为查询租户谓词）。
///
/// `tenant_middleware` 已把超管的 `x-tenant-id` 解析并**回填进 Claims**，
/// 因此这里只需读 `claims.tenant_id`，即可覆盖两类身份：
/// - 超管：等于显式选择的租户（缺失时中间件已 400，不会走到业务层）；
/// - 普通用户：等于自身租户（忽略伪造的 `x-tenant-id`）。
///
/// 缺失、非法或 nil uuid 一律返回 400，不再回退到 nil。"nil = 全量"的语义
/// 已在 SQL 谓词中清除，本函数是唯一的租户绑定入口。
pub fn require_tenant_bind<T>(claims: &Claims) -> Result<Uuid, axum::Json<ApiResponse<T>>> {
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .filter(|tid| !tid.is_nil());
    match tenant_id {
        Some(tid) => Ok(tid),
        None => Err(axum::Json(ApiResponse::bad_request("缺少租户上下文"))),
    }
}

pub async fn check_permission<T>(
    _db: &Db,
    claims: &Claims,
    permission: &ScmPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission_claims(claims, &shared_perm).await
}

pub async fn check_supplier_permission<T>(
    _db: &Db,
    claims: &Claims,
    supplier_id: &Uuid,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_resource_permission_claims(claims, supplier_id, "supplier", "scm:admin").await
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

    fn claims_with_tenant(tenant_id: Option<&str>) -> Claims {
        Claims {
            sub: Uuid::new_v4().to_string(),
            username: "tester".to_string(),
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant_id.map(str::to_string),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    #[test]
    fn require_tenant_bind_rejects_missing_tenant() {
        let err = require_tenant_bind::<serde_json::Value>(&claims_with_tenant(None))
            .expect_err("缺少 tenant_id 必须返回错误");
        assert_eq!(err.0.code, 400);
        assert_eq!(err.0.message, "缺少租户上下文");
    }

    #[test]
    fn require_tenant_bind_rejects_invalid_tenant() {
        let err = require_tenant_bind::<serde_json::Value>(&claims_with_tenant(Some("not-a-uuid")))
            .expect_err("非法 tenant_id 必须返回错误");
        assert_eq!(err.0.code, 400);
    }

    #[test]
    fn require_tenant_bind_rejects_nil_tenant() {
        let err = require_tenant_bind::<serde_json::Value>(&claims_with_tenant(Some(
            "00000000-0000-0000-0000-000000000000",
        )))
        .expect_err("nil tenant_id 必须返回错误");
        assert_eq!(err.0.code, 400);
    }

    #[test]
    fn require_tenant_bind_returns_tenant() {
        let tenant = "11111111-2222-3333-4444-555555555555";
        let bound = require_tenant_bind::<serde_json::Value>(&claims_with_tenant(Some(tenant)))
            .expect("合法 tenant_id 应成功");
        assert_eq!(bound, Uuid::parse_str(tenant).unwrap());
    }
}
