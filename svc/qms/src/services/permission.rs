use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModulePermission as SharedModulePermission,
};
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
    QualityRead,
    QualityWrite,
    AuditRead,
    AuditWrite,
    ComplaintRead,
    ComplaintWrite,
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::QualityRead => write!(f, "quality_read"),
            ModulePermission::QualityWrite => write!(f, "quality_write"),
            ModulePermission::AuditRead => write!(f, "audit_read"),
            ModulePermission::AuditWrite => write!(f, "audit_write"),
            ModulePermission::ComplaintRead => write!(f, "complaint_read"),
            ModulePermission::ComplaintWrite => write!(f, "complaint_write"),
            ModulePermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for ModulePermission {
    fn module_name() -> &'static str {
        "qms"
    }

    fn all_permission() -> Self {
        ModulePermission::All
    }
}

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &ModulePermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_module_permission(db, claims, permission).await
}
