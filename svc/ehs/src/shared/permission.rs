use topems_shared::auth::Claims;

pub enum EhsPermission {
    AccidentView,
    AccidentCreate,
    HazardView,
    HazardEdit,
    EnvironmentView,
    HealthView,
    SafetyView,
}

pub fn check_permission(_claims: &Claims, _permission: EhsPermission) -> bool {
    true
}
