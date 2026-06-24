use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    CreateSupplierEvaluationRequest, SupplierEvaluation, UpdateSupplierEvaluationRequest,
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
        .route(
            "/api/srm/supplier-evaluations",
            get(list_evaluations).post(create_evaluation),
        )
        .route(
            "/api/srm/supplier-evaluations/{id}",
            get(get_evaluation)
                .put(update_evaluation)
                .delete(delete_evaluation),
        )
        .route(
            "/api/srm/suppliers/{id}/evaluation-history",
            get(get_evaluation_history),
        )
        .route("/api/srm/suppliers/{id}/performance-summary", get(get_performance_summary))
        .route("/api/srm/suppliers/{id}/score-trend", get(get_score_trend))
        .route("/api/srm/evaluations/statistics", get(get_evaluation_statistics))
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
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let supplier_id_filter = params
        .supplier_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());

    let start_date = params.start_date.clone().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let end_date = params.end_date.clone().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM plugin_srm.supplier_evaluations
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
                SELECT COUNT(*) FROM plugin_srm.supplier_evaluations
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
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取供应商评估列表失败",
            ))
        }
    }
}

async fn create_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 数据验证
    if req.evaluation_no.is_empty() {
        return Json(ApiResponse::<SupplierEvaluation>::error(
            400,
            "评估编号不能为空",
        ));
    }

    // 验证供应商ID
    let supplier_uuid = Uuid::parse_str(&req.supplier_id);
    if supplier_uuid.is_err() {
        return Json(ApiResponse::<SupplierEvaluation>::error(
            400,
            "供应商ID格式错误",
        ));
    }

    let supplier_id = supplier_uuid.unwrap();

    // 检查供应商是否存在
    let supplier_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE id = $1 AND status != 'deleted'",
    )
    .bind(supplier_id)
    .fetch_one(&state.db)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<SupplierEvaluation>::error(
            400,
            "供应商不存在或已删除",
        ));
    }

    // 检查评估编号是否已存在
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_evaluations WHERE evaluation_no = $1",
    )
    .bind(&req.evaluation_no)
    .fetch_one(&state.db)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<SupplierEvaluation>::error(
            400,
            "评估编号已存在",
        ));
    }

    let validate_score = |score: Option<f64>, name: &str| -> Result<(), String> {
        if let Some(s) = score {
            if s < 0.0 || s > 100.0 {
                return Err(format!("{}评分必须在0-100之间", name));
            }
        }
        Ok(())
    };

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

    let overall_score = if req.overall_score.is_some() {
        req.overall_score
    } else {
        let dimensions = sqlx::query_as::<_, (String, f64)>(
            r#"
            SELECT code, weight 
            FROM plugin_srm.scoring_dimensions 
            WHERE is_active = true
            ORDER BY sort_order ASC
            "#,
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        if !dimensions.is_empty() {
            let mut total_weighted_score = 0.0;
            let mut total_weight = 0.0;

            for (code, weight) in dimensions {
                let score = match code.as_str() {
                    "quality" => req.quality_score.unwrap_or(0.0),
                    "delivery" => req.delivery_score.unwrap_or(0.0),
                    "service" => req.service_score.unwrap_or(0.0),
                    "price" => req.price_score.unwrap_or(0.0),
                    _ => 0.0,
                };
                total_weighted_score += score * weight;
                total_weight += weight;
            }

            if total_weight > 0.0 {
                Some((total_weighted_score / total_weight * 100.0).round() / 100.0)
            } else {
                None
            }
        } else {
            let scores = vec![
                req.quality_score,
                req.delivery_score,
                req.service_score,
                req.price_score,
            ];
            let valid_scores: Vec<f64> = scores.into_iter().flatten().collect();
            if !valid_scores.is_empty() {
                let avg = valid_scores.iter().sum::<f64>() / valid_scores.len() as f64;
                Some(avg.round() / 100.0 * 100.0)
            } else {
                None
            }
        }
    };

    if let Some(os) = overall_score {
        if os < 0.0 || os > 100.0 {
            return Json(ApiResponse::<SupplierEvaluation>::error(
                400,
                "综合评分必须在0-100之间",
            ));
        }
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        INSERT INTO plugin_srm.supplier_evaluations (id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(supplier_id)
    .bind(&req.evaluation_no)
    .bind(now)
    .bind(&req.evaluator)
    .bind(overall_score)
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
            Json(ApiResponse::<SupplierEvaluation>::error(
                500,
                "供应商评估创建失败",
            ))
        }
    }
}

