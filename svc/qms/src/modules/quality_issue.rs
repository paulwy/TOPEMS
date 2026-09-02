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
use topems_shared_auth::get_tenant_id;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_event::event::EventType;
use topems_shared_event::event::QmsQualityIssueCreatedPayload;

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
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<IssueQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<QualityIssue>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;
    let tenant_id = get_tenant_id(&claims, &headers);

    let issues = match (query.status.as_ref(), query.severity.as_ref()) {
        (Some(st), Some(sv)) => sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND tenant_id = $1 AND status = $2 AND severity = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)).bind(tenant_id).bind(st).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(st), None) => sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_id).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(sv)) => sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND tenant_id = $1 AND severity = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_id).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None) => sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(tenant_id).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match issues {
        Ok(data) => Json(ApiResponse::success(data, "获取质量问题列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch issues: {}", e);
            Json(ApiResponse::error(500, "获取质量问题列表失败"))
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateIssueRequest>,
) -> Json<ApiResponse<QualityIssue>> {
    let issue_no = format!(
        "QI-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let tenant_id = get_tenant_id(&claims, &headers);

    let related_inspection_id = req
        .related_inspection_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let issue = sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_quality_issues (tenant_id, issue_no, title, description, severity, source, related_inspection_id, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8) RETURNING id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT"#)).bind(tenant_id).bind(issue_no).bind(req.title).bind(req.description).bind(req.severity).bind(req.source).bind(related_inspection_id).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match issue {
        Ok(data) => {
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
                        issue_id: issue_id_val,
                        issue_no: issue_no_val,
                        title: title_val,
                        description: desc_val,
                        severity: sev_val,
                        created_by: created_by_val,
                        related_inspection_id: related_id,
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::QmsQualityIssueCreated, payload)
                        .await
                    {
                        tracing::warn!(
                            "[qms] QmsQualityIssueCreated 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[qms] QmsQualityIssueCreated 事件发布成功 - issue_id={}",
                            issue_id_val
                        );
                    }
                });
            }

            Json(ApiResponse::success(data, "质量问题创建成功"))
        }
        Err(e) => {
            tracing::error!("Failed to create issue: {}", e);
            Json(ApiResponse::error(500, "质量问题创建失败"))
        }
    }
}

pub async fn get_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<QualityIssue>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let issue = sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#)).bind(id).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match issue {
        Ok(data) => Json(ApiResponse::success(data, "获取质量问题成功")),
        Err(e) => {
            tracing::error!("Failed to fetch issue: {}", e);
            Json(ApiResponse::error(500, "获取质量问题失败"))
        }
    }
}

pub async fn update_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateIssueRequest>,
) -> Json<ApiResponse<QualityIssue>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let issue = sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"UPDATE qms.qa_quality_issues SET title = COALESCE($2, title), description = COALESCE($3, description), severity = COALESCE($4, severity), status = COALESCE($5, status), updated_at = NOW() WHERE id = $1 AND tenant_id = $6 RETURNING id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT"#)).bind(id).bind(req.title).bind(req.description).bind(req.severity).bind(req.status).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match issue {
        Ok(data) => Json(ApiResponse::success(data, "质量问题更新成功")),
        Err(e) => {
            tracing::error!("Failed to update issue: {}", e);
            Json(ApiResponse::error(500, "质量问题更新失败"))
        }
    }
}

pub async fn resolve_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<QualityIssue>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let issue = sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"UPDATE qms.qa_quality_issues SET status = 'resolved', resolved_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT"#)).bind(id).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match issue {
        Ok(data) => Json(ApiResponse::success(data, "质量问题已解决")),
        Err(e) => {
            tracing::error!("Failed to resolve issue: {}", e);
            Json(ApiResponse::error(500, "质量问题解决失败"))
        }
    }
}

pub async fn delete_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_quality_issues SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "质量问题删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete issue: {}", e);
            Json(ApiResponse::error(500, "质量问题删除失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct StartApprovalRequest {
    pub workflow_id: Uuid,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApprovalActionRequest {
    pub comment: Option<String>,
}

pub async fn start_issue_approval(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(req): Json<StartApprovalRequest>,
) -> Json<ApiResponse<QualityIssueWithWorkflow>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let issue_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
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

    let issue = sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"SELECT id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#))
        .bind(issue_id)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await;

    match issue {
        Ok(data) => Json(ApiResponse::success(
            QualityIssueWithWorkflow {
                issue: data,
                approval_workflow_id: Some(req.workflow_id.to_string()),
                approval_status: Some("pending".to_string()),
            },
            "质量问题审批流程已启动",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch issue: {}", e);
            Json(ApiResponse::error(500, "获取质量问题失败"))
        }
    }
}

pub async fn approve_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(_req): Json<ApprovalActionRequest>,
) -> Json<ApiResponse<QualityIssueWithWorkflow>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let issue_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };

    tracing::info!("Approving issue {}", id);

    let result = sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"UPDATE qms.qa_quality_issues SET status = 'approved', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT"#))
        .bind(issue_id)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await;

    match result {
        Ok(data) => Json(ApiResponse::success(
            QualityIssueWithWorkflow {
                issue: data,
                approval_workflow_id: None,
                approval_status: Some("approved".to_string()),
            },
            "质量问题审批通过",
        )),
        Err(e) => {
            tracing::error!("Failed to approve issue: {}", e);
            Json(ApiResponse::error(500, "质量问题审批失败"))
        }
    }
}

