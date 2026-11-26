use axum::{
    extract::{Path, Query, State},
    Extension,
};
use chrono::{DateTime, Utc};
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::api_success;
use topems_shared_core::response::ApiResponse;

use super::audit_query::AuditLogQueryParams;
use super::models::{
    OperationLog, OperationLogListResponse, OperationLogQuery, OperationLogStatsResponse,
};

/// 审计查询的租户过滤条件。
///
/// 超管 / service 身份 = `None`（系统通道，全量）；普通用户 = 自己的租户，
/// 解析失败取 nil（fail-closed，不会退化成全量）。
pub(crate) fn claims_tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser || topems_shared_auth::service::is_service_claims(claims) {
        return None;
    }
    Some(
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
            .unwrap_or_else(Uuid::nil),
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/operations",
    tag = "Core-Audit",
    params(
        ("user_id" = Option<String>, Query, description = "操作人 ID"),
        ("user_name" = Option<String>, Query, description = "操作人名称"),
        ("module" = Option<String>, Query, description = "模块"),
        ("operation" = Option<String>, Query, description = "动作"),
        ("resource_type" = Option<String>, Query, description = "资源类型"),
        ("resource_id" = Option<String>, Query, description = "资源 ID"),
        ("trace_id" = Option<String>, Query, description = "链路 ID"),
        ("start_time" = Option<String>, Query, description = "起始时间"),
        ("end_time" = Option<String>, Query, description = "结束时间"),
        ("success" = Option<bool>, Query, description = "是否成功"),
        ("page" = Option<i64>, Query, description = "页码，默认 1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认 20，上限 100"),
    ),
    responses((status = 200, description = "操作日志分页列表"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_operation_logs(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<OperationLogQuery>,
) -> ApiResponse<OperationLogListResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let tenant_id = claims_tenant_filter(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("审计查询作用域创建失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询操作审计日志失败".to_string()));
        }
    };

    // 平台视图（超管/service 无租户过滤）跨租户读：core_operation_logs 已是严格 B，
    // 请求上下文只会看到本租户行，须在请求事务上显式打开系统通道；
    // 普通租户保持租户上下文 + 显式 tenant_id 过滤。
    if tenant_id.is_none() {
        if let Err(e) = sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
            .execute(&mut scope)
            .await
        {
            tracing::error!("审计平台视图打开系统通道失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询操作审计日志失败".to_string()));
        }
    }

    let user_id = query.user_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());
    let user_name_like = query.user_name.as_ref().map(|s| format!("%{}%", s));
    let module_like = query.module.as_ref().map(|s| format!("%{}%", s));
    let resource_type_like = query.resource_type.as_ref().map(|s| format!("%{}%", s));
    let resource_id_like = query.resource_id.as_ref().map(|s| format!("%{}%", s));
    let trace_id_like = query.trace_id.as_ref().map(|s| format!("%{}%", s));

    let start_time = query
        .start_time
        .as_ref()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));
    let end_time = query
        .end_time
        .as_ref()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM public.core_operation_logs
           WHERE ($1::uuid IS NULL OR tenant_id = $1)
             AND ($2::uuid IS NULL OR user_id = $2)
             AND ($3::text IS NULL OR user_name ILIKE $3)
             AND ($4::text IS NULL OR module ILIKE $4)
             AND ($5::text IS NULL OR operation = $5)
             AND ($6::text IS NULL OR resource_type ILIKE $6)
             AND ($7::text IS NULL OR resource_id ILIKE $7)
             AND ($8::text IS NULL OR trace_id ILIKE $8)
             AND ($9::timestamp IS NULL OR created_at >= $9)
             AND ($10::timestamp IS NULL OR created_at <= $10)
             AND ($11::boolean IS NULL
                  OR ($11 = true AND response_status < 400)
                  OR ($11 = false AND response_status >= 400))"#,
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(user_name_like.clone())
    .bind(module_like.clone())
    .bind(query.operation.clone())
    .bind(resource_type_like.clone())
    .bind(resource_id_like.clone())
    .bind(trace_id_like.clone())
    .bind(start_time)
    .bind(end_time)
    .bind(query.success)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计日志总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "查询操作审计日志总数失败".to_string(),
            ));
        }
    };

    let items: Vec<OperationLog> = match sqlx::query_as::<_, OperationLog>(
        r#"SELECT id, tenant_id, user_id, user_name, module, operation,
                  resource_type, resource_id, description, request_data,
                  response_status, ip_address, user_agent, trace_id, created_at
           FROM public.core_operation_logs
           WHERE ($1::uuid IS NULL OR tenant_id = $1)
             AND ($2::uuid IS NULL OR user_id = $2)
             AND ($3::text IS NULL OR user_name ILIKE $3)
             AND ($4::text IS NULL OR module ILIKE $4)
             AND ($5::text IS NULL OR operation = $5)
             AND ($6::text IS NULL OR resource_type ILIKE $6)
             AND ($7::text IS NULL OR resource_id ILIKE $7)
             AND ($8::text IS NULL OR trace_id ILIKE $8)
             AND ($9::timestamp IS NULL OR created_at >= $9)
             AND ($10::timestamp IS NULL OR created_at <= $10)
             AND ($11::boolean IS NULL
                  OR ($11 = true AND response_status < 400)
                  OR ($11 = false AND response_status >= 400))
           ORDER BY created_at DESC
           LIMIT $12 OFFSET $13"#,
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(user_name_like)
    .bind(module_like)
    .bind(query.operation)
    .bind(resource_type_like)
    .bind(resource_id_like)
    .bind(trace_id_like)
    .bind(start_time)
    .bind(end_time)
    .bind(query.success)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计日志列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "查询操作审计日志列表失败".to_string(),
            ));
        }
    };

    api_success(OperationLogListResponse {
        items,
        total,
        page,
        page_size,
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/operations/{id}",
    tag = "Core-Audit",
    params(
        ("id" = String, Path, description = "记录 ID"),
    ),
    responses((status = 200, description = "操作日志详情"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_operation_log(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<OperationLog> {
    let tenant_id = claims_tenant_filter(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("审计详情作用域创建失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "查询操作审计日志详情失败".to_string(),
            ));
        }
    };

    // 平台视图跨租户读：同 list_operation_logs，须显式打开系统通道。
    if tenant_id.is_none() {
        if let Err(e) = sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
            .execute(&mut scope)
            .await
        {
            tracing::error!("审计详情平台视图打开系统通道失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "查询操作审计日志详情失败".to_string(),
            ));
        }
    }

    let log: Option<OperationLog> = match sqlx::query_as::<_, OperationLog>(
        r#"SELECT id, tenant_id, user_id, user_name, module, operation,
                  resource_type, resource_id, description, request_data,
                  response_status, ip_address, user_agent, trace_id, created_at
           FROM public.core_operation_logs
           WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计日志详情失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "查询操作审计日志详情失败".to_string(),
            ));
        }
    };

    match log {
        Some(log) => api_success(log),
        None => ApiResponse::from(TopemsError::ResourceNotFound(
            "操作审计日志不存在".to_string(),
        )),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/operations/stats",
    tag = "Core-Audit",
    params(
        ("start_time" = Option<String>, Query, description = "起始时间"),
        ("end_time" = Option<String>, Query, description = "结束时间"),
        ("group_by" = Option<String>, Query, description = "分组维度"),
    ),
    responses((status = 200, description = "操作日志统计"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_operation_log_stats(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<OperationLogStatsResponse> {
    let tenant_id = claims_tenant_filter(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("审计统计作用域创建失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询操作审计统计失败".to_string()));
        }
    };

    // 平台视图跨租户统计：同 list_operation_logs，须显式打开系统通道。
    if tenant_id.is_none() {
        if let Err(e) = sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
            .execute(&mut scope)
            .await
        {
            tracing::error!("审计统计平台视图打开系统通道失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询操作审计统计失败".to_string()));
        }
    }

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM public.core_operation_logs WHERE ($1::uuid IS NULL OR tenant_id = $1)"#,
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计统计总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询操作审计统计失败".to_string()));
        }
    };

    let by_module_rows: Vec<(String, i64)> = match sqlx::query_as(
        r#"SELECT module, COUNT(*)::bigint FROM public.core_operation_logs
           WHERE ($1::uuid IS NULL OR tenant_id = $1)
           GROUP BY module ORDER BY COUNT(*) DESC"#,
    )
    .bind(tenant_id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计按模块统计失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询操作审计统计失败".to_string()));
        }
    };

    let by_operation_rows: Vec<(String, i64)> = match sqlx::query_as(
        r#"SELECT operation, COUNT(*)::bigint FROM public.core_operation_logs
           WHERE ($1::uuid IS NULL OR tenant_id = $1)
           GROUP BY operation ORDER BY COUNT(*) DESC"#,
    )
    .bind(tenant_id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计按操作类型统计失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询操作审计统计失败".to_string()));
        }
    };

    let by_module = serde_json::json!(by_module_rows
        .into_iter()
        .collect::<std::collections::HashMap<_, _>>());
    let by_operation = serde_json::json!(by_operation_rows
        .into_iter()
        .collect::<std::collections::HashMap<_, _>>());

    api_success(OperationLogStatsResponse {
        total,
        by_module,
        by_operation,
    })
}

