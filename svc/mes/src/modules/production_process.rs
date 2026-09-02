//! Production Process handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    http::HeaderMap,
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::shared::tenant;
use crate::AppState;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/processes", get(list_processes).post(create_process))
        .route(
            "/processes/{id}",
            get(get_process).put(update_process).delete(delete_process),
        )
        .route("/processes/{id}/deactivate", put(deactivate_process))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListProcessesQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProcessRequest {
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub sequence: Option<i32>,
    pub equipment_required: Option<bool>,
    pub estimated_duration: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProcessRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub sequence: Option<i32>,
    pub equipment_required: Option<bool>,
    pub estimated_duration: Option<i32>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct ProductionProcessRow {
    pub id: Uuid,
    pub process_no: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
    pub sequence: Option<i32>,
    pub equipment_required: Option<bool>,
    pub estimated_duration: Option<i32>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProductionProcessResponse {
    pub id: Uuid,
    pub process_no: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub status: String,
    pub sequence: i32,
    pub equipment_required: bool,
    pub estimated_duration: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<ProductionProcessRow> for ProductionProcessResponse {
    fn from(r: ProductionProcessRow) -> Self {
        Self {
            id: r.id,
            process_no: r.process_no,
            name: r.name,
            description: r.description,
            version: r.version.unwrap_or_else(|| "1.0".to_string()),
            status: r.status.unwrap_or_else(|| "active".to_string()),
            sequence: r.sequence.unwrap_or_default(),
            equipment_required: false,
            estimated_duration: 0,
            created_at: naive_to_utc(Some(r.created_at)),
            updated_at: naive_to_utc(Some(r.updated_at)),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ListProcessesResponse {
    pub processes: Vec<ProductionProcessResponse>,
    pub total: i64,
    pub page: i64,
    pub pagesize: i64,
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d))
        .unwrap_or_else(Utc::now)
}

// ==================== Production Process Handlers ====================

pub async fn list_processes(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Query(query): Query<ListProcessesQuery>,
) -> Json<ApiResponse<ListProcessesResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProcessRead).await {
        return e;
    }

    let tenant_id = tenant::get_tenant_id(&claims, &headers);
    let _ = tenant::set_session_tenant_id(&state.pool, tenant_id).await;

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10).min(100) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE tenant_id = $1");

    if let Some(status) = query.status {
        let idx = params.len() + 2;
        where_clause.push_str(&format!(" AND status = ${}", idx));
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        let idx = params.len() + 2;
        where_clause.push_str(&format!(
            " AND (process_no ILIKE ${} OR name ILIKE ${} OR description ILIKE ${})",
            idx, idx, idx
        ));
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM production_processes{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(&count_sql);
    count_query = count_query.bind(tenant_id);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count processes: {}", e);
            return Json(ApiResponse::error(500, "获取生产工序列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT
            id, process_no, name, description, version,
            status, sequence, equipment_required, estimated_duration,
            created_at, updated_at
        FROM production_processes
        {}
        ORDER BY sequence ASC, created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 2,
        params.len() + 3
    );

    let mut fetch_query = sqlx::query(&fetch_sql);
    fetch_query = fetch_query.bind(tenant_id);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(pagesize).bind(offset);

    let processes = match fetch_query.fetch_all(&state.pool).await {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("Failed to fetch processes: {}", e);
            return Json(ApiResponse::error(500, "获取生产工序列表失败"));
        }
    };

    let processes_list: Vec<ProductionProcessResponse> = processes
        .into_iter()
        .map(|r| ProductionProcessResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            process_no: r.try_get::<String, _>("process_no").unwrap_or_default(),
            name: r.try_get::<String, _>("name").unwrap_or_default(),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            version: r
                .try_get::<Option<String>, _>("version")
                .ok()
                .flatten()
                .unwrap_or_else(|| "1.0".to_string()),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "active".to_string()),
            sequence: r
                .try_get::<Option<i32>, _>("sequence")
                .ok()
                .flatten()
                .unwrap_or(0),
            equipment_required: r
                .try_get::<Option<bool>, _>("equipment_required")
                .ok()
                .flatten()
                .unwrap_or(false),
            estimated_duration: r
                .try_get::<Option<i32>, _>("estimated_duration")
                .ok()
                .flatten()
                .unwrap_or(0),
            created_at: naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        ListProcessesResponse {
            processes: processes_list,
            total: total.unwrap_or(0),
            page,
            pagesize,
        },
        "获取生产工序列表成功",
    ))
}

pub async fn create_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateProcessRequest>,
) -> Json<ApiResponse<ProductionProcessResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProcessWrite).await {
        return e;
    }

    let tenant_id = tenant::get_tenant_id(&claims, &headers);
    let _ = tenant::set_session_tenant_id(&state.pool, tenant_id).await;

    let now = Utc::now();
    let process_no = format!(
        "PROC{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let result = sqlx::query_as::<_, ProductionProcessRow>(
        r#"
        INSERT INTO production_processes (
            process_no, name, description, version, status,
            sequence, equipment_required, estimated_duration,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $8)
        RETURNING
            id, process_no, name, description, version,
            status, sequence, equipment_required, estimated_duration,
            created_at, updated_at
        "#,
    )
    .bind(process_no)
    .bind(&req.name)
    .bind(req.description.as_deref())
    .bind(req.version.unwrap_or_else(|| "1.0".to_string()))
    .bind(req.sequence.unwrap_or(0))
    .bind(req.equipment_required.unwrap_or(false))
    .bind(req.estimated_duration.unwrap_or(0))
    .bind(now.naive_utc())
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create process: {}", e);
            return Json(ApiResponse::error(500, "创建生产工序失败"));
        }
    };

    Json(ApiResponse::success(
        ProductionProcessResponse::from(result),
        "生产工序创建成功",
    ))
}

