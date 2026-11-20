//! Delegate submodule - Workflow delegate (approval entrustment) management handlers
//!
//! 契约对齐：apps/web/src/api/workflow/delegate.ts（apiClient.workflow base = /api/core/flow）
//!   GET    /delegates                       list（分页 + delegator/attorney/status 过滤）
//!   GET    /delegates/{id}                  get
//!   POST   /delegates                       create
//!   PUT    /delegates/{id}                  update
//!   DELETE /delegates/{id}                  delete（软删）
//!   POST   /delegates/{id}/activate         启用
//!   POST   /delegates/{id}/deactivate       停用
//!   GET    /delegates/my                    我发起的委托（Claims.sub）
//!   GET    /delegates/my/attorneys          我作为受托人（Claims.sub）
//!   GET    /delegates/active                有效委托（可选 userId 过滤）
//!   GET    /delegates/{id}/workflows        委托关联的工作流
//!   GET    /delegates/check/{workflowId}    检查该流程下是否有委托

use crate::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_core::TopemsError;
use utoipa::ToSchema;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::{ApiResponse, PaginatedResponse};
use topems_shared_db::scope::ScopedTxn;

#[derive(Debug, FromRow)]
pub struct DelegateRow {
    pub id: Uuid,
    pub delegator_id: Uuid,
    pub attorney_id: Uuid,
    pub workflow_id: Option<Uuid>,
    pub scope: String,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WorkflowDelegate {
    pub id: Uuid,
    pub delegator_id: Uuid,
    pub attorney_id: Uuid,
    pub workflow_id: Option<Uuid>,
    pub scope: String,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<DelegateRow> for WorkflowDelegate {
    fn from(r: DelegateRow) -> Self {
        WorkflowDelegate {
            id: r.id,
            delegator_id: r.delegator_id,
            attorney_id: r.attorney_id,
            workflow_id: r.workflow_id,
            scope: r.scope,
            start_date: r.start_date,
            end_date: r.end_date,
            reason: r.reason,
            status: r.status,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct DelegateListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub delegator_id: Option<Uuid>,
    pub attorney_id: Option<Uuid>,
    pub status: Option<String>,
    pub user_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDelegateRequest {
    pub delegator_id: Option<Uuid>,
    pub attorney_id: Uuid,
    pub workflow_id: Option<Uuid>,
    pub scope: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDelegateRequest {
    pub attorney_id: Option<Uuid>,
    pub workflow_id: Option<Uuid>,
    pub scope: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub reason: Option<String>,
    pub status: Option<String>,
}

const COLUMNS: &str = "id, delegator_id, attorney_id, workflow_id, scope, start_date, end_date, reason, status, created_at, updated_at";

pub async fn list_delegates(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(query): Query<DelegateListQuery>,
) -> ApiResponse<PaginatedResponse<WorkflowDelegate>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化委托列表事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化委托列表事务作用域失败".to_string(),
            ));
        }
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let delegator_id = query.delegator_id;
    let attorney_id = query.attorney_id;
    let status = query.status.filter(|s| !s.is_empty());

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM public.core_flow_delegates
           WHERE deleted_at IS NULL
             AND ($1::uuid IS NULL OR delegator_id = $1)
             AND ($2::uuid IS NULL OR attorney_id = $2)
             AND ($3::text IS NULL OR status = $3)"#,
    )
    .bind(delegator_id)
    .bind(attorney_id)
    .bind(status.clone())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询委托总数失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询委托总数失败".to_string()));
        }
    };

    let rows: Vec<DelegateRow> = match sqlx::query_as(
        r#"SELECT id, delegator_id, attorney_id, workflow_id, scope, start_date, end_date, reason, status, created_at, updated_at
           FROM public.core_flow_delegates
           WHERE deleted_at IS NULL
             AND ($1::uuid IS NULL OR delegator_id = $1)
             AND ($2::uuid IS NULL OR attorney_id = $2)
             AND ($3::text IS NULL OR status = $3)
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#,
    )
    .bind(delegator_id)
    .bind(attorney_id)
    .bind(status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询委托列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询委托列表失败".to_string()));
        }
    };

    let items: Vec<WorkflowDelegate> = rows.into_iter().map(WorkflowDelegate::from).collect();
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

pub async fn get_delegate(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<WorkflowDelegate> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化委托详情事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化委托详情事务作用域失败".to_string(),
            ));
        }
    };
    let row: Option<DelegateRow> = match sqlx::query_as(
        r#"SELECT id, delegator_id, attorney_id, workflow_id, scope, start_date, end_date, reason, status, created_at, updated_at
           FROM public.core_flow_delegates WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询委托失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询委托失败".to_string()));
        }
    };
    match row {
        Some(r) => ApiResponse::success(WorkflowDelegate::from(r), "查询成功"),
        None => ApiResponse::from(TopemsError::ResourceNotFound("委托不存在".to_string())),
    }
}

