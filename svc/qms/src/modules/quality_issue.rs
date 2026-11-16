//! Quality Issue handlers

use crate::models::quality_issue::*;
use crate::shared::fsm::{issue_can_transition, issue_requires_approval};
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use serde::Deserialize;
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::{get_tenant_id, require_tenant};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_event::event::commit_retry;
use topems_shared_event::event::EventType;
use topems_shared_event::event::QmsQualityIssueCreatedPayload;
use utoipa::ToSchema;

use topems_shared_service_client::service_client::CreateInstanceRequest;

const STATUS_CLOSED: &str = "closed";
const STATUS_IN_PROGRESS: &str = "in_progress";
const STATUS_CANCELLED: &str = "cancelled";

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:read"])),
    path = "/api/qms/issues",
    tag = "quality_issue",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("severity" = Option<String>, Query, description = "严重程度过滤"),
    ),
    responses(
        (status = 200, description = "质量问题列表", body = ApiResponse<Vec<QualityIssue>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_issues(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<IssueQuery>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<Vec<QualityIssue>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取质量问题列表失败");
        }
    };
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let locale = Locale::from_headers(&headers).as_sql();

    // 多语言：title 按 locale 切换；各分支 locale 绑定在参数末尾，序号随分支不同。
    let issues = match (query.status.as_ref(), query.severity.as_ref()) {
        (Some(st), Some(sv)) => {
            let cols = issue_select_cols("$6");
            let sql = format!(
                "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 AND severity = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5",
                cols
            );
            sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(sql))
                .bind(tenant_opt)
                .bind(st)
                .bind(sv)
                .bind(page_size)
                .bind(offset)
                .bind(locale)
                .fetch_all(&mut scope)
                .await
        }
        (Some(st), None) => {
            let cols = issue_select_cols("$5");
            let sql = format!(
                "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
                cols
            );
            sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(sql))
                .bind(tenant_opt)
                .bind(st)
                .bind(page_size)
                .bind(offset)
                .bind(locale)
                .fetch_all(&mut scope)
                .await
        }
        (None, Some(sv)) => {
            let cols = issue_select_cols("$5");
            let sql = format!(
                "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND severity = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
                cols
            );
            sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(sql))
                .bind(tenant_opt)
                .bind(sv)
                .bind(page_size)
                .bind(offset)
                .bind(locale)
                .fetch_all(&mut scope)
                .await
        }
        (None, None) => {
            let cols = issue_select_cols("$4");
            let sql = format!(
                "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3",
                cols
            );
            sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(sql))
                .bind(tenant_opt)
                .bind(page_size)
                .bind(offset)
                .bind(locale)
                .fetch_all(&mut scope)
                .await
        }
    };

    match issues {
        Ok(data) => ApiResponse::success(data, "获取质量问题列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch issues: {}", e);
            ApiResponse::server_error("获取质量问题列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:write"])),
    path = "/api/qms/issues",
    tag = "quality_issue",
    request_body = CreateIssueRequest,
    responses(
        (status = 200, description = "质量问题创建成功", body = ApiResponse<QualityIssue>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_issue(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateIssueRequest>,
) -> ApiResponse<QualityIssue> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let issue_no = format!(
        "QI-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let related_inspection_id = req
        .related_inspection_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    // 写作用域：事务级 search_path + app.tenant_id（RLS 与显式谓词双层隔离）。
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("质量问题创建失败");
        }
    };

    // 同域引用校验：关联检验必须存在且同租户，否则 400，禁止跨租户引用落库。
    if let Some(rid) = related_inspection_id {
        match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "qms",
            "SELECT COUNT(*) FROM qms.qa_quality_inspections WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
        ))
        .bind(rid)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(0) => return ApiResponse::bad_request("关联检验不存在或不属于当前租户"),
            Ok(_) => {}
            Err(e) => {
                tracing::error!("Failed to validate related inspection: {}", e);
                return ApiResponse::server_error("质量问题创建失败");
            }
        }
    }

    let locale = Locale::from_headers(&headers).as_sql();
    let returning_cols = issue_select_cols("$10");
    let issue = sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(format!(
        "INSERT INTO qms.qa_quality_issues (tenant_id, issue_no, title, title_en, description, severity, source, related_inspection_id, status, created_by) VALUES ($1, $2, $3, $9, $4, $5, $6, $7, 'open', $8) RETURNING {}",
        returning_cols
    ))).bind(tenant_id).bind(issue_no).bind(req.title).bind(req.description).bind(req.severity).bind(req.source).bind(related_inspection_id).bind(req.created_by).bind(req.title_en.clone()).bind(locale)
    .fetch_one(&mut scope)
    .await;

    match issue {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit issue create: {}", e);
                return ApiResponse::server_error("质量问题创建失败");
            }
            // 事件租户 = 本次写入租户（require_tenant 已保证非空，禁止随机 UUID 兜底）。
            let event_tenant = tenant_id;
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let issue_id_val = Uuid::parse_str(&data.id).unwrap_or_else(|_| Uuid::nil());
                let issue_no_val = data.issue_no.clone();
                let title_val = data.title.clone();
                let desc_val = data.description.clone();
                let sev_val = data.severity.clone();
                let created_by_val = data.created_by.clone();
                let related_id = data
                    .related_inspection_id
                    .clone()
                    .and_then(|s| Uuid::parse_str(&s).ok());
                tokio::spawn(async move {
                    let payload = QmsQualityIssueCreatedPayload {
                        tenant_id: event_tenant,
                        issue_id: issue_id_val,
                        issue_no: issue_no_val,
                        title: title_val,
                        description: desc_val,
                        severity: sev_val,
                        created_by: created_by_val,
                        related_inspection_id: related_id,
                    };
                    let et = EventType::QmsQualityIssueCreated;
                    if let Err(e) = publisher.publish_event(et, &payload).await {
                        tracing::warn!(
                            "[qms] QmsQualityIssueCreated 事件发布失败（graceful fallback）: {}，入重试队列",
                            e
                        );
                        // D6：发布失败入 Redis ZSET，由 main.rs 15s run_relay 重发（typed 通道直重发 payload）。
                        commit_retry::push_retry_typed("qms", et, &payload).await;
                    } else {
                        tracing::info!(
                            "[qms] QmsQualityIssueCreated 事件发布成功 - issue_id={}",
                            issue_id_val
                        );
                    }
                });
            }

            ApiResponse::success(data, "质量问题创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create issue: {}", e);
            ApiResponse::server_error("质量问题创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:read"])),
    path = "/api/qms/issues/{id}",
    tag = "quality_issue",
    params(
        ("id" = String, Path, description = "问题ID"),
    ),
    responses(
        (status = 200, description = "质量问题详情", body = ApiResponse<QualityIssue>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_issue(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<QualityIssue> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取质量问题失败");
        }
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的问题ID"),
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let locale = Locale::from_headers(&headers).as_sql();

    let cols = issue_select_cols("$3");
    let issue = sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(format!(
        "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)",
        cols
    ))).bind(id).bind(tenant_opt).bind(locale)
    .fetch_one(&mut scope)
    .await;

    match issue {
        Ok(data) => ApiResponse::success(data, "获取质量问题成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch issue: {}", e);
            ApiResponse::server_error("获取质量问题失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:write"])),
    path = "/api/qms/issues/{id}",
    tag = "quality_issue",
    request_body = UpdateIssueRequest,
    params(
        ("id" = String, Path, description = "问题ID"),
    ),
    responses(
        (status = 200, description = "质量问题更新成功", body = ApiResponse<QualityIssue>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn update_issue(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateIssueRequest>,
) -> ApiResponse<QualityIssue> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的问题ID"),
    };
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("质量问题更新失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!(
        "qms",
        "UPDATE qms.qa_quality_issues SET title = COALESCE($2, title), description = COALESCE($3, description), severity = COALESCE($4, severity), status = COALESCE($5, status), updated_at = NOW() WHERE id = $1 AND tenant_id = $6 AND deleted_at IS NULL"
    ))
    .bind(id).bind(req.title).bind(req.description).bind(req.severity).bind(req.status).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("记录不存在"),
        Ok(_) => {
            let locale = Locale::from_headers(&headers).as_sql();
            match sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                issue_select_cols("$3")
            ))).bind(id).bind(tenant_id).bind(locale)
            .fetch_one(&mut scope)
            .await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit issue update: {}", e);
                        return ApiResponse::server_error("质量问题更新失败");
                    }
                    ApiResponse::success(data, "质量问题更新成功")
                }
                Err(e) => {
                    tracing::error!("Failed to reload issue: {}", e);
                    ApiResponse::server_error("质量问题更新失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to update issue: {}", e);
            ApiResponse::server_error("质量问题更新失败")
        }
    }
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:write"])),
    path = "/issues/{id}/resolve",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "resolve_issue OK")),
    tag = "quality_issue"
)]

