//! MES 主数据：车间 / 产线 / 班次 / 工作日历（批2 P1-6）
//!
//! 对齐 MES 现有惯例：public 表（无 schema 前缀）、无 tenant_id、
//! deleted_at 软删、COALESCE 局部更新、ModulePermission 读写校验。

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::NaiveTime;
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::require_tenant;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;

// ==================== 路由 ====================

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/workshops", get(list_workshops).post(create_workshop))
        .route(
            "/workshops/{id}",
            get(get_workshop)
                .put(update_workshop)
                .delete(delete_workshop),
        )
        .route(
            "/production-lines",
            get(list_production_lines).post(create_production_line),
        )
        .route(
            "/production-lines/{id}",
            get(get_production_line)
                .put(update_production_line)
                .delete(delete_production_line),
        )
        .route("/shifts", get(list_shifts).post(create_shift))
        .route(
            "/shifts/{id}",
            get(get_shift).put(update_shift).delete(delete_shift),
        )
        .route(
            "/work-calendars",
            get(list_work_calendars).post(create_work_calendar),
        )
        .route(
            "/work-calendars/{id}",
            get(get_work_calendar)
                .put(update_work_calendar)
                .delete(delete_work_calendar),
        )
}

// ==================== 请求/响应类型 ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateWorkshopRequest {
    pub code: String,
    pub name: String,
    pub location: Option<String>,
    pub manager: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateWorkshopRequest {
    pub name: Option<String>,
    pub location: Option<String>,
    pub manager: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WorkshopResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub location: Option<String>,
    pub manager: Option<String>,
    pub status: String,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProductionLineRequest {
    pub code: String,
    pub name: String,
    pub workshop_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProductionLineRequest {
    pub name: Option<String>,
    pub workshop_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProductionLineResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub workshop_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateShiftRequest {
    pub code: String,
    pub name: String,
    pub start_time: NaiveTime,
    pub end_time: NaiveTime,
    pub is_overnight: Option<bool>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateShiftRequest {
    pub name: Option<String>,
    pub start_time: Option<NaiveTime>,
    pub end_time: Option<NaiveTime>,
    pub is_overnight: Option<bool>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ShiftResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub start_time: NaiveTime,
    pub end_time: NaiveTime,
    pub is_overnight: bool,
    pub status: String,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateWorkCalendarRequest {
    pub code: String,
    pub name: String,
    pub calendar_type: Option<String>,
    pub work_date: chrono::NaiveDate,
    pub shift_id: Option<Uuid>,
    pub is_working: Option<bool>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateWorkCalendarRequest {
    pub name: Option<String>,
    pub calendar_type: Option<String>,
    pub work_date: Option<chrono::NaiveDate>,
    pub shift_id: Option<Uuid>,
    pub is_working: Option<bool>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WorkCalendarResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub calendar_type: String,
    pub work_date: chrono::NaiveDate,
    pub shift_id: Option<Uuid>,
    pub is_working: bool,
    pub remark: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

// ==================== 车间 ====================

async fn list_workshops(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<ListQuery>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkshopRead).await {
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
            return ApiResponse::server_error("查询车间失败");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let search = q.search.clone().unwrap_or_default();
    let status = q.status.clone().unwrap_or_default();
    let mut where_sql = String::from("WHERE deleted_at IS NULL");
    if !status.is_empty() {
        where_sql.push_str(" AND status = $1");
    }
    if !search.is_empty() {
        where_sql.push_str(if status.is_empty() {
            " AND (name ILIKE $1 OR code ILIKE $1)"
        } else {
            " AND (name ILIKE $2 OR code ILIKE $2)"
        });
    }
    let count_sql = format!("SELECT COUNT(*) FROM workshops {where_sql}");
    let mut count_query = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql));
    if !status.is_empty() {
        count_query = count_query.bind(&status);
    }
    if !search.is_empty() {
        count_query = count_query.bind(format!("%{search}%"));
    }
    let total = match count_query.fetch_one(&mut scope).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[mes] 车间计数失败: {}", e);
            return ApiResponse::server_error("查询车间失败");
        }
    };
    let mut fetch_sql = format!(
        "SELECT id, code, name, location, manager, status, description, created_at, updated_at \
         FROM workshops {where_sql} ORDER BY created_at DESC LIMIT {page_size} OFFSET {}",
        (page - 1) * page_size
    );
    let _ = &mut fetch_sql;
    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    if !status.is_empty() {
        fetch_query = fetch_query.bind(&status);
    }
    if !search.is_empty() {
        fetch_query = fetch_query.bind(format!("%{search}%"));
    }
    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("[mes] 车间查询失败: {}", e);
            return ApiResponse::server_error("查询车间失败");
        }
    };
    let items: Vec<WorkshopResponse> = rows
        .iter()
        .map(|r| WorkshopResponse {
            id: r.get("id"),
            code: r.get("code"),
            name: r.get("name"),
            location: r.get("location"),
            manager: r.get("manager"),
            status: r.get("status"),
            description: r.get("description"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        })
        .collect();
    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "查询成功",
    )
}

async fn get_workshop(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkshopRead).await {
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
            return ApiResponse::server_error("查询车间失败");
        }
    };
    let row = sqlx::query(
        "SELECT id, code, name, location, manager, status, description, created_at, updated_at \
         FROM workshops WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "code": r.get::<String, _>("code"),
                "name": r.get::<String, _>("name"),
                "location": r.get::<Option<String>, _>("location"),
                "manager": r.get::<Option<String>, _>("manager"),
                "status": r.get::<String, _>("status"),
                "description": r.get::<Option<String>, _>("description"),
            }),
            "查询成功",
        ),
        Ok(None) => ApiResponse::not_found("车间不存在"),
        Err(e) => {
            tracing::error!("[mes] 车间查询失败: {}", e);
            ApiResponse::server_error("查询车间失败")
        }
    }
}

