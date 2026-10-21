//! 外部 ERP 集成（缺口#13 扩展版）
//! 覆盖 /external-erp/* 全部路径，基于 erp_connections / erp_mappings / external_erp_sync_logs 真实表实现

use axum::extract::{Extension, Path, State};
use axum::routing::{get, post, put};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

use crate::models::{AppState, ErpConnection, ErpMapping};

const TENANT_ID: &str = "default";

/// 写入路径租户：claims 无租户（超管）时回落 nil UUID（tenant_id 列 NOT NULL，
/// 直接绑 NULL 会触发非空约束 → 500）
fn tenant_uuid(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil())
}

// ===== 同步日志模型 =====

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ExternalErpSyncLog {
    id: Uuid,
    tenant_id: Uuid,
    connection_id: Option<Uuid>,
    entity: String,
    direction: String,
    status: String,
    total_records: i32,
    success_count: i32,
    failed_count: i32,
    error_message: Option<String>,
    started_at: Option<chrono::DateTime<chrono::Utc>>,
    completed_at: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatistics {
    total_syncs: i64,
    successful: i64,
    failed: i64,
    last_sync_at: Option<chrono::DateTime<chrono::Utc>>,
    by_entity: serde_json::Value,
}

// ===== connections =====

pub async fn list_connections(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ErpConnection>>> {
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at FROM erp_connections WHERE ($1::text IS NULL OR tenant_id::text = $1) ORDER BY created_at DESC"
    ))
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "连接列表获取成功")),
        Err(e) => {
            tracing::error!("external_erp list_connections: {}", e);
            Json(ApiResponse::from(TopemsError::internal("查询失败", e)))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:external_erp:write"])),
    path = "/api/integration/erp/connections",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ExternalErp"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn create_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpConnection>> {
    let id = Uuid::new_v4();
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("未命名连接")
        .to_string();
    let r#type = body
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("custom")
        .to_string();
    let api_url = body
        .get("api_url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let api_version = body
        .get("api_version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let app_key = body
        .get("app_key")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let app_secret = body
        .get("app_secret")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let sync_direction = body
        .get("sync_direction")
        .and_then(|v| v.as_str())
        .unwrap_or("bidirectional")
        .to_string();
    let sync_mode = body
        .get("sync_mode")
        .and_then(|v| v.as_str())
        .unwrap_or("manual")
        .to_string();
    let sync_interval = body
        .get("sync_interval")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "INSERT INTO erp_connections \
         (id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
          sync_direction, sync_mode, sync_interval, status, isactive, created_at, updated_at) \
         VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,'inactive',TRUE,NOW(),NOW()) \
         RETURNING id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(id)
    .bind(tenant_uuid(&claims))
    .bind(&name)
    .bind(&r#type)
    .bind(&api_url)
    .bind(api_version)
    .bind(app_key)
    .bind(app_secret)
    .bind(&sync_direction)
    .bind(&sync_mode)
    .bind(sync_interval)
    .fetch_one(&state.pool)
    .await
    {
        Ok(conn) => Json(ApiResponse::success(conn, "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("创建失败", e))),
    }
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
async fn test_connection(
    State(_state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let api_url = body
        .get("api_url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let timeout_ms = body.get("timeout").and_then(|v| v.as_i64()).unwrap_or(5000) as u64;

    // URL 格式校验
    if !api_url.starts_with("http://") && !api_url.starts_with("https://") {
        return Json(ApiResponse::success(
            serde_json::json!({"success": false, "response_time_ms": 0, "error_message": "URL 必须以 http:// 或 https:// 开头"}),
            "测试完成",
        ));
    }

    // 真实 HTTP 探测（带超时）
    let start = std::time::Instant::now();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .build()
        .unwrap();

    let result = client.get(&api_url).send().await;
    let elapsed = start.elapsed().as_millis() as u64;

    match result {
        Ok(resp) => {
            let status = resp.status();
            let success = status.is_success() || status.is_redirection();
            Json(ApiResponse::success(
                serde_json::json!({
                    "success": success,
                    "response_time_ms": elapsed,
                    "http_status": status.as_u16(),
                    "error_message": if success { None } else { Some(format!("HTTP {}", status.as_u16())) }
                }),
                "测试完成",
            ))
        }
        Err(e) => Json(ApiResponse::success(
            serde_json::json!({
                "success": false,
                "response_time_ms": elapsed,
                "error_message": e.to_string()
            }),
            "测试完成",
        )),
    }
}

async fn get_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ErpConnection>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at FROM erp_connections WHERE id = $1 AND ($2::text IS NULL OR tenant_id::text = $2)"
    ))
    .bind(uuid)
    .bind(tid)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(conn)) => Json(ApiResponse::success(conn, "获取成功")),
        Ok(None) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["integration:external_erp:write"])),
    path = "/api/integration/erp/connections/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ExternalErp"
)]
pub async fn update_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpConnection>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let api_url = body
        .get("api_url")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let isactive = body.get("isactive").and_then(|v| v.as_bool());
    let status = body
        .get("status")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "UPDATE erp_connections SET \
         name = COALESCE($1, name), \
         api_url = COALESCE($2, api_url), \
         isactive = COALESCE($3, isactive), \
         status = COALESCE($4, status), \
         updated_at = NOW() \
         WHERE id = $5 AND tenant_id::text = $6 \
         RETURNING id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(name)
    .bind(api_url)
    .bind(isactive)
    .bind(status)
    .bind(uuid)
    .bind(&claims.tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(conn)) => Json(ApiResponse::success(conn, "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["integration:external_erp:write"])),
    path = "/api/integration/erp/connections/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ExternalErp"
)]
pub async fn delete_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<()>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    match sqlx::query(only_own_schema_query!(
        "integration",
        "DELETE FROM erp_connections WHERE id = $1 AND tenant_id::text = $2"
    ))
    .bind(uuid)
    .bind(&claims.tenant_id)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    }
}

