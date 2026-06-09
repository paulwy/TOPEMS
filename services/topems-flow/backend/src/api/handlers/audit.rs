use axum::{extract::{State, Query}, Json};
use serde::Deserialize;
use uuid::Uuid;

use crate::state::AppState;
use crate::models::{AuditLog, AuditLogQuery, AuditLogResponse, CreateAuditLogRequest};
use chrono::Utc;
use topems_shared::ApiResponse;

pub async fn list_audit_logs(
    State(state): State<AppState>,
    Query(query): Query<AuditLogQuery>,
) -> Json<ApiResponse<AuditLogResponse>> {
    let pool = state.repo.get_pool();
    
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let mut sql = String::from("SELECT * FROM flow.audit_logs WHERE 1=1");
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();

    if let Some(action) = &query.action {
        sql.push_str(" AND action = $");
        sql.push_str(&(params.len() + 1).to_string());
        params.push(Box::new(action.clone()));
    }

    if let Some(resource_type) = &query.resource_type {
        sql.push_str(" AND resource_type = $");
        sql.push_str(&(params.len() + 1).to_string());
        params.push(Box::new(resource_type.clone()));
    }

    if let Some(resource_id) = query.resource_id {
        sql.push_str(" AND resource_id = $");
        sql.push_str(&(params.len() + 1).to_string());
        params.push(Box::new(resource_id));
    }

    if let Some(actor_id) = query.actor_id {
        sql.push_str(" AND actor_id = $");
        sql.push_str(&(params.len() + 1).to_string());
        params.push(Box::new(actor_id));
    }

    if let Some(start_date) = &query.start_date {
        sql.push_str(" AND created_at >= $");
        sql.push_str(&(params.len() + 1).to_string());
        params.push(Box::new(start_date.clone()));
    }

    if let Some(end_date) = &query.end_date {
        sql.push_str(" AND created_at <= $");
        sql.push_str(&(params.len() + 1).to_string());
        params.push(Box::new(end_date.clone()));
    }

    let total_sql = format!("SELECT COUNT(*) FROM ({}) AS sub", sql);
    let count: i64 = sqlx::query_scalar(&total_sql)
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    sql.push_str(" ORDER BY created_at DESC LIMIT $");
    sql.push_str(&(params.len() + 1).to_string());
    params.push(Box::new(page_size as i64));

    sql.push_str(" OFFSET $");
    sql.push_str(&(params.len() + 1).to_string());
    params.push(Box::new(offset as i64));

    let logs: Vec<AuditLog> = sqlx::query_as(&sql)
        .fetch_all(pool)
        .await
        .unwrap_or_default();

    Json(ApiResponse::success(
        AuditLogResponse {
            logs,
            total: count,
            page,
            page_size,
        },
        "审计日志查询成功"
    ))
}

pub async fn get_audit_log(
    State(state): State<AppState>,
    Query(params): Query<AuditLogByIdQuery>,
) -> Json<ApiResponse<AuditLog>> {
    let pool = state.repo.get_pool();

    let log: Option<AuditLog> = sqlx::query_as(
        "SELECT * FROM flow.audit_logs WHERE id = $1"
    )
    .bind(params.id)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    if let Some(log) = log {
        Json(ApiResponse::success(log, "审计日志获取成功"))
    } else {
        Json(ApiResponse::<AuditLog>::error(404, "审计日志不存在"))
    }
}

pub async fn create_audit_log(
    State(state): State<AppState>,
    Json(request): Json<CreateAuditLogRequest>,
) -> Json<ApiResponse<AuditLog>> {
    let pool = state.repo.get_pool();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(
        "INSERT INTO flow.audit_logs (
            id, action, resource_type, resource_id, actor_id, 
            actor_name, previous_state, new_state, details, 
            ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"
    )
    .bind(id)
    .bind(&request.action)
    .bind(&request.resource_type)
    .bind(&request.resource_id)
    .bind(&request.actor_id)
    .bind(&request.actor_name)
    .bind(&request.previous_state)
    .bind(&request.new_state)
    .bind(&request.details)
    .bind(&request.ip_address)
    .bind(&request.user_agent)
    .bind(now)
    .execute(pool)
    .await;

    match result {
        Ok(_) => {
            let log = AuditLog {
                id,
                action: request.action,
                resource_type: request.resource_type,
                resource_id: request.resource_id,
                actor_id: request.actor_id,
                actor_name: request.actor_name,
                previous_state: request.previous_state,
                new_state: request.new_state,
                details: request.details,
                ip_address: request.ip_address,
                user_agent: request.user_agent,
                created_at: now,
            };
            Json(ApiResponse::success(log, "审计日志创建成功"))
        }
        Err(e) => {
            tracing::error!("创建审计日志失败: {}", e);
            Json(ApiResponse::<AuditLog>::error(500, "创建审计日志失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuditLogByIdQuery {
    pub id: Uuid,
}
