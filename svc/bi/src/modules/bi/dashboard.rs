use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use lopdf::{Document, Dictionary, Object, Stream};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use tracing::{info, warn};

use crate::modules::bi::chart_service::{ChartQuery, ChartService, ChartType};
use crate::modules::bi::widget::WIDGET_CACHE;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateDashboardRequest {
    pub name: String,
    pub description: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub owner_id: String,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDashboardRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct DashboardResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub owner_id: String,
    pub is_public: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct DashboardListResponse {
    pub items: Vec<DashboardResponse>,
    pub total: i64,
}

pub async fn list_dashboards(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing dashboards");

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM analytics_dashboards
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list dashboards: {}", e)
            }));
        }
    };

    let items: Vec<DashboardResponse> = rows
        .into_iter()
        .map(|row| DashboardResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            layout: row.layout,
            owner_id: row.owner_id,
            is_public: row.is_public.unwrap_or(false),
            created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
            updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List dashboards",
        "data": DashboardListResponse {
            items,
            total,
        }
    }))
}

pub async fn create_dashboard(
    State(state): State<AppState>,
    Json(req): Json<CreateDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Creating dashboard: {}", req.name);

    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        INSERT INTO analytics_dashboards (id, name, description, layout, owner_id, is_public, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        id,
        req.name,
        req.description,
        req.layout,
        req.owner_id,
        req.is_public.unwrap_or(false),
        now,
        now,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Create dashboard",
            "data": DashboardResponse {
                id,
                name: req.name,
                description: req.description,
                layout: req.layout,
                owner_id: req.owner_id,
                is_public: req.is_public.unwrap_or(false),
                created_at: now.to_string(),
                updated_at: now.to_string(),
            }
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to create dashboard: {}", e)
        })),
    }
}

pub async fn get_dashboard(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting dashboard: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM analytics_dashboards
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get dashboard: {}", e)
            }));
        }
    };

    match row {
        Some(row) => Json(serde_json::json!({
            "success": true,
            "message": "Get dashboard",
            "data": DashboardResponse {
                id: row.id,
                name: row.name,
                description: row.description,
                layout: row.layout,
                owner_id: row.owner_id,
                is_public: row.is_public.unwrap_or(false),
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        None => Json(serde_json::json!({
            "success": false,
            "message": "Dashboard not found"
        })),
    }
}

pub async fn update_dashboard(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Updating dashboard: {}", id);

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE analytics_dashboards
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            layout = COALESCE($3, layout),
            is_public = COALESCE($4, is_public),
            updated_at = $5
        WHERE id = $6
        RETURNING id, name, description, layout, owner_id, is_public, created_at, updated_at
        "#,
        req.name,
        req.description,
        req.layout,
        req.is_public,
        now,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(serde_json::json!({
            "success": true,
            "message": "Update dashboard",
            "data": DashboardResponse {
                id: row.id,
                name: row.name,
                description: row.description,
                layout: row.layout,
                owner_id: row.owner_id,
                is_public: row.is_public.unwrap_or(false),
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Dashboard not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to update dashboard: {}", e)
        })),
    }
}

pub async fn delete_dashboard(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting dashboard: {}", id);

    let result = sqlx::query!(
        r#"
        DELETE FROM analytics_dashboards
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
            "message": "Delete dashboard"
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Dashboard not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete dashboard: {}", e)
        })),
    }
}

pub async fn get_public_dashboards(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing public dashboards");

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM analytics_dashboards
        WHERE is_public = true
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list public dashboards: {}", e)
            }));
        }
    };

    let items: Vec<DashboardResponse> = rows
        .into_iter()
        .map(|row| DashboardResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            layout: row.layout,
            owner_id: row.owner_id,
            is_public: row.is_public.unwrap_or(false),
            created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
            updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List public dashboards",
        "data": DashboardListResponse {
            items,
            total,
        }
    }))
}

pub async fn get_user_dashboards(
    State(state): State<AppState>,
    Path(owner_id): Path<String>,
) -> Json<serde_json::Value> {
    info!("Listing dashboards for user: {}", owner_id);

    let rows = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM analytics_dashboards
        WHERE owner_id = $1
        ORDER BY created_at DESC
        "#,
        owner_id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list user dashboards: {}", e)
            }));
        }
    };

    let items: Vec<DashboardResponse> = rows
        .into_iter()
        .map(|row| DashboardResponse {
            id: row.id,
            name: row.name,
            description: row.description,
            layout: row.layout,
            owner_id: row.owner_id,
            is_public: row.is_public.unwrap_or(false),
            created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
            updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
        })
        .collect();

    let total = items.len() as i64;
    Json(serde_json::json!({
        "success": true,
        "message": "List user dashboards",
        "data": DashboardListResponse {
            items,
            total,
        }
    }))
}