async fn create_workshop(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateWorkshopRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkshopWrite).await {
        return e;
    }
    // workshops 写路径必须有确定租户：服务身份缺租户头一律 400（例外清单 #7 已收回）。
    let tenant_id: Uuid = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[mes] 车间创建开启事务失败: {}", e);
            return ApiResponse::server_error("车间创建失败");
        }
    };
    let result = sqlx::query(
        "INSERT INTO workshops (code, name, location, manager, status, description, tenant_id) \
         VALUES ($1, $2, $3, $4, COALESCE($5, 'active'), $6, $7) RETURNING id",
    )
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.location)
    .bind(&req.manager)
    .bind(&req.status)
    .bind(&req.description)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 车间创建提交失败: {}", e);
            return ApiResponse::server_error("车间创建失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(Some(r)) => {
            let id: Uuid = r.get("id");
            ApiResponse::success(serde_json::json!({ "id": id }), "车间创建成功")
        }
        Ok(None) => ApiResponse::server_error("车间创建失败"),
        Err(e) => {
            tracing::error!("[mes] 车间创建失败: {}", e);
            if e.to_string().contains("duplicate") {
                return ApiResponse::conflict("车间编码已存在");
            }
            ApiResponse::server_error("车间创建失败")
        }
    }
}

async fn update_workshop(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWorkshopRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkshopWrite).await {
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
            tracing::error!("[mes] 车间更新开启事务失败: {}", e);
            return ApiResponse::server_error("车间更新失败");
        }
    };
    let result = sqlx::query(
        "UPDATE workshops SET \
         name = COALESCE($2, name), location = COALESCE($3, location), \
         manager = COALESCE($4, manager), status = COALESCE($5, status), \
         description = COALESCE($6, description), updated_at = NOW() \
         WHERE id = $1 AND deleted_at IS NULL RETURNING id",
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.location)
    .bind(&req.manager)
    .bind(&req.status)
    .bind(&req.description)
    .fetch_optional(&mut scope)
    .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 车间更新提交失败: {}", e);
            return ApiResponse::server_error("车间更新失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(Some(_)) => ApiResponse::success(serde_json::json!({ "id": id }), "车间更新成功"),
        Ok(None) => ApiResponse::not_found("车间不存在"),
        Err(e) => {
            tracing::error!("[mes] 车间更新失败: {}", e);
            ApiResponse::server_error("车间更新失败")
        }
    }
}