async fn get_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM plugin_srm.supplier_evaluations WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(evaluation)) => Json(ApiResponse::success(evaluation, "获取供应商评估成功")),
        Ok(None) => Json(ApiResponse::<SupplierEvaluation>::error(
            404,
            "供应商评估不存在",
        )),
        Err(e) => {
            tracing::error!("获取供应商评估失败: {}", e);
            Json(ApiResponse::<SupplierEvaluation>::error(
                500,
                "获取供应商评估失败",
            ))
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
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, SupplierEvaluation>(
        "SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at FROM plugin_srm.supplier_evaluations WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => {
            return Json(ApiResponse::<SupplierEvaluation>::error(
                404,
                "供应商评估不存在",
            ))
        }
        Err(e) => {
            return Json(ApiResponse::<SupplierEvaluation>::error(
                500,
                &format!("查询供应商评估失败: {}", e),
            ))
        }
    };

    // 验证供应商ID（如果更新）
    let supplier_id = if let Some(supplier_id_str) = &req.supplier_id {
        let supplier_uuid = Uuid::parse_str(supplier_id_str);
        if supplier_uuid.is_err() {
            return Json(ApiResponse::<SupplierEvaluation>::error(
                400,
                "供应商ID格式错误",
            ));
        }

        let supplier_uuid_val = supplier_uuid.unwrap();

        let supplier_exists = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE id = $1 AND status != 'deleted'",
        )
        .bind(supplier_uuid_val)
        .fetch_one(&state.db)
        .await;

        if supplier_exists.unwrap_or(0) == 0 {
            return Json(ApiResponse::<SupplierEvaluation>::error(
                400,
                "供应商不存在或已删除",
            ));
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
        UPDATE plugin_srm.supplier_evaluations SET
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
            Json(ApiResponse::<SupplierEvaluation>::error(
                500,
                "供应商评估更新失败",
            ))
        }
    }
}

async fn delete_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM plugin_srm.supplier_evaluations WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "供应商评估删除成功"))
        }
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
        Ok(_) => {}
        Err(e) => return e,
    }

    // 验证供应商是否存在
    let supplier_exists =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM plugin_srm.suppliers WHERE id = $1")
            .bind(id)
            .fetch_one(&state.db)
            .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<Vec<SupplierEvaluation>>::error(
            404,
            "供应商不存在",
        ));
    }

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        r#"
        SELECT id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM plugin_srm.supplier_evaluations
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
            Json(ApiResponse::<Vec<SupplierEvaluation>>::error(
                500,
                "获取供应商评估历史失败",
            ))
        }
    }
}

async fn get_performance_summary(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as total_evaluations,
            AVG(overall_score) as avg_overall_score,
            AVG(quality_score) as avg_quality_score,
            AVG(delivery_score) as avg_delivery_score,
            AVG(service_score) as avg_service_score,
            AVG(price_score) as avg_price_score,
            MAX(overall_score) as max_overall_score,
            MIN(overall_score) as min_overall_score,
            MAX(evaluation_date) as latest_evaluation_date,
            MIN(evaluation_date) as earliest_evaluation_date
        FROM plugin_srm.supplier_evaluations
        WHERE supplier_id = $1 AND status = 'completed'
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => {
            let total = row.total_evaluations.unwrap_or(0);
            let summary = serde_json::json!({
                "supplier_id": id,
                "total_evaluations": total,
                "avg_overall_score": row.avg_overall_score.map(|v| (v * 100.0).round() / 100.0),
                "avg_quality_score": row.avg_quality_score.map(|v| (v * 100.0).round() / 100.0),
                "avg_delivery_score": row.avg_delivery_score.map(|v| (v * 100.0).round() / 100.0),
                "avg_service_score": row.avg_service_score.map(|v| (v * 100.0).round() / 100.0),
                "avg_price_score": row.avg_price_score.map(|v| (v * 100.0).round() / 100.0),
                "max_overall_score": row.max_overall_score.map(|v| (v * 100.0).round() / 100.0),
                "min_overall_score": row.min_overall_score.map(|v| (v * 100.0).round() / 100.0),
                "latest_evaluation_date": row.latest_evaluation_date,
                "earliest_evaluation_date": row.earliest_evaluation_date,
                "performance_level": if total > 0 {
                    let avg = row.avg_overall_score.unwrap_or(0.0);
                    if avg >= 90.0 { "excellent" } else if avg >= 80.0 { "good" } else if avg >= 70.0 { "medium" } else if avg >= 60.0 { "poor" } else { "critical" }
                } else {
                    "no_data"
                }
            });
            Json(ApiResponse::success(summary, "获取供应商绩效汇总成功"))
        }
        Ok(None) => Json(ApiResponse::success(serde_json::json!({
            "supplier_id": id,
            "total_evaluations": 0,
            "avg_overall_score": null,
            "avg_quality_score": null,
            "avg_delivery_score": null,
            "avg_service_score": null,
            "avg_price_score": null,
            "max_overall_score": null,
            "min_overall_score": null,
            "latest_evaluation_date": null,
            "earliest_evaluation_date": null,
            "performance_level": "no_data"
        }), "获取供应商绩效汇总成功")),
        Err(e) => {
            tracing::error!("获取供应商绩效汇总失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取供应商绩效汇总失败"))
        }
    }
}

