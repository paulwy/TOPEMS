use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    SupplierEvaluation,
    CreateSupplierEvaluationRequest, UpdateSupplierEvaluationRequest,
};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct EvaluationQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub supplier_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/supplier-evaluations", get(list_evaluations).post(create_evaluation))
        .route(
            "/api/v1/supplier-evaluations/{id}",
            get(get_evaluation).put(update_evaluation).delete(delete_evaluation),
        )
        .route("/api/v1/suppliers/{id}/evaluation-history", get(get_evaluation_history))
        .with_state(state);

    Ok(app)
}

// ==================== Evaluation Handlers ====================

async fn list_evaluations(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<EvaluationQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let supplier_id_filter = params.supplier_id.clone().and_then(|s| Uuid::parse_str(&s).ok());

    let start_date = params.start_date.clone().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&Utc))
    });

    let end_date = params.end_date.clone().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&Utc))
    });

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM srm.supplier_evaluations
        WHERE ($1::text IS NULL OR evaluation_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR supplier_id = $3)
          AND ($4::timestamptz IS NULL OR evaluation_date >= $4)
          AND ($5::timestamptz IS NULL OR evaluation_date <= $5)
        ORDER BY evaluation_date DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(supplier_id_filter)
    .bind(start_date)
    .bind(end_date)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(evaluations) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM srm.supplier_evaluations
                WHERE ($1::text IS NULL OR evaluation_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR supplier_id = $3)
                  AND ($4::timestamptz IS NULL OR evaluation_date >= $4)
                  AND ($5::timestamptz IS NULL OR evaluation_date <= $5)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(supplier_id_filter)
            .bind(start_date)
            .bind(end_date)
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
            Json(ApiResponse::<serde_json::Value>::error(500, "获取供应商评估列表失败"))
        }
    }
}

async fn create_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 数据验证
    if req.evaluation_no.is_empty() {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, "评估编号不能为空"));
    }

    // 验证供应商ID
    let supplier_uuid = Uuid::parse_str(&req.supplier_id);
    if supplier_uuid.is_err() {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, "供应商ID格式错误"));
    }

    let supplier_id = supplier_uuid.unwrap();

    // 检查供应商是否存在
    let supplier_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND status != 'deleted'"
    )
    .bind(supplier_id)
    .fetch_one(&state.db)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, "供应商不存在或已删除"));
    }

    // 检查评估编号是否已存在
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.supplier_evaluations WHERE evaluation_no = $1"
    )
    .bind(&req.evaluation_no)
    .fetch_one(&state.db)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, "评估编号已存在"));
    }

    // 验证评分范围
    let validate_score = |score: Option<f64>, name: &str| -> Result<(), String> {
        if let Some(s) = score {
            if s < 0.0 || s > 100.0 {
                return Err(format!("{}评分必须在0-100之间", name));
            }
        }
        Ok(())
    };

    if let Err(msg) = validate_score(req.overall_score, "综合") {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, &msg));
    }
    if let Err(msg) = validate_score(req.quality_score, "质量") {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, &msg));
    }
    if let Err(msg) = validate_score(req.delivery_score, "交付") {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, &msg));
    }
    if let Err(msg) = validate_score(req.service_score, "服务") {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, &msg));
    }
    if let Err(msg) = validate_score(req.price_score, "价格") {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, &msg));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        INSERT INTO srm.supplier_evaluations (id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(supplier_id)
    .bind(&req.evaluation_no)
    .bind(now)
    .bind(&req.evaluator)
    .bind(req.overall_score)
    .bind(req.quality_score)
    .bind(req.delivery_score)
    .bind(req.service_score)
    .bind(req.price_score)
    .bind(&req.comments)
    .bind(&req.status)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(evaluation) => Json(ApiResponse::success(evaluation, "供应商评估创建成功")),
        Err(e) => {
            tracing::error!("创建供应商评估失败: {}", e);
            Json(ApiResponse::<SupplierEvaluation>::error(500, "供应商评估创建失败"))
        }
    }
}

async fn get_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM srm.supplier_evaluations WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(evaluation)) => Json(ApiResponse::success(evaluation, "获取供应商评估成功")),
        Ok(None) => Json(ApiResponse::<SupplierEvaluation>::error(404, "供应商评估不存在")),
        Err(e) => {
            tracing::error!("获取供应商评估失败: {}", e);
            Json(ApiResponse::<SupplierEvaluation>::error(500, "获取供应商评估失败"))
        }
    }
}

