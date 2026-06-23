//! Report Template handlers

use axum::{extract::Path, State, Json};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportTemplate {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub category: String,
    pub definition: serde_json::Value,
    pub parameters: serde_json::Value,
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
    pub definition: serde_json::Value,
    pub parameters: serde_json::Value,
    pub output_format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub definition: Option<serde_json::Value>,
    pub parameters: Option<serde_json::Value>,
    pub output_format: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TemplateListItem {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub category: String,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// List templates
pub async fn list_templates(State(state): State<crate::AppState>) -> Json<serde_json::Value> {
    info!("Listing templates");
    
    let templates = sqlx::query_as!(
        TemplateListItem,
        r#"
        SELECT id, name, code, category, is_active, created_at
        FROM report_templates
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();
    
    Json(serde_json::json!({
        "success": true,
        "data": templates,
        "total": templates.len()
    }))
}

/// Create template
pub async fn create_template(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Creating template: {}", req.name);
    
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    
    let result = sqlx::query!(
        r#"
        INSERT INTO report_templates (id, name, code, description, category, definition, parameters, output_format, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        "#,
        id,
        req.name,
        req.code,
        req.description,
        req.category,
        req.definition,
        req.parameters,
        req.output_format,
        true,
        now,
        now,
    )
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
        }))
    }
}

/// Get template
pub async fn get_template(
    State(state): State<crate::AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting template: {}", id);
    
    let template = sqlx::query!(
        r#"
        SELECT id, name, code, description, category, definition, parameters, output_format, is_active, created_at, updated_at
        FROM report_templates
        WHERE id = $1
        "#,
        id
    )
    .fetch_optional(&state.pool)
    .await;
    
    match template {
        Ok(Some(t)) => Json(serde_json::json!({
            "success": true,
            "data": {
                "id": t.id,
                "name": t.name,
                "code": t.code,
                "description": t.description,
                "category": t.category,
                "definition": t.definition,
                "parameters": t.parameters,
                "output_format": t.output_format,
                "is_active": t.is_active,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
            }
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to get template: {}", e)
        }))
    }
}

/// Update template
pub async fn update_template(
    State(state): State<crate::AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Updating template: {}", id);
    
    let result = sqlx::query!(
        r#"
        UPDATE report_templates
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            category = COALESCE($3, category),
            definition = COALESCE($4, definition),
            parameters = COALESCE($5, parameters),
            output_format = COALESCE($6, output_format),
            is_active = COALESCE($7, is_active),
            updated_at = $8
        WHERE id = $9
        "#,
        req.name,
        req.description,
        req.category,
        req.definition,
        req.parameters,
        req.output_format,
        req.is_active,
        chrono::Utc::now(),
        id,
    )
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
        }))
    }
}

/// Delete template
pub async fn delete_template(
    State(state): State<crate::AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting template: {}", id);
    
    let result = sqlx::query!(
        r#"
        DELETE FROM report_templates
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
        }))
    }
}
