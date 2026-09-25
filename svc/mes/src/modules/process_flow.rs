use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared_auth::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/process-flows",
            get(list_process_flows).post(create_process_flow),
        )
        .route(
            "/process-flows/{id}",
            get(get_process_flow)
                .put(update_process_flow)
                .delete(delete_process_flow),
        )
        .route(
            "/process-flows/{id}/steps",
            get(get_flow_steps).post(add_flow_step),
        )
        .route("/process-flows/{id}/steps/reorder", put(reorder_flow_steps))
        .route(
            "/process-flows/{id}/steps/{step_id}",
            put(update_flow_step).delete(remove_flow_step),
        )
        .route("/process-flows/{id}/capacity", get(analyze_capacity))
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListProcessFlowsQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProcessFlowRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub route_id: Option<String>,
    pub production_line: Option<String>,
    pub capacity: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProcessFlowRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub route_id: Option<String>,
    pub production_line: Option<String>,
    pub capacity: Option<f64>,
    pub unit: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessFlowResponse {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: String,
    pub route_id: Option<String>,
    pub route_name: Option<String>,
    pub production_line: Option<String>,
    pub capacity: Option<f64>,
    pub unit: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AddProcessFlowStepRequest {
    pub process_id: String,
    pub sequence: i32,
    pub work_station_id: Option<String>,
    pub equipment_ids: Option<Vec<String>>,
    pub standard_time: Option<f64>,
    pub wait_time: Option<f64>,
    pub transfer_time: Option<String>,
    pub quality_check_required: Option<bool>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProcessFlowStepRequest {
    pub sequence: Option<i32>,
    pub work_station_id: Option<String>,
    pub equipment_ids: Option<Vec<String>>,
    pub standard_time: Option<f64>,
    pub wait_time: Option<f64>,
    pub transfer_time: Option<String>,
    pub quality_check_required: Option<bool>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReorderFlowStepsRequest {
    pub step_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessFlowStepResponse {
    pub id: String,
    pub flow_id: String,
    pub process_id: String,
    pub process_name: String,
    pub process_code: String,
    pub sequence: i32,
    pub work_station_id: Option<String>,
    pub work_station_name: Option<String>,
    pub equipment_ids: Option<String>,
    pub standard_time: Option<f64>,
    pub wait_time: Option<f64>,
    pub transfer_time: Option<String>,
    pub quality_check_required: Option<bool>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CapacityAnalysisResponse {
    pub flow_id: String,
    pub flow_name: String,
    pub theoretical_capacity: f64,
    pub effective_capacity: f64,
    pub utilization_rate: f64,
    pub bottleneck_step: Option<BottleneckStep>,
    pub by_step: Vec<StepCapacity>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BottleneckStep {
    pub step_name: String,
    pub utilization_rate: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct StepCapacity {
    pub step_name: String,
    pub capacity: f64,
    pub utilization_rate: f64,
}

fn naive_to_utc<T: Into<Option<DateTime<Utc>>>>(dt: T) -> DateTime<Utc> {
    match dt.into() {
        Some(d) => d,
        None => Utc::now(),
    }
}

fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    dt.map(|d| d.to_rfc3339()).unwrap_or_default()
}

fn opt_big_decimal_to_f64(bd: Option<BigDecimal>) -> Option<f64> {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:process:read"])),
    path = "/process-flows",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
pub async fn list_process_flows(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListProcessFlowsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE pf.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE (pf.code ILIKE $1 OR pf.name ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (pf.code ILIKE ${} OR pf.name ILIKE ${})",
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM process_flows pf{}",
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
            tracing::error!("Failed to count process flows: {}", e);
            return Json(ApiResponse::error(500, "获取工艺流程列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            pf.id, pf.code, pf.name, pf.description, pf.version, pf.status,
            pf.route_id, pf.production_line, pf.capacity, pf.unit,
            pf.created_at, pf.updated_at,
            pr.route_name as route_name
        FROM process_flows pf
        LEFT JOIN process_routes pr ON pf.route_id = pr.id
        {}
        ORDER BY pf.created_at DESC
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

    let flows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch process flows: {}", e);
            return Json(ApiResponse::error(500, "获取工艺流程列表失败"));
        }
    };

    let flows: Vec<ProcessFlowResponse> = flows
        .into_iter()
        .map(|r| ProcessFlowResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            code: r.try_get::<String, _>("code").unwrap_or_default(),
            name: r.try_get::<String, _>("name").unwrap_or_default(),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            version: r.try_get::<Option<String>, _>("version").ok().flatten(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "active".to_string()),
            route_id: r
                .try_get::<Option<Uuid>, _>("route_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            route_name: r.try_get::<Option<String>, _>("route_name").ok().flatten(),
            production_line: r
                .try_get::<Option<String>, _>("production_line")
                .ok()
                .flatten(),
            capacity: opt_big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("capacity")
                    .ok()
                    .flatten(),
            ),
            unit: r.try_get::<Option<String>, _>("unit").ok().flatten(),
            created_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
            updated_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
        })
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "flows": flows,
            "total": total.unwrap_or(0),
            "page": page,
            "page_size": page_size,
        }),
        "获取工艺流程列表成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:process:read"])),
    path = "/process-flows/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
pub async fn get_process_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ProcessFlowResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺流程ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            pf.id, pf.code, pf.name, pf.description, pf.version, pf.status,
            pf.route_id, pf.production_line, pf.capacity, pf.unit,
            pf.created_at, pf.updated_at,
            pr.route_name as route_name
        FROM process_flows pf
        LEFT JOIN process_routes pr ON pf.route_id = pr.id
        WHERE pf.id = $1
        "#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            ProcessFlowResponse {
                id: r.id.to_string(),
                code: r.code,
                name: r.name,
                description: r.description,
                version: r.version.map(|v| v.to_string()),
                status: r.status.unwrap_or_else(|| "active".to_string()),
                route_id: r.route_id.map(|u| u.to_string()),
                route_name: Some(r.route_name),
                production_line: r.production_line,
                capacity: r
                    .capacity
                    .map(|d| d.to_string().parse().unwrap_or_default()),
                unit: r.unit,
                created_at: r.created_at.unwrap_or_default(),
                updated_at: r.updated_at.unwrap_or_default(),
            },
            "获取工艺流程成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "工艺流程不存在")),
        Err(e) => {
            tracing::error!("Failed to get process flow: {}", e);
            Json(ApiResponse::error(500, "获取工艺流程失败"))
        }
    }
}

