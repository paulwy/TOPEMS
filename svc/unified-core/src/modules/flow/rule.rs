//! Rule submodule - Workflow rule (condition/route/approval rules) management handlers
//!
//! 契约对齐：apps/web/src/api/workflow/rule.ts（apiClient.workflow base = /api/core/flow）
//!   GET    /rules                       list（分页 + workflow/type/status 过滤）
//!   GET    /rules/{id}                  get
//!   POST   /rules                       create
//!   PUT    /rules/{id}                  update
//!   DELETE /rules/{id}                  delete（软删）
//!   GET    /rules/workflow/{workflowId} 流程下规则
//!   GET    /rules/node/{workflowId}/{nodeId} 节点规则
//!   GET    /rules/type                  按类型过滤（Query rule_type）
//!   POST   /rules/{id}/activate         启用
//!   POST   /rules/{id}/deactivate       停用
//!   POST   /rules/batch-update          批量更新

use crate::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::TopemsError;
use topems_shared_db::scope::ScopedTxn;
use utoipa::ToSchema;
use uuid::Uuid;

use topems_shared_core::response::{ApiResponse, PaginatedResponse};

#[derive(Debug, FromRow)]
pub struct RuleRow {
    pub id: Uuid,
    pub name: String,
    pub workflow_id: Option<Uuid>,
    pub node_id: Option<String>,
    pub rule_type: String,
    pub condition: serde_json::Value,
    pub action: serde_json::Value,
    pub priority: i32,
    pub status: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WorkflowRule {
    pub id: Uuid,
    pub name: String,
    pub workflow_id: Option<Uuid>,
    pub node_id: Option<String>,
    pub rule_type: String,
    pub condition: serde_json::Value,
    pub action: serde_json::Value,
    pub priority: i32,
    pub status: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<RuleRow> for WorkflowRule {
    fn from(r: RuleRow) -> Self {
        WorkflowRule {
            id: r.id,
            name: r.name,
            workflow_id: r.workflow_id,
            node_id: r.node_id,
            rule_type: r.rule_type,
            condition: r.condition,
            action: r.action,
            priority: r.priority,
            status: r.status,
            description: r.description,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RuleListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub workflow_id: Option<Uuid>,
    pub rule_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRuleRequest {
    pub name: String,
    pub workflow_id: Option<Uuid>,
    pub node_id: Option<String>,
    pub rule_type: Option<String>,
    pub condition: Option<serde_json::Value>,
    pub action: Option<serde_json::Value>,
    pub priority: Option<i32>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRuleRequest {
    pub name: Option<String>,
    pub workflow_id: Option<Uuid>,
    pub node_id: Option<String>,
    pub rule_type: Option<String>,
    pub condition: Option<serde_json::Value>,
    pub action: Option<serde_json::Value>,
    pub priority: Option<i32>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchUpdateRulesRequest {
    pub rules: Vec<WorkflowRule>,
}

pub async fn list_rules(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(query): Query<RuleListQuery>,
) -> ApiResponse<PaginatedResponse<WorkflowRule>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化规则列表事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化规则列表事务作用域失败".to_string(),
            ));
        }
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let workflow_id = query.workflow_id;
    let rule_type = query.rule_type.filter(|s| !s.is_empty());
    let status = query.status.filter(|s| !s.is_empty());

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM public.core_flow_rules
           WHERE deleted_at IS NULL
             AND ($1::uuid IS NULL OR workflow_id = $1)
             AND ($2::text IS NULL OR rule_type = $2)
             AND ($3::text IS NULL OR status = $3)"#,
    )
    .bind(workflow_id)
    .bind(rule_type.clone())
    .bind(status.clone())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询规则总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询规则总数失败".to_string()));
        }
    };

    let rows: Vec<RuleRow> = match sqlx::query_as(
        r#"SELECT id, name, workflow_id, node_id, rule_type, condition, action, priority, status, description, created_at, updated_at
           FROM public.core_flow_rules
           WHERE deleted_at IS NULL
             AND ($1::uuid IS NULL OR workflow_id = $1)
             AND ($2::text IS NULL OR rule_type = $2)
             AND ($3::text IS NULL OR status = $3)
           ORDER BY priority ASC, created_at DESC
           LIMIT $4 OFFSET $5"#,
    )
    .bind(workflow_id)
    .bind(rule_type)
    .bind(status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询规则列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询规则列表失败".to_string()));
        }
    };

    let items: Vec<WorkflowRule> = rows.into_iter().map(WorkflowRule::from).collect();
    ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: (total + page_size - 1) / page_size,
        },
        "查询成功",
    )
}