#[derive(Debug, Deserialize)]
pub struct CreateDashboardTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub layout: serde_json::Value,
    pub preview_image: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDashboardTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub preview_image: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct DashboardTemplateResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub layout: serde_json::Value,
    pub preview_image: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct DashboardTemplateListResponse {
    pub items: Vec<DashboardTemplateResponse>,
    pub total: i64,
}

pub async fn list_dashboard_templates(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
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
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list templates: {}", e)
            }));
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
            created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
            updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
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

pub async fn create_dashboard_template(
    State(state): State<AppState>,
    Json(req): Json<CreateDashboardTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Creating dashboard template: {}", req.name);

    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        INSERT INTO analytics_dashboard_templates (id, name, description, layout, preview_image, category, tags, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        now,
        now,
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
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to create template: {}", e)
        })),
    }
}

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
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get template: {}", e)
            }));
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
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        None => Json(serde_json::json!({
            "success": false,
            "message": "Template not found"
        })),
    }
}

pub async fn update_dashboard_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDashboardTemplateRequest>,
) -> Json<serde_json::Value> {
    info!("Updating dashboard template: {}", id);

    let now = Utc::now().naive_utc();

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
        now,
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
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to update template: {}", e)
        })),
    }
}

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
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Template not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete template: {}", e)
        })),
    }
}

pub async fn clone_dashboard(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Cloning dashboard: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT name, description, layout, owner_id, is_public
        FROM analytics_dashboards
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get dashboard: {}", e)
            }));
        }
    };

    match row {
        Some(row) => {
            let new_id = Uuid::new_v4();
            let now = Utc::now().naive_utc();
            let new_name = format!("{} (副本)", row.name);

            let result = sqlx::query!(
                r#"
                INSERT INTO analytics_dashboards (id, name, description, layout, owner_id, is_public, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name, description, layout, owner_id, is_public, created_at, updated_at
                "#,
                new_id,
                new_name,
                row.description,
                row.layout,
                row.owner_id,
                false,
                now,
                now,
            )
            .fetch_one(&state.pool)
            .await;

            match result {
                Ok(new_row) => Json(serde_json::json!({
                    "success": true,
                    "message": "Clone dashboard",
                    "data": DashboardResponse {
                        id: new_row.id,
                        name: new_row.name,
                        description: new_row.description,
                        layout: new_row.layout,
                        owner_id: new_row.owner_id,
                        is_public: new_row.is_public.unwrap_or(false),
                        created_at: new_row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                        updated_at: new_row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
                    }
                })),
                Err(e) => Json(serde_json::json!({
                    "success": false,
                    "message": format!("Failed to clone dashboard: {}", e)
                })),
            }
        }
        None => Json(serde_json::json!({
            "success": false,
            "message": "Dashboard not found"
        })),
    }
}

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
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get template: {}", e)
            }));
        }
    };

    match row {
        Some(row) => {
            let id = Uuid::new_v4();
            let now = Utc::now().naive_utc();

            let result = sqlx::query!(
                r#"
                INSERT INTO analytics_dashboards (id, name, description, layout, owner_id, is_public, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name, description, layout, owner_id, is_public, created_at, updated_at
                "#,
                id,
                req.name,
                req.description.or(row.description),
                row.layout,
                req.owner_id,
                req.is_public.unwrap_or(false),
                now,
                now,
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
                        created_at: new_row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                        updated_at: new_row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
                    }
                })),
                Err(e) => Json(serde_json::json!({
                    "success": false,
                    "message": format!("Failed to create dashboard: {}", e)
                })),
            }
        }
        None => Json(serde_json::json!({
            "success": false,
            "message": "Template not found or inactive"
        })),
    }
}

