//! ERP system/admin compatibility endpoints for OpenAPI documentation.
//!
//! These functions register frontend admin/system API calls that are managed
//! through ERP compatibility paths.

#![allow(dead_code)]
#[utoipa::path(
    get,
    path = "/api/erp/system/audit-logs",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_get_api_erp_system_audit_logs() {}

#[utoipa::path(
    get,
    path = "/api/erp/system/audit-logs/{id}",
    tag = "ERP-System-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_get_api_erp_system_audit_logs_id() {}

#[utoipa::path(
    get,
    path = "/api/erp/system/audit-logs/export",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_get_api_erp_system_audit_logs_export() {}

#[utoipa::path(
    get,
    path = "/api/erp/system/settings",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_get_api_erp_system_settings() {}

#[utoipa::path(
    post,
    path = "/api/erp/system/settings",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_post_api_erp_system_settings() {}

#[utoipa::path(
    get,
    path = "/api/erp/system/settings/{key}",
    tag = "ERP-System-Compat",
    params(("key" = String, Path, description = "key")),
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_get_api_erp_system_settings_key() {}

#[utoipa::path(
    put,
    path = "/api/erp/system/settings/{key}",
    tag = "ERP-System-Compat",
    params(("key" = String, Path, description = "key")),
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_put_api_erp_system_settings_key() {}

#[utoipa::path(
    delete,
    path = "/api/erp/system/settings/{key}",
    tag = "ERP-System-Compat",
    params(("key" = String, Path, description = "key")),
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_delete_api_erp_system_settings_key() {}

#[utoipa::path(
    put,
    path = "/api/erp/system/settings/batch",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_put_api_erp_system_settings_batch() {}

#[utoipa::path(
    get,
    path = "/api/erp/system/config",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_get_api_erp_system_config() {}

#[utoipa::path(
    put,
    path = "/api/erp/system/config",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_put_api_erp_system_config() {}

#[utoipa::path(
    get,
    path = "/api/erp/system/db/tables",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_get_api_erp_system_db_tables() {}

#[utoipa::path(
    get,
    path = "/api/erp/system/db/tables/{tableName}",
    tag = "ERP-System-Compat",
    params(("tableName" = String, Path, description = "tableName")),
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_get_api_erp_system_db_tables_tablename() {}

#[utoipa::path(
    post,
    path = "/api/erp/system/db/columns/preview",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_post_api_erp_system_db_columns_preview() {}

#[utoipa::path(
    post,
    path = "/api/erp/system/db/columns",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_post_api_erp_system_db_columns() {}

#[utoipa::path(
    put,
    path = "/api/erp/system/db/columns/{tableName}/{columnName}",
    tag = "ERP-System-Compat",
    params(
        ("tableName" = String, Path, description = "tableName"),
        ("columnName" = String, Path, description = "columnName")
    ),
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_put_api_erp_system_db_columns_tablename_columnname() {}

#[utoipa::path(
    delete,
    path = "/api/erp/system/db/columns/{tableName}/{columnName}",
    tag = "ERP-System-Compat",
    params(
        ("tableName" = String, Path, description = "tableName"),
        ("columnName" = String, Path, description = "columnName")
    ),
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_delete_api_erp_system_db_columns_tablename_columnname() {}

#[utoipa::path(
    get,
    path = "/api/erp/system/db/changes",
    tag = "ERP-System-Compat",
    responses((status = 200, description = "ERP system compatibility endpoint"))
)]
pub async fn compat_get_api_erp_system_db_changes() {}
