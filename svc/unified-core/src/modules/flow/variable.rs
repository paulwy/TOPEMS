//! Variable submodule - Workflow variable management handlers
//!
//! 契约对齐：apps/web/src/api/workflow/variable.ts（apiClient.workflow base = /api/core/flow）
//!   GET    /variables/instance/{instanceId}              list（分页）
//!   POST   /variables/instance/{instanceId}              批量 set（Json {variables: {}}）
//!   GET    /variables/instance/{instanceId}/{key}        get
//!   POST   /variables/instance/{instanceId}/{key}        set
//!   DELETE /variables/instance/{instanceId}/{key}        delete
//!   GET    /variables/instance/{instanceId}/scope/{scope} 按作用域取
//!   GET    /variables/instance/{instanceId}/{key}/history 变更历史
//!   GET    /variables/task/{taskId}                      task 变量
//!   POST   /variables/task/{taskId}/{key}                set task 变量
//!   GET    /variables/global/{workflowId}                global 变量
//!   POST   /variables/global/{workflowId}/{key}          set global 变量

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
pub struct VariableRow {
    pub id: Uuid,
    pub scope: String,
    pub instance_id: Option<Uuid>,
    pub task_id: Option<Uuid>,
    pub workflow_id: Option<Uuid>,
    pub var_key: String,
    pub var_value: serde_json::Value,
    pub value_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct WorkflowVariable {
    pub id: Uuid,
    pub scope: String,
    pub instance_id: Option<Uuid>,
    pub task_id: Option<Uuid>,
    pub workflow_id: Option<Uuid>,
    pub key: String,
    pub value: serde_json::Value,
    pub value_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<VariableRow> for WorkflowVariable {
    fn from(r: VariableRow) -> Self {
        WorkflowVariable {
            id: r.id,
            scope: r.scope,
            instance_id: r.instance_id,
            task_id: r.task_id,
            workflow_id: r.workflow_id,
            key: r.var_key,
            value: r.var_value,
            value_type: r.value_type,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}

#[derive(Debug, FromRow)]
pub struct VariableHistoryRow {
    pub id: Uuid,
    pub var_key: String,
    pub var_value: serde_json::Value,
    pub value_type: String,
    pub changed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct VariableHistory {
    pub id: Uuid,
    pub key: String,
    pub value: serde_json::Value,
    pub value_type: String,
    pub changed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

impl From<VariableHistoryRow> for VariableHistory {
    fn from(r: VariableHistoryRow) -> Self {
        VariableHistory {
            id: r.id,
            key: r.var_key,
            value: r.var_value,
            value_type: r.value_type,
            changed_by: r.changed_by,
            created_at: r.created_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct VariableListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct SetVariableRequest {
    pub value: serde_json::Value,
    pub value_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SetVariablesBatchRequest {
    pub variables: std::collections::HashMap<String, serde_json::Value>,
}

const COLUMNS: &str = "id, scope, instance_id, task_id, workflow_id, var_key, var_value, value_type, created_at, updated_at";

async fn upsert_variable(
    tx: &mut ScopedTxn<'_>,
    scope: &str,
    instance_id: Option<Uuid>,
    task_id: Option<Uuid>,
    workflow_id: Option<Uuid>,
    key: &str,
    value: serde_json::Value,
    value_type: Option<String>,
) -> Result<Option<VariableRow>, sqlx::Error> {
    let vt = value_type.unwrap_or_else(|| infer_value_type(&value));
    // 先写历史（旧值快照）
    let _ = sqlx::query(
        r#"INSERT INTO core_flow_variable_history (tenant_id, variable_id, var_key, var_value, value_type, changed_by)
           SELECT (NULLIF(current_setting('app.tenant_id', true), ''))::uuid,
                  id, var_key, var_value, value_type, NULL
           FROM core_flow_variables
           WHERE scope = $1
             AND ($2::uuid IS NULL OR instance_id = $2)
             AND ($3::uuid IS NULL OR task_id = $3)
             AND ($4::uuid IS NULL OR workflow_id = $4)
             AND var_key = $5 AND deleted_at IS NULL"#,
    )
    .bind(scope)
    .bind(instance_id)
    .bind(task_id)
    .bind(workflow_id)
    .bind(key)
    .execute(&mut *tx)
    .await;

    sqlx::query_as::<_, VariableRow>(
        r#"INSERT INTO core_flow_variables (tenant_id, scope, instance_id, task_id, workflow_id, var_key, var_value, value_type)
           VALUES ((NULLIF(current_setting('app.tenant_id', true), ''))::uuid, $1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (scope, instance_id, task_id, workflow_id, var_key)
             WHERE deleted_at IS NULL
           DO UPDATE SET var_value = EXCLUDED.var_value, value_type = EXCLUDED.value_type, updated_at = NOW()
           RETURNING id, scope, instance_id, task_id, workflow_id, var_key, var_value, value_type, created_at, updated_at"#,
    )
    .bind(scope)
    .bind(instance_id)
    .bind(task_id)
    .bind(workflow_id)
    .bind(key)
    .bind(value)
    .bind(vt)
    .fetch_optional(&mut *tx)
    .await
}

fn infer_value_type(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::Null => "null".to_string(),
        serde_json::Value::Bool(_) => "boolean".to_string(),
        serde_json::Value::Number(_) => "number".to_string(),
        serde_json::Value::String(_) => "string".to_string(),
        serde_json::Value::Array(_) => "array".to_string(),
        serde_json::Value::Object(_) => "object".to_string(),
    }
}

async fn find_variable(
    tx: &mut ScopedTxn<'_>,
    scope: &str,
    instance_id: Option<Uuid>,
    task_id: Option<Uuid>,
    workflow_id: Option<Uuid>,
    key: &str,
) -> Result<Option<VariableRow>, sqlx::Error> {
    sqlx::query_as::<_, VariableRow>(
        r#"SELECT id, scope, instance_id, task_id, workflow_id, var_key, var_value, value_type, created_at, updated_at
           FROM core_flow_variables
           WHERE scope = $1
             AND ($2::uuid IS NULL OR instance_id = $2)
             AND ($3::uuid IS NULL OR task_id = $3)
             AND ($4::uuid IS NULL OR workflow_id = $4)
             AND var_key = $5 AND deleted_at IS NULL"#,
    )
    .bind(scope)
    .bind(instance_id)
    .bind(task_id)
    .bind(workflow_id)
    .bind(key)
    .fetch_optional(&mut *tx)
    .await
}

async fn delete_variable(
    tx: &mut ScopedTxn<'_>,
    scope: &str,
    instance_id: Option<Uuid>,
    task_id: Option<Uuid>,
    workflow_id: Option<Uuid>,
    key: &str,
) -> Result<u64, sqlx::Error> {
    let r = sqlx::query(
        r#"UPDATE core_flow_variables SET deleted_at = NOW(), updated_at = NOW()
           WHERE scope = $1
             AND ($2::uuid IS NULL OR instance_id = $2)
             AND ($3::uuid IS NULL OR task_id = $3)
             AND ($4::uuid IS NULL OR workflow_id = $4)
             AND var_key = $5 AND deleted_at IS NULL"#,
    )
    .bind(scope)
    .bind(instance_id)
    .bind(task_id)
    .bind(workflow_id)
    .bind(key)
    .execute(&mut *tx)
    .await?;
    Ok(r.rows_affected())
}

async fn list_variables(
    tx: &mut ScopedTxn<'_>,
    scope: &str,
    instance_id: Option<Uuid>,
    task_id: Option<Uuid>,
    workflow_id: Option<Uuid>,
    page: i64,
    page_size: i64,
) -> Result<(Vec<VariableRow>, i64), sqlx::Error> {
    let offset = (page - 1) * page_size;
    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_flow_variables
           WHERE scope = $1
             AND ($2::uuid IS NULL OR instance_id = $2)
             AND ($3::uuid IS NULL OR task_id = $3)
             AND ($4::uuid IS NULL OR workflow_id = $4)
             AND deleted_at IS NULL"#,
    )
    .bind(scope)
    .bind(instance_id)
    .bind(task_id)
    .bind(workflow_id)
    .fetch_one(&mut *tx)
    .await?;
    let rows = sqlx::query_as::<_, VariableRow>(
        r#"SELECT id, scope, instance_id, task_id, workflow_id, var_key, var_value, value_type, created_at, updated_at
           FROM core_flow_variables
           WHERE scope = $1
             AND ($2::uuid IS NULL OR instance_id = $2)
             AND ($3::uuid IS NULL OR task_id = $3)
             AND ($4::uuid IS NULL OR workflow_id = $4)
             AND deleted_at IS NULL
           ORDER BY updated_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(scope)
    .bind(instance_id)
    .bind(task_id)
    .bind(workflow_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut *tx)
    .await?;
    Ok((rows, total))
}

// ===== instance 作用域 =====

pub async fn list_instance_variables(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(instance_id): Path<Uuid>,
    Query(query): Query<VariableListQuery>,
) -> ApiResponse<PaginatedResponse<WorkflowVariable>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化实例变量事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化实例变量事务作用域失败".to_string(),
            ));
        }
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(50).min(200);
    match list_variables(
        &mut scope,
        "instance",
        Some(instance_id),
        None,
        None,
        page,
        page_size,
    )
    .await
    {
        Ok((rows, total)) => {
            let items: Vec<WorkflowVariable> =
                rows.into_iter().map(WorkflowVariable::from).collect();
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
        Err(e) => {
            tracing::error!("查询实例变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询实例变量失败".to_string()))
        }
    }
}

pub async fn get_instance_variable(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((instance_id, key)): Path<(Uuid, String)>,
) -> ApiResponse<WorkflowVariable> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化实例变量事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化实例变量事务作用域失败".to_string(),
            ));
        }
    };
    match find_variable(&mut scope, "instance", Some(instance_id), None, None, &key).await {
        Ok(Some(r)) => ApiResponse::success(WorkflowVariable::from(r), "查询成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("变量不存在".to_string())),
        Err(e) => {
            tracing::error!("查询实例变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询实例变量失败".to_string()))
        }
    }
}

pub async fn set_instance_variable(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((instance_id, key)): Path<(Uuid, String)>,
    Json(payload): Json<SetVariableRequest>,
) -> ApiResponse<WorkflowVariable> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化实例变量事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化实例变量事务作用域失败".to_string(),
            ));
        }
    };
    match upsert_variable(
        &mut scope,
        "instance",
        Some(instance_id),
        None,
        None,
        &key,
        payload.value,
        payload.value_type,
    )
    .await
    {
        Ok(Some(r)) => ApiResponse::success(WorkflowVariable::from(r), "设置成功"),
        Ok(None) => ApiResponse::from(TopemsError::Internal("设置变量失败".to_string())),
        Err(e) => {
            tracing::error!("设置实例变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("设置实例变量失败".to_string()))
        }
    }
}