async fn delete_workshop(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkshopWrite).await {
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
            tracing::error!("[mes] 车间删除开启事务失败: {}", e);
            return ApiResponse::server_error("车间删除失败");
        }
    };
    let result = sqlx::query("UPDATE workshops SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut scope)
        .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 车间删除提交失败: {}", e);
            return ApiResponse::server_error("车间删除失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success("".to_string(), "车间删除成功"),
        Ok(_) => ApiResponse::not_found("车间不存在"),
        Err(e) => {
            tracing::error!("[mes] 车间删除失败: {}", e);
            ApiResponse::server_error("车间删除失败")
        }
    }
}

// ==================== 产线 ====================

async fn list_production_lines(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<ListQuery>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionLineRead).await
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
            return ApiResponse::server_error("查询产线失败");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let search = q.search.clone().unwrap_or_default();
    let status = q.status.clone().unwrap_or_default();
    let mut where_sql = String::from("WHERE deleted_at IS NULL");
    if !status.is_empty() {
        where_sql.push_str(" AND status = $1");
    }
    if !search.is_empty() {
        where_sql.push_str(if status.is_empty() {
            " AND (name ILIKE $1 OR code ILIKE $1)"
        } else {
            " AND (name ILIKE $2 OR code ILIKE $2)"
        });
    }
    let count_sql = format!("SELECT COUNT(*) FROM production_lines {where_sql}");
    let mut count_query = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql));
    if !status.is_empty() {
        count_query = count_query.bind(&status);
    }
    if !search.is_empty() {
        count_query = count_query.bind(format!("%{search}%"));
    }
    let total = match count_query.fetch_one(&mut scope).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[mes] 产线计数失败: {}", e);
            return ApiResponse::server_error("查询产线失败");
        }
    };
    let fetch_sql = format!(
        "SELECT id, code, name, workshop_id, description, status, created_at, updated_at \
         FROM production_lines {where_sql} ORDER BY created_at DESC LIMIT {page_size} OFFSET {}",
        (page - 1) * page_size
    );
    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    if !status.is_empty() {
        fetch_query = fetch_query.bind(&status);
    }
    if !search.is_empty() {
        fetch_query = fetch_query.bind(format!("%{search}%"));
    }
    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("[mes] 产线查询失败: {}", e);
            return ApiResponse::server_error("查询产线失败");
        }
    };
    let items: Vec<ProductionLineResponse> = rows
        .iter()
        .map(|r| ProductionLineResponse {
            id: r.get("id"),
            code: r.get("code"),
            name: r.get("name"),
            workshop_id: r.get("workshop_id"),
            description: r.get("description"),
            status: r.get("status"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        })
        .collect();
    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "查询成功",
    )
}

async fn get_production_line(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionLineRead).await
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
            return ApiResponse::server_error("查询产线失败");
        }
    };
    let row = sqlx::query(
        "SELECT id, code, name, workshop_id, description, status, created_at, updated_at \
         FROM production_lines WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "code": r.get::<String, _>("code"),
                "name": r.get::<String, _>("name"),
                "workshop_id": r.get::<Option<Uuid>, _>("workshop_id"),
                "description": r.get::<Option<String>, _>("description"),
                "status": r.get::<String, _>("status"),
            }),
            "查询成功",
        ),
        Ok(None) => ApiResponse::not_found("产线不存在"),
        Err(e) => {
            tracing::error!("[mes] 产线查询失败: {}", e);
            ApiResponse::server_error("查询产线失败")
        }
    }
}