pub async fn get_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<WorkflowRule> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化规则详情事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化规则详情事务作用域失败".to_string(),
            ));
        }
    };
    let row: Option<RuleRow> = match sqlx::query_as(
        r#"SELECT id, name, workflow_id, node_id, rule_type, condition, action, priority, status, description, created_at, updated_at
           FROM public.core_flow_rules WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询规则失败".to_string()));
        }
    };

    match row {
        Some(r) => ApiResponse::success(WorkflowRule::from(r), "查询成功"),
        None => ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string())),
    }
}

pub async fn create_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<CreateRuleRequest>,
) -> ApiResponse<WorkflowRule> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化创建规则事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化创建规则事务作用域失败".to_string(),
            ));
        }
    };
    if payload.name.trim().is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "规则名称不能为空".to_string(),
        ));
    }
    let rule_type = payload.rule_type.unwrap_or_else(|| "condition".to_string());
    let condition = payload.condition.unwrap_or(serde_json::json!({}));
    let action = payload.action.unwrap_or(serde_json::json!({}));
    let priority = payload.priority.unwrap_or(0);
    let status = payload.status.unwrap_or_else(|| "active".to_string());

    let row: Option<RuleRow> = match sqlx::query_as(
        r#"INSERT INTO public.core_flow_rules
             (tenant_id, name, workflow_id, node_id, rule_type, condition, action, priority, status, description)
           VALUES ((NULLIF(current_setting('app.tenant_id', true), ''))::uuid,
                   $1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, name, workflow_id, node_id, rule_type, condition, action, priority, status, description, created_at, updated_at"#,
    )
    .bind(payload.name.trim())
    .bind(payload.workflow_id)
    .bind(payload.node_id)
    .bind(rule_type)
    .bind(condition)
    .bind(action)
    .bind(priority)
    .bind(status)
    .bind(payload.description)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建规则失败".to_string()));
        }
    };

    match row {
        Some(r) => ApiResponse::success(WorkflowRule::from(r), "创建成功"),
        None => ApiResponse::from(TopemsError::Internal("创建规则失败".to_string())),
    }
}

pub async fn update_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateRuleRequest>,
) -> ApiResponse<WorkflowRule> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化更新规则事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化更新规则事务作用域失败".to_string(),
            ));
        }
    };
    let row: Option<RuleRow> = match sqlx::query_as(
        r#"UPDATE public.core_flow_rules
           SET name = COALESCE($2, name),
               workflow_id = $3,
               node_id = $4,
               rule_type = COALESCE($5, rule_type),
               condition = COALESCE($6, condition),
               action = COALESCE($7, action),
               priority = COALESCE($8, priority),
               status = COALESCE($9, status),
               description = COALESCE($10, description),
               updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING id, name, workflow_id, node_id, rule_type, condition, action, priority, status, description, created_at, updated_at"#,
    )
    .bind(id)
    .bind(payload.name)
    .bind(payload.workflow_id)
    .bind(payload.node_id)
    .bind(payload.rule_type)
    .bind(payload.condition)
    .bind(payload.action)
    .bind(payload.priority)
    .bind(payload.status)
    .bind(payload.description)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新规则失败".to_string()));
        }
    };

    match row {
        Some(r) => ApiResponse::success(WorkflowRule::from(r), "更新成功"),
        None => ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string())),
    }
}

pub async fn delete_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化删除规则事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化删除规则事务作用域失败".to_string(),
            ));
        }
    };
    let res = sqlx::query(
        r#"UPDATE public.core_flow_rules SET deleted_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(id)
    .execute(&mut scope)
    .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"id": id}), "删除成功")
        }
        Ok(_) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()))
        }
        Err(e) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            tracing::error!("删除规则失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除规则失败".to_string()))
        }
    }
}

