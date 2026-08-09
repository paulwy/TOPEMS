use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use utoipa::path;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    CreateMeetingBookingRequest, CreateMeetingRoomRequest, MeetingBooking, MeetingRoom,
    UpdateMeetingBookingRequest, UpdateMeetingRoomRequest,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::utils::validate_required_field;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct RoomQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/meeting-rooms", get(list_rooms).post(create_room))
        .route(
            "/meeting-rooms/{id}",
            get(get_room).put(update_room).delete(delete_room),
        )
        .route("/meeting-bookings", get(list_bookings).post(create_booking))
        .route(
            "/meeting-bookings/{id}",
            get(get_booking).put(update_booking).delete(delete_booking),
        )
        .route("/meeting-rooms/{id}/bookings", get(get_room_bookings))
}

#[utoipa::path(
    get,
    path = "/erp/meeting-rooms",
    responses(
        (status = 200, description = "list_rooms OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn list_rooms(
    State(state): State<ApiState>,
    Query(params): Query<RoomQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<MeetingRoom>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, MeetingRoom>(
        r#"
        SELECT id, name, capacity, location, facilities, status, created_at, updated_at
        FROM meeting_rooms
        WHERE ($1::text IS NULL OR name ILIKE $1)
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
        Ok(rooms) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM meeting_rooms
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(rooms, total, page, page_size),
                "获取会议室列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取会议室列表失败: {}", e);
            Json(api_error(500, "获取会议室列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/erp/meeting-rooms",
    request_body = CreateMeetingRoomRequest,
    responses(
        (status = 200, description = "create_room OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn create_room(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateMeetingRoomRequest>,
) -> Json<ApiResponse<MeetingRoom>> {
    if let Err(e) = validate_required_field("会议室名称", &req.name) {
        return Json(api_error(400, &e));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, MeetingRoom>(
        r#"
        INSERT INTO meeting_rooms (id, name, capacity, location, facilities, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'available', $6, $7)
        RETURNING id, name, capacity, location, facilities, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(req.capacity)
    .bind(&req.location)
    .bind(&req.facilities)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(room) => (
            Json(ApiResponse::success(room.clone(), "会议室创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建会议室失败: {}", e);
            (
                Json(api_error(500, "会议室创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(room) = &result {
        serde_json::to_value(room).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "meeting_room".to_string(),
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
    path = "/erp/meeting-rooms/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "get_room OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn get_room(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<MeetingRoom>> {
    let result = sqlx::query_as::<_, MeetingRoom>(
        r#"
        SELECT id, name, capacity, location, facilities, status, created_at, updated_at
        FROM meeting_rooms WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(room)) => Json(ApiResponse::success(room, "获取会议室成功")),
        Ok(None) => Json(api_error(404, "会议室不存在")),
        Err(e) => {
            tracing::error!("获取会议室失败: {}", e);
            Json(api_error(500, "获取会议室失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/erp/meeting-rooms/{id}",
    request_body = UpdateMeetingRoomRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "update_room OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn update_room(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateMeetingRoomRequest>,
) -> Json<ApiResponse<MeetingRoom>> {
    let existing = sqlx::query_as::<_, MeetingRoom>(
        "SELECT id, name, capacity, location, facilities, status, created_at, updated_at FROM meeting_rooms WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "会议室不存在")),
        Err(e) => return Json(api_error(500, &format!("查询会议室失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let capacity = req.capacity.or(Some(existing.capacity));
    let location = req.location.or(existing.location);
    let facilities = req.facilities.or(existing.facilities);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, MeetingRoom>(
        r#"
        UPDATE meeting_rooms SET
            name = $2, capacity = $3, location = $4, facilities = $5, status = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, name, capacity, location, facilities, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(capacity)
    .bind(&location)
    .bind(&facilities)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(room) => (
            Json(ApiResponse::success(room.clone(), "会议室更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新会议室失败: {}", e);
            (
                Json(api_error(500, "会议室更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(room) = &result {
        serde_json::to_value(room).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "meeting_room".to_string(),
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
    path = "/erp/meeting-rooms/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "delete_room OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn delete_room(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("UPDATE meeting_rooms SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "会议室删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "会议室不存在")),
            "error".to_string(),
            Some("会议室不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除会议室失败: {}", e);
            (
                Json(api_error(500, "会议室删除失败")),
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
            entity_type: "meeting_room".to_string(),
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

#[utoipa::path(
    get,
    path = "/erp/meeting-rooms/bookings",
    responses(
        (status = 200, description = "list_bookings OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn list_bookings(
    State(state): State<ApiState>,
    Query(params): Query<RoomQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<MeetingBooking>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, MeetingBooking>(
        r#"
        SELECT id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at
        FROM meeting_bookings
        WHERE ($1::text IS NULL OR title ILIKE $1 OR room_name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY start_time DESC
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
        Ok(bookings) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM meeting_bookings
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR title ILIKE $1 OR room_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(bookings, total, page, page_size),
                "获取会议预约列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取会议预约列表失败: {}", e);
            Json(api_error(500, "获取会议预约列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/erp/meeting-rooms/bookings",
    request_body = CreateMeetingBookingRequest,
    responses(
        (status = 200, description = "create_booking OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn create_booking(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateMeetingBookingRequest>,
) -> Json<ApiResponse<MeetingBooking>> {
    if let Err(e) = validate_required_field("会议标题", &req.title) {
        return Json(api_error(400, &e));
    }

    let room_result = sqlx::query_as::<_, MeetingRoom>(
        "SELECT id, name FROM meeting_rooms WHERE deleted_at IS NULL AND id = $1 AND status = 'available'",
    )
    .bind(req.room_id)
    .fetch_optional(&state.db)
    .await;

    let room = match room_result {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(400, "会议室不可用或不存在")),
        Err(e) => return Json(api_error(500, &format!("查询会议室失败: {}", e))),
    };

    let overlapping = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM meeting_bookings
        WHERE deleted_at IS NULL AND room_id = $1 AND status = 'confirmed'
          AND ((start_time < $2 AND end_time > $2) OR (start_time < $3 AND end_time > $3))
        "#,
    )
    .bind(req.room_id)
    .bind(req.end_time)
    .bind(req.start_time)
    .fetch_one(&state.db)
    .await;

    if let Ok(count) = overlapping {
        if count > 0 {
            return Json(api_error(400, "该时间段已有会议预约"));
        }
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, MeetingBooking>(
        r#"
        INSERT INTO meeting_bookings (id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9)
        RETURNING id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.room_id)
    .bind(&room.name)
    .bind(&req.title)
    .bind(&req.organizer)
    .bind(req.start_time)
    .bind(req.end_time)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(booking) => (
            Json(ApiResponse::success(booking.clone(), "会议预约创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建会议预约失败: {}", e);
            (
                Json(api_error(500, "会议预约创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(booking) = &result {
        serde_json::to_value(booking).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "meeting_booking".to_string(),
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

pub async fn get_booking(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<MeetingBooking>> {
    let result = sqlx::query_as::<_, MeetingBooking>(
        r#"
        SELECT id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at
        FROM meeting_bookings WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(booking)) => Json(ApiResponse::success(booking, "获取会议预约成功")),
        Ok(None) => Json(api_error(404, "会议预约不存在")),
        Err(e) => {
            tracing::error!("获取会议预约失败: {}", e);
            Json(api_error(500, "获取会议预约失败"))
        }
    }
}

pub async fn update_booking(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateMeetingBookingRequest>,
) -> Json<ApiResponse<MeetingBooking>> {
    let existing = sqlx::query_as::<_, MeetingBooking>(
        "SELECT id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at FROM meeting_bookings WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(b)) => b,
        Ok(None) => return Json(api_error(404, "会议预约不存在")),
        Err(e) => return Json(api_error(500, &format!("查询会议预约失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let title = req.title.unwrap_or(existing.title);
    let organizer = req.organizer.or(Some(existing.organizer));
    let start_time = req.start_time.or(Some(existing.start_time));
    let end_time = req.end_time.or(Some(existing.end_time));
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, MeetingBooking>(
        r#"
        UPDATE meeting_bookings SET
            title = $2, organizer = $3, start_time = $4, end_time = $5, status = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&title)
    .bind(&organizer)
    .bind(start_time)
    .bind(end_time)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(booking) => (
            Json(ApiResponse::success(booking.clone(), "会议预约更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新会议预约失败: {}", e);
            (
                Json(api_error(500, "会议预约更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(booking) = &result {
        serde_json::to_value(booking).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "meeting_booking".to_string(),
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

pub async fn delete_booking(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("UPDATE meeting_bookings SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "会议预约删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "会议预约不存在")),
            "error".to_string(),
            Some("会议预约不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除会议预约失败: {}", e);
            (
                Json(api_error(500, "会议预约删除失败")),
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
            entity_type: "meeting_booking".to_string(),
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

pub async fn get_room_bookings(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<MeetingBooking>>> {
    let result = sqlx::query_as::<_, MeetingBooking>(
        r#"
        SELECT id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at
        FROM meeting_bookings WHERE room_id = $1 ORDER BY start_time ASC
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(bookings) => Json(ApiResponse::success(bookings, "获取会议室预约列表成功")),
        Err(e) => {
            tracing::error!("获取会议室预约列表失败: {}", e);
            Json(api_error(500, "获取会议室预约列表失败"))
        }
    }
}
