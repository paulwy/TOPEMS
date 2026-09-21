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
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::{
    CreateSupplierEvaluationRequest, EvaluationScoreTrendRow, EvaluationSummaryRow,
    SupplierEvaluation, UpdateSupplierEvaluationRequest,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

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
            "/supplier-evaluations",
            get(list_evaluations).post(create_evaluation),
        )
        .route(
            "/supplier-evaluations/{id}",
            get(get_evaluation)
                .put(update_evaluation)
                .delete(delete_evaluation),
        )
        .route(
            "/suppliers/{id}/evaluation-history",
            get(get_evaluation_history),
        )
        .route(
            "/suppliers/{id}/performance-summary",
            get(get_performance_summary),
        )
        .route("/suppliers/{id}/score-trend", get(get_score_trend))
        .route("/evaluations/statistics", get(get_evaluation_statistics))
        .with_state(state);

    Ok(app)
}

// ==================== Evaluation Handlers ====================

pub async fn list_evaluations(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<EvaluationQueryParams>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
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
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM srm.supplier_evaluations
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR evaluation_no ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR supplier_id = $4)
          AND ($5::timestamptz IS NULL OR evaluation_date >= $5)
          AND ($6::timestamptz IS NULL OR evaluation_date <= $6)
        ORDER BY evaluation_date DESC
        LIMIT $7 OFFSET $8
        "#, "srm"),
    )
    .bind(tenant_opt)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(supplier_id_filter)
    .bind(start_date)
    .bind(end_date)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(evaluations) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "srm",
                r#"
                SELECT COUNT(*) FROM srm.supplier_evaluations
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR evaluation_no ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR supplier_id = $4)
                  AND ($5::timestamptz IS NULL OR evaluation_date >= $5)
                  AND ($6::timestamptz IS NULL OR evaluation_date <= $6)
                "#,
                "srm"
            ))
            .bind(tenant_opt)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(supplier_id_filter)
            .bind(start_date)
            .bind(end_date)
            .fetch_one(&mut **txn)
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

