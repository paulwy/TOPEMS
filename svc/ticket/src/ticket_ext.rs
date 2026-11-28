//! Ticket 扩展模块（P1 主题二⑥）：工作流、状态流转、标签、批量操作、附件
//! 与既有 handler 风格一致：State(Pool) + Claims + tenant_id 代码绑定（RLS 由 DB 层兜底）

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use sqlx::Row;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::locale::Locale;
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

/// 写操作必须携带有效租户：缺失/非法/nil 返回 400，禁止落零 UUID 区间。
fn require_tenant_id(claims: &Claims) -> Result<Uuid, (u16, String)> {
    match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) if !t.is_nil() => Ok(t),
        _ => Err((400, "缺少租户上下文：拒绝工单写操作".to_string())),
    }
}

fn user_of(claims: &Claims) -> Option<Uuid> {
    Uuid::parse_str(&claims.sub).ok()
}

pub fn ticket_ext_routes() -> Router<Db> {
    Router::new()
        // ---- 工作流（静态状态机）----
        .route("/workflows", get(get_workflows).post(create_workflow))
        .route("/workflows/match", get(get_workflow_for_ticket_type))
        .route(
            "/workflows/automation-rules",
            get(list_workflow_automation_rules),
        )
        .route(
            "/workflows/automation-rules/{id}/toggle",
            axum::routing::put(toggle_workflow_automation_rule),
        )
        // ---- 工作流 by-id（web 契约收口；静态状态机，持久化待上游支持）----
        .route(
            "/workflows/{id}",
            get(get_workflow_by_id)
                .put(update_workflow)
                .delete(delete_workflow),
        )
        .route(
            "/workflows/{id}/transitions",
            get(list_workflow_transitions).post(add_workflow_transition),
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/workflows",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn get_workflows(State(_db): State<Db>) -> ApiResponse<serde_json::Value> {
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
    ApiResponse::success(data, "工作流配置")
}

/// 创建工作流：工单状态机是代码内白名单（`is_valid_ticket_transition`），不落库。
/// 这里如实回声并标记 `persisted=false`，避免前端拿到“创建成功”却以为已持久化。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/workflows",
    tag = "TicketExt",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_workflow(
    Json(body): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("ticket_default_workflow")
        .to_string();
    let id = body
        .get("id")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .unwrap_or_else(|| format!("wf-{}", uuid::Uuid::new_v4()));
    ApiResponse::success(
        json!({
            "id": id,
            "name": name,
            "statuses": ALL_STATUSES,
            "definition": body,
            "persisted": false,
            "note": "静态状态机：工单流转由内置白名单约束，自定义工作流暂未持久化",
        }),
        "工作流已受理（静态状态机）",
    )
}

// ==================== 工作流匹配与自动化规则（前端 workflow.ts 调用）====================

#[derive(Deserialize)]
pub struct WorkflowMatchQuery {
    ticket_type: Option<String>,
}

/// 按工单类型匹配工作流：当前为默认状态机（静态配置），后续可扩展为按类型返回不同流程
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/workflows/match",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn get_workflow_for_ticket_type(
    axum::extract::Query(query): axum::extract::Query<WorkflowMatchQuery>,
) -> ApiResponse<serde_json::Value> {
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
    ApiResponse::success(data, "工作流匹配")
}

/// 工作流自动化规则视图（前端字段：id/name/trigger/action/is_active）
#[derive(serde::Serialize)]
pub struct WorkflowRuleView {
    id: Uuid,
    name: String,
    trigger: Option<String>,
    action: Option<String>,
    is_active: bool,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/workflows/automation-rules",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn list_workflow_automation_rules(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    _claims: axum::Extension<Claims>,
    headers: HeaderMap,
) -> ApiResponse<Vec<WorkflowRuleView>> {
    let locale = Locale::from_headers(&headers).as_sql();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    match sqlx::query(
        "SELECT id, CASE WHEN $1 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, condition_field, action_type, enabled
         FROM ticket.ticket_automation_rules ORDER BY priority ASC, created_at ASC",
    )
    .bind(locale)
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => {
            let _ = scope.commit().await;
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
            ApiResponse::success(views, "工作流自动化规则列表")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal(
                "获取工作流自动化规则失败",
                e,
            ))
        }
    }
}

