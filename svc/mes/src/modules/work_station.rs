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
use topems_shared_auth::middleware::get_tenant_id_from_claims as get_tenant_id;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use crate::modules::work_station_status::WorkStationStatus;
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
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListWorkStationsResponse {
    pub workstations: Vec<WorkStationResponse>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
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
    }
}

// ==================== Work Station Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:equipment:read"])),
    path = "/workstations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Equipment"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn list_work_stations(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListWorkStationsQuery>,
) -> ApiResponse<ListWorkStationsResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;
    // 租户作用域读：work_stations 受 RLS 保护，裸 pool 无 app.tenant_id GUC 会返回 0 行。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取工位列表失败");
        }
    };

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(
        " WHERE ws.deleted_at IS NULL AND ws.status IN ('available','active','inactive')",
    );

    if let Some(status) = query.status.as_deref() {
        let parsed = match WorkStationStatus::from_db_str(status) {
            Some(v) => v,
            None => return ApiResponse::bad_request("无效的工位状态"),
        };
        where_clause.push_str(" AND ws.status = $1");
        params.push(serde_json::Value::String(parsed.as_db_str().to_string()));
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

    // tenant 隔离（读路径 Claims bind，nil=全见）
    let tenant_ph = params.len() + 1;
    let tenant_filter = format!("ws.tenant_id = ${}::uuid", tenant_ph);
    if where_clause.is_empty() {
        where_clause.push_str(&format!(" WHERE {}", tenant_filter));
    } else {
        where_clause.push_str(&format!(" AND {}", tenant_filter));
    }
    let tenant_uuid = get_tenant_id(&claims);

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM mes.work_stations ws{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        count_query = count_query.bind(p.as_str().unwrap_or(""));
    }
    count_query = count_query.bind(tenant_uuid);

    let count_result = count_query.fetch_one(&mut scope).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count work stations: {}", e);
            return ApiResponse::server_error("获取工位列表失败");
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
        FROM mes.work_stations ws
        LEFT JOIN mes.equipment e ON ws.equipment_id = e.id
        LEFT JOIN mes.production_processes pp ON ws.process_id = pp.id
        {}
        ORDER BY ws.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        // tenant 隔离占 1 位，LIMIT/OFFSET 顺延 N+1/N+2（无筛选时 LIMIT $1 会复用 tenant_uuid → uuid 类型错误 → 500）
        params.len() + 2,
        params.len() + 3
    );

    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(tenant_uuid).bind(page_size).bind(offset);

    let workstations = match fetch_query.fetch_all(&mut scope).await {
        Ok(w) => w,
        Err(e) => {
            tracing::error!("Failed to fetch work stations: {}", e);
            return ApiResponse::server_error("获取工位列表失败");
        }
    };

    let workstation_list: Vec<WorkStationResponse> = workstations
        .iter()
        .map(row_to_workstation_response)
        .collect();

    ApiResponse::success(
        ListWorkStationsResponse {
            workstations: workstation_list,
            total: total.unwrap_or(0),
            page: page as i32,
            page_size: page_size as i32,
        },
        "获取工位列表成功",
    )
}

pub async fn create_work_station(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateWorkStationRequest>,
) -> ApiResponse<WorkStationResponse> {
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
    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("创建工位失败");
        }
    };

    let result = sqlx::query(
        r#"
        INSERT INTO mes.work_stations (
            station_no, station_name, workshop_id, location, status,
            capacity, equipment_id, process_id, description,
            created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11)
        RETURNING
            id, station_no, station_name, workshop_id, location,
            status, capacity, equipment_id, process_id,
            description, created_at, updated_at
        "#,
    )
    .bind(&station_no)
    .bind(&req.name)
    .bind(workshop_id)
    .bind(&req.location)
    .bind(WorkStationStatus::DEFAULT.as_db_str())
    .bind(req.capacity.unwrap_or(1))
    .bind(equipment_id)
    .bind(process_id)
    .bind(&req.description)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create work station: {}", e);
            return ApiResponse::server_error("创建工位失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交工位事务失败: {}", e);
        return ApiResponse::server_error("创建工位失败");
    }

    ApiResponse::success(row_to_workstation_response(&row), "工位创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:equipment:read"])),
    path = "/workstations/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Equipment"
)]
pub async fn get_work_station(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<WorkStationResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取工位失败");
        }
    };

    let result = sqlx::query(
        r#"
        SELECT 
            ws.id, ws.station_no, ws.station_name, ws.workshop_id, ws.location,
            ws.status, ws.capacity, ws.equipment_id, ws.process_id,
            ws.description, ws.created_at, ws.updated_at,
            e.equipment_name as equipment_name,
            pp.process_name as process_name,
            '' as workshop_name
        FROM mes.work_stations ws
        LEFT JOIN mes.equipment e ON ws.equipment_id = e.id
        LEFT JOIN mes.production_processes pp ON ws.process_id = pp.id
        WHERE ws.id = $1 AND ws.status IN ('available','active','inactive')
        "#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch work station: {}", e);
            return ApiResponse::server_error("获取工位失败");
        }
    };

    match result {
        Some(row) => ApiResponse::success(row_to_workstation_response(&row), "获取工位成功"),
        None => ApiResponse::not_found("工位不存在"),
    }
}