pub async fn get_rules_by_workflow(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(workflow_id): Path<Uuid>,
    Query(query): Query<RuleListQuery>,
) -> ApiResponse<Vec<WorkflowRule>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化流程规则事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化流程规则事务作用域失败".to_string(),
            ));
        }
    };
    let rule_type = query.rule_type.filter(|s| !s.is_empty());
    let rows: Vec<RuleRow> = match sqlx::query_as(
        r#"SELECT id, name, workflow_id, node_id, rule_type, condition, action, priority, status, description, created_at, updated_at
           FROM public.core_flow_rules
           WHERE deleted_at IS NULL AND workflow_id = $1
             AND ($2::text IS NULL OR rule_type = $2)
           ORDER BY priority ASC, created_at DESC"#,
    )
    .bind(workflow_id)
    .bind(rule_type)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询流程规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询流程规则失败".to_string()));
        }
    };

    let items: Vec<WorkflowRule> = rows.into_iter().map(WorkflowRule::from).collect();
    ApiResponse::success(items, "查询成功")
}

pub async fn get_rules_by_node(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((workflow_id, node_id)): Path<(Uuid, String)>,
) -> ApiResponse<Vec<WorkflowRule>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化节点规则事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化节点规则事务作用域失败".to_string(),
            ));
        }
    };
    let rows: Vec<RuleRow> = match sqlx::query_as(
        r#"SELECT id, name, workflow_id, node_id, rule_type, condition, action, priority, status, description, created_at, updated_at
           FROM public.core_flow_rules
           WHERE deleted_at IS NULL AND workflow_id = $1 AND node_id = $2 AND status = 'active'
           ORDER BY priority ASC, created_at DESC"#,
    )
    .bind(workflow_id)
    .bind(&node_id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询节点规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询节点规则失败".to_string()));
        }
    };

    let items: Vec<WorkflowRule> = rows.into_iter().map(WorkflowRule::from).collect();
    ApiResponse::success(items, "查询成功")
}

pub async fn get_rules_by_type(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(query): Query<RuleListQuery>,
) -> ApiResponse<PaginatedResponse<WorkflowRule>> {
    list_rules(
        State(state),
        Extension(txn_arc),
        Query(RuleListQuery {
            page: query.page,
            page_size: query.page_size,
            workflow_id: query.workflow_id,
            rule_type: query.rule_type,
            status: query.status,
        }),
    )
    .await
}

pub async fn set_rule_status(
    scope: &mut ScopedTxn<'_>,
    id: Uuid,
    status: &str,
) -> ApiResponse<serde_json::Value> {
    let res = sqlx::query(
        r#"UPDATE public.core_flow_rules SET status = $2, updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(id)
    .bind(status)
    .execute(&mut *scope)
    .await;

    match res {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"id": id, "status": status}), "操作成功")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string())),
        Err(e) => {
            tracing::error!("更新规则状态失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新规则状态失败".to_string()))
        }
    }
}

pub async fn activate_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化启用规则事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化启用规则事务作用域失败".to_string(),
            ));
        }
    };
    set_rule_status(&mut scope, id, "active").await
}

pub async fn deactivate_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化停用规则事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化停用规则事务作用域失败".to_string(),
            ));
        }
    };
    set_rule_status(&mut scope, id, "inactive").await
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/flow/rules/batch-update",
    tag = "Core-Flow",
    responses((status = 200, description = "/flow/rules/batch-update post"), (status = 500, description = "服务内部错误")),
)]
pub async fn batch_update_rules(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<BatchUpdateRulesRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化批量更新规则事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化批量更新规则事务作用域失败".to_string(),
            ));
        }
    };
    if payload.rules.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "规则列表不能为空".to_string(),
        ));
    }
    let mut updated = 0usize;
    for rule in payload.rules {
        let res = sqlx::query(
            r#"UPDATE public.core_flow_rules
               SET name = $2, workflow_id = $3, node_id = $4, rule_type = $5,
                   condition = $6, action = $7, priority = $8, status = $9,
                   description = $10, updated_at = NOW()
               WHERE id = $1 AND deleted_at IS NULL"#,
        )
        .bind(rule.id)
        .bind(rule.name)
        .bind(rule.workflow_id)
        .bind(rule.node_id)
        .bind(rule.rule_type)
        .bind(rule.condition)
        .bind(rule.action)
        .bind(rule.priority)
        .bind(rule.status)
        .bind(rule.description)
        .execute(&mut scope)
        .await;
        match res {
            Ok(r) if r.rows_affected() > 0 => updated += 1,
            Ok(_) => {}
            Err(e) => {
                drop(scope);
                if let Some(txn) = guard.take() {
                    let _ = txn.rollback().await;
                }
                tracing::error!("批量更新规则失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("批量更新规则失败".to_string()));
            }
        }
    }
    ApiResponse::success(serde_json::json!({"updated": updated}), "批量更新成功")
}
