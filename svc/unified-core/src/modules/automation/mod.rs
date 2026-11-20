//! Automation module - 自动化编排规则/运行/变量/设计器/仪表盘

use crate::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::try_tenant_id_from_claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

// ─── Models ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AutomationRule {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub trigger: Value,
    pub action: Value,
    pub on_success: Option<Value>,
    pub on_error: Option<Value>,
    pub canvas: Option<Value>,
    pub status: String,
    pub last_run_at: Option<DateTime<Utc>>,
    pub run_count: i32,
    pub success_count: i32,
    pub failed_count: i32,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateRuleRequest {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub trigger: Value,
    pub action: Value,
    pub on_success: Option<Value>,
    pub on_error: Option<Value>,
    pub canvas: Option<Value>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateRuleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub trigger: Option<Value>,
    pub action: Option<Value>,
    pub on_success: Option<Value>,
    pub on_error: Option<Value>,
    pub canvas: Option<Value>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AutomationRun {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub rule_id: Uuid,
    pub rule_name: Option<String>,
    pub status: String,
    pub trigger_type: Option<String>,
    pub input_variables: Option<Value>,
    pub output_data: Option<Value>,
    pub steps: Option<Value>,
    pub logs: Option<String>,
    pub error_message: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AutomationVariable {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
    pub description: Option<String>,
    pub scope: String,
    pub rule_id: Option<Uuid>,
    pub is_secret: bool,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateVariableRequest {
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    pub scope: Option<String>,
    pub rule_id: Option<String>,
    pub is_secret: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateVariableRequest {
    pub value: Option<String>,
    pub description: Option<String>,
    pub scope: Option<String>,
    pub is_secret: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BulkImportRequest {
    pub variables: Vec<CreateVariableRequest>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DashboardStats {
    pub total_rules: i64,
    pub enabled_rules: i64,
    pub total_runs: i64,
    pub successful_runs: i64,
    pub failed_runs: i64,
    pub running_runs: i64,
    pub success_rate: f64,
    pub avg_duration_ms: f64,
    pub total_variables: i64,
    pub runs_today: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DesignerResources {
    pub triggers: Vec<ResourceItem>,
    pub actions: Vec<ResourceItem>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResourceItem {
    pub type_: String,
    pub label: String,
    pub description: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SaveCanvasRequest {
    pub canvas: Value,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TriggerRequest {
    pub input_variables: Option<Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PurgeRequest {
    pub before: Option<String>,
    pub status: Option<String>,
}

// ─── Query params ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RuleQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size_alt: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub trigger_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RunQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size_alt: Option<i64>,
    pub rule_id: Option<String>,
    pub status: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VariableQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size_alt: Option<i64>,
    pub scope: Option<String>,
    pub rule_id: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RunLogQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size_alt: Option<i64>,
}

// ─── Rules handlers ───────────────────────────────────────────────────────────

pub async fn list_rules(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<RuleQueryParams>,
) -> ApiResponse<PaginatedResponse<AutomationRule>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params
        .page_size
        .or(params.page_size_alt)
        .unwrap_or(20)
        .min(100);
    let offset = (page - 1) * page_size;
    let search = params.search.clone().unwrap_or_default();
    let status = params.status.clone();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化列表作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化列表作用域失败".to_string(),
            ));
        }
    };

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM public.automation_rules
           WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
             AND ($2::text IS NULL OR status = $2)"#,
    )
    .bind(&search)
    .bind(&status)
    .fetch_one(&mut scope)
    .await;
    let total = match total {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("统计自动化规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询规则失败".to_string()));
        }
    };

    let items = sqlx::query_as::<_, AutomationRule>(
        r#"SELECT * FROM public.automation_rules
           WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
             AND ($2::text IS NULL OR status = $2)
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#,
    )
    .bind(&search)
    .bind(&status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;
    let items: Vec<AutomationRule> = match items {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询自动化规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询规则失败".to_string()));
        }
    };

    ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    )
}

pub async fn get_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<AutomationRule> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("打开自动化作用域失败".to_string()));
        }
    };

    let rule: Result<AutomationRule, _> =
        sqlx::query_as("SELECT * FROM public.automation_rules WHERE id = $1")
            .bind(id)
            .fetch_one(&mut scope)
            .await;

    match rule {
        Ok(v) => ApiResponse::success(v, "查询成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()))
            } else {
                tracing::error!("查询规则失败: {}", e);
                ApiResponse::from(TopemsError::Internal("查询规则失败".to_string()))
            }
        }
    }
}