pub async fn get_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionProcessResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProcessRead).await {
        return e;
    }

    let tenant_id = tenant::get_tenant_id(&claims, &headers);
    let _ = tenant::set_session_tenant_id(&state.pool, tenant_id).await;

    let result = sqlx::query_as::<_, ProductionProcessRow>(
        r#"
        SELECT
            id, process_no, name, description, version,
            status, sequence, equipment_required, estimated_duration,
            created_at, updated_at
        FROM production_processes
        WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch process: {}", e);
            return Json(ApiResponse::error(500, "获取生产工序失败"));
        }
    };

    match result {
        Some(r) => Json(ApiResponse::success(
            ProductionProcessResponse::from(r),
            "获取生产工序成功",
        )),
        None => Json(ApiResponse::error(404, "生产工序不存在")),
    }
}

pub async fn update_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProcessRequest>,
) -> Json<ApiResponse<ProductionProcessResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProcessWrite).await {
        return e;
    }

    let tenant_id = tenant::get_tenant_id(&claims, &headers);
    let _ = tenant::set_session_tenant_id(&state.pool, tenant_id).await;

    let result = sqlx::query_as::<_, ProductionProcessRow>(
        r#"
        UPDATE production_processes SET
            name = COALESCE($2, name),
            description = COALESCE($3, description),
            version = COALESCE($4, version),
            sequence = COALESCE($5, sequence),
            equipment_required = COALESCE($6, equipment_required),
            estimated_duration = COALESCE($7, estimated_duration),
            updated_at = $8
        WHERE id = $1 AND status = 'active'
        RETURNING
            id, process_no, name, description, version,
            status, sequence, equipment_required, estimated_duration,
            created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.name)
    .bind(req.description)
    .bind(req.version)
    .bind(req.sequence)
    .bind(req.equipment_required)
    .bind(req.estimated_duration)
    .bind(Utc::now().naive_utc())
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update process: {}", e);
            return Json(ApiResponse::error(500, "更新生产工序失败"));
        }
    };

    match result {
        Some(r) => Json(ApiResponse::success(
            ProductionProcessResponse::from(r),
            "生产工序更新成功",
        )),
        None => Json(ApiResponse::error(404, "生产工序不存在或状态不允许修改")),
    }
}

pub async fn delete_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProcessWrite).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE production_processes SET deleted_at = NOW()
        WHERE id = $1
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete process: {}", e);
            return Json(ApiResponse::error(500, "删除生产工序失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "生产工序删除成功"))
    } else {
        Json(ApiResponse::error(404, "生产工序不存在"))
    }
}

pub async fn deactivate_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionProcessResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProcessWrite).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE production_processes SET
            status = 'inactive',
            updated_at = $2
        WHERE id = $1 AND status = 'active'
        RETURNING 
            id, process_code AS process_no, process_name AS name, description, version,
            status, sequence, NULL::text AS equipment_required, NULL::numeric AS estimated_duration,
            created_at, updated_at
        "#,
        id,
        Utc::now(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to deactivate process: {}", e);
            return Json(ApiResponse::error(500, "停用生产工序失败"));
        }
    };

    match result {
        Some(r) => {
            let process = ProductionProcessResponse {
                id: r.id,
                process_no: r.process_no.unwrap_or_default(),
                name: r.name,
                description: r.description,
                version: r.version.unwrap_or_else(|| "1.0".to_string()),
                status: r.status,
                sequence: r.sequence,
                equipment_required: false,
                estimated_duration: 0,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Json(ApiResponse::success(process, "生产工序停用成功"))
        }
        None => Json(ApiResponse::error(404, "生产工序不存在或状态不允许停用")),
    }
}
