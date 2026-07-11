use topems_shared::auth::Claims;

pub enum MonitorPermission {
    AlertView,
    AlertAcknowledge,
    MetricView,
    ConfigEdit,
}

pub fn check_permission(_claims: &Claims, _permission: MonitorPermission) -> bool {
    true
}
