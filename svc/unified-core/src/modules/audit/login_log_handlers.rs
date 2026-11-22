use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use chrono::{DateTime, Utc};
use serde_json::json;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::api_success;
use topems_shared_core::response::ApiResponse;

use super::login_log_models::{
    DeleteLoginLogRequest, LoginLog, LoginLogListResponse, LoginLogQuery, RecordLoginRequest,
};
use super::login_status::LoginStatus;

pub async fn record_login(
    State(state): State<AppState>,
    Json(req): Json<RecordLoginRequest>,
) -> ApiResponse<LoginLog> {
    // 登录前事件（认证尚未完成，无法从 Claims 取租户）允许零租户，但必须是**显式**
    // 平台通道；调用方一旦传了 tenant_id 就必须是可解析的非 nil 值，避免"写错格式"
    // 被静默降级成平台语料。
    let tenant_id = match req.tenant_id.as_deref() {
        Some(raw) => match Uuid::parse_str(raw).ok().filter(|t| !t.is_nil()) {
            Some(tenant) => tenant,
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "租户ID格式非法".to_string(),
                ))
            }
        },
        None => topems_shared_auth::middleware::tenant_scope::PLATFORM_TENANT_ID,
    };

    let user_id = req.user_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());
    let status = match LoginStatus::from_db_str(&req.status) {
        Some(status) => status,
        None => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的登录状态".to_string()))
        }
    };

    let login_time = Utc::now();

    let mut scope = match state.db.scope_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("记录登录日志作用域创建失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("记录登录日志失败".to_string()));
        }
    };
    let log: LoginLog = match sqlx::query_as(
        r#"
        INSERT INTO public.core_login_logs
            (tenant_id, user_id, username, ip_address, user_agent, status, error_message, login_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, tenant_id, user_id, username, ip_address, user_agent, status, error_message, login_time, created_at
        "#,
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(req.username)
    .bind(req.ip_address)
    .bind(req.user_agent)
    .bind(status.as_db_str())
    .bind(req.error_message)
    .bind(login_time)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("记录登录日志失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("记录登录日志失败".to_string()));
        }
    };
    let _ = scope.commit().await;

    api_success(log)
}

pub async fn list_login_logs(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<LoginLogQuery>,
) -> ApiResponse<LoginLogListResponse> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let tenant_id = super::handlers::claims_tenant_filter(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("登录日志查询作用域创建失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询登录日志失败".to_string()));
        }
    };

    let username_like = query.username.as_ref().map(|s| format!("%{}%", s));
    let ip_address_like = query.ip_address.as_ref().map(|s| format!("%{}%", s));
    let user_id = query.user_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());
    let status_filter = match query.status.as_deref() {
        None | Some("") => None,
        Some(raw) => match LoginStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str()),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的登录状态".to_string(),
                ))
            }
        },
    };

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
        r#"SELECT COUNT(*) FROM public.core_login_logs
           WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
             AND ($2::text IS NULL OR username ILIKE $2)
             AND ($3::text IS NULL OR status = $3)
             AND ($4::uuid IS NULL OR user_id = $4)
             AND ($5::text IS NULL OR ip_address ILIKE $5)
             AND ($6::timestamp IS NULL OR login_time >= $6)
             AND ($7::timestamp IS NULL OR login_time <= $7)"#,
    )
    .bind(tenant_id)
    .bind(username_like)
    .bind(status_filter)
    .bind(user_id)
    .bind(ip_address_like)
    .bind(start_time)
    .bind(end_time)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询登录日志总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询登录日志总数失败".to_string()));
        }
    };

    let username_like2 = query.username.as_ref().map(|s| format!("%{}%", s));
    let ip_address_like2 = query.ip_address.as_ref().map(|s| format!("%{}%", s));
    let user_id2 = query.user_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let start_time2 = query
        .start_time
        .as_ref()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let end_time2 = query
        .end_time
        .as_ref()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let items: Vec<LoginLog> = match sqlx::query_as(
        r#"SELECT id, tenant_id, user_id, username, ip_address, user_agent, status, error_message, login_time, created_at
           FROM public.core_login_logs
           WHERE ($1::uuid IS NULL OR tenant_id = $1)
             AND ($2::text IS NULL OR username ILIKE $2)
             AND ($3::text IS NULL OR status = $3)
             AND ($4::uuid IS NULL OR user_id = $4)
             AND ($5::text IS NULL OR ip_address ILIKE $5)
             AND ($6::timestamp IS NULL OR login_time >= $6)
             AND ($7::timestamp IS NULL OR login_time <= $7)
           ORDER BY login_time DESC
           LIMIT $8 OFFSET $9"#,
    )
    .bind(tenant_id)
    .bind(username_like2)
    .bind(status_filter)
    .bind(user_id2)
    .bind(ip_address_like2)
    .bind(start_time2)
    .bind(end_time2)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询登录日志列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询登录日志列表失败".to_string()));
        }
    };

    api_success(LoginLogListResponse {
        items,
        total,
        page,
        page_size,
    })
}