pub async fn create_process_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateProcessFlowRequest>,
) -> Json<ApiResponse<ProcessFlowResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let route_id = body
        .route_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let capacity = body.capacity;

    let result = sqlx::query!(
        r#"
        INSERT INTO process_flows (
            code, name, description, version, route_id,
            production_line, capacity, unit
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, code, name, description, version, status,
            route_id, production_line, capacity, unit,
            created_at, updated_at
        "#,
        body.code,
        body.name,
        body.description,
        body.version,
        route_id,
        body.production_line,
        capacity.map(|d| d.to_string().parse::<BigDecimal>().unwrap_or_default()),
        body.unit,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            ProcessFlowResponse {
                id: r.id.to_string(),
                code: r.code,
                name: r.name,
                description: r.description,
                version: r.version.map(|v| v.to_string()),
                status: r.status.unwrap_or_else(|| "active".to_string()),
                route_id: r.route_id.map(|u| u.to_string()),
                route_name: None,
                production_line: r.production_line,
                capacity: r
                    .capacity
                    .map(|d| d.to_string().parse().unwrap_or_default()),
                unit: r.unit,
                created_at: r.created_at.unwrap_or_default(),
                updated_at: r.updated_at.unwrap_or_default(),
            },
            "创建工艺流程成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create process flow: {}", e);
            Json(ApiResponse::error(500, "创建工艺流程失败"))
        }
    }
}

