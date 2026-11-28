//! LIMS 检验项目（analyte）主数据（批3 P1-7）
//!
//! 对齐 LIMS 现有惯例（test_method.rs）：TenantContext + Claims 租户隔离。

use axum::{
    extract::{Path, Query, State},
    routing::get,
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/analytes", get(list_analytes).post(create_analyte))
        .route(
            "/analytes/{id}",
            get(get_analyte).put(update_analyte).delete(delete_analyte),
        )
}

#[derive(Debug, Clone, Deserialize)]
pub struct AnalyteQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateAnalyteRequest {
    pub analyte_code: String,
    pub analyte_name: String,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub method_reference: Option<String>,
    pub limit_value: Option<String>,
    pub accuracy: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateAnalyteRequest {
    pub analyte_name: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub method_reference: Option<String>,
    pub limit_value: Option<String>,
    pub accuracy: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnalyteResponse {
    pub id: Uuid,
    pub analyte_code: String,
    pub analyte_name: String,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub method_reference: Option<String>,
    pub limit_value: Option<String>,
    pub accuracy: Option<String>,
    pub status: String,
    pub description: Option<String>,
}

fn resolve_tenant(ctx: &TenantContext, claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        Some(ctx.tenant_id)
    }
}

#[utoipa::path(

    get,

    security(("BearerAuth" = [])),

    path = "/api/lims/analytes",

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub(crate) async fn list_analytes(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<AnalyteQuery>,
) -> ApiResponse<serde_json::Value> {
    let filter = resolve_tenant(&ctx, &claims);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let mut where_sql = String::from("WHERE deleted_at IS NULL");
    let mut params: Vec<String> = Vec::new();
    let mut idx = 1usize;
    if let Some(t) = filter {
        where_sql.push_str(&format!(" AND tenant_id = ${idx}"));
        params.push(t.to_string());
        idx += 1;
    }
    if let Some(status) = &query.status {
        if !status.is_empty() {
            where_sql.push_str(&format!(" AND status = ${idx}"));
            params.push(status.clone());
            idx += 1;
        }
    }
    if let Some(search) = &query.search {
        if !search.is_empty() {
            where_sql.push_str(&format!(
                " AND (analyte_name ILIKE ${idx} OR analyte_code ILIKE ${idx})"
            ));
            params.push(format!("%{search}%"));
        }
    }
    let count_sql = format!("SELECT COUNT(*) FROM lims.qa_lims_analytes {where_sql}");
    let mut count_query = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        count_query = count_query.bind(p);
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
            tracing::error!("[lims] 查询检验项目读作用域创建失败: {}", e);
            return ApiResponse::server_error("查询检验项目失败");
        }
    };
    let total: i64 = match count_query.fetch_one(&mut scope).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[lims] analyte 计数失败: {}", e);
            return ApiResponse::server_error("查询检验项目失败");
        }
    };
    let fetch_sql = format!(
        "SELECT id, analyte_code, analyte_name, category, unit, method_reference, limit_value, accuracy, status, description \
         FROM lims.qa_lims_analytes {where_sql} ORDER BY created_at DESC LIMIT {page_size} OFFSET {}",
        (page - 1) * page_size
    );
    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        fetch_query = fetch_query.bind(p);
    }
    let rows = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("[lims] analyte 查询失败: {}", e);
            return ApiResponse::server_error("查询检验项目失败");
        }
    };
    let items: Vec<AnalyteResponse> = rows
        .iter()
        .map(|r| AnalyteResponse {
            id: r.get("id"),
            analyte_code: r.get("analyte_code"),
            analyte_name: r.get("analyte_name"),
            category: r.get("category"),
            unit: r.get("unit"),
            method_reference: r.get("method_reference"),
            limit_value: r.get("limit_value"),
            accuracy: r.get("accuracy"),
            status: r.get("status"),
            description: r.get("description"),
        })
        .collect();

    let _ = scope.commit().await;

    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "查询成功",
    )
}

#[utoipa::path(

    get,

    security(("BearerAuth" = [])),

    path = "/api/lims/analytes/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub(crate) async fn get_analyte(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_ctx): Extension<TenantContext>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let sql = String::from(
        "SELECT id, analyte_code, analyte_name, category, unit, method_reference, limit_value, accuracy, status, description \
         FROM lims.qa_lims_analytes WHERE id = $1 AND deleted_at IS NULL",
    );
    let q = sqlx::query(sqlx::AssertSqlSafe(sql.as_str())).bind(id);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 查询检验项目读作用域创建失败: {}", e);
            return ApiResponse::server_error("查询检验项目失败");
        }
    };
    let row = q.fetch_optional(&mut scope).await;

    let _ = scope.commit().await;

    match row {
        Ok(Some(r)) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "analyte_code": r.get::<String, _>("analyte_code"),
                "analyte_name": r.get::<String, _>("analyte_name"),
                "category": r.get::<Option<String>, _>("category"),
                "unit": r.get::<Option<String>, _>("unit"),
                "method_reference": r.get::<Option<String>, _>("method_reference"),
                "limit_value": r.get::<Option<String>, _>("limit_value"),
                "accuracy": r.get::<Option<String>, _>("accuracy"),
                "status": r.get::<String, _>("status"),
                "description": r.get::<Option<String>, _>("description"),
            }),
            "查询成功",
        ),
        Ok(None) => ApiResponse::not_found("检验项目不存在"),
        Err(e) => {
            tracing::error!("[lims] analyte 查询失败: {}", e);
            ApiResponse::server_error("查询检验项目失败")
        }
    }
}