pub async fn create_delegate(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateDelegateRequest>,
) -> ApiResponse<WorkflowDelegate> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化创建委托事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化创建委托事务作用域失败".to_string(),
            ));
        }
    };
    let delegator_id = payload
        .delegator_id
        .or_else(|| Uuid::parse_str(&claims.sub).ok())
        .unwrap_or(Uuid::nil());
    let scope_name = payload.scope.unwrap_or_else(|| "all".to_string());

    let row: Option<DelegateRow> = match sqlx::query_as(
        r#"INSERT INTO public.core_flow_delegates
             (tenant_id, delegator_id, attorney_id, workflow_id, scope, start_date, end_date, reason)
           VALUES ((NULLIF(current_setting('app.tenant_id', true), ''))::uuid,
                   $1, $2, $3, $4, $5, $6, $7)
           RETURNING id, delegator_id, attorney_id, workflow_id, scope, start_date, end_date, reason, status, created_at, updated_at"#,
    )
    .bind(delegator_id)
    .bind(payload.attorney_id)
    .bind(payload.workflow_id)
    .bind(scope_name)
    .bind(payload.start_date)
    .bind(payload.end_date)
    .bind(payload.reason)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建委托失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建委托失败".to_string()));
        }
    };

    match row {
        Some(r) => ApiResponse::success(WorkflowDelegate::from(r), "创建成功"),
        None => ApiResponse::from(TopemsError::Internal("创建委托失败".to_string())),
    }
}

pub async fn update_delegate(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDelegateRequest>,
) -> ApiResponse<WorkflowDelegate> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化更新委托事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化更新委托事务作用域失败".to_string(),
            ));
        }
    };
    let row: Option<DelegateRow> = match sqlx::query_as(
        r#"UPDATE public.core_flow_delegates
           SET attorney_id = COALESCE($2, attorney_id),
               workflow_id = $3,
               scope = COALESCE($4, scope),
               start_date = $5,
               end_date = $6,
               reason = COALESCE($7, reason),
               status = COALESCE($8, status),
               updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING id, delegator_id, attorney_id, workflow_id, scope, start_date, end_date, reason, status, created_at, updated_at"#,
    )
    .bind(id)
    .bind(payload.attorney_id)
    .bind(payload.workflow_id)
    .bind(payload.scope)
    .bind(payload.start_date)
    .bind(payload.end_date)
    .bind(payload.reason)
    .bind(payload.status)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新委托失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新委托失败".to_string()));
        }
    };

    match row {
        Some(r) => ApiResponse::success(WorkflowDelegate::from(r), "更新成功"),
        None => ApiResponse::from(TopemsError::ResourceNotFound("委托不存在".to_string())),
    }
}

pub async fn delete_delegate(
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
            tracing::error!("初始化删除委托事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化删除委托事务作用域失败".to_string(),
            ));
        }
    };
    let res = sqlx::query(
        r#"UPDATE public.core_flow_delegates SET deleted_at = NOW(), updated_at = NOW()
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
            ApiResponse::from(TopemsError::ResourceNotFound("委托不存在".to_string()))
        }
        Err(e) => {
            drop(scope);
            if let Some(txn) = guard.take() {
                let _ = txn.rollback().await;
            }
            tracing::error!("删除委托失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除委托失败".to_string()))
        }
    }
}

pub async fn set_delegate_status(
    scope: &mut ScopedTxn<'_>,
    id: Uuid,
    status: &str,
) -> ApiResponse<serde_json::Value> {
    let res = sqlx::query(
        r#"UPDATE public.core_flow_delegates SET status = $2, updated_at = NOW()
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
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("委托不存在".to_string())),
        Err(e) => {
            tracing::error!("更新委托状态失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新委托状态失败".to_string()))
        }
    }
}

pub async fn activate_delegate(
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
            tracing::error!("初始化启用委托事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化启用委托事务作用域失败".to_string(),
            ));
        }
    };
    set_delegate_status(&mut scope, id, "active").await
}

pub async fn deactivate_delegate(
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
            tracing::error!("初始化停用委托事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化停用委托事务作用域失败".to_string(),
            ));
        }
    };
    set_delegate_status(&mut scope, id, "inactive").await
}

pub async fn get_my_delegates(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<DelegateListQuery>,
) -> ApiResponse<PaginatedResponse<WorkflowDelegate>> {
    let uid = Uuid::parse_str(&claims.sub).unwrap_or(Uuid::nil());
    list_delegates(
        State(state),
        Extension(txn_arc),
        Query(DelegateListQuery {
            page: query.page,
            page_size: query.page_size,
            delegator_id: Some(uid),
            attorney_id: None,
            status: query.status,
            user_id: None,
        }),
    )
    .await
}

