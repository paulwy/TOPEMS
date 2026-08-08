//! Report Template handlers

use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use tracing::info;
use uuid::Uuid;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/templates", get(list_templates).post(create_template))
        .route(
            "/templates/{id}",
            get(get_template)
                .put(update_template)
                .delete(delete_template),
        )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSourceConfig {
    pub source_type: String,
    pub connection_string: Option<String>,
    pub query: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutConfig {
    pub layout_type: String,
    pub orientation: String,
    pub paper_size: String,
    pub margins: serde_json::Value,
    pub sections: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterConfig {
    pub conditions: Vec<serde_json::Value>,
    pub date_range: Option<serde_json::Value>,
    pub sort_by: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StyleConfig {
    pub theme: String,
    pub colors: serde_json::Value,
    pub fonts: serde_json::Value,
    pub borders: serde_json::Value,
    pub header_style: serde_json::Value,
    pub body_style: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateDefinition {
    pub report_type: String,
    pub data_source: DataSourceConfig,
    pub layout: LayoutConfig,
    pub filters: FilterConfig,
    pub style: StyleConfig,
    pub columns: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportTemplate {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub category: String,
    pub report_type: String,
    pub data_source: serde_json::Value,
    pub layout_config: serde_json::Value,
    pub filter_config: serde_json::Value,
    pub style_config: serde_json::Value,
    pub columns: serde_json::Value,
    pub output_format: String,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub category: String,
    pub report_type: String,
    pub data_source: serde_json::Value,
    pub layout_config: serde_json::Value,
    pub filter_config: serde_json::Value,
    pub style_config: serde_json::Value,
    pub columns: serde_json::Value,
    pub output_format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub report_type: Option<String>,
    pub data_source: Option<serde_json::Value>,
    pub layout_config: Option<serde_json::Value>,
    pub filter_config: Option<serde_json::Value>,
    pub style_config: Option<serde_json::Value>,
    pub columns: Option<serde_json::Value>,
    pub output_format: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TemplateListItem {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub category: Option<String>,
    pub report_type: Option<String>,
    pub is_active: Option<bool>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

pub async fn list_templates(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing templates");

    let templates = sqlx::query(
        r#"
        SELECT id, name, code, category, report_type, is_active, created_at
        FROM report_templates
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = templates
        .into_iter()
        .map(|t| {
            serde_json::json!({
                "id": t.get::<Uuid, _>("id"),
                "name": t.get::<String, _>("name"),
                "code": t.get::<String, _>("code"),
                "category": t.get::<Option<String>, _>("category"),
                "report_type": t.get::<Option<String>, _>("report_type"),
                "is_active": t.get::<Option<bool>, _>("is_active"),
                "created_at": t.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "data": result,
        "total": result.len()
    }))
}

pub async fn create_template(
    State(state): State<AppState>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Creating template: {}", req.name);

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO report_templates (id, name, code, description, category, report_type, data_source, layout_config, filter_config, style_config, columns, output_format, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        "#,
    )
    .bind(id)
    .bind(req.name)
    .bind(req.code)
    .bind(req.description)
    .bind(req.category)
    .bind(req.report_type)
    .bind(req.data_source)
    .bind(req.layout_config)
    .bind(req.filter_config)
    .bind(req.style_config)
    .bind(req.columns)
    .bind(req.output_format)
    .bind(true)
    .bind(now)
    .bind(now)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Template created",
            "data": id
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to create template: {}", e)
        })),
    }
}

pub async fn get_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting template: {}", id);

    let template = sqlx::query(
        r#"
        SELECT id, name, code, description, category, report_type, data_source, layout_config, filter_config, style_config, columns, output_format, is_active, created_at, updated_at
        FROM report_templates
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match template {
        Ok(Some(row)) => {
            let t_id: Uuid = row.get("id");
            let t_name: String = row.get("name");
            let t_code: String = row.get("code");
            let t_description: Option<String> = row.get("description");
            let t_category: Option<String> = row.get("category");
            let t_report_type: String = row.get("report_type");
            let t_data_source: serde_json::Value = row.get("data_source");
            let t_layout_config: serde_json::Value = row.get("layout_config");
            let t_filter_config: serde_json::Value = row.get("filter_config");
            let t_style_config: serde_json::Value = row.get("style_config");
            let t_columns: serde_json::Value = row.get("columns");
            let t_output_format: String = row.get("output_format");
            let t_is_active: bool = row.get("is_active");
            let t_created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");
            let t_updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");
            Json(serde_json::json!({
                "success": true,
                "data": {
                    "id": t_id,
                    "name": t_name,
                    "code": t_code,
                    "description": t_description,
                    "category": t_category,
                    "report_type": t_report_type,
                    "data_source": t_data_source,
                    "layout_config": t_layout_config,
                    "filter_config": t_filter_config,
                    "style_config": t_style_config,
                    "columns": t_columns,
                    "output_format": t_output_format,
                    "is_active": t_is_active,
                    "created_at": t_created_at,
                    "updated_at": t_updated_at,
                }
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to get template: {}", e)
        })),
    }
}

pub async fn update_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Updating template: {}", id);

    let result = sqlx::query(
        r#"
        UPDATE report_templates
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            category = COALESCE($3, category),
            report_type = COALESCE($4, report_type),
            data_source = COALESCE($5, data_source),
            layout_config = COALESCE($6, layout_config),
            filter_config = COALESCE($7, filter_config),
            style_config = COALESCE($8, style_config),
            columns = COALESCE($9, columns),
            output_format = COALESCE($10, output_format),
            is_active = COALESCE($11, is_active),
            updated_at = $12
        WHERE id = $13
        "#,
    )
    .bind(req.name)
    .bind(req.description)
    .bind(req.category)
    .bind(req.report_type)
    .bind(req.data_source)
    .bind(req.layout_config)
    .bind(req.filter_config)
    .bind(req.style_config)
    .bind(req.columns)
    .bind(req.output_format)
    .bind(req.is_active)
    .bind(chrono::Utc::now())
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Template updated"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to update template: {}", e)
        })),
    }
}

pub async fn delete_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting template: {}", id);

    let result = sqlx::query!(
        r#"
        UPDATE report_templates SET deleted_at = NOW()
        WHERE id = $1
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Template deleted"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete template: {}", e)
        })),
    }
}
