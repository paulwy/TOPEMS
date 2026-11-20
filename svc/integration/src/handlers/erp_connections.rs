//! ERP 连接管理（缺口#11）
//! GET/POST /erp/connections, GET/PUT/DELETE /erp/connections/{id}, POST /erp/connections/test

use axum::extract::{Extension, Path, State};
use axum::Json;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

use crate::models::{
    AppState, CreateErpConnectionRequest, ErpConnection, ErpConnectionResponse,
    TestConnectionRequest, TestConnectionResponse, UpdateErpConnectionRequest,
};

/// 读取路径租户过滤：超管返回 None（不过滤），普通用户返回其租户 UUID
fn tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    }
}

/// 写入路径租户：缺失或零租户时返回 None，调用方必须拒绝写入（400），
/// 禁止以零 UUID 落库（tenant_id 列 NOT NULL）。
fn require_tenant_for_write(claims: &Claims) -> Option<Uuid> {
    tenant_filter(claims).filter(|t| !t.is_nil())
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:erp_connections:read"])),
    path = "/api/integration/erp/connections",
    tag = "integration",
    responses(
        (status = 200, description = "List ERP connections"),
    ),
)]
pub async fn list_connections(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<ErpConnectionResponse>> {
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

    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at, \
         created_at, updated_at FROM integration.erp_connections \
         ORDER BY created_at DESC"
    ))
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => ApiResponse::success(
            rows.into_iter()
                .map(ErpConnectionResponse::from)
                .collect::<Vec<_>>(),
            "连接列表获取成功",
        ),
        Err(e) => {
            tracing::error!("list_connections error: {}", e);
            ApiResponse::from(TopemsError::internal("查询失败", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:erp_connections:read"])),
    path = "/api/integration/erp/connections/{id}",
    tag = "integration",
    responses(
        (status = 200, description = "Get ERP connection by id"),
    ),
)]
pub async fn get_connection(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ErpConnectionResponse> {
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

    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "SELECT id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at, \
         created_at, updated_at FROM integration.erp_connections \
         WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(conn)) => ApiResponse::success(conn.into(), "获取成功"),
        Ok(None) => ApiResponse::not_found("连接不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:erp_connections:write"])),
    path = "/api/integration/erp/connections",
    tag = "integration",
    responses(
        (status = 200, description = "Create ERP connection"),
    ),
)]
pub async fn create_connection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateErpConnectionRequest>,
) -> ApiResponse<ErpConnectionResponse> {
    let Some(tid) = require_tenant_for_write(&claims) else {
        return ApiResponse::error(400, "缺少租户上下文：拒绝创建 ERP 连接");
    };
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

    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "INSERT INTO integration.erp_connections \
         (id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
          sync_direction, sync_mode, sync_interval, status, isactive, created_at, updated_at) \
         VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,'inactive',TRUE,NOW(),NOW()) \
         RETURNING id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at, \
         created_at AS created_at, updated_at AS updated_at"
    ))
    .bind(id)
    .bind(tid)
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
    .fetch_one(&mut scope)
    .await
    {
        Ok(conn) => ApiResponse::success(conn.into(), "创建成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("创建失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["integration:erp_connections:write"])),
    path = "/api/integration/erp/connections/{id}",
    tag = "integration",
    responses(
        (status = 200, description = "Update ERP connection"),
    ),
)]
pub async fn update_connection(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateErpConnectionRequest>,
) -> ApiResponse<ErpConnectionResponse> {
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

    match sqlx::query_as::<_, ErpConnection>(only_own_schema_query!(
        "integration",
        "UPDATE integration.erp_connections SET \
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
         WHERE id = $11 \
         RETURNING id, tenant_id, name, type, api_url, api_version, app_key, app_secret, \
         sync_direction, sync_mode, sync_interval, status, isactive, last_sync_at, \
         created_at AS created_at, updated_at AS updated_at"
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
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(conn)) => ApiResponse::success(conn.into(), "更新成功"),
        Ok(None) => ApiResponse::not_found("连接不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["integration:integration.erp_connections:write"])),
    path = "/api/integration/erp/connections/{id}",
    tag = "integration",
    responses(
        (status = 200, description = "Delete ERP connection"),
    ),
)]
pub async fn delete_connection(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<()> {
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
        "DELETE FROM integration.erp_connections WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut scope)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除成功"),
        Ok(_) => ApiResponse::not_found("连接不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("删除失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:erp_connections:write"])),
    path = "/api/integration/erp/connections/test",
    tag = "integration",
    responses(
        (status = 200, description = "Test ERP connection"),
    ),
)]
pub async fn test_connection(
    State(_state): State<AppState>,
    Json(req): Json<TestConnectionRequest>,
) -> ApiResponse<TestConnectionResponse> {
    // URL 格式校验：非 http/https 直接判失败，不发起请求
    if !req.api_url.starts_with("http://") && !req.api_url.starts_with("https://") {
        return ApiResponse::success(
            TestConnectionResponse {
                success: false,
                response_time_ms: 0,
                error_message: Some("URL 必须以 http:// 或 https:// 开头".to_string()),
            },
            "测试完成",
        );
    }

    // 真实 HTTP 探测（带超时）：复用 external_erp::probe_http_url，
    // 与 /external-erp/connections/test 同一实现。超时 / 连接拒绝 / DNS 失败均返回
    // success=false 并透传错误，不再仅校验 URL 前缀即报成功。
    // 注：SSRF 地址白名单/内网封锁属 P2-2，待产品决策，本处暂不做。
    let timeout_ms = req.timeout.unwrap_or(5000);
    let probe = crate::external_erp::probe_http_url(&req.api_url, timeout_ms).await;
    ApiResponse::success(
        TestConnectionResponse {
            success: probe.success,
            response_time_ms: probe.response_time_ms,
            error_message: probe.error_message,
        },
        "测试完成",
    )
}