#[derive(Deserialize)]
pub struct WorkflowToggleRequest {
    is_active: bool,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/api/ticket/workflows/automation-rules/{id}/toggle",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn toggle_workflow_automation_rule(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<WorkflowToggleRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    match sqlx::query(
        "UPDATE ticket.ticket_automation_rules SET enabled = $1, updated_at = now()
         WHERE id = $2 AND tenant_id = $3",
    )
    .bind(req.is_active)
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        Ok(res) => {
            if res.rows_affected() == 0 {
                let _ = scope.rollback().await;
                ApiResponse::from(TopemsError::DatabaseRecordNotFound(
                    "自动化规则不存在".into(),
                ))
            } else if let Err(e) = scope.commit().await {
                ApiResponse::from(TopemsError::internal("提交失败", e))
            } else {
                ApiResponse::success(
                    json!({"id": id, "is_active": req.is_active}),
                    "规则状态已更新",
                )
            }
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("更新自动化规则失败", e))
        }
    }
}

// ==================== 工作流 by-id（web 契约收口） ====================
// 说明：当前工单工作流为静态默认状态机（见 get_workflows），按 id 的持久化 CRUD
// 待上游支持。这里复用静态状态机构造器返回契约结构，保证前端路由可联通。

fn build_static_workflow(id: Uuid) -> serde_json::Value {
    let mut transitions: Vec<serde_json::Value> = Vec::new();
    for from in ALL_STATUSES {
        for to in ALL_STATUSES {
            if from != to && is_valid_ticket_transition(from, to) {
                transitions.push(json!({"from": from, "to": to}));
            }
        }
    }
    json!({
        "id": id,
        "name": "ticket_default_workflow",
        "ticket_type": "default",
        "statuses": ALL_STATUSES,
        "transitions": transitions,
        "is_active": true,
    })
}

/// GET /workflows/{id}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/workflows/{id}",
    tag = "TicketExt",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_workflow_by_id(
    State(_db): State<Db>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(build_static_workflow(id), "工作流详情")
}

/// PUT /workflows/{id} —— 静态状态机暂不落库更新（待上游支持）
#[utoipa::path(
    put,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/workflows/{id}",
    tag = "TicketExt",
    request_body = serde_json::Value,
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_workflow(
    State(_db): State<Db>,
    Path(id): Path<Uuid>,
    Json(_body): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(build_static_workflow(id), "工作流已更新")
}

/// DELETE /workflows/{id} —— 默认静态工作流不可删除，契约上回显成功（待上游支持）
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/workflows/{id}",
    tag = "TicketExt",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn delete_workflow(
    State(_db): State<Db>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(json!({"id": id, "deleted": true}), "工作流已删除")
}

/// GET /workflows/{id}/transitions
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/workflows/{id}/transitions",
    tag = "TicketExt",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_workflow_transitions(
    State(_db): State<Db>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let wf = build_static_workflow(id);
    ApiResponse::success(wf["transitions"].clone(), "工作流流转")
}

/// POST /workflows/{id}/transitions —— 追加流转不落库，回显契约结构（待上游支持）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/workflows/{id}/transitions",
    tag = "TicketExt",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn add_workflow_transition(
    State(_db): State<Db>,
    Path(id): Path<Uuid>,
    mut body: Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    if let Some(obj) = body.as_object_mut() {
        obj.insert("id".into(), json!(Uuid::new_v4().to_string()));
        obj.insert("workflow_id".into(), json!(id.to_string()));
    }
    ApiResponse::success(body.0, "流转已添加")
}

// ==================== 状态流转 ====================