pub async fn create_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    if req.evaluation_no.is_empty() {
        return Json(ApiResponse::<SupplierEvaluation>::error(
            400,
            "评估编号不能为空",
        ));
    }

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(ApiResponse::<SupplierEvaluation>::error(
                400,
                "供应商ID格式错误",
            ));
        }
    };

    let supplier_exists = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.suppliers WHERE ($1::uuid IS NULL OR tenant_id = $1) AND id = $2 AND status != 'deleted'", "srm"),
    )
    .bind(tenant_opt)
    .bind(supplier_id)
    .fetch_one(&mut **txn)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<SupplierEvaluation>::error(
            400,
            "供应商不存在或已删除",
        ));
    }

    let existing = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.supplier_evaluations WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND evaluation_no = $2", "srm"),
    )
    .bind(tenant_opt)
    .bind(&req.evaluation_no)
    .fetch_one(&mut **txn)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<SupplierEvaluation>::error(
            400,
            "评估编号已存在",
        ));
    }

    let validate_score = |score: Option<f64>, name: &str| -> Result<(), String> {
        if let Some(s) = score {
            if !(0.0..=100.0).contains(&s) {
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
        let dimensions = sqlx::query_as::<_, (String, f64)>(only_own_schema_query!(
            "srm",
            r#"
            SELECT code, weight 
            FROM srm.scoring_dimensions 
            WHERE ($1::uuid IS NULL OR tenant_id = $1) AND is_active = true
            ORDER BY sort_order ASC
            "#,
            "srm"
        ))
        .bind(tenant_opt)
        .fetch_all(&mut **txn)
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
        if !(0.0..=100.0).contains(&os) {
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
        only_own_schema_query!("srm", r#"
        INSERT INTO srm.supplier_evaluations (id, tenant_id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, tenant_id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_id)
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
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(evaluation) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(evaluation, "供应商评估创建成功"))
        }
        Err(e) => {
            tracing::error!("创建供应商评估失败: {}", e);
            Json(ApiResponse::<SupplierEvaluation>::error(
                500,
                "供应商评估创建失败",
            ))
        }
    }
}

pub async fn get_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM srm.supplier_evaluations WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
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

pub async fn update_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let existing = sqlx::query_as::<_, SupplierEvaluation>(
        only_own_schema_query!("srm", "SELECT id, tenant_id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at FROM srm.supplier_evaluations WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)", "srm"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
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

    let supplier_id = if let Some(supplier_id_str) = &req.supplier_id {
        let supplier_uuid_val = match Uuid::parse_str(supplier_id_str) {
            Ok(uuid) => uuid,
            Err(_) => {
                return Json(ApiResponse::<SupplierEvaluation>::error(
                    400,
                    "供应商ID格式错误",
                ));
            }
        };

        let supplier_exists = sqlx::query_scalar::<_, i64>(
            only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.suppliers WHERE ($1::uuid IS NULL OR tenant_id = $1) AND id = $2 AND status != 'deleted'", "srm"),
        )
        .bind(tenant_opt)
        .bind(supplier_uuid_val)
        .fetch_one(&mut **txn)
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

    let validate_score = |score: Option<f64>, name: &str| -> Result<(), String> {
        if let Some(s) = score {
            if !(0.0..=100.0).contains(&s) {
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
        only_own_schema_query!("srm", r#"
        UPDATE srm.supplier_evaluations SET
            supplier_id = $2, evaluation_no = $3, evaluator = $4, overall_score = $5, quality_score = $6, delivery_score = $7, service_score = $8, price_score = $9, comments = $10, status = $11, updated_at = $12
        WHERE id = $1 AND tenant_id = $13
        RETURNING id, tenant_id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        "#, "srm"),
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
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(evaluation) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(evaluation, "供应商评估更新成功"))
        }
        Err(e) => {
            tracing::error!("更新供应商评估失败: {}", e);
            Json(ApiResponse::<SupplierEvaluation>::error(
                500,
                "供应商评估更新失败",
            ))
        }
    }
}

pub async fn delete_evaluation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let result = sqlx::query(only_own_schema_query!(
        "srm",
        "UPDATE srm.supplier_evaluations SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        "srm"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut **txn)
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

pub async fn get_evaluation_history(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<SupplierEvaluation>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let supplier_exists = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "srm",
        "SELECT COUNT(*) FROM srm.suppliers WHERE ($1::uuid IS NULL OR tenant_id = $1) AND id = $2",
        "srm"
    ))
    .bind(tenant_opt)
    .bind(id)
    .fetch_one(&mut **txn)
    .await;

    if supplier_exists.unwrap_or(0) == 0 {
        return Json(ApiResponse::<Vec<SupplierEvaluation>>::error(
            404,
            "供应商不存在",
        ));
    }

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, supplier_id, evaluation_no, evaluation_date, evaluator, overall_score, quality_score, delivery_score, service_score, price_score, comments, status, created_by, created_at, updated_at
        FROM srm.supplier_evaluations
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND supplier_id = $2
        ORDER BY evaluation_date DESC
        "#, "srm"),
    )
    .bind(tenant_opt)
    .bind(id)
    .fetch_all(&mut **txn)
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

pub async fn get_performance_summary(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let result = sqlx::query_as::<_, EvaluationSummaryRow>(only_own_schema_query!(
        "srm",
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
        FROM srm.supplier_evaluations
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND supplier_id = $2 AND status = 'completed'
        "#,
        "srm"
    ))
    .bind(tenant_opt)
    .bind(id)
    .fetch_optional(&mut **txn)
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
        Ok(None) => Json(ApiResponse::success(
            serde_json::json!({
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
            }),
            "获取供应商绩效汇总成功",
        )),
        Err(e) => {
            tracing::error!("获取供应商绩效汇总失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取供应商绩效汇总失败",
            ))
        }
    }
}

pub async fn get_score_trend(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Query(params): Query<EvaluationQueryParams>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

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

    let result = sqlx::query_as::<_, EvaluationScoreTrendRow>(only_own_schema_query!(
        "srm",
        r#"
        SELECT 
            evaluation_date,
            overall_score,
            quality_score,
            delivery_score,
            service_score,
            price_score,
            evaluation_no
        FROM srm.supplier_evaluations
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND supplier_id = $2
          AND status = 'completed'
          AND ($3::timestamptz IS NULL OR evaluation_date >= $3)
          AND ($4::timestamptz IS NULL OR evaluation_date <= $4)
        ORDER BY evaluation_date ASC
        "#,
        "srm"
    ))
    .bind(tenant_opt)
    .bind(id)
    .bind(start_date)
    .bind(end_date)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            let trend_data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "evaluation_date": r.evaluation_date,
                        "evaluation_no": r.evaluation_no,
                        "overall_score": r.overall_score.map(|v| (v * 100.0).round() / 100.0),
                        "quality_score": r.quality_score.map(|v| (v * 100.0).round() / 100.0),
                        "delivery_score": r.delivery_score.map(|v| (v * 100.0).round() / 100.0),
                        "service_score": r.service_score.map(|v| (v * 100.0).round() / 100.0),
                        "price_score": r.price_score.map(|v| (v * 100.0).round() / 100.0),
                    })
                })
                .collect();

            let summary = if !trend_data.is_empty() {
                let first_score = trend_data
                    .first()
                    .and_then(|d| d.get("overall_score").and_then(|s| s.as_f64()));
                let last_score = trend_data
                    .last()
                    .and_then(|d| d.get("overall_score").and_then(|s| s.as_f64()));
                let change = match (first_score, last_score) {
                    (Some(f), Some(l)) => Some((l - f).round() / 100.0 * 100.0),
                    _ => None,
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

            Json(ApiResponse::success(
                serde_json::json!({
                    "supplier_id": id,
                    "trend_data": trend_data,
                    "summary": summary
                }),
                "获取供应商评分趋势成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商评分趋势失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取供应商评分趋势失败",
            ))
        }
    }
}

