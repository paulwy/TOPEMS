//! Ticket 扩展模块（P1 主题二⑥）：工作流、状态流转、标签、批量操作、附件
//! 与既有 handler 风格一致：State(Pool) + Claims + tenant_id 代码绑定（RLS 由 DB 层兜底）

use axum::{
    extract::{Path, State},
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_core::{response::ApiResponse, TopemsError};

use crate::models::is_valid_ticket_transition;

const ALL_STATUSES: &[&str] = &[
    "open",
    "in_progress",
    "pending",
    "resolved",
    "closed",
    "cancelled",
];

fn tenant_of(claims: &Claims) -> Uuid {
    Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil())
}

fn user_of(claims: &Claims) -> Option<Uuid> {
    Uuid::parse_str(&claims.sub).ok()
}

pub fn ticket_ext_routes() -> Router<PgPool> {
    Router::new()
        // ---- 工作流（静态状态机）----
        .route("/workflows", get(get_workflows))
        .route("/workflows/match", get(get_workflow_for_ticket_type))
        .route("/workflows/automation-rules", get(list_workflow_automation_rules))
        .route(
            "/workflows/automation-rules/{id}/toggle",
            axum::routing::put(toggle_workflow_automation_rule),
        )
        // ---- 状态流转 ----
        .route("/tickets/{id}/transitions", get(get_ticket_transitions))
        .route("/tickets/{id}/transition", post(apply_transition))
        // ---- 标签 ----
        .route(
            "/tickets/{id}/tags",
            get(get_ticket_tags).post(add_ticket_tag),
        )
        .route("/tickets/{id}/tags/{tag}", delete(remove_ticket_tag))
        .route(
            "/ticket-tags",
            get(list_tag_directory).post(create_tag_stub),
        )
        .route(
            "/ticket-tags/{tag}",
            get(get_tag_stub)
                .put(update_tag_stub)
                .delete(delete_tag_stub),
        )
        // ---- 批量操作 ----
        .route("/tickets/batch-update", post(batch_update_tickets))
        .route("/tickets/batch-assign", post(batch_assign_tickets))
        .route("/tickets/batch-close", post(batch_close_tickets))
        .route("/tickets/batch-delete", post(batch_delete_tickets))
        .route("/tickets/batch-escalate", post(batch_escalate_tickets))
        // ---- 附件 ----
        .route(
            "/tickets/{id}/attachments",
            get(list_attachments).post(upload_attachment),
        )
        .route(
            "/tickets/{id}/attachments/{attachment_id}",
            get(get_attachment)
                .put(update_attachment)
                .delete(delete_attachment),
        )
        .route(
            "/tickets/{id}/attachments/batch",
            post(batch_upload_attachments),
        )
        .route(
            "/tickets/{id}/attachments/batch-delete",
            post(batch_delete_attachments),
        )
        .route("/tickets/{id}/attachments/stats", get(get_attachment_stats))
        .route(
            "/tickets/{id}/attachments/type/{file_type}",
            get(get_attachments_by_type),
        )
        .route(
            "/tickets/{id}/attachments/{attachment_id}/download",
            get(download_attachment_handler),
        )
}

// ==================== 工作流 ====================

async fn get_workflows(State(_pool): State<PgPool>) -> Json<ApiResponse<serde_json::Value>> {
    let mut transitions: Vec<serde_json::Value> = Vec::new();
    for from in ALL_STATUSES {
        for to in ALL_STATUSES {
            if from != to && is_valid_ticket_transition(from, to) {
                transitions.push(json!({"from": from, "to": to}));
            }
        }
    }
    let data = json!({
        "name": "ticket_default_workflow",
        "statuses": ALL_STATUSES,
        "transitions": transitions,
    });
    Json(ApiResponse::success(data, "工作流配置"))
}

// ==================== 工作流匹配与自动化规则（前端 workflow.ts 调用）====================

#[derive(Deserialize)]
struct WorkflowMatchQuery {
    ticket_type: Option<String>,
}