pub async fn set_instance_variables_batch(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(instance_id): Path<Uuid>,
    Json(payload): Json<SetVariablesBatchRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化批量设置变量事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化批量设置变量事务作用域失败".to_string(),
            ));
        }
    };
    let mut updated = 0usize;
    for (key, value) in payload.variables {
        match upsert_variable(
            &mut scope,
            "instance",
            Some(instance_id),
            None,
            None,
            &key,
            value,
            None,
        )
        .await
        {
            Ok(Some(_)) => updated += 1,
            Ok(None) => {}
            Err(e) => {
                drop(scope);
                if let Some(txn) = guard.take() {
                    let _ = txn.rollback().await;
                }
                tracing::error!("批量设置实例变量失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "批量设置实例变量失败".to_string(),
                ));
            }
        }
    }
    ApiResponse::success(serde_json::json!({"updated": updated}), "批量设置成功")
}

pub async fn delete_instance_variable(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((instance_id, key)): Path<(Uuid, String)>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化删除变量事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化删除变量事务作用域失败".to_string(),
            ));
        }
    };
    match delete_variable(&mut scope, "instance", Some(instance_id), None, None, &key).await {
        Ok(n) if n > 0 => ApiResponse::success(serde_json::json!({"deleted": n}), "删除成功"),
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("变量不存在".to_string())),
        Err(e) => {
            tracing::error!("删除实例变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除实例变量失败".to_string()))
        }
    }
}