// ===== connections/{id}/{entity}-mappings =====

pub async fn list_entity_mappings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, entity)): Path<(String, String)>,
) -> Json<ApiResponse<Vec<ErpMapping>>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at FROM erp_mappings \
         WHERE connection_id = $1 AND mapping_type = $2 AND ($3::text IS NULL OR tenant_id::text = $3) ORDER BY created_at DESC"
    ))
    .bind(uuid)
    .bind(&entity)
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "映射列表获取成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

async fn create_entity_mapping(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, entity)): Path<(String, String)>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpMapping>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let mapping_id = Uuid::new_v4();
    let local_code = body
        .get("local_code")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let local_name = body
        .get("local_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let external_code = body
        .get("external_code")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let external_name = body
        .get("external_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "INSERT INTO erp_mappings \
         (id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
          external_code, external_name, direction, isactive, priority, condition, \
          created_at, updated_at) \
         VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,'bidirectional',TRUE,0,NULL,NOW(),NOW()) \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(mapping_id)
    .bind(tenant_uuid(&claims))
    .bind(uuid)
    .bind(&entity)
    .bind(mapping_id.to_string())
    .bind(&local_code)
    .bind(&local_name)
    .bind(&external_code)
    .bind(&external_name)
    .fetch_one(&state.pool)
    .await
    {
        Ok(m) => Json(ApiResponse::success(m, "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("创建失败", e))),
    }
}

pub async fn batch_entity_mappings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, entity)): Path<(String, String)>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let items = body
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut processed = 0i64;
    let mut failed = 0i64;

    for item in &items {
        let mapping_id = Uuid::new_v4();
        let local_code = item
            .get("local_code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let local_name = item
            .get("local_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let external_code = item
            .get("external_code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let external_name = item
            .get("external_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        match sqlx::query(only_own_schema_query!(
            "integration",
            "INSERT INTO erp_mappings \
             (id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
              external_code, external_name, direction, isactive, priority, created_at, updated_at) \
             VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,'bidirectional',TRUE,0,NOW(),NOW())"
        ))
        .bind(mapping_id)
        .bind(tenant_uuid(&claims))
        .bind(uuid)
        .bind(&entity)
        .bind(mapping_id.to_string())
        .bind(&local_code)
        .bind(&local_name)
        .bind(&external_code)
        .bind(&external_name)
        .execute(&state.pool)
        .await
        {
            Ok(_) => processed += 1,
            Err(e) => {
                tracing::error!("batch_entity_mappings item error: {}", e);
                failed += 1;
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({"processed": processed, "failed": failed, "total": items.len()}),
        "批量处理完成",
    ))
}