pub async fn resolve_issue(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<QualityIssue> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的问题ID"),
    };
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("质量问题解决失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!(
        "qms",
        "UPDATE qms.qa_quality_issues SET status = 'resolved', resolved_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status <> 'resolved'"
    ))
    .bind(id).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::conflict("质量问题不存在或已解决"),
        Ok(_) => {
            let locale = Locale::from_headers(&headers).as_sql();
            match sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                issue_select_cols("$3")
            ))).bind(id).bind(tenant_id).bind(locale)
            .fetch_one(&mut scope)
            .await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit issue resolve: {}", e);
                        return ApiResponse::server_error("质量问题解决失败");
                    }
                    ApiResponse::success(data, "质量问题已解决")
                }
                Err(e) => {
                    tracing::error!("Failed to reload issue: {}", e);
                    ApiResponse::server_error("质量问题解决失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to resolve issue: {}", e);
            ApiResponse::server_error("质量问题解决失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:write"])),
    path = "/api/qms/issues/{id}",
    tag = "quality_issue",
    params(
        ("id" = String, Path, description = "问题ID"),
    ),
    responses(
        (status = 200, description = "质量问题删除成功", body = ApiResponse<bool>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_issue(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> ApiResponse<bool> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的问题ID"),
    };
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("质量问题删除失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_quality_issues SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("质量问题不存在或已删除"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit issue delete: {}", e);
                return ApiResponse::server_error("质量问题删除失败");
            }
            ApiResponse::success(true, "质量问题删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete issue: {}", e);
            ApiResponse::server_error("质量问题删除失败")
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct StartApprovalRequest {
    pub workflow_id: Uuid,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApprovalActionRequest {
    pub comment: Option<String>,
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:write"])),
    path = "/issues/{id}/approval/start",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "start_issue_approval OK")),
    tag = "quality_issue"
)]

