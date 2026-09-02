use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Datelike, Duration, NaiveDate, Timelike, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::supplier_delivery_appointment::{
    ArrivalConfirmRequest, CancelRequest, CompleteRequest,
    CreateSupplierDeliveryAppointmentRequest, SupplierDeliveryAppointment,
    UpdateSupplierDeliveryAppointmentRequest,
};
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::PaginationParams;
use topems_shared_core::response::{api_error, ApiResponse};

// =============================================================================
// Pure functions for delivery appointment scheduling & scoring
// =============================================================================

/// 交付约定状态的下一合法状态转换：
/// draft → (submit) → pending_approval → (approve) → scheduled → (arrive_confirm) → in_progress → (complete) → completed
/// 任何状态都可取消 → cancelled
pub fn next_appointment_status(current: &str, action: &str) -> Option<&'static str> {
    match (current, action) {
        ("draft", "submit") => Some("pending_approval"),
        ("pending_approval", "approve") => Some("scheduled"),
        ("pending_approval", "reject") => Some("rejected"),
        ("scheduled", "arrive_confirm") => Some("in_progress"),
        ("in_progress", "complete") => Some("completed"),
        (_, "cancel") if current != "completed" && current != "cancelled" => Some("cancelled"),
        _ => None,
    }
}

/// 预约准时度评分：如果 confirmed_arrival - scheduled > 阈值，扣分
/// Returns (on_time_status: &'static str, score_deduction: f64)
pub fn evaluate_punctuality(
    scheduled: DateTime<Utc>,
    confirmed_arrival: DateTime<Utc>,
    tolerance_minutes: i64,
) -> (&'static str, f64) {
    let diff_minutes = (confirmed_arrival - scheduled).num_minutes();
    let tol = tolerance_minutes.max(0);
    if diff_minutes <= 0 {
        // early or exactly on-time
        ("early_or_on_time", 0.0)
    } else if diff_minutes <= tol {
        ("within_tolerance", 0.0)
    } else if diff_minutes <= tol + 30 {
        ("slightly_late", 5.0)
    } else if diff_minutes <= tol + 120 {
        ("late", 15.0)
    } else {
        ("severely_late", 30.0)
    }
}

/// 可预约时段检查（工作时间：工作日 8:00 - 18:00）
/// 使用时间的 `time` 和 `weekday` 组件判断
pub fn is_within_working_window(
    appointment: chrono::NaiveDateTime,
    work_start_hour: u32,
    work_end_hour: u32,
) -> bool {
    let weekday = appointment.weekday().num_days_from_monday(); // Mon=0..Sun=6
    if weekday >= 5 {
        return false; // weekend
    }
    let hour = appointment.time().hour();
    hour >= work_start_hour && hour < work_end_hour
}

/// 根据订单量和卸货能力估算卸货时长（分钟）
/// 每件 2 分钟 + 30 分钟基础准备，超过卡车容量分段加价
pub fn estimate_unloading_minutes(total_quantity: f64, minutes_per_unit: f64) -> i64 {
    if total_quantity <= 0.0 || minutes_per_unit <= 0.0 {
        return 0;
    }
    let setup = 30.0;
    let variable = total_quantity * minutes_per_unit;
    (setup + variable).ceil() as i64
}