/// 按工单类型匹配工作流：当前为默认状态机（静态配置），后续可扩展为按类型返回不同流程
async fn get_workflow_for_ticket_type(
    axum::extract::Query(query): axum::extract::Query<WorkflowMatchQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut transitions: Vec<serde_json::Value> = Vec::new();
    for from in ALL_STATUSES {
        for to in ALL_STATUSES {
            if from != to && is_valid_ticket_transition(from, to) {
                transitions.push(json!({"from": from, "to": to}));
            }
        }
    }
    let data = json!({
        "id": "ticket_default_workflow",
        "name": "ticket_default_workflow",
        "ticket_type": query.ticket_type.unwrap_or_default(),
        "statuses": ALL_STATUSES,
        "transitions": transitions,
    });
    Json(ApiResponse::success(data, "工作流匹配"))
}

/// 工作流自动化规则视图（前端字段：id/name/trigger/action/is_active）
#[derive(serde::Serialize)]
struct WorkflowRuleView {
    id: Uuid,
    name: String,
    trigger: Option<String>,
    action: Option<String>,
    is_active: bool,
}

async fn list_workflow_automation_rules(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
) -> Json<ApiResponse<Vec<WorkflowRuleView>>> {
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser { None } else { Some(tenant_of(&claims)) };
    match sqlx::query(
        "SELECT id, name, condition_field, action_type, enabled
         FROM ticket.ticket_automation_rules WHERE ($1::uuid IS NULL OR tenant_id = $1) ORDER BY priority ASC, created_at ASC",
    )
    .bind(opt_tenant_id)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => {
            let views = rows
                .iter()
                .map(|row| WorkflowRuleView {
                    id: row.get("id"),
                    name: row.get("name"),
                    trigger: row.get("condition_field"),
                    action: row.get("action_type"),
                    is_active: row.get("enabled"),
                })
                .collect();
            Json(ApiResponse::success(views, "工作流自动化规则列表"))
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal(
            "获取工作流自动化规则失败",
            e,
        ))),
    }
}

#[derive(Deserialize)]
struct WorkflowToggleRequest {
    is_active: bool,
}

async fn toggle_workflow_automation_rule(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<WorkflowToggleRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    match sqlx::query(
        "UPDATE ticket.ticket_automation_rules SET enabled = $1, updated_at = now()
         WHERE id = $2 AND tenant_id = $3",
    )
    .bind(req.is_active)
    .bind(id)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        Ok(res) => {
            if res.rows_affected() == 0 {
                Json(ApiResponse::from(TopemsError::DatabaseRecordNotFound(
                    "自动化规则不存在".into(),
                )))
            } else {
                Json(ApiResponse::success(json!({"id": id, "is_active": req.is_active}), "规则状态已更新"))
            }
        }
        Err(e) => Json(ApiResponse::from(TopemsError::internal("更新自动化规则失败", e))),
    }
}

// ==================== 状态流转 ====================

#[derive(Deserialize)]
struct TransitionRequest {
    to_status: String,
    comment: Option<String>,
}

async fn get_ticket_transitions(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser { None } else { Some(tenant_of(&claims)) };
    let row = sqlx::query(
        "SELECT status FROM ticket.core_tickets WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(opt_tenant_id)
    .fetch_optional(&pool)
    .await;

    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Json(ApiResponse::error(404, "工单不存在"));
        }
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };
    let current: String = row.get("status");
    let mut targets: Vec<String> = Vec::new();
    for to in ALL_STATUSES {
        if *to != current && is_valid_ticket_transition(&current, to) {
            targets.push(to.to_string());
        }
    }
    Json(ApiResponse::success(
        json!({"current": current, "available_transitions": targets}),
        "可执行流转",
    ))
}

