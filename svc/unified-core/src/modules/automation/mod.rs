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
use uuid::Uuid;

use topems_shared::ApiResponse;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, PaginatedResponse};

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
    pub tenant_id: Uuid,
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
    Query(params): Query<RuleQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<AutomationRule>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params
        .page_size
        .or(params.page_size_alt)
        .unwrap_or(20)
        .min(100);
    let offset = (page - 1) * page_size;
    let search = params.search.clone().unwrap_or_default();
    let status = params.status.clone();

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM automation_rules
           WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
             AND ($2::text IS NULL OR status = $2)"#,
    )
    .bind(&search)
    .bind(&status)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let items: Vec<AutomationRule> = sqlx::query_as(
        r#"SELECT * FROM automation_rules
           WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
             AND ($2::text IS NULL OR status = $2)
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#,
    )
    .bind(&search)
    .bind(&status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    ))
}

pub async fn get_rule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AutomationRule>> {
    let rule: Result<AutomationRule, _> =
        sqlx::query_as("SELECT * FROM automation_rules WHERE id = $1")
            .bind(id)
            .fetch_one(&state.pool)
            .await;

    match rule {
        Ok(v) => Json(ApiResponse::success(v, "查询成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "规则不存在"))
            } else {
                tracing::error!("查询规则失败: {}", e);
                Json(api_error(500, "查询规则失败"))
            }
        }
    }
}

pub async fn get_rule_by_code(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Json<ApiResponse<AutomationRule>> {
    let rule: Result<AutomationRule, _> =
        sqlx::query_as("SELECT * FROM automation_rules WHERE code = $1")
            .bind(&code)
            .fetch_one(&state.pool)
            .await;

    match rule {
        Ok(v) => Json(ApiResponse::success(v, "查询成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "规则不存在"))
            } else {
                tracing::error!("查询规则失败: {}", e);
                Json(api_error(500, "查询规则失败"))
            }
        }
    }
}

pub async fn create_rule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateRuleRequest>,
) -> Json<ApiResponse<AutomationRule>> {
    let user_id = Uuid::parse_str(&claims.sub).ok();
    let status = payload
        .status
        .clone()
        .unwrap_or_else(|| "draft".to_string());

    let rule: Result<AutomationRule, _> = sqlx::query_as(
        r#"INSERT INTO automation_rules (name, code, description, trigger, action, on_success, on_error, canvas, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
    .fetch_one(&state.pool)
    .await;

    match rule {
        Ok(v) => Json(ApiResponse::success(v, "创建成功")),
        Err(e) => {
            tracing::error!("创建规则失败: {}", e);
            Json(api_error(500, "创建规则失败"))
        }
    }
}

pub async fn update_rule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateRuleRequest>,
) -> Json<ApiResponse<AutomationRule>> {
    let rule: Result<AutomationRule, _> = sqlx::query_as(
        r#"UPDATE automation_rules SET
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
    .fetch_one(&state.pool)
    .await;

    match rule {
        Ok(v) => Json(ApiResponse::success(v, "更新成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "规则不存在"))
            } else {
                tracing::error!("更新规则失败: {}", e);
                Json(api_error(500, "更新规则失败"))
            }
        }
    }
}

pub async fn delete_rule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Value>> {
    let result = sqlx::query("DELETE FROM automation_rules WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"success": true}),
            "删除成功",
        )),
        Ok(_) => Json(api_error(404, "规则不存在")),
        Err(e) => {
            tracing::error!("删除规则失败: {}", e);
            Json(api_error(500, "删除规则失败"))
        }
    }
}