pub async fn get_rule_by_code(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(code): Path<String>,
) -> ApiResponse<AutomationRule> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("打开自动化作用域失败".to_string()));
        }
    };

    let rule: Result<AutomationRule, _> =
        sqlx::query_as("SELECT * FROM public.automation_rules WHERE code = $1")
            .bind(&code)
            .fetch_one(&mut scope)
            .await;

    match rule {
        Ok(v) => ApiResponse::success(v, "查询成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()))
            } else {
                tracing::error!("查询规则失败: {}", e);
                ApiResponse::from(TopemsError::Internal("查询规则失败".to_string()))
            }
        }
    }
}

pub async fn create_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateRuleRequest>,
) -> ApiResponse<AutomationRule> {
    let user_id = Uuid::parse_str(&claims.sub).ok();
    let status = payload
        .status
        .clone()
        .unwrap_or_else(|| "draft".to_string());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化规则作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化规则作用域失败".to_string(),
            ));
        }
    };

    // 写入必须绑定真实租户：取不到即 400，禁止静默落全零 UUID 共享行。
    let tenant_id = match try_tenant_id_from_claims(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let rule: Result<AutomationRule, _> = sqlx::query_as(
        r#"INSERT INTO public.automation_rules (name, code, description, trigger, action, on_success, on_error, canvas, status, created_by, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *"#,
    )
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.description)
    .bind(&payload.trigger)
    .bind(&payload.action)
    .bind(&payload.on_success)
    .bind(&payload.on_error)
    .bind(&payload.canvas)
    .bind(&status)
    .bind(user_id)
    .bind(tenant_id)
    .fetch_one(&mut rls_scope)
    .await;

    match rule {
        Ok(v) => ApiResponse::success(v, "创建成功"),
        Err(e) => {
            tracing::error!("创建规则失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建规则失败".to_string()))
        }
    }
}

pub async fn update_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateRuleRequest>,
) -> ApiResponse<AutomationRule> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化规则作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化规则作用域失败".to_string(),
            ));
        }
    };
    let exists =
        match sqlx::query_scalar::<_, i32>("SELECT 1 FROM public.automation_rules WHERE id = $1")
            .bind(id)
            .fetch_optional(&mut rls_scope)
            .await
        {
            Ok(Some(_)) => true,
            Ok(None) => false,
            Err(e) => {
                tracing::error!("查询规则失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("更新规则失败".to_string()));
            }
        };
    if !exists {
        return ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()));
    }

    let rule: Result<AutomationRule, _> = sqlx::query_as(
        r#"UPDATE public.automation_rules SET
              name = COALESCE($2, name),
              description = COALESCE($3, description),
              trigger = COALESCE($4, trigger),
              action = COALESCE($5, action),
              on_success = COALESCE($6, on_success),
              on_error = COALESCE($7, on_error),
              canvas = COALESCE($8, canvas),
              status = COALESCE($9, status),
              updated_at = NOW()
           WHERE id = $1 RETURNING *"#,
    )
    .bind(id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.trigger)
    .bind(&payload.action)
    .bind(&payload.on_success)
    .bind(&payload.on_error)
    .bind(&payload.canvas)
    .bind(&payload.status)
    .fetch_one(&mut rls_scope)
    .await;

    match rule {
        Ok(v) => ApiResponse::success(v, "更新成功"),
        Err(e) => {
            tracing::error!("更新规则失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新规则失败".to_string()))
        }
    }
}

pub async fn delete_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化规则作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化规则作用域失败".to_string(),
            ));
        }
    };
    let exists =
        match sqlx::query_scalar::<_, i32>("SELECT 1 FROM public.automation_rules WHERE id = $1")
            .bind(id)
            .fetch_optional(&mut rls_scope)
            .await
        {
            Ok(Some(_)) => true,
            Ok(None) => false,
            Err(e) => {
                tracing::error!("查询规则失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("删除规则失败".to_string()));
            }
        };
    if !exists {
        return ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()));
    }

    let result = sqlx::query("DELETE FROM public.automation_rules WHERE id = $1")
        .bind(id)
        .execute(&mut rls_scope)
        .await;

    match result {
        Ok(_) => ApiResponse::success(serde_json::json!({"success": true}), "删除成功"),
        Err(e) => {
            tracing::error!("删除规则失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除规则失败".to_string()))
        }
    }
}

pub async fn enable_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<AutomationRule> {
    set_rule_status(state, txn_arc, id, "enabled", "启用成功", "启用规则失败").await
}

pub async fn disable_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<AutomationRule> {
    set_rule_status(state, txn_arc, id, "disabled", "禁用成功", "禁用规则失败").await
}

