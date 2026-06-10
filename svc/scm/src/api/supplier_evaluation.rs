use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{CreateSupplierEvaluationRequest, SupplierEvaluation, UpdateSupplierEvaluationRequest};
use topems_shared::{ApiResponse, api_error};
use crate::api::audit::log_audit_event;
use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct SupplierEvaluationQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub supplier_id: Option<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/evaluations", get(list_evaluations).post(create_evaluation))
        .route(
            "/api/v1/evaluations/{id}",
            get(get_evaluation).put(update_evaluation),
        )
}

async fn list_evaluations(
    State(state): State<ApiState>,
    Query(params): Query<SupplierEvaluationQueryParams>,
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
            Json(api_error(500, "获取供应商评估列表失败"))
        }
    }
}

async fn create_evaluation(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let request_data = serde_json::to_value(&req).ok();
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

    let (response, status, error_msg) = match &result {
        Ok(evaluation) => (
            Json(ApiResponse::success(evaluation.clone(), "供应商评估创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建供应商评估失败: {}", e);
            (
                Json(api_error(500, "供应商评估创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(evaluation) = &result {
        serde_json::to_value(evaluation).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "supplier_evaluation".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_evaluation(
    State(state): State<ApiState>,
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
        Ok(None) => Json(api_error(404, "供应商评估不存在")),
        Err(e) => {
            tracing::error!("获取供应商评估失败: {}", e);
            Json(api_error(500, "获取供应商评估失败"))
        }
    }
}

async fn update_evaluation(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let request_data = serde_json::to_value(&req).ok();
    
    let existing = sqlx::query_as::<_, SupplierEvaluation>(
        "SELECT id, supplier_id, evaluation_date, quality_score, delivery_score, service_score, price_score, overall_score, comments, evaluator, created_at, updated_at FROM supplier_evaluations WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(api_error(404, "供应商评估不存在")),
        Err(e) => return Json(api_error(500, &format!("查询供应商评估失败: {}", e))),
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

    let (response, status_str, error_msg) = match &result {
        Ok(evaluation) => (
            Json(ApiResponse::success(evaluation.clone(), "供应商评估更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新供应商评估失败: {}", e);
            (
                Json(api_error(500, "供应商评估更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(evaluation) = &result {
        serde_json::to_value(evaluation).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "supplier_evaluation".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}