async fn create_production_line(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateProductionLineRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionLineWrite).await
    {
        return e;
    }
    // production_lines 写路径必须有确定租户：服务身份缺租户头一律 400（例外清单 #7 已收回）。
    let tenant_id: Uuid = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[mes] 产线创建开启事务失败: {}", e);
            return ApiResponse::server_error("产线创建失败");
        }
    };
    let result = sqlx::query(
        "INSERT INTO production_lines (code, name, workshop_id, description, status, tenant_id) \
         VALUES ($1, $2, $3, $4, COALESCE($5, 'active'), $6) RETURNING id",
    )
    .bind(&req.code)
    .bind(&req.name)
    .bind(req.workshop_id)
    .bind(&req.description)
    .bind(&req.status)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 产线创建提交失败: {}", e);
            return ApiResponse::server_error("产线创建失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(Some(r)) => {
            let id: Uuid = r.get("id");
            ApiResponse::success(serde_json::json!({ "id": id }), "产线创建成功")
        }
        Ok(None) => ApiResponse::server_error("产线创建失败"),
        Err(e) => {
            tracing::error!("[mes] 产线创建失败: {}", e);
            if e.to_string().contains("duplicate") {
                return ApiResponse::conflict("产线编码已存在");
            }
            ApiResponse::server_error("产线创建失败")
        }
    }
}

async fn update_production_line(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionLineRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionLineWrite).await
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
            tracing::error!("[mes] 产线更新开启事务失败: {}", e);
            return ApiResponse::server_error("产线更新失败");
        }
    };
    let result = sqlx::query(
        "UPDATE production_lines SET \
         name = COALESCE($2, name), workshop_id = COALESCE($3, workshop_id), \
         description = COALESCE($4, description), status = COALESCE($5, status), \
         updated_at = NOW() \
         WHERE id = $1 AND deleted_at IS NULL RETURNING id",
    )
    .bind(id)
    .bind(&req.name)
    .bind(req.workshop_id)
    .bind(&req.description)
    .bind(&req.status)
    .fetch_optional(&mut scope)
    .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 产线更新提交失败: {}", e);
            return ApiResponse::server_error("产线更新失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(Some(_)) => ApiResponse::success(serde_json::json!({ "id": id }), "产线更新成功"),
        Ok(None) => ApiResponse::not_found("产线不存在"),
        Err(e) => {
            tracing::error!("[mes] 产线更新失败: {}", e);
            ApiResponse::server_error("产线更新失败")
        }
    }
}

async fn delete_production_line(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionLineWrite).await
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
            tracing::error!("[mes] 产线删除开启事务失败: {}", e);
            return ApiResponse::server_error("产线删除失败");
        }
    };
    let result = sqlx::query("UPDATE production_lines SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut scope)
        .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 产线删除提交失败: {}", e);
            return ApiResponse::server_error("产线删除失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success("".to_string(), "产线删除成功"),
        Ok(_) => ApiResponse::not_found("产线不存在"),
        Err(e) => {
            tracing::error!("[mes] 产线删除失败: {}", e);
            ApiResponse::server_error("产线删除失败")
        }
    }
}

// ==================== 班次 ====================

async fn list_shifts(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<ListQuery>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ShiftRead).await {
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
            return ApiResponse::server_error("查询班次失败");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let search = q.search.clone().unwrap_or_default();
    let status = q.status.clone().unwrap_or_default();
    let mut where_sql = String::from("WHERE deleted_at IS NULL");
    if !status.is_empty() {
        where_sql.push_str(" AND status = $1");
    }
    if !search.is_empty() {
        where_sql.push_str(if status.is_empty() {
            " AND (name ILIKE $1 OR code ILIKE $1)"
        } else {
            " AND (name ILIKE $2 OR code ILIKE $2)"
        });
    }
    let count_sql = format!("SELECT COUNT(*) FROM shifts {where_sql}");
    let mut count_query = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql));
    if !status.is_empty() {
        count_query = count_query.bind(&status);
    }
    if !search.is_empty() {
        count_query = count_query.bind(format!("%{search}%"));
    }
    let total = match count_query.fetch_one(&mut scope).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[mes] 班次计数失败: {}", e);
            return ApiResponse::server_error("查询班次失败");
        }
    };
    let fetch_sql = format!(
        "SELECT id, code, name, start_time, end_time, is_overnight, status, description, created_at, updated_at \
         FROM shifts {where_sql} ORDER BY created_at DESC LIMIT {page_size} OFFSET {}",
        (page - 1) * page_size
    );
    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    if !status.is_empty() {
        fetch_query = fetch_query.bind(&status);
    }
    if !search.is_empty() {
        fetch_query = fetch_query.bind(format!("%{search}%"));
    }
    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("[mes] 班次查询失败: {}", e);
            return ApiResponse::server_error("查询班次失败");
        }
    };
    let items: Vec<ShiftResponse> = rows
        .iter()
        .map(|r| ShiftResponse {
            id: r.get("id"),
            code: r.get("code"),
            name: r.get("name"),
            start_time: r.get("start_time"),
            end_time: r.get("end_time"),
            is_overnight: r.get("is_overnight"),
            status: r.get("status"),
            description: r.get("description"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        })
        .collect();
    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "查询成功",
    )
}