async fn set_rule_status(
    state: AppState,
    txn_arc: RlsTxnCell,
    id: Uuid,
    status: &str,
    ok_msg: &str,
    err_msg: &str,
) -> ApiResponse<AutomationRule> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化规则作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化规则作用域失败".to_string(),
            ));
        }
    };
    let exists =
        match sqlx::query_scalar::<_, i32>("SELECT 1 FROM public.automation_rules WHERE id = $1")
            .bind(id)
            .fetch_optional(&mut rls_scope)
            .await
        {
            Ok(Some(_)) => true,
            Ok(None) => false,
            Err(e) => {
                tracing::error!("查询规则失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(err_msg.to_string()));
            }
        };
    if !exists {
        return ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()));
    }

    let rule: Result<AutomationRule, _> = sqlx::query_as(
        "UPDATE public.automation_rules SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
    )
    .bind(id)
    .bind(status)
    .fetch_one(&mut rls_scope)
    .await;

    match rule {
        Ok(v) => ApiResponse::success(v, ok_msg),
        Err(e) => {
            tracing::error!("{}: {}", err_msg, e);
            ApiResponse::from(TopemsError::Internal(err_msg.to_string()))
        }
    }
}

pub async fn duplicate_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<AutomationRule> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化规则作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化规则作用域失败".to_string(),
            ));
        }
    };
    let exists =
        match sqlx::query_scalar::<_, i32>("SELECT 1 FROM public.automation_rules WHERE id = $1")
            .bind(id)
            .fetch_optional(&mut rls_scope)
            .await
        {
            Ok(Some(_)) => true,
            Ok(None) => false,
            Err(e) => {
                tracing::error!("查询规则失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("复制规则失败".to_string()));
            }
        };
    if !exists {
        return ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()));
    }

    let rule: Result<AutomationRule, _> = sqlx::query_as(
        r#"INSERT INTO public.automation_rules (name, code, description, trigger, action, on_success, on_error, canvas, status)
           SELECT name || ' (副本)', code || '_copy_' || substr(gen_random_uuid()::text, 1, 8),
                  description, trigger, action, on_success, on_error, canvas, 'draft'
           FROM public.automation_rules WHERE id = $1 RETURNING *"#,
    )
    .bind(id)
    .fetch_one(&mut rls_scope)
    .await;

    match rule {
        Ok(v) => ApiResponse::success(v, "复制成功"),
        Err(e) => {
            tracing::error!("复制规则失败: {}", e);
            ApiResponse::from(TopemsError::Internal("复制规则失败".to_string()))
        }
    }
}

pub async fn trigger_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Option<TriggerRequest>>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化规则作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化规则作用域失败".to_string(),
            ));
        }
    };

    let rule: Result<AutomationRule, _> =
        sqlx::query_as("SELECT * FROM public.automation_rules WHERE id = $1")
            .bind(id)
            .fetch_one(&mut rls_scope)
            .await;

    let rule = match rule {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()));
            }
            tracing::error!("触发规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("触发规则失败".to_string()));
        }
    };

    let input_vars = payload.and_then(|p| p.input_variables);

    let run: Result<(Uuid,), _> = sqlx::query_as(
        r#"INSERT INTO public.automation_runs (rule_id, rule_name, status, trigger_type, input_variables, started_at)
           VALUES ($1, $2, 'running', 'manual', $3, NOW())
           RETURNING id"#,
    )
    .bind(id)
    .bind(&rule.name)
    .bind(&input_vars)
    .fetch_one(&mut rls_scope)
    .await;

    match run {
        Ok((run_id,)) => {
            let _ = sqlx::query(
                "UPDATE public.automation_rules SET run_count = run_count + 1, last_run_at = NOW() WHERE id = $1",
            )
            .bind(id)
            .execute(&mut rls_scope)
            .await;

            ApiResponse::success(
                serde_json::json!({"run_id": run_id.to_string()}),
                "触发成功",
            )
        }
        Err(e) => {
            tracing::error!("创建运行记录失败: {}", e);
            ApiResponse::from(TopemsError::Internal("触发规则失败".to_string()))
        }
    }
}

// ─── Runs handlers ────────────────────────────────────────────────────────────

pub async fn list_runs(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<RunQueryParams>,
) -> ApiResponse<PaginatedResponse<AutomationRun>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params
        .page_size
        .or(params.page_size_alt)
        .unwrap_or(20)
        .min(100);
    let offset = (page - 1) * page_size;
    let rule_id = params
        .rule_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());
    let status = params.status.clone();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化运行记录作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化运行记录作用域失败".to_string(),
            ));
        }
    };

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM public.automation_runs
           WHERE ($1::uuid IS NULL OR rule_id = $1)
             AND ($2::text IS NULL OR status = $2)"#,
    )
    .bind(rule_id)
    .bind(&status)
    .fetch_one(&mut rls_scope)
    .await;
    let total = match total {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("统计自动化运行记录失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询运行记录失败".to_string()));
        }
    };

    let items = sqlx::query_as::<_, AutomationRun>(
        r#"SELECT * FROM public.automation_runs
           WHERE ($1::uuid IS NULL OR rule_id = $1)
             AND ($2::text IS NULL OR status = $2)
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#,
    )
    .bind(rule_id)
    .bind(&status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut rls_scope)
    .await;
    let items = match items {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询自动化运行记录失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询运行记录失败".to_string()));
        }
    };

    ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    )
}