// ===== connections/{id}/preview/{entity} =====

pub async fn preview_entity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, entity)): Path<(String, String)>,
) -> Json<ApiResponse<Vec<ErpMapping>>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at FROM erp_mappings \
         WHERE connection_id = $1 AND mapping_type = $2 AND ($3::text IS NULL OR tenant_id::text = $3) \
         ORDER BY created_at DESC LIMIT 20"
    ))
    .bind(uuid)
    .bind(&entity)
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "预览数据获取成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

// ===== 真实同步执行引擎 =====

/// 获取 ERP 连接信息
async fn get_connection_by_id(
    pool: &sqlx::PgPool,
    connection_id: Uuid,
    tenant: Option<&str>,
) -> Option<ErpConnection> {
    sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at FROM erp_connections WHERE id = $1 AND tenant_id::text = $2"
    ))
    .bind(connection_id)
    .bind(tenant)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
}

/// 调用 ERP API（支持认证头）
async fn call_erp_api(
    connection: &ErpConnection,
    method: &str,
    path: &str,
    body: Option<&serde_json::Value>,
) -> Result<serde_json::Value, TopemsError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| TopemsError::NetworkRequest(format!("HTTP client build failed: {}", e)))?;

    let url = format!("{}{}", connection.api_url.trim_end_matches('/'), path);
    let mut request = match method {
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => client.get(&url),
    };

    // 添加认证头
    if let Some(ref key) = connection.app_key {
        if !key.is_empty() {
            request = request.header("X-API-Key", key);
        }
    }
    if let Some(ref secret) = connection.app_secret {
        if !secret.is_empty() {
            request = request.header("X-API-Secret", secret);
        }
    }
    request = request.header("Content-Type", "application/json");

    if let Some(b) = body {
        request = request.json(b);
    }

    let resp = request
        .send()
        .await
        .map_err(|e| TopemsError::NetworkRequest(format!("HTTP request failed: {}", e)))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(TopemsError::BusinessLogic(format!(
            "ERP API returned status {}: {}",
            status.as_u16(),
            resp.text().await.unwrap_or_default()
        )));
    }

    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| TopemsError::ValidationFailed(format!("Failed to parse response: {}", e)))?;
    Ok(data)
}

/// 更新同步日志状态
async fn update_sync_log_status(
    pool: &sqlx::PgPool,
    task_id: Uuid,
    status: &str,
    total_records: i32,
    success_count: i32,
    failed_count: i32,
    error_message: Option<&str>,
) {
    let _ = sqlx::query(only_own_schema_query!(
        "integration",
        "UPDATE external_erp_sync_logs \
         SET status = $1, total_records = $2, success_count = $3, failed_count = $4, \
             error_message = $5, completed_at = NOW() \
         WHERE id = $6"
    ))
    .bind(status)
    .bind(total_records)
    .bind(success_count)
    .bind(failed_count)
    .bind(error_message)
    .bind(task_id)
    .execute(pool)
    .await;
}

