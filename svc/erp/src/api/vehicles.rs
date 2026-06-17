use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::api::audit::{log_audit_event, AuditEventParams};
use crate::models::{
    CreateVehicleRequest, CreateVehicleRequestRequest, UpdateVehicleRequest,
    UpdateVehicleRequestRequest, Vehicle, VehicleApplication,
};
use crate::utils::validate_required_field;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct VehicleQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub vehicle_type: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/erp/vehicles", get(list_vehicles).post(create_vehicle))
        .route(
            "/api/erp/vehicles/{id}",
            get(get_vehicle).put(update_vehicle).delete(delete_vehicle),
        )
        .route(
            "/api/erp/vehicle-requests",
            get(list_vehicle_requests).post(create_vehicle_request),
        )
        .route(
            "/api/erp/vehicle-requests/{id}",
            get(get_vehicle_request)
                .put(update_vehicle_request)
                .delete(delete_vehicle_request),
        )
        .route("/api/erp/vehicles/{id}/requests", get(get_vehicle_requests))
}

async fn list_vehicles(
    State(state): State<ApiState>,
    Query(params): Query<VehicleQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<Vehicle>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let type_filter = params.vehicle_type.clone();

    let result = sqlx::query_as::<_, Vehicle>(
        r#"
        SELECT id, plate_number, brand, model, vehicle_type, status, driver, last_service, mileage, fuel_type, created_at, updated_at
        FROM vehicles
        WHERE ($1::text IS NULL OR plate_number ILIKE $1 OR brand ILIKE $1 OR model ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR vehicle_type = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&type_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(vehicles) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM vehicles
                WHERE ($1::text IS NULL OR plate_number ILIKE $1 OR brand ILIKE $1 OR model ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR vehicle_type = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&type_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(vehicles, total, page, page_size),
                "获取车辆列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取车辆列表失败: {}", e);
            Json(api_error(500, "获取车辆列表失败"))
        }
    }
}

