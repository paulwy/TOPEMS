//! Work Station handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/workstations",
            get(list_work_stations).post(create_work_station),
        )
        .route(
            "/workstations/{id}",
            get(get_work_station)
                .put(update_work_station)
                .delete(delete_work_station),
        )
        .route("/workstations/{id}/activate", put(activate_work_station))
        .route(
            "/workstations/{id}/deactivate",
            put(deactivate_work_station),
        )
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListWorkStationsQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateWorkStationRequest {
    pub station_no: Option<String>,
    pub name: String,
    pub workshop_id: Option<String>,
    pub location: Option<String>,
    pub capacity: Option<i32>,
    pub equipment_id: Option<String>,
    pub process_id: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateWorkStationRequest {
    pub name: Option<String>,
    pub workshop_id: Option<String>,
    pub location: Option<String>,
    pub status: Option<String>,
    pub capacity: Option<i32>,
    pub equipment_id: Option<String>,
    pub process_id: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WorkStationResponse {
    pub id: String,
    pub station_no: String,
    pub name: String,
    pub workshop_id: Option<String>,
    pub workshop_name: Option<String>,
    pub location: Option<String>,
    pub status: String,
    pub capacity: i32,
    pub equipment_id: Option<String>,
    pub equipment_name: Option<String>,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListWorkStationsResponse {
    pub workstations: Vec<WorkStationResponse>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt
        .unwrap_or_else(Utc::now)
}

fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    dt.map(|d| d.to_rfc3339()).unwrap_or_default()
}

fn row_to_workstation_response(r: &sqlx::postgres::PgRow) -> WorkStationResponse {
    WorkStationResponse {
        id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
        station_no: r.try_get::<String, _>("station_no").unwrap_or_default(),
        name: r.try_get::<String, _>("name").unwrap_or_default(),
        workshop_id: r
            .try_get::<Option<Uuid>, _>("workshop_id")
            .ok()
            .flatten()
            .map(|u| u.to_string()),
        workshop_name: {
            let name: Option<String> = r
                .try_get::<Option<String>, _>("workshop_name")
                .ok()
                .flatten();
            name.filter(|n| !n.is_empty())
        },
        location: r.try_get::<Option<String>, _>("location").ok().flatten(),
        status: r
            .try_get::<Option<String>, _>("status")
            .ok()
            .flatten()
            .unwrap_or_else(|| "active".to_string()),
        capacity: r
            .try_get::<Option<i32>, _>("capacity")
            .ok()
            .flatten()
            .unwrap_or(1),
        equipment_id: r
            .try_get::<Option<Uuid>, _>("equipment_id")
            .ok()
            .flatten()
            .map(|u| u.to_string()),
        equipment_name: {
            let name: Option<String> = r
                .try_get::<Option<String>, _>("equipment_name")
                .ok()
                .flatten();
            name.filter(|n| !n.is_empty())
        },
        process_id: r
            .try_get::<Option<Uuid>, _>("process_id")
            .ok()
            .flatten()
            .map(|u| u.to_string()),
        process_name: {
            let name: Option<String> = r
                .try_get::<Option<String>, _>("process_name")
                .ok()
                .flatten();
            name.filter(|n| !n.is_empty())
        },
        description: r.try_get::<Option<String>, _>("description").ok().flatten(),
        created_at: datetime_to_string(
            r.try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten(),
        ),
        updated_at: datetime_to_string(
            r.try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten(),
        ),
    }
}

// ==================== Work Station Handlers ====================

pub async fn list_work_stations(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListWorkStationsQuery>,
) -> Json<ApiResponse<ListWorkStationsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE ws.deleted_at IS NULL");

    if let Some(status) = query.status {
        where_clause.push_str(" AND ws.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" AND (ws.station_no ILIKE $1 OR ws.station_name ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (ws.station_no ILIKE ${} OR ws.station_name ILIKE ${})",
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM work_stations ws{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count work stations: {}", e);
            return Json(ApiResponse::error(500, "获取工位列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            ws.id, ws.station_no, ws.station_name, ws.workshop_id, ws.location,
            ws.status, ws.capacity, ws.equipment_id, ws.process_id,
            ws.description, ws.created_at, ws.updated_at,
            e.equipment_name as equipment_name,
            pp.process_name as process_name,
            '' as workshop_name
        FROM work_stations ws
        LEFT JOIN equipment e ON ws.equipment_id = e.id
        LEFT JOIN production_processes pp ON ws.process_id = pp.id
        {}
        ORDER BY ws.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    let workstations = match fetch_query.fetch_all(&state.pool).await {
        Ok(w) => w,
        Err(e) => {
            tracing::error!("Failed to fetch work stations: {}", e);
            return Json(ApiResponse::error(500, "获取工位列表失败"));
        }
    };

    let workstation_list: Vec<WorkStationResponse> = workstations
        .iter()
        .map(row_to_workstation_response)
        .collect();

    Json(ApiResponse::success(
        ListWorkStationsResponse {
            workstations: workstation_list,
            total: total.unwrap_or(0),
            page: page as i32,
            page_size: page_size as i32,
        },
        "获取工位列表成功",
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
    let station_no = req.station_no.unwrap_or_else(|| {
        format!(
            "WS{}{:04}",
            now.format("%Y%m%d"),
            rand::random::<u16>() % 10000
        )
    });

    let workshop_id = req
        .workshop_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let equipment_id = req
        .equipment_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let process_id = req
        .process_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query(
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
    )
    .bind(&station_no)
    .bind(&req.name)
    .bind(workshop_id)
    .bind(&req.location)
    .bind(req.capacity.unwrap_or(1))
    .bind(equipment_id)
    .bind(process_id)
    .bind(&req.description)
    .bind(now.naive_utc())
    .fetch_one(&state.pool)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create work station: {}", e);
            return Json(ApiResponse::error(500, "创建工位失败"));
        }
    };

    Json(ApiResponse::success(
        row_to_workstation_response(&row),
        "工位创建成功",
    ))
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

    let result = sqlx::query(
        r#"
        SELECT 
            ws.id, ws.station_no, ws.station_name, ws.workshop_id, ws.location,
            ws.status, ws.capacity, ws.equipment_id, ws.process_id,
            ws.description, ws.created_at, ws.updated_at,
            e.equipment_name as equipment_name,
            pp.process_name as process_name,
            '' as workshop_name
        FROM work_stations ws
        LEFT JOIN equipment e ON ws.equipment_id = e.id
        LEFT JOIN production_processes pp ON ws.process_id = pp.id
        WHERE ws.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch work station: {}", e);
            return Json(ApiResponse::error(500, "获取工位失败"));
        }
    };

    match result {
        Some(row) => Json(ApiResponse::success(
            row_to_workstation_response(&row),
            "获取工位成功",
        )),
        None => Json(ApiResponse::error(404, "工位不存在")),
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

    let workshop_id = req
        .workshop_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let equipment_id = req
        .equipment_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let process_id = req
        .process_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query(
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
    )
    .bind(id)
    .bind(&req.name)
    .bind(workshop_id)
    .bind(&req.location)
    .bind(&req.status)
    .bind(req.capacity)
    .bind(equipment_id)
    .bind(process_id)
    .bind(&req.description)
    .bind(Utc::now().naive_utc())
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update work station: {}", e);
            return Json(ApiResponse::error(500, "更新工位失败"));
        }
    };

    match result {
        Some(row) => Json(ApiResponse::success(
            row_to_workstation_response(&row),
            "工位更新成功",
        )),
        None => Json(ApiResponse::error(404, "工位不存在")),
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
        UPDATE work_stations SET deleted_at = NOW()
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
            return Json(ApiResponse::error(500, "删除工位失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "工位删除成功"))
    } else {
        Json(ApiResponse::error(404, "工位不存在"))
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

    let result = sqlx::query(
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
    )
    .bind(id)
    .bind(Utc::now().naive_utc())
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to activate work station: {}", e);
            return Json(ApiResponse::error(500, "激活工位失败"));
        }
    };

    match result {
        Some(row) => Json(ApiResponse::success(
            row_to_workstation_response(&row),
            "工位激活成功",
        )),
        None => Json(ApiResponse::error(404, "工位不存在")),
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

    let result = sqlx::query(
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
    )
    .bind(id)
    .bind(Utc::now().naive_utc())
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to deactivate work station: {}", e);
            return Json(ApiResponse::error(500, "停用工位失败"));
        }
    };

    match result {
        Some(row) => Json(ApiResponse::success(
            row_to_workstation_response(&row),
            "工位停用成功",
        )),
        None => Json(ApiResponse::error(404, "工位不存在或状态不允许停用")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = NaiveDate::from_ymd_opt(2024, 7, 1)
            .unwrap()
            .and_hms_opt(9, 45, 0)
            .unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.naive_utc().date(), dt.date());
        assert_eq!(utc.naive_utc().time(), dt.time());
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    #[test]
    fn datetime_to_string_some_rfc3339() {
        let dt = NaiveDate::from_ymd_opt(2024, 3, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        let s = datetime_to_string(Some(dt));
        assert!(s.starts_with("2024-03-01T00:00:00"), "got {}", s);
    }

    #[test]
    fn datetime_to_string_none_valid() {
        let s = datetime_to_string(None);
        assert!(s.is_empty());
    }
}