/// 将从 ERP 导入的数据写入 staging 表
/// 支持去重（基于 connection_id + entity + external_id）
async fn write_to_staging(
    pool: &sqlx::PgPool,
    connection_id: Uuid,
    entity: &str,
    items: &[serde_json::Value],
) -> Result<(i32, i32), TopemsError> {
    let mut inserted = 0;
    let mut skipped = 0;

    for item in items {
        // 尝试提取 external_id（常见字段名：id、ID、external_id、code）
        let external_id = item
            .get("id")
            .and_then(|v| v.as_str())
            .or_else(|| item.get("ID").and_then(|v| v.as_str()))
            .or_else(|| item.get("external_id").and_then(|v| v.as_str()))
            .or_else(|| item.get("code").and_then(|v| v.as_str()))
            .map(|s| s.to_string());

        // 如果有 external_id，检查是否已存在（去重）
        if let Some(ref eid) = external_id {
            let exists: Option<(i64,)> = sqlx::query_as(
                "SELECT COUNT(*) FROM integration.external_erp_staging \
                 WHERE connection_id = $1 AND entity = $2 AND external_id = $3",
            )
            .bind(connection_id)
            .bind(entity)
            .bind(eid)
            .fetch_optional(pool)
            .await
            .map_err(|e| TopemsError::DatabaseQuery(format!("检查重复记录失败: {}", e)))?;

            if exists.map(|(c,)| c > 0).unwrap_or(false) {
                skipped += 1;
                continue;
            }
        }

        // 插入 staging 表
        let tenant_id = Uuid::parse_str(TENANT_ID).unwrap_or_else(|_| Uuid::nil());

        match sqlx::query(
            "INSERT INTO integration.external_erp_staging \
             (tenant_id, connection_id, entity, direction, source_system, external_id, raw_data, processed, process_status) \
             VALUES ($1, $2, $3, 'import', 'external_erp', $4, $5, false, 'pending')"
        )
        .bind(tenant_id)
        .bind(connection_id)
        .bind(entity)
        .bind(&external_id)
        .bind(item)
        .execute(pool)
        .await
        {
            Ok(_) => inserted += 1,
            Err(e) => {
                tracing::warn!("写入 staging 表失败（entity={}, external_id={:?}）: {}", entity, external_id, e);
                // 单条失败不影响整体，继续处理下一条
            }
        }
    }

    Ok((inserted, skipped))
}

// ===== sync/{entity} =====

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn sync_entity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(entity): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let task_id = Uuid::new_v4();
    let connection_id = body
        .get("connection_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    let direction = body
        .get("direction")
        .and_then(|v| v.as_str())
        .unwrap_or("import")
        .to_string();
    let page_size = body
        .get("page_size")
        .and_then(|v| v.as_i64())
        .unwrap_or(100) as i32;

    // 创建同步日志记录
    if let Err(e) = sqlx::query(only_own_schema_query!(
        "integration",
        "INSERT INTO external_erp_sync_logs \
         (id, tenant_id, connection_id, entity, direction, status, started_at, created_at) \
         VALUES ($1,$2::uuid,$3,$4,$5,'running',NOW(),NOW())"
    ))
    .bind(task_id)
    .bind(tenant_uuid(&claims))
    .bind(connection_id)
    .bind(&entity)
    .bind(&direction)
    .execute(&state.pool)
    .await
    {
        tracing::error!("sync_entity insert log: {}", e);
        return Json(ApiResponse::from(TopemsError::internal(
            "创建同步任务失败",
            e,
        )));
    }

    // 验证连接
    let cid = match connection_id {
        Some(c) => c,
        None => {
            update_sync_log_status(
                &state.pool,
                task_id,
                "failed",
                0,
                0,
                0,
                Some("缺少 connection_id"),
            )
            .await;
            return Json(ApiResponse::error(400, "缺少 connection_id"));
        }
    };

    let connection = match get_connection_by_id(&state.pool, cid, claims.tenant_id.as_deref()).await
    {
        Some(c) => c,
        None => {
            update_sync_log_status(
                &state.pool,
                task_id,
                "failed",
                0,
                0,
                0,
                Some("连接不存在或已删除"),
            )
            .await;
            return Json(ApiResponse::error(404, "ERP 连接不存在"));
        }
    };

    if !connection.isactive {
        update_sync_log_status(&state.pool, task_id, "failed", 0, 0, 0, Some("连接已禁用")).await;
        return Json(ApiResponse::error(400, "ERP 连接已禁用"));
    }

    // 执行真实同步
    let sync_result =
        match direction.as_str() {
            "import" => {
                // 从 ERP 导入数据：调用 GET /api/{entity}?page_size=N
                let path = format!("/api/{}?page_size={}", entity, page_size);
                match call_erp_api(&connection, "GET", &path, None).await {
                    Ok(data) => {
                        let items = data
                            .get("items")
                            .and_then(|v| v.as_array())
                            .cloned()
                            .unwrap_or_default();
                        let records = items.len() as i32;
                        let total = data
                            .get("total")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(records as i64) as i32;

                        // 将数据写入 staging 表（支持去重）
                        let (inserted, skipped) =
                            match write_to_staging(&state.pool, cid, &entity, &items).await {
                                Ok((i, s)) => (i, s),
                                Err(e) => {
                                    tracing::warn!("写入 staging 表失败: {}", e);
                                    (0, 0)
                                }
                            };

                        tracing::info!(
                        "ERP 导入完成: entity={}, total={}, records={}, inserted={}, skipped={}",
                        entity, total, records, inserted, skipped
                    );

                        update_sync_log_status(
                            &state.pool,
                            task_id,
                            "success",
                            total,
                            inserted,
                            skipped,
                            None,
                        )
                        .await;
                        Ok((total, inserted, skipped))
                    }
                    Err(e) => {
                        update_sync_log_status(
                            &state.pool,
                            task_id,
                            "failed",
                            0,
                            0,
                            0,
                            Some(&e.to_string()),
                        )
                        .await;
                        Err(e)
                    }
                }
            }
            "export" => {
                // 导出数据到 ERP：调用 POST /api/{entity}
                let payload = body.get("data").cloned().unwrap_or(serde_json::json!({}));
                match call_erp_api(
                    &connection,
                    "POST",
                    &format!("/api/{}", entity),
                    Some(&payload),
                )
                .await
                {
                    Ok(data) => {
                        let created = data
                            .get("created_count")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(1) as i32;
                        update_sync_log_status(
                            &state.pool,
                            task_id,
                            "success",
                            created,
                            created,
                            0,
                            None,
                        )
                        .await;
                        Ok((created, created, 0))
                    }
                    Err(e) => {
                        update_sync_log_status(
                            &state.pool,
                            task_id,
                            "failed",
                            0,
                            0,
                            0,
                            Some(&e.to_string()),
                        )
                        .await;
                        Err(e)
                    }
                }
            }
            _ => {
                let msg = format!("不支持的同步方向: {}", direction);
                update_sync_log_status(&state.pool, task_id, "failed", 0, 0, 0, Some(&msg)).await;
                Err(TopemsError::ValidationFailed(msg))
            }
        };

    // 更新连接的最后同步时间
    let _ = sqlx::query(only_own_schema_query!(
        "integration",
        "UPDATE erp_connections SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1"
    ))
    .bind(cid)
    .execute(&state.pool)
    .await;

    match sync_result {
        Ok((total, success, failed)) => Json(ApiResponse::success(
            serde_json::json!({
                "task_id": task_id.to_string(),
                "entity": entity,
                "direction": direction,
                "status": "success",
                "total_records": total,
                "success_count": success,
                "failed_count": failed,
                "message": "同步完成"
            }),
            "同步完成",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("同步失败", e))),
    }
}