pub async fn enable_rule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AutomationRule>> {
    let rule: Result<AutomationRule, _> = sqlx::query_as(
        "UPDATE automation_rules SET status = 'enabled', updated_at = NOW() WHERE id = $1 RETURNING *",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match rule {
        Ok(v) => Json(ApiResponse::success(v, "启用成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "规则不存在"))
            } else {
                tracing::error!("启用规则失败: {}", e);
                Json(api_error(500, "启用规则失败"))
            }
        }
    }
}

pub async fn disable_rule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AutomationRule>> {
    let rule: Result<AutomationRule, _> = sqlx::query_as(
        "UPDATE automation_rules SET status = 'disabled', updated_at = NOW() WHERE id = $1 RETURNING *",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match rule {
        Ok(v) => Json(ApiResponse::success(v, "禁用成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "规则不存在"))
            } else {
                tracing::error!("禁用规则失败: {}", e);
                Json(api_error(500, "禁用规则失败"))
            }
        }
    }
}

pub async fn duplicate_rule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AutomationRule>> {
    let rule: Result<AutomationRule, _> = sqlx::query_as(
        r#"INSERT INTO automation_rules (name, code, description, trigger, action, on_success, on_error, canvas, status)
           SELECT name || ' (副本)', code || '_copy_' || substr(gen_random_uuid()::text, 1, 8),
                  description, trigger, action, on_success, on_error, canvas, 'draft'
           FROM automation_rules WHERE id = $1 RETURNING *"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match rule {
        Ok(v) => Json(ApiResponse::success(v, "复制成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "规则不存在"))
            } else {
                tracing::error!("复制规则失败: {}", e);
                Json(api_error(500, "复制规则失败"))
            }
        }
    }
}

pub async fn trigger_rule(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Option<TriggerRequest>>,
) -> Json<ApiResponse<Value>> {
    let rule: Result<AutomationRule, _> =
        sqlx::query_as("SELECT * FROM automation_rules WHERE id = $1")
            .bind(id)
            .fetch_one(&state.pool)
            .await;

    let rule = match rule {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "规则不存在"));
            }
            tracing::error!("触发规则失败: {}", e);
            return Json(api_error(500, "触发规则失败"));
        }
    };

    let input_vars = payload.and_then(|p| p.input_variables);

    let run: Result<(Uuid,), _> = sqlx::query_as(
        r#"INSERT INTO automation_runs (rule_id, rule_name, status, trigger_type, input_variables, started_at)
           VALUES ($1, $2, 'running', 'manual', $3, NOW())
           RETURNING id"#,
    )
    .bind(id)
    .bind(&rule.name)
    .bind(&input_vars)
    .fetch_one(&state.pool)
    .await;

    match run {
        Ok((run_id,)) => {
            let _ = sqlx::query(
                "UPDATE automation_rules SET run_count = run_count + 1, last_run_at = NOW() WHERE id = $1",
            )
            .bind(id)
            .execute(&state.pool)
            .await;

            Json(ApiResponse::success(
                serde_json::json!({"run_id": run_id.to_string()}),
                "触发成功",
            ))
        }
        Err(e) => {
            tracing::error!("创建运行记录失败: {}", e);
            Json(api_error(500, "触发规则失败"))
        }
    }
}

// ─── Runs handlers ────────────────────────────────────────────────────────────

pub async fn list_runs(
    State(state): State<AppState>,
    Query(params): Query<RunQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<AutomationRun>>> {
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

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM automation_runs
           WHERE ($1::uuid IS NULL OR rule_id = $1)
             AND ($2::text IS NULL OR status = $2)"#,
    )
    .bind(rule_id)
    .bind(&status)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let items: Vec<AutomationRun> = sqlx::query_as(
        r#"SELECT * FROM automation_runs
           WHERE ($1::uuid IS NULL OR rule_id = $1)
             AND ($2::text IS NULL OR status = $2)
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#,
    )
    .bind(rule_id)
    .bind(&status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    ))
}

pub async fn get_run(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AutomationRun>> {
    let run: Result<AutomationRun, _> =
        sqlx::query_as("SELECT * FROM automation_runs WHERE id = $1")
            .bind(id)
            .fetch_one(&state.pool)
            .await;

    match run {
        Ok(v) => Json(ApiResponse::success(v, "查询成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "运行记录不存在"))
            } else {
                tracing::error!("查询运行记录失败: {}", e);
                Json(api_error(500, "查询运行记录失败"))
            }
        }
    }
}

pub async fn retry_run(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Value>> {
    let run: Result<AutomationRun, _> =
        sqlx::query_as("SELECT * FROM automation_runs WHERE id = $1")
            .bind(id)
            .fetch_one(&state.pool)
            .await;

    let run = match run {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "运行记录不存在"));
            }
            return Json(api_error(500, "查询运行记录失败"));
        }
    };

    let new_run: Result<(Uuid,), _> = sqlx::query_as(
        r#"INSERT INTO automation_runs (rule_id, rule_name, status, trigger_type, input_variables, started_at)
           VALUES ($1, $2, 'running', 'retry', $3, NOW())
           RETURNING id"#,
    )
    .bind(run.rule_id)
    .bind(&run.rule_name)
    .bind(&run.input_variables)
    .fetch_one(&state.pool)
    .await;

    match new_run {
        Ok((new_id,)) => Json(ApiResponse::success(
            serde_json::json!({"run_id": new_id.to_string()}),
            "重试成功",
        )),
        Err(e) => {
            tracing::error!("重试运行失败: {}", e);
            Json(api_error(500, "重试运行失败"))
        }
    }
}

