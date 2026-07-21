//! Report Subscription handlers

use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use std::fmt;
use tracing::info;
use uuid::Uuid;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/subscriptions",
            get(list_subscriptions).post(create_subscription),
        )
        .route(
            "/subscriptions/{id}",
            get(get_subscription)
                .put(update_subscription)
                .delete(delete_subscription),
        )
        .route("/subscriptions/{id}/toggle", post(toggle_subscription))
        .route("/subscriptions/user/{user_id}", get(get_user_subscriptions))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SubscriptionFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
}

impl fmt::Display for SubscriptionFrequency {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SubscriptionFrequency::Daily => write!(f, "daily"),
            SubscriptionFrequency::Weekly => write!(f, "weekly"),
            SubscriptionFrequency::Monthly => write!(f, "monthly"),
            SubscriptionFrequency::Quarterly => write!(f, "quarterly"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportSubscription {
    pub id: Uuid,
    pub template_id: Uuid,
    pub template_name: String,
    pub user_id: Uuid,
    pub email: Option<String>,
    pub frequency: SubscriptionFrequency,
    pub enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub template_id: Uuid,
    pub user_id: Uuid,
    pub email: Option<String>,
    pub frequency: SubscriptionFrequency,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSubscriptionRequest {
    pub email: Option<String>,
    pub frequency: Option<SubscriptionFrequency>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SubscriptionRow {
    pub id: Uuid,
    pub template_id: Uuid,
    pub user_id: Uuid,
    pub email: Option<String>,
    pub frequency: String,
    pub enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn get_subscription(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting subscription: {}", id);

    let subscription = sqlx::query(
        r#"
        SELECT s.id, s.template_id, t.name as template_name, s.user_id, 
               s.email, s.frequency, s.enabled, s.created_at
        FROM report_subscriptions s
        LEFT JOIN report_templates t ON s.template_id = t.id
        WHERE s.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match subscription {
        Ok(Some(s)) => Json(serde_json::json!({
            "success": true,
            "data": {
                "id": s.get::<Uuid, _>("id"),
                "template_id": s.get::<Uuid, _>("template_id"),
                "template_name": s.get::<Option<String>, _>("template_name"),
                "user_id": s.get::<String, _>("user_id"),
                "email": s.get::<Option<String>, _>("email"),
                "frequency": s.get::<String, _>("frequency"),
                "enabled": s.get::<bool, _>("enabled"),
                "created_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
            }
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Subscription not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to get subscription: {}", e)
        })),
    }
}

pub async fn list_subscriptions(State(state): State<AppState>) -> Json<serde_json::Value> {
    info!("Listing subscriptions");

    let subscriptions = sqlx::query(
        r#"
        SELECT s.id, s.template_id, s.user_id, s.email, s.frequency, s.enabled, s.created_at
        FROM report_subscriptions s
        ORDER BY s.created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = subscriptions
        .into_iter()
        .map(|s| {
            serde_json::json!({
                "id": s.get::<Uuid, _>("id"),
                "template_id": s.get::<Uuid, _>("template_id"),
                "user_id": s.get::<String, _>("user_id"),
                "email": s.get::<Option<String>, _>("email"),
                "frequency": s.get::<String, _>("frequency"),
                "enabled": s.get::<bool, _>("enabled"),
                "created_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "data": result,
        "total": result.len()
    }))
}

pub async fn get_user_subscriptions(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Json<serde_json::Value> {
    info!("Listing subscriptions for user: {}", user_id);

    let subscriptions = sqlx::query(
        r#"
        SELECT s.id, s.template_id, t.name as template_name, s.user_id, 
               s.email, s.frequency, s.enabled, s.created_at
        FROM report_subscriptions s
        LEFT JOIN report_templates t ON s.template_id = t.id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = subscriptions
        .into_iter()
        .map(|s| {
            serde_json::json!({
                "id": s.get::<Uuid, _>("id"),
                "template_id": s.get::<Uuid, _>("template_id"),
                "template_name": s.get::<Option<String>, _>("template_name"),
                "user_id": s.get::<String, _>("user_id"),
                "email": s.get::<Option<String>, _>("email"),
                "frequency": s.get::<String, _>("frequency"),
                "enabled": s.get::<bool, _>("enabled"),
                "created_at": s.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "data": result,
        "total": result.len()
    }))
}

pub async fn create_subscription(
    State(state): State<AppState>,
    Json(req): Json<CreateSubscriptionRequest>,
) -> Json<serde_json::Value> {
    info!("Creating subscription for user: {}", req.user_id);

    let id = Uuid::new_v4();

    let result = sqlx::query(
        r#"
        INSERT INTO report_subscriptions (id, template_id, user_id, email, frequency, enabled)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(id)
    .bind(req.template_id)
    .bind(req.user_id.to_string())
    .bind(&req.email)
    .bind(req.frequency.to_string())
    .bind(true)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Subscription created",
            "data": id
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to create subscription: {}", e)
        })),
    }
}

pub async fn update_subscription(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSubscriptionRequest>,
) -> Json<serde_json::Value> {
    info!("Updating subscription: {}", id);

    let result = sqlx::query!(
        r#"
        UPDATE report_subscriptions
        SET email = COALESCE($1, email),
            frequency = COALESCE($2, frequency),
            enabled = COALESCE($3, enabled)
        WHERE id = $4
        "#,
        req.email,
        req.frequency.map(|f| f.to_string()),
        req.enabled,
        id,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Subscription updated"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to update subscription: {}", e)
        })),
    }
}

pub async fn delete_subscription(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting subscription: {}", id);

    let result = sqlx::query!(
        r#"
        DELETE FROM report_subscriptions
        WHERE id = $1
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Subscription deleted"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to delete subscription: {}", e)
        })),
    }
}

pub async fn toggle_subscription(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Toggling subscription: {}", id);

    let result = sqlx::query!(
        r#"
        UPDATE report_subscriptions
        SET enabled = NOT enabled
        WHERE id = $1
        RETURNING id, enabled
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let enabled = row.enabled.unwrap_or(false);
            Json(serde_json::json!({
                "success": true,
                "message": format!("Subscription {}d", if enabled { "enable" } else { "disable" }),
                "data": {
                    "id": row.id,
                    "enabled": enabled
                }
            }))
        }
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "Subscription not found"
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to toggle subscription: {}", e)
        })),
    }
}
