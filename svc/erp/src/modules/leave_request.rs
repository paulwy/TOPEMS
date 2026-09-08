use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::{NaiveDate, Utc};
use serde::Deserialize;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    ApproveLeaveRequestRequest, CreateLeaveRequestRequest, LeaveRequest, RejectLeaveRequestRequest,
    UpdateLeaveRequestRequest,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::utils::validate_required_field;
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

// ============ 纯函数 ============

/// 判断指定日期是否为工作日
///
/// 综合考虑周末、法定节假日和调休补班日（委托 `holidays` 模块）：
/// - 周末：仅调休补班日算工作日
/// - 工作日：排除法定节假日
fn is_workday(date: NaiveDate) -> bool {
    super::holidays::is_workday(date)
}

/// 计算请假天数（支持半天粒度，排除周末和法定节假日，含调休补班）
///
/// # 参数
/// - `start_date`: 开始日期
/// - `end_date`: 结束日期
/// - `start_half_day`: 开始日期是否仅占半天
/// - `end_half_day`: 结束日期是否仅占半天
///
/// # 返回
/// 请假天数（如 0.5、1.0、2.5 等）
///
/// 法定节假日与调休补班日由 `holidays` 模块提供，采用「DB L1 动态层 + 2025-2026 L2 静态层」
/// 两级回退策略（详见 holidays.rs 模块文档）。纯函数版本调用静态层，
/// HTTP handler 中可使用 `holidays::DatabaseBackedHolidayProvider` 接入动态配置。
pub fn calculate_leave_days(
    start_date: NaiveDate,
    end_date: NaiveDate,
    start_half_day: bool,
    end_half_day: bool,
) -> f64 {
    // 起始日期晚于结束日期，返回 0
    if start_date > end_date {
        return 0.0;
    }

    // 遍历日期范围，统计工作日
    let mut total = 0.0_f64;
    let mut current = start_date;
    while current <= end_date {
        if is_workday(current) {
            total += 1.0;
        }
        // 安全地推进到下一天
        current = match current.succ_opt() {
            Some(next) => next,
            None => break,
        }
    }

    // 半天调整
    if start_date == end_date {
        // 同一天：任一标记为半天则计 0.5 天
        if (start_half_day || end_half_day) && is_workday(start_date) {
            total = 0.5;
        }
    } else {
        // 跨天：仅当边界日为工作日时扣减 0.5
        if start_half_day && is_workday(start_date) {
            total -= 0.5;
        }
        if end_half_day && is_workday(end_date) {
            total -= 0.5;
        }
    }

    total.max(0.0)
}

/// 校验年假额度是否充足
///
/// # 参数
/// - `used_days`: 已使用的年假天数
/// - `total_quota`: 年假总额度
/// - `request_days`: 本次申请天数
///
/// # 返回
/// (是否充足, 剩余天数)
///
/// 负数输入会被钳制为 0，防止异常数据导致逻辑错误
pub fn check_annual_leave_balance(
    used_days: f64,
    total_quota: f64,
    request_days: f64,
) -> (bool, f64) {
    // 负数防护：将所有负输入钳制为 0
    let used = used_days.max(0.0);
    let quota = total_quota.max(0.0);
    let request = request_days.max(0.0);

    let remaining = (quota - used).max(0.0);
    let is_sufficient = remaining >= request;
    (is_sufficient, remaining)
}

// ============ 查询参数 ============

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct LeaveRequestQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub leave_type: Option<String>,
    pub employee_id: Option<Uuid>,
}

// ============ 表初始化 ============

/// 确保 leave_requests 表存在（幂等操作）
/// 表结构在 handler 中用 CREATE TABLE IF NOT EXISTS 创建，不依赖迁移文件
async fn ensure_table(state: &ApiState) {
    sqlx::query(only_own_schema_query!(
        "erp",
        r#"
        CREATE TABLE IF NOT EXISTS leave_requests (
            id              UUID PRIMARY KEY,
            employee_id     UUID NOT NULL,
            employee_name   VARCHAR(128) NOT NULL,
            leave_type      VARCHAR(32) NOT NULL,
            start_date      DATE NOT NULL,
            end_date        DATE NOT NULL,
            start_half_day  BOOLEAN NOT NULL DEFAULT FALSE,
            end_half_day    BOOLEAN NOT NULL DEFAULT FALSE,
            days            DOUBLE PRECISION NOT NULL,
            reason          TEXT NOT NULL,
            status          VARCHAR(16) NOT NULL DEFAULT 'draft',
            approved_by     VARCHAR(128),
            approved_at     TIMESTAMPTZ,
            rejected_reason TEXT,
            tenant_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP
        )
        "#
    ))
    .execute(&state.db)
    .await
    .map(|_| ())
    .unwrap_or_else(|e| tracing::warn!("创建 leave_requests 表失败（可能已存在）: {}", e));
}

/// 从 Claims 提取 tenant_id
fn tenant_id_from_claims(claims: &Claims) -> &str {
    claims
        .tenant_id
        .as_deref()
        .unwrap_or("00000000-0000-0000-0000-000000000000")
}

