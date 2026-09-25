//! Report handlers

use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tracing::info;
use uuid::Uuid;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/reports", get(list_reports).post(create_report))
        .route("/reports/from-template", post(create_report_from_template))
        .route(
            "/reports/{id}",
            get(get_report).put(update_report).delete(delete_report),
        )
        .route("/reports/{id}/export", post(export_report))
        .route("/reports/{id}/run", post(run_report))
        .route("/reports/{id}/exports", get(list_export_jobs))
        .route("/reports/exports/{job_id}", get(get_export_job))
        .route("/reports/exports/{job_id}/download", get(download_export))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReportRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub template_id: Option<Uuid>,
    pub parameters: Option<serde_json::Value>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReportFromTemplateRequest {
    pub template_id: Uuid,
    pub report_name: Option<String>,
    pub parameters: Option<serde_json::Value>,
    pub created_by: String,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/reports",
    tag = "Reports",
    operation_id = "list_reports",
    responses((status = 200, description = "OK")),
)]
pub async fn list_reports(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing reports");

    let reports = sqlx::query(
        r#"
        SELECT id, name, description, report_type, status, template_id, created_by, created_at
        FROM reports
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = reports
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "name": r.get::<String, _>("name"),
                "description": r.get::<Option<String>, _>("description"),
                "report_type": r.get::<String, _>("report_type"),
                "status": r.get::<String, _>("status"),
                "template_id": r.get::<Option<Uuid>, _>("template_id"),
                "created_by": r.get::<String, _>("created_by"),
                "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "data": result,
        "total": result.len()
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:write"])),
    path = "/reports",
    tag = "Reports",
    operation_id = "create_report",
    responses((status = 200, description = "OK")),
)]
pub async fn create_report(
    State(state): State<AppState>,
    Json(req): Json<CreateReportRequest>,
) -> Json<serde_json::Value> {
    info!("Creating report");

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO reports (id, name, description, report_type, config, template_id, created_by, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#,
    )
    .bind(id)
    .bind(req.name.unwrap_or_else(|| "Untitled Report".to_string()))
    .bind(req.description)
    .bind("custom")
    .bind(req.parameters.unwrap_or(serde_json::json!({})))
    .bind(req.template_id)
    .bind(req.created_by)
    .bind("draft")
    .bind(now)
    .bind(now)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Report created",
            "data": id
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create report: {}", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:write"])),
    path = "/reports/from-template",
    tag = "Reports",
    operation_id = "create_report_from_template",
    responses((status = 200, description = "OK")),
)]
pub async fn create_report_from_template(
    State(state): State<AppState>,
    Json(req): Json<CreateReportFromTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Creating report from template: {}", req.template_id);

    let template = sqlx::query(
        r#"
        SELECT id, name, report_type, data_source, layout_config, filter_config, style_config, columns, output_format
        FROM report_templates
        WHERE id = $1 AND is_active = TRUE
        "#,
    )
    .bind(req.template_id)
    .fetch_optional(&state.pool)
    .await;

    match template {
        Ok(Some(row)) => {
            let id = Uuid::new_v4();
            let now = chrono::Utc::now();
            let t_name: String = row.get("name");
            let t_report_type: String = row.get("report_type");
            let t_data_source: serde_json::Value = row.get("data_source");
            let t_layout_config: serde_json::Value = row.get("layout_config");
            let t_filter_config: serde_json::Value = row.get("filter_config");
            let t_style_config: serde_json::Value = row.get("style_config");
            let t_columns: serde_json::Value = row.get("columns");
            let t_output_format: String = row.get("output_format");
            let report_name = req
                .report_name
                .unwrap_or_else(|| format!("{} - Report", t_name));

            let config = serde_json::json!({
                "report_type": t_report_type,
                "data_source": t_data_source,
                "layout_config": t_layout_config,
                "filter_config": t_filter_config,
                "style_config": t_style_config,
                "columns": t_columns,
                "output_format": t_output_format,
                "parameters": req.parameters.unwrap_or(serde_json::json!({}))
            });

            let result = sqlx::query(
                r#"
                INSERT INTO reports (id, name, description, report_type, config, template_id, created_by, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                "#,
            )
            .bind(id)
            .bind(report_name.clone())
            .bind(t_name)
            .bind(t_report_type.clone())
            .bind(config)
            .bind(req.template_id)
            .bind(req.created_by)
            .bind("draft")
            .bind(now)
            .bind(now)
            .execute(&state.pool)
            .await;

            match result {
                Ok(_) => Json(serde_json::json!({
                    "success": true,
                    "message": "Report created from template",
                    "data": {
                        "id": id,
                        "name": report_name,
                        "report_type": t_report_type,
                        "template_id": req.template_id
                    }
                })),
                Err(e) => Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to create report: {}", e),
                )),
            }
        }
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Template not found or inactive",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to get template: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/reports/{id}",
    tag = "Reports",
    operation_id = "get_report",
    responses((status = 200, description = "OK")),
)]
pub async fn get_report(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting report: {}", id);

    let report = sqlx::query!(
        r#"
        SELECT id, name, description, report_type, config, template_id, created_by, status, last_run_at, created_at, updated_at
        FROM reports
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&state.pool)
    .await;

    match report {
        Ok(Some(r)) => Json(serde_json::json!({
            "success": true,
            "data": {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "report_type": r.report_type,
                "config": r.config,
                "template_id": r.template_id,
                "created_by": r.created_by,
                "status": r.status,
                "last_run_at": r.last_run_at,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            }
        })),
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Report not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to get report: {}", e),
        )),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/reports/{id}",
    tag = "Reports",
    operation_id = "update_report",
    responses((status = 200, description = "OK")),
)]
pub async fn update_report(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    info!("Updating report: {}", id);

    let name = req.get("name").and_then(|v| v.as_str());
    let description = req.get("description").and_then(|v| v.as_str());
    let status = req.get("status").and_then(|v| v.as_str());
    let config = req.get("config");

    let result = sqlx::query(
        r#"
        UPDATE reports
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            status = COALESCE($3, status),
            config = COALESCE($4, config),
            updated_at = $5
        WHERE id = $6
        "#,
    )
    .bind(name)
    .bind(description)
    .bind(status)
    .bind(config)
    .bind(chrono::Utc::now())
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Report updated"
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to update report: {}", e),
        )),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/reports/{id}",
    tag = "Reports",
    operation_id = "delete_report",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_report(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting report: {}", id);

    let result = sqlx::query!(
        r#"
        UPDATE reports SET deleted_at = NOW()
        WHERE id = $1
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Report deleted"
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to delete report: {}", e),
        )),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:admin"])),
    path = "/reports/{id}/export",
    tag = "Reports",
    operation_id = "export_report",
    responses((status = 200, description = "OK")),
)]
pub async fn export_report(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Exporting report: {}", id);

    let report = sqlx::query(
        r#"
        SELECT name, report_type, config, output_format
        FROM reports
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match report {
        Ok(Some(row)) => {
            let r_name: String = row.get("name");
            let r_report_type: String = row.get("report_type");
            let r_config: serde_json::Value = row.get("config");
            let r_output_format: Option<String> = row.get("output_format");
            Json(serde_json::json!({
                "success": true,
                "message": "Export report",
                "data": {
                    "id": id,
                    "name": r_name,
                    "report_type": r_report_type,
                    "output_format": r_config.as_object().and_then(|c| c.get("output_format").and_then(|v| v.as_str())).unwrap_or(&r_output_format.unwrap_or_else(|| "pdf".to_string()))
                }
            }))
        }
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Report not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to export report: {}", e),
        )),
    }
}

