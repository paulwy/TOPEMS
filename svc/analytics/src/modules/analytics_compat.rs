//! BI compatibility OpenAPI paths.
//!
//! OpenAPI-only contract entries for frontend `/api/bi/*` calls
//! not represented by concrete utoipa handlers yet.

#![allow(dead_code, clippy::empty_loop)]

#[utoipa::path(
    delete,
    path = "/api/bi/annotations/{annotationId}",
    tag = "BI-Compat",
    params(("annotationId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_delete_api_bi_annotations_annotationid() {}

#[utoipa::path(
    post,
    path = "/api/bi/dashboard/template/{templateId}/create",
    tag = "BI-Compat",
    params(("templateId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_post_api_bi_dashboard_template_templateid_create() {}

#[utoipa::path(
    get,
    path = "/api/bi/dashboard/user/{ownerId}",
    tag = "BI-Compat",
    params(("ownerId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_dashboard_user_ownerid() {}

#[utoipa::path(
    get,
    path = "/api/bi/dashboards/{dashboardId}/links",
    tag = "BI-Compat",
    params(("dashboardId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_dashboards_dashboardid_links() {}

#[utoipa::path(
    put,
    path = "/api/bi/dashboards/{dashboardId}/links",
    tag = "BI-Compat",
    params(("dashboardId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_put_api_bi_dashboards_dashboardid_links() {}

#[utoipa::path(
    get,
    path = "/api/bi/permissions/data",
    tag = "BI-Compat",
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_permissions_data() {}

#[utoipa::path(
    post,
    path = "/api/bi/permissions/data",
    tag = "BI-Compat",
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_post_api_bi_permissions_data() {}

#[utoipa::path(
    delete,
    path = "/api/bi/permissions/data/{id}",
    tag = "BI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_delete_api_bi_permissions_data_id() {}

#[utoipa::path(
    put,
    path = "/api/bi/permissions/data/{id}",
    tag = "BI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_put_api_bi_permissions_data_id() {}

#[utoipa::path(
    get,
    path = "/api/bi/report/exports/{jobId}",
    tag = "BI-Compat",
    params(("jobId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_report_exports_jobid() {}

#[utoipa::path(
    get,
    path = "/api/bi/report/exports/{jobId}/download",
    tag = "BI-Compat",
    params(("jobId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_report_exports_jobid_download() {}

#[utoipa::path(
    delete,
    path = "/api/bi/report/schedules/{scheduleId}",
    tag = "BI-Compat",
    params(("scheduleId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_delete_api_bi_report_schedules_scheduleid() {}

#[utoipa::path(
    put,
    path = "/api/bi/report/schedules/{scheduleId}",
    tag = "BI-Compat",
    params(("scheduleId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_put_api_bi_report_schedules_scheduleid() {}

#[utoipa::path(
    post,
    path = "/api/bi/report/schedules/{scheduleId}/run",
    tag = "BI-Compat",
    params(("scheduleId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_post_api_bi_report_schedules_scheduleid_run() {}

#[utoipa::path(
    post,
    path = "/api/bi/report/schedules/{scheduleId}/toggle",
    tag = "BI-Compat",
    params(("scheduleId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_post_api_bi_report_schedules_scheduleid_toggle() {}

#[utoipa::path(
    post,
    path = "/api/bi/report/{id}/export",
    tag = "BI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_post_api_bi_report_id_export() {}

#[utoipa::path(
    get,
    path = "/api/bi/report/{reportId}/exports",
    tag = "BI-Compat",
    params(("reportId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_report_reportid_exports() {}

#[utoipa::path(
    get,
    path = "/api/bi/report/{reportId}/schedules",
    tag = "BI-Compat",
    params(("reportId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_report_reportid_schedules() {}

#[utoipa::path(
    post,
    path = "/api/bi/report/{reportId}/schedules",
    tag = "BI-Compat",
    params(("reportId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_post_api_bi_report_reportid_schedules() {}

#[utoipa::path(
    get,
    path = "/api/bi/widget/dashboard/{dashboardId}",
    tag = "BI-Compat",
    params(("dashboardId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_widget_dashboard_dashboardid() {}

#[utoipa::path(
    get,
    path = "/api/bi/widgets/{widgetId}/annotations",
    tag = "BI-Compat",
    params(("widgetId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_widgets_widgetid_annotations() {}

#[utoipa::path(
    post,
    path = "/api/bi/widgets/{widgetId}/annotations",
    tag = "BI-Compat",
    params(("widgetId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_post_api_bi_widgets_widgetid_annotations() {}

#[utoipa::path(
    get,
    path = "/api/bi/widgets/{widgetId}/drilldown",
    tag = "BI-Compat",
    params(("widgetId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_widgets_widgetid_drilldown() {}

#[utoipa::path(
    put,
    path = "/api/bi/widgets/{widgetId}/drilldown",
    tag = "BI-Compat",
    params(("widgetId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_put_api_bi_widgets_widgetid_drilldown() {}

#[utoipa::path(
    post,
    path = "/api/bi/widgets/{widgetId}/drilldown/execute",
    tag = "BI-Compat",
    params(("widgetId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_post_api_bi_widgets_widgetid_drilldown_execute() {}

#[utoipa::path(
    post,
    path = "/api/bi/widgets/{widgetId}/export",
    tag = "BI-Compat",
    params(("widgetId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_post_api_bi_widgets_widgetid_export() {}

#[utoipa::path(
    get,
    path = "/api/bi/widgets/{widgetId}/fullscreen",
    tag = "BI-Compat",
    params(("widgetId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_widgets_widgetid_fullscreen() {}

#[utoipa::path(
    get,
    path = "/api/bi/{moduleId}",
    tag = "BI-Compat",
    params(("moduleId" = String, Path, description = "id")),
    responses((status = 200, description = "BI compatibility endpoint"))
)]
pub async fn compat_get_api_bi_moduleid() {}
