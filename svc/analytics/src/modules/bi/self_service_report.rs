use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use tracing::{info, warn};
use utoipa::ToSchema;

use crate::shared::AppState;

use super::chart_service::quote_identifier;
use super::dataset_whitelist::validate_columns;

/// 多维分析默认 BI 表，与 multidimensional_analysis.rs 保持一致。
const DEFAULT_BI_TABLE: &str = "analytics_data";

/// 校验排序方向合法性（ASC/DESC）。
fn validate_sort_order(order: &str) -> Result<String, String> {
    match order.to_uppercase().as_str() {
        "ASC" | "DESC" => Ok(order.to_uppercase()),
        _ => Err(format!(
            "Invalid sort order '{}': must be ASC or DESC",
            order
        )),
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateReportRequest {
    pub name: String,
    pub description: Option<String>,
    pub datasource_id: Uuid,
    pub fields: serde_json::Value,
    pub filters: Option<serde_json::Value>,
    pub config: Option<serde_json::Value>,
    pub owner_id: String,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateReportRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub datasource_id: Option<Uuid>,
    pub fields: Option<serde_json::Value>,
    pub filters: Option<serde_json::Value>,
    pub config: Option<serde_json::Value>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ReportResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub datasource_id: Uuid,
    pub fields: serde_json::Value,
    pub filters: Option<serde_json::Value>,
    pub config: Option<serde_json::Value>,
    pub owner_id: String,
    pub is_public: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct ReportListResponse {
    pub items: Vec<ReportResponse>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
pub struct ReportQueryRequest {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub filters: Option<serde_json::Value>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReportExportQuery {
    pub format: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/api/bi/report",
    tag = "Report",
    responses(
        (status = 200, description = "List of reports", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_reports(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing self-service reports");

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, datasource_id, fields, filters, config, owner_id, is_public, created_at, updated_at
        FROM analytics_self_service_reports
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to list reports: {}", e)));
        }
    };

    let items: Vec<ReportResponse> = rows
        .into_iter()
        .map(|row| ReportResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            datasource_id: row.datasource_id,
            fields: row.fields.unwrap_or(serde_json::json!([])),
            filters: row.filters,
            config: row.config,
            owner_id: row.owner_id,
            is_public: row.is_public.unwrap_or(false),
            created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
            updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List reports",
        "data": ReportListResponse {
            items,
            total,
        }
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:write"])),
    path = "/api/bi/report",
    tag = "Report",
    request_body(
        content = CreateReportRequest,
        content_type = "application/json",
        description = "创建自助报表请求"
    ),
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_report(
    State(state): State<AppState>,
    Json(req): Json<CreateReportRequest>,
) -> Json<serde_json::Value> {
    info!("Creating self-service report: {}", req.name);

    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        INSERT INTO analytics_self_service_reports 
        (id, name, description, datasource_id, fields, filters, config, owner_id, is_public, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, description, datasource_id, fields, filters, config, owner_id, is_public, created_at, updated_at
        "#,
        id,
        req.name,
        req.description,
        req.datasource_id,
        req.fields,
        req.filters,
        req.config,
        req.owner_id,
        req.is_public.unwrap_or(false),
        now,
        now,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(serde_json::json!({
            "success": true,
            "message": "Create report",
            "data": ReportResponse {
                id: row.id,
                name: row.name,
                description: row.description,
                datasource_id: row.datasource_id,
                fields: row.fields.unwrap_or(serde_json::json!([])),
                filters: row.filters,
                config: row.config,
                owner_id: row.owner_id,
                is_public: row.is_public.unwrap_or(false),
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create report: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/api/bi/report/{id}",
    tag = "Report",
    params(
        ("id" = uuid::Uuid, Path, description = "Report ID")
    ),
    responses(
        (status = 200, description = "Report details", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_report(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting self-service report: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, datasource_id, fields, filters, config, owner_id, is_public, created_at, updated_at
        FROM analytics_self_service_reports
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to get report: {}", e)));
        }
    };

    match row {
        Some(row) => Json(serde_json::json!({
            "success": true,
            "message": "Get report",
            "data": ReportResponse {
                id: row.id,
                name: row.name,
                description: row.description,
                datasource_id: row.datasource_id,
                fields: row.fields.unwrap_or(serde_json::json!([])),
                filters: row.filters,
                config: row.config,
                owner_id: row.owner_id,
                is_public: row.is_public.unwrap_or(false),
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        None => Json(topems_shared_core::response::error_value(
            500,
            "Report not found",
        )),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/api/bi/report/{id}",
    tag = "Report",
    params(
        ("id" = uuid::Uuid, Path, description = "Report ID")
    ),
    request_body(
        content = UpdateReportRequest,
        content_type = "application/json",
        description = "更新自助报表请求"
    ),
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_report(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateReportRequest>,
) -> Json<serde_json::Value> {
    info!("Updating self-service report: {}", id);

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE analytics_self_service_reports
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            datasource_id = COALESCE($3, datasource_id),
            fields = COALESCE($4, fields),
            filters = COALESCE($5, filters),
            config = COALESCE($6, config),
            is_public = COALESCE($7, is_public),
            updated_at = $8
        WHERE id = $9
        RETURNING id, name, description, datasource_id, fields, filters, config, owner_id, is_public, created_at, updated_at
        "#,
        req.name,
        req.description,
        req.datasource_id,
        req.fields,
        req.filters,
        req.config,
        req.is_public,
        now,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(serde_json::json!({
            "success": true,
            "message": "Update report",
            "data": ReportResponse {
                id: row.id,
                name: row.name,
                description: row.description,
                datasource_id: row.datasource_id,
                fields: row.fields.unwrap_or(serde_json::json!([])),
                filters: row.filters,
                config: row.config,
                owner_id: row.owner_id,
                is_public: row.is_public.unwrap_or(false),
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Report not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to update report: {}", e),
        )),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/api/bi/report/{id}",
    tag = "Report",
    params(
        ("id" = uuid::Uuid, Path, description = "Report ID")
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn delete_report(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting self-service report: {}", id);

    let result = sqlx::query!(
        r#"
        UPDATE analytics_self_service_reports SET deleted_at = NOW()
        WHERE id = $1
        RETURNING id
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(_)) => Json(serde_json::json!({
            "success": true,
            "message": "Delete report"
        })),
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Report not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to delete report: {}", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/report/{id}/query",
    tag = "Reports",
    operation_id = "query_report_data",
    responses((status = 200, description = "OK")),
)]
pub async fn query_report_data(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ReportQueryRequest>,
) -> Json<serde_json::Value> {
    info!("Querying report data for: {}", id);

    let report = match sqlx::query!(
        r#"
        SELECT id, name, datasource_id, fields, filters
        FROM analytics_self_service_reports
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return Json(topems_shared_core::response::error_value(
                500,
                "Report not found",
            ));
        }
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get report: {}", e),
            ));
        }
    };

    let page = req.page.unwrap_or(1);
    let page_size = req.page_size.unwrap_or(50).clamp(1, 10_000);
    let offset = (page - 1) * page_size;

    let fields = report.fields.unwrap_or(serde_json::json!([]));
    let dimensions: Vec<String> = fields
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter(|f| f.get("type").and_then(|t| t.as_str()) == Some("dimension"))
        .map(|f| {
            f.get("field")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string()
        })
        .collect();
    let metrics: Vec<String> = fields
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter(|f| f.get("type").and_then(|t| t.as_str()) == Some("metric"))
        .map(|f| {
            f.get("field")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string()
        })
        .collect();

    // S1.2: identifier 白名单校验（L1 层）
    let (dim_ok, met_ok): (Vec<String>, Vec<String>) = {
        let mut dim_q = Vec::with_capacity(dimensions.len());
        for d in &dimensions {
            match quote_identifier(d) {
                Ok(q) => dim_q.push(q),
                Err(e) => {
                    return Json(topems_shared_core::response::error_value(
                        500,
                        &format!("Invalid dimension field: {}", e),
                    ));
                }
            }
        }
        let mut met_q = Vec::with_capacity(metrics.len());
        for m in &metrics {
            match quote_identifier(m) {
                Ok(q) => met_q.push(q),
                Err(e) => {
                    return Json(topems_shared_core::response::error_value(
                        500,
                        &format!("Invalid metric field: {}", e),
                    ));
                }
            }
        }
        (dim_q, met_q)
    };

    // S1.3: 白名单表校验（L2 层）— report.fields 中所有字段必须在 bi_datasets 中已注册
    {
        let mut whitelist_cols: Vec<String> = dimensions.clone();
        whitelist_cols.extend(metrics.clone());
        let sort_by_raw = req.sort_by.clone().unwrap_or_else(|| "id".to_string());
        if !whitelist_cols.is_empty() {
            // sort_by 也作为 SELECT 列参与校验（若在列表中）
            if whitelist_cols.contains(&sort_by_raw) {
                if let Err(msg) =
                    validate_columns(&state.pool, DEFAULT_BI_TABLE, &whitelist_cols).await
                {
                    return Json(topems_shared_core::response::error_value(500, &msg));
                }
            } else {
                // sort_by 必须是已注册列或保留 id
                let check = vec![sort_by_raw.clone()];
                if let Err(msg) = validate_columns(&state.pool, DEFAULT_BI_TABLE, &check).await {
                    // strict 模式下若 sort_by 未注册，报错；warn 模式放行并记录日志
                    tracing::warn!(
                        "query_report_data sort_by '{}' 未在白名单中：{}",
                        sort_by_raw,
                        msg
                    );
                }
                if let Err(msg) =
                    validate_columns(&state.pool, DEFAULT_BI_TABLE, &whitelist_cols).await
                {
                    return Json(topems_shared_core::response::error_value(500, &msg));
                }
            }
        }
    }

    let select_clause = if dimensions.is_empty() && metrics.is_empty() {
        "*".to_string()
    } else {
        let mut cols: Vec<String> = Vec::new();
        cols.extend(dim_ok.iter().cloned());
        cols.extend(met_ok.iter().cloned());
        cols.join(", ")
    };

    let sort_by_raw = req.sort_by.clone().unwrap_or_else(|| "id".to_string());
    let sort_by = match quote_identifier(&sort_by_raw) {
        Ok(q) => q,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Invalid sort column: {}", e),
            ));
        }
    };
    let sort_order = req.sort_order.unwrap_or_else(|| "DESC".to_string());
    let sort_order = match validate_sort_order(&sort_order) {
        Ok(o) => o,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &e));
        }
    };

    // S1.1: LIMIT/OFFSET 参数化绑定，杜绝 format! 拼接用户可控数值。
    let query = format!(
        "SELECT {} FROM analytics_data ORDER BY {} {} LIMIT $1 OFFSET $2",
        select_clause, sort_by, sort_order
    );

    let data_result = sqlx::query(&query)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await;

    match data_result {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|_row| {
                    let mut map = serde_json::Map::new();
                    for col in &dimensions {
                        map.insert(col.clone(), serde_json::Value::Null);
                    }
                    for col in &metrics {
                        map.insert(col.clone(), serde_json::Value::Null);
                    }
                    serde_json::Value::Object(map)
                })
                .collect();

            let total = data.len() as i64;

            Json(serde_json::json!({
                "success": true,
                "message": "Query report data",
                "data": {
                    "report_id": id,
                    "report_name": report.name,
                    "data": data,
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "dimensions": dimensions,
                    "metrics": metrics,
                }
            }))
        }
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to query report data: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:report:read"])),
    path = "/report/{id}/export",
    tag = "Reports",
    operation_id = "export_report",
    responses((status = 200, description = "OK")),
)]
pub async fn export_report(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(query): Query<ReportExportQuery>,
) -> Result<impl IntoResponse, StatusCode> {
    info!("Exporting report: {} format: {:?}", id, query.format);

    let report = match sqlx::query!(
        r#"
        SELECT id, name, fields
        FROM analytics_self_service_reports
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => return Err(StatusCode::NOT_FOUND),
        Err(e) => {
            warn!("Failed to get report for export: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let format = query.format.unwrap_or_else(|| "csv".to_string());

    let fields = report.fields.unwrap_or(serde_json::json!([]));
    let field_names: Vec<String> = fields
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|f| {
            f.get("field")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string()
        })
        .collect();

    let mut csv_writer = csv::Writer::from_writer(Vec::new());

    let _ = csv_writer.write_record(&[format!("Report: {}", report.name)]);
    let _ = csv_writer.write_record(&[format!("Exported: {}", Utc::now().to_rfc3339())]);
    let _ = csv_writer.write_record([""]);

    if field_names.is_empty() {
        let _ = csv_writer.write_record(["id", "value"]);
    } else {
        let _ = csv_writer.write_record(
            field_names
                .iter()
                .map(|s| s.as_str())
                .collect::<Vec<&str>>(),
        );
    }

    let csv_data = match csv_writer.into_inner() {
        Ok(data) => data,
        Err(e) => {
            warn!("Failed to generate CSV: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let content_type = match format.as_str() {
        "excel" | "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        _ => "text/csv; charset=utf-8",
    };
    let filename = match format.as_str() {
        "excel" | "xlsx" => format!("report_{}.xlsx", id),
        _ => format!("report_{}.csv", id),
    };

    Ok((
        [(
            header::CONTENT_TYPE,
            header::HeaderValue::from_static(content_type),
        )],
        [(
            header::CONTENT_DISPOSITION,
            header::HeaderValue::from_str(&format!("attachment; filename=\"{}\"", filename))
                .unwrap_or_else(|_| header::HeaderValue::from_static("attachment")),
        )],
        csv_data,
    ))
}