/// 计算约定是否满足提前期（买方下 PO → 最早可预约的到货日之间的 lead_time）
/// `earliest_allowed = po_date + lead_time_days`；appointment_date >= earliest_allowed
pub fn satisfies_lead_time(
    appointment_date: NaiveDate,
    po_date: NaiveDate,
    lead_time_days: i64,
) -> bool {
    appointment_date >= po_date + Duration::days(lead_time_days.max(0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_next_status_happy_path() {
        assert_eq!(
            next_appointment_status("draft", "submit"),
            Some("pending_approval")
        );
        assert_eq!(
            next_appointment_status("pending_approval", "approve"),
            Some("scheduled")
        );
        assert_eq!(
            next_appointment_status("scheduled", "arrive_confirm"),
            Some("in_progress")
        );
        assert_eq!(
            next_appointment_status("in_progress", "complete"),
            Some("completed")
        );
    }

    #[test]
    fn test_next_status_reject() {
        assert_eq!(
            next_appointment_status("pending_approval", "reject"),
            Some("rejected")
        );
    }

    #[test]
    fn test_next_status_cancel_before_completion() {
        assert_eq!(
            next_appointment_status("draft", "cancel"),
            Some("cancelled")
        );
        assert_eq!(
            next_appointment_status("scheduled", "cancel"),
            Some("cancelled")
        );
        assert_eq!(next_appointment_status("completed", "cancel"), None);
        assert_eq!(next_appointment_status("cancelled", "cancel"), None);
    }

    #[test]
    fn test_next_status_invalid_transition() {
        assert_eq!(next_appointment_status("draft", "approve"), None);
        assert_eq!(next_appointment_status("scheduled", "complete"), None);
    }

    fn dt(offset_min: i64) -> DateTime<Utc> {
        let base = Utc::now();
        base + Duration::minutes(offset_min)
    }

    #[test]
    fn test_punctuality_on_time_and_early() {
        let scheduled = dt(0);
        assert_eq!(
            evaluate_punctuality(scheduled, dt(-5), 10),
            ("early_or_on_time", 0.0)
        );
        assert_eq!(
            evaluate_punctuality(scheduled, dt(0), 10),
            ("early_or_on_time", 0.0)
        );
    }

    #[test]
    fn test_punctuality_within_tolerance() {
        let scheduled = dt(0);
        assert_eq!(
            evaluate_punctuality(scheduled, dt(5), 10),
            ("within_tolerance", 0.0)
        );
    }

    #[test]
    fn test_punctuality_slighly_late() {
        // tolerance = 10, diff = 10+5 = 15 min → slightly_late
        let scheduled = dt(0);
        assert_eq!(
            evaluate_punctuality(scheduled, dt(15), 10),
            ("slightly_late", 5.0)
        );
    }

    #[test]
    fn test_punctuality_late() {
        let scheduled = dt(0);
        // diff = 10+40 = 50 → late (within 130)
        assert_eq!(evaluate_punctuality(scheduled, dt(50), 10), ("late", 15.0));
    }

    #[test]
    fn test_punctuality_severely_late() {
        let scheduled = dt(0);
        // diff = 10+200 = 210 → severely late
        assert_eq!(
            evaluate_punctuality(scheduled, dt(210), 10),
            ("severely_late", 30.0)
        );
    }

    #[test]
    fn test_working_window_mon_fri_9to17() {
        // Monday 2026-08-10 at 10:00
        let ok = NaiveDate::from_ymd_opt(2026, 8, 10)
            .unwrap()
            .and_hms_opt(10, 0, 0)
            .unwrap();
        assert!(is_within_working_window(ok, 8, 18));

        // Friday 2026-08-14 at 17:00
        let ok2 = NaiveDate::from_ymd_opt(2026, 8, 14)
            .unwrap()
            .and_hms_opt(17, 0, 0)
            .unwrap();
        assert!(is_within_working_window(ok2, 8, 18));

        // Saturday
        let sat = NaiveDate::from_ymd_opt(2026, 8, 15)
            .unwrap()
            .and_hms_opt(10, 0, 0)
            .unwrap();
        assert!(!is_within_working_window(sat, 8, 18));

        // Sunday
        let sun = NaiveDate::from_ymd_opt(2026, 8, 16)
            .unwrap()
            .and_hms_opt(10, 0, 0)
            .unwrap();
        assert!(!is_within_working_window(sun, 8, 18));

        // Before 08:00
        let early = NaiveDate::from_ymd_opt(2026, 8, 10)
            .unwrap()
            .and_hms_opt(7, 59, 0)
            .unwrap();
        assert!(!is_within_working_window(early, 8, 18));

        // After 18:00
        let late = NaiveDate::from_ymd_opt(2026, 8, 10)
            .unwrap()
            .and_hms_opt(18, 0, 0)
            .unwrap();
        assert!(!is_within_working_window(late, 8, 18));
    }

    #[test]
    fn test_estimate_unloading() {
        assert_eq!(estimate_unloading_minutes(0.0, 2.0), 0);
        assert_eq!(estimate_unloading_minutes(100.0, 0.0), 0);
        assert_eq!(estimate_unloading_minutes(-5.0, 2.0), 0);
        // q=50, 2/unit: 30 + 50*2 = 130
        assert_eq!(estimate_unloading_minutes(50.0, 2.0), 130);
        // fractional → ceil: 30 + 10.5 = 40.5 → 41
        assert_eq!(estimate_unloading_minutes(3.5, 3.0), 41);
    }

    #[test]
    fn test_satisfies_lead_time() {
        let po = NaiveDate::from_ymd_opt(2026, 9, 1).unwrap();
        // lead 7 days: earliest = 2026-09-08
        assert!(satisfies_lead_time(
            NaiveDate::from_ymd_opt(2026, 9, 8).unwrap(),
            po,
            7
        ));
        assert!(satisfies_lead_time(
            NaiveDate::from_ymd_opt(2026, 9, 15).unwrap(),
            po,
            7
        ));
        assert!(!satisfies_lead_time(
            NaiveDate::from_ymd_opt(2026, 9, 7).unwrap(),
            po,
            7
        ));
        // zero lead time → same day OK
        assert!(satisfies_lead_time(po, po, 0));
        // negative lead_time clamped to 0
        assert!(satisfies_lead_time(po, po, -5));
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierDeliveryAppointmentQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/delivery-appointments",
            get(list_appointments).post(create_appointment),
        )
        .route(
            "/delivery-appointments/{id}",
            get(get_appointment)
                .put(update_appointment)
                .delete(delete_appointment),
        )
        .route(
            "/delivery-appointments/{id}/approve",
            post(approve_appointment),
        )
        .route(
            "/delivery-appointments/{id}/reject",
            post(reject_appointment),
        )
        .route(
            "/delivery-appointments/{id}/confirm-arrival",
            post(confirm_arrival),
        )
        .route(
            "/delivery-appointments/{id}/complete",
            post(complete_appointment),
        )
        .route(
            "/delivery-appointments/{id}/cancel",
            post(cancel_appointment),
        )
        .route("/delivery-appointments/stats", get(appointment_stats))
}

const SELECT_COLUMNS: &str = "id, appointment_no, purchase_order_id, purchase_order_no, supplier_id, supplier_name, delivery_date, delivery_time, delivery_method, vehicle_no, driver_name, driver_phone, cargo_description, total_quantity, total_weight, destination_warehouse, expected_arrival_time, actual_arrival_time, status, applicant, approver, approved_at, rejection_reason, remarks, created_by, created_at, updated_at";

pub async fn list_appointments(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SupplierDeliveryAppointmentQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentRead,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let query = format!(
        r#"
        SELECT {SELECT_COLUMNS}
        FROM scm.supplier_delivery_appointments
        WHERE ($1::text IS NULL OR appointment_no ILIKE $1 OR supplier_name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR supplier_id = $3)
          AND ($4::date IS NULL OR delivery_date >= $4)
          AND ($5::date IS NULL OR delivery_date <= $5)
        ORDER BY delivery_date DESC, created_at DESC
        LIMIT $6 OFFSET $7
        "#
    );

    let result = sqlx::query_as::<_, SupplierDeliveryAppointment>(&query)
        .bind(&search_pattern)
        .bind(&params.status)
        .bind(params.supplier_id)
        .bind(params.start_date)
        .bind(params.end_date)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

    match result {
        Ok(items) => {
            let count_query = r#"
                SELECT COUNT(*) FROM scm.supplier_delivery_appointments
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR appointment_no ILIKE $1 OR supplier_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR supplier_id = $3)
                  AND ($4::date IS NULL OR delivery_date >= $4)
                  AND ($5::date IS NULL OR delivery_date <= $5)
                "#.to_string();
            let count_result = sqlx::query_scalar::<_, i64>(&count_query)
                .bind(&search_pattern)
                .bind(&params.status)
                .bind(params.supplier_id)
                .bind(params.start_date)
                .bind(params.end_date)
                .fetch_one(&state.db)
                .await;
            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": topems_shared_core::response::total_pages_of(total, page_size),
                }),
                "获取供应商送货预约列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商送货预约列表失败: {}", e);
            Json(api_error(500, "获取供应商送货预约列表失败"))
        }
    }
}

