//! ERP 字段映射管理（缺口#12）
//! GET/POST /erp/mappings, GET/PUT/DELETE /erp/mappings/{id}

use axum::extract::{Path, State};
use axum::Json;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

use crate::models::{AppState, CreateErpMappingRequest, ErpMapping, UpdateErpMappingRequest};

pub async fn list_mappings(State(state): State<AppState>) -> Json<ApiResponse<Vec<ErpMapping>>> {
    let tid = "default".to_string();
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at, updated_at FROM erp_mappings WHERE tenant_id = $1 ORDER BY created_at DESC"
    ))
    .bind(&tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "映射列表获取成功")),
        Err(e) => {
            tracing::error!("list_mappings error: {}", e);
            Json(ApiResponse::from(TopemsError::internal("查询失败", e)))
        }
    }
}

pub async fn get_mapping(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ErpMapping>> {
    let tid = "default".to_string();
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at, updated_at FROM erp_mappings WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(&tid)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(m)) => Json(ApiResponse::success(m, "获取成功")),
        Ok(None) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

pub async fn create_mapping(
    State(state): State<AppState>,
    Json(req): Json<CreateErpMappingRequest>,
) -> Json<ApiResponse<ErpMapping>> {
    let tid = "default".to_string();
    let id = Uuid::new_v4();
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "INSERT INTO erp_mappings \
         (id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
          external_code, external_name, direction, isactive, priority, condition, \
          created_at, updated_at) \
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11,$12,NOW(),NOW()) \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at, updated_at"
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
    .fetch_one(&state.pool)
    .await
    {
        Ok(m) => Json(ApiResponse::success(m, "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("创建失败", e))),
    }
}

pub async fn update_mapping(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateErpMappingRequest>,
) -> Json<ApiResponse<ErpMapping>> {
    let tid = "default".to_string();
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "UPDATE erp_mappings SET \
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
         WHERE id = $11 AND tenant_id = $12 \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at, updated_at"
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
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(m)) => Json(ApiResponse::success(m, "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    }
}

pub async fn delete_mapping(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let tid = "default".to_string();
    match sqlx::query(only_own_schema_query!(
        "integration",
        "DELETE FROM erp_mappings WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(&tid)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    }
}
