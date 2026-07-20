use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    OperationLog, OperationLogListResponse, OperationLogQuery, OperationLogStatsResponse,
};

pub async fn list_operation_logs(
    State(state): State<AppState>,
    Query(query): Query<OperationLogQuery>,
) -> Json<ApiResponse<OperationLogListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    // 当前实现：租户上下文来自 middleware 注入或为系统租户。
    // 后续可扩展为从 Claims.tenant_id 动态读取。
    let tenant_id = Uuid::nil();

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
        r#"SELECT COUNT(*) FROM core_operation_logs
           WHERE tenant_id = $1
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
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计日志总数失败: {}", e);
            return Json(api_error(500, "查询操作审计日志总数失败"));
        }
    };

    let items: Vec<OperationLog> = match sqlx::query_as::<_, OperationLog>(
        r#"SELECT id, tenant_id, user_id, user_name, module, operation,
                  resource_type, resource_id, description, request_data,
                  response_status, ip_address, user_agent, trace_id, created_at
           FROM core_operation_logs
           WHERE tenant_id = $1
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
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计日志列表失败: {}", e);
            return Json(api_error(500, "查询操作审计日志列表失败"));
        }
    };

    Json(api_success(OperationLogListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_operation_log(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OperationLog>> {
    let tenant_id = Uuid::nil();

    let log: Option<OperationLog> = match sqlx::query_as::<_, OperationLog>(
        r#"SELECT id, tenant_id, user_id, user_name, module, operation,
                  resource_type, resource_id, description, request_data,
                  response_status, ip_address, user_agent, trace_id, created_at
           FROM core_operation_logs
           WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计日志详情失败: {}", e);
            return Json(api_error(500, "查询操作审计日志详情失败"));
        }
    };

    match log {
        Some(log) => Json(api_success(log)),
        None => Json(api_error(404, "操作审计日志不存在")),
    }
}

pub async fn get_operation_log_stats(
    State(state): State<AppState>,
) -> Json<ApiResponse<OperationLogStatsResponse>> {
    let tenant_id = Uuid::nil();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_operation_logs WHERE tenant_id = $1"#,
    )
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计统计总数失败: {}", e);
            return Json(api_error(500, "查询操作审计统计失败"));
        }
    };

    let by_module_rows: Vec<(String, i64)> = match sqlx::query_as(
        r#"SELECT module, COUNT(*)::bigint FROM core_operation_logs
           WHERE tenant_id = $1
           GROUP BY module ORDER BY COUNT(*) DESC"#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计按模块统计失败: {}", e);
            return Json(api_error(500, "查询操作审计统计失败"));
        }
    };

    let by_operation_rows: Vec<(String, i64)> = match sqlx::query_as(
        r#"SELECT operation, COUNT(*)::bigint FROM core_operation_logs
           WHERE tenant_id = $1
           GROUP BY operation ORDER BY COUNT(*) DESC"#,
    )
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询操作审计按操作类型统计失败: {}", e);
            return Json(api_error(500, "查询操作审计统计失败"));
        }
    };

    let by_module = serde_json::json!(by_module_rows
        .into_iter()
        .collect::<std::collections::HashMap<_, _>>());
    let by_operation = serde_json::json!(by_operation_rows
        .into_iter()
        .collect::<std::collections::HashMap<_, _>>());

    Json(api_success(OperationLogStatsResponse {
        total,
        by_module,
        by_operation,
    }))
}
