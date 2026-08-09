use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
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
            "/process-routes",
            get(list_process_routes).post(create_process_route),
        )
        .route(
            "/process-routes/{id}",
            get(get_process_route)
                .put(update_process_route)
                .delete(delete_process_route),
        )
        .route(
            "/process-routes/{id}/steps",
            get(get_route_steps).post(add_route_step),
        )
        .route(
            "/process-routes/{id}/steps/reorder",
            put(reorder_route_steps),
        )
        .route(
            "/process-routes/{id}/steps/{step_id}",
            put(update_route_step).delete(remove_route_step),
        )
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListProcessRoutesQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProcessRouteRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub standard_time: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProcessRouteRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub standard_time: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessRouteResponse {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: String,
    pub standard_time: Option<f64>,
    pub total_standard_time: Option<f64>,
    pub process_count: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AddProcessRouteStepRequest {
    pub process_id: String,
    pub sequence: i32,
    pub standard_time: Option<f64>,
    pub work_station_id: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProcessRouteStepRequest {
    pub sequence: Option<i32>,
    pub standard_time: Option<f64>,
    pub work_station_id: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReorderStepsRequest {
    pub step_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessRouteStepResponse {
    pub id: String,
    pub route_id: String,
    pub process_id: String,
    pub process_name: String,
    pub process_code: String,
    pub sequence: i32,
    pub standard_time: Option<f64>,
    pub work_station_id: Option<String>,
    pub work_station_name: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    match dt {
        Some(d) => Utc.from_utc_datetime(&d),
        None => Utc::now(),
    }
}

fn datetime_to_string(dt: Option<NaiveDateTime>) -> String {
    naive_to_utc(dt).to_rfc3339()
}

fn opt_big_decimal_to_f64(bd: Option<BigDecimal>) -> Option<f64> {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
}

pub async fn list_process_routes(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListProcessRoutesQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE pr.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE (pr.code ILIKE $1 OR pr.name ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (pr.code ILIKE ${} OR pr.name ILIKE ${})",
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM process_routes pr{}",
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
            tracing::error!("Failed to count process routes: {}", e);
            return Json(ApiResponse::error(500, "获取工艺路线列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            pr.id, pr.code, pr.name, pr.description, pr.status,
            pr.created_at, pr.updated_at
        FROM process_routes pr
        {}
        ORDER BY pr.created_at DESC
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
    fetch_query = fetch_query.bind(pagesize).bind(offset);

    let routes = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch process routes: {}", e);
            return Json(ApiResponse::error(500, "获取工艺路线列表失败"));
        }
    };

    let routes: Vec<ProcessRouteResponse> = routes
        .into_iter()
        .map(|r| ProcessRouteResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            code: r.try_get::<String, _>("code").unwrap_or_default(),
            name: r.try_get::<String, _>("name").unwrap_or_default(),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            version: None,
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "active".to_string()),
            standard_time: None,
            total_standard_time: None,
            process_count: None,
            created_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "routes": routes,
            "total": total.unwrap_or(0),
            "page": page,
            "pagesize": pagesize,
        }),
        "获取工艺路线列表成功",
    ))
}

pub async fn get_process_route(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ProcessRouteResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺路线ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            pr.id, pr.code, pr.name, pr.description, pr.status,
            pr.created_at, pr.updated_at
        FROM process_routes pr
        WHERE pr.id = $1
        "#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => {
            let step_stats = sqlx::query(
                r#"
                SELECT 
                    COALESCE(SUM(prs.standard_time), 0) as total_standard_time,
                    COUNT(prs.id) as process_count
                FROM process_route_steps prs
                WHERE prs.route_id = $1
                "#,
            )
            .bind(uuid)
            .fetch_one(&state.pool)
            .await;

            let (total_standard_time, process_count) = match step_stats {
                Ok(s) => {
                    let tst = s
                        .try_get::<BigDecimal, _>("total_standard_time")
                        .ok()
                        .and_then(|d| d.to_string().parse::<f64>().ok());
                    let pc = s.try_get::<i64, _>("process_count").ok();
                    (tst, pc)
                }
                Err(_) => (None, None),
            };

            Json(ApiResponse::success(
                ProcessRouteResponse {
                    id: r.id.to_string(),
                    code: r.code,
                    name: r.name,
                    description: r.description,
                    version: None,
                    status: r.status.unwrap_or_else(|| "active".to_string()),
                    standard_time: None,
                    total_standard_time,
                    process_count,
                    created_at: datetime_to_string(r.created_at),
                    updated_at: datetime_to_string(r.updated_at),
                },
                "获取工艺路线成功",
            ))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "工艺路线不存在")),
        Err(e) => {
            tracing::error!("Failed to get process route: {}", e);
            Json(ApiResponse::error(500, "获取工艺路线失败"))
        }
    }
}

