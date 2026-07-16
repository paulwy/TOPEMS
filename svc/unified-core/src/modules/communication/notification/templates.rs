use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::Row;
use topems_shared::auth::Claims;
use uuid::Uuid;

use super::models::{CreateTemplateRequest, UpdateTemplateRequest};

/// 列出通知模板
pub async fn list_templates(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Listing notification templates for user: {}",
        claims.username
    );

    let result = sqlx::query(
        r#"
        SELECT id, name, title_template, content_template, notification_type, description, is_deleted, created_by, created_at, updated_at
        FROM core_notification_templates
        WHERE is_deleted = FALSE
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let templates: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<Uuid, _>("id"),
                        "name": row.get::<String, _>("name"),
                        "title_template": row.get::<String, _>("title_template"),
                        "content_template": row.get::<String, _>("content_template"),
                        "notification_type": row.get::<Option<String>, _>("notification_type"),
                        "description": row.get::<Option<String>, _>("description"),
                        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                        "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "success": true,
                "message": "List templates success",
                "data": templates
            }))
        }
        Err(e) => {
            tracing::error!("Failed to list templates: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list templates: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取模板详情
pub async fn get_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    tracing::info!("Getting template: {} for user: {}", id, claims.username);

    let result = sqlx::query(
        r#"
        SELECT id, name, title, content, notification_type, priority, data, created_at, updated_at
        FROM core_notification_templates
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let template = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content"),
                "notification_type": row.get::<Option<String>, _>("notification_type"),
                "priority": row.get::<Option<i32>, _>("priority"),
                "data": row.get::<Option<serde_json::Value>, _>("data"),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
            });

            Json(serde_json::json!({
                "success": true,
                "message": "Get template success",
                "data": template
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to get template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get template: {}", e),
                "data": null
            }))
        }
    }
}

/// 创建模板
pub async fn create_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTemplateRequest>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Creating template: {} by user: {}",
        req.name,
        claims.username
    );

    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限创建通知模板",
            "data": null,
            "code": 403
        }));
    }

    let id = Uuid::new_v4();
    let notification_type = req
        .notification_type
        .clone()
        .unwrap_or_else(|| "info".to_string());
    let priority = req.priority.unwrap_or(0);

    let result = sqlx::query(
        r#"
        INSERT INTO core_notification_templates (id, name, title, content, notification_type, priority, data, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id, name, title, content, notification_type, priority, data, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&notification_type)
    .bind(priority)
    .bind(&req.data)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => {
            let template = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content"),
                "notification_type": row.get::<Option<String>, _>("notification_type"),
                "priority": row.get::<Option<i32>, _>("priority"),
                "data": row.get::<Option<serde_json::Value>, _>("data"),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
            });

            Json(serde_json::json!({
                "success": true,
                "message": "Template created successfully",
                "data": template
            }))
        }
        Err(e) => {
            tracing::error!("Failed to create template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to create template: {}", e),
                "data": null
            }))
        }
    }
}

/// 更新模板
pub async fn update_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTemplateRequest>,
) -> Json<serde_json::Value> {
    tracing::info!("Updating template: {} by user: {}", id, claims.username);

    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限更新通知模板",
            "data": null,
            "code": 403
        }));
    }

    let result = sqlx::query(
        r#"
        UPDATE core_notification_templates
        SET name = COALESCE($1, name),
            title = COALESCE($2, title),
            content = COALESCE($3, content),
            notification_type = COALESCE($4, notification_type),
            priority = COALESCE($5, priority),
            data = COALESCE($6, data),
            updated_at = NOW()
        WHERE id = $7
        RETURNING id, name, title, content, notification_type, priority, data, created_at, updated_at
        "#,
    )
    .bind(&req.name)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&req.notification_type)
    .bind(req.priority)
    .bind(&req.data)
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let template = serde_json::json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<Option<String>, _>("content"),
                "notification_type": row.get::<Option<String>, _>("notification_type"),
                "priority": row.get::<Option<i32>, _>("priority"),
                "data": row.get::<Option<serde_json::Value>, _>("data"),
                "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
            });

            Json(serde_json::json!({
                "success": true,
                "message": "Template updated successfully",
                "data": template
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to update template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to update template: {}", e),
                "data": null
            }))
        }
    }
}

/// 删除模板
pub async fn delete_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    tracing::info!("Deleting template: {} by user: {}", id, claims.username);

    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限删除通知模板",
            "data": null,
            "code": 403
        }));
    }

    let result = sqlx::query("DELETE FROM core_notification_templates WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "Template deleted successfully",
            "data": null
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found",
            "data": null
        })),
        Err(e) => {
            tracing::error!("Failed to delete template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to delete template: {}", e),
                "data": null
            }))
        }
    }
}