pub async fn get_my_attorneys(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<DelegateListQuery>,
) -> ApiResponse<PaginatedResponse<WorkflowDelegate>> {
    let uid = Uuid::parse_str(&claims.sub).unwrap_or(Uuid::nil());
    list_delegates(
        State(state),
        Extension(txn_arc),
        Query(DelegateListQuery {
            page: query.page,
            page_size: query.page_size,
            delegator_id: None,
            attorney_id: Some(uid),
            status: query.status,
            user_id: None,
        }),
    )
    .await
}

pub async fn get_active_delegate(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<DelegateListQuery>,
) -> ApiResponse<Vec<WorkflowDelegate>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化有效委托事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化有效委托事务作用域失败".to_string(),
            ));
        }
    };
    let uid = query.user_id.or_else(|| Uuid::parse_str(&claims.sub).ok());
    let rows: Vec<DelegateRow> = match sqlx::query_as(
        r#"SELECT id, delegator_id, attorney_id, workflow_id, scope, start_date, end_date, reason, status, created_at, updated_at
           FROM public.core_flow_delegates
           WHERE deleted_at IS NULL
             AND ($1::uuid IS NULL OR delegator_id = $1)
             AND status = 'active'
             AND (start_date IS NULL OR start_date <= CURRENT_DATE)
             AND (end_date IS NULL OR end_date >= CURRENT_DATE)
           ORDER BY created_at DESC"#,
    )
    .bind(uid)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询有效委托失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询有效委托失败".to_string()));
        }
    };
    let items: Vec<WorkflowDelegate> = rows.into_iter().map(WorkflowDelegate::from).collect();
    ApiResponse::success(items, "查询成功")
}

pub async fn get_delegate_workflows(
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
            tracing::error!("初始化委托工作流事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化委托工作流事务作用域失败".to_string(),
            ));
        }
    };
    let row: Option<DelegateRow> = match sqlx::query_as(
        r#"SELECT id, delegator_id, attorney_id, workflow_id, scope, start_date, end_date, reason, status, created_at, updated_at
           FROM public.core_flow_delegates WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询委托失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询委托失败".to_string()));
        }
    };

    match row {
        Some(r) => {
            if let Some(wf_id) = r.workflow_id {
                let wf: Option<serde_json::Value> = match sqlx::query_scalar(
                    r#"SELECT json_build_object('id', id, 'name', name, 'status', status)
                       FROM public.core_workflows WHERE id = $1 AND deleted_at IS NULL"#,
                )
                .bind(wf_id)
                .fetch_optional(&mut scope)
                .await
                {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::error!("查询委托关联流程失败: {}", e);
                        return ApiResponse::from(TopemsError::Internal(
                            "查询委托关联流程失败".to_string(),
                        ));
                    }
                };
                ApiResponse::success(
                    serde_json::json!({
                        "delegate_id": r.id,
                        "workflow_id": wf_id,
                        "workflow": wf.unwrap_or(serde_json::Value::Null),
                    }),
                    "查询成功",
                )
            } else {
                ApiResponse::success(
                    serde_json::json!({
                        "delegate_id": r.id,
                        "workflow_id": null,
                        "workflow": null,
                    }),
                    "查询成功",
                )
            }
        }
        None => ApiResponse::from(TopemsError::ResourceNotFound("委托不存在".to_string())),
    }
}

pub async fn check_delegation(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(workflow_id): Path<Uuid>,
    Query(query): Query<DelegateListQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化委托检查事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化委托检查事务作用域失败".to_string(),
            ));
        }
    };
    let uid = query.user_id;
    let rows: Vec<DelegateRow> = match sqlx::query_as(
        r#"SELECT id, delegator_id, attorney_id, workflow_id, scope, start_date, end_date, reason, status, created_at, updated_at
           FROM public.core_flow_delegates
           WHERE deleted_at IS NULL
             AND ($1::uuid IS NULL OR delegator_id = $1)
             AND status = 'active'
             AND (workflow_id IS NULL OR workflow_id = $2)
             AND (start_date IS NULL OR start_date <= CURRENT_DATE)
             AND (end_date IS NULL OR end_date >= CURRENT_DATE)
           ORDER BY created_at DESC"#,
    )
    .bind(uid)
    .bind(workflow_id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("检查委托失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("检查委托失败".to_string()));
        }
    };
    let items: Vec<WorkflowDelegate> = rows.into_iter().map(WorkflowDelegate::from).collect();
    ApiResponse::success(
        serde_json::json!({"delegated": !items.is_empty(), "delegates": items}),
        "查询成功",
    )
}