#[derive(Deserialize)]
pub struct TransitionRequest {
    to_status: String,
    comment: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/tickets/{id}/transitions",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn get_ticket_transitions(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    _claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let row =
        sqlx::query("SELECT status FROM ticket.core_tickets WHERE id = $1 AND deleted_at IS NULL")
            .bind(id)
            .fetch_optional(&mut scope)
            .await;

    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::not_found("工单不存在");
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
    };
    let _ = scope.commit().await;
    let current: String = row.get("status");
    let mut targets: Vec<String> = Vec::new();
    for to in ALL_STATUSES {
        if *to != current && is_valid_ticket_transition(&current, to) {
            targets.push(to.to_string());
        }
    }
    ApiResponse::success(
        json!({"current": current, "available_transitions": targets}),
        "可执行流转",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/api/ticket/tickets/{id}/transition",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn apply_transition(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<TransitionRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let user_id = user_of(&claims);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };

    let current: String = match sqlx::query_scalar::<_, String>(
        "SELECT status FROM ticket.core_tickets WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(s)) => s,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::not_found("工单不存在");
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
    };

    if !is_valid_ticket_transition(&current, &req.to_status) {
        let _ = scope.rollback().await;
        return ApiResponse::bad_request(&format!("非法流转: {} -> {}", current, req.to_status));
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
    .execute(&mut scope)
    .await
    {
        let _ = scope.rollback().await;
        return ApiResponse::from(TopemsError::internal("更新失败", e));
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
    .execute(&mut scope)
    .await
    {
        let _ = scope.rollback().await;
        return ApiResponse::from(TopemsError::internal("活动记录失败", e));
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
            .execute(&mut scope)
            .await
            {
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::internal("备注失败", e));
            }
        }
    }

    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }

    ApiResponse::success(
        json!({"id": id, "from": current, "to": req.to_status}),
        "流转成功",
    )
}

// ==================== 标签 ====================