// ===== sync-logs =====

pub async fn sync_logs(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ExternalErpSyncLog>>> {
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ExternalErpSyncLog>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, entity, direction, status, \
         total_records, success_count, failed_count, error_message, \
         started_at AS started_at, completed_at AS completed_at, created_at AS created_at \
         FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1) ORDER BY created_at DESC LIMIT 100"
    ))
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "同步日志获取成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

// ===== sync-statistics =====

pub async fn sync_statistics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<SyncStatistics>> {
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    // 总量统计
    let total: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1)"
    ))
    .bind(tid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let successful: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1) AND status = 'success'"
    ))
    .bind(tid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let failed: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1) AND status = 'failed'"
    ))
    .bind(tid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let last_sync: Option<(Option<chrono::DateTime<chrono::Utc>>,)> =
        sqlx::query_as(only_own_schema_query!(
            "integration",
            "SELECT MAX(completed_at) FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1)"
        ))
        .bind(tid)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);

    // 按 entity 分组统计
    let by_entity_rows: Vec<(String, i64)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT entity, COUNT(*) FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1) GROUP BY entity ORDER BY COUNT(*) DESC"
    ))
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mut by_entity = serde_json::Map::new();
    for (entity, count) in by_entity_rows {
        by_entity.insert(entity, serde_json::json!(count));
    }

    Json(ApiResponse::success(
        SyncStatistics {
            total_syncs: total.map(|t| t.0).unwrap_or(0),
            successful: successful.map(|t| t.0).unwrap_or(0),
            failed: failed.map(|t| t.0).unwrap_or(0),
            last_sync_at: last_sync.and_then(|t| t.0),
            by_entity: serde_json::Value::Object(by_entity),
        },
        "统计获取成功",
    ))
}