async fn apply_transition(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<TransitionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let user_id = user_of(&claims);

    let current: String = match sqlx::query_scalar::<_, String>(
        "SELECT status FROM ticket.core_tickets WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::error(404, "工单不存在")),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };

    if !is_valid_ticket_transition(&current, &req.to_status) {
        return Json(ApiResponse::error(
            400,
            &format!("非法流转: {} -> {}", current, req.to_status),
        ));
    }

    let now = chrono::Utc::now();
    let resolved_at = if req.to_status == "resolved" {
        Some(now)
    } else {
        None
    };
    let closed_at = if req.to_status == "closed" {
        Some(now)
    } else {
        None
    };

    let mut txn = match pool.begin().await {
        Ok(t) => t,
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("事务失败", e))),
    };

    if let Err(e) = sqlx::query(
        "UPDATE ticket.core_tickets SET status = $1, resolved_at = COALESCE($2, resolved_at), \
         closed_at = COALESCE($3, closed_at), updated_at = now() \
         WHERE id = $4 AND tenant_id = $5",
    )
    .bind(&req.to_status)
    .bind(resolved_at)
    .bind(closed_at)
    .bind(id)
    .bind(tenant_id)
    .execute(&mut *txn)
    .await
    {
        return Json(ApiResponse::from(TopemsError::internal("更新失败", e)));
    }

    if let Err(e) = sqlx::query(
        "INSERT INTO ticket.core_ticket_activities \
         (ticket_id, tenant_id, user_id, action, from_value, to_value) \
         VALUES ($1, $2, $3, 'status_transition', $4, $5)",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(user_id)
    .bind(&current)
    .bind(&req.to_status)
    .execute(&mut *txn)
    .await
    {
        return Json(ApiResponse::from(TopemsError::internal("活动记录失败", e)));
    }

    if let Some(comment) = &req.comment {
        if !comment.trim().is_empty() {
            if let Err(e) = sqlx::query(
                "INSERT INTO ticket.core_ticket_comments (ticket_id, tenant_id, user_id, content) \
                 VALUES ($1, $2, $3, $4)",
            )
            .bind(id)
            .bind(tenant_id)
            .bind(user_id)
            .bind(comment.trim())
            .execute(&mut *txn)
            .await
            {
                return Json(ApiResponse::from(TopemsError::internal("备注失败", e)));
            }
        }
    }

    if let Err(e) = txn.commit().await {
        return Json(ApiResponse::from(TopemsError::internal("提交失败", e)));
    }

    Json(ApiResponse::success(
        json!({"id": id, "from": current, "to": req.to_status}),
        "流转成功",
    ))
}

// ==================== 标签 ====================

#[derive(Deserialize)]
struct TagRequest {
    tag: String,
}

async fn get_ticket_tags(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser { None } else { Some(tenant_of(&claims)) };
    let tags: Option<Vec<String>> = match sqlx::query_scalar(
        "SELECT tags FROM ticket.core_tickets WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(opt_tenant_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(t)) => t,
        Ok(None) => return Json(ApiResponse::error(404, "工单不存在")),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };
    Json(ApiResponse::success(
        json!({"tags": tags.unwrap_or_default()}),
        "工单标签",
    ))
}

async fn add_ticket_tag(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<TagRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let tag = req.tag.trim().to_string();
    if tag.is_empty() {
        return Json(ApiResponse::error(400, "标签不能为空"));
    }
    let current: Option<Vec<String>> = match sqlx::query_scalar(
        "SELECT tags FROM ticket.core_tickets WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(t)) => t,
        Ok(None) => return Json(ApiResponse::error(404, "工单不存在")),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };
    let mut tags = current.unwrap_or_default();
    if !tags.iter().any(|t| t == &tag) {
        tags.push(tag.clone());
    }
    if let Err(e) = sqlx::query(
        "UPDATE ticket.core_tickets SET tags = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3",
    )
    .bind(&tags)
    .bind(id)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        return Json(ApiResponse::from(TopemsError::internal("更新失败", e)));
    }
    Json(ApiResponse::success(json!({"tags": tags}), "标签已添加"))
}