async fn get_score_trend(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Query(params): Query<EvaluationQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let start_date = params.start_date.clone().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let end_date = params.end_date.clone().and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let result = sqlx::query!(
        r#"
        SELECT 
            evaluation_date,
            overall_score,
            quality_score,
            delivery_score,
            service_score,
            price_score,
            evaluation_no
        FROM plugin_srm.supplier_evaluations
        WHERE supplier_id = $1 
          AND status = 'completed'
          AND ($2::timestamptz IS NULL OR evaluation_date >= $2)
          AND ($3::timestamptz IS NULL OR evaluation_date <= $3)
        ORDER BY evaluation_date ASC
        "#,
        id,
        start_date,
        end_date
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let trend_data: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                serde_json::json!({
                    "evaluation_date": r.evaluation_date,
                    "evaluation_no": r.evaluation_no,
                    "overall_score": r.overall_score.map(|v| (v * 100.0).round() / 100.0),
                    "quality_score": r.quality_score.map(|v| (v * 100.0).round() / 100.0),
                    "delivery_score": r.delivery_score.map(|v| (v * 100.0).round() / 100.0),
                    "service_score": r.service_score.map(|v| (v * 100.0).round() / 100.0),
                    "price_score": r.price_score.map(|v| (v * 100.0).round() / 100.0),
                })
            }).collect();

            let summary = if !trend_data.is_empty() {
                let first_score = trend_data.first().and_then(|d| d.get("overall_score").and_then(|s| s.as_f64()));
                let last_score = trend_data.last().and_then(|d| d.get("overall_score").and_then(|s| s.as_f64()));
                let change = match (first_score, last_score) {
                    (Some(f), Some(l)) => Some((l - f).round() / 100.0 * 100.0),
                    _ => None
                };
                serde_json::json!({
                    "trend_direction": match change {
                        Some(c) if c > 0.0 => "up",
                        Some(c) if c < 0.0 => "down",
                        _ => "stable"
                    },
                    "score_change": change,
                    "data_points": trend_data.len()
                })
            } else {
                serde_json::json!({
                    "trend_direction": "no_data",
                    "score_change": null,
                    "data_points": 0
                })
            };

            Json(ApiResponse::success(serde_json::json!({
                "supplier_id": id,
                "trend_data": trend_data,
                "summary": summary
            }), "获取供应商评分趋势成功"))
        }
        Err(e) => {
            tracing::error!("获取供应商评分趋势失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取供应商评分趋势失败"))
        }
    }
}

async fn get_evaluation_statistics(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let total_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_evaluations"
    )
    .fetch_one(&state.db)
    .await;

    let completed_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_evaluations WHERE status = 'completed'"
    )
    .fetch_one(&state.db)
    .await;

    let pending_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.supplier_evaluations WHERE status = 'pending'"
    )
    .fetch_one(&state.db)
    .await;

    let avg_score_result = sqlx::query_scalar::<_, f64>(
        "SELECT AVG(overall_score) FROM plugin_srm.supplier_evaluations WHERE status = 'completed' AND overall_score IS NOT NULL"
    )
    .fetch_one(&state.db)
    .await;

    let supplier_count_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(DISTINCT supplier_id) FROM plugin_srm.supplier_evaluations"
    )
    .fetch_one(&state.db)
    .await;

    let statistics = serde_json::json!({
        "total_evaluations": total_result.unwrap_or(0),
        "completed_evaluations": completed_result.unwrap_or(0),
        "pending_evaluations": pending_result.unwrap_or(0),
        "avg_overall_score": avg_score_result.map(|v| (v * 100.0).round() / 100.0),
        "evaluated_supplier_count": supplier_count_result.unwrap_or(0),
        "completion_rate": if total_result.unwrap_or(0) > 0 {
            ((completed_result.unwrap_or(0) as f64 / total_result.unwrap_or(0) as f64) * 100.0).round() / 100.0
        } else {
            0.0
        }
    });

    Json(ApiResponse::success(statistics, "获取评估统计成功"))
}