// ============ 路由 ============

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/leave-requests",
            get(list_leave_requests).post(create_leave_request),
        )
        .route(
            "/leave-requests/{id}",
            get(get_leave_request)
                .put(update_leave_request)
                .delete(delete_leave_request),
        )
        .route("/leave-requests/{id}/submit", post(submit_leave_request))
        .route("/leave-requests/{id}/approve", post(approve_leave_request))
        .route("/leave-requests/{id}/reject", post(reject_leave_request))
        .route("/leave-requests/{id}/cancel", post(cancel_leave_request))
}

// ============ Handler ============

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:hr:read"])),
    path = "/erp/leave-request/list-leave-requests",
    tag = "LeaveRequest",
    operation_id = "list_leave_requests",
    params(LeaveRequestQueryParams),
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_leave_requests(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LeaveRequestQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<LeaveRequest>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    ensure_table(&state).await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let type_filter = params.leave_type.clone();
    let employee_filter = params.employee_id;
    let tenant = tenant_id_from_claims(&claims);

    let result = sqlx::query_as::<_, LeaveRequest>(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, employee_id, employee_name, leave_type, start_date, end_date,
               start_half_day, end_half_day, days, reason, status,
               approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        FROM erp.leave_requests
        WHERE ($1::text IS NULL OR employee_name ILIKE $1 OR reason ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR leave_type = $3)
          AND ($4::uuid IS NULL OR employee_id = $4)
          AND tenant_id = $5
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&type_filter)
    .bind(employee_filter)
    .bind(tenant)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(requests) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("erp", r#"
                SELECT COUNT(*) FROM erp.leave_requests
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR employee_name ILIKE $1 OR reason ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR leave_type = $3)
                  AND ($4::uuid IS NULL OR employee_id = $4)
                  AND tenant_id = $5
                "#),
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&type_filter)
            .bind(employee_filter)
            .bind(tenant)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(requests, total, page, page_size),
                "获取请假列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取请假列表失败: {}", e);
            Json(api_error(500, "获取请假列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:hr:write"])),
    path = "/leave-requests",
    tag = "ERP",
    operation_id = "create_leave_request",
    responses((status = 200, description = "OK")),
)]
pub async fn create_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateLeaveRequestRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    ensure_table(&state).await;

    if let Err(e) = validate_required_field("申请人姓名", &req.employee_name) {
        return Json(api_error(400, &e));
    }
    if let Err(e) = validate_required_field("请假原因", &req.reason) {
        return Json(api_error(400, &e));
    }
    if req.start_date > req.end_date {
        return Json(api_error(400, "开始日期不能晚于结束日期"));
    }

    // 计算请假天数
    let days = calculate_leave_days(
        req.start_date,
        req.end_date,
        req.start_half_day,
        req.end_half_day,
    );

    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant = tenant_id_from_claims(&claims).to_string();

    let result = sqlx::query_as::<_, LeaveRequest>(only_own_schema_query!(
        "erp",
        r#"
        INSERT INTO erp.leave_requests
            (id, employee_id, employee_name, leave_type, start_date, end_date,
             start_half_day, end_half_day, days, reason, status, tenant_id, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11, $12, $13)
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(req.employee_id)
    .bind(&req.employee_name)
    .bind(&req.leave_type)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.start_half_day)
    .bind(req.end_half_day)
    .bind(days)
    .bind(&req.reason)
    .bind(&tenant)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(leave) => (
            Json(ApiResponse::success(leave.clone(), "请假申请创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建请假申请失败: {}", e);
            (
                Json(api_error(500, "创建请假申请失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(leave) = &result {
        serde_json::to_value(leave).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "leave_request".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:hr:read"])),
    path = "/leave-requests/{id}",
    tag = "ERP",
    operation_id = "get_leave_request",
    responses((status = 200, description = "OK")),
)]
pub async fn get_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    ensure_table(&state).await;

    let tenant = tenant_id_from_claims(&claims);

    let result = sqlx::query_as::<_, LeaveRequest>(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, employee_id, employee_name, leave_type, start_date, end_date,
               start_half_day, end_half_day, days, reason, status,
               approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        FROM erp.leave_requests
        WHERE id = $1 AND tenant_id = $2
        "#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(leave)) => Json(ApiResponse::success(leave, "获取请假申请成功")),
        Ok(None) => Json(api_error(404, "请假申请不存在")),
        Err(e) => {
            tracing::error!("获取请假申请失败: {}", e);
            Json(api_error(500, "获取请假申请失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:hr:write"])),
    path = "/leave-requests/{id}",
    tag = "ERP",
    operation_id = "update_leave_request",
    responses((status = 200, description = "OK")),
)]
pub async fn update_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateLeaveRequestRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    ensure_table(&state).await;

    let tenant = tenant_id_from_claims(&claims);

    let existing = sqlx::query_as::<_, LeaveRequest>(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, employee_id, employee_name, leave_type, start_date, end_date,
               start_half_day, end_half_day, days, reason, status,
               approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        FROM erp.leave_requests
        WHERE id = $1 AND tenant_id = $2
        "#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(l)) => l,
        Ok(None) => return Json(api_error(404, "请假申请不存在")),
        Err(e) => return Json(api_error(500, &format!("查询请假申请失败: {}", e))),
    };

    // 仅草稿状态可编辑
    if existing.status != "draft" {
        return Json(api_error(400, "仅草稿状态的请假申请可编辑"));
    }

    let request_data = serde_json::to_value(&req).ok();

    let leave_type = req.leave_type.unwrap_or(existing.leave_type);
    let start_date = req.start_date.unwrap_or(existing.start_date);
    let end_date = req.end_date.unwrap_or(existing.end_date);
    let start_half_day = req.start_half_day.unwrap_or(existing.start_half_day);
    let end_half_day = req.end_half_day.unwrap_or(existing.end_half_day);
    let reason = req.reason.unwrap_or(existing.reason);

    if start_date > end_date {
        return Json(api_error(400, "开始日期不能晚于结束日期"));
    }

    // 重新计算天数
    let days = calculate_leave_days(start_date, end_date, start_half_day, end_half_day);
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(only_own_schema_query!(
        "erp",
        r#"
        UPDATE erp.leave_requests SET
            leave_type = $2, start_date = $3, end_date = $4,
            start_half_day = $5, end_half_day = $6, days = $7, reason = $8,
            updated_at = $9
        WHERE id = $1
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(&leave_type)
    .bind(start_date)
    .bind(end_date)
    .bind(start_half_day)
    .bind(end_half_day)
    .bind(days)
    .bind(&reason)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(leave) => (
            Json(ApiResponse::success(leave.clone(), "请假申请更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新请假申请失败: {}", e);
            (
                Json(api_error(500, "请假申请更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let response_data = if let Ok(leave) = &result {
        serde_json::to_value(leave).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "leave_request".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:hr:write"])),
    path = "/leave-requests/{id}",
    tag = "ERP",
    operation_id = "delete_leave_request",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    ensure_table(&state).await;

    let tenant = tenant_id_from_claims(&claims);

    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.leave_requests SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "请假申请删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "请假申请不存在")),
            "error".to_string(),
            Some("请假申请不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除请假申请失败: {}", e);
            (
                Json(api_error(500, "请假申请删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "leave_request".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

/// 提交请假申请（draft → pending）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:hr:write"])),
    path = "/leave-requests/{id}/submit",
    tag = "ERP",
    operation_id = "submit_leave_request",
    responses((status = 200, description = "OK")),
)]
pub async fn submit_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    ensure_table(&state).await;

    let tenant = tenant_id_from_claims(&claims);
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(only_own_schema_query!(
        "erp",
        r#"
        UPDATE erp.leave_requests SET status = 'pending', updated_at = $2
        WHERE id = $1 AND tenant_id = $3 AND status = 'draft'
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(Some(leave)) => (
            Json(ApiResponse::success(leave.clone(), "请假申请已提交")),
            "success".to_string(),
            None,
        ),
        Ok(None) => (
            Json(api_error(400, "请假申请不是草稿状态，无法提交")),
            "error".to_string(),
            Some("请假申请不是草稿状态".to_string()),
        ),
        Err(e) => {
            tracing::error!("提交请假申请失败: {}", e);
            (
                Json(api_error(500, "提交请假申请失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let response_data = if let Ok(Some(leave)) = &result {
        serde_json::to_value(leave).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "submit".to_string(),
            entity_type: "leave_request".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

/// 审批通过（pending → approved）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:hr:write"])),
    path = "/leave-requests/{id}/approve",
    tag = "ERP",
    operation_id = "approve_leave_request",
    responses((status = 200, description = "OK")),
)]
pub async fn approve_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApproveLeaveRequestRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    ensure_table(&state).await;

    if let Err(e) = validate_required_field("审批人", &req.approved_by) {
        return Json(api_error(400, &e));
    }

    let tenant = tenant_id_from_claims(&claims);
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(only_own_schema_query!(
        "erp",
        r#"
        UPDATE erp.leave_requests SET
            status = 'approved', approved_by = $2, approved_at = $3,
            rejected_reason = NULL, updated_at = $4
        WHERE id = $1 AND tenant_id = $5 AND status = 'pending'
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(&req.approved_by)
    .bind(now)
    .bind(now)
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(Some(leave)) => (
            Json(ApiResponse::success(leave.clone(), "请假申请已批准")),
            "success".to_string(),
            None,
        ),
        Ok(None) => (
            Json(api_error(400, "请假申请不是待审批状态，无法批准")),
            "error".to_string(),
            Some("请假申请不是待审批状态".to_string()),
        ),
        Err(e) => {
            tracing::error!("批准请假申请失败: {}", e);
            (
                Json(api_error(500, "批准请假申请失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let response_data = if let Ok(Some(leave)) = &result {
        serde_json::to_value(leave).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "approve".to_string(),
            entity_type: "leave_request".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: serde_json::to_value(&req).ok(),
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

/// 驳回（pending → rejected）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:hr:write"])),
    path = "/leave-requests/{id}/reject",
    tag = "ERP",
    operation_id = "reject_leave_request",
    responses((status = 200, description = "OK")),
)]
pub async fn reject_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<RejectLeaveRequestRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    ensure_table(&state).await;

    if let Err(e) = validate_required_field("审批人", &req.approved_by) {
        return Json(api_error(400, &e));
    }
    if let Err(e) = validate_required_field("驳回原因", &req.rejected_reason) {
        return Json(api_error(400, &e));
    }

    let tenant = tenant_id_from_claims(&claims);
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(only_own_schema_query!(
        "erp",
        r#"
        UPDATE erp.leave_requests SET
            status = 'rejected', approved_by = $2, approved_at = $3,
            rejected_reason = $4, updated_at = $5
        WHERE id = $1 AND tenant_id = $6 AND status = 'pending'
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(&req.approved_by)
    .bind(now)
    .bind(&req.rejected_reason)
    .bind(now)
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(Some(leave)) => (
            Json(ApiResponse::success(leave.clone(), "请假申请已驳回")),
            "success".to_string(),
            None,
        ),
        Ok(None) => (
            Json(api_error(400, "请假申请不是待审批状态，无法驳回")),
            "error".to_string(),
            Some("请假申请不是待审批状态".to_string()),
        ),
        Err(e) => {
            tracing::error!("驳回请假申请失败: {}", e);
            (
                Json(api_error(500, "驳回请假申请失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let response_data = if let Ok(Some(leave)) = &result {
        serde_json::to_value(leave).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "reject".to_string(),
            entity_type: "leave_request".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: serde_json::to_value(&req).ok(),
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

/// 撤销（draft / pending → cancelled）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:hr:write"])),
    path = "/leave-requests/{id}/cancel",
    tag = "ERP",
    operation_id = "cancel_leave_request",
    responses((status = 200, description = "OK")),
)]
pub async fn cancel_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    ensure_table(&state).await;

    let tenant = tenant_id_from_claims(&claims);
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(only_own_schema_query!(
        "erp",
        r#"
        UPDATE erp.leave_requests SET status = 'cancelled', updated_at = $2
        WHERE id = $1 AND tenant_id = $3 AND status IN ('draft', 'pending')
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(Some(leave)) => (
            Json(ApiResponse::success(leave.clone(), "请假申请已撤销")),
            "success".to_string(),
            None,
        ),
        Ok(None) => (
            Json(api_error(
                400,
                "请假申请当前状态不可撤销（仅草稿或待审批可撤销）",
            )),
            "error".to_string(),
            Some("请假申请状态不可撤销".to_string()),
        ),
        Err(e) => {
            tracing::error!("撤销请假申请失败: {}", e);
            (
                Json(api_error(500, "撤销请假申请失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

    let response_data = if let Ok(Some(leave)) = &result {
        serde_json::to_value(leave).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "cancel".to_string(),
            entity_type: "leave_request".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

// ============ 单元测试 ============

#[cfg(test)]
mod tests {
    use super::*;

    // 日期基准：2024-01-01 是周一
    // 01/01 Mon, 01/02 Tue, 01/03 Wed, 01/04 Thu, 01/05 Fri
    // 01/06 Sat, 01/07 Sun, 01/08 Mon, 01/09 Tue, 01/12 Fri, 01/15 Mon, 01/19 Fri

    // ===== calculate_leave_days 测试 =====

    #[test]
    fn test_same_day_full_day() {
        // 同一天全天：周一请一天假
        let d = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(); // Monday
        assert_eq!(calculate_leave_days(d, d, false, false), 1.0);
    }

    #[test]
    fn test_same_day_both_half_day() {
        // 同一天半天：周一请半天假
        let d = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        assert_eq!(calculate_leave_days(d, d, true, true), 0.5);
    }

    #[test]
    fn test_same_day_start_half_only() {
        // 同一天仅 start_half_day
        let d = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        assert_eq!(calculate_leave_days(d, d, true, false), 0.5);
    }

    #[test]
    fn test_same_day_end_half_only() {
        // 同一天仅 end_half_day
        let d = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        assert_eq!(calculate_leave_days(d, d, false, true), 0.5);
    }

    #[test]
    fn test_multi_day_full() {
        // 跨天全天：周一到周三 = 3 天
        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(); // Mon
        let end = NaiveDate::from_ymd_opt(2024, 1, 3).unwrap(); // Wed
        assert_eq!(calculate_leave_days(start, end, false, false), 3.0);
    }

    #[test]
    fn test_multi_day_start_half() {
        // 跨天，开始日期半天：周一(半天) + 周二 + 周三 = 2.5
        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 3).unwrap();
        assert_eq!(calculate_leave_days(start, end, true, false), 2.5);
    }

    #[test]
    fn test_multi_day_end_half() {
        // 跨天，结束日期半天：周一 + 周二 + 周三(半天) = 2.5
        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 3).unwrap();
        assert_eq!(calculate_leave_days(start, end, false, true), 2.5);
    }

    #[test]
    fn test_multi_day_both_half() {
        // 跨天，两端半天：周一(半天) + 周二 + 周三(半天) = 2.0
        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 3).unwrap();
        assert_eq!(calculate_leave_days(start, end, true, true), 2.0);
    }

    #[test]
    fn test_cross_weekend() {
        // 跨周末：周五到下周二 = 周五 + 周一 + 周二 = 3 天
        let start = NaiveDate::from_ymd_opt(2024, 1, 5).unwrap(); // Friday
        let end = NaiveDate::from_ymd_opt(2024, 1, 9).unwrap(); // Tuesday
        assert_eq!(calculate_leave_days(start, end, false, false), 3.0);
    }

    #[test]
    fn test_weekend_only() {
        // 仅周末：周六到周日 = 0 天
        let start = NaiveDate::from_ymd_opt(2024, 1, 6).unwrap(); // Saturday
        let end = NaiveDate::from_ymd_opt(2024, 1, 7).unwrap(); // Sunday
        assert_eq!(calculate_leave_days(start, end, false, false), 0.0);
    }

    #[test]
    fn test_start_after_end() {
        // 起始日期晚于结束日期 = 0 天
        let start = NaiveDate::from_ymd_opt(2024, 1, 3).unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        assert_eq!(calculate_leave_days(start, end, false, false), 0.0);
    }

    #[test]
    fn test_cross_weekend_with_start_half() {
        // 跨周末 + 开始半天：周五(半天) + 周一 = 1.5
        let start = NaiveDate::from_ymd_opt(2024, 1, 5).unwrap(); // Friday
        let end = NaiveDate::from_ymd_opt(2024, 1, 8).unwrap(); // Monday
        assert_eq!(calculate_leave_days(start, end, true, false), 1.5);
    }

    #[test]
    fn test_half_day_on_weekend_boundary() {
        // 开始日是周末且标记半天：周六到周一，周六不算工作日不扣减 = 周一 1.0
        let start = NaiveDate::from_ymd_opt(2024, 1, 6).unwrap(); // Saturday
        let end = NaiveDate::from_ymd_opt(2024, 1, 8).unwrap(); // Monday
        assert_eq!(calculate_leave_days(start, end, true, false), 1.0);
    }

    #[test]
    fn test_two_week_full() {
        // 两周全天：周一到下下周五 = 10 个工作日
        let start = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(); // Monday
        let end = NaiveDate::from_ymd_opt(2024, 1, 12).unwrap(); // Friday (next week)
        assert_eq!(calculate_leave_days(start, end, false, false), 10.0);
    }

    // ===== 法定节假日 / 调休补班 测试（基于 2025 年硬编码数据）=====

    #[test]
    fn test_holiday_excluded() {
        // 2024-12-30(周一) ~ 2025-01-03(周五)：1月1日元旦为法定假日
        // 工作日 = 周一 + 周二 + 周四 + 周五 = 4 天（周三元旦被排除）
        let start = NaiveDate::from_ymd_opt(2024, 12, 30).unwrap(); // Monday
        let end = NaiveDate::from_ymd_opt(2025, 1, 3).unwrap(); // Friday
        assert_eq!(calculate_leave_days(start, end, false, false), 4.0);
    }

    #[test]
    fn test_makeup_workday_counted() {
        // 2025-01-24(周五) ~ 2025-01-27(周一)：1月26日(周日)为春节调休补班
        // 工作日 = 周五 + 周日(补班) + 周一 = 3 天
        let start = NaiveDate::from_ymd_opt(2025, 1, 24).unwrap(); // Friday
        let end = NaiveDate::from_ymd_opt(2025, 1, 27).unwrap(); // Monday
        assert_eq!(calculate_leave_days(start, end, false, false), 3.0);
    }

    #[test]
    fn test_spring_festival_all_holiday() {
        // 2025-01-28(除夕) ~ 2025-02-04：整个春节假期区间，无法定工作日 = 0 天
        let start = NaiveDate::from_ymd_opt(2025, 1, 28).unwrap();
        let end = NaiveDate::from_ymd_opt(2025, 2, 4).unwrap();
        assert_eq!(calculate_leave_days(start, end, false, false), 0.0);
    }

    #[test]
    fn test_holiday_with_half_day() {
        // 2025-01-02(周四) ~ 2025-01-03(周五)，结束日半天
        // 1月1日(元旦)不在区间内；两天均为正常工作日 = 2.0 - 0.5 = 1.5
        let start = NaiveDate::from_ymd_opt(2025, 1, 2).unwrap(); // Thursday
        let end = NaiveDate::from_ymd_opt(2025, 1, 3).unwrap(); // Friday
        assert_eq!(calculate_leave_days(start, end, false, true), 1.5);
    }

    // ===== check_annual_leave_balance 测试 =====

    #[test]
    fn test_balance_sufficient() {
        // 额度充足：已用 5，总额 10，申请 3 → 剩余 5，充足
        let (ok, remaining) = check_annual_leave_balance(5.0, 10.0, 3.0);
        assert!(ok);
        assert!((remaining - 5.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_balance_insufficient() {
        // 额度不足：已用 8，总额 10，申请 3 → 剩余 2，不足
        let (ok, remaining) = check_annual_leave_balance(8.0, 10.0, 3.0);
        assert!(!ok);
        assert!((remaining - 2.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_balance_just_enough() {
        // 刚好够：已用 7，总额 10，申请 3 → 剩余 3，充足
        let (ok, remaining) = check_annual_leave_balance(7.0, 10.0, 3.0);
        assert!(ok);
        assert!((remaining - 3.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_balance_zero_quota() {
        // 零额度：已用 0，总额 0，申请 1 → 剩余 0，不足
        let (ok, remaining) = check_annual_leave_balance(0.0, 0.0, 1.0);
        assert!(!ok);
        assert!((remaining - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_balance_negative_used_protection() {
        // 负数防护 - 已用天数为负：钳制为 0 → 剩余 10，充足
        let (ok, remaining) = check_annual_leave_balance(-5.0, 10.0, 3.0);
        assert!(ok);
        assert!((remaining - 10.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_balance_negative_request_protection() {
        // 负数防护 - 申请天数为负：钳制为 0 → 剩余 5，充足
        let (ok, remaining) = check_annual_leave_balance(5.0, 10.0, -3.0);
        assert!(ok);
        assert!((remaining - 5.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_balance_negative_quota_protection() {
        // 负数防护 - 总额度为负：钳制为 0 → 剩余 0，不足
        let (ok, remaining) = check_annual_leave_balance(5.0, -10.0, 3.0);
        assert!(!ok);
        assert!((remaining - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_balance_used_exceeds_quota() {
        // 已用超过总额度：剩余钳制为 0，不足
        let (ok, remaining) = check_annual_leave_balance(15.0, 10.0, 1.0);
        assert!(!ok);
        assert!((remaining - 0.0).abs() < f64::EPSILON);
    }

    // ===== calculate_leave_days 补充边界 =====

    #[test]
    fn test_cross_month_workdays_only() {
        // 2025-03-31(周一) → 2025-04-02(周三)，避开春节/清明
        // 工作日：3/31 周一 + 4/1 周二 + 4/2 周三 = 3 天
        let s = NaiveDate::from_ymd_opt(2025, 3, 31).unwrap();
        let e = NaiveDate::from_ymd_opt(2025, 4, 2).unwrap();
        assert_eq!(calculate_leave_days(s, e, false, false), 3.0);
    }

    #[test]
    fn test_cross_month_with_half_day_end_on_weekend() {
        // 结束日是周末（非工作日）且 end_half_day=true → 不扣减
        // 2025-03-27(周四) → 2025-03-29(周六)，end_half=true
        // 工作日：3/27 周四 + 3/28 周五 = 2.0；3/29 周六（非工作日，不扣 0.5）
        // 总 = 2.0
        let s = NaiveDate::from_ymd_opt(2025, 3, 27).unwrap();
        let e = NaiveDate::from_ymd_opt(2025, 3, 29).unwrap();
        assert_eq!(calculate_leave_days(s, e, false, true), 2.0);
    }

    #[test]
    fn test_cross_month_start_half_on_workday_end_half_on_weekend() {
        // start_half=true(周四,工作日) → 扣 0.5；end_half=true(周六,周末) → 不扣
        // 2025-03-27 周四 + 3/28 周五 = 2.0，扣 start 0.5 → 1.5
        let s = NaiveDate::from_ymd_opt(2025, 3, 27).unwrap();
        let e = NaiveDate::from_ymd_opt(2025, 3, 29).unwrap();
        assert_eq!(calculate_leave_days(s, e, true, true), 1.5);
    }

    #[test]
    fn test_2026_spring_festival_long_holiday_with_makeup_boundaries() {
        // 2026 春节：2/15-2/23 为法定假日；调休补班日 2/14(周六) 和 2/28(周六)
        // 请假如 2/13(周五) → 2/27(周五)
        // 2/13 周五(工作日)；2/14 周六(调休补班)；2/15-2/23 假日；2/24 周二、2/25 周三、2/26 周四、2/27 周五(工作日)
        // 总计：2/13 + 2/14 + 2/24 + 2/25 + 2/26 + 2/27 = 6 天
        let s = NaiveDate::from_ymd_opt(2026, 2, 13).unwrap();
        let e = NaiveDate::from_ymd_opt(2026, 2, 27).unwrap();
        assert_eq!(calculate_leave_days(s, e, false, false), 6.0);
    }

    #[test]
    fn test_2026_spring_festival_makeup_half_day_adjust() {
        // 请假区间 2/14(周六补班，半天 start_half) → 2/14(周六补班)
        // same_day + start_half + workday = 0.5
        let d = NaiveDate::from_ymd_opt(2026, 2, 14).unwrap();
        assert_eq!(calculate_leave_days(d, d, true, false), 0.5);
    }

    #[test]
    fn test_multi_month_cross_range_no_panic() {
        // 跨多月 2025-03-01(周六) → 2025-05-31(周六)
        // 这个测试主要验证 succ_opt 循环不会在 NaiveDate 推进时 panic
        // 也间接验证 total.max(0.0) 不会得到负数
        let s = NaiveDate::from_ymd_opt(2025, 3, 1).unwrap();
        let e = NaiveDate::from_ymd_opt(2025, 5, 31).unwrap();
        let result = calculate_leave_days(s, e, false, false);
        // 粗略估算：2025 清明节(4/4-4/6)、劳动节(5/1-5/5)、调休 4/27
        // 3 月共 22 工作日、4 月约 20 工作日、5 月约 19 工作日 → 粗略 > 0
        assert!(result > 50.0, "3 个月应有 > 50 个工作日，实际 {}", result);
        // 不应为负
        assert!(result >= 0.0);
    }

    #[test]
    fn test_same_day_weekend_half_day_returns_zero() {
        // 同一天为周末且两个 half 标记为 true：因为 is_workday 为假，不会设置 0.5 → 0
        let d = NaiveDate::from_ymd_opt(2024, 1, 6).unwrap(); // Saturday
        let result = calculate_leave_days(d, d, true, true);
        assert_eq!(result, 0.0);
    }

    #[test]
    fn test_half_day_adjust_never_goes_negative() {
        // 极端：两个半天标记为真，但只有 0 个工作日时，max(0.0) 应将结果钳为 0
        // 周末（周六到周日）+ start_half + end_half
        let s = NaiveDate::from_ymd_opt(2024, 1, 6).unwrap(); // Saturday
        let e = NaiveDate::from_ymd_opt(2024, 1, 7).unwrap(); // Sunday
        let result = calculate_leave_days(s, e, true, true);
        assert_eq!(result, 0.0);
    }

    #[test]
    fn test_start_equals_end_normal_workday_no_half_marks() {
        // 已在 test_same_day_full_day 覆盖；额外加周三验证
        let d = NaiveDate::from_ymd_opt(2024, 1, 3).unwrap(); // Wednesday
        assert_eq!(calculate_leave_days(d, d, false, false), 1.0);
    }

    #[test]
    fn test_two_week_with_makeup_and_holiday_mixed() {
        // 2025-04-28(周一) → 2025-05-09(周五)
        // 4/28 周一、4/29 周二、4/30 周三；5/1-5/5 劳动节；5/9 周五 → 前后有 5/6,7,8 三天(周二三四是工作日？哦 5月1日周四 那：
        // 5/1 Thu(假日) 5/2 Fri(假日) 5/3 Sat 5/4 Sun 5/5 Mon(假日)
        // 然后 5/6 Tue(正常工作日?) 5/7 Wed 5/8 Thu 5/9 Fri
        // 调休日 4/27(周日为调休)不在区间。所以 4/28,29,30(3个) + 5/6,7,8,9(4个) = 7 个工作日
        let s = NaiveDate::from_ymd_opt(2025, 4, 28).unwrap();
        let e = NaiveDate::from_ymd_opt(2025, 5, 9).unwrap();
        assert_eq!(calculate_leave_days(s, e, false, false), 7.0);
    }

    // ===== check_annual_leave_balance 补充边界 =====

    #[test]
    fn test_balance_request_zero_always_sufficient() {
        // 申请 0 天，只要剩余 >= 0 就够
        let (ok, remaining) = check_annual_leave_balance(9.0, 10.0, 0.0);
        assert!(ok);
        assert!((remaining - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_balance_request_matches_remaining_exactly() {
        // 剩余 0.5，申请 0.5 → 刚好够（浮点相等）
        let (ok, remaining) = check_annual_leave_balance(9.5, 10.0, 0.5);
        assert!(ok);
        assert!((remaining - 0.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_balance_all_negative_values_clamped_to_zero() {
        // 三个参数全为负 → used=0, quota=0, request=0, remaining=0 → 充足(0>=0)
        let (ok, remaining) = check_annual_leave_balance(-1.0, -5.0, -99.0);
        assert!(ok);
        assert!((remaining - 0.0).abs() < f64::EPSILON);
    }

    // ===== 盲区补充：跨年请假 + 国庆假期 + 半天扣减极端组合 =====

    #[test]
    fn test_cross_year_from_dec_2025_to_jan_2026_regular_workdays() {
        // 2025-12-29(周一) → 2026-01-05(周一)
        // 2026元旦: 1/1-1/3 为法定假日；1/4 周日为调休补班日
        // 工作日: 12/29 Mon, 12/30 Tue, 12/31 Wed → 3 天；1/4 Sun(调休补班), 1/5 Mon → 2 天
        // 共 5 天
        let s = NaiveDate::from_ymd_opt(2025, 12, 29).unwrap();
        let e = NaiveDate::from_ymd_opt(2026, 1, 5).unwrap();
        assert_eq!(calculate_leave_days(s, e, false, false), 5.0);
    }

    #[test]
    fn test_cross_year_both_half_day_mixed_workdays_and_holiday() {
        // 2025-12-31(周三) → 2026-01-02(周五)
        // 区间: 12/31 Wed(工作) + 1/1 Thu(元旦假) + 1/2 Fri(元旦假，见 HOLIDAY_RANGES 1/1-1/3)
        // 工作日 = 1 天（仅 12/31）；start_half=true 扣 0.5；end_half=true 在 1/2(假日) 不扣 → 0.5
        let s = NaiveDate::from_ymd_opt(2025, 12, 31).unwrap();
        let e = NaiveDate::from_ymd_opt(2026, 1, 2).unwrap();
        assert_eq!(calculate_leave_days(s, e, true, true), 0.5);
    }

    #[test]
    fn test_cross_year_weekend_half_day_nop() {
        // 2025-12-27(周六) → 2026-01-03(周六)，start_half=true, end_half=true
        // 12/27 Sat 周末、12/28 Sun 周末、12/29 Mon 工作、12/30 Tue 工作、12/31 Wed 工作
        // 1/1-1/3 元旦假；1/4 不在区间
        // 工作日 = 3 天；12/27(周末) start_half 不扣；1/3(假日) end_half 不扣 → 3.0
        let s = NaiveDate::from_ymd_opt(2025, 12, 27).unwrap();
        let e = NaiveDate::from_ymd_opt(2026, 1, 3).unwrap();
        assert_eq!(calculate_leave_days(s, e, true, true), 3.0);
    }

    #[test]
    fn test_cross_year_same_day_jan1_holiday_is_zero() {
        // 2026-01-01 元旦法定假日：即使全天申请也为 0 天
        let d = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();
        assert_eq!(calculate_leave_days(d, d, false, false), 0.0);
    }

    #[test]
    fn test_cross_year_same_day_dec31_workday_half_is_0_5() {
        // 2025-12-31 周三（工作日）same day + start_half=true → 0.5
        let d = NaiveDate::from_ymd_opt(2025, 12, 31).unwrap();
        assert_eq!(calculate_leave_days(d, d, true, false), 0.5);
    }

    // ===== 盲区补充：国庆长假 2026（10/1-10/7）+ 调休补班边界 =====

    #[test]
    fn test_2026_national_day_week_all_zero() {
        // 2026 国庆：10/1 周四 → 10/7 周三（7天）
        let s = NaiveDate::from_ymd_opt(2026, 10, 1).unwrap();
        let e = NaiveDate::from_ymd_opt(2026, 10, 7).unwrap();
        assert_eq!(calculate_leave_days(s, e, false, false), 0.0);
    }

    #[test]
    fn test_2026_national_day_with_pre_weekend_workdays() {
        // 2026-09-28(周一) → 2026-10-10(周六)
        // 9/28-9/30 (Mon-Wed) + 10/8(Thu) + 10/9(Fri) = 5 个工作日
        let s = NaiveDate::from_ymd_opt(2026, 9, 28).unwrap();
        let e = NaiveDate::from_ymd_opt(2026, 10, 10).unwrap();
        assert_eq!(calculate_leave_days(s, e, false, false), 5.0);
    }

    // ===== 盲区补充：请假天数为 0 时的极端情况 =====

    #[test]
    fn test_balance_request_zero_all_zeros() {
        let (ok, r) = check_annual_leave_balance(0.0, 0.0, 0.0);
        assert!(ok);
        assert_eq!(r, 0.0);
    }

    #[test]
    fn test_balance_request_zero_with_no_quota_sufficient() {
        // 申请 0 天、已用 100 天、额度 10 天 → 剩余 0 天，申请 0 天判定充足
        let (ok, r) = check_annual_leave_balance(100.0, 10.0, 0.0);
        assert!(ok);
        assert_eq!(r, 0.0);
    }

    #[test]
    fn test_balance_request_tiny_float_smaller_than_remaining() {
        // 浮点：剩余 0.0001，申请 0.00009 → 充足
        let (ok, r) = check_annual_leave_balance(10.0 - 0.0001, 10.0, 0.00009);
        assert!(ok);
        assert!((r - 0.0001).abs() < 1e-12);
    }

    #[test]
    fn test_balance_request_tiny_float_exceeds_remaining() {
        // 剩余 0.0001，申请 0.00011 → 不足
        let (ok, r) = check_annual_leave_balance(10.0 - 0.0001, 10.0, 0.00011);
        assert!(!ok);
        assert!((r - 0.0001).abs() < 1e-12);
    }

    // ===== 盲区补充：start_after_end + half_day 组合仍返回 0 =====

    #[test]
    fn test_start_after_end_with_half_flags_stays_zero() {
        // 起始 > 结束（短路返回 0），不受 half_flag 影响
        let s = NaiveDate::from_ymd_opt(2025, 5, 10).unwrap();
        let e = NaiveDate::from_ymd_opt(2025, 5, 1).unwrap();
        assert_eq!(calculate_leave_days(s, e, true, true), 0.0);
    }

    #[test]
    fn test_request_zero_days_check_balance_vs_leave_agree_on_zero() {
        // 相同"0 天请求"场景下，两个纯函数都安全返回 0 / true
        // 2025-6-1 是周日（非工作日）→ 同日请假为 0
        let d = NaiveDate::from_ymd_opt(2025, 6, 1).unwrap();
        assert_eq!(calculate_leave_days(d, d, false, false), 0.0);
        let (ok, _) = check_annual_leave_balance(0.0, 0.0, 0.0);
        assert!(ok);
    }
}