pub async fn get_evaluation_statistics(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let total_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "srm",
        "SELECT COUNT(*) FROM srm.supplier_evaluations WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)",
        "srm"
    ))
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await;

    let completed_result = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.supplier_evaluations WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = 'completed'", "srm"),
    )
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await;

    let pending_result = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.supplier_evaluations WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = 'pending'", "srm"),
    )
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await;

    let avg_score_result = sqlx::query_scalar::<_, f64>(
        only_own_schema_query!("srm", "SELECT AVG(overall_score) FROM srm.supplier_evaluations WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = 'completed' AND overall_score IS NOT NULL", "srm")
    )
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await;

    let supplier_count_result = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(DISTINCT supplier_id) FROM srm.supplier_evaluations WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)", "srm"),
    )
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
    .await;

    let total = total_result.unwrap_or(0);
    let completed = completed_result.unwrap_or(0);
    let pending = pending_result.unwrap_or(0);
    let supplier_count = supplier_count_result.unwrap_or(0);
    let avg_score = avg_score_result.ok().map(|v| (v * 100.0).round() / 100.0);
    let statistics = serde_json::json!({
        "total_evaluations": total,
        "completed_evaluations": completed,
        "pending_evaluations": pending,
        "avg_overall_score": avg_score,
        "evaluated_supplier_count": supplier_count,
        "completion_rate": if total > 0 {
            ((completed as f64 / total as f64) * 100.0).round() / 100.0
        } else {
            0.0
        }
    });

    Json(ApiResponse::success(statistics, "获取评估统计成功"))
}

use chrono::NaiveDate;

pub fn calculate_evaluation_total(
    quality: Option<f64>,
    delivery: Option<f64>,
    price: Option<f64>,
    service: Option<f64>,
    compliance: Option<f64>,
) -> f64 {
    let weights = [
        ("quality", 40.0_f64, quality),
        ("delivery", 25.0_f64, delivery),
        ("price", 15.0_f64, price),
        ("service", 10.0_f64, service),
        ("compliance", 10.0_f64, compliance),
    ];

    let mut total = 0.0_f64;
    for (_, weight, score) in weights.iter() {
        let s = score.unwrap_or(0.0_f64);
        total += s * weight / 100.0_f64;
    }

    total.clamp(0.0_f64, 100.0_f64)
}

pub fn supplier_performance_grade(score: f64) -> &'static str {
    match score {
        s if s >= 90.0_f64 => "A",
        s if s >= 80.0_f64 => "B",
        s if s >= 70.0_f64 => "C",
        s if s >= 60.0_f64 => "D",
        _ => "E",
    }
}

pub fn evaluate_kpi_pass_rate(passed: i64, total: i64) -> f64 {
    if total <= 0 {
        return 0.0_f64;
    }
    let rate = passed as f64 / total as f64 * 100.0_f64;
    rate.clamp(0.0_f64, 100.0_f64)
}

