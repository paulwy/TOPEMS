use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use sqlx::types::Uuid;
use tracing::info;

use crate::shared::AppState;

use super::models::{ShareDashboardRequest, ShareLinkResponse};

pub async fn create_share_link(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ShareDashboardRequest>,
) -> Json<serde_json::Value> {
    info!("Creating share link for dashboard: {}", id);

    let share_id = Uuid::new_v4();
    let now = Utc::now().naive_utc();

    let expires_at = req
        .expires_at
        .and_then(|s| chrono::NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S").ok());

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
                share_url: format!("/dashboard/share/{}", row.id),
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
            share_url: format!("/dashboard/share/{}", row.id),
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
    Path(share_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting share link: {}", share_id);

    let result = sqlx::query!(
        r#"
        DELETE FROM analytics_dashboard_shares
        WHERE id = $1
        RETURNING id
        "#,
        share_id,
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