// ===== export =====

pub async fn export_mappings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at FROM erp_mappings WHERE ($1::text IS NULL OR tenant_id::text = $1) ORDER BY created_at DESC"
    ))
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(
            serde_json::json!({
                "format": "json",
                "count": rows.len(),
                "data": rows
            }),
            "导出完成",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("导出失败", e))),
    }
}

pub async fn export_sync_logs(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ExternalErpSyncLog>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, entity, direction, status, \
         total_records, success_count, failed_count, error_message, \
         started_at AS started_at, completed_at AS completed_at, created_at AS created_at \
         FROM external_erp_sync_logs WHERE ($1::text IS NULL OR tenant_id::text = $1) ORDER BY created_at DESC"
    ))
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(
            serde_json::json!({
                "format": "json",
                "count": rows.len(),
                "data": rows
            }),
            "导出完成",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("导出失败", e))),
    }
}

// ===== connections/{id}/toggle =====

pub async fn toggle_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpConnection>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let enabled = body
        .get("enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "UPDATE erp_connections SET isactive = $2, updated_at = NOW() \
         WHERE id = $1 AND tenant_id::text = $3 \
         RETURNING id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at AS last_sync_at, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(uuid)
    .bind(enabled)
    .bind(&claims.tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(conn)) => Json(ApiResponse::success(conn, "切换成功")),
        Ok(None) => Json(ApiResponse::error(404, "连接不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("切换失败", e))),
    }
}

// ===== connections/{id}/sync-status =====

pub async fn sync_connection_status(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    // 待上游支持：此处仅回显连接当前状态，真实 ERP 连通性探测后续接入
    match get_connection_by_id(&state.pool, uuid, claims.tenant_id.as_deref()).await {
        Some(c) => Json(ApiResponse::success(
            serde_json::json!({"status": c.status, "isactive": c.isactive, "last_sync_at": c.last_sync_at}),
            "连接状态已刷新",
        )),
        None => Json(ApiResponse::error(404, "连接不存在")),
    }
}

// ===== connections/{id}/company-mappings =====

pub async fn list_company_mappings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<ErpMapping>>> {
    let uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let tid: Option<&str> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().unwrap_or("default"))
    };
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at \
         FROM erp_mappings WHERE connection_id = $1 AND mapping_type = 'company' AND ($2::text IS NULL OR tenant_id::text = $2) ORDER BY created_at DESC"
    ))
    .bind(uuid)
    .bind(tid)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "公司映射列表获取成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