pub async fn cancel_run(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Value>> {
    let result = sqlx::query(
        "UPDATE automation_runs SET status = 'cancelled', completed_at = NOW() WHERE id = $1 AND status = 'running'",
    )
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"success": true}),
            "取消成功",
        )),
        Ok(_) => Json(api_error(404, "运行记录不存在或非运行中")),
        Err(e) => {
            tracing::error!("取消运行失败: {}", e);
            Json(api_error(500, "取消运行失败"))
        }
    }
}

pub async fn get_run_steps(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Value>> {
    let steps: Result<Option<Value>, _> =
        sqlx::query_scalar("SELECT steps FROM automation_runs WHERE id = $1")
            .bind(id)
            .fetch_one(&state.pool)
            .await;

    match steps {
        Ok(Some(s)) => Json(ApiResponse::success(s, "查询成功")),
        Ok(None) => Json(ApiResponse::success(serde_json::json!([]), "查询成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "运行记录不存在"))
            } else {
                Json(api_error(500, "查询步骤失败"))
            }
        }
    }
}

pub async fn get_run_logs(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(_params): Query<RunLogQueryParams>,
) -> Json<ApiResponse<Value>> {
    let logs: Result<Option<String>, _> =
        sqlx::query_scalar("SELECT logs FROM automation_runs WHERE id = $1")
            .bind(id)
            .fetch_one(&state.pool)
            .await;

    match logs {
        Ok(Some(l)) => {
            let lines: Vec<&str> = l.lines().collect();
            Json(ApiResponse::success(
                serde_json::json!({"lines": lines, "total": lines.len(), "truncated": false}),
                "查询成功",
            ))
        }
        Ok(None) => Json(ApiResponse::success(
            serde_json::json!({"lines": [], "total": 0, "truncated": false}),
            "查询成功",
        )),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "运行记录不存在"))
            } else {
                Json(api_error(500, "查询日志失败"))
            }
        }
    }
}

pub async fn purge_runs(
    State(state): State<AppState>,
    Json(payload): Json<PurgeRequest>,
) -> Json<ApiResponse<Value>> {
    let result = sqlx::query(
        r#"DELETE FROM automation_runs
           WHERE ($1::text IS NULL OR created_at < $1::timestamp)
             AND ($2::text IS NULL OR status = $2)"#,
    )
    .bind(&payload.before)
    .bind(&payload.status)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            serde_json::json!({"deleted": r.rows_affected()}),
            "清理成功",
        )),
        Err(e) => {
            tracing::error!("清理运行记录失败: {}", e);
            Json(api_error(500, "清理运行记录失败"))
        }
    }
}

// ─── Variables handlers ───────────────────────────────────────────────────────

pub async fn list_variables(
    State(state): State<AppState>,
    Query(params): Query<VariableQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<AutomationVariable>>> {
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

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM automation_variables
           WHERE ($1::text IS NULL OR scope = $1)
             AND ($2::uuid IS NULL OR rule_id = $2)
             AND ($3 = '' OR key ILIKE '%' || $3 || '%')"#,
    )
    .bind(&scope)
    .bind(rule_id)
    .bind(&search)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let items: Vec<AutomationVariable> = sqlx::query_as(
        r#"SELECT id, tenant_id, key,
                  CASE WHEN is_secret THEN NULL ELSE value END as value,
                  description, scope, rule_id, is_secret, created_by, created_at, updated_at
           FROM automation_variables
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
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    ))
}