pub async fn start_issue_approval(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<StartApprovalRequest>,
) -> ApiResponse<QualityIssueWithWorkflow> {
    // W-B6a：本批只把租户来源改为 require_tenant。
    // TODO(w-b6a): 异步 workflow 缺租户上下文（create_instance 未透传 tenant_id），
    // 与事件总线同类问题，单独立项处理。
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let issue_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的问题ID"),
    };

    tracing::info!(
        "Starting approval for issue {}: workflow_id={}",
        id,
        req.workflow_id
    );

    let workflow_client = state.workflow_client.clone();
    let id_clone = id.clone();
    tokio::spawn(async move {
        let request = CreateInstanceRequest {
            workflow_id: req.workflow_id,
            title: format!("质量问题审批 - {}", id_clone),
            variables: Some(serde_json::json!({
                "issue_id": id_clone,
            })),
        };
        match workflow_client.create_instance(request).await {
            Ok(instance) => {
                tracing::info!(
                    "[qms] 质量问题审批流程启动成功 - instance_id={}",
                    instance.id
                );
            }
            Err(e) => {
                tracing::warn!("[qms] 质量问题审批流程启动失败: {}", e);
            }
        }
    });

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取质量问题失败");
        }
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let cols = issue_select_cols("$3");
    let issue = sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(format!(
        "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
        cols
    )))
        .bind(issue_id)
        .bind(tenant_id)
        .bind(locale)
        .fetch_one(&mut scope)
        .await;

    match issue {
        Ok(data) => ApiResponse::success(
            QualityIssueWithWorkflow {
                issue: data,
                approval_workflow_id: Some(req.workflow_id.to_string()),
                approval_status: Some("pending".to_string()),
            },
            "质量问题审批流程已启动",
        ),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("质量问题不存在"),
        Err(e) => {
            tracing::error!("Failed to fetch issue: {}", e);
            ApiResponse::server_error("获取质量问题失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:write"])),
    path = "/issues/{id}/approval/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_issue"
)]
pub async fn approve_issue(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(_req): Json<ApprovalActionRequest>,
) -> ApiResponse<QualityIssueWithWorkflow> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let issue_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的问题ID"),
    };

    tracing::info!("Approving issue {}", id);

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("质量问题审批失败");
        }
    };
    let updated = sqlx::query(only_own_schema_query!(
        "qms",
        "UPDATE qms.qa_quality_issues SET status = 'approved', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status IS DISTINCT FROM 'approved'"
    ))
    .bind(issue_id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::conflict("当前状态不允许审批通过"),
        Ok(_) => {
            let locale = Locale::from_headers(&headers).as_sql();
            match sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                issue_select_cols("$3")
            )))
            .bind(issue_id)
            .bind(tenant_id)
            .bind(locale)
            .fetch_one(&mut scope)
            .await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit issue approve: {}", e);
                        return ApiResponse::server_error("质量问题审批失败");
                    }
                    ApiResponse::success(
                        QualityIssueWithWorkflow {
                            issue: data,
                            approval_workflow_id: None,
                            approval_status: Some("approved".to_string()),
                        },
                        "质量问题审批通过",
                    )
                }
                Err(e) => {
                    tracing::error!("Failed to reload issue: {}", e);
                    ApiResponse::server_error("质量问题审批失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to approve issue: {}", e);
            ApiResponse::server_error("质量问题审批失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:write"])),
    path = "/issues/{id}/approval/reject",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_issue"
)]
pub async fn reject_issue(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(_req): Json<ApprovalActionRequest>,
) -> ApiResponse<QualityIssueWithWorkflow> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let issue_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的问题ID"),
    };

    tracing::info!("Rejecting issue {}", id);

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("质量问题审批驳回失败");
        }
    };
    let updated = sqlx::query(only_own_schema_query!(
        "qms",
        "UPDATE qms.qa_quality_issues SET status = 'rejected', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status IS DISTINCT FROM 'rejected'"
    ))
    .bind(issue_id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::conflict("当前状态不允许驳回"),
        Ok(_) => {
            let locale = Locale::from_headers(&headers).as_sql();
            match sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                issue_select_cols("$3")
            )))
            .bind(issue_id)
            .bind(tenant_id)
            .bind(locale)
            .fetch_one(&mut scope)
            .await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit issue reject: {}", e);
                        return ApiResponse::server_error("质量问题审批驳回失败");
                    }
                    ApiResponse::success(
                        QualityIssueWithWorkflow {
                            issue: data,
                            approval_workflow_id: None,
                            approval_status: Some("rejected".to_string()),
                        },
                        "质量问题审批已驳回",
                    )
                }
                Err(e) => {
                    tracing::error!("Failed to reload issue: {}", e);
                    ApiResponse::server_error("质量问题审批驳回失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to reject issue: {}", e);
            ApiResponse::server_error("质量问题审批驳回失败")
        }
    }
}

