use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::{NaiveDate, Utc};
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    ApproveLeaveRequestRequest, CreateLeaveRequestRequest, LeaveRequest, RejectLeaveRequestRequest,
    UpdateLeaveRequestRequest,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::utils::validate_required_field;
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

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

#[derive(Debug, Deserialize)]
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
    let _ = sqlx::query(
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
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&state.db)
    .await;
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

pub async fn list_leave_requests(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LeaveRequestQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<LeaveRequest>>> {
    ensure_table(&state).await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let type_filter = params.leave_type.clone();
    let employee_filter = params.employee_id;
    let tenant = tenant_id_from_claims(&claims);

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        SELECT id, employee_id, employee_name, leave_type, start_date, end_date,
               start_half_day, end_half_day, days, reason, status,
               approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        FROM leave_requests
        WHERE ($1::text IS NULL OR employee_name ILIKE $1 OR reason ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR leave_type = $3)
          AND ($4::uuid IS NULL OR employee_id = $4)
          AND tenant_id = $5
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&type_filter)
    .bind(employee_filter)
    .bind(tenant)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(requests) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM leave_requests
                WHERE ($1::text IS NULL OR employee_name ILIKE $1 OR reason ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR leave_type = $3)
                  AND ($4::uuid IS NULL OR employee_id = $4)
                  AND tenant_id = $5
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&type_filter)
            .bind(employee_filter)
            .bind(tenant)
            .fetch_one(&state.db)
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

pub async fn create_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateLeaveRequestRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
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

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        INSERT INTO leave_requests
            (id, employee_id, employee_name, leave_type, start_date, end_date,
             start_half_day, end_half_day, days, reason, status, tenant_id, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', $11, $12, $13)
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#,
    )
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
    .fetch_one(&state.db)
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

pub async fn get_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<LeaveRequest>> {
    ensure_table(&state).await;

    let tenant = tenant_id_from_claims(&claims);

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        SELECT id, employee_id, employee_name, leave_type, start_date, end_date,
               start_half_day, end_half_day, days, reason, status,
               approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        FROM leave_requests
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant)
    .fetch_optional(&state.db)
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

pub async fn update_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateLeaveRequestRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    ensure_table(&state).await;

    let tenant = tenant_id_from_claims(&claims);

    let existing = sqlx::query_as::<_, LeaveRequest>(
        r#"
        SELECT id, employee_id, employee_name, leave_type, start_date, end_date,
               start_half_day, end_half_day, days, reason, status,
               approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        FROM leave_requests
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant)
    .fetch_optional(&state.db)
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

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        UPDATE leave_requests SET
            leave_type = $2, start_date = $3, end_date = $4,
            start_half_day = $5, end_half_day = $6, days = $7, reason = $8,
            updated_at = $9
        WHERE id = $1
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&leave_type)
    .bind(start_date)
    .bind(end_date)
    .bind(start_half_day)
    .bind(end_half_day)
    .bind(days)
    .bind(&reason)
    .bind(now)
    .fetch_one(&state.db)
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

pub async fn delete_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    ensure_table(&state).await;

    let tenant = tenant_id_from_claims(&claims);

    let result = sqlx::query("DELETE FROM leave_requests WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant)
        .execute(&state.db)
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
pub async fn submit_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<LeaveRequest>> {
    ensure_table(&state).await;

    let tenant = tenant_id_from_claims(&claims);
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        UPDATE leave_requests SET status = 'pending', updated_at = $2
        WHERE id = $1 AND tenant_id = $3 AND status = 'draft'
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(tenant)
    .fetch_optional(&state.db)
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
pub async fn approve_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ApproveLeaveRequestRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    ensure_table(&state).await;

    if let Err(e) = validate_required_field("审批人", &req.approved_by) {
        return Json(api_error(400, &e));
    }

    let tenant = tenant_id_from_claims(&claims);
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        UPDATE leave_requests SET
            status = 'approved', approved_by = $2, approved_at = $3,
            rejected_reason = NULL, updated_at = $4
        WHERE id = $1 AND tenant_id = $5 AND status = 'pending'
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.approved_by)
    .bind(now)
    .bind(now)
    .bind(tenant)
    .fetch_optional(&state.db)
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
pub async fn reject_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<RejectLeaveRequestRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    ensure_table(&state).await;

    if let Err(e) = validate_required_field("审批人", &req.approved_by) {
        return Json(api_error(400, &e));
    }
    if let Err(e) = validate_required_field("驳回原因", &req.rejected_reason) {
        return Json(api_error(400, &e));
    }

    let tenant = tenant_id_from_claims(&claims);
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        UPDATE leave_requests SET
            status = 'rejected', approved_by = $2, approved_at = $3,
            rejected_reason = $4, updated_at = $5
        WHERE id = $1 AND tenant_id = $6 AND status = 'pending'
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.approved_by)
    .bind(now)
    .bind(&req.rejected_reason)
    .bind(now)
    .bind(tenant)
    .fetch_optional(&state.db)
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
pub async fn cancel_leave_request(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<LeaveRequest>> {
    ensure_table(&state).await;

    let tenant = tenant_id_from_claims(&claims);
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        UPDATE leave_requests SET status = 'cancelled', updated_at = $2
        WHERE id = $1 AND tenant_id = $3 AND status IN ('draft', 'pending')
        RETURNING id, employee_id, employee_name, leave_type, start_date, end_date,
                  start_half_day, end_half_day, days, reason, status,
                  approved_by, approved_at, rejected_reason, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(tenant)
    .fetch_optional(&state.db)
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
}