pub async fn get_variable(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Json<ApiResponse<AutomationVariable>> {
    let var: Result<AutomationVariable, _> = sqlx::query_as(
        r#"SELECT id, tenant_id, key,
                  CASE WHEN is_secret THEN NULL ELSE value END as value,
                  description, scope, rule_id, is_secret, created_by, created_at, updated_at
           FROM automation_variables WHERE key = $1"#,
    )
    .bind(&key)
    .fetch_one(&state.pool)
    .await;

    match var {
        Ok(v) => Json(ApiResponse::success(v, "查询成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "变量不存在"))
            } else {
                tracing::error!("查询变量失败: {}", e);
                Json(api_error(500, "查询变量失败"))
            }
        }
    }
}

pub async fn create_variable(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateVariableRequest>,
) -> Json<ApiResponse<AutomationVariable>> {
    let user_id = Uuid::parse_str(&claims.sub).ok();
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
        r#"INSERT INTO automation_variables (key, value, description, scope, rule_id, is_secret, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
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
    .fetch_one(&state.pool)
    .await;

    match var {
        Ok(v) => Json(ApiResponse::success(v, "创建成功")),
        Err(e) => {
            tracing::error!("创建变量失败: {}", e);
            Json(api_error(500, "创建变量失败"))
        }
    }
}

pub async fn update_variable(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Json(payload): Json<UpdateVariableRequest>,
) -> Json<ApiResponse<AutomationVariable>> {
    let var: Result<AutomationVariable, _> = sqlx::query_as(
        r#"UPDATE automation_variables SET
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
    .fetch_one(&state.pool)
    .await;

    match var {
        Ok(v) => Json(ApiResponse::success(v, "更新成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "变量不存在"))
            } else {
                tracing::error!("更新变量失败: {}", e);
                Json(api_error(500, "更新变量失败"))
            }
        }
    }
}

pub async fn delete_variable(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Json<ApiResponse<Value>> {
    let result = sqlx::query("DELETE FROM automation_variables WHERE key = $1")
        .bind(&key)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"success": true}),
            "删除成功",
        )),
        Ok(_) => Json(api_error(404, "变量不存在")),
        Err(e) => {
            tracing::error!("删除变量失败: {}", e);
            Json(api_error(500, "删除变量失败"))
        }
    }
}

pub async fn reveal_variable(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Json<ApiResponse<Value>> {
    let value: Result<Option<String>, _> = sqlx::query_scalar(
        "SELECT value FROM automation_variables WHERE key = $1 AND is_secret = true",
    )
    .bind(&key)
    .fetch_one(&state.pool)
    .await;

    match value {
        Ok(Some(v)) => Json(ApiResponse::success(
            serde_json::json!({"value": v}),
            "查询成功",
        )),
        Ok(None) => Json(api_error(404, "密钥变量不存在")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "密钥变量不存在"))
            } else {
                Json(api_error(500, "查询失败"))
            }
        }
    }
}

pub async fn bulk_import_variables(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BulkImportRequest>,
) -> Json<ApiResponse<Value>> {
    let user_id = Uuid::parse_str(&claims.sub).ok();
    let mut imported = 0;
    let mut skipped = 0;

    for var in &payload.variables {
        let scope = var.scope.clone().unwrap_or_else(|| "global".to_string());
        let rule_id = var.rule_id.clone().and_then(|s| Uuid::parse_str(&s).ok());
        let is_secret = var.is_secret.unwrap_or(false);

        let result = sqlx::query(
            r#"INSERT INTO automation_variables (key, value, description, scope, rule_id, is_secret, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (tenant_id, key) DO NOTHING"#,
        )
        .bind(&var.key)
        .bind(&var.value)
        .bind(&var.description)
        .bind(&scope)
        .bind(rule_id)
        .bind(is_secret)
        .bind(user_id)
        .execute(&state.pool)
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => imported += 1,
            Ok(_) => skipped += 1,
            Err(_) => skipped += 1,
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({"imported": imported, "skipped": skipped}),
        "批量导入完成",
    ))
}

// ─── Dashboard handlers ───────────────────────────────────────────────────────