#[derive(Debug, Deserialize)]
pub struct ShareDashboardRequest {
    pub shared_with: Vec<String>,
    pub permission: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ShareLinkResponse {
    pub id: Uuid,
    pub dashboard_id: Uuid,
    pub share_url: String,
    pub permission: String,
    pub expires_at: Option<String>,
    pub created_at: String,
}

pub async fn create_share_link(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ShareDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Creating share link for dashboard: {}", id);

    let share_id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let expires_at = req.expires_at.and_then(|s| {
        chrono::NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S").ok()
    });

    let result = sqlx::query!(
        r#"
        INSERT INTO analytics_dashboard_shares (id, dashboard_id, shared_with, permission, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, dashboard_id, permission, expires_at, created_at
        "#,
        share_id,
        id,
        &req.shared_with,
        req.permission,
        expires_at,
        now,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(serde_json::json!({
            "success": true,
            "message": "Create share link",
            "data": ShareLinkResponse {
                id: row.id,
                dashboard_id: row.dashboard_id,
                share_url: format!("/api/bi/dashboard/share/{}", row.id),
                permission: row.permission,
                expires_at: row.expires_at.map(|t| t.to_string()),
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to create share link: {}", e)
        })),
    }
}

pub async fn get_shared_dashboard(
    State(state): State<AppState>,
    Path(share_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting shared dashboard: {}", share_id);

    let share_row = match sqlx::query!(
        r#"
        SELECT s.dashboard_id, s.permission, s.expires_at,
               d.id, d.name, d.description, d.layout, d.owner_id, d.created_at, d.updated_at
        FROM analytics_dashboard_shares s
        JOIN analytics_dashboards d ON s.dashboard_id = d.id
        WHERE s.id = $1
          AND (s.expires_at IS NULL OR s.expires_at > NOW())
        "#,
        share_id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get shared dashboard: {}", e)
            }));
        }
    };

    match share_row {
        Some(row) => Json(serde_json::json!({
            "success": true,
            "message": "Get shared dashboard",
            "data": {
                "id": row.id,
                "name": row.name,
                "description": row.description,
                "layout": row.layout,
                "owner_id": row.owner_id,
                "permission": row.permission,
                "created_at": row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                "updated_at": row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        None => Json(serde_json::json!({
            "success": false,
            "message": "Share link not found or expired"
        })),
    }
}

pub async fn list_share_links(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Listing share links for dashboard: {}", id);

    let rows = match sqlx::query!(
        r#"
        SELECT id, dashboard_id, shared_with, permission, expires_at, created_at
        FROM analytics_dashboard_shares
        WHERE dashboard_id = $1
        ORDER BY created_at DESC
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list share links: {}", e)
            }));
        }
    };

    let items: Vec<ShareLinkResponse> = rows
        .into_iter()
        .map(|row| ShareLinkResponse {
            id: row.id,
            dashboard_id: row.dashboard_id,
            share_url: format!("/api/bi/dashboard/share/{}", row.id),
            permission: row.permission,
            expires_at: row.expires_at.map(|t| t.to_string()),
            created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "message": "List share links",
        "data": {
            "items": items,
            "total": items.len(),
        }
    }))
}

pub async fn delete_share_link(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting share link: {}", id);

    let result = sqlx::query!(
        r#"
        DELETE FROM analytics_dashboard_shares
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
            "message": "Delete share link"
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Share link not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete share link: {}", e)
        })),
    }
}

#[derive(Debug, Deserialize)]
pub struct ExportFormatQuery {
    pub format: Option<String>,
}

pub async fn export_dashboard(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(query): Query<ExportFormatQuery>,
) -> Json<serde_json::Value> {
    info!("Exporting dashboard: {} format: {:?}", id, query.format);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM analytics_dashboards
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get dashboard: {}", e)
            }));
        }
    };

    match row {
        Some(row) => {
            let export_data = serde_json::json!({
                "version": "1.0",
                "dashboard": {
                    "id": row.id,
                    "name": row.name,
                    "description": row.description,
                    "layout": row.layout,
                    "owner_id": row.owner_id,
                    "is_public": row.is_public.unwrap_or(false),
                    "created_at": row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                    "updated_at": row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
                },
                "export_time": Utc::now().to_string(),
            });

            Json(serde_json::json!({
                "success": true,
                "message": "Export dashboard",
                "data": export_data,
                "format": query.format.unwrap_or_else(|| "json".to_string()),
            }))
        }
        None => Json(serde_json::json!({
            "success": false,
            "message": "Dashboard not found"
        })),
    }
}

