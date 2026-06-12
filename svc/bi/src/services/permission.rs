use topems_shared::auth::Claims;
use topems_shared::permission::ModulePermission as SharedModulePermission;
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum BIPermission {
    DashboardRead,
    DashboardWrite,
    ReportRead,
    ReportWrite,
    DataSourceRead,
    DataSourceWrite,
    DataViewRead,
    DataViewWrite,
    AnalyticsRead,
    AnalyticsWrite,
    All,
}

impl std::fmt::Display for BIPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BIPermission::DashboardRead => write!(f, "bi.dashboard_read"),
            BIPermission::DashboardWrite => write!(f, "bi.dashboard_write"),
            BIPermission::ReportRead => write!(f, "bi.report_read"),
            BIPermission::ReportWrite => write!(f, "bi.report_write"),
            BIPermission::DataSourceRead => write!(f, "bi.datasource_read"),
            BIPermission::DataSourceWrite => write!(f, "bi.datasource_write"),
            BIPermission::DataViewRead => write!(f, "bi.dataview_read"),
            BIPermission::DataViewWrite => write!(f, "bi.dataview_write"),
            BIPermission::AnalyticsRead => write!(f, "bi.analytics_read"),
            BIPermission::AnalyticsWrite => write!(f, "bi.analytics_write"),
            BIPermission::All => write!(f, "bi.all"),
        }
    }
}

impl SharedModulePermission for BIPermission {
    fn module_name() -> &'static str {
        "bi"
    }

    fn all_permission() -> Self {
        BIPermission::All
    }
}

pub async fn check_permission<T>(
    claims: &Claims,
    permission: &BIPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    let module_manage = format!("{}.manage", BIPermission::module_name());
    if claims.has_permission(&module_manage) {
        return Ok(());
    }

    if claims.has_permission(&permission.to_string()) {
        return Ok(());
    }

    Err(axum::Json(ApiResponse::error(
        403,
        &format!("权限不足：需要 {} 权限", permission),
    )))
}