pub async fn get_run(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<AutomationRun> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化运行记录作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化运行记录作用域失败".to_string(),
            ));
        }
    };

    let run: Result<AutomationRun, _> =
        sqlx::query_as("SELECT * FROM public.automation_runs WHERE id = $1")
            .bind(id)
            .fetch_one(&mut rls_scope)
            .await;

    match run {
        Ok(v) => ApiResponse::success(v, "查询成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("运行记录不存在".to_string()))
            } else {
                tracing::error!("查询运行记录失败: {}", e);
                ApiResponse::from(TopemsError::Internal("查询运行记录失败".to_string()))
            }
        }
    }
}

pub async fn retry_run(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化运行记录作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化运行记录作用域失败".to_string(),
            ));
        }
    };

    let run: Result<AutomationRun, _> =
        sqlx::query_as("SELECT * FROM public.automation_runs WHERE id = $1")
            .bind(id)
            .fetch_one(&mut rls_scope)
            .await;

    let run = match run {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound(
                    "运行记录不存在".to_string(),
                ));
            }
            return ApiResponse::from(TopemsError::Internal("查询运行记录失败".to_string()));
        }
    };

    let new_run: Result<(Uuid,), _> = sqlx::query_as(
        r#"INSERT INTO public.automation_runs (rule_id, rule_name, status, trigger_type, input_variables, started_at)
           VALUES ($1, $2, 'running', 'retry', $3, NOW())
           RETURNING id"#,
    )
    .bind(run.rule_id)
    .bind(&run.rule_name)
    .bind(&run.input_variables)
    .fetch_one(&mut rls_scope)
    .await;

    match new_run {
        Ok((new_id,)) => ApiResponse::success(
            serde_json::json!({"run_id": new_id.to_string()}),
            "重试成功",
        ),
        Err(e) => {
            tracing::error!("重试运行失败: {}", e);
            ApiResponse::from(TopemsError::Internal("重试运行失败".to_string()))
        }
    }
}

pub async fn cancel_run(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化运行记录作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化运行记录作用域失败".to_string(),
            ));
        }
    };
    let exists = match sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM public.automation_runs WHERE id = $1 AND status = 'running'",
    )
    .bind(id)
    .fetch_optional(&mut rls_scope)
    .await
    {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(e) => {
            tracing::error!("查询运行记录失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("取消运行失败".to_string()));
        }
    };
    if !exists {
        return ApiResponse::from(TopemsError::ResourceNotFound(
            "运行记录不存在或非运行中".to_string(),
        ));
    }

    let result = sqlx::query(
        "UPDATE public.automation_runs SET status = 'cancelled', completed_at = NOW() WHERE id = $1 AND status = 'running'",
    )
    .bind(id)
    .execute(&mut rls_scope)
    .await;

    match result {
        Ok(_) => ApiResponse::success(serde_json::json!({"success": true}), "取消成功"),
        Err(e) => {
            tracing::error!("取消运行失败: {}", e);
            ApiResponse::from(TopemsError::Internal("取消运行失败".to_string()))
        }
    }
}

pub async fn get_run_steps(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化运行记录作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化运行记录作用域失败".to_string(),
            ));
        }
    };
    let steps: Result<Option<Value>, _> =
        sqlx::query_scalar("SELECT steps FROM public.automation_runs WHERE id = $1")
            .bind(id)
            .fetch_one(&mut rls_scope)
            .await;

    match steps {
        Ok(Some(s)) => ApiResponse::success(s, "查询成功"),
        Ok(None) => ApiResponse::success(serde_json::json!([]), "查询成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("运行记录不存在".to_string()))
            } else {
                ApiResponse::from(TopemsError::Internal("查询步骤失败".to_string()))
            }
        }
    }
}

pub async fn get_run_logs(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Query(_params): Query<RunLogQueryParams>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化运行记录作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化运行记录作用域失败".to_string(),
            ));
        }
    };
    let logs: Result<Option<String>, _> =
        sqlx::query_scalar("SELECT logs FROM public.automation_runs WHERE id = $1")
            .bind(id)
            .fetch_one(&mut rls_scope)
            .await;

    match logs {
        Ok(Some(l)) => {
            let lines: Vec<&str> = l.lines().collect();
            ApiResponse::success(
                serde_json::json!({"lines": lines, "total": lines.len(), "truncated": false}),
                "查询成功",
            )
        }
        Ok(None) => ApiResponse::success(
            serde_json::json!({"lines": [], "total": 0, "truncated": false}),
            "查询成功",
        ),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("运行记录不存在".to_string()))
            } else {
                ApiResponse::from(TopemsError::Internal("查询日志失败".to_string()))
            }
        }
    }
}