async fn get_shift(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ShiftRead).await {
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
            return ApiResponse::server_error("查询班次失败");
        }
    };
    let row = sqlx::query(
        "SELECT id, code, name, start_time, end_time, is_overnight, status, description, created_at, updated_at \
         FROM shifts WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "code": r.get::<String, _>("code"),
                "name": r.get::<String, _>("name"),
                "start_time": r.get::<NaiveTime, _>("start_time").to_string(),
                "end_time": r.get::<NaiveTime, _>("end_time").to_string(),
                "is_overnight": r.get::<bool, _>("is_overnight"),
                "status": r.get::<String, _>("status"),
                "description": r.get::<Option<String>, _>("description"),
            }),
            "查询成功",
        ),
        Ok(None) => ApiResponse::not_found("班次不存在"),
        Err(e) => {
            tracing::error!("[mes] 班次查询失败: {}", e);
            ApiResponse::server_error("查询班次失败")
        }
    }
}

async fn create_shift(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateShiftRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ShiftWrite).await {
        return e;
    }
    // 写路径必须有确定租户：服务身份缺租户头一律 400（例外清单 #7 已收回）。
    let tenant_id: Uuid = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[mes] 班次创建开启事务失败: {}", e);
            return ApiResponse::server_error("班次创建失败");
        }
    };
    let result = sqlx::query(
        "INSERT INTO shifts (code, name, start_time, end_time, is_overnight, status, description, tenant_id) \
         VALUES ($1, $2, $3, $4, COALESCE($5, FALSE), COALESCE($6, 'active'), $7, $8) RETURNING id",
    )
    .bind(&req.code)
    .bind(&req.name)
    .bind(req.start_time)
    .bind(req.end_time)
    .bind(req.is_overnight)
    .bind(&req.status)
    .bind(&req.description)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 班次创建提交失败: {}", e);
            return ApiResponse::server_error("班次创建失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(Some(r)) => {
            let id: Uuid = r.get("id");
            ApiResponse::success(serde_json::json!({ "id": id }), "班次创建成功")
        }
        Ok(None) => ApiResponse::server_error("班次创建失败"),
        Err(e) => {
            tracing::error!("[mes] 班次创建失败: {}", e);
            if e.to_string().contains("duplicate") {
                return ApiResponse::conflict("班次编码已存在");
            }
            ApiResponse::server_error("班次创建失败")
        }
    }
}