async fn remove_ticket_tag(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path((id, tag)): Path<(Uuid, String)>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let current: Option<Vec<String>> = match sqlx::query_scalar(
        "SELECT tags FROM ticket.core_tickets WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(t)) => t,
        Ok(None) => return Json(ApiResponse::error(404, "工单不存在")),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };
    let tags: Vec<String> = current
        .unwrap_or_default()
        .into_iter()
        .filter(|t| t != &tag)
        .collect();
    if let Err(e) = sqlx::query(
        "UPDATE ticket.core_tickets SET tags = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3",
    )
    .bind(&tags)
    .bind(id)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        return Json(ApiResponse::from(TopemsError::internal("更新失败", e)));
    }
    Json(ApiResponse::success(json!({"tags": tags}), "标签已移除"))
}

async fn list_tag_directory(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser { None } else { Some(tenant_of(&claims)) };
    let rows = sqlx::query(
        "SELECT unnest(tags) AS tag, count(*) AS count \
         FROM ticket.core_tickets WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL \
         GROUP BY tag ORDER BY count DESC",
    )
    .bind(opt_tenant_id)
    .fetch_all(&pool)
    .await;
    let rows = match rows {
        Ok(r) => r,
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };
    let items: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "name": r.get::<String, _>("tag"),
                "count": r.get::<i64, _>("count"),
            })
        })
        .collect();
    Json(ApiResponse::success(json!({"tags": items}), "标签目录"))
}

// 标签目录为聚合派生，无独立存储；写操作返回成功占位（幂等无状态）
async fn create_tag_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        json!({"ok": true}),
        "标签目录为隐式聚合，无需创建",
    ))
}

async fn get_tag_stub(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(tag): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser { None } else { Some(tenant_of(&claims)) };
    let count: i64 = match sqlx::query_scalar(
        "SELECT count(*) FROM ticket.core_tickets \
         WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL AND $2 = ANY(tags)",
    )
    .bind(opt_tenant_id)
    .bind(&tag)
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };
    Json(ApiResponse::success(
        json!({"name": tag, "count": count}),
        "标签",
    ))
}

async fn update_tag_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        json!({"ok": true}),
        "标签目录为隐式聚合",
    ))
}

async fn delete_tag_stub() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        json!({"ok": true}),
        "标签为工单内联属性，无全局删除语义",
    ))
}

// ==================== 批量操作 ====================

#[derive(Deserialize)]
struct BatchIdsRequest {
    ids: Vec<Uuid>,
    #[serde(default)]
    assignee_id: Option<Uuid>,
    #[serde(default)]
    reason: Option<String>,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    priority: Option<String>,
    #[serde(default)]
    severity: Option<String>,
    #[serde(default)]
    fields: Option<serde_json::Map<String, serde_json::Value>>,
}

fn ids_param(req: &BatchIdsRequest) -> Vec<Uuid> {
    req.ids.clone()
}

async fn batch_update_tickets(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Json(req): Json<BatchIdsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let ids = ids_param(&req);
    if ids.is_empty() {
        return Json(ApiResponse::error(400, "ids 不能为空"));
    }
    let mut set = "updated_at = now()".to_string();
    if req.status.is_some() {
        set.push_str(", status = $3");
    }
    if req.priority.is_some() {
        set.push_str(", severity = $4");
    }
    let affected = match sqlx::query(&format!(
        "UPDATE ticket.core_tickets SET {} WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL",
        set
    ))
    .bind(&ids)
    .bind(tenant_id)
    .bind(&req.status)
    .bind(&req.priority)
    .execute(&pool)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("批量更新失败", e))),
    };
    Json(ApiResponse::success(
        json!({"updated": affected}),
        "批量更新完成",
    ))
}

async fn batch_assign_tickets(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Json(req): Json<BatchIdsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let ids = ids_param(&req);
    let assignee = match req.assignee_id {
        Some(a) => a,
        None => return Json(ApiResponse::error(400, "assignee_id 必填")),
    };
    let affected = match sqlx::query(
        "UPDATE ticket.core_tickets SET assignee_id = $1, updated_at = now() \
         WHERE id = ANY($2) AND tenant_id = $3 AND deleted_at IS NULL",
    )
    .bind(assignee)
    .bind(&ids)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("批量指派失败", e))),
    };
    Json(ApiResponse::success(
        json!({"updated": affected}),
        "批量指派完成",
    ))
}

