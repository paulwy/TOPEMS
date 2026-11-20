use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use sqlx::Column;
use sqlx::Row;
use tracing::{info, warn};

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::{BindTenantScope, TenantScope};
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::{ApiResponse, ListResponse};

#[derive(Debug, Deserialize)]
pub struct ListDatasetQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub data_source_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateDatasetRequest {
    pub name: String,
    pub description: Option<String>,
    pub datasource_id: Uuid,
    pub sql_query: String,
    pub fields: Option<serde_json::Value>,
    pub filters: Option<serde_json::Value>,
    pub config: Option<serde_json::Value>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateDatasetRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub sql_query: Option<String>,
    pub fields: Option<serde_json::Value>,
    pub filters: Option<serde_json::Value>,
    pub config: Option<serde_json::Value>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct DatasetQueryParams {
    pub dataset_id: Option<Uuid>,
    pub fields: Option<Vec<String>>,
    pub filters: Option<serde_json::Value>,
    pub group_by: Option<Vec<String>>,
    pub order_by: Option<serde_json::Value>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct TestSqlQueryRequest {
    /// 数据源标识（前端 Select 传字符串如 ds-mysql-001；执行恒走本地主库 pool，故宽容解析）
    pub data_source_id: String,
    pub sql: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Dataset {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub datasource_id: Uuid,
    pub sql_query: String,
    pub fields: Option<serde_json::Value>,
    pub filters: Option<serde_json::Value>,
    pub config: Option<serde_json::Value>,
    pub status: String,
    pub is_public: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub last_refreshed_at: Option<DateTime<Utc>>,
    pub owner_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 数据集读路由（由 routes.rs 叠加细粒度码 bi:dataset:read）
pub fn create_read_routes() -> Router<AppState> {
    Router::new()
        .route("/datasets", get(list_datasets))
        .route("/datasets/{id}", get(get_dataset))
        .route("/datasets/{id}/preview", get(get_dataset_preview))
        // 查询与 SQL 试跑属于只读计算语义（POST 仅为传参）
        .route("/datasets/query", post(query_dataset))
        .route("/datasets/test-sql", post(test_sql_query))
}

/// 数据集写路由（由 routes.rs 叠加细粒度码 bi:dataset:write）
pub fn create_write_routes() -> Router<AppState> {
    Router::new()
        .route("/datasets", post(create_dataset))
        .route("/datasets/{id}", put(update_dataset).delete(delete_dataset))
        .route("/datasets/{id}/publish", post(publish_dataset))
        .route("/datasets/{id}/refresh", post(refresh_dataset))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/datasets",
    tag = "BI",
    responses(
        (status = 200, description = "List of datasets", body = serde_json::Value),
    ),
)]
pub async fn list_datasets(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Query(params): Query<ListDatasetQuery>,
) -> ApiResponse<ListResponse<Dataset>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    // A 类：请求路径按 Claims 开事务作用域。普通租户只能看到自身行 + 平台级行（tenant_id IS NULL）；
    // 服务令牌走系统通道（app.rls_system='on'）。缺租户的普通用户直接 400。
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.bi.list_datasets",
        "bi.analytics_datasets",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return ApiResponse::from(TopemsError::ValidationFailed(message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::error(500, "数据库事务上下文缺失");
    };
    let mut db_scope = match crate::shared::open_read_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            warn!("打开只读作用域失败: {}", e);
            return ApiResponse::server_error("获取数据集列表失败");
        }
    };
    // 平台级数据集（tenant_id IS NULL）由 RLS 放行；租户自有数据集严格按租户隔离。
    let tenant_pred = tenant_scope.sql_predicate("tenant_id", "$6");

    let query = format!(
        "SELECT id, name, description, datasource_id, sql_query, fields, filters, config, status, is_public, published_at, last_refreshed_at, owner_id, created_at, updated_at FROM bi.analytics_datasets WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1) AND ($2::text IS NULL OR status = $2) AND ($3::uuid IS NULL OR datasource_id = $3) AND {} ORDER BY created_at DESC LIMIT $4 OFFSET $5",
        tenant_pred
    );
    let result = sqlx::query_as::<_, Dataset>(sqlx::AssertSqlSafe(query))
        .bind(params.search.as_deref().map(|s| format!("%{}%", s)))
        .bind(params.status.as_deref())
        .bind(params.data_source_id)
        .bind(page_size)
        .bind(offset)
        .bind_tenant_scope(&tenant_scope)
        .fetch_all(&mut db_scope)
        .await;

    match result {
        Ok(datasets) => {
            let count_tenant_pred = tenant_scope.sql_predicate("tenant_id", "$4");
            let total = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(format!(
                "SELECT COUNT(*) FROM bi.analytics_datasets WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1) AND ($2::text IS NULL OR status = $2) AND ($3::uuid IS NULL OR datasource_id = $3) AND {}",
                count_tenant_pred
            )))
            .bind(params.search.as_deref().map(|s| format!("%{}%", s)))
            .bind(params.status.as_deref())
            .bind(params.data_source_id)
            .bind_tenant_scope(&tenant_scope)
            .fetch_one(&mut db_scope)
            .await
            .unwrap_or(0);

            ApiResponse::success(
                ListResponse::with_pagination(datasets, total, page, page_size),
                "查询成功",
            )
        }
        Err(e) => {
            warn!("获取数据集列表失败: {}", e);
            ApiResponse::server_error("获取数据集列表失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/datasets/{id}",
    tag = "BI",
    params(
        ("id" = uuid::Uuid, Path, description = "Dataset ID")
    ),
    responses(
        (status = 200, description = "Dataset details", body = serde_json::Value),
    ),
)]
pub async fn get_dataset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.bi.get_dataset",
        "bi.analytics_datasets",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_read_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            warn!("打开只读作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "获取数据集失败",
            ));
        }
    };
    let result = sqlx::query_as::<_, Dataset>(sqlx::AssertSqlSafe(format!(
        "SELECT id, name, description, datasource_id, sql_query, fields, filters, config, status, is_public, published_at, last_refreshed_at, owner_id, created_at, updated_at FROM bi.analytics_datasets WHERE deleted_at IS NULL AND id = $1 AND {}",
        tenant_scope.sql_predicate("tenant_id", "$2")
    )))
    .bind(id)
    .bind_tenant_scope(&tenant_scope)
    .fetch_one(&mut db_scope)
    .await;

    match result {
        Ok(dataset) => Json(serde_json::json!({
            "success": true,
            "data": dataset,
            "message": "获取数据集成功"
        })),
        Err(sqlx::Error::RowNotFound) => Json(topems_shared_core::response::error_value(
            404,
            "数据集不存在",
        )),
        Err(e) => {
            warn!("获取数据集失败: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                "获取数据集失败",
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:write"])),
    path = "/api/bi/datasets",
    tag = "BI",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    ),
)]
pub async fn create_dataset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Json(req): Json<CreateDatasetRequest>,
) -> Json<serde_json::Value> {
    let owner_id = "system".to_string();
    let now = Utc::now();
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.bi.create_dataset",
        "bi.analytics_datasets",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_write_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            warn!("打开写作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "创建数据集失败",
            ));
        }
    };

    let result = sqlx::query(
        r#"INSERT INTO bi.analytics_datasets (name, description, datasource_id, sql_query, fields, filters, config, status, is_public, owner_id, created_at, updated_at, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id"#,
    )
    .bind(req.name)
    .bind(req.description)
    .bind(req.datasource_id)
    .bind(req.sql_query)
    .bind(req.fields.unwrap_or(serde_json::json!([])))
    .bind(req.filters)
    .bind(req.config)
    .bind("draft")
    .bind(req.is_public.unwrap_or(false))
    .bind(owner_id)
    .bind(now)
    .bind(now)
    .bind(tenant_scope.tenant_id())
    .fetch_one(&mut db_scope)
    .await;

    match result {
        Ok(row) => {
            if let Err(e) = db_scope.commit().await {
                warn!("创建数据集提交失败: {}", e);
                return Json(topems_shared_core::response::error_value(
                    500,
                    "创建数据集失败",
                ));
            }
            let id: Uuid = row.get("id");
            info!("创建数据集成功: id={}", id);
            Json(serde_json::json!({
                "success": true,
                "data": {"id": id},
                "message": "创建数据集成功"
            }))
        }
        Err(e) => {
            warn!("创建数据集失败: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                "创建数据集失败",
            ))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:update"])),
    path = "/api/bi/datasets/{id}",
    tag = "BI",
    params(
        ("id" = uuid::Uuid, Path, description = "Dataset ID")
    ),
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
)]
pub async fn update_dataset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDatasetRequest>,
) -> Json<serde_json::Value> {
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.bi.update_dataset",
        "bi.analytics_datasets",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_write_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            warn!("打开写作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "更新数据集失败",
            ));
        }
    };
    let result = sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"UPDATE bi.analytics_datasets SET name = COALESCE($1, name), description = COALESCE($2, description), sql_query = COALESCE($3, sql_query), fields = COALESCE($4, fields), filters = COALESCE($5, filters), config = COALESCE($6, config), is_public = COALESCE($7, is_public), updated_at = $8 WHERE id = $9 AND {}"#,
        tenant_scope.sql_predicate("tenant_id", "$10")
    )))
    .bind(req.name)
    .bind(req.description)
    .bind(req.sql_query)
    .bind(req.fields)
    .bind(req.filters)
    .bind(req.config)
    .bind(req.is_public)
    .bind(Utc::now())
    .bind(id)
    .bind_tenant_scope(&tenant_scope)
    .execute(&mut db_scope)
    .await;

    match result {
        Ok(done) => {
            if done.rows_affected() == 0 {
                return Json(topems_shared_core::response::error_value(
                    404,
                    "数据集不存在",
                ));
            }
            if let Err(e) = db_scope.commit().await {
                warn!("更新数据集提交失败: {}", e);
                return Json(topems_shared_core::response::error_value(
                    500,
                    "更新数据集失败",
                ));
            }
            info!("更新数据集成功: id={}", id);
            Json(serde_json::json!({
                "success": true,
                "data": null,
                "message": "更新数据集成功"
            }))
        }
        Err(e) => {
            warn!("更新数据集失败: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                "更新数据集失败",
            ))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:delete"])),
    path = "/api/bi/datasets/{id}",
    tag = "BI",
    params(
        ("id" = uuid::Uuid, Path, description = "Dataset ID")
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
)]
pub async fn delete_dataset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.bi.delete_dataset",
        "bi.analytics_datasets",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_write_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            warn!("打开写作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "删除数据集失败",
            ));
        }
    };
    let result = sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE bi.analytics_datasets SET deleted_at = NOW() WHERE id = $1 AND {}",
        tenant_scope.sql_predicate("tenant_id", "$2")
    )))
    .bind(id)
    .bind_tenant_scope(&tenant_scope)
    .execute(&mut db_scope)
    .await;

    match result {
        Ok(done) => {
            if done.rows_affected() == 0 {
                return Json(topems_shared_core::response::error_value(
                    404,
                    "数据集不存在",
                ));
            }
            if let Err(e) = db_scope.commit().await {
                warn!("删除数据集提交失败: {}", e);
                return Json(topems_shared_core::response::error_value(
                    500,
                    "删除数据集失败",
                ));
            }
            info!("删除数据集成功: id={}", id);
            Json(serde_json::json!({
                "success": true,
                "data": null,
                "message": "删除数据集成功"
            }))
        }
        Err(e) => {
            warn!("删除数据集失败: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                "删除数据集失败",
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/api/bi/datasets/{id}/publish",
    tag = "BI",
    params(
        ("id" = uuid::Uuid, Path, description = "Dataset ID")
    ),
    responses(
        (status = 200, description = "Dataset published", body = serde_json::Value),
    ),
)]
pub async fn publish_dataset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.bi.publish_dataset",
        "bi.analytics_datasets",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_write_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            warn!("打开写作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "发布数据集失败",
            ));
        }
    };
    let result = sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE bi.analytics_datasets SET status = 'published', published_at = $1, updated_at = $2 WHERE id = $3 AND {}",
        tenant_scope.sql_predicate("tenant_id", "$4")
    )))
    .bind(Utc::now())
    .bind(Utc::now())
    .bind(id)
    .bind_tenant_scope(&tenant_scope)
    .execute(&mut db_scope)
    .await;

    match result {
        Ok(done) => {
            if done.rows_affected() == 0 {
                return Json(topems_shared_core::response::error_value(
                    404,
                    "数据集不存在",
                ));
            }
            if let Err(e) = db_scope.commit().await {
                warn!("发布数据集提交失败: {}", e);
                return Json(topems_shared_core::response::error_value(
                    500,
                    "发布数据集失败",
                ));
            }
            info!("发布数据集成功: id={}", id);
            Json(serde_json::json!({
                "success": true,
                "data": null,
                "message": "发布数据集成功"
            }))
        }
        Err(e) => {
            warn!("发布数据集失败: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                "发布数据集失败",
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/api/bi/datasets/{id}/refresh",
    tag = "BI",
    params(
        ("id" = uuid::Uuid, Path, description = "Dataset ID")
    ),
    responses(
        (status = 200, description = "Dataset refreshed", body = serde_json::Value),
    ),
)]
pub async fn refresh_dataset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.bi.refresh_dataset",
        "bi.analytics_datasets",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_write_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            warn!("打开写作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "刷新数据集失败",
            ));
        }
    };
    let result = sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE bi.analytics_datasets SET last_refreshed_at = $1, updated_at = $2 WHERE id = $3 AND {}",
        tenant_scope.sql_predicate("tenant_id", "$4")
    )))
    .bind(Utc::now())
    .bind(Utc::now())
    .bind(id)
    .bind_tenant_scope(&tenant_scope)
    .execute(&mut db_scope)
    .await;

    match result {
        Ok(done) => {
            if done.rows_affected() == 0 {
                return Json(topems_shared_core::response::error_value(
                    404,
                    "数据集不存在",
                ));
            }
            if let Err(e) = db_scope.commit().await {
                warn!("刷新数据集提交失败: {}", e);
                return Json(topems_shared_core::response::error_value(
                    500,
                    "刷新数据集失败",
                ));
            }
            info!("刷新数据集成功: id={}", id);
            Json(serde_json::json!({
                "success": true,
                "data": null,
                "message": "刷新数据集成功"
            }))
        }
        Err(e) => {
            warn!("刷新数据集失败: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                "刷新数据集失败",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/datasets/{id}/preview",
    tag = "BI",
    params(
        ("id" = uuid::Uuid, Path, description = "Dataset ID")
    ),
    responses(
        (status = 200, description = "Dataset preview", body = serde_json::Value),
    ),
)]
pub async fn get_dataset_preview(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Query(params): Query<LimitQuery>,
) -> Json<serde_json::Value> {
    let _limit = params.limit.unwrap_or(10);

    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.bi.get_dataset_preview",
        "bi.analytics_datasets",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_read_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            warn!("打开只读作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "获取数据集预览失败",
            ));
        }
    };

    let dataset = sqlx::query_as::<_, Dataset>(sqlx::AssertSqlSafe(format!(
        "SELECT id, name, description, datasource_id, sql_query, fields, filters, config, status, is_public, published_at, last_refreshed_at, owner_id, created_at, updated_at FROM bi.analytics_datasets WHERE deleted_at IS NULL AND id = $1 AND {}",
        tenant_scope.sql_predicate("tenant_id", "$2")
    )))
    .bind(id)
    .bind_tenant_scope(&tenant_scope)
    .fetch_one(&mut db_scope)
    .await;

    match dataset {
        Ok(dataset) => {
            let preview_data: Vec<serde_json::Value> = vec![];
            Json(serde_json::json!({
                "success": true,
                "data": {
                    "columns": dataset.fields.unwrap_or(serde_json::json!([])),
                    "data": preview_data,
                    "total": 0
                },
                "message": "获取数据集预览成功"
            }))
        }
        Err(sqlx::Error::RowNotFound) => Json(topems_shared_core::response::error_value(
            404,
            "数据集不存在",
        )),
        Err(e) => {
            warn!("获取数据集预览失败: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                "获取数据集预览失败",
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/api/bi/datasets/query",
    tag = "BI",
    responses(
        (status = 200, description = "Dataset query result", body = serde_json::Value),
    ),
)]
pub async fn query_dataset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_cell): Extension<RlsTxnCell>,
    Json(params): Json<DatasetQueryParams>,
) -> Json<serde_json::Value> {
    let dataset_id = match params.dataset_id {
        Some(id) => id,
        None => {
            return Json(serde_json::json!({
                "success": false,
                "data": { "columns": [], "rows": [], "total": 0 },
                "message": "dataset_id 必填",
            }))
        }
    };
    // 取已注册数据集的 sql_query（软删除过滤 + 租户隔离）
    let tenant_scope = match TenantScope::from_claims(
        &claims,
        "analytics.bi.query_dataset",
        "bi.analytics_datasets",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => {
            return Json(topems_shared_core::response::error_value(400, &message));
        }
    };
    let mut txn_guard = txn_cell.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut db_scope = match crate::shared::open_read_scope(&state.db, &tenant_scope, txn).await {
        Ok(scope) => scope,
        Err(e) => {
            warn!("打开只读作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "查询数据集配置失败",
            ));
        }
    };
    let sql_query: Option<String> = match sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT sql_query FROM bi.analytics_datasets WHERE id = $1 AND deleted_at IS NULL AND {}",
        tenant_scope.sql_predicate("tenant_id", "$2")
    )))
    .bind(dataset_id)
    .bind_tenant_scope(&tenant_scope)
    .fetch_optional(&mut db_scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            warn!("查询数据集 SQL 失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "data": { "columns": [], "rows": [], "total": 0 },
                "message": "查询数据集配置失败",
            }));
        }
    };
    let sql = match sql_query {
        Some(s) => s,
        None => {
            return Json(serde_json::json!({
                "success": false,
                "data": { "columns": [], "rows": [], "total": 0 },
                "message": "数据集不存在或已删除",
            }))
        }
    };
    let limit = params.limit.unwrap_or(100).clamp(1, 500);
    let offset = params.offset.unwrap_or(0).max(0);
    let tenant_id = tenant_id_from_claims(&claims);
    let started = std::time::Instant::now();
    match tokio::time::timeout(
        std::time::Duration::from_secs(15),
        execute_bi_sql(&state.pool, &sql, limit, offset, tenant_id),
    )
    .await
    {
        Ok(Ok((columns, rows))) => Json(serde_json::json!({
            "success": true,
            "data": {
                "columns": columns,
                "rows": rows,
                "total": rows.len(),
                "execution_time": started.elapsed().as_millis(),
            },
            "message": "查询数据集成功",
        })),
        Ok(Err(e)) => {
            let (_, msg, _) = e.classify();
            Json(serde_json::json!({
                "success": false,
                "data": { "columns": [], "rows": [], "total": 0 },
                "message": msg,
            }))
        }
        Err(_) => Json(serde_json::json!({
            "success": false,
            "data": { "columns": [], "rows": [], "total": 0 },
            "message": "SQL 执行超时（>15s）",
        })),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/api/bi/datasets/test-sql",
    tag = "BI",
    responses(
        (status = 200, description = "SQL query test result", body = serde_json::Value),
    ),
)]
/// P1-17: 保守提取只读 SQL 中 FROM/JOIN 引用的表（支持 `schema.table` 限定）。
///
/// 括号子查询（`FROM (SELECT ...)`）不解析——子查询内的物理表引用可能漏检；
/// 漏检方向为「少拦」，纵深兜底由连接级 RLS GUC + BEGIN READ ONLY 事务提供。
fn extract_sql_tables(sql: &str) -> Vec<(Option<String>, String)> {
    let lower = sql.to_ascii_lowercase();
    let mut out = Vec::new();
    let tokens: Vec<&str> = lower.split_whitespace().collect();
    for pair in tokens.windows(2) {
        if pair[0] == "from" || pair[0] == "join" {
            let ident = pair[1].trim_end_matches([',', ';']).trim_end_matches(')');
            if ident.is_empty() || ident.starts_with('(') {
                continue;
            }
            let mut parts = ident.split('.');
            match (parts.next(), parts.next(), parts.next()) {
                (Some(schema), Some(table), None) => {
                    out.push((Some(schema.to_string()), table.to_string()));
                }
                (Some(table), None, None) => out.push((None, table.to_string())),
                _ => {}
            }
        }
    }
    out
}