/// APV-2 审批请求体
#[derive(Debug, serde::Deserialize)]
pub struct IssueApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

/// 生成 SELECT/RETURNING 列清单，title 按 locale 占位符做双语切换。
/// locale_placeholder 形如 "$3"，由调用方按当前 SQL 的参数序号决定。
fn issue_select_cols(locale_placeholder: &str) -> String {
    format!(
        r#"id::TEXT, tenant_id::TEXT, issue_no, CASE WHEN {p} = 'en' THEN COALESCE(title_en, title) ELSE title END AS title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at, resolved_at, updated_at"#,
        p = locale_placeholder
    )
}

/// APV-2: 审批通过 (resolved → closed, requires_approval)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:write"])),
    path = "/issues/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_issue"
)]
pub async fn approve_issue_status(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<IssueApprovalRequest>,
) -> ApiResponse<QualityIssue> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的问题ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("审批失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_id).fetch_one(&mut scope).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if issue_requires_approval(&current_status, STATUS_CLOSED)
                && !crate::shared::permission::has_qms_permission(&claims, "issue.approve")
            {
                return ApiResponse::forbidden("无审批权限");
            }
            if issue_can_transition(&current_status, STATUS_CLOSED).is_err() {
                return ApiResponse::bad_request("当前状态不允许审批通过");
            }
            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                "UPDATE qms.qa_quality_issues SET status = $3, resolved_at = COALESCE(resolved_at, NOW()), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = $4"
            ))
            .bind(id).bind(tenant_id).bind(STATUS_CLOSED).bind(&current_status)
            .execute(&mut scope).await;
            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    // 审批事件与主表同事务：写失败整体回滚 500，禁止"主表 200、事件缺失"。
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "issue",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        STATUS_CLOSED,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("Failed to log approval event: {}", e);
                        return ApiResponse::server_error("审批失败");
                    }
                    let locale = Locale::from_headers(&headers).as_sql();
                    match sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                        issue_select_cols("$3")
                    )))
                    .bind(id).bind(tenant_id).bind(locale).fetch_one(&mut scope).await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit issue approve: {}", e);
                                return ApiResponse::server_error("审批失败");
                            }
                            ApiResponse::success(data, "审批通过")
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload issue: {}", e);
                            ApiResponse::server_error("审批失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to approve issue: {}", e);
                    ApiResponse::server_error("审批失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find issue: {}", e);
            ApiResponse::not_found("质量问题不存在")
        }
    }
}

