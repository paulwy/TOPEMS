use axum::{
    extract::{Extension, Path, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::budget::{
    Budget, BudgetItem, CreateBudgetItemRequest, CreateBudgetRequest, UpdateBudgetItemRequest,
    UpdateBudgetRequest,
};
use crate::modules::budget_status::BudgetStatus;
use crate::modules::effective_tenant_id;
use crate::services::audit::PmAuditService;
use rust_decimal::Decimal;

use topems_shared_auth::middleware::tenant::RlsTxnCell;

/// 超支硬拦截（业务拍板 A，2026-10-25）：
/// 登记/更新预算项前校验「预算项合计 ≤ 预算总额」，超支即 422 拒绝并回显口径。
/// 预算不存在（含跨租户不可见）→ 404。incoming 为 None（部分更新未涉及金额）时放行。
async fn assert_budget_not_exceeded(
    conn: &mut topems_shared_db::scope::ScopedTxn<'_>,
    budget_id: Uuid,
    exclude_item_id: Option<Uuid>,
    incoming: Option<Decimal>,
) -> Result<(), (u16, String)> {
    let Some(incoming) = incoming else {
        return Ok(());
    };
    let total: Option<Decimal> = sqlx::query_scalar(only_own_schema_query!(
        "pm",
        "SELECT total_amount FROM pm.budgets WHERE id = $1"
    ))
    .bind(budget_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| {
        tracing::error!("超支校验读取预算失败: {}", e);
        (500, "超支校验失败".to_string())
    })?;
    let Some(total) = total else {
        return Err((404, "预算不存在".to_string()));
    };
    let used: Decimal = sqlx::query_scalar(
        only_own_schema_query!(
            "pm",
            "SELECT COALESCE(SUM(budget_amount), 0) FROM pm.budget_items WHERE budget_id = $1 AND ($2::uuid IS NULL OR id <> $2)"
        ),
    )
    .bind(budget_id)
    .bind(exclude_item_id)
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| {
        tracing::error!("超支校验读取预算项失败: {}", e);
        (500, "超支校验失败".to_string())
    })?;
    if used + incoming > total {
        Err((
            422,
            format!(
                "超支拦截：预算总额 {total}，现有预算项合计 {used}，本次 {incoming} 将超出预算"
            ),
        ))
    } else {
        Ok(())
    }
}

// ==================== Pure functions ====================

/// Calculates budget variance. A **positive** result means **over budget**
/// (actual spending exceeded the planned amount).
pub fn calculate_budget_variance(planned: f64, actual: f64) -> f64 {
    actual - planned
}

/// Calculates budget utilization as a percentage (`spent / total * 100`).
///
/// Returns `0.0` when `total` is zero to avoid division by zero.
pub fn budget_utilization_pct(spent: f64, total: f64) -> f64 {
    if total == 0.0 {
        return 0.0;
    }
    (spent / total) * 100.0
}

/// Calculates Earned Value (EV): `planned_pct / 100 * budget`.
///
/// `planned_pct` is a completion percentage in the range `[0, 100]`.
pub fn calculate_earned_value(planned_pct: f64, budget: f64) -> f64 {
    (planned_pct / 100.0) * budget
}

/// Calculates Cost Performance Index (CPI = EV / AC).
///
/// A value > 1.0 means under budget; < 1.0 means over budget.
/// Returns `0.0` when `ac` is zero or negative.
pub fn calculate_cpi(ev: f64, ac: f64) -> f64 {
    if ac <= 0.0 {
        return 0.0;
    }
    ev / ac
}

/// Calculates Schedule Performance Index (SPI = EV / PV).
///
/// A value > 1.0 means ahead of schedule; < 1.0 means behind schedule.
/// Returns `0.0` when `pv` is zero or negative.
pub fn calculate_spi(ev: f64, pv: f64) -> f64 {
    if pv <= 0.0 {
        return 0.0;
    }
    ev / pv
}

async fn ensure_budget_transition(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    id: Uuid,
    to: BudgetStatus,
) -> Result<(), ApiResponse<Budget>> {
    let current_raw: Result<Option<String>, sqlx::Error> =
        sqlx::query_scalar("SELECT status FROM pm.budgets WHERE id = $1")
            .bind(id)
            .fetch_optional(&mut *scope)
            .await;
    let raw = match current_raw {
        Ok(Some(raw)) => raw,
        Ok(None) => return Err(ApiResponse::not_found("预算不存在")),
        Err(e) => {
            tracing::error!("查询预算状态失败: {}", e);
            return Err(ApiResponse::server_error("查询预算状态失败"));
        }
    };
    let current = match BudgetStatus::from_db_str(&raw) {
        Some(status) => status,
        None => {
            return Err(ApiResponse::bad_request(&format!(
                "预算当前状态非法: {raw}"
            )))
        }
    };
    if !current.can_transition_to(to) {
        return Err(ApiResponse::bad_request(&format!(
            "非法预算状态流转: {} -> {}",
            current, to
        )));
    }
    Ok(())
}

pub fn create_routes(db: Db) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/budgets",
            get(get_project_budgets).post(create_budget),
        )
        .route("/budgets/{id}", get(get_budget).put(update_budget))
        .route("/budgets/{id}/submit", post(submit_budget))
        .route("/budgets/{id}/approve", post(approve_budget))
        .route(
            "/budgets/{id}/items",
            get(get_budget_items).post(create_budget_item),
        )
        .route(
            "/budgets/{id}/items/{item_id}",
            put(update_budget_item).delete(delete_budget_item),
        )
        .with_state(db)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/budgets",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "budget"
)]
async fn get_project_budgets(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<Budget>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let budgets = sqlx::query_as::<_, Budget>(
        only_own_schema_query!("pm", "SELECT id, project_id, budget_code, budget_name, budget_type, total_amount, allocated_amount, spent_amount, remaining_amount, status, start_date, end_date, description, created_by, created_at, updated_at FROM pm.budgets WHERE project_id = $1 ORDER BY version DESC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match budgets {
        Ok(b) => ApiResponse::success(b, "获取项目预算列表成功"),
        Err(e) => {
            tracing::error!("获取预算失败: {}", e);
            ApiResponse::server_error("获取预算失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/budgets/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "budget"
)]
async fn get_budget(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Budget> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let budget = sqlx::query_as::<_, Budget>(only_own_schema_query!("pm", "SELECT id, project_id, budget_code, budget_name, budget_type, total_amount, allocated_amount, spent_amount, remaining_amount, status, start_date, end_date, description, created_by, created_at, updated_at FROM pm.budgets WHERE id = $1"))
        .bind(id)
        .fetch_one(&mut scope)
        .await;

    match budget {
        Ok(b) => ApiResponse::success(b, "获取预算详情成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("预算不存在"),
        Err(e) => {
            tracing::error!("获取预算失败: {}", e);
            ApiResponse::server_error("获取预算失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{project_id}/budgets",
    tag = "budget",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_budget(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateBudgetRequest>,
) -> ApiResponse<Budget> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(
        serde_json::json!({"project_id": req.project_id, "budget_code": req.budget_code, "budget_name": req.budget_name, "total_amount": req.total_amount}),
    );

    let budget = sqlx::query_as::<_, Budget>(
        only_own_schema_query!("pm", "INSERT INTO pm.budgets (id, project_id, budget_code, budget_name, budget_type, total_amount, status, version, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11) RETURNING *")
    )
    .bind(id)
    .bind(req.project_id)
    .bind(&req.budget_code)
    .bind(&req.budget_name)
    .bind(req.budget_type.clone().unwrap_or_else(|| "operating".to_string()))
    .bind(req.total_amount)
    .bind(BudgetStatus::DEFAULT.as_db_str())
    .bind(req.created_by)
    .bind(effective_tenant_id(&ctx, &claims))
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match budget {
        Ok(b) => {
            if let Err(e) = audit
                .log_budget_operation(
                    "create_budget",
                    Some(b.id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(b, "创建预算成功")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_budget_operation(
                    "create_budget",
                    Some(id),
                    user_id,
                    details,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("创建预算失败: {}", e);
            ApiResponse::server_error("创建预算失败")
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pm/budgets/{id}",
    tag = "budget",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_budget(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Json(req): Json<UpdateBudgetRequest>,
) -> ApiResponse<Budget> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let requested_status = match req.status.as_deref() {
        None => None,
        Some(raw) => match BudgetStatus::normalize(raw) {
            Ok(status) => Some(status),
            Err(message) => return ApiResponse::bad_request(&message),
        },
    };
    if let Some(to) = requested_status {
        if let Err(resp) = ensure_budget_transition(&mut scope, id, to).await {
            return resp;
        }
    }
    let requested_status = requested_status.map(BudgetStatus::as_db_str);
    let details =
        Some(serde_json::json!({"status": requested_status, "total_amount": req.total_amount}));
    let budget = sqlx::query_as::<_, Budget>(only_own_schema_query!(
        "pm",
        "UPDATE pm.budgets SET
            budget_name = COALESCE($1, budget_name),
            budget_type = COALESCE($2, budget_type),
            total_amount = COALESCE($3, total_amount),
            status = COALESCE($4, status),
            updated_at = $5
        WHERE id = $6  RETURNING *"
    ))
    .bind(req.budget_name)
    .bind(req.budget_type)
    .bind(req.total_amount)
    .bind(requested_status)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match budget {
        Ok(b) => {
            if let Err(e) = audit
                .log_budget_operation(
                    "update_budget",
                    Some(b.id),
                    user_id,
                    details.clone(),
                    "success",
                    None,
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(b, "更新预算成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit
                .log_budget_operation(
                    "update_budget",
                    Some(id),
                    user_id,
                    details.clone(),
                    "failed",
                    Some("预算不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::not_found("预算不存在")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_budget_operation(
                    "update_budget",
                    Some(id),
                    user_id,
                    details,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("更新预算失败: {}", e);
            ApiResponse::server_error("更新预算失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/budgets/{id}/submit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "budget"
)]
async fn submit_budget(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> ApiResponse<Budget> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    if let Err(resp) = ensure_budget_transition(&mut scope, id, BudgetStatus::Pending).await {
        return resp;
    }
    let budget = sqlx::query_as::<_, Budget>(only_own_schema_query!(
        "pm",
        "UPDATE pm.budgets SET status = $2, updated_at = $1 WHERE id = $3 RETURNING *"
    ))
    .bind(Utc::now())
    .bind(BudgetStatus::Pending.as_db_str())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match budget {
        Ok(b) => {
            if let Err(e) = audit
                .log_budget_operation("submit_budget", Some(b.id), user_id, None, "success", None)
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(b, "提交审批成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit
                .log_budget_operation(
                    "submit_budget",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some("预算不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::not_found("预算不存在")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_budget_operation(
                    "submit_budget",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("提交审批失败: {}", e);
            ApiResponse::server_error("提交审批失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/budgets/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "budget"
)]
async fn approve_budget(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> ApiResponse<Budget> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    if let Err(resp) = ensure_budget_transition(&mut scope, id, BudgetStatus::Approved).await {
        return resp;
    }
    let budget = sqlx::query_as::<_, Budget>(only_own_schema_query!(
        "pm",
        "UPDATE pm.budgets SET status = $2, updated_at = $1 WHERE id = $3 RETURNING *"
    ))
    .bind(Utc::now())
    .bind(BudgetStatus::Approved.as_db_str())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match budget {
        Ok(b) => {
            if let Err(e) = audit
                .log_budget_operation("approve_budget", Some(b.id), user_id, None, "success", None)
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::success(b, "批准预算成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit
                .log_budget_operation(
                    "approve_budget",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some("预算不存在"),
                )
                .await
            {
                tracing::warn!("pm audit failed: {e}");
            }
            ApiResponse::not_found("预算不存在")
        }
        Err(e) => {
            if let Err(audit_err) = audit
                .log_budget_operation(
                    "approve_budget",
                    Some(id),
                    user_id,
                    None,
                    "failed",
                    Some(&e.to_string()),
                )
                .await
            {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("批准预算失败: {}", e);
            ApiResponse::server_error("批准预算失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/budgets/{id}/items",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "budget"
)]
async fn get_budget_items(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Vec<BudgetItem>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let items = sqlx::query_as::<_, BudgetItem>(
        only_own_schema_query!("pm", "SELECT id, budget_id, item_code, item_name, category, subcategory, budget_amount, allocated_amount, spent_amount, description, created_at, updated_at FROM pm.budget_items WHERE budget_id = $1"),
    )
    .bind(id)
    .fetch_all(&mut scope)
    .await;

    match items {
        Ok(i) => ApiResponse::success(i, "获取预算项列表成功"),
        Err(e) => {
            tracing::error!("获取预算项失败: {}", e);
            ApiResponse::server_error("获取预算项失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/budgets/{id}/items",
    tag = "budget",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_budget_item(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateBudgetItemRequest>,
) -> ApiResponse<BudgetItem> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    // 超支硬拦截（拍板 A）：登记支出项前校验预算项合计 ≤ 预算总额
    if let Err((code, msg)) =
        assert_budget_not_exceeded(&mut scope, id, None, Some(req.budget_amount)).await
    {
        return ApiResponse::error(code, msg.as_str());
    }
    let item_id = Uuid::new_v4();
    let now = Utc::now();

    let item = sqlx::query_as::<_, BudgetItem>(
        only_own_schema_query!("pm", "INSERT INTO pm.budget_items (id, budget_id, item_code, item_name, category, subcategory, budget_amount, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *")
    )
    .bind(item_id)
    .bind(id)
    .bind(req.item_code)
    .bind(&req.item_name)
    .bind(req.category)
    .bind(req.subcategory)
    .bind(req.budget_amount)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match item {
        Ok(i) => ApiResponse::success(i, "创建预算项成功"),
        Err(e) => {
            tracing::error!("创建预算项失败: {}", e);
            ApiResponse::server_error("创建预算项失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:write"])),
    path = "/budgets/{id}/items/{item_id}",
    params(
("id" = String, Path, description = "id"),
("item_id" = String, Path, description = "item_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "budget"
)]
async fn update_budget_item(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateBudgetItemRequest>,
) -> ApiResponse<BudgetItem> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    // 超支硬拦截（拍板 A）：更新金额时校验（排除自身）预算项合计 ≤ 预算总额
    if let Err((code, msg)) =
        assert_budget_not_exceeded(&mut scope, id, Some(item_id), req.budget_amount).await
    {
        return ApiResponse::error(code, msg.as_str());
    }
    let item = sqlx::query_as::<_, BudgetItem>(only_own_schema_query!(
        "pm",
        "UPDATE pm.budget_items SET
            item_name = COALESCE($1, item_name),
            category = COALESCE($2, category),
            subcategory = COALESCE($3, subcategory),
            budget_amount = COALESCE($4, budget_amount),
            description = COALESCE($5, description),
            updated_at = $6
        WHERE id = $7 AND budget_id = $8  RETURNING *"
    ))
    .bind(req.item_name)
    .bind(req.category)
    .bind(req.subcategory)
    .bind(req.budget_amount)
    .bind(req.description)
    .bind(Utc::now())
    .bind(item_id)
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match item {
        Ok(i) => ApiResponse::success(i, "更新预算项成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("预算项不存在"),
        Err(e) => {
            tracing::error!("更新预算项失败: {}", e);
            ApiResponse::server_error("更新预算项失败")
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pm/budgets/{id}/items/{item_id}",
    tag = "budget",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn delete_budget_item(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.budget_items WHERE id = $1 AND budget_id = $2 "
    ))
    .bind(item_id)
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除预算项成功"),
        Ok(_) => ApiResponse::not_found("预算项不存在"),
        Err(e) => {
            tracing::error!("删除预算项失败: {}", e);
            ApiResponse::server_error("删除预算项失败")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- calculate_budget_variance ----

    #[test]
    fn test_variance_over_budget() {
        assert!(calculate_budget_variance(100.0, 150.0) > 0.0);
        assert_eq!(calculate_budget_variance(100.0, 150.0), 50.0);
    }

    #[test]
    fn test_variance_under_budget() {
        assert!(calculate_budget_variance(100.0, 80.0) < 0.0);
        assert_eq!(calculate_budget_variance(100.0, 80.0), -20.0);
    }

    #[test]
    fn test_variance_on_budget() {
        assert_eq!(calculate_budget_variance(100.0, 100.0), 0.0);
    }

    #[test]
    fn test_variance_zero_planned() {
        assert_eq!(calculate_budget_variance(0.0, 50.0), 50.0);
    }

    #[test]
    fn test_variance_both_zero() {
        assert_eq!(calculate_budget_variance(0.0, 0.0), 0.0);
    }

    // ---- budget_utilization_pct ----

    #[test]
    fn test_utilization_zero_total() {
        assert_eq!(budget_utilization_pct(50.0, 0.0), 0.0);
    }

    #[test]
    fn test_utilization_half() {
        assert_eq!(budget_utilization_pct(50.0, 100.0), 50.0);
    }

    #[test]
    fn test_utilization_full() {
        assert_eq!(budget_utilization_pct(100.0, 100.0), 100.0);
    }

    #[test]
    fn test_utilization_over_100() {
        assert_eq!(budget_utilization_pct(150.0, 100.0), 150.0);
    }

    #[test]
    fn test_utilization_zero_spent() {
        assert_eq!(budget_utilization_pct(0.0, 100.0), 0.0);
    }

    // ---- calculate_earned_value ----

    #[test]
    fn test_ev_half_complete() {
        assert_eq!(calculate_earned_value(50.0, 1000.0), 500.0);
    }

    #[test]
    fn test_ev_zero_pct() {
        assert_eq!(calculate_earned_value(0.0, 1000.0), 0.0);
    }

    #[test]
    fn test_ev_full_complete() {
        assert_eq!(calculate_earned_value(100.0, 1000.0), 1000.0);
    }

    #[test]
    fn test_ev_zero_budget() {
        assert_eq!(calculate_earned_value(50.0, 0.0), 0.0);
    }

    // ---- calculate_cpi ----

    #[test]
    fn test_cpi_under_budget() {
        // EV=500, AC=400 -> CPI=1.25 (>1 under budget)
        assert!((calculate_cpi(500.0, 400.0) - 1.25).abs() < 1e-9);
    }

    #[test]
    fn test_cpi_over_budget() {
        // EV=400, AC=500 -> CPI=0.8 (<1 over budget)
        assert!((calculate_cpi(400.0, 500.0) - 0.8).abs() < 1e-9);
    }

    #[test]
    fn test_cpi_on_budget() {
        assert!((calculate_cpi(500.0, 500.0) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_cpi_zero_ac() {
        assert_eq!(calculate_cpi(500.0, 0.0), 0.0);
    }

    #[test]
    fn test_cpi_negative_ac() {
        assert_eq!(calculate_cpi(500.0, -10.0), 0.0);
    }

    // ---- calculate_spi ----

    #[test]
    fn test_spi_ahead_of_schedule() {
        // EV=600, PV=500 -> SPI=1.2 (>1 ahead)
        assert!((calculate_spi(600.0, 500.0) - 1.2).abs() < 1e-9);
    }

    #[test]
    fn test_spi_behind_schedule() {
        // EV=400, PV=500 -> SPI=0.8 (<1 behind)
        assert!((calculate_spi(400.0, 500.0) - 0.8).abs() < 1e-9);
    }

    #[test]
    fn test_spi_on_schedule() {
        assert!((calculate_spi(500.0, 500.0) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_spi_zero_pv() {
        assert_eq!(calculate_spi(500.0, 0.0), 0.0);
    }

    #[test]
    fn test_spi_negative_pv() {
        assert_eq!(calculate_spi(500.0, -10.0), 0.0);
    }
}