pub async fn update_process_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateProcessFlowRequest>,
) -> Json<ApiResponse<ProcessFlowResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺流程ID"));
        }
    };

    let route_id = body
        .route_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let capacity = body.capacity;

    let result = sqlx::query!(
        r#"
        UPDATE process_flows
        SET 
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            version = COALESCE($3, version),
            route_id = COALESCE($4, route_id),
            production_line = COALESCE($5, production_line),
            capacity = COALESCE($6, capacity),
            unit = COALESCE($7, unit),
            status = COALESCE($8, status),
            updated_at = NOW()
        WHERE id = $9
        RETURNING id, code, name, description, version, status,
            route_id, production_line, capacity, unit,
            created_at, updated_at
        "#,
        body.name,
        body.description,
        body.version,
        route_id,
        body.production_line,
        capacity.map(|d| d.to_string().parse::<BigDecimal>().unwrap_or_default()),
        body.unit,
        body.status,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            ProcessFlowResponse {
                id: r.id.to_string(),
                code: r.code,
                name: r.name,
                description: r.description,
                version: r.version.map(|v| v.to_string()),
                status: r.status.unwrap_or_else(|| "active".to_string()),
                route_id: r.route_id.map(|u| u.to_string()),
                route_name: None,
                production_line: r.production_line,
                capacity: r
                    .capacity
                    .map(|d| d.to_string().parse().unwrap_or_default()),
                unit: r.unit,
                created_at: r.created_at.unwrap_or_default(),
                updated_at: r.updated_at.unwrap_or_default(),
            },
            "更新工艺流程成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "工艺流程不存在")),
        Err(e) => {
            tracing::error!("Failed to update process flow: {}", e);
            Json(ApiResponse::error(500, "更新工艺流程失败"))
        }
    }
}

pub async fn delete_process_flow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺流程ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE process_flows SET deleted_at = NOW() WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除工艺流程成功")),
        Err(e) => {
            tracing::error!("Failed to delete process flow: {}", e);
            Json(ApiResponse::error(500, "删除工艺流程失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:process:read"])),
    path = "/process-flows/{id}/steps",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
pub async fn get_flow_steps(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let flow_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺流程ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            pfs.id, pfs.flow_id, pfs.process_id, pfs.sequence,
            pfs.work_station_id, pfs.equipment_ids,
            pfs.standard_time, pfs.wait_time, pfs.transfer_time,
            pfs.quality_check_required, pfs.description, pfs.created_at,
            pp.process_name as process_name, pp.process_code as process_code,
            ws.station_name as work_station_name
        FROM process_flow_steps pfs
        LEFT JOIN production_processes pp ON pfs.process_id = pp.id
        LEFT JOIN work_stations ws ON pfs.work_station_id = ws.id
        WHERE pfs.flow_id = $1
        ORDER BY pfs.sequence ASC
        "#,
        flow_uuid,
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(steps) => {
            let step_responses: Vec<ProcessFlowStepResponse> = steps
                .into_iter()
                .map(|s| ProcessFlowStepResponse {
                    id: s.id.to_string(),
                    flow_id: s.flow_id.to_string(),
                    process_id: s.process_id.to_string(),
                    process_name: s.process_name,
                    process_code: s.process_code.unwrap_or_default(),
                    sequence: s.sequence,
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: Some(s.work_station_name),
                    equipment_ids: Some(
                        serde_json::to_string(&s.equipment_ids).unwrap_or_default(),
                    ),
                    standard_time: s
                        .standard_time
                        .map(|d| d.to_string().parse().unwrap_or_default()),
                    wait_time: s
                        .wait_time
                        .map(|d| d.to_string().parse().unwrap_or_default()),
                    transfer_time: s.transfer_time.map(|t| t.to_string()),
                    quality_check_required: s.quality_check_required,
                    description: s.description,
                    created_at: s.created_at.unwrap_or_default(),
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({ "steps": step_responses }),
                "获取工艺步骤成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to get flow steps: {}", e);
            Json(ApiResponse::error(500, "获取工艺步骤失败"))
        }
    }
}

