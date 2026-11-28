//! QMS 检验项 / 检验方案 / 抽样方案（批3 P1-7）
//!
//! 对齐 QMS 现有惯例：quality_standard 模式（租户隔离 + utoipa 注解 + 软删）。

use axum::{
    extract::{Path, Query, State},
    routing::{delete, get},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::require_tenant;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use crate::AppState;

fn tenant_filter(claims: &Claims, headers: &axum::http::HeaderMap) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id(claims, headers))
    }
}

fn tenant_sql(filter: Option<Uuid>, idx: usize) -> String {
    match filter {
        Some(_) => format!("AND tenant_id = ${idx}"),
        None => String::new(),
    }
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/inspection-items",
            get(list_inspection_items).post(create_inspection_item),
        )
        .route(
            "/inspection-items/{id}",
            get(get_inspection_item)
                .put(update_inspection_item)
                .delete(delete_inspection_item),
        )
        .route(
            "/sampling-plans",
            get(list_sampling_plans).post(create_sampling_plan),
        )
        .route(
            "/sampling-plans/{id}",
            get(get_sampling_plan)
                .put(update_sampling_plan)
                .delete(delete_sampling_plan),
        )
        .route(
            "/inspection-plans",
            get(list_inspection_plans).post(create_inspection_plan),
        )
        .route(
            "/inspection-plans/{id}",
            get(get_inspection_plan)
                .put(update_inspection_plan)
                .delete(delete_inspection_plan),
        )
        .route(
            "/inspection-plans/{id}/items",
            get(list_plan_items).post(add_plan_item),
        )
        .route(
            "/inspection-plans/{id}/items/{item_id}",
            delete(remove_plan_item),
        )
}