pub async fn update_work_station(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWorkStationRequest>,
) -> ApiResponse<WorkStationResponse> {
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

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("更新工位失败");
        }
    };

    let status_value = match req.status.as_deref() {
        Some(raw) => match WorkStationStatus::from_db_str(raw) {
            Some(v) => Some(v.as_db_str().to_string()),
            None => return ApiResponse::bad_request("无效的工位状态"),
        },
        None => None,
    };

    let result = sqlx::query(
        r#"
        UPDATE mes.work_stations SET
            station_name = COALESCE($2, station_name),
            workshop_id = COALESCE($3, workshop_id),
            location = COALESCE($4, location),
            status = COALESCE($5, status),
            capacity = COALESCE($6, capacity),
            equipment_id = COALESCE($7, equipment_id),
            process_id = COALESCE($8, process_id),
            description = COALESCE($9, description),
            updated_at = $10
        WHERE id = $1
          AND tenant_id = $11::uuid
        RETURNING 
            id, station_no, station_name AS name, workshop_id, location,
            status, capacity, equipment_id, process_id,
            description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(workshop_id)
    .bind(&req.location)
    .bind(status_value)
    .bind(req.capacity)
    .bind(equipment_id)
    .bind(process_id)
    .bind(&req.description)
    .bind(Utc::now())
    .bind(get_tenant_id(&claims))
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update work station: {}", e);
            return ApiResponse::server_error("更新工位失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交工位事务失败: {}", e);
        return ApiResponse::server_error("更新工位失败");
    }

    match result {
        Some(row) => ApiResponse::success(row_to_workstation_response(&row), "工位更新成功"),
        None => ApiResponse::not_found("工位不存在"),
    }
}

pub async fn delete_work_station(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("删除工位失败");
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE mes.work_stations SET deleted_at = NOW()
        WHERE id = $1
          AND tenant_id = $2::uuid
        "#,
    )
    .bind(id)
    .bind(get_tenant_id(&claims))
    .execute(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete work station: {}", e);
            return ApiResponse::server_error("删除工位失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交工位事务失败: {}", e);
        return ApiResponse::server_error("删除工位失败");
    }

    if result.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "工位删除成功")
    } else {
        ApiResponse::not_found("工位不存在")
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:equipment:write"])),
    path = "/workstations/{id}/activate",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Equipment"
)]
pub async fn activate_work_station(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<WorkStationResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("激活工位失败");
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE mes.work_stations SET
            status = $4,
            updated_at = $2
        WHERE id = $1
          AND tenant_id = $3::uuid
        RETURNING 
            id, station_no, station_name AS name, workshop_id, location,
            status, capacity, equipment_id, process_id,
            description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(Utc::now())
    .bind(get_tenant_id(&claims))
    .bind(WorkStationStatus::Active.as_db_str())
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to activate work station: {}", e);
            return ApiResponse::server_error("激活工位失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交工位事务失败: {}", e);
        return ApiResponse::server_error("激活工位失败");
    }

    match result {
        Some(row) => ApiResponse::success(row_to_workstation_response(&row), "工位激活成功"),
        None => ApiResponse::not_found("工位不存在"),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:equipment:write"])),
    path = "/workstations/{id}/deactivate",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Equipment"
)]
pub async fn deactivate_work_station(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<WorkStationResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("停用工位失败");
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE mes.work_stations SET
            status = $4,
            updated_at = $2
        WHERE id = $1 AND status = ANY($5)
          AND tenant_id = $3::uuid
        RETURNING 
            id, station_no, station_name AS name, workshop_id, location,
            status, capacity, equipment_id, process_id,
            description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(Utc::now())
    .bind(get_tenant_id(&claims))
    .bind(WorkStationStatus::Inactive.as_db_str())
    .bind(WorkStationStatus::deactivate_from())
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to deactivate work station: {}", e);
            return ApiResponse::server_error("停用工位失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("提交工位事务失败: {}", e);
        return ApiResponse::server_error("停用工位失败");
    }

    match result {
        Some(row) => ApiResponse::success(row_to_workstation_response(&row), "工位停用成功"),
        None => ApiResponse::conflict("工位不存在或状态不允许停用"),
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 7, 1, 9, 45, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.date_naive(), dt.date_naive());
        assert_eq!(utc.time(), dt.time());
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
        let dt = Utc.with_ymd_and_hms(2024, 3, 1, 0, 0, 0).unwrap();
        let s = datetime_to_string(Some(dt));
        assert!(s.starts_with("2024-03-01T00:00:00"), "got {}", s);
    }

    #[test]
    fn datetime_to_string_none_valid() {
        let s = datetime_to_string(None);
        assert!(s.is_empty());
    }
}