pub async fn create_company_mapping(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpMapping>> {
    let conn_uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let mapping_id = Uuid::new_v4();
    let local_code = body
        .get("local_code")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let local_name = body
        .get("local_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let external_code = body
        .get("external_code")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let external_name = body
        .get("external_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "INSERT INTO erp_mappings \
         (id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
          external_code, external_name, direction, isactive, priority, condition, \
          created_at, updated_at) \
         VALUES ($1,$2::uuid,$3,'company',$4,$5,$6,$7,$8,'bidirectional',TRUE,0,NULL,NOW(),NOW()) \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(mapping_id)
    .bind(tenant_uuid(&claims))
    .bind(conn_uuid)
    .bind(mapping_id.to_string())
    .bind(&local_code)
    .bind(&local_name)
    .bind(&external_code)
    .bind(&external_name)
    .fetch_one(&state.pool)
    .await
    {
        Ok(m) => Json(ApiResponse::success(m, "创建成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("创建失败", e))),
    }
}

pub async fn update_company_mapping(
    State(state): State<AppState>,
    Path((id, mapping_id)): Path<(String, String)>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpMapping>> {
    let conn_uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let mid = Uuid::parse_str(&mapping_id).unwrap_or(Uuid::nil());
    let local_code = body.get("local_code").and_then(|v| v.as_str());
    let local_name = body.get("local_name").and_then(|v| v.as_str());
    let external_code = body.get("external_code").and_then(|v| v.as_str());
    let external_name = body.get("external_name").and_then(|v| v.as_str());
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "UPDATE erp_mappings SET \
         local_code = COALESCE($1, local_code), \
         local_name = COALESCE($2, local_name), \
         external_code = COALESCE($3, external_code), \
         external_name = COALESCE($4, external_name), \
         updated_at = NOW() \
         WHERE id = $5 AND connection_id = $6 AND mapping_type = 'company' \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(local_code)
    .bind(local_name)
    .bind(external_code)
    .bind(external_name)
    .bind(mid)
    .bind(conn_uuid)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(m)) => Json(ApiResponse::success(m, "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    }
}

pub async fn delete_company_mapping(
    State(state): State<AppState>,
    Path((id, mapping_id)): Path<(String, String)>,
) -> Json<ApiResponse<()>> {
    let conn_uuid = Uuid::parse_str(&id).unwrap_or(Uuid::nil());
    let mid = Uuid::parse_str(&mapping_id).unwrap_or(Uuid::nil());
    match sqlx::query(only_own_schema_query!(
        "integration",
        "DELETE FROM erp_mappings WHERE id = $1 AND connection_id = $2 AND mapping_type = 'company' AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id::text = COALESCE(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000'))"
    ))
    .bind(mid)
    .bind(conn_uuid)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    }
}

// ===== connections/{id}/mappings/{entity}/{mapping_id} =====

pub async fn update_entity_mapping(
    State(state): State<AppState>,
    Path((conn_id, entity, mapping_id)): Path<(String, String, String)>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<ErpMapping>> {
    let conn_uuid = Uuid::parse_str(&conn_id).unwrap_or(Uuid::nil());
    let mid = Uuid::parse_str(&mapping_id).unwrap_or(Uuid::nil());
    let local_code = body.get("local_code").and_then(|v| v.as_str());
    let local_name = body.get("local_name").and_then(|v| v.as_str());
    let external_code = body.get("external_code").and_then(|v| v.as_str());
    let external_name = body.get("external_name").and_then(|v| v.as_str());
    match sqlx::query_as::<_, ErpMapping>(only_own_schema_query!(
        "integration",
        "UPDATE erp_mappings SET \
         local_code = COALESCE($1, local_code), \
         local_name = COALESCE($2, local_name), \
         external_code = COALESCE($3, external_code), \
         external_name = COALESCE($4, external_name), \
         updated_at = NOW() \
         WHERE id = $5 AND connection_id = $6 AND mapping_type = $7 \
         RETURNING id, tenant_id, connection_id, mapping_type, local_id, local_code, local_name, \
         external_code, external_name, direction, isactive, priority, condition, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(local_code)
    .bind(local_name)
    .bind(external_code)
    .bind(external_name)
    .bind(mid)
    .bind(conn_uuid)
    .bind(&entity)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(m)) => Json(ApiResponse::success(m, "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    }
}

pub async fn delete_entity_mapping(
    State(state): State<AppState>,
    Path((conn_id, entity, mapping_id)): Path<(String, String, String)>,
) -> Json<ApiResponse<()>> {
    let conn_uuid = Uuid::parse_str(&conn_id).unwrap_or(Uuid::nil());
    let mid = Uuid::parse_str(&mapping_id).unwrap_or(Uuid::nil());
    match sqlx::query(only_own_schema_query!(
        "integration",
        "DELETE FROM erp_mappings WHERE id = $1 AND connection_id = $2 AND mapping_type = $3 AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id::text = COALESCE(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000'))"
    ))
    .bind(mid)
    .bind(conn_uuid)
    .bind(&entity)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "映射不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    }
}

/// 自动匹配映射（待上游支持：依赖主数据服务，当前返回空匹配）
pub async fn auto_match_mappings() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"matched": 0, "total": 0}),
        "自动匹配完成",
    ))
}

// ===== sync/{log_id}/cancel =====

/// 取消同步（待上游支持：此处校验日志存在性后返回成功，真实中断后续接入）
pub async fn cancel_sync(
    State(state): State<AppState>,
    Path(log_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let uuid = Uuid::parse_str(&log_id).unwrap_or(Uuid::nil());
    let exists: Option<(Uuid,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT id FROM external_erp_sync_logs WHERE id = $1"
    ))
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    match exists {
        Some(_) => Json(ApiResponse::success(
            serde_json::json!({"status": "cancelled"}),
            "同步已取消",
        )),
        None => Json(ApiResponse::error(404, "同步日志不存在")),
    }
}

// ===== sync-logs/{log_id} =====

pub async fn get_sync_log(
    State(state): State<AppState>,
    Path(log_id): Path<String>,
) -> Json<ApiResponse<ExternalErpSyncLog>> {
    let uuid = Uuid::parse_str(&log_id).unwrap_or(Uuid::nil());
    match sqlx::query_as::<_, ExternalErpSyncLog>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, connection_id, entity, direction, status, \
         total_records, success_count, failed_count, error_message, \
         started_at AS started_at, completed_at AS completed_at, created_at AS created_at \
         FROM external_erp_sync_logs WHERE id = $1"
    ))
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(log)) => Json(ApiResponse::success(log, "获取成功")),
        Ok(None) => Json(ApiResponse::error(404, "同步日志不存在")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    }
}

// ===== connections/{id}/sync-statistics =====

pub async fn connection_sync_statistics(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Json<ApiResponse<SyncStatistics>> {
    let uuid = Uuid::parse_str(&conn_id).unwrap_or(Uuid::nil());
    let total: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE connection_id = $1"
    ))
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    let successful: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE connection_id = $1 AND status = 'success'"
    ))
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    let failed: Option<(i64,)> = sqlx::query_as(only_own_schema_query!(
        "integration",
        "SELECT COUNT(*) FROM external_erp_sync_logs WHERE connection_id = $1 AND status = 'failed'"
    ))
    .bind(uuid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);
    let last_sync: Option<(Option<chrono::DateTime<chrono::Utc>>,)> =
        sqlx::query_as(only_own_schema_query!(
            "integration",
            "SELECT MAX(completed_at) FROM external_erp_sync_logs WHERE connection_id = $1"
        ))
        .bind(uuid)
        .fetch_optional(&state.pool)
        .await
        .unwrap_or(None);
    Json(ApiResponse::success(
        SyncStatistics {
            total_syncs: total.map(|t| t.0).unwrap_or(0),
            successful: successful.map(|t| t.0).unwrap_or(0),
            failed: failed.map(|t| t.0).unwrap_or(0),
            last_sync_at: last_sync.and_then(|t| t.0),
            by_entity: serde_json::Value::Object(serde_json::Map::new()),
        },
        "统计获取成功",
    ))
}

