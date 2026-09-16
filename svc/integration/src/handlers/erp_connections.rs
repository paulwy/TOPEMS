//! ERP 连接管理（缺口#11）
//! GET/POST /erp/connections, GET/PUT/DELETE /erp/connections/{id}, POST /erp/connections/test

use axum::extract::{Path, State};
use axum::Json;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

use crate::models::{
    AppState, CreateErpConnectionRequest, ErpConnection, TestConnectionRequest,
    TestConnectionResponse, UpdateErpConnectionRequest,
};

fn tenant_id(_state: &AppState) -> String {
    "default".to_string()
}

pub async fn list_connections(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<ErpConnection>>> {
    let tid = tenant_id(&state);
    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at, \
         created_at, updated_at FROM erp_connections WHERE tenant_id = $1 ORDER BY created_at DESC"
    ))
    .bind(&tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "连接列表获取成功")),
        Err(e) => {
            tracing::error!("list_connections error: {}", e);
            Json(ApiResponse::from(TopemsError::internal("查询失败", e)))
        }
    }
}

pub async fn get_connection(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ErpConnection>> {
    let tid = tenant_id(&state);
    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at, \
         created_at, updated_at FROM erp_connections WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(&tid)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(conn)) => Json(ApiResponse::success(conn, "获取成功")),
        Ok(None) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

pub async fn create_connection(
    State(state): State<AppState>,
    Json(req): Json<CreateErpConnectionRequest>,
) -> Json<ApiResponse<ErpConnection>> {
    let tid = tenant_id(&state);
    let id = Uuid::new_v4();
    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "INSERT INTO erp_connections \
         (id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
          sync_direction, sync_mode, sync_interval, status, isactive, created_at, updated_at) \
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'inactive',TRUE,NOW(),NOW()) \
         RETURNING id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at, \
         created_at, updated_at"
    ))
    .bind(id)
    .bind(&tid)
    .bind(&req.name)
    .bind(req.r#type.unwrap_or_else(|| "custom".to_string()))
    .bind(&req.api_url)
    .bind(req.api_version)
    .bind(req.app_key)
    .bind(req.app_secret)
    .bind(
        req.sync_direction
            .unwrap_or_else(|| "bidirectional".to_string()),
    )
    .bind(req.sync_mode.unwrap_or_else(|| "manual".to_string()))
    .bind(req.sync_interval)
    .fetch_one(&state.pool)
    .await
    {
        Ok(conn) => Json(ApiResponse::success(conn, "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("创建失败", e))),
    }
}

pub async fn update_connection(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateErpConnectionRequest>,
) -> Json<ApiResponse<ErpConnection>> {
    let tid = tenant_id(&state);
    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "UPDATE erp_connections SET \
         name = COALESCE($1, name), \
         api_url = COALESCE($2, api_url), \
         api_version = COALESCE($3, api_version), \
         app_key = COALESCE($4, app_key), \
         app_secret = COALESCE($5, app_secret), \
         sync_direction = COALESCE($6, sync_direction), \
         sync_mode = COALESCE($7, sync_mode), \
         sync_interval = COALESCE($8, sync_interval), \
         isactive = COALESCE($9, isactive), \
         status = COALESCE($10, status), \
         updated_at = NOW() \
         WHERE id = $11 AND tenant_id = $12 \
         RETURNING id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at, \
         created_at, updated_at"
    ))
    .bind(req.name)
    .bind(req.api_url)
    .bind(req.api_version)
    .bind(req.app_key)
    .bind(req.app_secret)
    .bind(req.sync_direction)
    .bind(req.sync_mode)
    .bind(req.sync_interval)
    .bind(req.isactive)
    .bind(req.status)
    .bind(id)
    .bind(&tid)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(conn)) => Json(ApiResponse::success(conn, "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    }
}

pub async fn delete_connection(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let tid = tenant_id(&state);
    match sqlx::query(only_own_schema_query!(
        "integration",
        "DELETE FROM erp_connections WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(&tid)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    }
}

pub async fn test_connection(
    State(_state): State<AppState>,
    Json(req): Json<TestConnectionRequest>,
) -> Json<ApiResponse<TestConnectionResponse>> {
    // 最小可用：模拟连接测试，实际 HTTP 探测可后续扩展
    let start = std::time::Instant::now();
    let _timeout = req.timeout.unwrap_or(5000);
    // 简单校验 URL 格式
    let success = req.api_url.starts_with("http://") || req.api_url.starts_with("https://");
    let elapsed = start.elapsed().as_millis() as u64;
    let resp = TestConnectionResponse {
        success,
        response_time_ms: elapsed,
        error_message: if success {
            None
        } else {
            Some("URL 必须以 http:// 或 https:// 开头".to_string())
        },
    };
    Json(ApiResponse::success(resp, "测试完成"))
}