#[utoipa::path(

    post,

    security(("BearerAuth" = [])),

    path = "/api/lims/analytes",

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub(crate) async fn create_analyte(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAnalyteRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = ctx.tenant_id;
    let _ = claims;
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 检验项目创建写作用域创建失败: {}", e);
            return ApiResponse::server_error("检验项目创建失败");
        }
    };
    let result = sqlx::query(
        "INSERT INTO lims.qa_lims_analytes \
         (tenant_id, analyte_code, analyte_name, category, unit, method_reference, limit_value, accuracy, status, description) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'active'), $10) RETURNING id",
    )
    .bind(tenant_id)
    .bind(&req.analyte_code)
    .bind(&req.analyte_name)
    .bind(&req.category)
    .bind(&req.unit)
    .bind(&req.method_reference)
    .bind(&req.limit_value)
    .bind(&req.accuracy)
    .bind(&req.status)
    .bind(&req.description)
    .fetch_optional(&mut scope)
    .await;
    match result {
        Ok(Some(r)) => {
            let id: Uuid = r.get("id");
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 检验项目创建事务提交失败: {}", e);
                return ApiResponse::server_error("检验项目创建失败");
            }
            ApiResponse::success(serde_json::json!({ "id": id }), "检验项目创建成功")
        }
        Ok(None) => ApiResponse::server_error("检验项目创建失败"),
        Err(e) => {
            tracing::error!("[lims] analyte 创建失败: {}", e);
            if e.to_string().contains("duplicate") {
                return ApiResponse::conflict("检验项目编码已存在");
            }
            ApiResponse::server_error("检验项目创建失败")
        }
    }
}

#[utoipa::path(

    put,

    security(("BearerAuth" = [])),

    path = "/api/lims/analytes/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub(crate) async fn update_analyte(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAnalyteRequest>,
) -> ApiResponse<serde_json::Value> {
    let filter = resolve_tenant(&ctx, &claims);
    let base_sql = "UPDATE lims.qa_lims_analytes SET \
        analyte_name = COALESCE($2, analyte_name), category = COALESCE($3, category), \
        unit = COALESCE($4, unit), method_reference = COALESCE($5, method_reference), \
        limit_value = COALESCE($6, limit_value), accuracy = COALESCE($7, accuracy), \
        status = COALESCE($8, status), description = COALESCE($9, description), \
        updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id";
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 检验项目更新写作用域创建失败: {}", e);
            return ApiResponse::server_error("检验项目更新失败");
        }
    };
    let result = match filter {
        Some(t) => {
            sqlx::query(sqlx::AssertSqlSafe(format!(
                "{base_sql} AND tenant_id = $10"
            )))
            .bind(id)
            .bind(&req.analyte_name)
            .bind(&req.category)
            .bind(&req.unit)
            .bind(&req.method_reference)
            .bind(&req.limit_value)
            .bind(&req.accuracy)
            .bind(&req.status)
            .bind(&req.description)
            .bind(t)
            .fetch_optional(&mut scope)
            .await
        }
        None => {
            sqlx::query(sqlx::AssertSqlSafe(base_sql))
                .bind(id)
                .bind(&req.analyte_name)
                .bind(&req.category)
                .bind(&req.unit)
                .bind(&req.method_reference)
                .bind(&req.limit_value)
                .bind(&req.accuracy)
                .bind(&req.status)
                .bind(&req.description)
                .fetch_optional(&mut scope)
                .await
        }
    };
    match result {
        Ok(Some(_)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 检验项目更新事务提交失败: {}", e);
                return ApiResponse::server_error("检验项目更新失败");
            }
            ApiResponse::success(serde_json::json!({ "id": id }), "检验项目更新成功")
        }
        Ok(None) => ApiResponse::not_found("检验项目不存在"),
        Err(e) => {
            tracing::error!("[lims] analyte 更新失败: {}", e);
            ApiResponse::server_error("检验项目更新失败")
        }
    }
}

#[utoipa::path(

    delete,

    security(("BearerAuth" = [])),

    path = "/api/lims/analytes/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub(crate) async fn delete_analyte(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let filter = resolve_tenant(&ctx, &claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 检验项目删除写作用域创建失败: {}", e);
            return ApiResponse::server_error("检验项目删除失败");
        }
    };
    let result = if let Some(t) = filter {
        sqlx::query(
            "UPDATE lims.qa_lims_analytes SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(t)
        .execute(&mut scope)
        .await
    } else {
        sqlx::query("UPDATE lims.qa_lims_analytes SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&mut scope)
            .await
    };
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 检验项目删除事务提交失败: {}", e);
                return ApiResponse::server_error("检验项目删除失败");
            }
            ApiResponse::success("".to_string(), "检验项目删除成功")
        }
        Ok(_) => ApiResponse::not_found("检验项目不存在"),
        Err(e) => {
            tracing::error!("[lims] analyte 删除失败: {}", e);
            ApiResponse::server_error("检验项目删除失败")
        }
    }
}