fn generate_appointment_no() -> String {
    let now = Utc::now();
    format!("DA{}", now.format("%Y%m%d%H%M%S%3f"))
}

pub async fn create_appointment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateSupplierDeliveryAppointmentRequest>,
) -> Json<ApiResponse<SupplierDeliveryAppointment>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentWrite,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.delivery_method.trim().is_empty() {
        return Json(api_error(400, "送货方式不能为空"));
    }

    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();
    let appointment_no = generate_appointment_no();

    let query = format!(
        r#"
        INSERT INTO scm.supplier_delivery_appointments (
            id, appointment_no, purchase_order_id, purchase_order_no,
            supplier_id, supplier_name, delivery_date, delivery_time,
            delivery_method, vehicle_no, driver_name, driver_phone,
            cargo_description, total_quantity, total_weight,
            destination_warehouse, expected_arrival_time, status,
            applicant, remarks, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending', $18, $19, $20, $21)
        RETURNING {SELECT_COLUMNS}
        "#
    );

    let result = sqlx::query_as::<_, SupplierDeliveryAppointment>(&query)
        .bind(id)
        .bind(&appointment_no)
        .bind(req.purchase_order_id)
        .bind(&req.purchase_order_no)
        .bind(req.supplier_id)
        .bind(&req.supplier_name)
        .bind(req.delivery_date)
        .bind(req.delivery_time)
        .bind(&req.delivery_method)
        .bind(&req.vehicle_no)
        .bind(&req.driver_name)
        .bind(&req.driver_phone)
        .bind(&req.cargo_description)
        .bind(req.total_quantity)
        .bind(req.total_weight)
        .bind(&req.destination_warehouse)
        .bind(req.expected_arrival_time)
        .bind(req.applicant.as_deref().unwrap_or(&claims.username))
        .bind(&req.remarks)
        .bind(now)
        .bind(now)
        .fetch_one(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(apt) => (
            Json(ApiResponse::success(apt.clone(), "供应商送货预约创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建供应商送货预约失败: {}", e);
            (
                Json(api_error(500, "供应商送货预约创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(apt) = &result {
        serde_json::to_value(apt).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "supplier_delivery_appointment".to_string(),
        Some(id),
        None,
        Some(claims.sub.clone()),
        Some(claims.username.clone()),
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

pub async fn get_appointment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SupplierDeliveryAppointment>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentRead,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let query =
        format!("SELECT {SELECT_COLUMNS} FROM scm.supplier_delivery_appointments WHERE deleted_at IS NULL AND id = $1");
    let result = sqlx::query_as::<_, SupplierDeliveryAppointment>(&query)
        .bind(id)
        .fetch_optional(&state.db)
        .await;

    match result {
        Ok(Some(apt)) => Json(ApiResponse::success(apt, "获取供应商送货预约成功")),
        Ok(None) => Json(api_error(404, "供应商送货预约不存在")),
        Err(e) => {
            tracing::error!("获取供应商送货预约失败: {}", e);
            Json(api_error(500, "获取供应商送货预约失败"))
        }
    }
}

pub async fn update_appointment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateSupplierDeliveryAppointmentRequest>,
) -> Json<ApiResponse<SupplierDeliveryAppointment>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentWrite,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let select_query =
        format!("SELECT {SELECT_COLUMNS} FROM scm.supplier_delivery_appointments WHERE deleted_at IS NULL AND id = $1");
    let existing = sqlx::query_as::<_, SupplierDeliveryAppointment>(&select_query)
        .bind(id)
        .fetch_optional(&state.db)
        .await;
    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "供应商送货预约不存在")),
        Err(e) => return Json(api_error(500, &format!("查询供应商送货预约失败: {}", e))),
    };

    if !matches!(existing.status.as_str(), "pending" | "rejected") {
        return Json(api_error(
            400,
            &format!("当前状态为 {}，仅待审批或已驳回状态可修改", existing.status),
        ));
    }

    let purchase_order_id = req.purchase_order_id.or(existing.purchase_order_id);
    let purchase_order_no = req.purchase_order_no.or(existing.purchase_order_no);
    let delivery_date = req.delivery_date.unwrap_or(existing.delivery_date);
    let delivery_time = req.delivery_time.or(existing.delivery_time);
    let delivery_method = req.delivery_method.unwrap_or(existing.delivery_method);
    let vehicle_no = req.vehicle_no.or(existing.vehicle_no);
    let driver_name = req.driver_name.or(existing.driver_name);
    let driver_phone = req.driver_phone.or(existing.driver_phone);
    let cargo_description = req.cargo_description.or(existing.cargo_description);
    let total_quantity = req.total_quantity.or(existing.total_quantity);
    let total_weight = req.total_weight.or(existing.total_weight);
    let destination_warehouse = req.destination_warehouse.or(existing.destination_warehouse);
    let expected_arrival_time = req.expected_arrival_time.or(existing.expected_arrival_time);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let update_query = format!(
        r#"
        UPDATE scm.supplier_delivery_appointments SET
            purchase_order_id = $2, purchase_order_no = $3,
            delivery_date = $4, delivery_time = $5,
            delivery_method = $6, vehicle_no = $7,
            driver_name = $8, driver_phone = $9,
            cargo_description = $10, total_quantity = $11, total_weight = $12,
            destination_warehouse = $13, expected_arrival_time = $14,
            status = $15, remarks = $16, updated_at = $17
        WHERE id = $1
        RETURNING {SELECT_COLUMNS}
        "#
    );

    let result = sqlx::query_as::<_, SupplierDeliveryAppointment>(&update_query)
        .bind(id)
        .bind(purchase_order_id)
        .bind(&purchase_order_no)
        .bind(delivery_date)
        .bind(delivery_time)
        .bind(&delivery_method)
        .bind(&vehicle_no)
        .bind(&driver_name)
        .bind(&driver_phone)
        .bind(&cargo_description)
        .bind(total_quantity)
        .bind(total_weight)
        .bind(&destination_warehouse)
        .bind(expected_arrival_time)
        .bind(&status)
        .bind(&remarks)
        .bind(now)
        .fetch_one(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(apt) => (
            Json(ApiResponse::success(apt.clone(), "供应商送货预约更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新供应商送货预约失败: {}", e);
            (
                Json(api_error(500, "供应商送货预约更新失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(apt) = &result {
        serde_json::to_value(apt).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "supplier_delivery_appointment".to_string(),
        Some(id),
        None,
        Some(claims.sub.clone()),
        Some(claims.username.clone()),
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

pub async fn delete_appointment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentWrite,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        "UPDATE scm.supplier_delivery_appointments SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success(
                "".to_string(),
                "供应商送货预约删除成功",
            )),
            "success",
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "供应商送货预约不存在")),
            "error",
            Some("供应商送货预约不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除供应商送货预约失败: {}", e);
            (
                Json(api_error(500, "供应商送货预约删除失败")),
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

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "supplier_delivery_appointment".to_string(),
        Some(id),
        None,
        Some(claims.sub.clone()),
        Some(claims.username.clone()),
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ApprovalBody {
    pub approver_name: Option<String>,
    pub remarks: Option<String>,
}

async fn approve_appointment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ApprovalBody>,
) -> Json<ApiResponse<SupplierDeliveryAppointment>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentApprove,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let select_query =
        format!("SELECT {SELECT_COLUMNS} FROM scm.supplier_delivery_appointments WHERE deleted_at IS NULL AND id = $1");
    let existing = sqlx::query_as::<_, SupplierDeliveryAppointment>(&select_query)
        .bind(id)
        .fetch_optional(&state.db)
        .await;
    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "供应商送货预约不存在")),
        Err(e) => return Json(api_error(500, &format!("查询供应商送货预约失败: {}", e))),
    };

    if existing.status != "pending" {
        return Json(api_error(
            400,
            &format!("当前状态为{}，无法审批", existing.status),
        ));
    }

    let approver = req
        .approver_name
        .clone()
        .unwrap_or_else(|| claims.username.clone());
    let now = Utc::now();

    let new_remarks = match (existing.remarks.clone(), req.remarks.clone()) {
        (Some(old), Some(new)) => Some(format!("{} | 审批通过 ({}): {}", old, approver, new)),
        (Some(old), None) => Some(format!("{} | 审批通过 ({})", old, approver)),
        (None, Some(new)) => Some(format!("审批通过 ({}): {}", approver, new)),
        (None, None) => Some(format!("审批通过 ({})", approver)),
    };

    let update_query = format!(
        r#"
        UPDATE scm.supplier_delivery_appointments SET
            status = 'approved', approver = $2, approved_at = $3, remarks = $4, updated_at = $3
        WHERE id = $1
        RETURNING {SELECT_COLUMNS}
        "#
    );

    let result = sqlx::query_as::<_, SupplierDeliveryAppointment>(&update_query)
        .bind(id)
        .bind(&approver)
        .bind(now)
        .bind(&new_remarks)
        .fetch_one(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(apt) => (
            Json(ApiResponse::success(apt.clone(), "供应商送货预约审批通过")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("审批供应商送货预约失败: {}", e);
            (
                Json(api_error(500, "审批供应商送货预约失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(apt) = &result {
        serde_json::to_value(apt).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "approve".to_string(),
        "supplier_delivery_appointment".to_string(),
        Some(id),
        None,
        Some(claims.sub.clone()),
        Some(claims.username.clone()),
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn reject_appointment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ApprovalBody>,
) -> Json<ApiResponse<SupplierDeliveryAppointment>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentApprove,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let select_query =
        format!("SELECT {SELECT_COLUMNS} FROM scm.supplier_delivery_appointments WHERE deleted_at IS NULL AND id = $1");
    let existing = sqlx::query_as::<_, SupplierDeliveryAppointment>(&select_query)
        .bind(id)
        .fetch_optional(&state.db)
        .await;
    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "供应商送货预约不存在")),
        Err(e) => return Json(api_error(500, &format!("查询供应商送货预约失败: {}", e))),
    };

    if existing.status != "pending" {
        return Json(api_error(
            400,
            &format!("当前状态为{}，无法驳回", existing.status),
        ));
    }

    let approver = req
        .approver_name
        .clone()
        .unwrap_or_else(|| claims.username.clone());
    let reject_reason = req.remarks.clone().unwrap_or_default();
    let new_remarks = match existing.remarks.clone() {
        Some(old) => Some(format!(
            "{} | 审批驳回 ({}): {}",
            old, approver, reject_reason
        )),
        None => Some(format!("审批驳回 ({}): {}", approver, reject_reason)),
    };
    let now = Utc::now();

    let update_query = format!(
        r#"
        UPDATE scm.supplier_delivery_appointments SET
            status = 'rejected', approver = $2, approved_at = $3,
            rejection_reason = $4, remarks = $5, updated_at = $3
        WHERE id = $1
        RETURNING {SELECT_COLUMNS}
        "#
    );

    let result = sqlx::query_as::<_, SupplierDeliveryAppointment>(&update_query)
        .bind(id)
        .bind(&approver)
        .bind(now)
        .bind(&reject_reason)
        .bind(&new_remarks)
        .fetch_one(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(apt) => (
            Json(ApiResponse::success(apt.clone(), "供应商送货预约已驳回")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("驳回供应商送货预约失败: {}", e);
            (
                Json(api_error(500, "驳回供应商送货预约失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(apt) = &result {
        serde_json::to_value(apt).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "reject".to_string(),
        "supplier_delivery_appointment".to_string(),
        Some(id),
        None,
        Some(claims.sub.clone()),
        Some(claims.username.clone()),
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn confirm_arrival(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ArrivalConfirmRequest>,
) -> Json<ApiResponse<SupplierDeliveryAppointment>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentWrite,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let select_query =
        format!("SELECT {SELECT_COLUMNS} FROM scm.supplier_delivery_appointments WHERE deleted_at IS NULL AND id = $1");
    let existing = sqlx::query_as::<_, SupplierDeliveryAppointment>(&select_query)
        .bind(id)
        .fetch_optional(&state.db)
        .await;
    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "供应商送货预约不存在")),
        Err(e) => return Json(api_error(500, &format!("查询供应商送货预约失败: {}", e))),
    };

    if existing.status != "approved" {
        return Json(api_error(
            400,
            &format!(
                "当前状态为{}，仅已审批通过的预约可确认到货",
                existing.status
            ),
        ));
    }

    let actual_arrival = req.actual_arrival_time.unwrap_or_else(Utc::now);
    let new_remarks = match (existing.remarks.clone(), req.remarks.clone()) {
        (Some(old), Some(new)) => Some(format!("{} | 到货确认: {}", old, new)),
        (None, Some(new)) => Some(format!("到货确认: {}", new)),
        _ => existing.remarks.clone(),
    };
    let now = Utc::now();

    let update_query = format!(
        r#"
        UPDATE scm.supplier_delivery_appointments SET
            status = 'arrived', actual_arrival_time = $2,
            remarks = $3, updated_at = $4
        WHERE id = $1
        RETURNING {SELECT_COLUMNS}
        "#
    );

    let result = sqlx::query_as::<_, SupplierDeliveryAppointment>(&update_query)
        .bind(id)
        .bind(actual_arrival)
        .bind(&new_remarks)
        .bind(now)
        .fetch_one(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(apt) => (
            Json(ApiResponse::success(apt.clone(), "到货确认成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("到货确认失败: {}", e);
            (
                Json(api_error(500, "到货确认失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(apt) = &result {
        serde_json::to_value(apt).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "confirm_arrival".to_string(),
        "supplier_delivery_appointment".to_string(),
        Some(id),
        None,
        Some(claims.sub.clone()),
        Some(claims.username.clone()),
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn complete_appointment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CompleteRequest>,
) -> Json<ApiResponse<SupplierDeliveryAppointment>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentWrite,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let select_query =
        format!("SELECT {SELECT_COLUMNS} FROM scm.supplier_delivery_appointments WHERE deleted_at IS NULL AND id = $1");
    let existing = sqlx::query_as::<_, SupplierDeliveryAppointment>(&select_query)
        .bind(id)
        .fetch_optional(&state.db)
        .await;
    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "供应商送货预约不存在")),
        Err(e) => return Json(api_error(500, &format!("查询供应商送货预约失败: {}", e))),
    };

    if existing.status != "arrived" {
        return Json(api_error(
            400,
            &format!(
                "当前状态为{}，仅已到货确认的预约可标记完成",
                existing.status
            ),
        ));
    }

    let new_remarks = match (existing.remarks.clone(), req.remarks.clone()) {
        (Some(old), Some(new)) => Some(format!("{} | 完成: {}", old, new)),
        (None, Some(new)) => Some(format!("完成: {}", new)),
        _ => existing.remarks.clone(),
    };
    let now = Utc::now();

    let update_query = format!(
        r#"
        UPDATE scm.supplier_delivery_appointments SET
            status = 'completed', remarks = $2, updated_at = $3
        WHERE id = $1
        RETURNING {SELECT_COLUMNS}
        "#
    );

    let result = sqlx::query_as::<_, SupplierDeliveryAppointment>(&update_query)
        .bind(id)
        .bind(&new_remarks)
        .bind(now)
        .fetch_one(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(apt) => (
            Json(ApiResponse::success(apt.clone(), "预约已完成")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("完成供应商送货预约失败: {}", e);
            (
                Json(api_error(500, "完成供应商送货预约失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(apt) = &result {
        serde_json::to_value(apt).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "complete".to_string(),
        "supplier_delivery_appointment".to_string(),
        Some(id),
        None,
        Some(claims.sub.clone()),
        Some(claims.username.clone()),
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn cancel_appointment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CancelRequest>,
) -> Json<ApiResponse<SupplierDeliveryAppointment>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentWrite,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let select_query =
        format!("SELECT {SELECT_COLUMNS} FROM scm.supplier_delivery_appointments WHERE deleted_at IS NULL AND id = $1");
    let existing = sqlx::query_as::<_, SupplierDeliveryAppointment>(&select_query)
        .bind(id)
        .fetch_optional(&state.db)
        .await;
    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "供应商送货预约不存在")),
        Err(e) => return Json(api_error(500, &format!("查询供应商送货预约失败: {}", e))),
    };

    if matches!(existing.status.as_str(), "completed" | "cancelled") {
        return Json(api_error(
            400,
            &format!("当前状态为{}，无法取消", existing.status),
        ));
    }

    let reason = req.reason.clone().unwrap_or_default();
    let new_remarks = match existing.remarks.clone() {
        Some(old) => Some(format!("{} | 取消: {}", old, reason)),
        None => Some(format!("取消: {}", reason)),
    };
    let now = Utc::now();

    let update_query = format!(
        r#"
        UPDATE scm.supplier_delivery_appointments SET
            status = 'cancelled', remarks = $2, updated_at = $3
        WHERE id = $1
        RETURNING {SELECT_COLUMNS}
        "#
    );

    let result = sqlx::query_as::<_, SupplierDeliveryAppointment>(&update_query)
        .bind(id)
        .bind(&new_remarks)
        .bind(now)
        .fetch_one(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(apt) => (
            Json(ApiResponse::success(apt.clone(), "预约已取消")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("取消供应商送货预约失败: {}", e);
            (
                Json(api_error(500, "取消供应商送货预约失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(apt) = &result {
        serde_json::to_value(apt).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "cancel".to_string(),
        "supplier_delivery_appointment".to_string(),
        Some(id),
        None,
        Some(claims.sub.clone()),
        Some(claims.username.clone()),
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn appointment_stats(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(
        &state.db,
        &claims,
        &ModulePermission::SupplierDeliveryAppointmentRead,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }
    let _ = params; // 当前未使用

    let by_status = sqlx::query_as::<_, (String, i64)>(only_own_schema_query!(
        "scm",
        r#"
        SELECT status, COUNT(*)::bigint AS count
        FROM scm.supplier_delivery_appointments
        GROUP BY status
        "#
    ))
    .fetch_all(&state.db)
    .await;

    let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "scm",
        "SELECT COUNT(*)::bigint FROM scm.supplier_delivery_appointments"
    ))
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let today = chrono::Local::now().date_naive();
    let upcoming = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "scm",
        r#"
        SELECT COUNT(*)::bigint FROM scm.supplier_delivery_appointments
        WHERE deleted_at IS NULL AND delivery_date >= $1 AND status IN ('pending', 'approved')
        "#
    ))
    .bind(today)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let overdue = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "scm",
        r#"
        SELECT COUNT(*)::bigint FROM scm.supplier_delivery_appointments
        WHERE deleted_at IS NULL AND delivery_date < $1 AND status IN ('pending', 'approved')
        "#
    ))
    .bind(today)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let mut by_status_map = serde_json::Map::new();
    if let Ok(rows) = by_status {
        for (status, count) in rows {
            by_status_map.insert(status, serde_json::json!(count));
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "total": total,
            "upcoming": upcoming,
            "overdue": overdue,
            "by_status": by_status_map,
        }),
        "获取供应商送货预约统计成功",
    ))
}
