pub mod feedback;

pub use feedback::*;

use axum::{routing::delete, routing::get, routing::post, routing::put, Router};
use sqlx::PgPool;

use crate::AppState;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_feedbacks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'improvement',
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            screenshots TEXT[] NOT NULL DEFAULT '{}',
            satisfaction INT NOT NULL DEFAULT 3,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            response TEXT NOT NULL DEFAULT '',
            responded_by VARCHAR(255),
            responded_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_feedbacks_user_id ON core_feedbacks(user_id);",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_feedbacks_type ON core_feedbacks(type);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_feedbacks_status ON core_feedbacks(status);")
        .execute(pool)
        .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_feedbacks_created_at ON core_feedbacks(created_at);",
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub fn create_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/core/feedbacks", get(feedback::list_feedbacks))
        .route("/api/core/feedbacks/{id}", get(feedback::get_feedback))
        .route("/api/core/feedbacks", post(feedback::create_feedback))
        .route("/api/core/feedbacks/{id}", put(feedback::response_feedback))
        .route(
            "/api/core/feedbacks/{id}",
            delete(feedback::delete_feedback),
        )
        .route(
            "/api/core/feedbacks/batch",
            delete(feedback::delete_feedback),
        )
        .with_state(state)
}