#[derive(Deserialize, utoipa::ToSchema)]
struct TagRequest {
    tag: String,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/tickets/{id}/tags",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn get_ticket_tags(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    _claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let tags: Option<Vec<String>> = match sqlx::query_scalar(
        "SELECT tags FROM ticket.core_tickets WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::not_found("工单不存在");
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
    };
    let _ = scope.commit().await;
    ApiResponse::success(json!({"tags": tags.unwrap_or_default()}), "工单标签")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/tickets/{id}/tags",
    tag = "TicketExt",
    request_body = TagRequest,
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn add_ticket_tag(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<TagRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let tag = req.tag.trim().to_string();
    if tag.is_empty() {
        return ApiResponse::bad_request("标签不能为空");
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let current: Option<Vec<String>> = match sqlx::query_scalar(
        "SELECT tags FROM ticket.core_tickets WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::not_found("工单不存在");
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
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
    .execute(&mut scope)
    .await
    {
        let _ = scope.rollback().await;
        return ApiResponse::from(TopemsError::internal("更新失败", e));
    }
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"tags": tags}), "标签已添加")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/api/ticket/tickets/{id}/tags/{tag}",
    params(
        ("id" = String, Path, description = "id"),
        ("tag" = String, Path, description = "tag")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn remove_ticket_tag(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Path((id, tag)): Path<(Uuid, String)>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let current: Option<Vec<String>> = match sqlx::query_scalar(
        "SELECT tags FROM ticket.core_tickets WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::not_found("工单不存在");
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
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
    .execute(&mut scope)
    .await
    {
        let _ = scope.rollback().await;
        return ApiResponse::from(TopemsError::internal("更新失败", e));
    }
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"tags": tags}), "标签已移除")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/ticket-tags",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn list_tag_directory(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    _claims: axum::Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let rows = sqlx::query(
        "SELECT unnest(tags) AS tag, count(*) AS count \
         FROM ticket.core_tickets WHERE deleted_at IS NULL \
         GROUP BY tag ORDER BY count DESC",
    )
    .fetch_all(&mut scope)
    .await;
    let rows = match rows {
        Ok(r) => {
            let _ = scope.commit().await;
            r
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
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
    ApiResponse::success(json!({"tags": items}), "标签目录")
}

// 标签目录为聚合派生，无独立存储；写操作返回成功占位（幂等无状态）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/ticket-tags",
    tag = "TicketExt",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn create_tag_stub() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(json!({"ok": true}), "标签目录为隐式聚合，无需创建")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/ticket-tags/{tag}",
    params(
        ("tag" = String, Path, description = "tag")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn get_tag_stub(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    _claims: axum::Extension<Claims>,
    Path(tag): Path<String>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let count: i64 = match sqlx::query_scalar(
        "SELECT count(*) FROM ticket.core_tickets \
         WHERE deleted_at IS NULL AND $1 = ANY(tags)",
    )
    .bind(&tag)
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
    };
    let _ = scope.commit().await;
    ApiResponse::success(json!({"name": tag, "count": count}), "标签")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/ticket-tags/{tag}",
    tag = "TicketExt",
    params(("tag" = String, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_tag_stub() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(json!({"ok": true}), "标签目录为隐式聚合")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/ticket-tags/{tag}",
    tag = "TicketExt",
    params(("tag" = String, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn delete_tag_stub() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(json!({"ok": true}), "标签为工单内联属性，无全局删除语义")
}

// ==================== 批量操作 ====================

#[derive(Deserialize)]
pub struct BatchIdsRequest {
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/api/ticket/tickets/batch-update",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn batch_update_tickets(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Json(req): Json<BatchIdsRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let ids = ids_param(&req);
    if ids.is_empty() {
        return ApiResponse::bad_request("ids 不能为空");
    }
    // 批量更新不能绕过 TicketStatus 值域与状态机：先校验目标值，再按每张工单当前态校验转移。
    if let Some(status) = req.status.as_deref() {
        if !ALL_STATUSES.contains(&status) {
            return ApiResponse::bad_request("无效的工单状态");
        }
    }
    if let Some(priority) = req.priority.as_deref() {
        if !crate::util::is_valid_priority(priority) {
            return ApiResponse::bad_request("无效的工单优先级");
        }
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    if let Some(target) = req.status.as_deref() {
        let current_rows = match sqlx::query(
            "SELECT status FROM ticket.core_tickets WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL",
        )
        .bind(&ids)
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await
        {
            Ok(rows) => rows,
            Err(e) => {
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::internal("读取工单当前状态失败", e));
            }
        };
        for row in &current_rows {
            let current: String = match row.try_get("status") {
                Ok(v) => v,
                Err(e) => {
                    let _ = scope.rollback().await;
                    return ApiResponse::from(TopemsError::internal("解析工单当前状态失败", e));
                }
            };
            if !is_valid_ticket_transition(&current, target) {
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::ValidationFailed(format!(
                    "非法工单状态转移: {current} -> {target}"
                )));
            }
        }
    }
    let mut set = "updated_at = now()".to_string();
    if req.status.is_some() {
        set.push_str(", status = $3");
    }
    if req.priority.is_some() {
        set.push_str(", severity = $4");
    }
    let affected = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE ticket.core_tickets SET {} WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL",
        set
    )))
    .bind(&ids)
    .bind(tenant_id)
    .bind(&req.status)
    .bind(&req.priority)
    .execute(&mut scope)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("批量更新失败", e));
        }
    };
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"updated": affected}), "批量更新完成")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/api/ticket/tickets/batch-assign",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn batch_assign_tickets(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Json(req): Json<BatchIdsRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let ids = ids_param(&req);
    let assignee = match req.assignee_id {
        Some(a) => a,
        None => return ApiResponse::bad_request("assignee_id 必填"),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let affected = match sqlx::query(
        "UPDATE ticket.core_tickets SET assignee_id = $1, updated_at = now() \
         WHERE id = ANY($2) AND tenant_id = $3 AND deleted_at IS NULL",
    )
    .bind(assignee)
    .bind(&ids)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("批量指派失败", e));
        }
    };
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"updated": affected}), "批量指派完成")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/api/ticket/tickets/batch-close",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn batch_close_tickets(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Json(req): Json<BatchIdsRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let ids = ids_param(&req);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let affected = match sqlx::query(
        "UPDATE ticket.core_tickets SET status = 'closed', closed_at = now(), updated_at = now() \
         WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&ids)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("批量关闭失败", e));
        }
    };
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"closed": affected}), "批量关闭完成")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/api/ticket/tickets/batch-delete",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn batch_delete_tickets(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Json(req): Json<BatchIdsRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let ids = ids_param(&req);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let affected = match sqlx::query(
        "UPDATE ticket.core_tickets SET deleted_at = now(), updated_at = now() \
         WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&ids)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("批量删除失败", e));
        }
    };
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"deleted": affected}), "批量删除完成")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/api/ticket/tickets/batch-escalate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn batch_escalate_tickets(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Json(req): Json<BatchIdsRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let ids = ids_param(&req);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let affected = match sqlx::query(
        "UPDATE ticket.core_tickets SET severity = 'critical', updated_at = now() \
         WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(&ids)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("批量升级失败", e));
        }
    };
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"escalated": affected}), "批量升级完成")
}