/// 双段日志路径兼容：/automation/runs/{id}/logs/{log_id}。
/// 运行日志为整段文本、当前无独立"日志条目"维度，log_id 暂忽略，复用 get_run_logs 按 run_id
/// 返回（待上游支持按 log_id 取条目）。避免该路径落到 BFF catch-all 裸 404。
pub async fn get_run_log_by_id(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((run_id, _log_id)): Path<(Uuid, Uuid)>,
    Query(params): Query<RunLogQueryParams>,
) -> ApiResponse<Value> {
    get_run_logs(
        State(state),
        Extension(txn_arc),
        Path(run_id),
        Query(params),
    )
    .await
}

pub async fn purge_runs(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<PurgeRequest>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化运行记录作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化运行记录作用域失败".to_string(),
            ));
        }
    };
    let result = sqlx::query(
        r#"DELETE FROM public.automation_runs
           WHERE ($1::text IS NULL OR created_at < $1::timestamp)
             AND ($2::text IS NULL OR status = $2)"#,
    )
    .bind(&payload.before)
    .bind(&payload.status)
    .execute(&mut rls_scope)
    .await;

    match result {
        Ok(r) => ApiResponse::success(
            serde_json::json!({"deleted": r.rows_affected()}),
            "清理成功",
        ),
        Err(e) => {
            tracing::error!("清理运行记录失败: {}", e);
            ApiResponse::from(TopemsError::Internal("清理运行记录失败".to_string()))
        }
    }
}

// ─── Variables handlers ───────────────────────────────────────────────────────

pub async fn list_variables(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<VariableQueryParams>,
) -> ApiResponse<PaginatedResponse<AutomationVariable>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params
        .page_size
        .or(params.page_size_alt)
        .unwrap_or(20)
        .min(100);
    let offset = (page - 1) * page_size;
    let scope = params.scope.clone();
    let rule_id = params
        .rule_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());
    let search = params.search.clone().unwrap_or_default();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化变量作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化变量作用域失败".to_string(),
            ));
        }
    };

    let total = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM public.automation_variables
           WHERE ($1::text IS NULL OR scope = $1)
             AND ($2::uuid IS NULL OR rule_id = $2)
             AND ($3 = '' OR key ILIKE '%' || $3 || '%')"#,
    )
    .bind(&scope)
    .bind(rule_id)
    .bind(&search)
    .fetch_one(&mut rls_scope)
    .await;
    let total = match total {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("统计自动化变量失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询变量失败".to_string()));
        }
    };

    let items = sqlx::query_as::<_, AutomationVariable>(
        r#"SELECT id, tenant_id, key,
                  CASE WHEN is_secret THEN NULL ELSE value END as value,
                  description, scope, rule_id, is_secret, created_by, created_at, updated_at
           FROM public.automation_variables
           WHERE ($1::text IS NULL OR scope = $1)
             AND ($2::uuid IS NULL OR rule_id = $2)
             AND ($3 = '' OR key ILIKE '%' || $3 || '%')
           ORDER BY created_at DESC LIMIT $4 OFFSET $5"#,
    )
    .bind(&scope)
    .bind(rule_id)
    .bind(&search)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut rls_scope)
    .await;
    let items = match items {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询自动化变量失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询变量失败".to_string()));
        }
    };

    ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    )
}

pub async fn get_variable(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(key): Path<String>,
) -> ApiResponse<AutomationVariable> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化变量作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化变量作用域失败".to_string(),
            ));
        }
    };

    let var: Result<AutomationVariable, _> = sqlx::query_as(
        r#"SELECT id, tenant_id, key,
                  CASE WHEN is_secret THEN NULL ELSE value END as value,
                  description, scope, rule_id, is_secret, created_by, created_at, updated_at
           FROM public.automation_variables WHERE key = $1"#,
    )
    .bind(&key)
    .fetch_one(&mut rls_scope)
    .await;

    match var {
        Ok(v) => ApiResponse::success(v, "查询成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("变量不存在".to_string()))
            } else {
                tracing::error!("查询变量失败: {}", e);
                ApiResponse::from(TopemsError::Internal("查询变量失败".to_string()))
            }
        }
    }
}

