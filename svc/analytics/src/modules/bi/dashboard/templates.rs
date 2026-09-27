use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use sqlx::types::Uuid;
use tracing::info;

use crate::shared::AppState;

use super::models::{
    CreateDashboardRequest, CreateDashboardTemplateRequest, DashboardResponse,
    DashboardTemplateListResponse, DashboardTemplateResponse, UpdateDashboardTemplateRequest,
};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn list_dashboard_templates(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing dashboard templates");

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at
        FROM analytics_dashboard_templates
        WHERE is_active = true
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to list templates: {}", e)));
        }
    };

    let items: Vec<DashboardTemplateResponse> = rows
        .into_iter()
        .map(|row| DashboardTemplateResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            layout: row.layout.unwrap_or(serde_json::json!({})),
            preview_image: row.preview_image,
            category: row.category,
            tags: row.tags,
            is_active: row.is_active.unwrap_or(true),
            created_at: row.created_at.expect("created_at should exist").and_utc(),
            updated_at: row.updated_at.expect("updated_at should exist").and_utc(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List dashboard templates",
        "data": DashboardTemplateListResponse {
            items,
            total,
        }
    }))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template",
    tag = "BI",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_dashboard_template(
    State(state): State<AppState>,
    Json(req): Json<CreateDashboardTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Creating dashboard template: {}", req.name);

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        INSERT INTO analytics_dashboard_templates (id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at
        "#,
        id,
        req.name,
        req.description,
        req.layout,
        req.preview_image,
        req.category,
        req.tags.as_deref(),
        true,
now.naive_utc(),
now.naive_utc(),
        Uuid::nil(),
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(serde_json::json!({
                            "success": true,
                            "message": "Create dashboard template",
                            "data": DashboardTemplateResponse {
                                id: row.id,
                                name: row.name,
                                description: row.description,
                                layout: row.layout.unwrap_or(serde_json::json!({})),
                                preview_image: row.preview_image,
                                category: row.category,
                                tags: row.tags,
                                is_active: row.is_active.unwrap_or(true),
        created_at: row.created_at.expect("created_at should exist").and_utc(),
        updated_at: row.updated_at.expect("updated_at should exist").and_utc(),
                            }
                        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create template: {}", e),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template/{id}",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_dashboard_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting dashboard template: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at
        FROM analytics_dashboard_templates
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(500, &format!("Failed to get template: {}", e)));
        }
    };

    match row {
        Some(row) => Json(serde_json::json!({
                            "success": true,
                            "message": "Get dashboard template",
                            "data": DashboardTemplateResponse {
                                id: row.id,
                                name: row.name,
                                description: row.description,
                                layout: row.layout.unwrap_or(serde_json::json!({})),
                                preview_image: row.preview_image,
                                category: row.category,
                                tags: row.tags,
                                is_active: row.is_active.unwrap_or(true),
        created_at: row.created_at.expect("created_at should exist").and_utc(),
        updated_at: row.updated_at.expect("updated_at should exist").and_utc(),
                            }
                        })),
        None => Json(topems_shared_core::response::error_value(
            500,
            "Template not found",
        )),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template/{id}",
    tag = "BI",
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_dashboard_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDashboardTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Updating dashboard template: {}", id);

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        UPDATE analytics_dashboard_templates
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            layout = COALESCE($3, layout),
            preview_image = COALESCE($4, preview_image),
            category = COALESCE($5, category),
            tags = COALESCE($6, tags),
            is_active = COALESCE($7, is_active),
            updated_at = $8
        WHERE id = $9
        RETURNING id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at
        "#,
        req.name,
        req.description,
        req.layout,
        req.preview_image,
        req.category,
        req.tags.as_deref(),
        req.is_active,
now.naive_utc(),
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(serde_json::json!({
                            "success": true,
                            "message": "Update dashboard template",
                            "data": DashboardTemplateResponse {
                                id: row.id,
                                name: row.name,
                                description: row.description,
                                layout: row.layout.unwrap_or(serde_json::json!({})),
                                preview_image: row.preview_image,
                                category: row.category,
                                tags: row.tags,
                                is_active: row.is_active.unwrap_or(true),
        created_at: row.created_at.expect("created_at should exist").and_utc(),
        updated_at: row.updated_at.expect("updated_at should exist").and_utc(),
                            }
                        })),
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Template not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to update template: {}", e),
        )),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template/{id}",
    tag = "BI",
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn delete_dashboard_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting dashboard template: {}", id);

    let result = sqlx::query!(
        r#"
        UPDATE analytics_dashboard_templates
        SET is_active = false, updated_at = $1
        WHERE id = $2
        RETURNING id
        "#,
        Utc::now().naive_utc(),
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(_)) => Json(serde_json::json!({
            "success": true,
            "message": "Delete dashboard template"
        })),
        Ok(None) => Json(topems_shared_core::response::error_value(
            500,
            "Template not found",
        )),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to delete template: {}", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:dashboard:read"])),
    path = "/api/bi/dashboard/template/{template_id}/create",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn create_dashboard_from_template(
    State(state): State<AppState>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<CreateDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Creating dashboard from template: {}", template_id);

    let row = match sqlx::query!(
        r#"
        SELECT name, description, layout
        FROM analytics_dashboard_templates
        WHERE id = $1 AND is_active = true
        "#,
        template_id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get template: {}", e),
            ));
        }
    };

    match row {
        Some(row) => {
            let id = Uuid::new_v4();
            let now = Utc::now();

            let result = sqlx::query!(
                r#"
                INSERT INTO analytics_dashboards (id, name, description, layout, owner_id, is_public, created_at, updated_at, tenant_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, name, description, layout, owner_id, is_public, created_at, updated_at
                "#,
                id,
                req.name,
                req.description.or(row.description),
                row.layout,
                req.owner_id,
                req.is_public.unwrap_or(false),
now.naive_utc(),
now.naive_utc(),
                Uuid::nil(),
            )
            .fetch_one(&state.pool)
            .await;

            match result {
                Ok(new_row) => Json(serde_json::json!({
                                                    "success": true,
                                                    "message": "Create dashboard from template",
                                                    "data": DashboardResponse {
                                                        id: new_row.id,
                                                        name: new_row.name,
                                                        description: new_row.description,
                                                        layout: new_row.layout,
                                                        owner_id: new_row.owner_id,
                                                        is_public: new_row.is_public.unwrap_or(false),
                created_at: new_row.created_at.expect("created_at should exist").and_utc(),
                updated_at: new_row.updated_at.expect("updated_at should exist").and_utc(),
                                                    }
                                                })),
                Err(e) => Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to create dashboard: {}", e),
                )),
            }
        }
        None => Json(topems_shared_core::response::error_value(
            500,
            "Template not found or inactive",
        )),
    }
}