/// APV-2: 审批驳回 (resolved → in_progress)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:write"])),
    path = "/issues/{id}/reject",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_issue"
)]
pub async fn reject_issue_status(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<IssueApprovalRequest>,
) -> ApiResponse<QualityIssue> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的问题ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("驳回失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_id).fetch_one(&mut scope).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if issue_can_transition(&current_status, STATUS_IN_PROGRESS).is_err() {
                return ApiResponse::bad_request("当前状态不允许驳回");
            }
            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                "UPDATE qms.qa_quality_issues SET status = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = $4"
            ))
            .bind(id).bind(tenant_id).bind(STATUS_IN_PROGRESS).bind(&current_status)
            .execute(&mut scope).await;
            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "issue",
                        &id.to_string(),
                        "reject",
                        &req.operator,
                        &current_status,
                        STATUS_IN_PROGRESS,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("Failed to log approval event: {}", e);
                        return ApiResponse::server_error("驳回失败");
                    }
                    let locale = Locale::from_headers(&headers).as_sql();
                    match sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                        issue_select_cols("$3")
                    )))
                    .bind(id).bind(tenant_id).bind(locale).fetch_one(&mut scope).await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit issue reject: {}", e);
                                return ApiResponse::server_error("驳回失败");
                            }
                            ApiResponse::success(data, "审批驳回")
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload issue: {}", e);
                            ApiResponse::server_error("驳回失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to reject issue: {}", e);
                    ApiResponse::server_error("驳回失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find issue: {}", e);
            ApiResponse::not_found("质量问题不存在")
        }
    }
}

/// APV-2: 取消 (open/in_progress → cancelled)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:write"])),
    path = "/issues/{id}/cancel",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_issue"
)]
pub async fn cancel_issue(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<IssueApprovalRequest>,
) -> ApiResponse<QualityIssue> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的问题ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("取消失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_id).fetch_one(&mut scope).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if issue_can_transition(&current_status, STATUS_CANCELLED).is_err() {
                return ApiResponse::bad_request("当前状态不允许取消");
            }
            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                "UPDATE qms.qa_quality_issues SET status = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = $4"
            ))
            .bind(id).bind(tenant_id).bind(STATUS_CANCELLED).bind(&current_status)
            .execute(&mut scope).await;
            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "issue",
                        &id.to_string(),
                        "cancel",
                        &req.operator,
                        &current_status,
                        STATUS_CANCELLED,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("Failed to log approval event: {}", e);
                        return ApiResponse::server_error("取消失败");
                    }
                    let locale = Locale::from_headers(&headers).as_sql();
                    match sqlx::query_as::<_, QualityIssue>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                        issue_select_cols("$3")
                    )))
                    .bind(id).bind(tenant_id).bind(locale).fetch_one(&mut scope).await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit issue cancel: {}", e);
                                return ApiResponse::server_error("取消失败");
                            }
                            ApiResponse::success(data, "质量问题已取消")
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload issue: {}", e);
                            ApiResponse::server_error("取消失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to cancel issue: {}", e);
                    ApiResponse::server_error("取消失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find issue: {}", e);
            ApiResponse::not_found("质量问题不存在")
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/issues", get(list_issues))
        .route("/issues", post(create_issue))
        .route("/issues/{id}", get(get_issue))
        .route("/issues/{id}", put(update_issue))
        .route("/issues/{id}", delete(delete_issue))
        .route("/issues/{id}/resolve", post(resolve_issue))
        .route("/issues/{id}/approval/start", post(start_issue_approval))
        .route("/issues/{id}/approval/approve", post(approve_issue))
        .route("/issues/{id}/approval/reject", post(reject_issue))
        .route("/issues/{id}/approve", post(approve_issue_status))
        .route("/issues/{id}/reject", post(reject_issue_status))
        .route("/issues/{id}/cancel", post(cancel_issue))
}