/// Export dashboard as PDF
pub async fn export_dashboard_pdf(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, StatusCode> {
    info!("Exporting dashboard as PDF: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM analytics_dashboards
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            warn!("Failed to get dashboard for PDF export: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let dashboard = match row {
        Some(row) => row,
        None => return Err(StatusCode::NOT_FOUND),
    };

    // Query widgets for this dashboard
    let widgets = match sqlx::query!(
        r#"
        SELECT id, name, widget_type, config
        FROM analytics_widgets
        WHERE dashboard_id = $1
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            warn!("Failed to get widgets for PDF export: {}", e);
            vec![]
        }
    };

    // Build a simple PDF
    let mut doc = Document::with_version("1.4");
    let pages_id = doc.new_object_id();
    let catalog_id = doc.new_object_id();

    let mut page_content = format!(
        "BT /F1 24 Tf 100 750 Td (Dashboard: {}) Tj ET\n",
        escape_pdf_string(&dashboard.name)
    );
    page_content.push_str(&format!(
        "BT /F1 12 Tf 100 720 Td (ID: {}) Tj ET\n",
        dashboard.id
    ));
    if let Some(ref desc) = dashboard.description {
        page_content.push_str(&format!(
            "BT /F1 12 Tf 100 700 Td (Description: {}) Tj ET\n",
            escape_pdf_string(desc)
        ));
    }
    page_content.push_str(&format!(
        "BT /F1 12 Tf 100 680 Td (Exported: {}) Tj ET\n",
        Utc::now().to_rfc3339()
    ));

    let mut y = 640.0;
    page_content.push_str("BT /F1 14 Tf 100 640 Td (Widgets:) Tj ET\n");
    y -= 20.0;

    for widget in &widgets {
        page_content.push_str(&format!(
            "BT /F1 10 Tf 120 {} Td (- {} [{}]) Tj ET\n",
            y,
            escape_pdf_string(&widget.name),
            escape_pdf_string(&widget.widget_type)
        ));
        y -= 15.0;
    }

    let content_id = doc.new_object_id();
    let content = Stream::new(Dictionary::new(), page_content.into_bytes());

    let page_id = doc.new_object_id();
    let mut page = Dictionary::new();
    page.set("Type", Object::Name(b"Page".to_vec()));
    page.set("Parent", Object::Reference(pages_id));
    page.set("MediaBox", Object::Array(vec![
        Object::Integer(0),
        Object::Integer(0),
        Object::Integer(612),
        Object::Integer(792),
    ]));
    page.set("Contents", Object::Reference(content_id));

    let mut font_dict = Dictionary::new();
    font_dict.set("Type", Object::Name(b"Font".to_vec()));
    font_dict.set("Subtype", Object::Name(b"Type1".to_vec()));
    font_dict.set("BaseFont", Object::Name(b"Helvetica".to_vec()));

    let mut font_map = Dictionary::new();
    font_map.set("F1", Object::Dictionary(font_dict));

    let mut resources = Dictionary::new();
    resources.set("Font", Object::Dictionary(font_map));
    page.set("Resources", Object::Dictionary(resources));

    doc.objects.insert(page_id, Object::Dictionary(page));
    doc.objects.insert(content_id, Object::Stream(content));

    let mut pages = Dictionary::new();
    pages.set("Type", Object::Name(b"Pages".to_vec()));
    pages.set("Kids", Object::Array(vec![Object::Reference(page_id)]));
    pages.set("Count", Object::Integer(1));
    doc.objects.insert(pages_id, Object::Dictionary(pages));

    let mut catalog = Dictionary::new();
    catalog.set("Type", Object::Name(b"Catalog".to_vec()));
    catalog.set("Pages", Object::Reference(pages_id));
    doc.objects.insert(catalog_id, Object::Dictionary(catalog));
    doc.trailer.set("Root", Object::Reference(catalog_id));

    let mut pdf_bytes = Vec::new();
    if let Err(e) = doc.save_to(&mut pdf_bytes) {
        warn!("Failed to save PDF: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    Ok((
        [(
            header::CONTENT_TYPE,
            header::HeaderValue::from_static("application/pdf"),
        ),
        (
            header::CONTENT_DISPOSITION,
            header::HeaderValue::from_str(&format!(
                "attachment; filename=\"dashboard_{}.pdf\"",
                id
            ))
            .unwrap_or_else(|_| header::HeaderValue::from_static("attachment")),
        )],
        pdf_bytes,
    ))
}

fn escape_pdf_string(s: &str) -> String {
    s.replace('(', "\\(")
        .replace(')', "\\)")
        .replace('\\', "\\\\")
}

/// Export dashboard as Excel (CSV format)
pub async fn export_dashboard_excel(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, StatusCode> {
    info!("Exporting dashboard as Excel/CSV: {}", id);

    let row = match sqlx::query!(
        r#"
        SELECT id, name, description, layout, owner_id, is_public, created_at, updated_at
        FROM analytics_dashboards
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            warn!("Failed to get dashboard for Excel export: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let dashboard = match row {
        Some(row) => row,
        None => return Err(StatusCode::NOT_FOUND),
    };

    // Query widgets for this dashboard
    let widgets = match sqlx::query!(
        r#"
        SELECT id, name, widget_type, config
        FROM analytics_widgets
        WHERE dashboard_id = $1
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            warn!("Failed to get widgets for Excel export: {}", e);
            vec![]
        }
    };

    let mut csv_writer = csv::Writer::from_writer(Vec::new());

    // Write dashboard info
    let _ = csv_writer.write_record(&["Dashboard Export"]);
    let _ = csv_writer.write_record(&["ID", &dashboard.id.to_string()]);
    let _ = csv_writer.write_record(&["Name", &dashboard.name]);
    let _ = csv_writer.write_record(&[
        "Description",
        &dashboard.description.unwrap_or_default(),
    ]);
    let _ = csv_writer.write_record(&["Owner", &dashboard.owner_id]);
    let _ = csv_writer.write_record(&[
        "Public",
        &dashboard.is_public.unwrap_or(false).to_string(),
    ]);
    let _ = csv_writer.write_record(&[""; 0]);

    // Write widgets info
    let _ = csv_writer.write_record(&["Widgets"]);
    let _ = csv_writer.write_record(&["Widget ID", "Name", "Type", "Config"]);
    for widget in &widgets {
        let config_str = widget
            .config
            .as_ref()
            .map(|c| c.to_string())
            .unwrap_or_default();
        let _ = csv_writer.write_record(&[
            &widget.id.to_string(),
            &widget.name,
            &widget.widget_type,
            &config_str,
        ]);
    }

    let csv_data = match csv_writer.into_inner() {
        Ok(data) => data,
        Err(e) => {
            warn!("Failed to generate CSV: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    Ok((
        [(
            header::CONTENT_TYPE,
            header::HeaderValue::from_static(
                "text/csv; charset=utf-8",
            ),
        ),
        (
            header::CONTENT_DISPOSITION,
            header::HeaderValue::from_str(&format!(
                "attachment; filename=\"dashboard_{}.csv\"",
                id
            ))
            .unwrap_or_else(|_| header::HeaderValue::from_static("attachment")),
        )],
        csv_data,
    ))
}

#[derive(Debug, Deserialize)]
pub struct ImportDashboardRequest {
    pub name: String,
    pub owner_id: String,
    pub layout: serde_json::Value,
    pub description: Option<String>,
    pub is_public: Option<bool>,
}

pub async fn import_dashboard(
    State(state): State<AppState>,
    Json(req): Json<ImportDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Importing dashboard: {}", req.name);

    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        INSERT INTO analytics_dashboards (id, name, description, layout, owner_id, is_public, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, description, layout, owner_id, is_public, created_at, updated_at
        "#,
        id,
        req.name,
        req.description,
        req.layout,
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
            "message": "Import dashboard",
            "data": DashboardResponse {
                id: row.id,
                name: row.name,
                description: row.description,
                layout: row.layout,
                owner_id: row.owner_id,
                is_public: row.is_public.unwrap_or(false),
                created_at: row.created_at.map(|t| t.to_string()).unwrap_or_default(),
                updated_at: row.updated_at.map(|t| t.to_string()).unwrap_or_default(),
            }
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to import dashboard: {}", e)
        })),
    }
}

