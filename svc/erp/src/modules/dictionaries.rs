//! ERP 数据字典主数据（批4 P1-9）

use axum::{
    extract::{Path, Query, State},
    routing::get,
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::get_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;

use crate::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/dictionaries",
            get(list_dictionaries).post(create_dictionary),
        )
        .route(
            "/dictionaries/{id}",
            get(get_dictionary)
                .put(update_dictionary)
                .delete(delete_dictionary),
        )
}

#[derive(Debug, Clone, Deserialize)]
pub struct DictionaryQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    search: Option<String>,
    status: Option<String>,
    category: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateDictionaryRequest {
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub items: Option<serde_json::Value>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateDictionaryRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub items: Option<serde_json::Value>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DictionaryResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub items: Option<serde_json::Value>,
    pub status: String,
    pub description: Option<String>,
}

async fn list_dictionaries(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<DictionaryQuery>,
) -> ApiResponse<serde_json::Value> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let mut where_sql = String::from("WHERE deleted_at IS NULL");
    let mut params: Vec<String> = Vec::new();
    let mut idx = 1usize;
    if let Some(t) = tenant_opt {
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
    if let Some(category) = &query.category {
        if !category.is_empty() {
            where_sql.push_str(&format!(" AND category = ${idx}"));
            params.push(category.clone());
            idx += 1;
        }
    }
    if let Some(search) = &query.search {
        if !search.is_empty() {
            where_sql.push_str(&format!(" AND (name ILIKE ${idx} OR code ILIKE ${idx})"));
            params.push(format!("%{search}%"));
        }
    }
    let count_sql = format!("SELECT COUNT(*) FROM erp_dictionaries {where_sql}");
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);
    for p in &params {
        count_query = count_query.bind(p);
    }
    let total = match count_query.fetch_one(&state.db).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[erp] dictionaries 计数失败: {}", e);
            return ApiResponse::server_error("查询字典失败");
        }
    };
    let fetch_sql = format!(
        "SELECT id, code, name, category, items, status, description FROM erp_dictionaries \
         {where_sql} ORDER BY created_at DESC LIMIT {page_size} OFFSET {}",
        (page - 1) * page_size
    );
    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p);
    }
    let rows = match fetch_query.fetch_all(&state.db).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("[erp] dictionaries 查询失败: {}", e);
            return ApiResponse::server_error("查询字典失败");
        }
    };
    let items: Vec<DictionaryResponse> = rows
        .iter()
        .map(|r| DictionaryResponse {
            id: r.get("id"),
            code: r.get("code"),
            name: r.get("name"),
            category: r.get("category"),
            items: r.get("items"),
            status: r.get("status"),
            description: r.get("description"),
        })
        .collect();
    ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "查询成功",
    )
}

async fn get_dictionary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let mut sql = String::from(
        "SELECT id, code, name, category, items, status, description FROM erp_dictionaries \
         WHERE id = $1 AND deleted_at IS NULL",
    );
    let mut q = sqlx::query(&sql).bind(id);
    if let Some(t) = tenant_opt {
        sql = format!("{sql} AND tenant_id = $2");
        q = sqlx::query(&sql).bind(id).bind(t);
    }
    let row = q.fetch_optional(&state.db).await;
    match row {
        Ok(Some(r)) => ApiResponse::success(
            serde_json::json!({
                "id": r.get::<Uuid, _>("id"),
                "code": r.get::<String, _>("code"),
                "name": r.get::<String, _>("name"),
                "category": r.get::<Option<String>, _>("category"),
                "items": r.get::<Option<serde_json::Value>, _>("items"),
                "status": r.get::<String, _>("status"),
                "description": r.get::<Option<String>, _>("description"),
            }),
            "查询成功",
        ),
        Ok(None) => ApiResponse::not_found("字典不存在"),
        Err(e) => {
            tracing::error!("[erp] dictionary 查询失败: {}", e);
            ApiResponse::server_error("查询字典失败")
        }
    }
}

async fn create_dictionary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateDictionaryRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let result = sqlx::query(
        "INSERT INTO erp_dictionaries (tenant_id, code, name, category, items, status, description) \
         VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'active'), $7) RETURNING id",
    )
    .bind(tenant_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.category)
    .bind(&req.items)
    .bind(&req.status)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await;
    match result {
        Ok(Some(r)) => {
            let id: Uuid = r.get("id");
            ApiResponse::success(serde_json::json!({ "id": id }), "字典创建成功")
        }
        Ok(None) => ApiResponse::server_error("字典创建失败"),
        Err(e) => {
            tracing::error!("[erp] dictionary 创建失败: {}", e);
            if e.to_string().contains("duplicate") {
                return ApiResponse::conflict("字典编码已存在");
            }
            ApiResponse::server_error("字典创建失败")
        }
    }
}

async fn update_dictionary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDictionaryRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let base_sql = "UPDATE erp_dictionaries SET \
        name = COALESCE($2, name), category = COALESCE($3, category), \
        items = COALESCE($4, items), status = COALESCE($5, status), \
        description = COALESCE($6, description), updated_at = NOW() \
        WHERE id = $1 AND deleted_at IS NULL RETURNING id";
    let result = match tenant_opt {
        Some(t) => {
            sqlx::query(&format!("{base_sql} AND tenant_id = $7"))
                .bind(id)
                .bind(&req.name)
                .bind(&req.category)
                .bind(&req.items)
                .bind(&req.status)
                .bind(&req.description)
                .bind(t)
                .fetch_optional(&state.db)
                .await
        }
        None => {
            sqlx::query(base_sql)
                .bind(id)
                .bind(&req.name)
                .bind(&req.category)
                .bind(&req.items)
                .bind(&req.status)
                .bind(&req.description)
                .fetch_optional(&state.db)
                .await
        }
    };
    match result {
        Ok(Some(_)) => ApiResponse::success(serde_json::json!({ "id": id }), "字典更新成功"),
        Ok(None) => ApiResponse::not_found("字典不存在"),
        Err(e) => {
            tracing::error!("[erp] dictionary 更新失败: {}", e);
            ApiResponse::server_error("字典更新失败")
        }
    }
}

async fn delete_dictionary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(get_tenant_id_from_claims(&claims))
    };
    let result = if let Some(t) = tenant_opt {
        sqlx::query(
            "UPDATE erp_dictionaries SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        )
        .bind(id)
        .bind(t)
        .execute(&state.db)
        .await
    } else {
        sqlx::query("UPDATE erp_dictionaries SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&state.db)
            .await
    };
    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success("".to_string(), "字典删除成功"),
        Ok(_) => ApiResponse::not_found("字典不存在"),
        Err(e) => {
            tracing::error!("[erp] dictionary 删除失败: {}", e);
            ApiResponse::server_error("字典删除失败")
        }
    }
}