// ===== 权限变更审计 handlers（调用 audit_query 真实实现） =====

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/permission-changes",
    tag = "Core-Audit",
    params(
        ("user_id" = Option<String>, Query, description = "操作人 ID"),
        ("user_name" = Option<String>, Query, description = "操作人名称"),
        ("module" = Option<String>, Query, description = "模块"),
        ("operation" = Option<String>, Query, description = "动作"),
        ("resource_type" = Option<String>, Query, description = "资源类型"),
        ("resource_id" = Option<String>, Query, description = "资源 ID"),
        ("trace_id" = Option<String>, Query, description = "链路 ID"),
        ("start_time" = Option<String>, Query, description = "起始时间"),
        ("end_time" = Option<String>, Query, description = "结束时间"),
        ("success" = Option<bool>, Query, description = "是否成功"),
        ("page" = Option<i64>, Query, description = "页码，默认 1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认 20，上限 100"),
    ),
    responses((status = 200, description = "权限变更审计列表"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_permission_changes(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Query(query): Query<OperationLogQuery>,
) -> ApiResponse<serde_json::Value> {
    let audit_params = AuditLogQueryParams {
        source: Some("permission_audit_logs".to_string()),
        user_id: query.user_id.clone(),
        username: query.user_name.clone(),
        action: query.operation.clone(),
        entity_type: query.resource_type.clone(),
        resource: None,
        status: None,
        success: query.success,
        ip_address: None,
        start_date: query.start_time.clone(),
        end_date: query.end_time.clone(),
        search: None,
        page: query.page,
        page_size: query.page_size,
    };
    let result =
        super::audit_query::query_audit_logs(Extension(txn_arc), State(state), Query(audit_params))
            .await;
    match result.data {
        Some(paginated) => {
            let items: Vec<serde_json::Value> = paginated
                .items
                .iter()
                .map(|item| serde_json::to_value(item).unwrap_or(serde_json::json!({})))
                .collect();
            api_success(serde_json::json!({
                "items": items,
                "total": paginated.total,
                "page": paginated.page,
                "page_size": paginated.page_size,
            }))
        }
        None => ApiResponse::from(match result.code {
            404 => TopemsError::ResourceNotFound(result.message),
            400 => TopemsError::ValidationFailed(result.message),
            _ => TopemsError::Internal(result.message),
        }),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/permission-changes/{id}",
    tag = "Core-Audit",
    params(
        ("id" = String, Path, description = "记录 ID"),
    ),
    responses((status = 200, description = "权限变更详情"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_permission_change(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    // public.permission_audit_logs.id 是 bigint（iam 副本是 uuid，且无写入者）。
    // 明细接口按写入端落地的 public 表查询，id 必须按整数解析后再绑定。
    let Ok(log_id) = id.trim().parse::<i64>() else {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "权限变更记录 ID 必须为整数".to_string(),
        ));
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("权限变更详情作用域创建失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询权限变更详情失败".to_string()));
        }
    };
    match sqlx::query(
        r#"
        SELECT
            id,
            'permission_audit_logs' AS source,
            tenant_id,
            user_id,
            NULL::text AS username,
            action,
            NULL::text AS entity_type,
            NULL::uuid AS entity_id,
            NULL::text AS resource,
            ip_address::text AS ip_address,
            user_agent,
            NULL::text AS status,
            NULL::bool AS success,
            NULL::text AS error_message,
            jsonb_build_object(
                'before', old_value,
                'after', new_value,
                'reason', NULL
            ) AS details,
            changed_at AS created_at
        FROM public.permission_audit_logs
        WHERE id = $1
        "#,
    )
    .bind(log_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(row)) => {
            // public 表与 iam 副本结构不同（id bigint / user_id varchar），
            // 逐列显式取值，保持与统一审计响应一致的字符串 id 形态。
            use sqlx::Row;
            let entry = serde_json::json!({
                "id": row.get::<i64, _>("id").to_string(),
                "source": row.get::<String, _>("source"),
                "tenant_id": row.get::<Option<Uuid>, _>("tenant_id").map(|v| v.to_string()),
                "user_id": row.get::<Option<String>, _>("user_id"),
                "username": row.get::<Option<String>, _>("username"),
                "action": row.get::<String, _>("action"),
                "entity_type": row.get::<Option<String>, _>("entity_type"),
                "entity_id": row.get::<Option<Uuid>, _>("entity_id").map(|v| v.to_string()),
                "resource": row.get::<Option<String>, _>("resource"),
                "ip_address": row.get::<Option<String>, _>("ip_address"),
                "user_agent": row.get::<Option<String>, _>("user_agent"),
                "status": row.get::<Option<String>, _>("status"),
                "success": row.get::<Option<bool>, _>("success"),
                "error_message": row.get::<Option<String>, _>("error_message"),
                "details": row.get::<Option<serde_json::Value>, _>("details"),
                "created_at": row.get::<DateTime<Utc>, _>("created_at"),
            });
            api_success(entry)
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound(
            "权限变更记录不存在".to_string(),
        )),
        Err(e) => {
            tracing::error!("查询权限变更记录失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询权限变更记录失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/permission-changes/stats",
    tag = "Core-Audit",
    params(
        ("start_time" = Option<String>, Query, description = "起始时间"),
        ("end_time" = Option<String>, Query, description = "结束时间"),
    ),
    responses((status = 200, description = "权限变更统计"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_permission_change_stats(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
) -> ApiResponse<serde_json::Value> {
    let audit_params = AuditLogQueryParams {
        source: Some("permission_audit_logs".to_string()),
        user_id: None,
        username: None,
        action: None,
        entity_type: None,
        resource: None,
        status: None,
        success: None,
        ip_address: None,
        start_date: None,
        end_date: None,
        search: None,
        page: None,
        page_size: None,
    };
    let result = super::audit_query::get_audit_log_stats(
        Extension(txn_arc),
        State(state),
        Query(audit_params),
    )
    .await;
    match result.data {
        Some(stats) => {
            let by_action: std::collections::HashMap<String, i64> = stats
                .by_action
                .iter()
                .map(|c| (c.key.clone(), c.count))
                .collect();
            let role_changes = *by_action.get("role_assign").unwrap_or(&0)
                + *by_action.get("role_unassign").unwrap_or(&0);
            let permission_changes = *by_action.get("permission_grant").unwrap_or(&0)
                + *by_action.get("permission_revoke").unwrap_or(&0);
            let grants = *by_action.get("role_assign").unwrap_or(&0)
                + *by_action.get("permission_grant").unwrap_or(&0);
            let revokes = *by_action.get("role_unassign").unwrap_or(&0)
                + *by_action.get("permission_revoke").unwrap_or(&0);
            let updates = *by_action.get("update").unwrap_or(&0);
            api_success(serde_json::json!({
                "total_changes": stats.total,
                "today_changes": stats.today_total,
                "role_changes": role_changes,
                "permission_changes": permission_changes,
                "grants": grants,
                "revokes": revokes,
                "updates": updates,
                "success_rate": if stats.total > 0 { 1.0 } else { 0.0 },
                "by_role": stats.by_action.iter().map(|c| serde_json::json!({"role": c.key, "count": c.count})).collect::<Vec<_>>(),
                "by_user": stats.by_user.iter().map(|c| serde_json::json!({"user": c.key, "count": c.count})).collect::<Vec<_>>(),
                "by_operator": stats.by_user.iter().map(|c| serde_json::json!({"operator": c.key, "count": c.count})).collect::<Vec<_>>(),
                "trend": stats.trend.iter().map(|t| serde_json::json!({"date": t.date, "count": t.count})).collect::<Vec<_>>(),
            }))
        }
        None => ApiResponse::from(match result.code {
            404 => TopemsError::ResourceNotFound(result.message),
            400 => TopemsError::ValidationFailed(result.message),
            _ => TopemsError::Internal(result.message),
        }),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/permission-changes/export",
    tag = "Core-Audit",
    params(
        ("user_id" = Option<String>, Query, description = "操作人 ID"),
        ("user_name" = Option<String>, Query, description = "操作人名称"),
        ("module" = Option<String>, Query, description = "模块"),
        ("operation" = Option<String>, Query, description = "动作"),
        ("resource_type" = Option<String>, Query, description = "资源类型"),
        ("resource_id" = Option<String>, Query, description = "资源 ID"),
        ("trace_id" = Option<String>, Query, description = "链路 ID"),
        ("start_time" = Option<String>, Query, description = "起始时间"),
        ("end_time" = Option<String>, Query, description = "结束时间"),
        ("success" = Option<bool>, Query, description = "是否成功"),
        ("page" = Option<i64>, Query, description = "页码，默认 1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认 20，上限 100"),
    ),
    responses((status = 200, description = "导出权限变更（JSON）"), (status = 500, description = "服务内部错误")),
)]
pub async fn export_permission_changes(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Query(query): Query<OperationLogQuery>,
) -> axum::response::Response {
    let export_params = super::audit_query::ExportQueryParams {
        source: Some("permission_audit_logs".to_string()),
        format: None,
        start_date: query.start_time.clone(),
        end_date: query.end_time.clone(),
        action: query.operation.clone(),
        status: None,
        user_id: query.user_id.clone(),
        search: None,
    };
    match super::audit_query::export_audit_logs(
        Extension(txn_arc),
        State(state),
        Query(export_params),
    )
    .await
    {
        Ok(resp) => resp,
        Err(resp) => resp,
    }
}

// ===== 访问控制审计 handlers（调用 audit_query 真实实现） =====

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/access-logs",
    tag = "Core-Audit",
    params(
        ("user_id" = Option<String>, Query, description = "操作人 ID"),
        ("user_name" = Option<String>, Query, description = "操作人名称"),
        ("module" = Option<String>, Query, description = "模块"),
        ("operation" = Option<String>, Query, description = "动作"),
        ("resource_type" = Option<String>, Query, description = "资源类型"),
        ("resource_id" = Option<String>, Query, description = "资源 ID"),
        ("trace_id" = Option<String>, Query, description = "链路 ID"),
        ("start_time" = Option<String>, Query, description = "起始时间"),
        ("end_time" = Option<String>, Query, description = "结束时间"),
        ("success" = Option<bool>, Query, description = "是否成功"),
        ("page" = Option<i64>, Query, description = "页码，默认 1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认 20，上限 100"),
    ),
    responses((status = 200, description = "访问审计列表"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_access_logs(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Query(query): Query<OperationLogQuery>,
) -> ApiResponse<serde_json::Value> {
    let audit_params = AuditLogQueryParams {
        source: Some("audit_logs".to_string()),
        user_id: query.user_id.clone(),
        username: query.user_name.clone(),
        action: query.operation.clone(),
        entity_type: query.resource_type.clone(),
        resource: query.trace_id.clone(),
        status: None,
        success: query.success,
        ip_address: None,
        start_date: query.start_time.clone(),
        end_date: query.end_time.clone(),
        search: None,
        page: query.page,
        page_size: query.page_size,
    };
    let result =
        super::audit_query::query_audit_logs(Extension(txn_arc), State(state), Query(audit_params))
            .await;
    match result.data {
        Some(paginated) => {
            let items: Vec<serde_json::Value> = paginated
                .items
                .iter()
                .map(|item| serde_json::to_value(item).unwrap_or(serde_json::json!({})))
                .collect();
            api_success(serde_json::json!({
                "items": items,
                "total": paginated.total,
                "page": paginated.page,
                "page_size": paginated.page_size,
            }))
        }
        None => ApiResponse::from(match result.code {
            404 => TopemsError::ResourceNotFound(result.message),
            400 => TopemsError::ValidationFailed(result.message),
            _ => TopemsError::Internal(result.message),
        }),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/access-logs/{id}",
    tag = "Core-Audit",
    params(
        ("id" = String, Path, description = "记录 ID"),
    ),
    responses((status = 200, description = "访问审计详情"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_access_log(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return ApiResponse::server_error("数据库作用域创建失败");
        }
    };

    let result = sqlx::query_as::<_, super::audit_query::AuditLogEntry>(
        r#"
        SELECT
            id,
            'audit_logs' AS source,
            NULL::uuid AS tenant_id,
            -- v69 迁移后 public.audit_logs.user_id 已是 uuid 列；
            -- 旧 text 时代写法 user_id ~ '...' 触发 "operator does not exist: uuid ~ unknown"，
            -- 直接选取即可（结构字段为 Option<Uuid>）。
            user_id,
            user_name AS username,
            action,
            entity_type,
            entity_id,
            NULL::text AS resource,
            ip_address,
            user_agent,
            status,
            (status = 'success') AS success,
            error_message,
            jsonb_build_object(
                'request_details', request_details,
                'response_details', response_details,
                'entity_ids', entity_ids
            ) AS details,
            created_at
        -- 访问日志权威表为 public.audit_logs（与 list_access_logs 同源）；
        -- 历史误写 iam.audit_logs 导致查询失败、handler 吞错返回 code=500。
        FROM public.audit_logs
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    let _ = scope.commit().await;

    match result {
        Ok(Some(entry)) => {
            api_success(serde_json::to_value(entry).unwrap_or(serde_json::json!({})))
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("访问日志不存在".to_string())),
        Err(e) => {
            tracing::error!("查询访问日志失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询访问日志失败".to_string()))
        }
    }
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/access-logs/stats",
    tag = "Core-Audit",
    params(
        ("start_time" = Option<String>, Query, description = "起始时间"),
        ("end_time" = Option<String>, Query, description = "结束时间"),
    ),
    responses((status = 200, description = "访问审计统计"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_access_log_stats(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
) -> ApiResponse<serde_json::Value> {
    let audit_params = AuditLogQueryParams {
        source: Some("audit_logs".to_string()),
        user_id: None,
        username: None,
        action: None,
        entity_type: None,
        resource: None,
        status: None,
        success: None,
        ip_address: None,
        start_date: None,
        end_date: None,
        search: None,
        page: None,
        page_size: None,
    };
    let result = super::audit_query::get_audit_log_stats(
        Extension(txn_arc),
        State(state),
        Query(audit_params),
    )
    .await;
    match result.data {
        Some(stats) => {
            let _by_action: std::collections::HashMap<String, i64> = stats
                .by_action
                .iter()
                .map(|c| (c.key.clone(), c.count))
                .collect();
            api_success(serde_json::json!({
                "total_logs": stats.total,
                "allowed": stats.success_total,
                "denied": stats.failure_total,
                "success_rate": if stats.total > 0 { stats.success_total as f64 / stats.total as f64 } else { 0.0 },
                "by_resource": stats.by_action.iter().map(|c| serde_json::json!({"resource": c.key, "count": c.count})).collect::<Vec<_>>(),
                "by_user": stats.by_user.iter().map(|c| serde_json::json!({"user": c.key, "count": c.count})).collect::<Vec<_>>(),
                "by_action": stats.by_action.iter().map(|c| serde_json::json!({"action": c.key, "count": c.count})).collect::<Vec<_>>(),
                "trend": stats.trend.iter().map(|t| serde_json::json!({"date": t.date, "count": t.count})).collect::<Vec<_>>(),
            }))
        }
        None => ApiResponse::from(match result.code {
            404 => TopemsError::ResourceNotFound(result.message),
            400 => TopemsError::ValidationFailed(result.message),
            _ => TopemsError::Internal(result.message),
        }),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/audit/access-logs/export",
    tag = "Core-Audit",
    params(
        ("user_id" = Option<String>, Query, description = "操作人 ID"),
        ("user_name" = Option<String>, Query, description = "操作人名称"),
        ("module" = Option<String>, Query, description = "模块"),
        ("operation" = Option<String>, Query, description = "动作"),
        ("resource_type" = Option<String>, Query, description = "资源类型"),
        ("resource_id" = Option<String>, Query, description = "资源 ID"),
        ("trace_id" = Option<String>, Query, description = "链路 ID"),
        ("start_time" = Option<String>, Query, description = "起始时间"),
        ("end_time" = Option<String>, Query, description = "结束时间"),
        ("success" = Option<bool>, Query, description = "是否成功"),
        ("page" = Option<i64>, Query, description = "页码，默认 1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认 20，上限 100"),
    ),
    responses((status = 200, description = "导出访问审计（JSON）"), (status = 500, description = "服务内部错误")),
)]
pub async fn export_access_logs(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Query(query): Query<OperationLogQuery>,
) -> axum::response::Response {
    let export_params = super::audit_query::ExportQueryParams {
        source: Some("audit_logs".to_string()),
        format: None,
        start_date: query.start_time.clone(),
        end_date: query.end_time.clone(),
        action: query.operation.clone(),
        status: None,
        user_id: query.user_id.clone(),
        search: None,
    };
    match super::audit_query::export_audit_logs(
        Extension(txn_arc),
        State(state),
        Query(export_params),
    )
    .await
    {
        Ok(resp) => resp,
        Err(resp) => resp,
    }
}