pub async fn create_process_route(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateProcessRouteRequest>,
) -> Json<ApiResponse<ProcessRouteResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        INSERT INTO process_routes (code, name, description)
        VALUES ($1, $2, $3)
        RETURNING id, code, name, description, status,
            created_at, updated_at
        "#,
        body.code,
        body.name,
        body.description,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            ProcessRouteResponse {
                id: r.id.to_string(),
                code: r.code,
                name: r.name,
                description: r.description,
                version: None,
                status: r.status.unwrap_or_else(|| "active".to_string()),
                standard_time: None,
                total_standard_time: None,
                process_count: None,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "创建工艺路线成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create process route: {}", e);
            Json(ApiResponse::error(500, "创建工艺路线失败"))
        }
    }
}

pub async fn update_process_route(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateProcessRouteRequest>,
) -> Json<ApiResponse<ProcessRouteResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺路线ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE process_routes
        SET 
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            status = COALESCE($3, status),
            updated_at = NOW()
        WHERE id = $4
        RETURNING id, code, name, description, status,
            created_at, updated_at
        "#,
        body.name,
        body.description,
        body.status,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            ProcessRouteResponse {
                id: r.id.to_string(),
                code: r.code,
                name: r.name,
                description: r.description,
                version: None,
                status: r.status.unwrap_or_else(|| "active".to_string()),
                standard_time: None,
                total_standard_time: None,
                process_count: None,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "更新工艺路线成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "工艺路线不存在")),
        Err(e) => {
            tracing::error!("Failed to update process route: {}", e);
            Json(ApiResponse::error(500, "更新工艺路线失败"))
        }
    }
}

pub async fn delete_process_route(
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
            return Json(ApiResponse::error(400, "无效的工艺路线ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE process_routes SET deleted_at = NOW() WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除工艺路线成功")),
        Err(e) => {
            tracing::error!("Failed to delete process route: {}", e);
            Json(ApiResponse::error(500, "删除工艺路线失败"))
        }
    }
}

pub async fn get_route_steps(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let route_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺路线ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            prs.id, prs.route_id, prs.process_id, prs.sequence,
            prs.standard_time, prs.work_station_id,
            prs.description, prs.created_at,
            pp.name as process_name, pp.process_no as process_code,
            ws.name as work_station_name
        FROM process_route_steps prs
        LEFT JOIN production_processes pp ON prs.process_id = pp.id
        LEFT JOIN work_stations ws ON prs.work_station_id = ws.id
        WHERE prs.route_id = $1
        ORDER BY prs.sequence ASC
        "#,
        route_uuid,
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(steps) => {
            let step_responses: Vec<ProcessRouteStepResponse> = steps
                .into_iter()
                .map(|s| ProcessRouteStepResponse {
                    id: s.id.to_string(),
                    route_id: s.route_id.map(|u| u.to_string()).unwrap_or_default(),
                    process_id: s.process_id.unwrap_or_default().to_string(),
                    process_name: s.process_name,
                    process_code: s.process_code,
                    sequence: s.sequence,
                    standard_time: opt_big_decimal_to_f64(s.standard_time),
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: Some(s.work_station_name),
                    description: s.description,
                    created_at: datetime_to_string(s.created_at),
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({ "steps": step_responses }),
                "获取工艺路线步骤成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to get route steps: {}", e);
            Json(ApiResponse::error(500, "获取工艺路线步骤失败"))
        }
    }
}

