use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::supplier_evaluation_status::SupplierEvaluationStatus;
use super::ApiState;
use crate::models::supplier_evaluation::{
    CreateSupplierEvaluationRequest, SupplierEvaluation, UpdateSupplierEvaluationRequest,
};
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, require_tenant_bind, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

#[derive(Debug, Deserialize)]
pub struct SupplierEvaluationQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub supplier_id: Option<Uuid>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/evaluations",
            get(list_evaluations).post(create_evaluation),
        )
        .route(
            "/evaluations/{id}",
            get(get_evaluation)
                .put(update_evaluation)
                .delete(delete_evaluation),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:evaluation:read"])),
    path = "/evaluations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/evaluation"
)]
pub async fn list_evaluations(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SupplierEvaluationQueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierEvaluationRead,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let status_filter = match params.status.as_deref() {
        None | Some("") | Some("all") => None,
        Some(raw) => match SupplierEvaluationStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str()),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的供应商评价状态".to_string(),
                ))
            }
        },
    };

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        only_own_schema_query!("scm", r#"
        SELECT id, supplier_id, evaluation_date, quality_score::float8, delivery_score::float8, service_score::float8, price_score::float8, overall_score::float8, comments, evaluator, status, created_at, updated_at
        FROM scm.supplier_evaluations
        WHERE ($1::uuid IS NULL OR supplier_id = $1)
          AND ($2::text IS NULL OR status = $2)
          AND tenant_id = $5::uuid
        ORDER BY evaluation_date DESC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(params.supplier_id)
    .bind(status_filter)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(evaluations) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "scm",
                r#"
                SELECT COUNT(*) FROM scm.supplier_evaluations
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR supplier_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND tenant_id = $3::uuid
                "#
            ))
            .bind(params.supplier_id)
            .bind(status_filter)
            .bind(tenant_bind)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "evaluations": evaluations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取供应商评估列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取供应商评估列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取供应商评估列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/scm/evaluations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn create_evaluation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateSupplierEvaluationRequest>,
) -> ApiResponse<SupplierEvaluation> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierEvaluationWrite,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let request_data = serde_json::to_value(&req).ok();
    let status = match req.status.as_deref() {
        None | Some("") => SupplierEvaluationStatus::DEFAULT.as_db_str(),
        Some(raw) => match SupplierEvaluationStatus::from_db_str(raw) {
            Some(status) => status.as_db_str(),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的供应商评价状态".to_string(),
                ))
            }
        },
    };
    let id = Uuid::new_v4();
    let evaluation_no = format!("EVAL-{}", &id.simple().to_string()[..12]);
    let now = Utc::now();

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        only_own_schema_query!("scm", r#"
        INSERT INTO scm.supplier_evaluations (id, evaluation_no, supplier_id, evaluation_date, quality_score, delivery_score, service_score, price_score, overall_score, comments, evaluator, status, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5::numeric, $6::numeric, $7::numeric, $8::numeric, $9::numeric, $10, $11, $12, $13, $14, $15)
        RETURNING id, supplier_id, evaluation_date, quality_score::float8, delivery_score::float8, service_score::float8, price_score::float8, overall_score::float8, comments, evaluator, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&evaluation_no)
    .bind(req.supplier_id)
    .bind(req.evaluation_date)
    .bind(req.quality_score)
    .bind(req.delivery_score)
    .bind(req.service_score)
    .bind(req.price_score)
    .bind(req.overall_score)
    .bind(&req.comments)
    .bind(&req.evaluator)
    .bind(status)
    .bind(now)
    .bind(now)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(evaluation) => (
            ApiResponse::success(evaluation.clone(), "供应商评估创建成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建供应商评估失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("供应商评估创建失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(evaluation) = &result {
        serde_json::to_value(evaluation).ok()
    } else {
        None
    };

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("rls commit failed: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
        }
    }

    log_audit_event(
        &state.system_pool,
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
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:evaluation:read"])),
    path = "/evaluations/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/evaluation"
)]
pub async fn get_evaluation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<SupplierEvaluation> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierEvaluationRead,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let result = sqlx::query_as::<_, SupplierEvaluation>(
        only_own_schema_query!("scm", r#"
        SELECT id, supplier_id, evaluation_date, quality_score::float8, delivery_score::float8, service_score::float8, price_score::float8, overall_score::float8, comments, evaluator, status, created_at, updated_at
        FROM scm.supplier_evaluations WHERE id = $1 AND tenant_id = $2::uuid
        "#),
    )
    .bind(id)
    .bind(tenant_bind)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(evaluation)) => ApiResponse::success(evaluation, "获取供应商评估成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound(
            "供应商评估不存在".to_string(),
        )),
        Err(e) => {
            tracing::error!("获取供应商评估失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取供应商评估失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/scm/evaluations/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn update_evaluation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateSupplierEvaluationRequest>,
) -> ApiResponse<SupplierEvaluation> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierEvaluationWrite,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, SupplierEvaluation>(
        only_own_schema_query!("scm", "SELECT id, supplier_id, evaluation_date, quality_score::float8, delivery_score::float8, service_score::float8, price_score::float8, overall_score::float8, comments, evaluator, status, created_at, updated_at FROM scm.supplier_evaluations WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2::uuid"),
    )
    .bind(id)
    .bind(tenant_bind)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound(
                "供应商评估不存在".to_string(),
            ))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询供应商评估失败", e)),
    };

    let quality_score = req.quality_score.or(existing.quality_score);
    let delivery_score = req.delivery_score.or(existing.delivery_score);
    let service_score = req.service_score.or(existing.service_score);
    let price_score = req.price_score.or(existing.price_score);
    let overall_score = req.overall_score.or(existing.overall_score);
    let comments = req.comments.or(existing.comments);
    let evaluator = req.evaluator.or(existing.evaluator);
    let status = match req.status.as_deref() {
        None | Some("") => None,
        Some(raw) => match SupplierEvaluationStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str()),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的供应商评价状态".to_string(),
                ))
            }
        },
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, SupplierEvaluation>(
        only_own_schema_query!("scm", r#"
        UPDATE scm.supplier_evaluations SET
            quality_score = $2::numeric, delivery_score = $3::numeric, service_score = $4::numeric, price_score = $5::numeric, overall_score = $6::numeric, comments = $7, evaluator = $8, status = COALESCE($11, status), updated_at = $9
        WHERE id = $1 AND tenant_id = $10::uuid
        RETURNING id, supplier_id, evaluation_date, quality_score::float8, delivery_score::float8, service_score::float8, price_score::float8, overall_score::float8, comments, evaluator, status, created_at, updated_at
        "#),
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
    .bind(tenant_bind)
    .bind(status)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(evaluation) => (
            ApiResponse::success(evaluation.clone(), "供应商评估更新成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新供应商评估失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("供应商评估更新失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(evaluation) = &result {
        serde_json::to_value(evaluation).ok()
    } else {
        None
    };

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("rls commit failed: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
        }
    }

    log_audit_event(
        &state.system_pool,
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
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/scm/evaluations/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn delete_evaluation(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierEvaluationWrite,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let result = sqlx::query(only_own_schema_query!(
        "scm",
        "UPDATE scm.supplier_evaluations SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2::uuid"
    ))
    .bind(id)
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            ApiResponse::success("".to_string(), "供应商评估删除成功"),
            "success",
            None,
        ),
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound(
                "供应商评估不存在".to_string(),
            )),
            "error",
            Some("供应商评估不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除供应商评估失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("供应商评估删除失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("rls commit failed: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
        }
    }

    log_audit_event(
        &state.system_pool,
        "delete".to_string(),
        "supplier_evaluation".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn supplier_evaluation_query_params_defaults_via_serde() {
        let q: SupplierEvaluationQueryParams =
            serde_json::from_str("{}").expect("deserialize empty");
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.supplier_id.is_none());
    }

    #[test]
    fn supplier_evaluation_query_params_roundtrip_preserves_fields() {
        let supplier_id = Uuid::new_v4();
        let json = serde_json::json!({
            "page": 2,
            "page_size": 50,
            "supplier_id": supplier_id,
        });
        let q: SupplierEvaluationQueryParams = serde_json::from_value(json).expect("deserialize");
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(50));
        assert_eq!(q.supplier_id, Some(supplier_id));
    }

    #[test]
    fn supplier_evaluation_query_params_ignores_unknown_fields() {
        let json = r#"{"page": 1, "extra": "ignored"}"#;
        let q: SupplierEvaluationQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.page, Some(1));
    }

    #[test]
    fn supplier_evaluation_query_params_partial_population() {
        let json = r#"{"page_size": 25}"#;
        let q: SupplierEvaluationQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.page_size, Some(25));
        assert!(q.page.is_none());
        assert!(q.supplier_id.is_none());
    }

    #[test]
    fn create_routes_returns_router_without_panic() {
        let _router = create_routes();
    }
}