pub async fn reject_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
    Json(_req): Json<ApprovalActionRequest>,
) -> Json<ApiResponse<QualityIssueWithWorkflow>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let issue_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };

    tracing::info!("Rejecting issue {}", id);

    let result = sqlx::query_as::<_, QualityIssue>(only_own_schema_query!("qms", r#"UPDATE qms.qa_quality_issues SET status = 'rejected', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT"#))
        .bind(issue_id)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await;

    match result {
        Ok(data) => Json(ApiResponse::success(
            QualityIssueWithWorkflow {
                issue: data,
                approval_workflow_id: None,
                approval_status: Some("rejected".to_string()),
            },
            "质量问题审批已驳回",
        )),
        Err(e) => {
            tracing::error!("Failed to reject issue: {}", e);
            Json(ApiResponse::error(500, "质量问题审批驳回失败"))
        }
    }
}

/// APV-2 审批请求体
#[derive(Debug, serde::Deserialize)]
pub struct IssueApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

const ISSUE_SELECT_COLS: &str = r#"id, tenant_id::TEXT, issue_no, title, description, severity, status, source, related_inspection_id::TEXT, created_by, created_at::TEXT, resolved_at::TEXT, updated_at::TEXT"#;

/// APV-2: 审批通过 (resolved → closed, requires_approval)
pub async fn approve_issue_status(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<IssueApprovalRequest>,
) -> Json<ApiResponse<QualityIssue>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_id).fetch_one(&state.pool).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if issue_requires_approval(&current_status, STATUS_CLOSED)
                && !crate::shared::permission::has_qms_permission(&claims, "issue.approve")
            {
                return Json(ApiResponse::error(403, "无审批权限"));
            }
            if issue_can_transition(&current_status, STATUS_CLOSED).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许审批通过"));
            }
            let issue = sqlx::query_as::<_, QualityIssue>(
                format!("UPDATE qms.qa_quality_issues SET status = '{}', resolved_at = COALESCE(resolved_at, NOW()), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING {}", STATUS_CLOSED, ISSUE_SELECT_COLS).as_str()
            ).bind(id).bind(tenant_id).fetch_one(&state.pool).await;
            match issue {
                Ok(data) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_id.to_string(),
                        "issue",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        STATUS_CLOSED,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "审批通过"))
                }
                Err(e) => {
                    tracing::error!("Failed to approve issue: {}", e);
                    Json(ApiResponse::error(500, "审批失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find issue: {}", e);
            Json(ApiResponse::error(404, "质量问题不存在"))
        }
    }
}

/// APV-2: 审批驳回 (resolved → in_progress)
pub async fn reject_issue_status(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<IssueApprovalRequest>,
) -> Json<ApiResponse<QualityIssue>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_id).fetch_one(&state.pool).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if issue_can_transition(&current_status, STATUS_IN_PROGRESS).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许驳回"));
            }
            let issue = sqlx::query_as::<_, QualityIssue>(
                format!("UPDATE qms.qa_quality_issues SET status = '{}', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING {}", STATUS_IN_PROGRESS, ISSUE_SELECT_COLS).as_str()
            ).bind(id).bind(tenant_id).fetch_one(&state.pool).await;
            match issue {
                Ok(data) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_id.to_string(),
                        "issue",
                        &id.to_string(),
                        "reject",
                        &req.operator,
                        &current_status,
                        STATUS_IN_PROGRESS,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "审批驳回"))
                }
                Err(e) => {
                    tracing::error!("Failed to reject issue: {}", e);
                    Json(ApiResponse::error(500, "驳回失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find issue: {}", e);
            Json(ApiResponse::error(404, "质量问题不存在"))
        }
    }
}

/// APV-2: 取消 (open/in_progress → cancelled)
pub async fn cancel_issue(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<IssueApprovalRequest>,
) -> Json<ApiResponse<QualityIssue>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_quality_issues WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_id).fetch_one(&state.pool).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if issue_can_transition(&current_status, STATUS_CANCELLED).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许取消"));
            }
            let issue = sqlx::query_as::<_, QualityIssue>(
                format!("UPDATE qms.qa_quality_issues SET status = '{}', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING {}", STATUS_CANCELLED, ISSUE_SELECT_COLS).as_str()
            ).bind(id).bind(tenant_id).fetch_one(&state.pool).await;
            match issue {
                Ok(data) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_id.to_string(),
                        "issue",
                        &id.to_string(),
                        "cancel",
                        &req.operator,
                        &current_status,
                        STATUS_CANCELLED,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "质量问题已取消"))
                }
                Err(e) => {
                    tracing::error!("Failed to cancel issue: {}", e);
                    Json(ApiResponse::error(500, "取消失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find issue: {}", e);
            Json(ApiResponse::error(404, "质量问题不存在"))
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
