use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use topems_shared::{ApiResponse, api_error};
use crate::models::{CreateInteractionRequest, Interaction, UpdateInteractionRequest};

#[derive(Debug, Deserialize)]
pub struct InteractionPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
}

pub async fn create_routes() -> Result<Router> {
    let app = Router::new()
        .route("/api/v1/interactions", get(list_interactions).post(create_interaction))
        .route(
            "/api/v1/interactions/{id}",
            get(get_interaction).put(update_interaction).delete(delete_interaction),
        );

    Ok(app)
}

async fn list_interactions(
    State(pool): State<PgPool>,
    Query(params): Query<InteractionPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let customer_filter = params.customer_id;
    let contact_filter = params.contact_id;

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        FROM interactions
        WHERE ($1::text IS NULL OR subject ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR customer_id = $3)
          AND ($4::uuid IS NULL OR contact_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&customer_filter)
    .bind(&contact_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(interactions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM interactions
                WHERE ($1::text IS NULL OR subject ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR customer_id = $3)
                  AND ($4::uuid IS NULL OR contact_id = $4)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&customer_filter)
            .bind(&contact_filter)
            .fetch_one(&pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "interactions": interactions,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取交互记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取交互记录列表失败: {}", e);
            Json(api_error(500, "获取交互记录列表失败"))
        }
    }
}

async fn create_interaction(
    State(pool): State<PgPool>,
    Json(req): Json<CreateInteractionRequest>,
) -> Json<ApiResponse<Interaction>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        INSERT INTO interactions (
            id, customer_id, contact_id, type, subject, content, scheduled_at, notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9, $10)
        RETURNING id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.customer_id)
    .bind(&req.contact_id)
    .bind(&req.type_)
    .bind(&req.subject)
    .bind(&req.content)
    .bind(&req.scheduled_at)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(interaction) => Json(ApiResponse::success(interaction, "交互记录创建成功")),
        Err(e) => {
            tracing::error!("创建交互记录失败: {}", e);
            Json(api_error(500, "交互记录创建失败"))
        }
    }
}

async fn get_interaction(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Interaction>> {
    let result = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        FROM interactions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(interaction)) => Json(ApiResponse::success(interaction, "获取交互记录成功")),
        Ok(None) => Json(api_error(404, "交互记录不存在")),
        Err(e) => {
            tracing::error!("获取交互记录失败: {}", e);
            Json(api_error(500, "获取交互记录失败"))
        }
    }
}

async fn update_interaction(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInteractionRequest>,
) -> Json<ApiResponse<Interaction>> {
    let existing = sqlx::query_as::<_, Interaction>(
        r#"
        SELECT id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at FROM interactions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(api_error(404, "交互记录不存在")),
        Err(e) => return Json(api_error(500, &format!("查询交互记录失败: {}", e))),
    };

    let type_ = req.type_.unwrap_or(existing.type_);
    let subject = req.subject.or(existing.subject);
    let content = req.content.or(existing.content);
    let scheduled_at = req.scheduled_at.or(existing.scheduled_at);
    let completed_at = req.completed_at.or(existing.completed_at);
    let status = req.status.unwrap_or(existing.status);
    let customer_id = req.customer_id.or(existing.customer_id);
    let contact_id = req.contact_id.or(existing.contact_id);
    let notes = req.notes;
    let now = Utc::now();

    let result = sqlx::query_as::<_, Interaction>(
        r#"
        UPDATE interactions SET
            type = $2, subject = $3, content = $4, scheduled_at = $5, completed_at = $6, 
            status = $7, customer_id = $8, contact_id = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, customer_id, contact_id, type as type_, subject, content, scheduled_at, completed_at, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&type_)
    .bind(&subject)
    .bind(&content)
    .bind(&scheduled_at)
    .bind(&completed_at)
    .bind(&status)
    .bind(&customer_id)
    .bind(&contact_id)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(interaction) => Json(ApiResponse::success(interaction, "交互记录更新成功")),
        Err(e) => {
            tracing::error!("更新交互记录失败: {}", e);
            Json(api_error(500, "交互记录更新失败"))
        }
    }
}

async fn delete_interaction(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM interactions WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "交互记录删除成功")),
        Ok(_) => Json(api_error(404, "交互记录不存在")),
        Err(e) => {
            tracing::error!("删除交互记录失败: {}", e);
            Json(api_error(500, "交互记录删除失败"))
        }
    }
}