pub async fn get_variables_by_scope(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((instance_id, scope)): Path<(Uuid, String)>,
) -> ApiResponse<Vec<WorkflowVariable>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化变量作用域查询事务失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化变量作用域查询事务失败".to_string(),
            ));
        }
    };
    let scope = match scope.as_str() {
        "global" | "local" => scope,
        other => {
            tracing::warn!("未知变量作用域: {}", other);
            return ApiResponse::from(TopemsError::ValidationFailed("未知变量作用域".to_string()));
        }
    };
    match list_variables(&mut db_scope, &scope, Some(instance_id), None, None, 1, 500).await {
        Ok((rows, _)) => {
            let items: Vec<WorkflowVariable> =
                rows.into_iter().map(WorkflowVariable::from).collect();
            ApiResponse::success(items, "查询成功")
        }
        Err(e) => {
            tracing::error!("查询作用域变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询作用域变量失败".to_string()))
        }
    }
}

pub async fn get_variable_history(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((instance_id, key)): Path<(Uuid, String)>,
    Query(query): Query<VariableListQuery>,
) -> ApiResponse<PaginatedResponse<VariableHistory>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化变量历史事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化变量历史事务作用域失败".to_string(),
            ));
        }
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(50).min(200);
    let offset = (page - 1) * page_size;
    let rows: Vec<VariableHistoryRow> = match sqlx::query_as(
        r#"SELECT h.id, h.var_key, h.var_value, h.value_type, h.changed_by, h.created_at
           FROM core_flow_variable_history h
           JOIN core_flow_variables v ON v.id = h.variable_id
           WHERE v.scope = 'instance' AND v.instance_id = $1 AND v.var_key = $2
           ORDER BY h.created_at DESC
           LIMIT $3 OFFSET $4"#,
    )
    .bind(instance_id)
    .bind(&key)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询变量历史失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询变量历史失败".to_string()));
        }
    };
    let total = i64::try_from(rows.len()).unwrap_or(0);
    let items: Vec<VariableHistory> = rows.into_iter().map(VariableHistory::from).collect();
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