pub fn is_evaluation_overdue(last_eval: NaiveDate, today: NaiveDate, cycle_days: i64) -> bool {
    let diff = (today - last_eval).num_days();
    diff > cycle_days
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_evaluation_total_all_present() {
        let result = calculate_evaluation_total(
            Some(90.0_f64),
            Some(80.0_f64),
            Some(70.0_f64),
            Some(85.0_f64),
            Some(95.0_f64),
        );
        assert!(
            (result - 84.5_f64).abs() < 0.01_f64,
            "全部分数齐全时加权总分计算错误"
        );
    }

    #[test]
    fn test_calculate_evaluation_total_some_missing() {
        let result = calculate_evaluation_total(
            Some(100.0_f64),
            None,
            Some(100.0_f64),
            None,
            Some(100.0_f64),
        );
        assert!((result - 65.0_f64).abs() < 0.01_f64, "缺失项按0分计算错误");
    }

    #[test]
    fn test_calculate_evaluation_total_all_missing() {
        let result = calculate_evaluation_total(None, None, None, None, None);
        assert_eq!(result, 0.0_f64, "全部缺失时总分应为0");
    }

    #[test]
    fn test_calculate_evaluation_total_clamp_overflow() {
        let result = calculate_evaluation_total(
            Some(200.0_f64),
            Some(200.0_f64),
            Some(200.0_f64),
            Some(200.0_f64),
            Some(200.0_f64),
        );
        assert_eq!(result, 100.0_f64, "总分超过100时应clamp到100");
    }

    #[test]
    fn test_supplier_performance_grade_a() {
        assert_eq!(supplier_performance_grade(95.0_f64), "A", "95分应为A级");
        assert_eq!(supplier_performance_grade(90.0_f64), "A", "90分应为A级");
    }

    #[test]
    fn test_supplier_performance_grade_b_c_d() {
        assert_eq!(supplier_performance_grade(85.0_f64), "B", "85分应为B级");
        assert_eq!(supplier_performance_grade(75.0_f64), "C", "75分应为C级");
        assert_eq!(supplier_performance_grade(65.0_f64), "D", "65分应为D级");
    }

    #[test]
    fn test_supplier_performance_grade_e() {
        assert_eq!(supplier_performance_grade(59.0_f64), "E", "59分应为E级");
        assert_eq!(supplier_performance_grade(0.0_f64), "E", "0分应为E级");
    }

    #[test]
    fn test_evaluate_kpi_pass_rate_normal() {
        let rate = evaluate_kpi_pass_rate(8, 10);
        assert!((rate - 80.0_f64).abs() < 0.01_f64, "KPI通过率计算错误");
    }

    #[test]
    fn test_evaluate_kpi_pass_rate_zero_total() {
        let rate = evaluate_kpi_pass_rate(0, 0);
        assert_eq!(rate, 0.0_f64, "总数为0时通过率应为0");
    }

    #[test]
    fn test_is_evaluation_overdue_true() {
        let last = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2025, 4, 10).unwrap();
        assert!(
            is_evaluation_overdue(last, today, 90),
            "超过考核周期应判定为逾期"
        );
    }

    #[test]
    fn test_is_evaluation_overdue_false() {
        let last = NaiveDate::from_ymd_opt(2025, 4, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2025, 4, 30).unwrap();
        assert!(
            !is_evaluation_overdue(last, today, 90),
            "未超过周期不应判定逾期"
        );
    }

    #[test]
    fn test_evaluate_kpi_pass_rate_all_passed() {
        let rate = evaluate_kpi_pass_rate(100, 100);
        assert_eq!(rate, 100.0_f64, "全部通过时通过率应为100");
    }

    #[test]
    fn test_evaluate_kpi_pass_rate_clamp_overflow() {
        let rate = evaluate_kpi_pass_rate(150, 100);
        assert_eq!(rate, 100.0_f64, "通过率超过100时应clamp");
    }

    #[test]
    fn test_is_evaluation_overdue_exact_boundary() {
        let last = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2025, 4, 1).unwrap();
        assert!(
            !is_evaluation_overdue(last, today, 90),
            "刚好等于周期天数不应判定逾期"
        );
    }

    #[test]
    fn test_supplier_performance_grade_boundary() {
        assert_eq!(
            supplier_performance_grade(89.999_f64),
            "B",
            "89.999分应为B级"
        );
        assert_eq!(
            supplier_performance_grade(79.999_f64),
            "C",
            "79.999分应为C级"
        );
        assert_eq!(supplier_performance_grade(60.0_f64), "D", "刚好60分应为D级");
    }
}
