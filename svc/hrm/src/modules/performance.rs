use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::log_audit_event;
use topems_shared::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PerformanceReview {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub review_period: String,
    pub reviewer_id: Option<Uuid>,
    pub status: String,
    pub overall_rating: Option<BigDecimal>,
    pub self_rating: Option<BigDecimal>,
    pub manager_rating: Option<BigDecimal>,
    pub final_rating: Option<BigDecimal>,
    pub comments: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PerformanceGoal {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub target: Option<String>,
    pub weight: BigDecimal,
    pub achieved: Option<BigDecimal>,
    pub status: String,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePerformanceReviewRequest {
    pub employee_id: Uuid,
    pub review_period: String,
    pub reviewer_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePerformanceReviewRequest {
    pub reviewer_id: Option<Uuid>,
    pub status: Option<String>,
    pub overall_rating: Option<BigDecimal>,
    pub self_rating: Option<BigDecimal>,
    pub manager_rating: Option<BigDecimal>,
    pub final_rating: Option<BigDecimal>,
    pub comments: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePerformanceGoalRequest {
    pub employee_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub target: Option<String>,
    pub weight: BigDecimal,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePerformanceGoalRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub target: Option<String>,
    pub weight: Option<BigDecimal>,
    pub achieved: Option<BigDecimal>,
    pub status: Option<String>,
    pub due_date: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Deserialize, utoipa::ToSchema)]
pub struct QueryParams {
    pub page: Option<i64>,
    #[serde(alias = "page_size")]
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
    pub review_period: Option<String>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/performance-reviews",
            get(list_reviews).post(create_review),
        )
        .route(
            "/performance-reviews/{id}",
            get(get_review).put(update_review).delete(delete_review),
        )
        .route("/performance-reviews/{id}/submit", put(submit_review))
        .route("/performance-reviews/{id}/approve", put(approve_review))
        .route("/performance-goals", get(list_goals).post(create_goal))
        .route(
            "/performance-goals/{id}",
            get(get_goal).put(update_goal).delete(delete_goal),
        )
        .route(
            "/employees/{id}/performance-reviews",
            get(get_employee_reviews),
        )
        .route("/employees/{id}/performance-goals", get(get_employee_goals))
}

#[utoipa::path(
    get,
    path = "/performance-reviews",
    tag = "performance",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页大小"),
        ("employee_id" = Option<Uuid>, Query, description = "员工ID"),
        ("review_period" = Option<String>, Query, description = "评核周期"),
        ("status" = Option<String>, Query, description = "状态")
    ),
    responses(
        (status = 200, description = "获取绩效评核列表成功", body = serde_json::Value),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn list_reviews(
    State(_state): State<ApiState>,
    Query(params): Query<QueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let emp_id = params.employee_id;
    let review_period = params.review_period.clone();
    let status_filter = params.status;

    let result = sqlx::query_as::<_, PerformanceReview>(
        only_own_schema_query!("hrm", r#"
        SELECT id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at
        FROM hrm.performance_reviews
        WHERE ($1::uuid IS NULL OR employee_id = $1)
          AND ($2::text IS NULL OR $2 = '' OR review_period ILIKE '%' || $2 || '%')
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#),
    )
    .bind(emp_id)
    .bind(&review_period)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.performance_reviews
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR employee_id = $1)
                  AND ($2::text IS NULL OR $2 = '' OR review_period ILIKE '%' || $2 || '%')
                  AND ($3::text IS NULL OR status = $3)
                "#
            ))
            .bind(emp_id)
            .bind(&review_period)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询绩效评核列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询绩效评核列表失败",
            ))
        }
    }
}