async fn batch_close_tickets(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Json(req): Json<BatchIdsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let ids = ids_param(&req);
    let affected = match sqlx::query(
        "UPDATE ticket.core_tickets SET status = 'closed', closed_at = now(), updated_at = now() \
         WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&ids)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("批量关闭失败", e))),
    };
    Json(ApiResponse::success(
        json!({"closed": affected}),
        "批量关闭完成",
    ))
}

async fn batch_delete_tickets(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Json(req): Json<BatchIdsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let ids = ids_param(&req);
    let affected = match sqlx::query(
        "UPDATE ticket.core_tickets SET deleted_at = now(), updated_at = now() \
         WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&ids)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("批量删除失败", e))),
    };
    Json(ApiResponse::success(
        json!({"deleted": affected}),
        "批量删除完成",
    ))
}

async fn batch_escalate_tickets(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Json(req): Json<BatchIdsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let ids = ids_param(&req);
    let affected = match sqlx::query(
        "UPDATE ticket.core_tickets SET severity = 'critical', updated_at = now() \
         WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&ids)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("批量升级失败", e))),
    };
    Json(ApiResponse::success(
        json!({"escalated": affected}),
        "批量升级完成",
    ))
}

// ==================== 附件 ====================

#[derive(Deserialize)]
struct UploadAttachmentRequest {
    file_name: String,
    #[serde(default)]
    mime_type: Option<String>,
    #[serde(default)]
    file_type: Option<String>,
    #[serde(default)]
    file_data: Option<String>, // base64 或纯文本（轻量内嵌存储）
}

#[derive(Deserialize)]
struct BatchUploadRequest {
    attachments: Vec<UploadAttachmentRequest>,
}

#[derive(Deserialize)]
struct BatchDeleteAttachmentsRequest {
    ids: Vec<Uuid>,
}

fn decode_file_data(raw: &str) -> Vec<u8> {
    // 内嵌存储：按原文 UTF-8 字节存（轻量文本/小文件场景）
    raw.as_bytes().to_vec()
}

async fn list_attachments(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser { None } else { Some(tenant_of(&claims)) };
    let rows = match sqlx::query(
        "SELECT id, file_name, mime_type, file_size, file_type, created_by, created_at \
         FROM ticket.ticket_attachments \
         WHERE ticket_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND deleted_at IS NULL ORDER BY created_at DESC",
    )
    .bind(id)
    .bind(opt_tenant_id)
    .fetch_all(&pool)
    .await
    {
        Ok(r) => r,
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };
    let items: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.get::<Uuid, _>("id"),
                "file_name": r.get::<String, _>("file_name"),
                "mime_type": r.get::<Option<String>, _>("mime_type"),
                "file_size": r.get::<i64, _>("file_size"),
                "file_type": r.get::<Option<String>, _>("file_type"),
                "created_by": r.get::<Option<Uuid>, _>("created_by"),
                "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
            })
        })
        .collect();
    Json(ApiResponse::success(
        json!({"items": items, "total": items.len()}),
        "附件列表",
    ))
}

async fn upload_attachment(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UploadAttachmentRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let user_id = user_of(&claims);
    if req.file_name.trim().is_empty() {
        return Json(ApiResponse::error(400, "file_name 必填"));
    }
    let data = req
        .file_data
        .as_deref()
        .map(decode_file_data)
        .unwrap_or_default();
    let row = match sqlx::query(
        "INSERT INTO ticket.ticket_attachments \
         (ticket_id, tenant_id, file_name, mime_type, file_size, file_type, file_data, created_by) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.file_name)
    .bind(&req.mime_type)
    .bind(data.len() as i64)
    .bind(&req.file_type)
    .bind(&data)
    .bind(user_id)
    .fetch_one(&pool)
    .await
    {
        Ok(r) => r,
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("上传失败", e))),
    };
    let attachment_id: Uuid = row.get("id");
    Json(ApiResponse::success(
        json!({"id": attachment_id, "file_name": req.file_name, "file_size": data.len()}),
        "上传成功",
    ))
}