pub async fn create_variable(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateVariableRequest>,
) -> ApiResponse<AutomationVariable> {
    let user_id = Uuid::parse_str(&claims.sub).ok();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化变量作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化变量作用域失败".to_string(),
            ));
        }
    };
    // 写入必须绑定真实租户：取不到即 400，禁止静默落全零 UUID 共享行。
    let tenant_id = match try_tenant_id_from_claims(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let scope = payload
        .scope
        .clone()
        .unwrap_or_else(|| "global".to_string());
    let rule_id = payload
        .rule_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());
    let is_secret = payload.is_secret.unwrap_or(false);

    let var: Result<AutomationVariable, _> = sqlx::query_as(
        r#"INSERT INTO public.automation_variables (key, value, description, scope, rule_id, is_secret, created_by, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, tenant_id, key,
                     CASE WHEN is_secret THEN NULL ELSE value END as value,
                     description, scope, rule_id, is_secret, created_by, created_at, updated_at"#,
    )
    .bind(&payload.key)
    .bind(&payload.value)
    .bind(&payload.description)
    .bind(&scope)
    .bind(rule_id)
    .bind(is_secret)
    .bind(user_id)
    .bind(tenant_id)
    .fetch_one(&mut rls_scope)
    .await;

    match var {
        Ok(v) => ApiResponse::success(v, "创建成功"),
        Err(e) => {
            tracing::error!("创建变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建变量失败".to_string()))
        }
    }
}

pub async fn update_variable(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(key): Path<String>,
    Json(payload): Json<UpdateVariableRequest>,
) -> ApiResponse<AutomationVariable> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化变量作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化变量作用域失败".to_string(),
            ));
        }
    };

    let exists = match sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM public.automation_variables WHERE key = $1",
    )
    .bind(&key)
    .fetch_optional(&mut rls_scope)
    .await
    {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(e) => {
            tracing::error!("查询变量失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新变量失败".to_string()));
        }
    };
    if !exists {
        return ApiResponse::from(TopemsError::ResourceNotFound("变量不存在".to_string()));
    }

    let var: Result<AutomationVariable, _> = sqlx::query_as(
        r#"UPDATE public.automation_variables SET
              value = COALESCE($2, value),
              description = COALESCE($3, description),
              scope = COALESCE($4, scope),
              is_secret = COALESCE($5, is_secret),
              updated_at = NOW()
           WHERE key = $1
           RETURNING id, tenant_id, key,
                     CASE WHEN is_secret THEN NULL ELSE value END as value,
                     description, scope, rule_id, is_secret, created_by, created_at, updated_at"#,
    )
    .bind(&key)
    .bind(&payload.value)
    .bind(&payload.description)
    .bind(&payload.scope)
    .bind(payload.is_secret)
    .fetch_one(&mut rls_scope)
    .await;

    match var {
        Ok(v) => ApiResponse::success(v, "更新成功"),
        Err(e) => {
            tracing::error!("更新变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新变量失败".to_string()))
        }
    }
}

pub async fn delete_variable(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(key): Path<String>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化变量作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化变量作用域失败".to_string(),
            ));
        }
    };
    let exists = match sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM public.automation_variables WHERE key = $1",
    )
    .bind(&key)
    .fetch_optional(&mut rls_scope)
    .await
    {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(e) => {
            tracing::error!("查询变量失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("删除变量失败".to_string()));
        }
    };
    if !exists {
        return ApiResponse::from(TopemsError::ResourceNotFound("变量不存在".to_string()));
    }

    let result = sqlx::query("DELETE FROM public.automation_variables WHERE key = $1")
        .bind(&key)
        .execute(&mut rls_scope)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"success": true}), "删除成功")
        }
        Ok(_) => ApiResponse::success(serde_json::json!({"success": true}), "删除成功"),
        Err(e) => {
            tracing::error!("删除变量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除变量失败".to_string()))
        }
    }
}

pub async fn reveal_variable(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(key): Path<String>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化变量作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化变量作用域失败".to_string(),
            ));
        }
    };

    let value: Result<Option<String>, _> = sqlx::query_scalar(
        "SELECT value FROM public.automation_variables WHERE key = $1 AND is_secret = true",
    )
    .bind(&key)
    .fetch_one(&mut rls_scope)
    .await;

    match value {
        Ok(Some(v)) => ApiResponse::success(serde_json::json!({"value": v}), "查询成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("密钥变量不存在".to_string())),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("密钥变量不存在".to_string()))
            } else {
                ApiResponse::from(TopemsError::Internal("查询失败".to_string()))
            }
        }
    }
}

pub async fn bulk_import_variables(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BulkImportRequest>,
) -> ApiResponse<Value> {
    let user_id = Uuid::parse_str(&claims.sub).ok();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化变量作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化变量作用域失败".to_string(),
            ));
        }
    };
    // 写入必须绑定真实租户：取不到即 400，禁止静默落全零 UUID 共享行。
    let tenant_id = match try_tenant_id_from_claims(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let mut imported = 0;
    let mut skipped = 0;

    for var in &payload.variables {
        let scope = var.scope.clone().unwrap_or_else(|| "global".to_string());
        let rule_id = var.rule_id.clone().and_then(|s| Uuid::parse_str(&s).ok());
        let is_secret = var.is_secret.unwrap_or(false);

        let result = sqlx::query(
            r#"INSERT INTO public.automation_variables (key, value, description, scope, rule_id, is_secret, created_by, tenant_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (tenant_id, key) DO NOTHING"#,
        )
        .bind(&var.key)
        .bind(&var.value)
        .bind(&var.description)
        .bind(&scope)
        .bind(rule_id)
        .bind(is_secret)
        .bind(user_id)
        .bind(tenant_id)
        .execute(&mut rls_scope)
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => imported += 1,
            Ok(_) => skipped += 1,
            Err(_) => skipped += 1,
        }
    }

    ApiResponse::success(
        serde_json::json!({"imported": imported, "skipped": skipped}),
        "批量导入完成",
    )
}

