use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateSupplierEvaluationRequest, SupplierEvaluation, UpdateSupplierEvaluationRequest};

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub code: u16,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        Self {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: u16, message: &str) -> Self {
        Self {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub supplier_id: Option<Uuid>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/evaluations", get(list_evaluations).post(create_evaluation))
        .route(
            "/api/v1/evaluations/{id}",
            get(get_evaluation).put(update_evaluation),
        )
        .with_state(state);

    Ok(app)
}

async fn list_evaluations(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, supplier_id, evaluation_date, quality_score, delivery_score, service_score, price_score, overall_score, comments, evaluator, created_at, updated_at
        FROM supplier_evaluations
        WHERE ($1::uuid IS NULL OR supplier_id = $1)
        ORDER BY evaluation_date DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(params.supplier_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(evaluations) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM supplier_evaluations
                WHERE ($1::uuid IS NULL OR supplier_id = $1)
                "#,
            )
            .bind(params.supplier_id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "evaluations": evaluations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取供应商评估列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商评估列表失败: {}", e);
            Json(ApiResponse::error(500, "获取供应商评估列表失败"))
        }
    }
}

async fn create_evaluation(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        INSERT INTO supplier_evaluations (id, supplier_id, evaluation_date, quality_score, delivery_score, service_score, price_score, overall_score, comments, evaluator, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, supplier_id, evaluation_date, quality_score, delivery_score, service_score, price_score, overall_score, comments, evaluator, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.supplier_id)
    .bind(req.evaluation_date)
    .bind(req.quality_score)
    .bind(req.delivery_score)
    .bind(req.service_score)
    .bind(req.price_score)
    .bind(req.overall_score)
    .bind(&req.comments)
    .bind(&req.evaluator)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(evaluation) => Json(ApiResponse::success(evaluation, "供应商评估创建成功")),
        Err(e) => {
            tracing::error!("创建供应商评估失败: {}", e);
            Json(ApiResponse::error(500, "供应商评估创建失败"))
        }
    }
}

async fn get_evaluation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, supplier_id, evaluation_date, quality_score, delivery_score, service_score, price_score, overall_score, comments, evaluator, created_at, updated_at
        FROM supplier_evaluations WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(evaluation)) => Json(ApiResponse::success(evaluation, "获取供应商评估成功")),
        Ok(None) => Json(ApiResponse::error(404, "供应商评估不存在")),
        Err(e) => {
            tracing::error!("获取供应商评估失败: {}", e);
            Json(ApiResponse::error(500, "获取供应商评估失败"))
        }
    }
}

async fn update_evaluation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let existing = sqlx::query_as::<_, SupplierEvaluation>(
        "SELECT id, supplier_id, evaluation_date, quality_score, delivery_score, service_score, price_score, overall_score, comments, evaluator, created_at, updated_at FROM supplier_evaluations WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::error(404, "供应商评估不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询供应商评估失败: {}", e))),
    };

    let quality_score = req.quality_score.or(existing.quality_score);
    let delivery_score = req.delivery_score.or(existing.delivery_score);
    let service_score = req.service_score.or(existing.service_score);
    let price_score = req.price_score.or(existing.price_score);
    let overall_score = req.overall_score.or(existing.overall_score);
    let comments = req.comments.or(existing.comments);
    let evaluator = req.evaluator.or(existing.evaluator);
    let now = Utc::now();

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        UPDATE supplier_evaluations SET
            quality_score = $2, delivery_score = $3, service_score = $4, price_score = $5, overall_score = $6, comments = $7, evaluator = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, supplier_id, evaluation_date, quality_score, delivery_score, service_score, price_score, overall_score, comments, evaluator, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(quality_score)
    .bind(delivery_score)
    .bind(service_score)
    .bind(price_score)
    .bind(overall_score)
    .bind(&comments)
    .bind(&evaluator)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(evaluation) => Json(ApiResponse::success(evaluation, "供应商评估更新成功")),
        Err(e) => {
            tracing::error!("更新供应商评估失败: {}", e);
            Json(ApiResponse::error(500, "供应商评估更新失败"))
        }
    }
}