// ==================== 数据模型 ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    search: Option<String>,
    status: Option<String>,
    category: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateInspectionItemRequest {
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub specification: Option<String>,
    pub method: Option<String>,
    pub unit: Option<String>,
    pub standard_value: Option<String>,
    pub tolerance: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateInspectionItemRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub specification: Option<String>,
    pub method: Option<String>,
    pub unit: Option<String>,
    pub standard_value: Option<String>,
    pub tolerance: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InspectionItemResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub specification: Option<String>,
    pub method: Option<String>,
    pub unit: Option<String>,
    pub standard_value: Option<String>,
    pub tolerance: Option<String>,
    pub status: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSamplingPlanRequest {
    pub code: String,
    pub name: String,
    pub level: Option<String>,
    pub sample_size: Option<i32>,
    pub aql: Option<String>,
    pub inspection_level: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSamplingPlanRequest {
    pub name: Option<String>,
    pub level: Option<String>,
    pub sample_size: Option<i32>,
    pub aql: Option<String>,
    pub inspection_level: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SamplingPlanResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub level: Option<String>,
    pub sample_size: Option<i32>,
    pub aql: Option<String>,
    pub inspection_level: Option<String>,
    pub status: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateInspectionPlanRequest {
    pub code: String,
    pub name: String,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub sampling_plan_id: Option<Uuid>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateInspectionPlanRequest {
    pub name: Option<String>,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub sampling_plan_id: Option<Uuid>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InspectionPlanResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub sampling_plan_id: Option<Uuid>,
    pub status: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AddPlanItemRequest {
    pub item_id: Uuid,
    pub sample_qty: Option<i32>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PlanItemResponse {
    pub id: Uuid,
    pub item_id: Uuid,
    pub item_code: Option<String>,
    pub item_name: Option<String>,
    pub sample_qty: i32,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

// ==================== 检验项 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection_standard:read"])),
    path = "/inspection-items",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn list_inspection_items(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Query(query): Query<ListQuery>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let tenant_where = tenant_sql(filter, 1);
    let mut where_sql = format!("WHERE deleted_at IS NULL {tenant_where}");
    let mut params: Vec<String> = Vec::new();
    if let Some(t) = filter {
        params.push(t.to_string());
    }
    let mut idx = params.len() + 1;
    if let Some(status) = &query.status {
        if !status.is_empty() {
            where_sql.push_str(&format!(" AND status = ${idx}"));
            params.push(status.clone());
            idx += 1;
        }
    }
    if let Some(search) = &query.search {
        if !search.is_empty() {
            where_sql.push_str(&format!(" AND (name ILIKE ${idx} OR code ILIKE ${idx})"));
            params.push(format!("%{search}%"));
        }
    }
    let count_sql = format!("SELECT COUNT(*) FROM qms.qa_inspection_items {where_sql}");
    let mut count_query = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        count_query = count_query.bind(p);
    }
    let fetch_sql = format!(
        "SELECT id, code, name, category, specification, method, unit, standard_value, tolerance, status, description \
         FROM qms.qa_inspection_items {where_sql} ORDER BY created_at DESC LIMIT {page_size} OFFSET {}",
        (page - 1) * page_size
    );
    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        fetch_query = fetch_query.bind(p);
    }

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 检验项读取作用域创建失败: {}", e);
            return ApiResponse::server_error("查询检验项失败");
        }
    };
    let total = match count_query.fetch_one(&mut scope).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[qms] 检验项计数失败: {}", e);
            return ApiResponse::server_error("查询检验项失败");
        }
    };
    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("[qms] 检验项查询失败: {}", e);
            return ApiResponse::server_error("查询检验项失败");
        }
    };
    let items: Vec<InspectionItemResponse> = rows
        .iter()
        .map(|r| InspectionItemResponse {
            id: r.get("id"),
            code: r.get("code"),
            name: r.get("name"),
            category: r.get("category"),
            specification: r.get("specification"),
            method: r.get("method"),
            unit: r.get("unit"),
            standard_value: r.get("standard_value"),
            tolerance: r.get("tolerance"),
            status: r.get("status"),
            description: r.get("description"),
        })
        .collect();
    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "查询成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection_standard:read"])),
    path = "/inspection-items/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn get_inspection_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let mut sql = String::from(
        "SELECT id, code, name, category, specification, method, unit, standard_value, tolerance, status, description \
         FROM qms.qa_inspection_items WHERE id = $1 AND deleted_at IS NULL",
    );
    let mut q = sqlx::query(sqlx::AssertSqlSafe(sql.as_str())).bind(id);
    if let Some(t) = filter {
        sql = format!("{sql} AND tenant_id = $2");
        q = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(id).bind(t);
    }
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 检验项读取作用域创建失败: {}", e);
            return ApiResponse::server_error("查询检验项失败");
        }
    };
    let row = q.fetch_optional(&mut scope).await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "code": r.get::<String, _>("code"),
                "name": r.get::<String, _>("name"),
                "category": r.get::<Option<String>, _>("category"),
                "specification": r.get::<Option<String>, _>("specification"),
                "method": r.get::<Option<String>, _>("method"),
                "unit": r.get::<Option<String>, _>("unit"),
                "standard_value": r.get::<Option<String>, _>("standard_value"),
                "tolerance": r.get::<Option<String>, _>("tolerance"),
                "status": r.get::<String, _>("status"),
                "description": r.get::<Option<String>, _>("description"),
            }),
            "查询成功",
        ),
        Ok(None) => ApiResponse::not_found("检验项不存在"),
        Err(e) => {
            tracing::error!("[qms] 检验项查询失败: {}", e);
            ApiResponse::server_error("查询检验项失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/inspection-items",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn create_inspection_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateInspectionItemRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 检验项写入作用域创建失败: {}", e);
            return ApiResponse::server_error("检验项创建失败");
        }
    };
    let result = sqlx::query(
        "INSERT INTO qms.qa_inspection_items \
         (tenant_id, code, name, category, specification, method, unit, standard_value, tolerance, status, description) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, 'active'), $11) RETURNING id",
    )
    .bind(tenant_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.category)
    .bind(&req.specification)
    .bind(&req.method)
    .bind(&req.unit)
    .bind(&req.standard_value)
    .bind(&req.tolerance)
    .bind(&req.status)
    .bind(&req.description)
    .fetch_optional(&mut scope)
    .await;
    let row = match result {
        Ok(Some(r)) => r,
        Ok(None) => {
            // 显式回滚请求事务，避免"写入后返回非 2xx"被中间件静默丢弃
            if let Err(e) = scope.rollback().await {
                tracing::error!("[qms] 回滚检验项创建事务失败: {}", e);
            }
            return ApiResponse::server_error("检验项创建失败");
        }
        Err(e) => {
            tracing::error!("[qms] 检验项创建失败: {}", e);
            if e.to_string().contains("duplicate") {
                return ApiResponse::conflict("检验项编码已存在");
            }
            return ApiResponse::server_error("检验项创建失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("[qms] 检验项创建提交失败: {}", e);
        return ApiResponse::server_error("检验项创建失败");
    }
    let id: Uuid = row.get("id");
    ApiResponse::success(serde_json::json!({ "id": id }), "检验项创建成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/inspection-items/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn update_inspection_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInspectionItemRequest>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 检验项写入作用域创建失败: {}", e);
            return ApiResponse::server_error("检验项更新失败");
        }
    };
    let result = if let Some(t) = filter {
        sqlx::query(
            "UPDATE qms.qa_inspection_items SET \
             name = COALESCE($2, name), category = COALESCE($3, category), \
             specification = COALESCE($4, specification), method = COALESCE($5, method), \
             unit = COALESCE($6, unit), standard_value = COALESCE($7, standard_value), \
             tolerance = COALESCE($8, tolerance), status = COALESCE($9, status), \
             description = COALESCE($10, description), updated_at = NOW() \
             WHERE id = $1 AND tenant_id = $11 AND deleted_at IS NULL RETURNING id",
        )
        .bind(id)
        .bind(&req.name)
        .bind(&req.category)
        .bind(&req.specification)
        .bind(&req.method)
        .bind(&req.unit)
        .bind(&req.standard_value)
        .bind(&req.tolerance)
        .bind(&req.status)
        .bind(&req.description)
        .bind(t)
        .fetch_optional(&mut scope)
        .await
    } else {
        sqlx::query(
            "UPDATE qms.qa_inspection_items SET \
             name = COALESCE($2, name), category = COALESCE($3, category), \
             specification = COALESCE($4, specification), method = COALESCE($5, method), \
             unit = COALESCE($6, unit), standard_value = COALESCE($7, standard_value), \
             tolerance = COALESCE($8, tolerance), status = COALESCE($9, status), \
             description = COALESCE($10, description), updated_at = NOW() \
             WHERE id = $1 AND deleted_at IS NULL RETURNING id",
        )
        .bind(id)
        .bind(&req.name)
        .bind(&req.category)
        .bind(&req.specification)
        .bind(&req.method)
        .bind(&req.unit)
        .bind(&req.standard_value)
        .bind(&req.tolerance)
        .bind(&req.status)
        .bind(&req.description)
        .fetch_optional(&mut scope)
        .await
    };
    match result {
        Ok(Some(_)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[qms] 检验项更新提交失败: {}", e);
                return ApiResponse::server_error("检验项更新失败");
            }
            ApiResponse::success(serde_json::json!({ "id": id }), "检验项更新成功")
        }
        Ok(None) => ApiResponse::not_found("检验项不存在"),
        Err(e) => {
            tracing::error!("[qms] 检验项更新失败: {}", e);
            ApiResponse::server_error("检验项更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/inspection-items/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn delete_inspection_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let filter = tenant_filter(&claims, &headers);
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 检验项写入作用域创建失败: {}", e);
            return ApiResponse::server_error("检验项删除失败");
        }
    };
    let result = if let Some(t) = filter {
        sqlx::query(
            "UPDATE qms.qa_inspection_items SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(t)
        .execute(&mut scope)
        .await
    } else {
        sqlx::query("UPDATE qms.qa_inspection_items SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&mut scope)
            .await
    };
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[qms] 检验项删除提交失败: {}", e);
                return ApiResponse::server_error("检验项删除失败");
            }
            ApiResponse::success("".to_string(), "检验项删除成功")
        }
        Ok(_) => ApiResponse::not_found("检验项不存在"),
        Err(e) => {
            tracing::error!("[qms] 检验项删除失败: {}", e);
            ApiResponse::server_error("检验项删除失败")
        }
    }
}