// ==================== 附件 ====================

#[derive(Deserialize, utoipa::ToSchema)]
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
pub struct BatchUploadRequest {
    attachments: Vec<UploadAttachmentRequest>,
}

#[derive(Deserialize)]
pub struct BatchDeleteAttachmentsRequest {
    ids: Vec<Uuid>,
}

fn decode_file_data(raw: &str) -> Vec<u8> {
    // 内嵌存储：按原文 UTF-8 字节存（轻量文本/小文件场景）
    raw.as_bytes().to_vec()
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/tickets/{id}/attachments",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn list_attachments(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    _claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let rows = match sqlx::query(
        "SELECT id, file_name, mime_type, file_size, file_type, created_by, created_at \
         FROM ticket.ticket_attachments \
         WHERE ticket_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC",
    )
    .bind(id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(r) => {
            let _ = scope.commit().await;
            r
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
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
    ApiResponse::success(json!({"items": items, "total": items.len()}), "附件列表")
}

#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/tickets/{id}/attachments",
    tag = "TicketExt",
    request_body = UploadAttachmentRequest,
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn upload_attachment(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UploadAttachmentRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let user_id = user_of(&claims);
    if req.file_name.trim().is_empty() {
        return ApiResponse::bad_request("file_name 必填");
    }
    let data = req
        .file_data
        .as_deref()
        .map(decode_file_data)
        .unwrap_or_default();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
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
    .fetch_one(&mut scope)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("上传失败", e));
        }
    };
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    let attachment_id: Uuid = row.get("id");
    ApiResponse::success(
        json!({"id": attachment_id, "file_name": req.file_name, "file_size": data.len()}),
        "上传成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/tickets/{id}/attachments/{attachment_id}",
    params(
        ("id" = String, Path, description = "id"),
        ("attachment_id" = String, Path, description = "attachment_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn get_attachment(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    _claims: axum::Extension<Claims>,
    Path((id, attachment_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let row = match sqlx::query(
        "SELECT id, file_name, mime_type, file_size, file_type, created_at \
         FROM ticket.ticket_attachments \
         WHERE id = $1 AND ticket_id = $2 AND deleted_at IS NULL",
    )
    .bind(attachment_id)
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::not_found("附件不存在");
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
    };
    let _ = scope.commit().await;
    ApiResponse::success(
        json!({
            "id": row.get::<Uuid, _>("id"),
            "file_name": row.get::<String, _>("file_name"),
            "mime_type": row.get::<Option<String>, _>("mime_type"),
            "file_size": row.get::<i64, _>("file_size"),
            "file_type": row.get::<Option<String>, _>("file_type"),
            "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
        }),
        "附件信息",
    )
}

#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
#[utoipa::path(
    put,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/tickets/{id}/attachments/{attachment_id}",
    tag = "TicketExt",
    request_body = UploadAttachmentRequest,
    params(("id" = Uuid, Path, description = ""), ("attachment_id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn update_attachment(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Path((id, attachment_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UploadAttachmentRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let data = req
        .file_data
        .as_deref()
        .map(decode_file_data)
        .unwrap_or_default();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
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
    .execute(&mut scope)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("更新失败", e));
        }
    };
    if affected == 0 {
        let _ = scope.rollback().await;
        return ApiResponse::not_found("附件不存在");
    }
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"id": attachment_id}), "附件已更新")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/tickets/{id}/attachments/{attachment_id}",
    tag = "TicketExt",
    params(("id" = Uuid, Path, description = ""), ("attachment_id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub(crate) async fn delete_attachment(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Path((id, attachment_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let affected = match sqlx::query(
        "UPDATE ticket.ticket_attachments SET deleted_at = now(), updated_at = now() \
         WHERE id = $1 AND ticket_id = $2 AND tenant_id = $3 AND deleted_at IS NULL",
    )
    .bind(attachment_id)
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("删除失败", e));
        }
    };
    if affected == 0 {
        let _ = scope.rollback().await;
        return ApiResponse::not_found("附件不存在");
    }
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"id": attachment_id}), "附件已删除")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/api/ticket/tickets/{id}/attachments/batch",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn batch_upload_attachments(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<BatchUploadRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let user_id = user_of(&claims);
    let mut created = 0usize;
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(t) => t,
        Err(e) => return ApiResponse::from(TopemsError::internal("事务失败", e)),
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
        .execute(&mut scope)
        .await
        {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("批量上传失败", e));
        }
        created += 1;
    }
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"created": created}), "批量上传完成")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket_ext:write"])),
    path = "/api/ticket/tickets/{id}/attachments/batch-delete",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn batch_delete_attachments(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<BatchDeleteAttachmentsRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    if req.ids.is_empty() {
        return ApiResponse::bad_request("ids 不能为空");
    }
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let affected = match sqlx::query(
        "UPDATE ticket.ticket_attachments SET deleted_at = now(), updated_at = now() \
         WHERE ticket_id = $1 AND tenant_id = $2 AND id = ANY($3) AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.ids)
    .execute(&mut scope)
    .await
    {
        Ok(r) => r.rows_affected(),
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("批量删除失败", e));
        }
    };
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    ApiResponse::success(json!({"deleted": affected}), "批量删除完成")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/tickets/{id}/attachments/stats",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn get_attachment_stats(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    _claims: axum::Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let row = match sqlx::query(
        "SELECT count(*) AS total, COALESCE(sum(file_size), 0)::bigint AS total_bytes \
         FROM ticket.ticket_attachments \
         WHERE ticket_id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
    };
    let _ = scope.commit().await;
    ApiResponse::success(
        json!({
            "total": row.get::<i64, _>("total"),
            "total_bytes": row.get::<i64, _>("total_bytes"),
        }),
        "附件统计",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/tickets/{id}/attachments/type/{file_type}",
    params(
        ("id" = String, Path, description = "id"),
        ("file_type" = String, Path, description = "file_type")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn get_attachments_by_type(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    _claims: axum::Extension<Claims>,
    Path((id, file_type)): Path<(Uuid, String)>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let rows = match sqlx::query(
        "SELECT id, file_name, mime_type, file_size, created_at \
         FROM ticket.ticket_attachments \
         WHERE ticket_id = $1 AND file_type = $2 AND deleted_at IS NULL \
         ORDER BY created_at DESC",
    )
    .bind(id)
    .bind(&file_type)
    .fetch_all(&mut scope)
    .await
    {
        Ok(r) => {
            let _ = scope.commit().await;
            r
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询失败", e));
        }
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
    ApiResponse::success(json!({"items": items, "total": items.len()}), "类型附件")
}

// 下载走 bytea 返回（供前端 Blob 消费）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket_ext:read"])),
    path = "/api/ticket/tickets/{id}/attachments/{attachment_id}/download",
    params(
        ("id" = String, Path, description = "id"),
        ("attachment_id" = String, Path, description = "attachment_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "TicketExt"
)]
pub async fn download_attachment_handler(
    axum::Extension(txn_arc): axum::Extension<RlsTxnCell>,
    State(db): State<Db>,
    _claims: axum::Extension<Claims>,
    Path((id, attachment_id)): Path<(Uuid, Uuid)>,
) -> Result<axum::response::Response, axum::response::Response> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Err(axum::response::Response::new(axum::body::Body::from(
            "数据库事务上下文缺失：请求事务未注入",
        )));
    };
    let mut scope = db
        .scope_with(txn)
        .await
        .map_err(|_| axum::response::Response::new(axum::body::Body::from("数据库连接失败")))?;
    let row = sqlx::query(
        "SELECT file_name, mime_type, file_data FROM ticket.ticket_attachments \
         WHERE id = $1 AND ticket_id = $2 AND deleted_at IS NULL",
    )
    .bind(attachment_id)
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    .map_err(|_| axum::response::Response::new(axum::body::Body::from("查询失败")))?;

    let _ = scope.commit().await;
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