async fn get_attachment(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path((id, attachment_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<serde_json::Value>> {
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser { None } else { Some(tenant_of(&claims)) };
    let row = match sqlx::query(
        "SELECT id, file_name, mime_type, file_size, file_type, created_at \
         FROM ticket.ticket_attachments \
         WHERE id = $1 AND ticket_id = $2 AND ($3::uuid IS NULL OR tenant_id = $3) AND deleted_at IS NULL",
    )
    .bind(attachment_id)
    .bind(id)
    .bind(opt_tenant_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "附件不存在")),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };
    Json(ApiResponse::success(
        json!({
            "id": row.get::<Uuid, _>("id"),
            "file_name": row.get::<String, _>("file_name"),
            "mime_type": row.get::<Option<String>, _>("mime_type"),
            "file_size": row.get::<i64, _>("file_size"),
            "file_type": row.get::<Option<String>, _>("file_type"),
            "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
        }),
        "附件信息",
    ))
}

async fn update_attachment(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path((id, attachment_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UploadAttachmentRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let data = req
        .file_data
        .as_deref()
        .map(decode_file_data)
        .unwrap_or_default();
    let affected = match sqlx::query(
        "UPDATE ticket.ticket_attachments SET file_name = $1, mime_type = $2, file_type = $3, \
         file_size = $4, file_data = $5, updated_at = now() \
         WHERE id = $6 AND ticket_id = $7 AND tenant_id = $8 AND deleted_at IS NULL",
    )
    .bind(&req.file_name)
    .bind(&req.mime_type)
    .bind(&req.file_type)
    .bind(data.len() as i64)
    .bind(&data)
    .bind(attachment_id)
    .bind(id)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("更新失败", e))),
    };
    if affected == 0 {
        return Json(ApiResponse::error(404, "附件不存在"));
    }
    Json(ApiResponse::success(
        json!({"id": attachment_id}),
        "附件已更新",
    ))
}

async fn delete_attachment(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path((id, attachment_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let affected = match sqlx::query(
        "UPDATE ticket.ticket_attachments SET deleted_at = now(), updated_at = now() \
         WHERE id = $1 AND ticket_id = $2 AND tenant_id = $3 AND deleted_at IS NULL",
    )
    .bind(attachment_id)
    .bind(id)
    .bind(tenant_id)
    .execute(&pool)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("删除失败", e))),
    };
    if affected == 0 {
        return Json(ApiResponse::error(404, "附件不存在"));
    }
    Json(ApiResponse::success(
        json!({"id": attachment_id}),
        "附件已删除",
    ))
}

async fn batch_upload_attachments(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<BatchUploadRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    let user_id = user_of(&claims);
    let mut created = 0usize;
    let mut txn = match pool.begin().await {
        Ok(t) => t,
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("事务失败", e))),
    };
    for item in &req.attachments {
        let data = item
            .file_data
            .as_deref()
            .map(decode_file_data)
            .unwrap_or_default();
        if let Err(e) = sqlx::query(
            "INSERT INTO ticket.ticket_attachments \
             (ticket_id, tenant_id, file_name, mime_type, file_size, file_type, file_data, created_by) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&item.file_name)
        .bind(&item.mime_type)
        .bind(data.len() as i64)
        .bind(&item.file_type)
        .bind(&data)
        .bind(user_id)
        .execute(&mut *txn)
        .await
        {
            return Json(ApiResponse::from(TopemsError::internal("批量上传失败", e)));
        }
        created += 1;
    }
    if let Err(e) = txn.commit().await {
        return Json(ApiResponse::from(TopemsError::internal("提交失败", e)));
    }
    Json(ApiResponse::success(
        json!({"created": created}),
        "批量上传完成",
    ))
}

