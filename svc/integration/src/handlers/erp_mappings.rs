//! ERP 字段映射管理（缺口#12）
//! GET/POST /erp/mappings, GET/PUT/DELETE /erp/mappings/{id}

use axum::extract::{Extension, Path, State};
use axum::Json;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

use crate::models::{AppState, CreateErpMappingRequest, ErpMapping, UpdateErpMappingRequest};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:erp_mappings:read"])),
    path = "/api/integration/erp/mappings",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ErpMappings"
)]
pub async fn list_mappings(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<ErpMapping>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at FROM integration.erp_mappings ORDER BY created_at DESC"
    ))
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => ApiResponse::success(rows, "映射列表获取成功"),
        Err(e) => {
            tracing::error!("list_mappings error: {}", e);
            ApiResponse::from(TopemsError::internal("查询失败", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:erp_mappings:read"])),
    path = "/api/integration/erp/mappings/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ErpMappings"
)]
pub async fn get_mapping(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ErpMapping> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at FROM integration.erp_mappings WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(m)) => ApiResponse::success(m, "获取成功"),
        Ok(None) => ApiResponse::not_found("映射不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:erp_mappings:write"])),
    path = "/api/integration/erp/mappings",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ErpMappings"
)]
pub async fn create_mapping(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateErpMappingRequest>,
) -> ApiResponse<ErpMapping> {
    let tid = "default".to_string();
    let id = Uuid::new_v4();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "INSERT INTO integration.erp_mappings \
         (id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
          external_code, external_name, direction, isactive, priority, condition, \
          created_at, updated_at) \
         VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11,$12,NOW(),NOW()) \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(id)
    .bind(&tid)
    .bind(req.connection_id)
    .bind(&req.mapping_type)
    .bind(req.local_id)
    .bind(req.local_code)
    .bind(req.local_name)
    .bind(req.external_code)
    .bind(req.external_name)
    .bind(req.direction.unwrap_or_else(|| "bidirectional".to_string()))
    .bind(req.priority.unwrap_or(0))
    .bind(req.condition)
    .fetch_one(&mut scope)
    .await
    {
        Ok(m) => ApiResponse::success(m, "创建成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("创建失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["integration:erp_mappings:write"])),
    path = "/api/integration/erp/mappings/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ErpMappings"
)]
pub async fn update_mapping(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateErpMappingRequest>,
) -> ApiResponse<ErpMapping> {
    let tid = "default".to_string();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "UPDATE integration.erp_mappings SET \
         connection_id = COALESCE($1, connection_id), \
         local_id = COALESCE($2, local_id), \
         local_code = COALESCE($3, local_code), \
         local_name = COALESCE($4, local_name), \
         external_code = COALESCE($5, external_code), \
         external_name = COALESCE($6, external_name), \
         direction = COALESCE($7, direction), \
         isactive = COALESCE($8, isactive), \
         priority = COALESCE($9, priority), \
         condition = COALESCE($10, condition), \
         updated_at = NOW() \
         WHERE id = $11 AND tenant_id::text = $12 \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(req.connection_id)
    .bind(req.local_id)
    .bind(req.local_code)
    .bind(req.local_name)
    .bind(req.external_code)
    .bind(req.external_name)
    .bind(req.direction)
    .bind(req.isactive)
    .bind(req.priority)
    .bind(req.condition)
    .bind(id)
    .bind(&tid)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(m)) => ApiResponse::success(m, "更新成功"),
        Ok(None) => ApiResponse::not_found("映射不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["integration:erp_mappings:write"])),
    path = "/api/integration/erp/mappings/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ErpMappings"
)]
pub async fn delete_mapping(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<()> {
    let tid = "default".to_string();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match sqlx::query(only_own_schema_query!(
        "integration",
        "DELETE FROM integration.erp_mappings WHERE id = $1 AND tenant_id::text = $2"
    ))
    .bind(id)
    .bind(&tid)
    .execute(&mut scope)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除成功"),
        Ok(_) => ApiResponse::not_found("映射不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("删除失败", e)),
    }
}