pub async fn list_export_jobs(
    State(_state): State<AppState>,
    Path(_report_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Listing export jobs");
    Json(serde_json::json!({
        "success": true,
        "data": [],
        "total": 0
    }))
}

pub async fn get_export_job(
    State(_state): State<AppState>,
    Path(_job_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting export job");
    Json(serde_json::json!({
        "success": true,
        "data": {
            "id": _job_id,
            "status": "completed",
            "downloadUrl": "/download/placeholder"
        }
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/reports/exports/{job_id}/download",
    params(
        ("job_id" = String, Path, description = "job_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Report"
)]
pub async fn download_export(
    State(_state): State<AppState>,
    Path(_job_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Downloading export: {}", _job_id);
    Json(serde_json::json!({
        "success": true,
        "message": "Download export"
    }))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:admin"])),
    path = "/reports/{id}/run",
    tag = "Reports",
    operation_id = "run_report",
    responses((status = 200, description = "OK")),
)]
pub async fn run_report(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Running report: {}", id);

    let result = sqlx::query(
        r#"
        UPDATE reports
        SET status = 'running', last_run_at = $1
        WHERE id = $2
        "#,
    )
    .bind(chrono::Utc::now())
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Report is running",
            "data": id
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to run report: {}", e),
        )),
    }
}
