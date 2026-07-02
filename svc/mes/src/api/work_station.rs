//! Work Station handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, PgPool};
use topems_shared::auth::Claims;

use crate::services::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/mes/workstations",
            get(list_work_stations).post(create_work_station),
        )
        .route(
            "/api/mes/workstations/{id}",
            get(get_work_station)
                .put(update_work_station)
                .delete(delete_work_station),
        )
        .route(
            "/api/mes/workstations/{id}/activate",
            post(activate_work_station),
        )
        .route(
            "/api/mes/workstations/{id}/deactivate",
            post(deactivate_work_station),
        )
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize)]
pub struct CreateWorkStationRequest {
    pub name: String,
    pub workshop_id: Option<Uuid>,
    pub location: Option<String>,
    pub capacity: Option<i32>,
    pub equipment_id: Option<Uuid>,
    pub process_id: Option<Uuid>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateWorkStationRequest {
    pub name: Option<String>,
    pub workshop_id: Option<Uuid>,
    pub location: Option<String>,
    pub status: Option<String>,
    pub capacity: Option<i32>,
    pub equipment_id: Option<Uuid>,
    pub process_id: Option<Uuid>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WorkStationResponse {
    pub id: Uuid,
    pub station_no: String,
    pub name: String,
    pub workshop_id: Option<Uuid>,
    pub location: Option<String>,
    pub status: String,
    pub capacity: i32,
    pub equipment_id: Option<Uuid>,
    pub process_id: Option<Uuid>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListWorkStationsResponse {
    pub workstations: Vec<WorkStationResponse>,
    pub total: i64,
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d))
        .unwrap_or_else(Utc::now)
}

// ==================== Work Station Handlers ====================

pub async fn list_work_stations(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<ListWorkStationsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, station_no, name, workshop_id, location,
            status, capacity, equipment_id, process_id,
            description, created_at, updated_at
        FROM work_stations
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let workstations = match result {
        Ok(w) => w,
        Err(e) => {
            tracing::error!("Failed to fetch work stations: {}", e);
            return Json(ApiResponse::error(500, "获取工作站列表失败"));
        }
    };

    let workstations: Vec<WorkStationResponse> = workstations
        .into_iter()
        .map(|r| WorkStationResponse {
            id: r.id,
            station_no: r.station_no,
            name: r.name,
            workshop_id: r.workshop_id,
            location: r.location,
            status: r.status.unwrap_or_else(|| "active".to_string()),
            capacity: r.capacity.unwrap_or(1),
            equipment_id: r.equipment_id,
            process_id: r.process_id,
            description: r.description,
            created_at: naive_to_utc(r.created_at),
            updated_at: naive_to_utc(r.updated_at),
        })
        .collect();

    let total = workstations.len() as i64;

    Json(ApiResponse::success(
        ListWorkStationsResponse {
            workstations,
            total,
        },
        "获取工作站列表成功",
    ))
}

pub async fn create_work_station(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateWorkStationRequest>,
) -> Json<ApiResponse<WorkStationResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let now = Utc::now();
    let station_no = format!(
        "WS{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let result = sqlx::query!(
        r#"
        INSERT INTO work_stations (
            station_no, name, workshop_id, location, status,
            capacity, equipment_id, process_id, description,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $9)
        RETURNING 
            id, station_no, name, workshop_id, location,
            status, capacity, equipment_id, process_id,
            description, created_at, updated_at
        "#,
        station_no,
        req.name,
        req.workshop_id,
        req.location,
        req.capacity.unwrap_or(1),
        req.equipment_id,
        req.process_id,
        req.description,
        now.naive_utc(),
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create work station: {}", e);
            return Json(ApiResponse::error(500, "创建工作站失败"));
        }
    };

    let station = WorkStationResponse {
        id: result.id,
        station_no: result.station_no,
        name: result.name,
        workshop_id: result.workshop_id,
        location: result.location,
        status: result.status.unwrap_or_else(|| "active".to_string()),
        capacity: result.capacity.unwrap_or(1),
        equipment_id: result.equipment_id,
        process_id: result.process_id,
        description: result.description,
        created_at: naive_to_utc(result.created_at),
        updated_at: naive_to_utc(result.updated_at),
    };

    Json(ApiResponse::success(station, "工作站创建成功"))
}

