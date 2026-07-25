#![allow(dead_code)]
//! # [DEPRECATED] Feedback 模块已迁移为独立微服务
//!
//! 本模块已废弃，请使用独立服务 `svc/feedback`（端口 8087）。
//!
//! ## 迁移说明
//! - 独立服务路径：`svc/feedback/`
//! - API 路由：`/api/feedback/*`
//! - 旧路由别名：`/api/core/feedback/*`（通过反向代理兼容）
//!
//! 本模块代码保留用于参考，将在未来版本中移除。

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
        .route("/feedbacks", get(feedback::list_feedbacks))
        .route("/feedbacks/{id}", get(feedback::get_feedback))
        .route("/feedbacks", post(feedback::create_feedback))
        .route("/feedbacks/{id}", put(feedback::response_feedback))
        .route("/feedbacks/{id}", delete(feedback::delete_feedback))
        .route("/feedbacks/batch", delete(feedback::delete_feedback))
        .with_state(state)
}