// ==================== 抽样方案 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection_standard:read"])),
    path = "/sampling-plans",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn list_sampling_plans(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Query(query): Query<ListQuery>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let tenant_where = tenant_sql(filter, 1);
    let mut where_sql = format!("WHERE deleted_at IS NULL {tenant_where}");
    let mut params: Vec<String> = Vec::new();
    if let Some(t) = filter {
        params.push(t.to_string());
    }
    let mut idx = params.len() + 1;
    if let Some(status) = &query.status {
        if !status.is_empty() {
            where_sql.push_str(&format!(" AND status = ${idx}"));
            params.push(status.clone());
            idx += 1;
        }
    }
    if let Some(search) = &query.search {
        if !search.is_empty() {
            where_sql.push_str(&format!(" AND (name ILIKE ${idx} OR code ILIKE ${idx})"));
            params.push(format!("%{search}%"));
        }
    }
    let count_sql = format!("SELECT COUNT(*) FROM qms.qa_sampling_plans {where_sql}");
    let mut count_query = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        count_query = count_query.bind(p);
    }
    let fetch_sql = format!(
        "SELECT id, code, name, level, sample_size, aql, inspection_level, status, description \
         FROM qms.qa_sampling_plans {where_sql} ORDER BY created_at DESC LIMIT {page_size} OFFSET {}",
        (page - 1) * page_size
    );
    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        fetch_query = fetch_query.bind(p);
    }

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 抽样方案读取作用域创建失败: {}", e);
            return ApiResponse::server_error("查询抽样方案失败");
        }
    };
    let total = match count_query.fetch_one(&mut scope).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[qms] 抽样方案计数失败: {}", e);
            return ApiResponse::server_error("查询抽样方案失败");
        }
    };
    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("[qms] 抽样方案查询失败: {}", e);
            return ApiResponse::server_error("查询抽样方案失败");
        }
    };
    let items: Vec<SamplingPlanResponse> = rows
        .iter()
        .map(|r| SamplingPlanResponse {
            id: r.get("id"),
            code: r.get("code"),
            name: r.get("name"),
            level: r.get("level"),
            sample_size: r.get("sample_size"),
            aql: r.get("aql"),
            inspection_level: r.get("inspection_level"),
            status: r.get("status"),
            description: r.get("description"),
        })
        .collect();
    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "查询成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection_standard:read"])),
    path = "/sampling-plans/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn get_sampling_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let mut sql = String::from(
        "SELECT id, code, name, level, sample_size, aql, inspection_level, status, description \
         FROM qms.qa_sampling_plans WHERE id = $1 AND deleted_at IS NULL",
    );
    let mut q = sqlx::query(sqlx::AssertSqlSafe(sql.as_str())).bind(id);
    if let Some(t) = filter {
        sql = format!("{sql} AND tenant_id = $2");
        q = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(id).bind(t);
    }
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 抽样方案读取作用域创建失败: {}", e);
            return ApiResponse::server_error("查询抽样方案失败");
        }
    };
    let row = q.fetch_optional(&mut scope).await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "code": r.get::<String, _>("code"),
                "name": r.get::<String, _>("name"),
                "level": r.get::<Option<String>, _>("level"),
                "sample_size": r.get::<Option<i32>, _>("sample_size"),
                "aql": r.get::<Option<String>, _>("aql"),
                "inspection_level": r.get::<Option<String>, _>("inspection_level"),
                "status": r.get::<String, _>("status"),
                "description": r.get::<Option<String>, _>("description"),
            }),
            "查询成功",
        ),
        Ok(None) => ApiResponse::not_found("抽样方案不存在"),
        Err(e) => {
            tracing::error!("[qms] 抽样方案查询失败: {}", e);
            ApiResponse::server_error("查询抽样方案失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/sampling-plans",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn create_sampling_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateSamplingPlanRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 抽样方案写入作用域创建失败: {}", e);
            return ApiResponse::server_error("抽样方案创建失败");
        }
    };
    let result = sqlx::query(
        "INSERT INTO qms.qa_sampling_plans \
         (tenant_id, code, name, level, sample_size, aql, inspection_level, status, description) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'active'), $9) RETURNING id",
    )
    .bind(tenant_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.level)
    .bind(req.sample_size)
    .bind(&req.aql)
    .bind(&req.inspection_level)
    .bind(&req.status)
    .bind(&req.description)
    .fetch_optional(&mut scope)
    .await;
    let row = match result {
        Ok(Some(r)) => r,
        Ok(None) => {
            if let Err(e) = scope.rollback().await {
                tracing::error!("[qms] 回滚抽样方案创建事务失败: {}", e);
            }
            return ApiResponse::server_error("抽样方案创建失败");
        }
        Err(e) => {
            tracing::error!("[qms] 抽样方案创建失败: {}", e);
            if e.to_string().contains("duplicate") {
                return ApiResponse::conflict("抽样方案编码已存在");
            }
            return ApiResponse::server_error("抽样方案创建失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("[qms] 抽样方案创建提交失败: {}", e);
        return ApiResponse::server_error("抽样方案创建失败");
    }
    let id: Uuid = row.get("id");
    ApiResponse::success(serde_json::json!({ "id": id }), "抽样方案创建成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/sampling-plans/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn update_sampling_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSamplingPlanRequest>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let base_sql = "UPDATE qms.qa_sampling_plans SET \
        name = COALESCE($2, name), level = COALESCE($3, level), \
        sample_size = COALESCE($4, sample_size), aql = COALESCE($5, aql), \
        inspection_level = COALESCE($6, inspection_level), status = COALESCE($7, status), \
        description = COALESCE($8, description), updated_at = NOW() \
        WHERE id = $1 AND deleted_at IS NULL RETURNING id";
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 抽样方案写入作用域创建失败: {}", e);
            return ApiResponse::server_error("抽样方案更新失败");
        }
    };
    let result = match filter {
        Some(t) => {
            sqlx::query(sqlx::AssertSqlSafe(format!(
                "{base_sql} AND tenant_id = $9"
            )))
            .bind(id)
            .bind(&req.name)
            .bind(&req.level)
            .bind(req.sample_size)
            .bind(&req.aql)
            .bind(&req.inspection_level)
            .bind(&req.status)
            .bind(&req.description)
            .bind(t)
            .fetch_optional(&mut scope)
            .await
        }
        None => {
            sqlx::query(sqlx::AssertSqlSafe(base_sql))
                .bind(id)
                .bind(&req.name)
                .bind(&req.level)
                .bind(req.sample_size)
                .bind(&req.aql)
                .bind(&req.inspection_level)
                .bind(&req.status)
                .bind(&req.description)
                .fetch_optional(&mut scope)
                .await
        }
    };
    match result {
        Ok(Some(_)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[qms] 抽样方案更新提交失败: {}", e);
                return ApiResponse::server_error("抽样方案更新失败");
            }
            ApiResponse::success(serde_json::json!({ "id": id }), "抽样方案更新成功")
        }
        Ok(None) => ApiResponse::not_found("抽样方案不存在"),
        Err(e) => {
            tracing::error!("[qms] 抽样方案更新失败: {}", e);
            ApiResponse::server_error("抽样方案更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/sampling-plans/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn delete_sampling_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let filter = tenant_filter(&claims, &headers);
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 抽样方案写入作用域创建失败: {}", e);
            return ApiResponse::server_error("抽样方案删除失败");
        }
    };
    let result = if let Some(t) = filter {
        sqlx::query(
            "UPDATE qms.qa_sampling_plans SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(t)
        .execute(&mut scope)
        .await
    } else {
        sqlx::query("UPDATE qms.qa_sampling_plans SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&mut scope)
            .await
    };
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[qms] 抽样方案删除提交失败: {}", e);
                return ApiResponse::server_error("抽样方案删除失败");
            }
            ApiResponse::success("".to_string(), "抽样方案删除成功")
        }
        Ok(_) => ApiResponse::not_found("抽样方案不存在"),
        Err(e) => {
            tracing::error!("[qms] 抽样方案删除失败: {}", e);
            ApiResponse::server_error("抽样方案删除失败")
        }
    }
}