pub async fn get_work_station(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkStationResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, station_no, name, workshop_id, location,
            status, capacity, equipment_id, process_id,
            description, created_at, updated_at
        FROM work_stations
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch work station: {}", e);
            return Json(ApiResponse::error(500, "获取工作站失败"));
        }
    };

    match result {
        Some(r) => {
            let station = WorkStationResponse {
                id: r.id,
                station_no: r.station_no,
                name: r.name,
                workshop_id: r.workshop_id,
                location: r.location,
                status: r.status.unwrap_or_else(|| "active".to_string()),
                capacity: r.capacity.unwrap_or(1),
                equipment_id: r.equipment_id,
                process_id: r.process_id,
                description: r.description,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(station, "获取工作站成功"))
        }
        None => Json(ApiResponse::error(404, "工作站不存在")),
    }
}

pub async fn update_work_station(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWorkStationRequest>,
) -> Json<ApiResponse<WorkStationResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE work_stations SET
            name = COALESCE($2, name),
            workshop_id = COALESCE($3, workshop_id),
            location = COALESCE($4, location),
            status = COALESCE($5, status),
            capacity = COALESCE($6, capacity),
            equipment_id = COALESCE($7, equipment_id),
            process_id = COALESCE($8, process_id),
            description = COALESCE($9, description),
            updated_at = $10
        WHERE id = $1
        RETURNING 
            id, station_no, name, workshop_id, location,
            status, capacity, equipment_id, process_id,
            description, created_at, updated_at
        "#,
        id,
        req.name,
        req.workshop_id,
        req.location,
        req.status,
        req.capacity,
        req.equipment_id,
        req.process_id,
        req.description,
        Utc::now().naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update work station: {}", e);
            return Json(ApiResponse::error(500, "更新工作站失败"));
        }
    };

    match result {
        Some(r) => {
            let station = WorkStationResponse {
                id: r.id,
                station_no: r.station_no,
                name: r.name,
                workshop_id: r.workshop_id,
                location: r.location,
                status: r.status.unwrap_or_else(|| "active".to_string()),
                capacity: r.capacity.unwrap_or(1),
                equipment_id: r.equipment_id,
                process_id: r.process_id,
                description: r.description,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(station, "工作站更新成功"))
        }
        None => Json(ApiResponse::error(404, "工作站不存在")),
    }
}

pub async fn delete_work_station(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        DELETE FROM work_stations
        WHERE id = $1
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete work station: {}", e);
            return Json(ApiResponse::error(500, "删除工作站失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "工作站删除成功"))
    } else {
        Json(ApiResponse::error(404, "工作站不存在"))
    }
}

pub async fn activate_work_station(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkStationResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE work_stations SET
            status = 'active',
            updated_at = $2
        WHERE id = $1
        RETURNING 
            id, station_no, name, workshop_id, location,
            status, capacity, equipment_id, process_id,
            description, created_at, updated_at
        "#,
        id,
        Utc::now().naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to activate work station: {}", e);
            return Json(ApiResponse::error(500, "激活工作站失败"));
        }
    };

    match result {
        Some(r) => {
            let station = WorkStationResponse {
                id: r.id,
                station_no: r.station_no,
                name: r.name,
                workshop_id: r.workshop_id,
                location: r.location,
                status: r.status.unwrap_or_else(|| "active".to_string()),
                capacity: r.capacity.unwrap_or(1),
                equipment_id: r.equipment_id,
                process_id: r.process_id,
                description: r.description,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(station, "工作站激活成功"))
        }
        None => Json(ApiResponse::error(404, "工作站不存在")),
    }
}

pub async fn deactivate_work_station(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkStationResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE work_stations SET
            status = 'inactive',
            updated_at = $2
        WHERE id = $1 AND status = 'active'
        RETURNING 
            id, station_no, name, workshop_id, location,
            status, capacity, equipment_id, process_id,
            description, created_at, updated_at
        "#,
        id,
        Utc::now().naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to deactivate work station: {}", e);
            return Json(ApiResponse::error(500, "停用工作站失败"));
        }
    };

    match result {
        Some(r) => {
            let station = WorkStationResponse {
                id: r.id,
                station_no: r.station_no,
                name: r.name,
                workshop_id: r.workshop_id,
                location: r.location,
                status: r.status.unwrap_or_else(|| "inactive".to_string()),
                capacity: r.capacity.unwrap_or(1),
                equipment_id: r.equipment_id,
                process_id: r.process_id,
                description: r.description,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(station, "工作站停用成功"))
        }
        None => Json(ApiResponse::error(404, "工作站不存在或状态不允许停用")),
    }
}