// ===== task 作用域 =====

pub async fn list_task_variables(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(task_id): Path<Uuid>,
    Query(query): Query<VariableListQuery>,
) -> ApiResponse<PaginatedResponse<WorkflowVariable>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化任务变量事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化任务变量事务作用域失败".to_string(),
            ));
        }
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(50).min(200);
    match list_variables(
        &mut scope,
        "task",
        None,
        Some(task_id),
        None,
        page,
        page_size,
    )
    .await
    {
        Ok((rows, total)) => {
            let items: Vec<WorkflowVariable> =
                rows.into_iter().map(WorkflowVariable::from).collect();
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
        Err(e) => {
            tracing::error!("查询任务变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询任务变量失败".to_string()))
        }
    }
}

pub async fn set_task_variable(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((task_id, key)): Path<(Uuid, String)>,
    Json(payload): Json<SetVariableRequest>,
) -> ApiResponse<WorkflowVariable> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化任务变量事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化任务变量事务作用域失败".to_string(),
            ));
        }
    };
    match upsert_variable(
        &mut scope,
        "task",
        None,
        Some(task_id),
        None,
        &key,
        payload.value,
        payload.value_type,
    )
    .await
    {
        Ok(Some(r)) => ApiResponse::success(WorkflowVariable::from(r), "设置成功"),
        Ok(None) => ApiResponse::from(TopemsError::Internal("设置变量失败".to_string())),
        Err(e) => {
            tracing::error!("设置任务变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("设置任务变量失败".to_string()))
        }
    }
}

// ===== global 作用域 =====

pub async fn get_global_variables(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(workflow_id): Path<Uuid>,
    Query(query): Query<VariableListQuery>,
) -> ApiResponse<PaginatedResponse<WorkflowVariable>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化全局变量事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化全局变量事务作用域失败".to_string(),
            ));
        }
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(50).min(200);
    match list_variables(
        &mut scope,
        "global",
        None,
        None,
        Some(workflow_id),
        page,
        page_size,
    )
    .await
    {
        Ok((rows, total)) => {
            let items: Vec<WorkflowVariable> =
                rows.into_iter().map(WorkflowVariable::from).collect();
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
        Err(e) => {
            tracing::error!("查询全局变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询全局变量失败".to_string()))
        }
    }
}

pub async fn set_global_variable(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((workflow_id, key)): Path<(Uuid, String)>,
    Json(payload): Json<SetVariableRequest>,
) -> ApiResponse<WorkflowVariable> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化全局变量事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化全局变量事务作用域失败".to_string(),
            ));
        }
    };
    match upsert_variable(
        &mut scope,
        "global",
        None,
        None,
        Some(workflow_id),
        &key,
        payload.value,
        payload.value_type,
    )
    .await
    {
        Ok(Some(r)) => ApiResponse::success(WorkflowVariable::from(r), "设置成功"),
        Ok(None) => ApiResponse::from(TopemsError::Internal("设置变量失败".to_string())),
        Err(e) => {
            tracing::error!("设置全局变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("设置全局变量失败".to_string()))
        }
    }
}