// ==================== 检验方案 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection_standard:read"])),
    path = "/inspection-plans",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn list_inspection_plans(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Query(query): Query<ListQuery>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let tenant_where = tenant_sql(filter, 1);
    let mut where_sql = format!("WHERE p.deleted_at IS NULL {tenant_where}");
    let mut params: Vec<String> = Vec::new();
    if let Some(t) = filter {
        params.push(t.to_string());
    }
    let mut idx = params.len() + 1;
    if let Some(status) = &query.status {
        if !status.is_empty() {
            where_sql.push_str(&format!(" AND p.status = ${idx}"));
            params.push(status.clone());
            idx += 1;
        }
    }
    if let Some(search) = &query.search {
        if !search.is_empty() {
            where_sql.push_str(&format!(
                " AND (p.name ILIKE ${idx} OR p.code ILIKE ${idx})"
            ));
            params.push(format!("%{search}%"));
        }
    }
    let count_sql = format!("SELECT COUNT(*) FROM qms.qa_inspection_plans p {where_sql}");
    let mut count_query = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        count_query = count_query.bind(p);
    }
    let fetch_sql = format!(
        "SELECT p.id, p.code, p.name, p.product_code, p.product_name, p.sampling_plan_id, p.status, p.description \
         FROM qms.qa_inspection_plans p {where_sql} ORDER BY p.created_at DESC LIMIT {page_size} OFFSET {}",
        (page - 1) * page_size
    );
    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        fetch_query = fetch_query.bind(p);
    }

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 检验方案读取作用域创建失败: {}", e);
            return ApiResponse::server_error("查询检验方案失败");
        }
    };
    let total = match count_query.fetch_one(&mut scope).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[qms] 检验方案计数失败: {}", e);
            return ApiResponse::server_error("查询检验方案失败");
        }
    };
    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("[qms] 检验方案查询失败: {}", e);
            return ApiResponse::server_error("查询检验方案失败");
        }
    };
    let items: Vec<InspectionPlanResponse> = rows
        .iter()
        .map(|r| InspectionPlanResponse {
            id: r.get("id"),
            code: r.get("code"),
            name: r.get("name"),
            product_code: r.get("product_code"),
            product_name: r.get("product_name"),
            sampling_plan_id: r.get("sampling_plan_id"),
            status: r.get("status"),
            description: r.get("description"),
        })
        .collect();
    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "查询成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection_standard:read"])),
    path = "/inspection-plans/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn get_inspection_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let mut sql = String::from(
        "SELECT id, code, name, product_code, product_name, sampling_plan_id, status, description \
         FROM qms.qa_inspection_plans WHERE id = $1 AND deleted_at IS NULL",
    );
    let mut q = sqlx::query(sqlx::AssertSqlSafe(sql.as_str())).bind(id);
    if let Some(t) = filter {
        sql = format!("{sql} AND tenant_id = $2");
        q = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(id).bind(t);
    }
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 检验方案读取作用域创建失败: {}", e);
            return ApiResponse::server_error("查询检验方案失败");
        }
    };
    let row = q.fetch_optional(&mut scope).await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "code": r.get::<String, _>("code"),
                "name": r.get::<String, _>("name"),
                "product_code": r.get::<Option<String>, _>("product_code"),
                "product_name": r.get::<Option<String>, _>("product_name"),
                "sampling_plan_id": r.get::<Option<Uuid>, _>("sampling_plan_id"),
                "status": r.get::<String, _>("status"),
                "description": r.get::<Option<String>, _>("description"),
            }),
            "查询成功",
        ),
        Ok(None) => ApiResponse::not_found("检验方案不存在"),
        Err(e) => {
            tracing::error!("[qms] 检验方案查询失败: {}", e);
            ApiResponse::server_error("查询检验方案失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/inspection-plans",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn create_inspection_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateInspectionPlanRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 检验方案写入作用域创建失败: {}", e);
            return ApiResponse::server_error("检验方案创建失败");
        }
    };
    let result = sqlx::query(
        "INSERT INTO qms.qa_inspection_plans \
         (tenant_id, code, name, product_code, product_name, sampling_plan_id, status, description) \
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'active'), $8) RETURNING id",
    )
    .bind(tenant_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.product_code)
    .bind(&req.product_name)
    .bind(req.sampling_plan_id)
    .bind(&req.status)
    .bind(&req.description)
    .fetch_optional(&mut scope)
    .await;
    let row = match result {
        Ok(Some(r)) => r,
        Ok(None) => {
            if let Err(e) = scope.rollback().await {
                tracing::error!("[qms] 回滚检验方案创建事务失败: {}", e);
            }
            return ApiResponse::server_error("检验方案创建失败");
        }
        Err(e) => {
            tracing::error!("[qms] 检验方案创建失败: {}", e);
            if e.to_string().contains("duplicate") {
                return ApiResponse::conflict("检验方案编码已存在");
            }
            return ApiResponse::server_error("检验方案创建失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("[qms] 检验方案创建提交失败: {}", e);
        return ApiResponse::server_error("检验方案创建失败");
    }
    let id: Uuid = row.get("id");
    ApiResponse::success(serde_json::json!({ "id": id }), "检验方案创建成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/inspection-plans/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn update_inspection_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInspectionPlanRequest>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let base_sql = "UPDATE qms.qa_inspection_plans SET \
        name = COALESCE($2, name), product_code = COALESCE($3, product_code), \
        product_name = COALESCE($4, product_name), sampling_plan_id = COALESCE($5, sampling_plan_id), \
        status = COALESCE($6, status), description = COALESCE($7, description), \
        updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id";
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 检验方案写入作用域创建失败: {}", e);
            return ApiResponse::server_error("检验方案更新失败");
        }
    };
    let result = match filter {
        Some(t) => {
            sqlx::query(sqlx::AssertSqlSafe(format!(
                "{base_sql} AND tenant_id = $8"
            )))
            .bind(id)
            .bind(&req.name)
            .bind(&req.product_code)
            .bind(&req.product_name)
            .bind(req.sampling_plan_id)
            .bind(&req.status)
            .bind(&req.description)
            .bind(t)
            .fetch_optional(&mut scope)
            .await
        }
        None => {
            sqlx::query(sqlx::AssertSqlSafe(base_sql))
                .bind(id)
                .bind(&req.name)
                .bind(&req.product_code)
                .bind(&req.product_name)
                .bind(req.sampling_plan_id)
                .bind(&req.status)
                .bind(&req.description)
                .fetch_optional(&mut scope)
                .await
        }
    };
    match result {
        Ok(Some(_)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[qms] 检验方案更新提交失败: {}", e);
                return ApiResponse::server_error("检验方案更新失败");
            }
            ApiResponse::success(serde_json::json!({ "id": id }), "检验方案更新成功")
        }
        Ok(None) => ApiResponse::not_found("检验方案不存在"),
        Err(e) => {
            tracing::error!("[qms] 检验方案更新失败: {}", e);
            ApiResponse::server_error("检验方案更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/inspection-plans/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn delete_inspection_plan(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let filter = tenant_filter(&claims, &headers);
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 检验方案写入作用域创建失败: {}", e);
            return ApiResponse::server_error("检验方案删除失败");
        }
    };
    let result = if let Some(t) = filter {
        sqlx::query(
            "UPDATE qms.qa_inspection_plans SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(t)
        .execute(&mut scope)
        .await
    } else {
        sqlx::query("UPDATE qms.qa_inspection_plans SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&mut scope)
            .await
    };
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[qms] 检验方案删除提交失败: {}", e);
                return ApiResponse::server_error("检验方案删除失败");
            }
            ApiResponse::success("".to_string(), "检验方案删除成功")
        }
        Ok(_) => ApiResponse::not_found("检验方案不存在"),
        Err(e) => {
            tracing::error!("[qms] 检验方案删除失败: {}", e);
            ApiResponse::server_error("检验方案删除失败")
        }
    }
}