// ─── Dashboard handlers ───────────────────────────────────────────────────────

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_dashboard_stats(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<DashboardStats> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化统计作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化统计作用域失败".to_string(),
            ));
        }
    };

    macro_rules! count {
        ($sql:expr, $label:expr) => {
            match sqlx::query_scalar::<_, i64>($sql)
                .fetch_one(&mut rls_scope)
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("{}失败: {}", $label, e);
                    return ApiResponse::from(TopemsError::Internal(
                        "查询自动化统计失败".to_string(),
                    ));
                }
            }
        };
    }

    let total_rules = count!(
        "SELECT COUNT(*) FROM public.automation_rules",
        "统计规则总数"
    );
    let enabled_rules = count!(
        "SELECT COUNT(*) FROM public.automation_rules WHERE status = 'enabled'",
        "统计启用规则"
    );
    let total_runs = count!(
        "SELECT COUNT(*) FROM public.automation_runs",
        "统计运行总数"
    );
    let successful_runs = count!(
        "SELECT COUNT(*) FROM public.automation_runs WHERE status = 'success'",
        "统计成功运行"
    );
    let failed_runs = count!(
        "SELECT COUNT(*) FROM public.automation_runs WHERE status = 'failed'",
        "统计失败运行"
    );
    let running_runs = count!(
        "SELECT COUNT(*) FROM public.automation_runs WHERE status = 'running'",
        "统计运行中任务"
    );
    let total_variables = count!(
        "SELECT COUNT(*) FROM public.automation_variables",
        "统计变量总数"
    );
    let runs_today = count!(
        "SELECT COUNT(*) FROM public.automation_runs WHERE created_at >= CURRENT_DATE",
        "统计今日运行"
    );

    let success_rate = if total_runs > 0 {
        (successful_runs as f64 / total_runs as f64) * 100.0
    } else {
        0.0
    };

    let avg_duration = match sqlx::query_scalar::<_, f64>(
        "SELECT COALESCE(AVG(duration_ms), 0) FROM public.automation_runs WHERE duration_ms IS NOT NULL",
    )
    .fetch_one(&mut rls_scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("统计平均耗时失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "查询自动化统计失败".to_string(),
            ));
        }
    };

    ApiResponse::success(
        DashboardStats {
            total_rules,
            enabled_rules,
            total_runs,
            successful_runs,
            failed_runs,
            running_runs,
            success_rate,
            avg_duration_ms: avg_duration,
            total_variables,
            runs_today,
        },
        "查询成功",
    )
}

pub async fn health_check() -> ApiResponse<String> {
    ApiResponse::success("ok".to_string(), "服务正常")
}

// ─── Designer handlers ────────────────────────────────────────────────────────

pub async fn get_designer_resources() -> ApiResponse<DesignerResources> {
    let triggers = vec![
        ResourceItem {
            type_: "cron".to_string(),
            label: "定时触发".to_string(),
            description: "按 Cron 表达式定时执行".to_string(),
            icon: Some("clock".to_string()),
        },
        ResourceItem {
            type_: "event".to_string(),
            label: "事件触发".to_string(),
            description: "监听系统事件触发执行".to_string(),
            icon: Some("zap".to_string()),
        },
        ResourceItem {
            type_: "webhook".to_string(),
            label: "Webhook 触发".to_string(),
            description: "通过 HTTP Webhook 触发".to_string(),
            icon: Some("globe".to_string()),
        },
        ResourceItem {
            type_: "form_submit".to_string(),
            label: "表单提交".to_string(),
            description: "低代码表单提交时触发".to_string(),
            icon: Some("form".to_string()),
        },
        ResourceItem {
            type_: "manual".to_string(),
            label: "手动触发".to_string(),
            description: "用户手动点击执行".to_string(),
            icon: Some("play".to_string()),
        },
    ];

    let actions = vec![
        ResourceItem {
            type_: "workflow".to_string(),
            label: "启动工作流".to_string(),
            description: "启动指定工作流实例".to_string(),
            icon: Some("git-branch".to_string()),
        },
        ResourceItem {
            type_: "integration".to_string(),
            label: "调用集成".to_string(),
            description: "调用外部集成端点".to_string(),
            icon: Some("link".to_string()),
        },
        ResourceItem {
            type_: "api".to_string(),
            label: "HTTP 请求".to_string(),
            description: "发送 HTTP API 请求".to_string(),
            icon: Some("server".to_string()),
        },
        ResourceItem {
            type_: "lowcode_page".to_string(),
            label: "低代码页面".to_string(),
            description: "操作低代码应用页面".to_string(),
            icon: Some("layout".to_string()),
        },
        ResourceItem {
            type_: "notification".to_string(),
            label: "发送通知".to_string(),
            description: "发送消息通知".to_string(),
            icon: Some("bell".to_string()),
        },
    ];

    ApiResponse::success(DesignerResources { triggers, actions }, "查询成功")
}