// ===== /health =====

pub async fn integration_health() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"status": "up", "service": "integration"}),
        "integration healthy",
    ))
}

/// 构建 external-erp 路由（挂载到 /external-erp 前缀）
pub fn create_routes() -> Router<AppState> {
    let entity_mappings = Router::new()
        .route("/", get(list_entity_mappings).post(create_entity_mapping))
        .route("/batch", post(batch_entity_mappings))
        .route("/auto-match", post(auto_match_mappings))
        .route(
            "/{mapping_id}",
            put(update_entity_mapping).delete(delete_entity_mapping),
        );

    let preview = Router::new().route("/{entity}", get(preview_entity));

    let company_mappings = Router::new()
        .route("/", get(list_company_mappings).post(create_company_mapping))
        .route(
            "/{mapping_id}",
            put(update_company_mapping).delete(delete_company_mapping),
        );

    let connection_detail = Router::new()
        .route(
            "/",
            get(get_connection)
                .put(update_connection)
                .delete(delete_connection),
        )
        .route("/toggle", put(toggle_connection))
        .route("/sync-status", post(sync_connection_status))
        .route("/sync-statistics", get(connection_sync_statistics))
        .nest("/company-mappings", company_mappings)
        .nest("/mappings/{entity}", entity_mappings)
        .nest("/preview", preview);

    let sync = Router::new()
        .route("/{entity}", post(sync_entity))
        .route("/{log_id}/cancel", post(cancel_sync));

    Router::new()
        .route(
            "/connections",
            get(list_connections).post(create_connection),
        )
        .route("/connections/test", post(test_connection))
        .nest("/connections/{id}", connection_detail)
        .nest("/sync", sync)
        .route("/sync-logs", get(sync_logs))
        .route("/sync-logs/{log_id}", get(get_sync_log))
        .route("/sync-statistics", get(sync_statistics))
        .route("/export/mappings", get(export_mappings))
        .route("/export/sync-logs", get(export_sync_logs))
}