// ==================== 方案-检验项 关联 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:inspection_standard:read"])),
    path = "/inspection-plans/{id}/items",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn list_plan_items(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let mut sql = String::from(
        "SELECT pi.id, pi.item_id, i.code AS item_code, i.name AS item_name, pi.sample_qty, pi.sort_order \
         FROM qms.qa_inspection_plan_items pi \
         JOIN qms.qa_inspection_items i ON i.id = pi.item_id AND i.deleted_at IS NULL \
         WHERE pi.plan_id = $1",
    );
    let mut q = sqlx::query(sqlx::AssertSqlSafe(sql.as_str())).bind(id);
    if let Some(t) = filter {
        sql = format!("{sql} AND i.tenant_id = $2");
        q = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(id).bind(t);
    }
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 方案检验项读取作用域创建失败: {}", e);
            return ApiResponse::server_error("查询方案检验项失败");
        }
    };
    let rows = match q.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("[qms] 方案检验项查询失败: {}", e);
            return ApiResponse::server_error("查询方案检验项失败");
        }
    };
    let items: Vec<PlanItemResponse> = rows
        .iter()
        .map(|r| PlanItemResponse {
            id: r.get("id"),
            item_id: r.get("item_id"),
            item_code: r.get("item_code"),
            item_name: r.get("item_name"),
            sample_qty: r.get("sample_qty"),
            sort_order: r.get("sort_order"),
        })
        .collect();
    ApiResponse::success(serde_json::json!({ "items": items }), "查询成功")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/inspection-plans/{id}/items",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn add_plan_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<AddPlanItemRequest>,
) -> ApiResponse<serde_json::Value> {
    let filter = tenant_filter(&claims, &headers);
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 方案检验项写入作用域创建失败: {}", e);
            return ApiResponse::server_error("检验项添加失败");
        }
    };
    // 校验方案与检验项归属（非超管按租户隔离）
    if let Some(t) = filter {
        let ok = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM qms.qa_inspection_plans WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
        )
        .bind(id)
        .bind(t)
        .fetch_one(&mut scope)
        .await
        .unwrap_or(0);
        if ok == 0 {
            return ApiResponse::not_found("检验方案不存在");
        }
    }
    let result = sqlx::query(
        "INSERT INTO qms.qa_inspection_plan_items (plan_id, item_id, sample_qty, sort_order) \
         VALUES ($1, $2, COALESCE($3, 1), COALESCE($4, 0)) RETURNING id",
    )
    .bind(id)
    .bind(req.item_id)
    .bind(req.sample_qty)
    .bind(req.sort_order)
    .fetch_optional(&mut scope)
    .await;
    let row = match result {
        Ok(Some(r)) => r,
        Ok(None) => {
            if let Err(e) = scope.rollback().await {
                tracing::error!("[qms] 回滚检验项添加事务失败: {}", e);
            }
            return ApiResponse::server_error("检验项添加失败");
        }
        Err(e) => {
            tracing::error!("[qms] 检验项添加失败: {}", e);
            if e.to_string().contains("duplicate") {
                return ApiResponse::conflict("该检验项已在方案中");
            }
            return ApiResponse::server_error("检验项添加失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("[qms] 检验项添加提交失败: {}", e);
        return ApiResponse::server_error("检验项添加失败");
    }
    let pid: Uuid = row.get("id");
    ApiResponse::success(serde_json::json!({ "id": pid }), "检验项添加成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:inspection_standard:write"])),
    path = "/inspection-plans/{id}/items/{id}",
    params(
        ("id" = String, Path, description = "id"),
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "QMS/inspection_standard"
)]
pub(crate) async fn remove_plan_item(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<String> {
    let filter = tenant_filter(&claims, &headers);
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[qms] 方案检验项写入作用域创建失败: {}", e);
            return ApiResponse::server_error("检验项移除失败");
        }
    };
    // 明细表无 tenant_id，租户归属由父方案决定：谓词直接进 DELETE（与 add_plan_item 同口径）
    let result = sqlx::query(
        "DELETE FROM qms.qa_inspection_plan_items i \
         USING qms.qa_inspection_plans p \
         WHERE i.plan_id = p.id AND i.plan_id = $1 AND i.item_id = $2 \
           AND p.deleted_at IS NULL \
           AND ($3::uuid IS NULL OR p.tenant_id = $3::uuid)",
    )
    .bind(id)
    .bind(item_id)
    .bind(filter)
    .execute(&mut scope)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[qms] 检验项移除提交失败: {}", e);
                return ApiResponse::server_error("检验项移除失败");
            }
            ApiResponse::success("".to_string(), "检验项移除成功")
        }
        Ok(_) => ApiResponse::not_found("关联不存在"),
        Err(e) => {
            tracing::error!("[qms] 检验项移除失败: {}", e);
            ApiResponse::server_error("检验项移除失败")
        }
    }
}
