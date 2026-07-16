use topems_shared::auth::Claims;

pub enum AnalyticsPermission {
    ChartView,
    ChartCreate,
    DashboardView,
    DashboardEdit,
    DataExport,
}

pub type ModulePermission = AnalyticsPermission;

pub fn check_permission(_claims: &Claims, _permission: AnalyticsPermission) -> bool {
    true
}