pub async fn add_flow_step(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<AddProcessFlowStepRequest>,
) -> Json<ApiResponse<ProcessFlowStepResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let flow_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺流程ID"));
        }
    };

    let process_uuid = match Uuid::parse_str(&body.process_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工序ID"));
        }
    };

    let work_station_uuid = body
        .work_station_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let standard_time = body
        .standard_time
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let wait_time = body
        .wait_time
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let transfer_time = body.transfer_time.as_ref().and_then(|s| {
        NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
            .map(|dt| dt.and_utc())
            .ok()
            .or_else(|| {
                DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            })
            .or_else(|| {
                s.parse::<chrono::NaiveDate>()
                    .ok()
                    .and_then(|d| d.and_hms_opt(0, 0, 0).map(|dt| dt.and_utc()))
            })
    });
    let equipment_ids: Option<Vec<Uuid>> = body.equipment_ids.map(|ids| {
        ids.into_iter()
            .filter_map(|id| Uuid::parse_str(&id).ok())
            .collect()
    });

    let result = sqlx::query_unchecked!(
        r#"
        INSERT INTO process_flow_steps (
            flow_id, process_id, sequence, work_station_id,
            equipment_ids, standard_time, wait_time, transfer_time,
            quality_check_required, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, flow_id, process_id, sequence,
            work_station_id, equipment_ids,
            standard_time, wait_time, transfer_time,
            quality_check_required, description, created_at
        "#,
        flow_uuid,
        process_uuid,
        body.sequence,
        work_station_uuid,
        equipment_ids
            .as_ref()
            .map(|ids| serde_json::to_string(ids).unwrap_or_default()),
        standard_time,
        wait_time,
        transfer_time,
        body.quality_check_required,
        body.description,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(s) => {
            let process_info = sqlx::query!(
                r#"
                SELECT process_name AS name, process_code AS process_no FROM production_processes WHERE id = $1
                "#,
                process_uuid,
            )
            .fetch_one(&state.pool)
            .await;

            let (process_name, process_code) = match process_info {
                Ok(p) => (Some(p.name), p.process_no.unwrap_or_default()),
                Err(_) => (None, String::new()),
            };

            Json(ApiResponse::success(
                ProcessFlowStepResponse {
                    id: s.id.to_string(),
                    flow_id: s.flow_id.to_string(),
                    process_id: s.process_id.to_string(),
                    process_name: process_name.unwrap_or_default(),
                    process_code,
                    sequence: s.sequence,
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: None,
                    equipment_ids: Some(
                        serde_json::to_string(&s.equipment_ids).unwrap_or_default(),
                    ),
                    standard_time: s
                        .standard_time
                        .map(|d| d.to_string().parse().unwrap_or_default()),
                    wait_time: s
                        .wait_time
                        .map(|d| d.to_string().parse().unwrap_or_default()),
                    transfer_time: s.transfer_time.map(|t| t.to_string()),
                    quality_check_required: s.quality_check_required,
                    description: s.description,
                    created_at: s.created_at.unwrap_or_default(),
                },
                "添加工艺步骤成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to add flow step: {}", e);
            Json(ApiResponse::error(500, "添加工艺步骤失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:process:write"])),
    path = "/process-flows/{id}/steps/{step_id}",
    params(
("id" = String, Path, description = "id"),
("step_id" = String, Path, description = "step_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
pub async fn update_flow_step(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((_id, step_id)): Path<(String, String)>,
    Json(body): Json<UpdateProcessFlowStepRequest>,
) -> Json<ApiResponse<ProcessFlowStepResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let step_uuid = match Uuid::parse_str(&step_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的步骤ID"));
        }
    };

    let work_station_uuid = body
        .work_station_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let standard_time = body
        .standard_time
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let wait_time = body
        .wait_time
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let transfer_time = body.transfer_time.as_ref().and_then(|s| {
        NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
            .map(|dt| dt.and_utc())
            .ok()
            .or_else(|| {
                DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            })
            .or_else(|| {
                s.parse::<chrono::NaiveDate>()
                    .ok()
                    .and_then(|d| d.and_hms_opt(0, 0, 0).map(|dt| dt.and_utc()))
            })
    });
    let equipment_ids: Option<Vec<Uuid>> = body.equipment_ids.map(|ids| {
        ids.into_iter()
            .filter_map(|id| Uuid::parse_str(&id).ok())
            .collect()
    });

    let result = sqlx::query_unchecked!(
        r#"
        UPDATE process_flow_steps
        SET
            sequence = COALESCE($1, sequence),
            work_station_id = COALESCE($2, work_station_id),
            equipment_ids = COALESCE($3, equipment_ids),
            standard_time = COALESCE($4, standard_time),
            wait_time = COALESCE($5, wait_time),
            transfer_time = COALESCE($6, transfer_time),
            quality_check_required = COALESCE($7, quality_check_required),
            description = COALESCE($8, description)
        WHERE id = $9
        RETURNING id, flow_id, process_id, sequence,
            work_station_id, equipment_ids,
            standard_time, wait_time, transfer_time,
            quality_check_required, description, created_at
        "#,
        body.sequence,
        work_station_uuid,
        equipment_ids
            .as_ref()
            .map(|ids| serde_json::to_string(ids).unwrap_or_default()),
        standard_time,
        wait_time,
        transfer_time,
        body.quality_check_required,
        body.description,
        step_uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(s) => {
            let process_info = sqlx::query!(
                r#"
                SELECT process_name AS name, process_code AS process_no FROM production_processes WHERE id = $1
                "#,
                s.process_id,
            )
            .fetch_one(&state.pool)
            .await;

            let (process_name, process_code) = match process_info {
                Ok(p) => (Some(p.name), p.process_no.unwrap_or_default()),
                Err(_) => (None, String::new()),
            };

            Json(ApiResponse::success(
                ProcessFlowStepResponse {
                    id: s.id.to_string(),
                    flow_id: s.flow_id.to_string(),
                    process_id: s.process_id.to_string(),
                    process_name: process_name.unwrap_or_default(),
                    process_code,
                    sequence: s.sequence,
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: None,
                    equipment_ids: Some(
                        serde_json::to_string(&s.equipment_ids).unwrap_or_default(),
                    ),
                    standard_time: s
                        .standard_time
                        .map(|d| d.to_string().parse().unwrap_or_default()),
                    wait_time: s
                        .wait_time
                        .map(|d| d.to_string().parse().unwrap_or_default()),
                    transfer_time: s.transfer_time.map(|t| t.to_string()),
                    quality_check_required: s.quality_check_required,
                    description: s.description,
                    created_at: s.created_at.unwrap_or_default(),
                },
                "更新工艺步骤成功",
            ))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "工艺步骤不存在")),
        Err(e) => {
            tracing::error!("Failed to update flow step: {}", e);
            Json(ApiResponse::error(500, "更新工艺步骤失败"))
        }
    }
}

pub async fn remove_flow_step(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((_id, step_id)): Path<(String, String)>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let step_uuid = match Uuid::parse_str(&step_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的步骤ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        DELETE FROM process_flow_steps WHERE id = $1
        "#,
        step_uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(step_id, "删除工艺步骤成功")),
        Err(e) => {
            tracing::error!("Failed to remove flow step: {}", e);
            Json(ApiResponse::error(500, "删除工艺步骤失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:process:write"])),
    path = "/process-flows/{id}/steps/reorder",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
pub async fn reorder_flow_steps(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<ReorderFlowStepsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let flow_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺流程ID"));
        }
    };

    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "重排序工艺流程步骤失败"));
        }
    };

    for (idx, step_uuid) in body.step_ids.iter().enumerate() {
        if let Err(e) = sqlx::query!(
            r#"
            UPDATE process_flow_steps
            SET sequence = $1
            WHERE id = $2 AND flow_id = $3
            "#,
            (idx + 1) as i32,
            step_uuid,
            flow_uuid,
        )
        .execute(&mut *tx)
        .await
        {
            tracing::error!("Failed to reorder step: {}", e);
            return Json(ApiResponse::error(500, "重排序工艺流程步骤失败"));
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "重排序工艺流程步骤失败"));
    }

    let result = sqlx::query!(
        r#"
        SELECT
            pfs.id, pfs.flow_id, pfs.process_id, pfs.sequence,
            pfs.work_station_id, pfs.equipment_ids,
            pfs.standard_time, pfs.wait_time, pfs.transfer_time,
            pfs.quality_check_required, pfs.description, pfs.created_at,
            pp.process_name as process_name, pp.process_code as process_code,
            ws.station_name as work_station_name
        FROM process_flow_steps pfs
        LEFT JOIN production_processes pp ON pfs.process_id = pp.id
        LEFT JOIN work_stations ws ON pfs.work_station_id = ws.id
        WHERE pfs.flow_id = $1
        ORDER BY pfs.sequence ASC
        "#,
        flow_uuid,
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(steps) => {
            let step_responses: Vec<ProcessFlowStepResponse> = steps
                .into_iter()
                .map(|s| ProcessFlowStepResponse {
                    id: s.id.to_string(),
                    flow_id: s.flow_id.to_string(),
                    process_id: s.process_id.to_string(),
                    process_name: s.process_name,
                    process_code: s.process_code.unwrap_or_default(),
                    sequence: s.sequence,
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: Some(s.work_station_name),
                    equipment_ids: Some(
                        serde_json::to_string(&s.equipment_ids).unwrap_or_default(),
                    ),
                    standard_time: s
                        .standard_time
                        .map(|d| d.to_string().parse().unwrap_or_default()),
                    wait_time: s
                        .wait_time
                        .map(|d| d.to_string().parse().unwrap_or_default()),
                    transfer_time: s.transfer_time.map(|t| t.to_string()),
                    quality_check_required: s.quality_check_required,
                    description: s.description,
                    created_at: s.created_at.unwrap_or_default(),
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({ "steps": step_responses }),
                "重排序工艺流程步骤成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to fetch reordered steps: {}", e);
            Json(ApiResponse::error(500, "获取重排序后的步骤失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:process:read"])),
    path = "/process-flows/{id}/capacity",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Process"
)]
pub async fn analyze_capacity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<CapacityAnalysisResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let flow_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺流程ID"));
        }
    };

    let flow_result = sqlx::query!(
        r#"
        SELECT id, name, capacity FROM process_flows WHERE deleted_at IS NULL AND id = $1
        "#,
        flow_uuid,
    )
    .fetch_one(&state.pool)
    .await;

    let flow = match flow_result {
        Ok(f) => f,
        Err(sqlx::Error::RowNotFound) => {
            return Json(ApiResponse::error(404, "工艺流程不存在"));
        }
        Err(e) => {
            tracing::error!("Failed to get process flow: {}", e);
            return Json(ApiResponse::error(500, "产能分析失败"));
        }
    };

    let steps_result = sqlx::query!(
        r#"
        SELECT 
            pfs.id, pfs.sequence, pfs.standard_time,
            pp.process_name as process_name
        FROM process_flow_steps pfs
        LEFT JOIN production_processes pp ON pfs.process_id = pp.id
        WHERE pfs.flow_id = $1
        ORDER BY pfs.sequence ASC
        "#,
        flow_uuid,
    )
    .fetch_all(&state.pool)
    .await;

    let steps = match steps_result {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to get flow steps: {}", e);
            return Json(ApiResponse::error(500, "产能分析失败"));
        }
    };

    let total_time: f64 = steps
        .iter()
        .map(|s| {
            s.standard_time
                .clone()
                .unwrap_or(BigDecimal::from(0))
                .to_string()
                .parse::<f64>()
                .unwrap_or_default()
        })
        .sum();

    let flow_capacity = flow.capacity.clone().unwrap_or(BigDecimal::from(0));
    let theoretical_capacity = if total_time > 0.0 {
        480.0 / total_time
    } else {
        0.0
    };

    let effective_capacity = theoretical_capacity * 0.85;
    let utilization_rate = if theoretical_capacity > 0.0 && flow_capacity > BigDecimal::from(0) {
        (flow_capacity.to_string().parse::<f64>().unwrap_or_default() / theoretical_capacity)
            * 100.0
    } else {
        0.0
    };

    let mut by_step: Vec<StepCapacity> = Vec::new();
    let mut bottleneck: Option<BottleneckStep> = None;
    let mut max_utilization = 0.0;

    for step in &steps {
        let step_time = step.standard_time.clone().unwrap_or(BigDecimal::from(0));
        let step_capacity = if step_time > BigDecimal::from(0) {
            480.0 / step_time.to_string().parse::<f64>().unwrap_or_default()
        } else {
            0.0
        };
        let step_utilization = if step_capacity > 0.0 && flow_capacity > BigDecimal::from(0) {
            (flow_capacity.to_string().parse::<f64>().unwrap_or_default() / step_capacity) * 100.0
        } else {
            0.0
        };

        if step_utilization > max_utilization {
            max_utilization = step_utilization;
            bottleneck = Some(BottleneckStep {
                step_name: step.process_name.clone(),
                utilization_rate: step_utilization,
            });
        }

        by_step.push(StepCapacity {
            step_name: step.process_name.clone(),
            capacity: step_capacity,
            utilization_rate: step_utilization,
        });
    }

    Json(ApiResponse::success(
        CapacityAnalysisResponse {
            flow_id: flow.id.to_string(),
            flow_name: flow.name,
            theoretical_capacity,
            effective_capacity,
            utilization_rate,
            bottleneck_step: bottleneck,
            by_step,
        },
        "产能分析成功",
    ))
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
        let utc = naive_to_utc(Some(dt.and_utc()));
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
        let s = datetime_to_string(Some(dt.and_utc()));
        assert!(s.starts_with("2024-03-01T00:00:00"), "got {}", s);
    }

    #[test]
    fn datetime_to_string_none_valid() {
        let s = datetime_to_string(None);
        assert!(s.is_empty());
    }

    #[test]
    fn opt_big_decimal_to_f64_some() {
        let bd: BigDecimal = "12.5".parse().unwrap();
        assert_eq!(opt_big_decimal_to_f64(Some(bd)), Some(12.5));
    }

    #[test]
    fn opt_big_decimal_to_f64_none() {
        assert_eq!(opt_big_decimal_to_f64(None), None);
    }
}