/// P1-17: test-sql 只读执行的表/schema 白名单（复用 S1.3 `EnforceMode` 语义）。
///
/// - `Off`: 不校验；
/// - `Warn`（默认）: 违规仅 `warn!` 日志，不拦截（生产过渡期）；
/// - `Strict`: 违规直接拒绝。
///
/// 规则：
/// 1) schema 显式限定仅允许 `bi` / `public`（跨 schema 边界访问拒绝）；
/// 2) 表名必须已在 `bi_datasets` 白名单注册表中登记且 active
///    （与 `dataset_whitelist::validate_columns` 同一张注册表）。
async fn check_bi_sql_allowed(pool: &sqlx::PgPool, sql: &str) -> Result<(), TopemsError> {
    use super::dataset_whitelist::EnforceMode;
    let mode = EnforceMode::from_env();
    if matches!(mode, EnforceMode::Off) {
        return Ok(());
    }
    let tables = extract_sql_tables(sql);
    if tables.is_empty() {
        return Ok(());
    }
    const ALLOWED_SCHEMAS: [&str; 2] = ["bi", "public"];
    let bad_schemas: Vec<&str> = tables
        .iter()
        .filter_map(|(s, _)| s.as_deref().filter(|s| !ALLOWED_SCHEMAS.contains(s)))
        .collect();
    // 复用 S1.3 注册表：bi_datasets(table_name, column_name, is_active)
    let registered: Vec<String> = sqlx::query_scalar::<_, String>(
        r#"SELECT DISTINCT table_name FROM bi.bi_datasets WHERE is_active = TRUE"#,
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    let missing: Vec<&str> = tables
        .iter()
        .map(|(_, t)| t.as_str())
        .filter(|t| !registered.iter().any(|r| r == t))
        .collect();
    if bad_schemas.is_empty() && missing.is_empty() {
        return Ok(());
    }
    warn!(
        "BI SQL 白名单拦截候选：违规 schema={:?}，未注册表={:?}（已注册表: {:?}，模式: {:?}）",
        bad_schemas, missing, registered, mode
    );
    if matches!(mode, EnforceMode::Strict) {
        Err(TopemsError::BusinessLogic(format!(
            "SQL 引用了未授权的表/schema：{}",
            if !missing.is_empty() {
                missing.join(", ")
            } else {
                bad_schemas.join(", ")
            }
        )))
    } else {
        Ok(())
    }
}

/// 只读执行上下文的租户 id：与 tenant_middleware 同口径（普通用户取 claims.tenant_id；
/// 超管/服务/缺失 → 显式平台哨兵）。仅用于 `BEGIN READ ONLY` 事务的 GUC 设置，
/// 写路径禁止沿用。
fn tenant_id_from_claims(claims: &Claims) -> Uuid {
    topems_shared_auth::middleware::get_tenant_id_from_claims(claims)
}

/// 在 BI 只读上下文执行用户 SQL：
/// 1) `BEGIN READ ONLY` 强制只读事务（写语句被 PG 拒绝，双保险）；
/// 2) 子查询包装 `SELECT json_agg(to_json(t)) FROM (SELECT * FROM (<sql>) __src LIMIT 100) t`
///    ——写语句/多语句在语法层被拒；LIMIT 100 作用于数据源行数（json_agg 聚合前的截断，
///    不能放最外层——聚合在 LIMIT 之前完成，外层 LIMIT 对聚合结果无影响）；
/// 3) 结果由 PG 原生 JSON 化（数字/文本/bool/null/时间/jsonb 均正确），无需 Rust 手工解码；
/// 4) 15s 超时保护。
/// P1-17 加固：执行前 (a) 表/schema 白名单（复用 S1.3 EnforceMode + bi_datasets 注册表）；
/// (b) 在本连接只读事务内 `set_config('app.tenant_id', …, true)` 建立租户上下文，
///     使目标表的 RLS 策略按订阅者租户过滤（超管/无 tenant claims → nil UUID）。
/// 返回 (columns, data)；columns 取自结果首行对象键（空结果返回空数组）；
/// data 为对象数组（每行 {列名: 值}），与前端 SqlTestResult 契约一致。
async fn execute_bi_sql(
    pool: &sqlx::PgPool,
    sql: &str,
    limit: i64,
    offset: i64,
    tenant_id: Uuid,
) -> Result<(Vec<String>, Vec<serde_json::Value>), TopemsError> {
    // 友好预检：非只读语句（非 SELECT/WITH 开头）提前给出明确提示；
    // 真正拦截仍由「子查询语法层 + BEGIN READ ONLY」双层保证（WITH 内的 data-modifying CTE 由只读事务兜底）。
    let head = sql
        .trim_start_matches(|c: char| c == '(' || c.is_whitespace())
        .get(..6)
        .unwrap_or("")
        .to_ascii_lowercase();
    if !head.starts_with("select") && !head.starts_with("with") {
        return Err(TopemsError::ValidationFailed(
            "仅支持只读查询（SQL 须以 SELECT 或 WITH 开头）".to_string(),
        ));
    }
    // P1-17: 表/schema 白名单（off/warn/strict，BI_WHITELIST_ENFORCE）
    check_bi_sql_allowed(pool, sql).await?;
    let mut conn = pool
        .acquire()
        .await
        .map_err(|e| TopemsError::internal("数据库连接失败", e))?;
    sqlx::query("BEGIN READ ONLY")
        .execute(&mut *conn)
        .await
        .map_err(|e| TopemsError::internal("只读事务开启失败", e))?;
    // P1-17: 连接级租户上下文（与 tenant_middleware / BI datasource 同口径：
    // set_config is_local=true，仅作用于本只读事务；随 ROLLBACK 一并丢弃，不污染池连接）。
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(tenant_id.to_string())
        .execute(&mut *conn)
        .await
    {
        let _ = sqlx::query("ROLLBACK").execute(&mut *conn).await;
        return Err(TopemsError::internal("租户上下文设置失败", e));
    }
    let outcome = async {
        // limit/offset 为 i64 数字（调用方 clamp/校验），直接格式化拼接无注入风险
        let wrapped = format!(
            "SELECT COALESCE(json_agg(to_json(t)), '[]'::json) AS __bi_result \
             FROM (SELECT * FROM ({}) __src LIMIT {} OFFSET {}) t",
            sql, limit, offset
        );
        let row = sqlx::query(sqlx::AssertSqlSafe(wrapped))
            .fetch_one(&mut *conn)
            .await
            // 用户 SQL 的语法/执行错误需回显给测试者（BI SQL 测试工具的核心反馈），
            // 非内部状态泄露；其余内部失败走 internal（细节仅进日志）。
            .map_err(|e| TopemsError::ValidationFailed(format!("SQL 执行失败: {e}")))?;
        let idx = row
            .columns()
            .iter()
            .position(|c| c.name() == "__bi_result")
            .ok_or_else(|| TopemsError::internal("BI SQL 结果列缺失", "结果列缺失"))?;
        let raw = row
            .try_get_raw(idx)
            .map_err(|e| TopemsError::internal("BI SQL 结果读取失败", e))?;
        let bytes = raw
            .as_bytes()
            .map_err(|e| TopemsError::internal("BI SQL 结果读取失败", e))?;
        serde_json::from_slice::<serde_json::Value>(bytes)
            .map_err(|e| TopemsError::internal("BI SQL 结果解析失败", e))
    }
    .await;
    // 无论成败都结束只读事务（查询报错时连接处于 aborted 状态，必须 ROLLBACK 恢复才能归还池）
    let _ = sqlx::query("ROLLBACK").execute(&mut *conn).await;
    drop(conn);

    let value = outcome?;
    let arr = value.as_array().cloned().unwrap_or_default();
    let columns: Vec<String> = arr
        .first()
        .and_then(|o| o.as_object())
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default();
    let data = arr;
    Ok((columns, data))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/api/bi/datasets/test-sql",
    tag = "BI",
    responses(
        (status = 200, description = "SQL query test result", body = serde_json::Value),
    ),
)]
pub async fn test_sql_query(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<TestSqlQueryRequest>,
) -> Json<serde_json::Value> {
    let sql = req.sql.trim();
    if sql.is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "data": { "columns": [], "data": [], "valid": false },
            "message": "SQL 不能为空",
        }));
    }
    let tenant_id = tenant_id_from_claims(&claims);
    match tokio::time::timeout(
        std::time::Duration::from_secs(15),
        execute_bi_sql(&state.pool, sql, 100, 0, tenant_id),
    )
    .await
    {
        Ok(Ok((columns, data))) => Json(serde_json::json!({
            "success": true,
            "data": { "columns": columns, "data": data, "valid": true, "rows": data.len() },
            "message": "SQL测试成功",
        })),
        Ok(Err(e)) => {
            let (_, msg, _) = e.classify();
            Json(serde_json::json!({
                "success": false,
                "data": { "columns": [], "data": [], "valid": false },
                "message": msg,
            }))
        }
        Err(_) => Json(serde_json::json!({
            "success": false,
            "data": { "columns": [], "data": [], "valid": false },
            "message": "SQL 执行超时（>15s）",
        })),
    }
}

#[derive(Debug, Deserialize)]
pub struct LimitQuery {
    pub limit: Option<i64>,
}