async fn batch_delete_attachments(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<BatchDeleteAttachmentsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_of(&claims);
    if req.ids.is_empty() {
        return Json(ApiResponse::error(400, "ids 不能为空"));
    }
    let affected = match sqlx::query(
        "UPDATE ticket.ticket_attachments SET deleted_at = now(), updated_at = now() \
         WHERE ticket_id = $1 AND tenant_id = $2 AND id = ANY($3) AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.ids)
    .execute(&pool)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("批量删除失败", e))),
    };
    Json(ApiResponse::success(
        json!({"deleted": affected}),
        "批量删除完成",
    ))
}

async fn get_attachment_stats(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser { None } else { Some(tenant_of(&claims)) };
    let row = match sqlx::query(
        "SELECT count(*) AS total, COALESCE(sum(file_size), 0) AS total_bytes \
         FROM ticket.ticket_attachments \
         WHERE ticket_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(opt_tenant_id)
    .fetch_one(&pool)
    .await
    {
        Ok(r) => r,
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };
    Json(ApiResponse::success(
        json!({
            "total": row.get::<i64, _>("total"),
            "total_bytes": row.get::<i64, _>("total_bytes"),
        }),
        "附件统计",
    ))
}

async fn get_attachments_by_type(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path((id, file_type)): Path<(Uuid, String)>,
) -> Json<ApiResponse<serde_json::Value>> {
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser { None } else { Some(tenant_of(&claims)) };
    let rows = match sqlx::query(
        "SELECT id, file_name, mime_type, file_size, created_at \
         FROM ticket.ticket_attachments \
         WHERE ticket_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND file_type = $3 AND deleted_at IS NULL \
         ORDER BY created_at DESC",
    )
    .bind(id)
    .bind(opt_tenant_id)
    .bind(&file_type)
    .fetch_all(&pool)
    .await
    {
        Ok(r) => r,
        Err(e) => return Json(ApiResponse::from(TopemsError::internal("查询失败", e))),
    };
    let items: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.get::<Uuid, _>("id"),
                "file_name": r.get::<String, _>("file_name"),
                "mime_type": r.get::<Option<String>, _>("mime_type"),
                "file_size": r.get::<i64, _>("file_size"),
                "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
            })
        })
        .collect();
    Json(ApiResponse::success(
        json!({"items": items, "total": items.len()}),
        "类型附件",
    ))
}

// 下载走 bytea 返回（供前端 Blob 消费）
pub async fn download_attachment_handler(
    State(pool): State<PgPool>,
    claims: axum::Extension<Claims>,
    Path((id, attachment_id)): Path<(Uuid, Uuid)>,
) -> Result<axum::response::Response, axum::response::Response> {
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser { None } else { Some(tenant_of(&claims)) };
    let row = sqlx::query(
        "SELECT file_name, mime_type, file_data FROM ticket.ticket_attachments \
         WHERE id = $1 AND ticket_id = $2 AND ($3::uuid IS NULL OR tenant_id = $3) AND deleted_at IS NULL",
    )
    .bind(attachment_id)
    .bind(id)
    .bind(opt_tenant_id)
    .fetch_optional(&pool)
    .await
    .map_err(|_| axum::response::Response::new(axum::body::Body::from("查询失败")))?;

    let row =
        row.ok_or_else(|| axum::response::Response::new(axum::body::Body::from("附件不存在")))?;
    let file_name: String = row.get("file_name");
    let mime_type: Option<String> = row.get("mime_type");
    let data: Vec<u8> = row.get("file_data");

    let content_type = mime_type.unwrap_or_else(|| "application/octet-stream".to_string());
    let disposition = format!("attachment; filename=\"{}\"", file_name.replace('"', "_"));
    Ok(axum::response::Response::builder()
        .status(200)
        .header("content-type", content_type)
        .header("content-disposition", disposition)
        .body(axum::body::Body::from(data))
        .unwrap())
}