async fn update_shift(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateShiftRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ShiftWrite).await {
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
            tracing::error!("[mes] 班次更新开启事务失败: {}", e);
            return ApiResponse::server_error("班次更新失败");
        }
    };
    let result = sqlx::query(
        "UPDATE shifts SET \
         name = COALESCE($2, name), start_time = COALESCE($3, start_time), \
         end_time = COALESCE($4, end_time), is_overnight = COALESCE($5, is_overnight), \
         status = COALESCE($6, status), description = COALESCE($7, description), \
         updated_at = NOW() \
         WHERE id = $1 AND deleted_at IS NULL RETURNING id",
    )
    .bind(id)
    .bind(&req.name)
    .bind(req.start_time)
    .bind(req.end_time)
    .bind(req.is_overnight)
    .bind(&req.status)
    .bind(&req.description)
    .fetch_optional(&mut scope)
    .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 班次更新提交失败: {}", e);
            return ApiResponse::server_error("班次更新失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(Some(_)) => ApiResponse::success(serde_json::json!({ "id": id }), "班次更新成功"),
        Ok(None) => ApiResponse::not_found("班次不存在"),
        Err(e) => {
            tracing::error!("[mes] 班次更新失败: {}", e);
            ApiResponse::server_error("班次更新失败")
        }
    }
}

async fn delete_shift(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ShiftWrite).await {
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
            tracing::error!("[mes] 班次删除开启事务失败: {}", e);
            return ApiResponse::server_error("班次删除失败");
        }
    };
    let result = sqlx::query("UPDATE shifts SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut scope)
        .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 班次删除提交失败: {}", e);
            return ApiResponse::server_error("班次删除失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success("".to_string(), "班次删除成功"),
        Ok(_) => ApiResponse::not_found("班次不存在"),
        Err(e) => {
            tracing::error!("[mes] 班次删除失败: {}", e);
            ApiResponse::server_error("班次删除失败")
        }
    }
}

// ==================== 工作日历 ====================

async fn list_work_calendars(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(q): Query<ListQuery>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkCalendarRead).await
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
            return ApiResponse::server_error("查询日历失败");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let search = q.search.clone().unwrap_or_default();
    let status = q.status.clone().unwrap_or_default();
    let mut where_sql = String::from("WHERE deleted_at IS NULL");
    if !status.is_empty() {
        where_sql.push_str(" AND calendar_type = $1");
    }
    if !search.is_empty() {
        where_sql.push_str(if status.is_empty() {
            " AND (name ILIKE $1 OR code ILIKE $1)"
        } else {
            " AND (name ILIKE $2 OR code ILIKE $2)"
        });
    }
    let count_sql = format!("SELECT COUNT(*) FROM work_calendars {where_sql}");
    let mut count_query = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql));
    if !status.is_empty() {
        count_query = count_query.bind(&status);
    }
    if !search.is_empty() {
        count_query = count_query.bind(format!("%{search}%"));
    }
    let total = match count_query.fetch_one(&mut scope).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[mes] 日历计数失败: {}", e);
            return ApiResponse::server_error("查询日历失败");
        }
    };
    let fetch_sql = format!(
        "SELECT id, code, name, calendar_type, work_date, shift_id, is_working, remark, created_at, updated_at \
         FROM work_calendars {where_sql} ORDER BY work_date DESC LIMIT {page_size} OFFSET {}",
        (page - 1) * page_size
    );
    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    if !status.is_empty() {
        fetch_query = fetch_query.bind(&status);
    }
    if !search.is_empty() {
        fetch_query = fetch_query.bind(format!("%{search}%"));
    }
    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("[mes] 日历查询失败: {}", e);
            return ApiResponse::server_error("查询日历失败");
        }
    };
    let items: Vec<WorkCalendarResponse> = rows
        .iter()
        .map(|r| WorkCalendarResponse {
            id: r.get("id"),
            code: r.get("code"),
            name: r.get("name"),
            calendar_type: r.get("calendar_type"),
            work_date: r.get("work_date"),
            shift_id: r.get("shift_id"),
            is_working: r.get("is_working"),
            remark: r.get("remark"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        })
        .collect();
    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "查询成功",
    )
}

async fn get_work_calendar(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkCalendarRead).await
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
            return ApiResponse::server_error("查询日历失败");
        }
    };
    let row = sqlx::query(
        "SELECT id, code, name, calendar_type, work_date, shift_id, is_working, remark, created_at, updated_at \
         FROM work_calendars WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "code": r.get::<String, _>("code"),
                "name": r.get::<String, _>("name"),
                "calendar_type": r.get::<String, _>("calendar_type"),
                "work_date": r.get::<chrono::NaiveDate, _>("work_date").to_string(),
                "shift_id": r.get::<Option<Uuid>, _>("shift_id"),
                "is_working": r.get::<bool, _>("is_working"),
                "remark": r.get::<Option<String>, _>("remark"),
            }),
            "查询成功",
        ),
        Ok(None) => ApiResponse::not_found("日历不存在"),
        Err(e) => {
            tracing::error!("[mes] 日历查询失败: {}", e);
            ApiResponse::server_error("查询日历失败")
        }
    }
}

