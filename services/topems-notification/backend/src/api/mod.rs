pub mod notification;

use axum::{routing::*, Router};
use sqlx::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::AuthState;
use topems_shared::SystemMetrics;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/notifications", get(notification::list_notifications).post(notification::create_notification))
        .route("/api/v1/notifications/unread", get(notification::list_unread_notifications))
        .route("/api/v1/notifications/unread-count", get(notification::get_unread_count))
        .route("/api/v1/notifications/:id", get(notification::get_notification).put(notification::mark_as_read).delete(notification::delete_notification))
        .route("/api/v1/notifications/read-all", put(notification::mark_all_as_read))
}
