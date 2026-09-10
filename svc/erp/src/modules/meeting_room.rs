use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use topems_shared_boundary::only_own_schema_query;
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
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/meeting-rooms",
    responses(
        (status = 200, description = "list_rooms OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn list_rooms(
    State(_state): State<ApiState>,
    Query(params): Query<RoomQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<MeetingRoom>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, MeetingRoom>(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, name, capacity, location, facilities, status, created_at, updated_at
        FROM meeting_rooms
        WHERE ($1::text IS NULL OR name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rooms) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "erp",
                r#"
                SELECT COUNT(*) FROM meeting_rooms
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
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
    security(("BearerAuth" = ["erp:master-data:write"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateMeetingRoomRequest>,
) -> Json<ApiResponse<MeetingRoom>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = validate_required_field("会议室名称", &req.name) {
        return Json(api_error(400, &e));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, MeetingRoom>(
        only_own_schema_query!("erp", r#"
        INSERT INTO meeting_rooms (id, name, capacity, location, facilities, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'available', $6, $7)
        RETURNING id, name, capacity, location, facilities, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.name)
    .bind(req.capacity)
    .bind(&req.location)
    .bind(&req.facilities)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
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
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

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
    security(("BearerAuth" = ["erp:read"])),
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
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<MeetingRoom>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, MeetingRoom>(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, name, capacity, location, facilities, status, created_at, updated_at
        FROM meeting_rooms WHERE id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
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
    security(("BearerAuth" = ["erp:update"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateMeetingRoomRequest>,
) -> Json<ApiResponse<MeetingRoom>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing = sqlx::query_as::<_, MeetingRoom>(
        only_own_schema_query!("erp", "SELECT id, name, capacity, location, facilities, status, created_at, updated_at FROM meeting_rooms WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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

    let result = sqlx::query_as::<_, MeetingRoom>(only_own_schema_query!(
        "erp",
        r#"
        UPDATE meeting_rooms SET
            name = $2, capacity = $3, location = $4, facilities = $5, status = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, name, capacity, location, facilities, status, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(&name)
    .bind(capacity)
    .bind(&location)
    .bind(&facilities)
    .bind(&status)
    .bind(now)
    .fetch_one(&mut **txn)
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
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

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
    security(("BearerAuth" = ["erp:delete"])),
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE meeting_rooms SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
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
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/meeting-bookings",
    responses(
        (status = 200, description = "list_bookings OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn list_bookings(
    State(_state): State<ApiState>,
    Query(params): Query<RoomQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<MeetingBooking>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, MeetingBooking>(
        only_own_schema_query!("erp", r#"
        SELECT id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at
        FROM meeting_bookings
        WHERE ($1::text IS NULL OR title ILIKE $1 OR room_name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY start_time DESC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(bookings) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("erp", r#"
                SELECT COUNT(*) FROM meeting_bookings
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR title ILIKE $1 OR room_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#),
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
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
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/meeting-bookings",
    request_body = CreateMeetingBookingRequest,
    responses(
        (status = 200, description = "create_booking OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn create_booking(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateMeetingBookingRequest>,
) -> Json<ApiResponse<MeetingBooking>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = validate_required_field("会议标题", &req.title) {
        return Json(api_error(400, &e));
    }

    let room_result = sqlx::query_as::<_, MeetingRoom>(
        only_own_schema_query!("erp", "SELECT id, name FROM meeting_rooms WHERE deleted_at IS NULL AND id = $1 AND status = 'available'"),
    )
    .bind(req.room_id)
    .fetch_optional(&mut **txn)
    .await;

    let room = match room_result {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(400, "会议室不可用或不存在")),
        Err(e) => return Json(api_error(500, &format!("查询会议室失败: {}", e))),
    };

    let overlapping = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "erp",
        r#"
        SELECT COUNT(*) FROM meeting_bookings
        WHERE deleted_at IS NULL AND room_id = $1 AND status = 'confirmed'
          AND ((start_time < $2 AND end_time > $2) OR (start_time < $3 AND end_time > $3))
        "#
    ))
    .bind(req.room_id)
    .bind(req.end_time)
    .bind(req.start_time)
    .fetch_one(&mut **txn)
    .await;

    if let Ok(count) = overlapping {
        if count > 0 {
            return Json(api_error(400, "该时间段已有会议预约"));
        }
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, MeetingBooking>(
        only_own_schema_query!("erp", r#"
        INSERT INTO meeting_bookings (id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9)
        RETURNING id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at
        "#),
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
    .fetch_one(&mut **txn)
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
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/meeting-bookings/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "get_booking OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn get_booking(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<MeetingBooking>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, MeetingBooking>(
        only_own_schema_query!("erp", r#"
        SELECT id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at
        FROM meeting_bookings WHERE id = $1
        "#),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/meeting-bookings/{id}",
    request_body = UpdateMeetingBookingRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "update_booking OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn update_booking(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateMeetingBookingRequest>,
) -> Json<ApiResponse<MeetingBooking>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing = sqlx::query_as::<_, MeetingBooking>(
        only_own_schema_query!("erp", "SELECT id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at FROM meeting_bookings WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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
        only_own_schema_query!("erp", r#"
        UPDATE meeting_bookings SET
            title = $2, organizer = $3, start_time = $4, end_time = $5, status = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&title)
    .bind(&organizer)
    .bind(start_time)
    .bind(end_time)
    .bind(&status)
    .bind(now)
    .fetch_one(&mut **txn)
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
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(api_error(500, "事务提交失败"));
            }
        }
    }

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

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/meeting-bookings/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "delete_booking OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn delete_booking(
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
        "erp",
        "UPDATE meeting_bookings SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/meeting-rooms/{id}/bookings",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "get_room_bookings OK")
    ),
    tag = "ERP/meeting-room"
)]
pub async fn get_room_bookings(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<MeetingBooking>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, MeetingBooking>(
        only_own_schema_query!("erp", r#"
        SELECT id, room_id, room_name, title, organizer, start_time, end_time, status, created_at, updated_at
        FROM meeting_bookings WHERE room_id = $1 ORDER BY start_time ASC
        "#),
    )
    .bind(id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(bookings) => Json(ApiResponse::success(bookings, "获取会议室预约列表成功")),
        Err(e) => {
            tracing::error!("获取会议室预约列表失败: {}", e);
            Json(api_error(500, "获取会议室预约列表失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_room_query_params_deserialize() {
        let query = "page=1&page_size=20&search=meeting&status=available";
        let params: RoomQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
        assert_eq!(params.search.as_deref(), Some("meeting"));
        assert_eq!(params.status.as_deref(), Some("available"));
    }

    #[test]
    fn test_room_query_params_default() {
        let query = "";
        let params: RoomQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.search.is_none());
        assert!(params.status.is_none());
    }
}
