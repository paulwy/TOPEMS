use axum::{
    extract::FromRef,
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::middleware::tenant::get_tenant_id;
use crate::modules::ApiState;
use crate::shared::fsm::{schedule_can_transition, schedule_requires_approval};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};
use utoipa::ToSchema;

/// 审批请求体
#[derive(Debug, Deserialize)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Schedule {
    pub id: Uuid,
    pub schedule_no: String,
    pub plan_id: Option<Uuid>,
    pub work_order_id: Option<Uuid>,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub work_center_id: Option<Uuid>,
    pub work_center_name: Option<String>,
    pub planned_start: Option<NaiveDateTime>,
    pub planned_end: Option<NaiveDateTime>,
    pub actual_start: Option<NaiveDateTime>,
    pub actual_end: Option<NaiveDateTime>,
    pub quantity: Option<sqlx::types::BigDecimal>,
    pub priority: Option<i32>,
    pub status: String,
    pub tenant_id: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateScheduleRequest {
    pub schedule_no: String,
    pub plan_id: Option<Uuid>,
    pub work_order_id: Option<Uuid>,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub work_center_id: Option<Uuid>,
    pub work_center_name: Option<String>,
    pub planned_start: Option<NaiveDateTime>,
    pub planned_end: Option<NaiveDateTime>,
    pub quantity: Option<f64>,
    #[serde(default)]
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateScheduleRequest {
    pub product_name: Option<String>,
    pub work_center_id: Option<Uuid>,
    pub work_center_name: Option<String>,
    pub planned_start: Option<NaiveDateTime>,
    pub planned_end: Option<NaiveDateTime>,
    pub quantity: Option<f64>,
    pub priority: Option<i32>,
    pub status: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/schedules", get(list_schedules).post(create_schedule))
        .route(
            "/schedules/{id}",
            get(get_schedule)
                .put(update_schedule)
                .delete(delete_schedule),
        )
        .route("/schedules/{id}/start", post(start_schedule))
        .route("/schedules/{id}/complete", post(complete_schedule))
        .route("/schedules/{id}/cancel", post(cancel_schedule))
        .route("/schedules/{id}/submit", post(submit_schedule))
        .route("/schedules/{id}/release", post(release_schedule))
        .route("/schedules/{id}/hold", post(hold_schedule))
}

#[utoipa::path(
    get,
    path = "/api/aps/schedules",
    responses(
        (status = 200, description = "list_schedules OK")
    ),
    tag = "APS - Schedule"
)]
pub async fn list_schedules(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<PaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Schedule>(
        r#"
        SELECT id, schedule_no, plan_id, work_order_id, product_id, product_name,
               work_center_id, work_center_name, planned_start, planned_end,
               actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_schedules
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR schedule_no ILIKE $2 OR product_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(schedules) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_aps.aps_schedules
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR schedule_no ILIKE $2 OR product_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let response_data = serde_json::json!({
                "schedules": schedules,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            Json(ApiResponse::success(response_data, "获取排程列表成功"))
        }
        Err(e) => {
            tracing::error!("获取排程列表失败: {}", e);
            Json(api_error(500, "获取排程列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/aps/schedules/{id}",
    params(
        ("id" = Uuid, Path, description = "排程 ID")
    ),
    responses(
        (status = 200, description = "get_schedule OK")
    ),
    tag = "APS - Schedule"
)]
pub async fn get_schedule(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Schedule>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Schedule>(
        r#"
        SELECT id, schedule_no, plan_id, work_order_id, product_id, product_name,
               work_center_id, work_center_name, planned_start, planned_end,
               actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_schedules
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(schedule)) => Json(ApiResponse::success(schedule, "获取排程成功")),
        Ok(None) => Json(api_error(404, "排程不存在")),
        Err(e) => {
            tracing::error!("获取排程失败: {}", e);
            Json(api_error(500, "获取排程失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/aps/schedules",
    request_body = CreateScheduleRequest,
    responses(
        (status = 200, description = "create_schedule OK")
    ),
    tag = "APS - Schedule"
)]
pub async fn create_schedule(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<CreateScheduleRequest>,
) -> Json<ApiResponse<Schedule>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);
    let priority = req.priority.unwrap_or(0);
    let quantity: Option<sqlx::types::BigDecimal> = req
        .quantity
        .and_then(|v| sqlx::types::BigDecimal::try_from(v).ok());

    let result = sqlx::query_as::<_, Schedule>(
        r#"
        INSERT INTO plugin_aps.aps_schedules
            (id, schedule_no, plan_id, work_order_id, product_id, product_name,
             work_center_id, work_center_name, planned_start, planned_end,
             actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, $11, $12, 'pending', $13, $14, $15)
        RETURNING id, schedule_no, plan_id, work_order_id, product_id, product_name,
                  work_center_id, work_center_name, planned_start, planned_end,
                  actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.schedule_no)
    .bind(req.plan_id)
    .bind(req.work_order_id)
    .bind(req.product_id)
    .bind(&req.product_name)
    .bind(req.work_center_id)
    .bind(&req.work_center_name)
    .bind(req.planned_start)
    .bind(req.planned_end)
    .bind(&quantity)
    .bind(priority)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(schedule) => Json(ApiResponse::success(schedule, "排程创建成功")),
        Err(e) => {
            tracing::error!("创建排程失败: {}", e);
            Json(api_error(500, "创建排程失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/aps/schedules/{id}",
    request_body = UpdateScheduleRequest,
    params(
        ("id" = Uuid, Path, description = "排程 ID")
    ),
    responses(
        (status = 200, description = "update_schedule OK")
    ),
    tag = "APS - Schedule"
)]
pub async fn update_schedule(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<UpdateScheduleRequest>,
) -> Json<ApiResponse<Schedule>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Schedule>(
        r#"
        SELECT id, schedule_no, plan_id, work_order_id, product_id, product_name,
               work_center_id, work_center_name, planned_start, planned_end,
               actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_schedules
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "排程不存在")),
        Err(e) => return Json(api_error(500, &format!("查询排程失败: {}", e))),
    };

    let product_name = req.product_name.or(existing.product_name);
    let work_center_id = req.work_center_id.or(existing.work_center_id);
    let work_center_name = req.work_center_name.or(existing.work_center_name);
    let planned_start = req.planned_start.or(existing.planned_start);
    let planned_end = req.planned_end.or(existing.planned_end);
    let priority = req.priority.or(existing.priority);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let quantity: Option<sqlx::types::BigDecimal> = match req.quantity {
        Some(v) => sqlx::types::BigDecimal::try_from(v).ok(),
        None => existing.quantity,
    };

    let result = sqlx::query_as::<_, Schedule>(
        r#"
        UPDATE plugin_aps.aps_schedules SET
            product_name = $2, work_center_id = $3, work_center_name = $4,
            planned_start = $5, planned_end = $6, quantity = $7, priority = $8,
            status = $9, updated_at = $10
        WHERE id = $1 AND tenant_id = $11
        RETURNING id, schedule_no, plan_id, work_order_id, product_id, product_name,
                  work_center_id, work_center_name, planned_start, planned_end,
                  actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&product_name)
    .bind(work_center_id)
    .bind(&work_center_name)
    .bind(planned_start)
    .bind(planned_end)
    .bind(&quantity)
    .bind(priority)
    .bind(&status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(schedule) => Json(ApiResponse::success(schedule, "排程更新成功")),
        Err(e) => {
            tracing::error!("更新排程失败: {}", e);
            Json(api_error(500, "更新排程失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/aps/schedules/{id}",
    params(
        ("id" = Uuid, Path, description = "排程 ID")
    ),
    responses(
        (status = 200, description = "delete_schedule OK")
    ),
    tag = "APS - Schedule"
)]
pub async fn delete_schedule(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("DELETE FROM plugin_aps.aps_schedules WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.db)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "排程删除成功"))
        }
        Ok(_) => Json(api_error(404, "排程不存在")),
        Err(e) => {
            tracing::error!("删除排程失败: {}", e);
            Json(api_error(500, "删除排程失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/aps/schedules/{id}/start",
    params(
        ("id" = Uuid, Path, description = "排程 ID")
    ),
    responses(
        (status = 200, description = "start_schedule OK")
    ),
    tag = "APS - Schedule"
)]
pub async fn start_schedule(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Schedule>> {
    update_schedule_status(
        &state.db,
        id,
        &claims,
        &headers,
        "running",
        Some(("actual_start", Utc::now().naive_utc())),
    )
    .await
}

#[utoipa::path(
    post,
    path = "/api/aps/schedules/{id}/complete",
    params(
        ("id" = Uuid, Path, description = "排程 ID")
    ),
    responses(
        (status = 200, description = "complete_schedule OK")
    ),
    tag = "APS - Schedule"
)]
pub async fn complete_schedule(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Schedule>> {
    update_schedule_status(
        &state.db,
        id,
        &claims,
        &headers,
        "completed",
        Some(("actual_end", Utc::now().naive_utc())),
    )
    .await
}

#[utoipa::path(
    post,
    path = "/api/aps/schedules/{id}/cancel",
    params(
        ("id" = Uuid, Path, description = "排程 ID")
    ),
    responses(
        (status = 200, description = "cancel_schedule OK")
    ),
    tag = "APS - Schedule"
)]
pub async fn cancel_schedule(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Schedule>> {
    update_schedule_status(&state.db, id, &claims, &headers, "cancelled", None).await
}

/// 通用状态流转：校验旧状态 + 写入新状态（含可选时间戳列）
async fn update_schedule_status(
    db: &sqlx::PgPool,
    id: Uuid,
    claims: &Claims,
    headers: &HeaderMap,
    new_status: &str,
    timestamp: Option<(&str, chrono::NaiveDateTime)>,
) -> Json<ApiResponse<Schedule>> {
    let tenant_id = get_tenant_id(claims, headers);

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM plugin_aps.aps_schedules WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await;

    let current_status = match current {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "排程不存在")),
        Err(e) => return Json(api_error(500, &format!("查询排程失败: {}", e))),
    };

    if !is_status_transition_valid(&current_status, new_status) {
        return Json(api_error(
            400,
            &format!(
                "非法状态流转: {} → {}（排程当前状态: {}）",
                current_status, new_status, current_status
            ),
        ));
    }

    let now = Utc::now();
    let result = if let Some((ts_col, ts_val)) = timestamp {
        let sql = format!(
            r#"
            UPDATE plugin_aps.aps_schedules SET status = $2, {} = $3, updated_at = $4
            WHERE id = $1 AND tenant_id = $5
            RETURNING id, schedule_no, plan_id, work_order_id, product_id, product_name,
                      work_center_id, work_center_name, planned_start, planned_end,
                      actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at
            "#,
            ts_col
        );
        sqlx::query_as::<_, Schedule>(&sql)
            .bind(id)
            .bind(new_status)
            .bind(ts_val)
            .bind(now)
            .bind(tenant_id)
            .fetch_one(db)
            .await
    } else {
        sqlx::query_as::<_, Schedule>(
            r#"
            UPDATE plugin_aps.aps_schedules SET status = $2, updated_at = $3
            WHERE id = $1 AND tenant_id = $4
            RETURNING id, schedule_no, plan_id, work_order_id, product_id, product_name,
                      work_center_id, work_center_name, planned_start, planned_end,
                      actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(new_status)
        .bind(now)
        .bind(tenant_id)
        .fetch_one(db)
        .await
    };

    match result {
        Ok(schedule) => Json(ApiResponse::success(schedule, "排程状态更新成功")),
        Err(e) => {
            tracing::error!("更新排程状态失败: {}", e);
            Json(api_error(500, "更新排程状态失败"))
        }
    }
}

/// 排程状态机：pending → released → running → completed / cancelled
fn is_status_transition_valid(from: &str, to: &str) -> bool {
    matches!(
        (from, to),
        ("pending", "released")
            | ("pending", "running")
            | ("released", "running")
            | ("released", "pending")
            | ("running", "completed")
            | ("pending", "cancelled")
            | ("released", "cancelled")
            | ("running", "cancelled")
    )
}

/// APV-2: 提交发布 (no state change, just flag for release)
pub async fn submit_schedule(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<ApprovalRequest>,
) -> Json<ApiResponse<Schedule>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Schedule>(
        r#"
        SELECT id, schedule_no, plan_id, work_order_id, product_id, product_name,
               work_center_id, work_center_name, planned_start, planned_end,
               actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_schedules
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(schedule)) => {
            tracing::info!(
                "排程 {} 提交发布申请 (操作人: {}, 备注: {:?})",
                id,
                req.operator,
                req.comment
            );
            Json(ApiResponse::success(schedule, "排程已提交发布申请"))
        }
        Ok(None) => Json(api_error(404, "排程不存在")),
        Err(e) => {
            tracing::error!("查询排程失败: {}", e);
            Json(api_error(500, "查询排程失败"))
        }
    }
}

/// APV-2: 发布排程 (pending → released, approve release)
pub async fn release_schedule(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<ApprovalRequest>,
) -> Json<ApiResponse<Schedule>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let target_status = "released";

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM plugin_aps.aps_schedules WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let current_status = match current {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "排程不存在")),
        Err(e) => return Json(api_error(500, &format!("查询排程失败: {}", e))),
    };

    if !schedule_requires_approval(&current_status, target_status) {
        return Json(api_error(400, "当前状态不需要审批发布"));
    }
    if let Err(e) = schedule_can_transition(&current_status, target_status) {
        return Json(api_error(400, &format!("当前状态不允许发布: {}", e)));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, Schedule>(
        r#"
        UPDATE plugin_aps.aps_schedules SET status = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
        RETURNING id, schedule_no, plan_id, work_order_id, product_id, product_name,
                  work_center_id, work_center_name, planned_start, planned_end,
                  actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(target_status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(schedule) => {
            tracing::info!(
                "排程 {} 发布审批通过: {} -> {} (操作人: {}, 备注: {:?})",
                id,
                current_status,
                target_status,
                req.operator,
                req.comment
            );
            Json(ApiResponse::success(schedule, "排程已发布"))
        }
        Err(e) => {
            tracing::error!("发布排程失败: {}", e);
            Json(api_error(500, "发布排程失败"))
        }
    }
}

/// APV-2: 暂停排程 (released → pending, hold)
pub async fn hold_schedule(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<ApprovalRequest>,
) -> Json<ApiResponse<Schedule>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let target_status = "pending";

    let current = sqlx::query_scalar::<_, String>(
        "SELECT status FROM plugin_aps.aps_schedules WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let current_status = match current {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "排程不存在")),
        Err(e) => return Json(api_error(500, &format!("查询排程失败: {}", e))),
    };

    if let Err(e) = schedule_can_transition(&current_status, target_status) {
        return Json(api_error(400, &format!("当前状态不允许暂停: {}", e)));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, Schedule>(
        r#"
        UPDATE plugin_aps.aps_schedules SET status = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
        RETURNING id, schedule_no, plan_id, work_order_id, product_id, product_name,
                  work_center_id, work_center_name, planned_start, planned_end,
                  actual_start, actual_end, quantity, priority, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(target_status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(schedule) => {
            tracing::info!(
                "排程 {} 已暂停: {} -> {} (操作人: {}, 备注: {:?})",
                id,
                current_status,
                target_status,
                req.operator,
                req.comment
            );
            Json(ApiResponse::success(schedule, "排程已暂停"))
        }
        Err(e) => {
            tracing::error!("暂停排程失败: {}", e);
            Json(api_error(500, "暂停排程失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schedule_state_machine() {
        // 合法正向流转
        assert!(is_status_transition_valid("pending", "released"));
        assert!(is_status_transition_valid("pending", "running"));
        assert!(is_status_transition_valid("released", "running"));
        assert!(is_status_transition_valid("running", "completed"));

        // 合法 hold 回流
        assert!(is_status_transition_valid("released", "pending"));

        // 合法取消
        assert!(is_status_transition_valid("pending", "cancelled"));
        assert!(is_status_transition_valid("released", "cancelled"));
        assert!(is_status_transition_valid("running", "cancelled"));

        // 非法流转
        assert!(!is_status_transition_valid("pending", "completed"));
        assert!(!is_status_transition_valid("completed", "running"));
        assert!(!is_status_transition_valid("cancelled", "running"));
        assert!(!is_status_transition_valid("completed", "cancelled"));
        assert!(!is_status_transition_valid("running", "pending"));
        assert!(!is_status_transition_valid("completed", "released"));
        assert!(!is_status_transition_valid("cancelled", "pending"));
    }

    #[test]
    fn create_schedule_request_roundtrip() {
        use serde::Serialize;
        use serde_json::Value;

        fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
            let json = serde_json::to_string(item).unwrap();
            let v1: Value = serde_json::from_str(&json).unwrap();
            let back: T = serde_json::from_str(&json).unwrap();
            let json2 = serde_json::to_string(&back).unwrap();
            let v2: Value = serde_json::from_str(&json2).unwrap();
            assert_eq!(v1, v2);
        }

        roundtrip(&CreateScheduleRequest {
            schedule_no: "SCH-001".into(),
            plan_id: Some(Uuid::new_v4()),
            work_order_id: Some(Uuid::new_v4()),
            product_id: Some(Uuid::new_v4()),
            product_name: Some("Product A".into()),
            work_center_id: Some(Uuid::new_v4()),
            work_center_name: Some("WC-01".into()),
            planned_start: Some(
                chrono::NaiveDate::from_ymd_opt(2024, 1, 1)
                    .unwrap()
                    .and_hms_opt(8, 0, 0)
                    .unwrap(),
            ),
            planned_end: Some(
                chrono::NaiveDate::from_ymd_opt(2024, 1, 1)
                    .unwrap()
                    .and_hms_opt(16, 0, 0)
                    .unwrap(),
            ),
            quantity: Some(500.0),
            priority: Some(5),
        });
    }

    #[test]
    fn update_schedule_request_roundtrip() {
        use serde::Serialize;
        use serde_json::Value;

        fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
            let json = serde_json::to_string(item).unwrap();
            let v1: Value = serde_json::from_str(&json).unwrap();
            let back: T = serde_json::from_str(&json).unwrap();
            let json2 = serde_json::to_string(&back).unwrap();
            let v2: Value = serde_json::from_str(&json2).unwrap();
            assert_eq!(v1, v2);
        }

        roundtrip(&UpdateScheduleRequest {
            product_name: Some("Updated Product".into()),
            work_center_id: Some(Uuid::new_v4()),
            work_center_name: Some("WC-02".into()),
            planned_start: None,
            planned_end: None,
            quantity: Some(100.0),
            priority: Some(1),
            status: Some("released".into()),
        });
    }
}