pub async fn add_route_step(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<AddProcessRouteStepRequest>,
) -> Json<ApiResponse<ProcessRouteStepResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let route_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺路线ID"));
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

    let result = sqlx::query!(
        r#"
        INSERT INTO process_route_steps (
            route_id, process_id, sequence, standard_time,
            work_station_id, description
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, route_id, process_id, sequence,
            standard_time, work_station_id,
            description, created_at
        "#,
        route_uuid,
        process_uuid,
        body.sequence,
        standard_time,
        work_station_uuid,
        body.description,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(s) => {
            let process_info = sqlx::query!(
                r#"
                SELECT name, process_no FROM production_processes WHERE id = $1
                "#,
                process_uuid,
            )
            .fetch_one(&state.pool)
            .await;

            let (process_name, process_code) = match process_info {
                Ok(p) => (p.name, p.process_no),
                Err(_) => (String::new(), String::new()),
            };

            Json(ApiResponse::success(
                ProcessRouteStepResponse {
                    id: s.id.to_string(),
                    route_id: s.route_id.map(|u| u.to_string()).unwrap_or_default(),
                    process_id: s.process_id.map(|u| u.to_string()).unwrap_or_default(),
                    process_name,
                    process_code,
                    sequence: s.sequence,
                    standard_time: opt_big_decimal_to_f64(s.standard_time),
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: None,
                    description: s.description,
                    created_at: datetime_to_string(s.created_at),
                },
                "添加工艺路线步骤成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to add route step: {}", e);
            Json(ApiResponse::error(500, "添加工艺路线步骤失败"))
        }
    }
}

pub async fn update_route_step(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((_id, step_id)): Path<(String, String)>,
    Json(body): Json<UpdateProcessRouteStepRequest>,
) -> Json<ApiResponse<ProcessRouteStepResponse>> {
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

    let result = sqlx::query!(
        r#"
        UPDATE process_route_steps
        SET 
            sequence = COALESCE($1, sequence),
            standard_time = COALESCE($2, standard_time),
            work_station_id = COALESCE($3, work_station_id),
            description = COALESCE($4, description)
        WHERE id = $5
        RETURNING id, route_id, process_id, sequence,
            standard_time, work_station_id,
            description, created_at
        "#,
        body.sequence,
        standard_time,
        work_station_uuid,
        body.description,
        step_uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(s) => {
            let process_info = sqlx::query!(
                r#"
                SELECT name, process_no FROM production_processes WHERE id = $1
                "#,
                s.process_id,
            )
            .fetch_one(&state.pool)
            .await;

            let (process_name, process_code) = match process_info {
                Ok(p) => (p.name, p.process_no),
                Err(_) => (String::new(), String::new()),
            };

            Json(ApiResponse::success(
                ProcessRouteStepResponse {
                    id: s.id.to_string(),
                    route_id: s.route_id.map(|u| u.to_string()).unwrap_or_default(),
                    process_id: s.process_id.map(|u| u.to_string()).unwrap_or_default(),
                    process_name,
                    process_code,
                    sequence: s.sequence,
                    standard_time: opt_big_decimal_to_f64(s.standard_time),
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: None,
                    description: s.description,
                    created_at: datetime_to_string(s.created_at),
                },
                "更新工艺路线步骤成功",
            ))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "工艺路线步骤不存在")),
        Err(e) => {
            tracing::error!("Failed to update route step: {}", e);
            Json(ApiResponse::error(500, "更新工艺路线步骤失败"))
        }
    }
}

pub async fn remove_route_step(
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
        DELETE FROM process_route_steps WHERE id = $1
        "#,
        step_uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(step_id, "删除工艺路线步骤成功")),
        Err(e) => {
            tracing::error!("Failed to remove route step: {}", e);
            Json(ApiResponse::error(500, "删除工艺路线步骤失败"))
        }
    }
}

pub async fn reorder_route_steps(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<ReorderStepsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let route_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工艺路线ID"));
        }
    };

    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "重排序工艺路线步骤失败"));
        }
    };

    for (idx, step_id) in body.step_ids.iter().enumerate() {
        let step_uuid = match Uuid::parse_str(step_id) {
            Ok(u) => u,
            Err(_) => {
                return Json(ApiResponse::error(400, "无效的步骤ID"));
            }
        };

        if let Err(e) = sqlx::query!(
            r#"
            UPDATE process_route_steps
            SET sequence = $1
            WHERE id = $2 AND route_id = $3
            "#,
            (idx + 1) as i32,
            step_uuid,
            route_uuid,
        )
        .execute(&mut *tx)
        .await
        {
            tracing::error!("Failed to reorder step: {}", e);
            return Json(ApiResponse::error(500, "重排序工艺路线步骤失败"));
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "重排序工艺路线步骤失败"));
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            prs.id, prs.route_id, prs.process_id, prs.sequence,
            prs.standard_time, prs.work_station_id,
            prs.description, prs.created_at,
            pp.name as process_name, pp.process_no as process_code,
            ws.name as work_station_name
        FROM process_route_steps prs
        LEFT JOIN production_processes pp ON prs.process_id = pp.id
        LEFT JOIN work_stations ws ON prs.work_station_id = ws.id
        WHERE prs.route_id = $1
        ORDER BY prs.sequence ASC
        "#,
        route_uuid,
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(steps) => {
            let step_responses: Vec<ProcessRouteStepResponse> = steps
                .into_iter()
                .map(|s| ProcessRouteStepResponse {
                    id: s.id.to_string(),
                    route_id: s.route_id.map(|u| u.to_string()).unwrap_or_default(),
                    process_id: s.process_id.unwrap_or_default().to_string(),
                    process_name: s.process_name,
                    process_code: s.process_code,
                    sequence: s.sequence,
                    standard_time: opt_big_decimal_to_f64(s.standard_time),
                    work_station_id: s.work_station_id.map(|u| u.to_string()),
                    work_station_name: Some(s.work_station_name),
                    description: s.description,
                    created_at: datetime_to_string(s.created_at),
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({ "steps": step_responses }),
                "重排序工艺路线步骤成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to fetch reordered steps: {}", e);
            Json(ApiResponse::error(500, "获取重排序后的步骤失败"))
        }
    }
}