pub async fn get_login_log(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<LoginLog> {
    let tenant_id = super::handlers::claims_tenant_filter(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("登录日志详情作用域创建失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询登录日志详情失败".to_string()));
        }
    };

    let log: Option<LoginLog> = match sqlx::query_as(
        r#"SELECT id, tenant_id, user_id, username, ip_address, user_agent, status, error_message, login_time, created_at
           FROM public.core_login_logs WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询登录日志详情失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询登录日志详情失败".to_string()));
        }
    };

    match log {
        Some(log) => api_success(log),
        None => ApiResponse::from(TopemsError::ResourceNotFound("登录日志不存在".to_string())),
    }
}

pub async fn delete_login_log(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResponse<bool> {
    let tenant_id = Uuid::nil();
    let mut scope = match state.db.scope_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("删除登录日志作用域创建失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("删除登录日志失败".to_string()));
        }
    };

    let result = sqlx::query(
        r#"UPDATE public.core_login_logs SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    let _ = scope.commit().await;

    match result {
        Ok(r) if r.rows_affected() > 0 => api_success(true),
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("登录日志不存在".to_string())),
        Err(e) => {
            tracing::error!("删除登录日志失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除登录日志失败".to_string()))
        }
    }
}

pub async fn batch_delete_login_logs(
    State(state): State<AppState>,
    Json(req): Json<DeleteLoginLogRequest>,
) -> ApiResponse<serde_json::Value> {
    if req.ids.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed("ID列表不能为空".to_string()));
    }

    let tenant_id = Uuid::nil();
    let mut scope = match state.db.scope_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("批量删除登录日志作用域创建失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("批量删除登录日志失败".to_string()));
        }
    };

    let uuids: Vec<Uuid> = req
        .ids
        .into_iter()
        .filter_map(|s| Uuid::parse_str(&s).ok())
        .collect();

    if uuids.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed("无效的ID格式".to_string()));
    }

    let placeholders = uuids
        .iter()
        .enumerate()
        .map(|(i, _)| format!("${}", i + 2))
        .collect::<Vec<_>>()
        .join(", ");

    let sql = format!(
        r#"UPDATE public.core_login_logs SET deleted_at = NOW() WHERE tenant_id = $1 AND id IN ({})"#,
        placeholders
    );

    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(tenant_id);
    for uuid in uuids {
        query = query.bind(uuid);
    }

    let result = match query.execute(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("批量删除登录日志失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("批量删除登录日志失败".to_string()));
        }
    };
    let _ = scope.commit().await;

    api_success(json!({
        "deleted_count": result.rows_affected(),
    }))
}

/// 登录审计 INSERT 的唯一实现。
///
/// - 登录成功路径：在凭据事务（session + refresh token）内以 `&mut *tx` 调用，
///   保证登录日志与 session 同源、同成败；
/// - 登录失败路径：经 [`record_login_event`] best-effort 调用（不阻断 4xx 响应）。
pub async fn insert_login_log<'e, E>(
    executor: E,
    tenant_id: Uuid,
    user_id: Option<Uuid>,
    username: &str,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
    status: &str,
    error_message: Option<&str>,
) -> Result<(), sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Postgres>,
{
    // core_login_logs.ip_address 是历史契约 `varchar(128) NOT NULL`（与 core_sessions
    // 的 nullable inet 不一致）。缺省 IP（直连无 X-Forwarded-For）必须落空串而不是 NULL，
    // 否则审计 INSERT 会因非空约束失败；超长 header 截断到 128，避免写入失败。
    let ip_address: String = ip_address.unwrap_or("").chars().take(128).collect();
    let status = LoginStatus::from_db_str(status)
        .ok_or_else(|| sqlx::Error::Protocol("无效的登录状态".to_string()))?;

    sqlx::query(
        r#"
        INSERT INTO public.core_login_logs
            (tenant_id, user_id, username, ip_address, user_agent, status, error_message, login_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        "#,
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(username)
    .bind(ip_address)
    .bind(user_agent)
    .bind(status.as_db_str())
    .bind(error_message)
    .execute(executor)
    .await
    .map(|_| ())
}

/// best-effort 写入一条登录审计（失败登录路径专用）。
///
/// 写失败不再静默：输出 ERROR 结构化日志（`audit_write_failed=true`）并累加
/// `topems_audit_write_failures_total{kind="login_log"}`，便于在 /metrics 与日志侧告警。
pub async fn record_login_event(
    db: &topems_shared_db::Db,
    tenant_id: Uuid,
    user_id: Option<Uuid>,
    username: &str,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
    status: &str,
    error_message: Option<&str>,
) -> Result<(), sqlx::Error> {
    // 后台/失败路径没有请求事务上下文：用系统写作用域（显式 nil 租户），
    // 否则严格 RLS 会拒绝裸池写入（表现为 login_log 审计计数上涨）。
    let result = async {
        let mut scope = db.scope_system().await?;
        insert_login_log(
            &mut scope,
            tenant_id,
            user_id,
            username,
            ip_address,
            user_agent,
            status,
            error_message,
        )
        .await?;
        scope.commit().await?;
        Ok::<(), sqlx::Error>(())
    }
    .await;

    if let Err(e) = &result {
        topems_shared_core::metrics::AUDIT_WRITE_FAILURES_TOTAL
            .with_label_values(&["login_log"])
            .inc();
        tracing::error!(
            audit_write_failed = true,
            audit_kind = "login_log",
            login_status = %status,
            username = %username,
            user_id = ?user_id,
            error = %e,
            "登录审计日志写入失败（已计数；调用方按原语义处理）"
        );
    }

    result
}
