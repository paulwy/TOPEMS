use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use topems_shared_auth::middleware::tenant::RlsTxnCell;

// ==================== P2-11 剩余项：PM 项目类型模板接真 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProjectTypeConfig {
    pub id: Uuid,
    pub type_code: String,
    pub type_name: String,
    pub name_en: Option<String>,
    pub description: Option<String>,
    pub default_phases: Option<String>,
    pub default_milestones: Option<String>,
    pub default_workflow: Option<Uuid>,
    pub is_active: bool,
    #[serde(deserialize_with = "topems_shared_db::datetime_text::deserialize")]
    pub created_at: DateTime<Utc>,
    #[serde(deserialize_with = "topems_shared_db::datetime_text::deserialize")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListTypesQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTypeRequest {
    pub type_code: String,
    pub type_name: String,
    pub name_en: Option<String>,
    pub description: Option<String>,
    pub default_phases: Option<String>,
    pub default_milestones: Option<String>,
    pub default_workflow: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTypeRequest {
    pub type_name: Option<String>,
    pub name_en: Option<String>,
    pub description: Option<String>,
    pub default_phases: Option<String>,
    pub default_milestones: Option<String>,
    pub default_workflow: Option<Uuid>,
    pub is_active: Option<bool>,
}

pub fn create_routes(db: Db) -> Router {
    Router::new()
        .route("/project-types", get(list_types).post(create_type))
        .route(
            "/project-types/{id}",
            get(get_type).put(update_type).delete(delete_type),
        )
        .with_state(db)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/project-types",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "project_type_config"
)]
async fn list_types(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(query): Query<ListTypesQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, ProjectTypeConfig>(
        r#"
        SELECT id, type_code, type_name, name_en, description,
               default_phases::text, default_milestones::text, default_workflow,
               is_active, created_at, updated_at
        FROM pm.project_type_configs
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR type_code ILIKE $1 OR type_name ILIKE $1 OR COALESCE(name_en, '') ILIKE $1)
          AND ($2::boolean IS NULL OR is_active = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(query.is_active)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pm.project_type_configs
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR type_code ILIKE $1 OR type_name ILIKE $1 OR COALESCE(name_en, '') ILIKE $1)
                  AND ($2::boolean IS NULL OR is_active = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(query.is_active)
            .fetch_one(&mut scope)
            .await;
            let total = count_result.unwrap_or(0);
            ApiResponse::success(
                serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
                "获取项目类型列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取项目类型列表失败: {e}");
            ApiResponse::server_error("获取项目类型列表失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    post,
    path = "/api/pm/project-types",
    tag = "project_type_config",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_type(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateTypeRequest>,
) -> ApiResponse<ProjectTypeConfig> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    if req.type_code.trim().is_empty() || req.type_name.trim().is_empty() {
        return ApiResponse::bad_request("类型编码与名称不能为空");
    }

    // 写租户表必须显式带租户：缺失即报错，不兜底 nil/…0001。
    let Some(tenant_ctx) = topems_shared_auth::middleware::tenant::current_request_tenant() else {
        return ApiResponse::server_error("RLS context missing: 无租户上下文");
    };

    let sql = format!(
        r#"
        INSERT INTO pm.project_type_configs
            (type_code, type_name, name_en, description, default_phases, default_milestones, default_workflow, tenant_id)
        VALUES
            ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
        RETURNING id, type_code, type_name, name_en, description,
                  default_phases::text, default_milestones::text, default_workflow,
                  is_active, created_at, updated_at
        "#
    );

    let result = sqlx::query_as::<_, ProjectTypeConfig>(sqlx::AssertSqlSafe(sql))
        .bind(&req.type_code)
        .bind(&req.type_name)
        .bind(&req.name_en)
        .bind(&req.description)
        .bind(&req.default_phases)
        .bind(&req.default_milestones)
        .bind(req.default_workflow)
        .bind(tenant_ctx.tenant)
        .fetch_one(&mut scope)
        .await;

    match result {
        Ok(row) => ApiResponse::success(row, "创建项目类型成功"),
        Err(e) => {
            tracing::error!("创建项目类型失败: {e}");
            ApiResponse::server_error("创建项目类型失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/project-types/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "project_type_config"
)]
async fn get_type(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProjectTypeConfig> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let result = sqlx::query_as::<_, ProjectTypeConfig>(
        r#"
        SELECT id, type_code, type_name, name_en, description,
               default_phases::text, default_milestones::text, default_workflow,
               is_active, created_at, updated_at
        FROM pm.project_type_configs
        WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(row)) => ApiResponse::success(row, "获取项目类型成功"),
        Ok(None) => ApiResponse::not_found("项目类型不存在"),
        Err(e) => {
            tracing::error!("获取项目类型失败: {e}");
            ApiResponse::server_error("获取项目类型失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    put,
    path = "/api/pm/project-types/{id}",
    tag = "project_type_config",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_type(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTypeRequest>,
) -> ApiResponse<ProjectTypeConfig> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let result = sqlx::query_as::<_, ProjectTypeConfig>(
        r#"
        UPDATE pm.project_type_configs SET
            type_name = COALESCE($2, type_name),
            name_en = COALESCE($3, name_en),
            description = COALESCE($4, description),
            default_phases = COALESCE($5::jsonb, default_phases),
            default_milestones = COALESCE($6::jsonb, default_milestones),
            default_workflow = COALESCE($7, default_workflow),
            is_active = COALESCE($8, is_active),
            updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, type_code, type_name, name_en, description,
                  default_phases::text, default_milestones::text, default_workflow,
                  is_active, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.type_name)
    .bind(&req.name_en)
    .bind(&req.description)
    .bind(&req.default_phases)
    .bind(&req.default_milestones)
    .bind(req.default_workflow)
    .bind(req.is_active)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(row)) => ApiResponse::success(row, "更新项目类型成功"),
        Ok(None) => ApiResponse::not_found("项目类型不存在"),
        Err(e) => {
            tracing::error!("更新项目类型失败: {e}");
            ApiResponse::server_error("更新项目类型失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    delete,
    path = "/api/pm/project-types/{id}",
    tag = "project_type_config",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn delete_type(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE pm.project_type_configs SET deleted_at = now(), updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => {
            ApiResponse::success(serde_json::Value::Null, "删除项目类型成功")
        }
        Ok(_) => ApiResponse::not_found("项目类型不存在"),
        Err(e) => {
            tracing::error!("删除项目类型失败: {e}");
            ApiResponse::server_error("删除项目类型失败")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgConnectOptions;
    use sqlx::PgPool;
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(Db::new(make_pool(), "pm, public, shared"));
        let _ = router;
    }
}
