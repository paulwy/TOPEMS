//! MES Permission Module
//!
//! 权限检查模块，用于验证用户对MES资源的访问权限

use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
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
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::ProductionOrderRead => write!(f, "mes:production_order:read"),
            ModulePermission::ProductionOrderWrite => write!(f, "mes:production_order:write"),
            ModulePermission::ProductionOrderStart => write!(f, "mes:production_order:start"),
            ModulePermission::ProductionOrderComplete => write!(f, "mes:production_order:complete"),
            ModulePermission::ProductionOrderCancel => write!(f, "mes:production_order:cancel"),
            ModulePermission::ProcessRead => write!(f, "mes:process:read"),
            ModulePermission::ProcessWrite => write!(f, "mes:process:write"),
            ModulePermission::RecordRead => write!(f, "mes:record:read"),
            ModulePermission::RecordWrite => write!(f, "mes:record:write"),
            ModulePermission::EquipmentRead => write!(f, "mes:equipment:read"),
            ModulePermission::EquipmentWrite => write!(f, "mes:equipment:write"),
            ModulePermission::WorkStationRead => write!(f, "mes:work_station:read"),
            ModulePermission::WorkStationWrite => write!(f, "mes:work_station:write"),
            ModulePermission::All => write!(f, "mes:admin"),
        }
    }
}

pub async fn check_permission<T>(
    _db: &PgPool,
    claims: &Claims,
    permission: &ModulePermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    let permission_str = permission.to_string();

    if claims.has_permission(&permission_str) {
        return Ok(());
    }

    if claims.has_permission("mes:admin") {
        return Ok(());
    }

    if claims.has_permission("all") {
        return Ok(());
    }

    Err(axum::Json(ApiResponse::error(
        403,
        &format!("权限不足：需要 {} 权限", permission),
    )))
}