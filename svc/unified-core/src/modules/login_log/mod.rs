pub mod handlers;
pub mod models;

use axum::routing::{delete, get, post};
use axum::Router;
use sqlx::PgPool;

use crate::middleware::permission::require_permission;
use crate::AppState;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_login_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            user_id UUID,
            username VARCHAR(64) NOT NULL,
            ip_address VARCHAR(128) NOT NULL,
            user_agent TEXT,
            status VARCHAR(32) NOT NULL,
            error_message TEXT,
            login_time TIMESTAMP NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_login_logs_tenant_id ON core_login_logs(tenant_id)",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON core_login_logs(user_id)")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON core_login_logs(login_time)",
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub fn create_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("login-log/logs", get(handlers::list_login_logs))
        .route("login-log/logs", post(handlers::record_login))
        .route(
            "login-log/logs/batch-delete",
            post(handlers::batch_delete_login_logs),
        )
        .route("login-log/logs/{id}", get(handlers::get_login_log))
        .route("login-log/logs/{id}", delete(handlers::delete_login_log))
        .with_state(state.clone())
        .layer(axum::middleware::from_fn_with_state(
            state,
            require_permission("system:audit"),
        ))
}