async fn create_work_calendar(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateWorkCalendarRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkCalendarWrite).await
    {
        return e;
    }
    // 写路径必须有确定租户：服务身份缺租户头一律 400（例外清单 #7 已收回）。
    let tenant_id: Uuid = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[mes] 日历创建开启事务失败: {}", e);
            return ApiResponse::server_error("日历创建失败");
        }
    };
    let result = sqlx::query(
        "INSERT INTO work_calendars (code, name, calendar_type, work_date, shift_id, is_working, remark, tenant_id) \
         VALUES ($1, $2, COALESCE($3, 'workday'), $4, $5, COALESCE($6, TRUE), $7, $8) RETURNING id",
    )
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.calendar_type)
    .bind(req.work_date)
    .bind(req.shift_id)
    .bind(req.is_working)
    .bind(&req.remark)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 日历创建提交失败: {}", e);
            return ApiResponse::server_error("日历创建失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(Some(r)) => {
            let id: Uuid = r.get("id");
            ApiResponse::success(serde_json::json!({ "id": id }), "日历创建成功")
        }
        Ok(None) => ApiResponse::server_error("日历创建失败"),
        Err(e) => {
            tracing::error!("[mes] 日历创建失败: {}", e);
            if e.to_string().contains("duplicate") {
                return ApiResponse::conflict("日历编码已存在");
            }
            ApiResponse::server_error("日历创建失败")
        }
    }
}

async fn update_work_calendar(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateWorkCalendarRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkCalendarWrite).await
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
            tracing::error!("[mes] 日历更新开启事务失败: {}", e);
            return ApiResponse::server_error("日历更新失败");
        }
    };
    let result = sqlx::query(
        "UPDATE work_calendars SET \
         name = COALESCE($2, name), calendar_type = COALESCE($3, calendar_type), \
         work_date = COALESCE($4, work_date), shift_id = COALESCE($5, shift_id), \
         is_working = COALESCE($6, is_working), remark = COALESCE($7, remark), \
         updated_at = NOW() \
         WHERE id = $1 AND deleted_at IS NULL RETURNING id",
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.calendar_type)
    .bind(req.work_date)
    .bind(req.shift_id)
    .bind(req.is_working)
    .bind(&req.remark)
    .fetch_optional(&mut scope)
    .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 日历更新提交失败: {}", e);
            return ApiResponse::server_error("日历更新失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(Some(_)) => ApiResponse::success(serde_json::json!({ "id": id }), "日历更新成功"),
        Ok(None) => ApiResponse::not_found("日历不存在"),
        Err(e) => {
            tracing::error!("[mes] 日历更新失败: {}", e);
            ApiResponse::server_error("日历更新失败")
        }
    }
}

async fn delete_work_calendar(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkCalendarWrite).await
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
            tracing::error!("[mes] 日历删除开启事务失败: {}", e);
            return ApiResponse::server_error("日历删除失败");
        }
    };
    let result = sqlx::query("UPDATE work_calendars SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut scope)
        .await;
    if result.is_ok() {
        if let Err(e) = scope.commit().await {
            tracing::error!("[mes] 日历删除提交失败: {}", e);
            return ApiResponse::server_error("日历删除失败");
        }
    } else {
        let _ = scope.rollback().await;
    }
    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success("".to_string(), "日历删除成功"),
        Ok(_) => ApiResponse::not_found("日历不存在"),
        Err(e) => {
            tracing::error!("[mes] 日历删除失败: {}", e);
            ApiResponse::server_error("日历删除失败")
        }
    }
}
