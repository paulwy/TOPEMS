pub mod department;
pub mod module;
pub mod permission;
pub mod service_identity;
pub mod tenant;

pub use department::{department_middleware, require_department};
pub use module::{require_module_active, require_module_permission};
pub use permission::{
    require_all_permissions, require_any_permission, require_permission, require_role,
    require_superuser,
};
pub use service_identity::{service_identity_middleware, ServiceIdentity};
pub use tenant::{
    get_tenant_id, get_tenant_id_from_claims, require_tenant_status, resolve_create_tenant,
    tenant_middleware,
};
