use crate::models::Pipeline;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, Query, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use topems_shared_db::scope::Db;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePipeline {
    pub name: String,
    pub code: String,
    pub pipeline_type: String,
    pub path: serde_json::Value,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:pipeline:read"])),
    path = "/pipelines",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "pipeline"
)]
pub async fn list_pipelines(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let page: i64 = params.get("page").and_then(|s| s.parse().ok()).unwrap_or(1);
    let page_size: i64 = params
        .get("page_size")
        .and_then(|s| s.parse().ok())
        .unwrap_or(20);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Pipeline>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM gis.pipelines ORDER BY created_at DESC LIMIT $1 OFFSET $2"),
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;
    match result {
        Ok(pipelines) => {
            let total: i64 = sqlx::query(only_own_schema_query!(
                "gis",
                "SELECT COUNT(*) FROM gis.pipelines WHERE deleted_at IS NULL"
            ))
            .fetch_one(&mut scope)
            .await
            .map(|row| row.get::<i64, _>(0))
            .unwrap_or(0);
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("事务提交失败", e));
            }
            ApiResponse::success(
                serde_json::json!({
                    "pipelines": pipelines,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取管道列表成功",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:pipeline:write"])),
    path = "/pipelines",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "pipeline"
)]
pub async fn create_pipeline(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreatePipeline>,
) -> ApiResponse<Pipeline> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::PipelineWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let status = payload.status.unwrap_or_else(|| "active".to_string());
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);
    let result = sqlx::query_as::<_, Pipeline>(only_own_schema_query!(
        "gis",
        r#"
        INSERT INTO gis.pipelines (name, code, pipeline_type, path, status, description, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#
    ))
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.pipeline_type)
    .bind(&payload.path)
    .bind(&status)
    .bind(&payload.description)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(pipeline) => ApiResponse::success(pipeline, "创建管道成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库插入失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:pipeline:read"])),
    path = "/pipelines/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "pipeline"
)]
pub async fn get_pipeline(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Pipeline> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let result = sqlx::query_as::<_, Pipeline>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM gis.pipelines WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(pipeline) => ApiResponse::success(pipeline, "获取管道成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("管道未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["gis:pipeline:write"])),
    path = "/pipelines/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "pipeline"
)]
pub async fn update_pipeline(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreatePipeline>,
) -> ApiResponse<Pipeline> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::PipelineWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let status = payload.status.unwrap_or_else(|| "active".to_string());
    let result = sqlx::query_as::<_, Pipeline>(
        only_own_schema_query!("gis", r#"
        UPDATE gis.pipelines 
        SET name = $1, code = $2, pipeline_type = $3, path = $4, status = $5, description = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *
        "#),
    )
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.pipeline_type)
    .bind(&payload.path)
    .bind(&status)
    .bind(&payload.description)
    .bind(id)
    .fetch_one(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(pipeline) => ApiResponse::success(pipeline, "更新管道成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("管道未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库更新失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["gis:pipeline:write"])),
    path = "/pipelines/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "pipeline"
)]
pub async fn delete_pipeline(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<bool> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::PipelineWrite).await {
        return e.0;
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);

    let result = sqlx::query(only_own_schema_query!(
        "gis",
        "UPDATE gis.pipelines SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                ApiResponse::success(true, "删除管道成功")
            } else {
                ApiResponse::not_found("管道未找到")
            }
        }
        Err(e) => ApiResponse::from(TopemsError::internal("数据库删除失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:pipeline:read"])),
    path = "/pipelines/map/{map_id}",
    params(
("map_id" = String, Path, description = "map_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "pipeline"
)]
pub async fn list_pipelines_by_map(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path(map_id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let result = sqlx::query_as::<_, Pipeline>(
        only_own_schema_query!("gis", "SELECT id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM gis.pipelines WHERE deleted_at IS NULL AND map_id = $1 ORDER BY created_at DESC"),
    )
    .bind(map_id)
    .fetch_all(&mut scope)
    .await;
    let commit_res = match &result {
        Ok(_) => scope.commit().await,
        Err(_) => Ok(()),
    };
    if let Err(e) = commit_res {
        return ApiResponse::from(TopemsError::internal("事务提交失败", e));
    }
    match result {
        Ok(pipelines) => ApiResponse::success(
            serde_json::json!({
                "pipelines": pipelines,
                "total": pipelines.len()
            }),
            "获取管道列表成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

pub fn create_routes() -> Router<Db> {
    Router::new()
        .route("/pipelines", axum::routing::get(list_pipelines))
        .route("/pipelines", axum::routing::post(create_pipeline))
        .route("/pipelines/{id}", axum::routing::get(get_pipeline))
        .route("/pipelines/{id}", axum::routing::put(update_pipeline))
        .route("/pipelines/{id}", axum::routing::delete(delete_pipeline))
        .route(
            "/pipelines/map/{map_id}",
            axum::routing::get(list_pipelines_by_map),
        )
}