async fn create_vehicle(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateVehicleRequest>,
) -> Json<ApiResponse<Vehicle>> {
    if let Err(e) = validate_required_field("车牌号", &req.plate_number) {
        return Json(api_error(400, &e));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Vehicle>(
        r#"
        INSERT INTO vehicles (id, plate_number, brand, model, vehicle_type, status, driver, mileage, fuel_type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'available', $6, $7, $8, $9, $10)
        RETURNING id, plate_number, brand, model, vehicle_type, status, driver, last_service, mileage, fuel_type, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.plate_number)
    .bind(&req.brand)
    .bind(&req.model)
    .bind(&req.vehicle_type)
    .bind(&req.driver)
    .bind(req.mileage)
    .bind(&req.fuel_type)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(vehicle) => (
            Json(ApiResponse::success(vehicle.clone(), "车辆创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建车辆失败: {}", e);
            (
                Json(api_error(500, "车辆创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(vehicle) = &result {
        serde_json::to_value(vehicle).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "vehicle".to_string(),
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

async fn get_vehicle(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vehicle>> {
    let result = sqlx::query_as::<_, Vehicle>(
        r#"
        SELECT id, plate_number, brand, model, vehicle_type, status, driver, last_service, mileage, fuel_type, created_at, updated_at
        FROM vehicles WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(vehicle)) => Json(ApiResponse::success(vehicle, "获取车辆成功")),
        Ok(None) => Json(api_error(404, "车辆不存在")),
        Err(e) => {
            tracing::error!("获取车辆失败: {}", e);
            Json(api_error(500, "获取车辆失败"))
        }
    }
}

async fn update_vehicle(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateVehicleRequest>,
) -> Json<ApiResponse<Vehicle>> {
    let existing = sqlx::query_as::<_, Vehicle>(
        "SELECT id, plate_number, brand, model, vehicle_type, status, driver, last_service, mileage, fuel_type, created_at, updated_at FROM vehicles WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(v)) => v,
        Ok(None) => return Json(api_error(404, "车辆不存在")),
        Err(e) => return Json(api_error(500, &format!("查询车辆失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let plate_number = req.plate_number.unwrap_or(existing.plate_number);
    let brand = req.brand.or(existing.brand);
    let model = req.model.or(existing.model);
    let vehicle_type = req.vehicle_type.or(existing.vehicle_type);
    let status = req.status.unwrap_or(existing.status);
    let driver = req.driver.or(existing.driver);
    let last_service = req.last_service.or(existing.last_service);
    let mileage = req.mileage.or(existing.mileage);
    let fuel_type = req.fuel_type.or(existing.fuel_type);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Vehicle>(
        r#"
        UPDATE vehicles SET
            plate_number = $2, brand = $3, model = $4, vehicle_type = $5, status = $6, driver = $7, last_service = $8, mileage = $9, fuel_type = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, plate_number, brand, model, vehicle_type, status, driver, last_service, mileage, fuel_type, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&plate_number)
    .bind(&brand)
    .bind(&model)
    .bind(&vehicle_type)
    .bind(&status)
    .bind(&driver)
    .bind(last_service)
    .bind(mileage)
    .bind(&fuel_type)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(vehicle) => (
            Json(ApiResponse::success(vehicle.clone(), "车辆更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新车辆失败: {}", e);
            (
                Json(api_error(500, "车辆更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(vehicle) = &result {
        serde_json::to_value(vehicle).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "vehicle".to_string(),
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

async fn delete_vehicle(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM vehicles WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "车辆删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "车辆不存在")),
            "error".to_string(),
            Some("车辆不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除车辆失败: {}", e);
            (
                Json(api_error(500, "车辆删除失败")),
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
            entity_type: "vehicle".to_string(),
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

async fn list_vehicle_requests(
    State(state): State<ApiState>,
    Query(params): Query<VehicleQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<VehicleApplication>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, VehicleApplication>(
        r#"
        SELECT id, vehicle_id, vehicle_plate, requester, purpose, start_time, end_time, driver_required, status, approved_by, approved_at, rejected_reason, created_at, updated_at
        FROM vehicle_requests
        WHERE ($1::text IS NULL OR vehicle_plate ILIKE $1 OR requester ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(requests) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM vehicle_requests
                WHERE ($1::text IS NULL OR vehicle_plate ILIKE $1 OR requester ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(requests, total, page, page_size),
                "获取车辆申请列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取车辆申请列表失败: {}", e);
            Json(api_error(500, "获取车辆申请列表失败"))
        }
    }
}

async fn create_vehicle_request(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateVehicleRequestRequest>,
) -> Json<ApiResponse<VehicleApplication>> {
    if let Err(e) = validate_required_field("申请人", &req.requester) {
        return Json(api_error(400, &e));
    }

    let vehicle_result = sqlx::query_as::<_, Vehicle>(
        "SELECT id, plate_number, status FROM vehicles WHERE id = $1 AND status = 'available'",
    )
    .bind(req.vehicle_id)
    .fetch_optional(&state.db)
    .await;

    let vehicle = match vehicle_result {
        Ok(Some(v)) => v,
        Ok(None) => return Json(api_error(400, "车辆不可用或不存在")),
        Err(e) => return Json(api_error(500, &format!("查询车辆失败: {}", e))),
    };

    let overlapping = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM vehicle_requests
        WHERE vehicle_id = $1 AND status = 'approved'
          AND ((start_time < $2 AND end_time > $2) OR (start_time < $3 AND end_time > $3))
        "#,
    )
    .bind(req.vehicle_id)
    .bind(req.end_time)
    .bind(req.start_time)
    .fetch_one(&state.db)
    .await;

    if let Ok(count) = overlapping {
        if count > 0 {
            return Json(api_error(400, "该时间段车辆已被申请"));
        }
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, VehicleApplication>(
        r#"
        INSERT INTO vehicle_requests (id, vehicle_id, vehicle_plate, requester, purpose, start_time, end_time, driver_required, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
        RETURNING id, vehicle_id, vehicle_plate, requester, purpose, start_time, end_time, driver_required, status, approved_by, approved_at, rejected_reason, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.vehicle_id)
    .bind(&vehicle.plate_number)
    .bind(&req.requester)
    .bind(&req.purpose)
    .bind(req.start_time)
    .bind(req.end_time)
    .bind(req.driver_required)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(request) => (
            Json(ApiResponse::success(request.clone(), "车辆申请创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建车辆申请失败: {}", e);
            (
                Json(api_error(500, "车辆申请创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(request) = &result {
        serde_json::to_value(request).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "vehicle_request".to_string(),
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

async fn get_vehicle_request(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<VehicleApplication>> {
    let result = sqlx::query_as::<_, VehicleApplication>(
        r#"
        SELECT id, vehicle_id, vehicle_plate, requester, purpose, start_time, end_time, driver_required, status, approved_by, approved_at, rejected_reason, created_at, updated_at
        FROM vehicle_requests WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(request)) => Json(ApiResponse::success(request, "获取车辆申请成功")),
        Ok(None) => Json(api_error(404, "车辆申请不存在")),
        Err(e) => {
            tracing::error!("获取车辆申请失败: {}", e);
            Json(api_error(500, "获取车辆申请失败"))
        }
    }
}

async fn update_vehicle_request(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateVehicleRequestRequest>,
) -> Json<ApiResponse<VehicleApplication>> {
    let existing = sqlx::query_as::<_, VehicleApplication>(
        "SELECT id, vehicle_id, vehicle_plate, requester, purpose, start_time, end_time, driver_required, status, approved_by, approved_at, rejected_reason, created_at, updated_at FROM vehicle_requests WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "车辆申请不存在")),
        Err(e) => return Json(api_error(500, &format!("查询车辆申请失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let status = req.status.unwrap_or(existing.status);
    let approved_by = req.approved_by.or(existing.approved_by);
    let approved_at = req.approved_at.or(existing.approved_at);
    let rejected_reason = req.rejected_reason.or(existing.rejected_reason);
    let now = Utc::now();

    let result = sqlx::query_as::<_, VehicleApplication>(
        r#"
        UPDATE vehicle_requests SET
            status = $2, approved_by = $3, approved_at = $4, rejected_reason = $5, updated_at = $6
        WHERE id = $1
        RETURNING id, vehicle_id, vehicle_plate, requester, purpose, start_time, end_time, driver_required, status, approved_by, approved_at, rejected_reason, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&status)
    .bind(&approved_by)
    .bind(approved_at)
    .bind(&rejected_reason)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(request) => (
            Json(ApiResponse::success(request.clone(), "车辆申请更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新车辆申请失败: {}", e);
            (
                Json(api_error(500, "车辆申请更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(request) = &result {
        serde_json::to_value(request).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "vehicle_request".to_string(),
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

async fn delete_vehicle_request(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM vehicle_requests WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "车辆申请删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "车辆申请不存在")),
            "error".to_string(),
            Some("车辆申请不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除车辆申请失败: {}", e);
            (
                Json(api_error(500, "车辆申请删除失败")),
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
            entity_type: "vehicle_request".to_string(),
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

async fn get_vehicle_requests(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<VehicleApplication>>> {
    let result = sqlx::query_as::<_, VehicleApplication>(
        r#"
        SELECT id, vehicle_id, vehicle_plate, requester, purpose, start_time, end_time, driver_required, status, approved_by, approved_at, rejected_reason, created_at, updated_at
        FROM vehicle_requests WHERE vehicle_id = $1 ORDER BY start_time ASC
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(requests) => Json(ApiResponse::success(requests, "获取车辆申请列表成功")),
        Err(e) => {
            tracing::error!("获取车辆申请列表失败: {}", e);
            Json(api_error(500, "获取车辆申请列表失败"))
        }
    }
}