async fn update_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, SupplierEvaluation>(
        "SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at FROM srm.supplier_evaluations WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::<SupplierEvaluation>::error(404, "供应商评估不存在")),
        Err(e) => return Json(ApiResponse::<SupplierEvaluation>::error(500, &format!("查询供应商评估失败: {}", e))),
    };

    // 验证供应商ID（如果更新）
    let supplier_id = if let Some(supplier_id_str) = &req.supplier_id {
        let supplier_uuid = Uuid::parse_str(supplier_id_str);
        if supplier_uuid.is_err() {
            return Json(ApiResponse::<SupplierEvaluation>::error(400, "供应商ID格式错误"));
        }

        let supplier_uuid_val = supplier_uuid.unwrap();

        let supplier_exists = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1 AND status != 'deleted'"
        )
        .bind(supplier_uuid_val)
        .fetch_one(&state.db)
        .await;

        if supplier_exists.unwrap_or(0) == 0 {
            return Json(ApiResponse::<SupplierEvaluation>::error(400, "供应商不存在或已删除"));
        }

        supplier_uuid_val
    } else {
        existing.supplier_id
    };

    // 验证评分范围
    let validate_score = |score: Option<f64>, name: &str| -> Result<(), String> {
        if let Some(s) = score {
            if s < 0.0 || s > 100.0 {
                return Err(format!("{}评分必须在0-100之间", name));
            }
        }
        Ok(())
    };

    if let Err(msg) = validate_score(req.overall_score, "综合") {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, &msg));
    }
    if let Err(msg) = validate_score(req.quality_score, "质量") {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, &msg));
    }
    if let Err(msg) = validate_score(req.delivery_score, "交付") {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, &msg));
    }
    if let Err(msg) = validate_score(req.service_score, "服务") {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, &msg));
    }
    if let Err(msg) = validate_score(req.price_score, "价格") {
        return Json(ApiResponse::<SupplierEvaluation>::error(400, &msg));
    }

    let evaluation_no = req.evaluation_no.unwrap_or(existing.evaluation_no);
    let evaluator = req.evaluator.or(existing.evaluator);
    let overall_score = req.overall_score.or(existing.overall_score);
    let quality_score = req.quality_score.or(existing.quality_score);
    let delivery_score = req.delivery_score.or(existing.delivery_score);
    let service_score = req.service_score.or(existing.service_score);
    let price_score = req.price_score.or(existing.price_score);
    let comments = req.comments.or(existing.comments);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        UPDATE srm.supplier_evaluations SET
            supplier_id = $2, evaluation_no = $3, evaluator = $4, overall_score = $5, quality_score = $6, delivery_score = $7, service_score = $8, price_score = $9, comments = $10, status = $11, updated_at = $12
        WHERE id = $1
        RETURNING id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(supplier_id)
    .bind(evaluation_no)
    .bind(evaluator)
    .bind(overall_score)
    .bind(quality_score)
    .bind(delivery_score)
    .bind(service_score)
    .bind(price_score)
    .bind(comments)
    .bind(status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(evaluation) => Json(ApiResponse::success(evaluation, "供应商评估更新成功")),
        Err(e) => {
            tracing::error!("更新供应商评估失败: {}", e);
            Json(ApiResponse::<SupplierEvaluation>::error(500, "供应商评估更新失败"))
        }
    }
}

async fn delete_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM srm.supplier_evaluations WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "供应商评估删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "供应商评估不存在")),
        Err(e) => {
            tracing::error!("删除供应商评估失败: {}", e);
            Json(ApiResponse::<String>::error(500, "供应商评估删除失败"))
        }
    }
}

// ==================== Evaluation History Handler ====================

async fn get_evaluation_history(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<SupplierEvaluation>>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 验证供应商是否存在
    let supplier_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.suppliers WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.db)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<Vec<SupplierEvaluation>>::error(404, "供应商不存在"));
    }

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM srm.supplier_evaluations
        WHERE supplier_id = $1
        ORDER BY evaluation_date DESC
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(evaluations) => Json(ApiResponse::success(evaluations, "获取供应商评估历史成功")),
        Err(e) => {
            tracing::error!("获取供应商评估历史失败: {}", e);
            Json(ApiResponse::<Vec<SupplierEvaluation>>::error(500, "获取供应商评估历史失败"))
        }
    }
}