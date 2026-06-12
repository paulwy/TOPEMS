use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use crate::api::audit::log_audit_event;
use topems_shared::{api_error, ApiResponse};

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

#[derive(Debug, Clone, Deserialize)]
pub struct QueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
    pub review_period: Option<String>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/v1/performance-reviews",
            get(list_reviews).post(create_review),
        )
        .route(
            "/api/v1/performance-reviews/{id}",
            get(get_review).put(update_review).delete(delete_review),
        )
        .route(
            "/api/v1/performance-reviews/{id}/submit",
            put(submit_review),
        )
        .route(
            "/api/v1/performance-reviews/{id}/approve",
            put(approve_review),
        )
        .route(
            "/api/v1/performance-goals",
            get(list_goals).post(create_goal),
        )
        .route(
            "/api/v1/performance-goals/{id}",
            get(get_goal).put(update_goal).delete(delete_goal),
        )
        .route(
            "/api/v1/employees/{id}/performance-reviews",
            get(get_employee_reviews),
        )
        .route(
            "/api/v1/employees/{id}/performance-goals",
            get(get_employee_goals),
        )
}

async fn list_reviews(
    State(state): State<ApiState>,
    Query(params): Query<QueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let emp_id = params.employee_id;
    let review_period = params.review_period.clone();
    let status_filter = params.status;

    let result = sqlx::query_as::<_, PerformanceReview>(
        r#"
        SELECT id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at
        FROM hrm.performance_reviews
        WHERE ($1::uuid IS NULL OR employee_id = $1)
          AND ($2::text IS NULL OR $2 = '' OR review_period ILIKE '%' || $2 || '%')
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(emp_id)
    .bind(&review_period)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM hrm.performance_reviews
                WHERE ($1::uuid IS NULL OR employee_id = $1)
                  AND ($2::text IS NULL OR $2 = '' OR review_period ILIKE '%' || $2 || '%')
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(emp_id)
            .bind(&review_period)
            .bind(&status_filter)
            .fetch_one(&state.db)
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

async fn create_review(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreatePerformanceReviewRequest>,
) -> Json<ApiResponse<PerformanceReview>> {
    if req.employee_id.is_nil() {
        return Json(api_error(400, "员工ID不能为空"));
    }

    if req.review_period.is_empty() {
        return Json(api_error(400, "评核周期不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, PerformanceReview>(
        r#"
        INSERT INTO hrm.performance_reviews (id, employee_id, review_period, reviewer_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'draft', $5, $6)
        RETURNING id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(req.employee_id)
    .bind(&req.review_period)
    .bind(req.reviewer_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
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

async fn get_review(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PerformanceReview>> {
    let result = sqlx::query_as::<_, PerformanceReview>(
        "SELECT id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at FROM hrm.performance_reviews WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
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

async fn update_review(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePerformanceReviewRequest>,
) -> Json<ApiResponse<PerformanceReview>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, PerformanceReview>(
        r#"
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
        "#
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
    .fetch_optional(&state.db)
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

async fn delete_review(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result =
        sqlx::query("DELETE FROM hrm.performance_reviews WHERE id = $1 AND status = 'draft'")
            .bind(id)
            .execute(&state.db)
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

async fn submit_review(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PerformanceReview>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, PerformanceReview>(
        r#"
        UPDATE hrm.performance_reviews
        SET status = 'submitted', updated_at = $2
        WHERE id = $1 AND status = 'draft'
        RETURNING id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
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

async fn approve_review(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PerformanceReview>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, PerformanceReview>(
        r#"
        UPDATE hrm.performance_reviews
        SET status = 'approved', updated_at = $2
        WHERE id = $1 AND status = 'submitted'
        RETURNING id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
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

async fn list_goals(
    State(state): State<ApiState>,
    Query(params): Query<QueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let emp_id = params.employee_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, PerformanceGoal>(
        r#"
        SELECT id, employee_id, title, description, target, weight, achieved, status, due_date, created_at, updated_at
        FROM hrm.performance_goals
        WHERE ($1::uuid IS NULL OR employee_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(emp_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM hrm.performance_goals
                WHERE ($1::uuid IS NULL OR employee_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(emp_id)
            .bind(&status_filter)
            .fetch_one(&state.db)
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

async fn create_goal(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreatePerformanceGoalRequest>,
) -> Json<ApiResponse<PerformanceGoal>> {
    if req.employee_id.is_nil() {
        return Json(api_error(400, "员工ID不能为空"));
    }

    if req.title.is_empty() {
        return Json(api_error(400, "目标标题不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, PerformanceGoal>(
        r#"
        INSERT INTO hrm.performance_goals (id, employee_id, title, description, target, weight, status, due_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
        RETURNING id, employee_id, title, description, target, weight, achieved, status, due_date, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(req.employee_id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.target)
    .bind(&req.weight)
    .bind(req.due_date)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
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

async fn get_goal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PerformanceGoal>> {
    let result = sqlx::query_as::<_, PerformanceGoal>(
        "SELECT id, employee_id, title, description, target, weight, achieved, status, due_date, created_at, updated_at FROM hrm.performance_goals WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
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

async fn update_goal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePerformanceGoalRequest>,
) -> Json<ApiResponse<PerformanceGoal>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, PerformanceGoal>(
        r#"
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
        "#
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
    .fetch_optional(&state.db)
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

async fn delete_goal(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM hrm.performance_goals WHERE id = $1")
        .bind(id)
        .execute(&state.db)
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

async fn get_employee_reviews(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, PerformanceReview>(
        "SELECT id, employee_id, review_period, reviewer_id, status, overall_rating, self_rating, manager_rating, final_rating, comments, created_at, updated_at FROM hrm.performance_reviews WHERE employee_id = $1 ORDER BY created_at DESC"
    )
    .bind(id)
    .fetch_all(&state.db)
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

async fn get_employee_goals(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, PerformanceGoal>(
        "SELECT id, employee_id, title, description, target, weight, achieved, status, due_date, created_at, updated_at FROM hrm.performance_goals WHERE employee_id = $1 ORDER BY created_at DESC"
    )
    .bind(id)
    .fetch_all(&state.db)
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