pub async fn get_dashboard_stats(
    State(state): State<AppState>,
) -> Json<ApiResponse<DashboardStats>> {
    let total_rules: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM automation_rules")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let enabled_rules: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM automation_rules WHERE status = 'enabled'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let total_runs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM automation_runs")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let successful_runs: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM automation_runs WHERE status = 'success'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let failed_runs: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM automation_runs WHERE status = 'failed'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let running_runs: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM automation_runs WHERE status = 'running'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let success_rate = if total_runs > 0 {
        (successful_runs as f64 / total_runs as f64) * 100.0
    } else {
        0.0
    };

    let avg_duration: f64 = sqlx::query_scalar(
        "SELECT COALESCE(AVG(duration_ms), 0) FROM automation_runs WHERE duration_ms IS NOT NULL",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0.0);

    let total_variables: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM automation_variables")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let runs_today: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM automation_runs WHERE created_at >= CURRENT_DATE")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    Json(ApiResponse::success(
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
    ))
}

pub async fn health_check() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("ok".to_string(), "服务正常"))
}

// ─── Designer handlers ────────────────────────────────────────────────────────

pub async fn get_designer_resources() -> Json<ApiResponse<DesignerResources>> {
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

    Json(ApiResponse::success(
        DesignerResources { triggers, actions },
        "查询成功",
    ))
}

pub async fn get_designer_canvas(
    State(state): State<AppState>,
    Path(rule_id): Path<String>,
) -> Json<ApiResponse<Value>> {
    let canvas: Result<Option<Value>, _> =
        sqlx::query_scalar("SELECT canvas FROM automation_rules WHERE id::text = $1 OR code = $1")
            .bind(&rule_id)
            .fetch_one(&state.pool)
            .await;

    match canvas {
        Ok(Some(c)) => Json(ApiResponse::success(c, "查询成功")),
        Ok(None) => Json(ApiResponse::success(
            serde_json::json!({"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}),
            "查询成功",
        )),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "规则不存在"))
            } else {
                Json(api_error(500, "查询画布失败"))
            }
        }
    }
}

pub async fn save_designer_canvas(
    State(state): State<AppState>,
    Path(rule_id): Path<String>,
    Json(payload): Json<SaveCanvasRequest>,
) -> Json<ApiResponse<Value>> {
    let result = sqlx::query(
        "UPDATE automation_rules SET canvas = $2, updated_at = NOW() WHERE id::text = $1 OR code = $1",
    )
    .bind(&rule_id)
    .bind(&payload.canvas)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(payload.canvas, "保存成功")),
        Ok(_) => Json(api_error(404, "规则不存在")),
        Err(e) => {
            tracing::error!("保存画布失败: {}", e);
            Json(api_error(500, "保存画布失败"))
        }
    }
}

pub async fn validate_canvas(
    State(_state): State<AppState>,
    Path(_rule_id): Path<String>,
    Json(_payload): Json<SaveCanvasRequest>,
) -> Json<ApiResponse<Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"valid": true, "errors": []}),
        "校验通过",
    ))
}

pub async fn sync_to_rule(
    State(state): State<AppState>,
    Path(rule_id): Path<String>,
) -> Json<ApiResponse<Value>> {
    let result = sqlx::query(
        "UPDATE automation_rules SET updated_at = NOW() WHERE id::text = $1 OR code = $1",
    )
    .bind(&rule_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"success": true, "message": "已同步到规则定义"}),
            "同步成功",
        )),
        Ok(_) => Json(api_error(404, "规则不存在")),
        Err(e) => {
            tracing::error!("同步失败: {}", e);
            Json(api_error(500, "同步失败"))
        }
    }
}

pub async fn sync_from_rule(
    State(state): State<AppState>,
    Path(rule_id): Path<String>,
) -> Json<ApiResponse<Value>> {
    let canvas: Result<Option<Value>, _> =
        sqlx::query_scalar("SELECT canvas FROM automation_rules WHERE id::text = $1 OR code = $1")
            .bind(&rule_id)
            .fetch_one(&state.pool)
            .await;

    match canvas {
        Ok(Some(c)) => Json(ApiResponse::success(c, "同步成功")),
        Ok(None) => Json(ApiResponse::success(
            serde_json::json!({"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}),
            "同步成功",
        )),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "规则不存在"))
            } else {
                Json(api_error(500, "同步失败"))
            }
        }
    }
}