pub async fn create_review(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreatePerformanceReviewRequest>,
) -> Json<ApiResponse<PerformanceReview>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.employee_id.is_nil() {
        return Json(api_error(400, "员工ID不能为空"));
    }

    if req.review_period.is_empty() {
        return Json(api_error(400, "评核周期不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let result = sqlx::query_as::<_, PerformanceReview>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.performance_reviews (id, tenant_id, employee_id, review_period, reviewer_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7)
        RETURNING id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(claims_tenant)
    .bind(req.employee_id)
    .bind(&req.review_period)
    .bind(req.reviewer_id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(review) => (
            Json(ApiResponse::success(review.clone(), "绩效评核创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建绩效评核失败: {}", e);
            (
                Json(api_error(500, "创建绩效评核失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(review) = &result {
        serde_json::to_value(review).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "performance_review".to_string(),
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
    get,
    security(("bearerAuth" = [])),
    path = "/performance-reviews/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "performance"
)]
pub async fn get_review(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PerformanceReview>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, PerformanceReview>(
        only_own_schema_query!("hrm", "SELECT id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at FROM hrm.performance_reviews WHERE deleted_at IS NULL AND id = $1")
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(review)) => Json(ApiResponse::success(review, "查询成功")),
        Ok(None) => Json(ApiResponse::<PerformanceReview>::error(
            404,
            "绩效评核不存在",
        )),
        Err(e) => {
            tracing::error!("查询绩效评核失败: {}", e);
            Json(ApiResponse::<PerformanceReview>::error(
                500,
                "查询绩效评核失败",
            ))
        }
    }
}

pub async fn update_review(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdatePerformanceReviewRequest>,
) -> Json<ApiResponse<PerformanceReview>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, PerformanceReview>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.performance_reviews
        SET
            reviewer_id = COALESCE($1, reviewer_id),
            status = COALESCE($2, status),
            overall_rating = COALESCE($3, overall_rating),
            self_rating = COALESCE($4, self_rating),
            manager_rating = COALESCE($5, manager_rating),
            final_rating = COALESCE($6, final_rating),
            comments = COALESCE($7, comments),
            updated_at = $8
        WHERE id = $9
        RETURNING id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at
        "#)
    )
    .bind(req.reviewer_id)
    .bind(&req.status)
    .bind(&req.overall_rating)
    .bind(&req.self_rating)
    .bind(&req.manager_rating)
    .bind(&req.final_rating)
    .bind(&req.comments)
    .bind(now)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(review)) => Json(ApiResponse::success(review, "绩效评核更新成功")),
        Ok(None) => Json(ApiResponse::<PerformanceReview>::error(
            404,
            "绩效评核不存在",
        )),
        Err(e) => {
            tracing::error!("更新绩效评核失败: {}", e);
            Json(ApiResponse::<PerformanceReview>::error(
                500,
                "更新绩效评核失败",
            ))
        }
    }
}

pub async fn delete_review(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.performance_reviews SET deleted_at = NOW() WHERE id = $1 AND status = 'draft'"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success(id.to_string(), "绩效评核已删除")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "绩效评核不存在或状态不正确")),
            "error".to_string(),
            Some("绩效评核不存在或状态不正确".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除绩效评核失败: {}", e);
            (
                Json(api_error(500, "删除绩效评核失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "performance_review".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    put,
    security(("bearerAuth" = [])),
    path = "/performance-reviews/{id}/submit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "performance"
)]
pub async fn submit_review(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PerformanceReview>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, PerformanceReview>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.performance_reviews
        SET status = 'submitted', updated_at = $2
        WHERE id = $1 AND status = 'draft'
        RETURNING id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(review)) => Json(ApiResponse::success(review, "绩效评核已提交")),
        Ok(None) => Json(ApiResponse::<PerformanceReview>::error(
            404,
            "绩效评核不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("提交绩效评核失败: {}", e);
            Json(ApiResponse::<PerformanceReview>::error(
                500,
                "提交绩效评核失败",
            ))
        }
    }
}

#[utoipa::path(
    put,
    security(("bearerAuth" = [])),
    path = "/performance-reviews/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "performance"
)]
pub async fn approve_review(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PerformanceReview>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, PerformanceReview>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.performance_reviews
        SET status = 'approved', updated_at = $2
        WHERE id = $1 AND status = 'submitted'
        RETURNING id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(review)) => Json(ApiResponse::success(review, "绩效评核已批准")),
        Ok(None) => Json(ApiResponse::<PerformanceReview>::error(
            404,
            "绩效评核不存在或状态不正确",
        )),
        Err(e) => {
            tracing::error!("批准绩效评核失败: {}", e);
            Json(ApiResponse::<PerformanceReview>::error(
                500,
                "批准绩效评核失败",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/performance-goals",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "performance"
)]
pub async fn list_goals(
    State(_state): State<ApiState>,
    Query(params): Query<QueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let emp_id = params.employee_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, PerformanceGoal>(
        only_own_schema_query!("hrm", r#"
        SELECT id, employee_id, title, description, target, weight, achieved, status, due_date, created_at, updated_at
        FROM hrm.performance_goals
        WHERE ($1::uuid IS NULL OR employee_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(emp_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.performance_goals
                WHERE ($1::uuid IS NULL OR employee_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#
            ))
            .bind(emp_id)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询绩效目标列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询绩效目标列表失败",
            ))
        }
    }
}

pub async fn create_goal(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreatePerformanceGoalRequest>,
) -> Json<ApiResponse<PerformanceGoal>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.employee_id.is_nil() {
        return Json(api_error(400, "员工ID不能为空"));
    }

    if req.title.is_empty() {
        return Json(api_error(400, "目标标题不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let claims_tenant = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let result = sqlx::query_as::<_, PerformanceGoal>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.performance_goals (id, tenant_id, employee_id, title, description, target, weight, status, due_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
        RETURNING id, employee_id, title, description, target, weight, achieved, status, due_date, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(claims_tenant)
    .bind(req.employee_id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.target)
    .bind(&req.weight)
    .bind(req.due_date)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(goal) => (
            Json(ApiResponse::success(goal.clone(), "绩效目标创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建绩效目标失败: {}", e);
            (
                Json(api_error(500, "创建绩效目标失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(goal) = &result {
        serde_json::to_value(goal).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "performance_goal".to_string(),
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
    get,
    security(("bearerAuth" = [])),
    path = "/performance-goals/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "performance"
)]
pub async fn get_goal(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PerformanceGoal>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, PerformanceGoal>(
        only_own_schema_query!("hrm", "SELECT id, employee_id, title, description, target, weight, achieved, status, due_date, created_at, updated_at FROM hrm.performance_goals WHERE id = $1")
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(goal)) => Json(ApiResponse::success(goal, "查询成功")),
        Ok(None) => Json(ApiResponse::<PerformanceGoal>::error(404, "绩效目标不存在")),
        Err(e) => {
            tracing::error!("查询绩效目标失败: {}", e);
            Json(ApiResponse::<PerformanceGoal>::error(
                500,
                "查询绩效目标失败",
            ))
        }
    }
}

pub async fn update_goal(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdatePerformanceGoalRequest>,
) -> Json<ApiResponse<PerformanceGoal>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, PerformanceGoal>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.performance_goals
        SET
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            target = COALESCE($3, target),
            weight = COALESCE($4, weight),
            achieved = COALESCE($5, achieved),
            status = COALESCE($6, status),
            due_date = COALESCE($7, due_date),
            updated_at = $8
        WHERE id = $9
        RETURNING id, employee_id, title, description, target, weight, achieved, status, due_date, created_at, updated_at
        "#)
    )
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.target)
    .bind(&req.weight)
    .bind(&req.achieved)
    .bind(&req.status)
    .bind(req.due_date)
    .bind(now)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(goal)) => Json(ApiResponse::success(goal, "绩效目标更新成功")),
        Ok(None) => Json(ApiResponse::<PerformanceGoal>::error(404, "绩效目标不存在")),
        Err(e) => {
            tracing::error!("更新绩效目标失败: {}", e);
            Json(ApiResponse::<PerformanceGoal>::error(
                500,
                "更新绩效目标失败",
            ))
        }
    }
}

pub async fn delete_goal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.performance_goals SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success(id.to_string(), "绩效目标已删除")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "绩效目标不存在")),
            "error".to_string(),
            Some("绩效目标不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除绩效目标失败: {}", e);
            (
                Json(api_error(500, "删除绩效目标失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "performance_goal".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/employees/{id}/performance-reviews",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "performance"
)]
pub async fn get_employee_reviews(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, PerformanceReview>(
        only_own_schema_query!("hrm", "SELECT id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at FROM hrm.performance_reviews WHERE deleted_at IS NULL AND employee_id = $1 ORDER BY created_at DESC")
    )
    .bind(id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": items.len() as i64
            }),
            "查询成功",
        )),
        Err(e) => {
            tracing::error!("查询员工绩效评核失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询员工绩效评核失败",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/employees/{id}/performance-goals",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "performance"
)]
pub async fn get_employee_goals(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, PerformanceGoal>(
        only_own_schema_query!("hrm", "SELECT id, employee_id, title, description, target, weight, achieved, status, due_date, created_at, updated_at FROM hrm.performance_goals WHERE employee_id = $1 ORDER BY created_at DESC")
    )
    .bind(id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": items.len() as i64
            }),
            "查询成功",
        )),
        Err(e) => {
            tracing::error!("查询员工绩效目标失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询员工绩效目标失败",
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;

    fn now() -> chrono::DateTime<chrono::Utc> {
        Utc::now()
    }

    fn dec(n: i64) -> BigDecimal {
        BigDecimal::from(n)
    }

    fn roundtrip<T: Serialize + DeserializeOwned + std::fmt::Debug>(item: &T) {
        let json = serde_json::to_string(item).expect("serialize");
        let v1: serde_json::Value = serde_json::from_str(&json).expect("to_value");
        let back: T = serde_json::from_str(&json).expect("deserialize");
        let json2 = serde_json::to_string(&back).expect("re-serialize");
        let v2: serde_json::Value = serde_json::from_str(&json2).expect("to_value2");
        assert_eq!(v1, v2, "roundtrip mismatch");
    }

    #[test]
    fn test_performance_review_roundtrip_full() {
        roundtrip(&PerformanceReview {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            review_period: "2024-Q1".to_string(),
            reviewer_id: Some(Uuid::new_v4()),
            status: "draft".to_string(),
            overall_rating: Some(dec(85)),
            self_rating: Some(dec(80)),
            manager_rating: Some(dec(90)),
            final_rating: Some(dec(85)),
            comments: Some("Good performance".to_string()),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_performance_review_roundtrip_minimal() {
        roundtrip(&PerformanceReview {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            review_period: "2024-H1".to_string(),
            reviewer_id: None,
            status: "submitted".to_string(),
            overall_rating: None,
            self_rating: None,
            manager_rating: None,
            final_rating: None,
            comments: None,
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_performance_goal_roundtrip_full() {
        roundtrip(&PerformanceGoal {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            title: "Increase sales by 20%".to_string(),
            description: Some("Q1 sales target".to_string()),
            target: Some("120% of Q4".to_string()),
            weight: dec(50),
            achieved: Some(dec(110)),
            status: "in_progress".to_string(),
            due_date: Some(now()),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_performance_goal_roundtrip_minimal() {
        roundtrip(&PerformanceGoal {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            title: "Complete training".to_string(),
            description: None,
            target: None,
            weight: dec(100),
            achieved: None,
            status: "pending".to_string(),
            due_date: None,
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_create_performance_review_request_roundtrip() {
        roundtrip(&CreatePerformanceReviewRequest {
            employee_id: Uuid::new_v4(),
            review_period: "2024-Q2".to_string(),
            reviewer_id: Some(Uuid::new_v4()),
        });
        roundtrip(&CreatePerformanceReviewRequest {
            employee_id: Uuid::new_v4(),
            review_period: "2024-Q2".to_string(),
            reviewer_id: None,
        });
    }

    #[test]
    fn test_update_performance_review_request_roundtrip_all_none() {
        roundtrip(&UpdatePerformanceReviewRequest {
            reviewer_id: None,
            status: None,
            overall_rating: None,
            self_rating: None,
            manager_rating: None,
            final_rating: None,
            comments: None,
        });
    }

    #[test]
    fn test_update_performance_review_request_roundtrip_all_some() {
        roundtrip(&UpdatePerformanceReviewRequest {
            reviewer_id: Some(Uuid::new_v4()),
            status: Some("approved".to_string()),
            overall_rating: Some(dec(95)),
            self_rating: Some(dec(90)),
            manager_rating: Some(dec(95)),
            final_rating: Some(dec(92)),
            comments: Some("Excellent work".to_string()),
        });
    }

    #[test]
    fn test_create_performance_goal_request_roundtrip() {
        roundtrip(&CreatePerformanceGoalRequest {
            employee_id: Uuid::new_v4(),
            title: "Improve code quality".to_string(),
            description: Some("Reduce bug count".to_string()),
            target: Some("50% fewer bugs".to_string()),
            weight: dec(30),
            due_date: Some(now()),
        });
        roundtrip(&CreatePerformanceGoalRequest {
            employee_id: Uuid::new_v4(),
            title: "New goal".to_string(),
            description: None,
            target: None,
            weight: dec(70),
            due_date: None,
        });
    }

    #[test]
    fn test_update_performance_goal_request_roundtrip_all_none() {
        roundtrip(&UpdatePerformanceGoalRequest {
            title: None,
            description: None,
            target: None,
            weight: None,
            achieved: None,
            status: None,
            due_date: None,
        });
    }

    #[test]
    fn test_update_performance_goal_request_roundtrip_all_some() {
        roundtrip(&UpdatePerformanceGoalRequest {
            title: Some("Updated goal".to_string()),
            description: Some("Updated desc".to_string()),
            target: Some("New target".to_string()),
            weight: Some(dec(40)),
            achieved: Some(dec(35)),
            status: Some("completed".to_string()),
            due_date: Some(now()),
        });
    }

    #[test]
    fn test_query_params_deserialize_all_none() {
        let json = r#"{}"#;
        let params: QueryParams = serde_json::from_str(json).expect("deserialize");
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.employee_id.is_none());
        assert!(params.review_period.is_none());
        assert!(params.status.is_none());
    }

    #[test]
    fn test_query_params_deserialize_all_some() {
        let emp = Uuid::new_v4();
        let json = format!(
            r#"{{"page":1,"page_size":20,"employee_id":"{}","review_period":"2024-Q1","status":"draft"}}"#,
            emp
        );
        let params: QueryParams = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
        assert_eq!(params.employee_id, Some(emp));
        assert_eq!(params.review_period.as_deref(), Some("2024-Q1"));
        assert_eq!(params.status.as_deref(), Some("draft"));
    }

    #[test]
    fn test_create_routes_returns_router() {
        // Verify create_routes compiles and returns a Router without panic
        let _router = create_routes();
    }
}