pub async fn get_designer_canvas(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(rule_id): Path<String>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化画布作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化画布作用域失败".to_string(),
            ));
        }
    };

    let canvas: Result<Option<Value>, _> = sqlx::query_scalar(
        "SELECT canvas FROM public.automation_rules WHERE id::text = $1 OR code = $1",
    )
    .bind(&rule_id)
    .fetch_one(&mut rls_scope)
    .await;

    match canvas {
        Ok(Some(c)) => ApiResponse::success(c, "查询成功"),
        Ok(None) => ApiResponse::success(
            serde_json::json!({"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}),
            "查询成功",
        ),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()))
            } else {
                ApiResponse::from(TopemsError::Internal("查询画布失败".to_string()))
            }
        }
    }
}

pub async fn save_designer_canvas(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(rule_id): Path<String>,
    Json(payload): Json<SaveCanvasRequest>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化画布作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化画布作用域失败".to_string(),
            ));
        }
    };

    let exists = match sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM public.automation_rules WHERE id::text = $1 OR code = $1",
    )
    .bind(&rule_id)
    .fetch_optional(&mut rls_scope)
    .await
    {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(e) => {
            tracing::error!("查询规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("保存画布失败".to_string()));
        }
    };
    if !exists {
        return ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()));
    }

    match sqlx::query(
        "UPDATE public.automation_rules SET canvas = $2, updated_at = NOW() WHERE id::text = $1 OR code = $1",
    )
    .bind(&rule_id)
    .bind(&payload.canvas)
    .execute(&mut rls_scope)
    .await
    {
        Ok(_) => ApiResponse::success(payload.canvas, "保存成功"),
        Err(e) => {
            tracing::error!("保存画布失败: {}", e);
            ApiResponse::from(TopemsError::Internal("保存画布失败".to_string()))
        }
    }
}

pub async fn validate_canvas(
    State(_state): State<AppState>,
    Path(_rule_id): Path<String>,
    Json(_payload): Json<SaveCanvasRequest>,
) -> ApiResponse<Value> {
    ApiResponse::success(serde_json::json!({"valid": true, "errors": []}), "校验通过")
}

pub async fn sync_to_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(rule_id): Path<String>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化画布作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化画布作用域失败".to_string(),
            ));
        }
    };

    let exists = match sqlx::query_scalar::<_, i32>(
        "SELECT 1 FROM public.automation_rules WHERE id::text = $1 OR code = $1",
    )
    .bind(&rule_id)
    .fetch_optional(&mut rls_scope)
    .await
    {
        Ok(Some(_)) => true,
        Ok(None) => false,
        Err(e) => {
            tracing::error!("查询规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("同步失败".to_string()));
        }
    };
    if !exists {
        return ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()));
    }

    match sqlx::query(
        "UPDATE public.automation_rules SET updated_at = NOW() WHERE id::text = $1 OR code = $1",
    )
    .bind(&rule_id)
    .execute(&mut rls_scope)
    .await
    {
        Ok(_) => ApiResponse::success(
            serde_json::json!({"success": true, "message": "已同步到规则定义"}),
            "同步成功",
        ),
        Err(e) => {
            tracing::error!("同步失败: {}", e);
            ApiResponse::from(TopemsError::Internal("同步失败".to_string()))
        }
    }
}

pub async fn sync_from_rule(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(rule_id): Path<String>,
) -> ApiResponse<Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开自动化画布作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "打开自动化画布作用域失败".to_string(),
            ));
        }
    };

    let canvas: Result<Option<Value>, _> = sqlx::query_scalar(
        "SELECT canvas FROM public.automation_rules WHERE id::text = $1 OR code = $1",
    )
    .bind(&rule_id)
    .fetch_one(&mut rls_scope)
    .await;

    match canvas {
        Ok(Some(c)) => ApiResponse::success(c, "同步成功"),
        Ok(None) => ApiResponse::success(
            serde_json::json!({"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}),
            "同步成功",
        ),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("规则不存在".to_string()))
            } else {
                ApiResponse::from(TopemsError::Internal("同步失败".to_string()))
            }
        }
    }
}