/// Query real-time data for all widgets in a dashboard
pub async fn query_dashboard_realtime_data(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Querying real-time data for dashboard: {}", id);

    // Verify dashboard exists
    let dashboard = match sqlx::query!(
        r#"SELECT id, name FROM analytics_dashboards WHERE id = $1"#,
        id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get dashboard: {}", e)
            }));
        }
    };

    if dashboard.is_none() {
        return Json(serde_json::json!({
            "success": false,
            "message": "Dashboard not found"
        }));
    }

    let dashboard = dashboard.unwrap();

    // Get all widgets for this dashboard
    let widgets = match sqlx::query!(
        r#"
        SELECT id, name, widget_type, config, query_config, cache_ttl_seconds
        FROM analytics_widgets
        WHERE dashboard_id = $1
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to get widgets: {}", e)
            }));
        }
    };

    let chart_service = ChartService::new(state.pool.clone());
    let mut widget_data = Vec::new();

    for widget in widgets {
        let chart_type = match widget.widget_type.as_str() {
            "chart-bar" => ChartType::Bar,
            "chart-line" => ChartType::Line,
            "chart-pie" => ChartType::Pie,
            "chart-area" => ChartType::Area,
            "chart-scatter" => ChartType::Scatter,
            "chart-histogram" => ChartType::Histogram,
            "chart-gauge" => ChartType::Gauge,
            "table" => ChartType::Table,
            _ => ChartType::Line,
        };

        let data_source = widget
            .query_config
            .as_ref()
            .and_then(|c| c.get("data_source"))
            .and_then(|v| v.as_str())
            .unwrap_or("analytics_data")
            .to_string();

        let query_text = widget
            .query_config
            .as_ref()
            .and_then(|c| c.get("query"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let chart_query = ChartQuery {
            chart_type,
            data_source,
            query: query_text,
            params: std::collections::HashMap::new(),
            title: Some(widget.name.clone()),
            x_axis_label: widget
                .query_config
                .as_ref()
                .and_then(|c| c.get("x_axis"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            y_axis_label: widget
                .query_config
                .as_ref()
                .and_then(|c| c.get("y_axis"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
        };

        let payload = match chart_service.generate_chart(chart_query).await {
            Ok(chart_result) => serde_json::to_value(&chart_result).unwrap_or_default(),
            Err(e) => {
                warn!(
                    "Failed to generate chart for widget {}: {}",
                    widget.id, e
                );
                serde_json::json!({ "error": e })
            }
        };

        let ttl = widget.cache_ttl_seconds.unwrap_or(60) as i64;
        WIDGET_CACHE.set(widget.id, payload.clone(), ttl);

        widget_data.push(serde_json::json!({
            "widget_id": widget.id,
            "name": widget.name,
            "widget_type": widget.widget_type,
            "payload": payload,
        }));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "Query dashboard real-time data",
        "data": {
            "dashboard_id": id,
            "dashboard_name": dashboard.name,
            "widgets": widget_data,
            "queried_at": Utc::now().to_rfc3339(),
        }
    }))
}

pub async fn refresh_dashboard_data(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Refreshing dashboard data: {}", id);

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE analytics_dashboards
        SET updated_at = $1
        WHERE id = $2
        RETURNING id, name
        "#,
        now,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            // Invalidate all widget caches for this dashboard
            let widgets = match sqlx::query!(
                r#"SELECT id FROM analytics_widgets WHERE dashboard_id = $1"#,
                id,
            )
            .fetch_all(&state.pool)
            .await
            {
                Ok(rows) => rows,
                Err(_) => vec![],
            };

            for widget in widgets {
                WIDGET_CACHE.invalidate(&widget.id);
            }

            Json(serde_json::json!({
                "success": true,
                "message": "Refresh dashboard data",
                "data": {
                    "id": row.id,
                    "name": row.name,
                    "last_refreshed": now.to_string(),
                    "widgets_refreshed": true,
                }
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Dashboard not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to refresh dashboard: {}", e)
        })),
    }
}

#[derive(Debug, Deserialize)]
pub struct SetAutoRefreshRequest {
    pub enabled: bool,
    pub interval_seconds: Option<i32>,
}

pub async fn set_auto_refresh(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<SetAutoRefreshRequest>,
) -> Json<serde_json::Value> {
    info!("Setting auto-refresh for dashboard: {}", id);

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE analytics_dashboards
        SET auto_refresh_enabled = $1,
            auto_refresh_interval = $2,
            updated_at = $3
        WHERE id = $4
        RETURNING id, auto_refresh_enabled, auto_refresh_interval
        "#,
        req.enabled,
        req.interval_seconds,
        now,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(serde_json::json!({
            "success": true,
            "message": "Set auto-refresh",
            "data": {
                "id": row.id,
                "auto_refresh_enabled": row.auto_refresh_enabled.unwrap_or(false),
                "auto_refresh_interval": row.auto_refresh_interval,
            }
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Dashboard not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to set auto-refresh: {}", e)
        })),
    }
}
