//! V35.0 Phase 3: 运营财务模块（费用/预算/应收/应付）
//!
//! 从 ERP 迁移到 Finance 服务，共享同一数据库。
//! 使用 serde_json::Value 避免重复定义模型，直接查询现有表。

use std::str::FromStr;
use topems_shared_boundary::only_own_schema_query;

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::Utc;
use rust_decimal::Decimal;
use serde_json::{json, Value};
use sqlx::Row;
use uuid::Uuid;

/// 从 JSON 请求体解析金额为 Decimal：优先字符串精确解析，回退数值 f64 保留；缺省 ZERO。
/// 落库保持 numeric 精度，避免 f64 尾差。
fn amount_decimal(req: &Value, key: &str) -> Decimal {
    req.get(key)
        .and_then(|v| v.as_str())
        .and_then(|s| Decimal::from_str(s).ok())
        .or_else(|| {
            req.get(key)
                .and_then(|v| v.as_f64())
                .and_then(Decimal::from_f64_retain)
        })
        .unwrap_or(Decimal::ZERO)
}

use crate::modules::expense_status::{normalize_expense, ExpenseStatus};
use crate::modules::receivable_payable_status::{
    normalize_receivable_payable, ReceivablePayableStatus,
};
use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::{PaginatedResponse, PaginationParams};

// ==================== 费用报销（Expenses）====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/expenses",
    tag = "Expense",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态"),
    ),
    responses(
        (status = 200, description = "获取费用列表成功", body = ApiResponse<PaginatedResponse<Value>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_expenses(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<PaginationParams>,
) -> ApiResponse<PaginatedResponse<Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, expense_number, applicant_name, department_id, expense_type, amount,
                  description, expense_date, receipt_count, status, approver_id, approved_at,
                  reimbursed_at, currency, sub_category, project_id, employee_id, payment_method, voucher_id,
                  created_at, updated_at
           FROM finance.expenses
           WHERE ($1::text IS NULL OR expense_number ILIKE $1 OR applicant_name ILIKE $1)
             AND ($2::text IS NULL OR status = $2)
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<Value> = rows.iter().map(row_to_expense_json).collect();
            let total: i64 = sqlx::query_scalar(
                only_own_schema_query!("finance", r#"SELECT COUNT(*) FROM finance.expenses
                   WHERE deleted_at IS NULL AND ($1::text IS NULL OR expense_number ILIKE $1 OR applicant_name ILIKE $1)
                     AND ($2::text IS NULL OR status = $2)"#),
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut scope)
            .await
            .unwrap_or(0);
            ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "获取费用报销列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取费用报销列表失败: {}", e);
            ApiResponse::server_error("获取费用报销列表失败")
        }
    }
}

#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn create_expense(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<Value>,
) -> ApiResponse<Value> {
    let tenant_id = match resolve_create_tenant(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let id = Uuid::new_v4();
    let now = Utc::now();
    let expense_number = req
        .get("expense_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if expense_number.is_empty() {
        return ApiResponse::bad_request("报销编号不能为空");
    }

    // applicant_name 为 DB NOT NULL 列，缺失时须在入口返回 400，
    // 否则 NULL 绑定触发约束违反、只能回落到 500（真实错误被 tracing 吞掉）
    let applicant_name = req
        .get("applicant_name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let Some(applicant_name) = applicant_name else {
        return ApiResponse::bad_request("申请人不能为空");
    };

    let status = match req.get("status").and_then(|v| v.as_str()) {
        None => ExpenseStatus::Draft,
        Some(raw) => match normalize_expense(raw) {
            Some(status) => status,
            None => {
                return ApiResponse::bad_request(
                    "status 仅支持 draft/submitted/approved/rejected/paid",
                )
            }
        },
    };

    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.expenses (id, expense_number, applicant_name, department_id, expense_type,
                                  amount, description, expense_date, receipt_count, status,
                                  created_at, updated_at, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id, expense_number, applicant_name, department_id, expense_type, amount,
                     description, expense_date, receipt_count, status, approver_id, approved_at,
                     reimbursed_at, created_at, updated_at"#
    ))
    .bind(id)
    .bind(expense_number)
    .bind(applicant_name)
    .bind(
        req.get("department_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("expense_type").and_then(|v| v.as_str()))
    .bind(amount_decimal(&req, "amount"))
    .bind(req.get("description").and_then(|v| v.as_str()))
    .bind(
        req.get("expense_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(
        req.get("receipt_count")
            .and_then(|v| v.as_i64())
            .map(|i| i as i32)
            .unwrap_or(0),
    )
    .bind(status.as_str())
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("创建费用报销失败: {}", e);
            return ApiResponse::server_error("费用报销创建失败");
        }
    };
    ApiResponse::success(row_to_expense_json(&row), "费用报销创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/expenses/{id}",
    tag = "Expense",
    params(("id" = Uuid, Path, description = "费用ID")),
    responses(
        (status = 200, description = "获取费用成功", body = ApiResponse<Value>),
        (status = 404, description = "费用不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_expense(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Value> {
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, expense_number, applicant_name, department_id, expense_type, amount,
                  description, expense_date, receipt_count, status, approver_id, approved_at,
                  reimbursed_at, created_at, updated_at
           FROM finance.expenses WHERE id = $1"#
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("获取费用报销失败: {}", e);
            return ApiResponse::server_error("获取费用报销失败");
        }
    };
    match result {
        Some(row) => ApiResponse::success(row_to_expense_json(&row), "获取费用报销成功"),
        None => ApiResponse::not_found("费用报销不存在"),
    }
}

#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn update_expense(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<Value>,
) -> ApiResponse<Value> {
    let now = Utc::now();
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let status = match req.get("status").and_then(|v| v.as_str()) {
        None => None,
        Some(raw) => match normalize_expense(raw) {
            Some(status) => Some(status.as_str()),
            None => {
                return ApiResponse::bad_request(
                    "status 仅支持 draft/submitted/approved/rejected/paid",
                )
            }
        },
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.expenses SET
              applicant_name = $2, department_id = $3, expense_type = $4, amount = $5,
              description = $6, expense_date = $7, receipt_count = $8, status = $9,
              approver_id = $10, approved_at = $11, reimbursed_at = $12, updated_at = $13
           WHERE id = $1
           RETURNING id, expense_number, applicant_name, department_id, expense_type, amount,
                     description, expense_date, receipt_count, status, approver_id, approved_at,
                     reimbursed_at, created_at, updated_at"#
    ))
    .bind(id)
    .bind(req.get("applicant_name").and_then(|v| v.as_str()))
    .bind(
        req.get("department_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("expense_type").and_then(|v| v.as_str()))
    .bind(amount_decimal(&req, "amount"))
    .bind(req.get("description").and_then(|v| v.as_str()))
    .bind(
        req.get("expense_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(
        req.get("receipt_count")
            .and_then(|v| v.as_i64())
            .map(|i| i as i32)
            .unwrap_or(0),
    )
    .bind(status)
    .bind(
        req.get("approver_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(
        req.get("approved_at")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(
        req.get("reimbursed_at")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(now)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(row) => row,
        Err(e) => return crate::shared::err_resp(e),
    };
    ApiResponse::success(row_to_expense_json(&row), "费用报销更新成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/expenses/{id}",
    tag = "Expense",
    params(("id" = Uuid, Path, description = "费用ID")),
    responses(
        (status = 200, description = "删除费用成功", body = ApiResponse<String>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_expense(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.expenses SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut scope)
    .await;
    let r = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除费用报销失败: {}", e);
            return ApiResponse::server_error("删除费用报销失败");
        }
    };
    if r.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "费用报销删除成功")
    } else {
        ApiResponse::not_found("费用报销不存在")
    }
}

// ==================== 预算（Budgets）====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:budget:read"])),
    path = "/budgets",
    tag = "Budget",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态"),
    ),
    responses(
        (status = 200, description = "获取预算列表成功", body = ApiResponse<PaginatedResponse<Value>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_budgets(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<PaginationParams>,
) -> ApiResponse<PaginatedResponse<Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, tenant_id, department_id, budget_type, fiscal_year::text AS fiscal_year,
                  total_budget, used_amount, remaining_amount, usage_rate, status,
                  created_at, updated_at, deleted_at
           FROM finance.budgets WHERE deleted_at IS NULL
           ORDER BY created_at DESC LIMIT $1 OFFSET $2"#
    ))
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<Value> = rows.iter().map(row_to_budget_json).collect();
            let total: i64 = sqlx::query_scalar(only_own_schema_query!(
                "finance",
                "SELECT COUNT(*) FROM finance.budgets WHERE deleted_at IS NULL"
            ))
            .fetch_one(&mut scope)
            .await
            .unwrap_or(0);
            ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "获取预算列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取预算列表失败: {}", e);
            ApiResponse::server_error("获取预算列表失败")
        }
    }
}

/// 解析创建行的 tenant_id：
/// - 超管（is_superuser）→ 优先使用 `claims.tenant_id`（超管自建数据落在自身租户，
///   否则 tenant_id=NULL 的行会被按 `claims.tenant_id` 过滤的列表查询吞掉，即"自吞"）；
///   仅在 claims 无租户时落公共行（tenant_id = NULL）；
/// - 普通用户 → 必须携带可解析的 claims.tenant_id；缺失或非法直接 400，
///   禁止静默落 nil UUID（全零行在 RLS 租户过滤下不可见）。
fn resolve_create_tenant(claims: &Claims) -> Result<Option<Uuid>, (u16, String)> {
    match claims.tenant_id.as_deref() {
        Some(raw) => Uuid::parse_str(raw)
            .map(Some)
            .map_err(|_| (400, "无效的租户ID".to_string())),
        None if claims.is_superuser => Ok(None),
        None => Err((400, "缺少租户ID".to_string())),
    }
}

/// 解析写路径（update/delete）必须绑定的 tenant_id。
/// 写路径一律要求携带可解析的 claims.tenant_id；缺失/非法直接 400，
/// 超管也不例外——禁止在无租户上下文时按 id 跨租户改删。
fn resolve_write_tenant(claims: &Claims) -> Result<Uuid, (u16, String)> {
    claims
        .tenant_id
        .as_deref()
        .ok_or_else(|| (400, "缺少租户ID".to_string()))
        .and_then(|raw| Uuid::parse_str(raw).map_err(|_| (400, "无效的租户ID".to_string())))
}

/// 金额字段双兼容：JSON 字符串（"888888.00"）与 JSON 数值（888888）都接受，
/// 统一转为 Decimal；解析失败回退 None（调用方按 0 处理）。
fn json_amount_to_decimal(v: &Value) -> Option<rust_decimal::Decimal> {
    v.as_str()
        .and_then(|s| rust_decimal::Decimal::from_str(s).ok())
        .or_else(|| {
            v.as_f64()
                .and_then(|f| rust_decimal::Decimal::from_str(&f.to_string()).ok())
        })
}

#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn create_budget(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<Value>,
) -> ApiResponse<Value> {
    let tenant_id = match resolve_create_tenant(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    // 连接级租户上下文：复用请求级 RLS 事务，裸池写入在严格 RLS 策略下会被拒绝。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let id = Uuid::new_v4();
    let now = Utc::now();
    let fiscal_year: i32 = req
        .get("fiscal_year")
        .and_then(|v| {
            v.as_i64()
                .map(|n| n as i32)
                .or_else(|| v.as_str().and_then(|s| s.parse::<i32>().ok()))
        })
        .unwrap_or(0);
    // 优先读 total_budget（字符串/数值双兼容）；前端旧字段 total_amount 作为回退，避免金额丢失
    let total_budget: rust_decimal::Decimal = req
        .get("total_budget")
        .and_then(json_amount_to_decimal)
        .or_else(|| req.get("total_amount").and_then(json_amount_to_decimal))
        .unwrap_or_default();
    let used_amount = rust_decimal::Decimal::ZERO;
    let remaining_amount = total_budget - used_amount;
    let usage_rate = if total_budget.is_zero() {
        rust_decimal::Decimal::ZERO
    } else {
        (used_amount / total_budget) * rust_decimal::Decimal::from(100)
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.budgets (id, tenant_id, department_id, budget_type, fiscal_year,
                                total_budget, used_amount, remaining_amount, usage_rate, status,
                                created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
           RETURNING id, tenant_id, department_id, budget_type, fiscal_year::text AS fiscal_year,
                     total_budget, used_amount, remaining_amount, usage_rate, status,
                     created_at, updated_at, deleted_at"#
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(
        req.get("department_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    // budget_type 列 NOT NULL 无默认值；请求缺省时给合理默认 'department'，避免 23502
    .bind(
        req.get("budget_type")
            .and_then(|v| v.as_str())
            .unwrap_or("department"),
    )
    .bind(fiscal_year)
    .bind(total_budget)
    .bind(used_amount)
    .bind(remaining_amount)
    .bind(usage_rate)
    .bind(now)
    .bind(now)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(row) => ApiResponse::success(row_to_budget_json(&row), "预算创建成功"),
        Err(e) => {
            tracing::error!("创建预算失败: {}", e);
            ApiResponse::server_error("预算创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:budget:read"])),
    path = "/budgets/{id}",
    tag = "Budget",
    params(("id" = Uuid, Path, description = "预算ID")),
    responses(
        (status = 200, description = "获取预算成功", body = ApiResponse<Value>),
        (status = 404, description = "预算不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_budget(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Value> {
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, tenant_id, department_id, budget_type, fiscal_year::text AS fiscal_year,
                  total_budget, used_amount, remaining_amount, usage_rate, status,
                  created_at, updated_at, deleted_at
           FROM finance.budgets WHERE id = $1 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("获取预算失败: {}", e);
            return ApiResponse::server_error("获取预算失败");
        }
    };
    match result {
        Some(row) => ApiResponse::success(row_to_budget_json(&row), "获取预算成功"),
        None => ApiResponse::not_found("预算不存在"),
    }
}

pub async fn update_budget(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<Value>,
) -> ApiResponse<Value> {
    let now = Utc::now();
    let total_budget: rust_decimal::Decimal = req
        .get("total_budget")
        .and_then(|v| v.as_str())
        .and_then(|s| rust_decimal::Decimal::from_str(s).ok())
        .unwrap_or_default();
    let used_amount: rust_decimal::Decimal = req
        .get("used_amount")
        .and_then(|v| v.as_str())
        .and_then(|s| rust_decimal::Decimal::from_str(s).ok())
        .unwrap_or_default();
    let remaining_amount = total_budget - used_amount;
    let usage_rate = if total_budget.is_zero() {
        rust_decimal::Decimal::ZERO
    } else {
        (used_amount / total_budget) * rust_decimal::Decimal::from(100)
    };

    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.budgets SET
              department_id = $2, budget_type = $3, fiscal_year = $4,
              total_budget = $5, used_amount = $6, remaining_amount = $7, usage_rate = $8,
              status = $9, updated_at = $10
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING id, tenant_id, department_id, budget_type, fiscal_year::text AS fiscal_year,
                     total_budget, used_amount, remaining_amount, usage_rate, status,
                     created_at, updated_at, deleted_at"#
    ))
    .bind(id)
    .bind(
        req.get("department_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("budget_type").and_then(|v| v.as_str()))
    .bind(
        req.get("fiscal_year")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<i32>().ok()),
    )
    .bind(total_budget)
    .bind(used_amount)
    .bind(remaining_amount)
    .bind(usage_rate)
    .bind(
        req.get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("active"),
    )
    .bind(now)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(row) => row,
        Err(e) => return crate::shared::err_resp(e),
    };
    ApiResponse::success(row_to_budget_json(&row), "预算更新成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:budget:write"])),
    path = "/budgets/{id}",
    tag = "Budget",
    params(("id" = Uuid, Path, description = "预算ID")),
    responses(
        (status = 200, description = "删除预算成功", body = ApiResponse<String>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_budget(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let now = Utc::now();
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.budgets SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL"
    ))
    .bind(id)
    .bind(now)
    .execute(&mut scope)
    .await;
    let r = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除预算失败: {}", e);
            return ApiResponse::server_error("预算删除失败");
        }
    };
    if r.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "预算删除成功")
    } else {
        ApiResponse::not_found("预算不存在")
    }
}

// ==================== 应收（Receivables）====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/receivables",
    tag = "Receivable",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态"),
    ),
    responses(
        (status = 200, description = "获取应收账款列表成功", body = ApiResponse<PaginatedResponse<Value>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_receivables(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<PaginationParams>,
) -> ApiResponse<PaginatedResponse<Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, invoice_number, customer_name, project_id, contract_id, project_name,
                  amount, invoice_date, due_date, status, received_amount, payment_schedule,
                  created_at, updated_at
           FROM finance.receivables
           WHERE ($1::text IS NULL OR invoice_number ILIKE $1 OR customer_name ILIKE $1)
             AND ($2::text IS NULL OR status = $2)
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<Value> = rows.iter().map(row_to_receivable_json).collect();
            let total: i64 = sqlx::query_scalar(
                only_own_schema_query!("finance", r#"SELECT COUNT(*) FROM finance.receivables
                   WHERE deleted_at IS NULL AND ($1::text IS NULL OR invoice_number ILIKE $1 OR customer_name ILIKE $1)
                     AND ($2::text IS NULL OR status = $2)"#),
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut scope)
            .await
            .unwrap_or(0);
            ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "获取应收列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取应收列表失败: {}", e);
            ApiResponse::server_error("获取应收列表失败")
        }
    }
}

pub async fn create_receivable(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<Value>,
) -> ApiResponse<Value> {
    let tenant_id = match resolve_create_tenant(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let id = Uuid::new_v4();
    let now = Utc::now();
    let invoice_number = req
        .get("invoice_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if invoice_number.is_empty() {
        return ApiResponse::bad_request("发票编号不能为空");
    }

    let status = match req.get("status").and_then(|v| v.as_str()) {
        None => ReceivablePayableStatus::Draft,
        Some(raw) => match normalize_receivable_payable(raw) {
            Some(status) => status,
            None => {
                return ApiResponse::bad_request("status 仅支持 draft/approved/posted/cancelled")
            }
        },
    };

    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.receivables (id, invoice_number, customer_name, project_id, contract_id,
                                    project_name, amount, invoice_date, due_date, status,
                                    received_amount, payment_schedule, created_at, updated_at, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, NULL, $11, $12, $13)
           RETURNING id, invoice_number, customer_name, project_id, contract_id, project_name,
                     amount, invoice_date, due_date, status, received_amount, payment_schedule,
                     created_at, updated_at"#
    ))
    .bind(id)
    .bind(invoice_number)
    .bind(req.get("customer_name").and_then(|v| v.as_str()))
    .bind(
        req.get("project_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(
        req.get("contract_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("project_name").and_then(|v| v.as_str()))
    .bind(amount_decimal(&req, "amount"))
    .bind(
        req.get("invoice_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(req.get("due_date").and_then(|v| v.as_str()).and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    }))
    .bind(status.as_str())
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("创建应收失败: {}", e);
            return ApiResponse::server_error("创建应收失败");
        }
    };
    ApiResponse::success(row_to_receivable_json(&row), "应收创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/receivables/{id}",
    tag = "Receivable",
    params(("id" = Uuid, Path, description = "应收账款ID")),
    responses(
        (status = 200, description = "获取应收账款成功", body = ApiResponse<Value>),
        (status = 404, description = "应收账款不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_receivable(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Value> {
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, invoice_number, customer_name, project_id, contract_id, project_name,
                  amount, invoice_date, due_date, status, received_amount, payment_schedule,
                  created_at, updated_at
           FROM finance.receivables WHERE id = $1"#
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("获取应收失败: {}", e);
            return ApiResponse::server_error("获取应收失败");
        }
    };
    match result {
        Some(row) => ApiResponse::success(row_to_receivable_json(&row), "获取应收成功"),
        None => ApiResponse::not_found("应收不存在"),
    }
}

pub async fn update_receivable(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<Value>,
) -> ApiResponse<Value> {
    let tenant_id = match resolve_write_tenant(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let now = Utc::now();
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let status = match req.get("status").and_then(|v| v.as_str()) {
        None => None,
        Some(raw) => match normalize_receivable_payable(raw) {
            Some(status) => Some(status.as_str()),
            None => {
                return ApiResponse::bad_request("status 仅支持 draft/approved/posted/cancelled")
            }
        },
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.receivables SET
              customer_name = $2, project_name = $3, amount = $4, invoice_date = $5,
              due_date = $6, status = COALESCE($7, status), received_amount = $8, payment_schedule = $9,
              updated_at = $10
           WHERE id = $1 AND tenant_id = $11
           RETURNING id, invoice_number, customer_name, project_id, contract_id, project_name,
                     amount, invoice_date, due_date, status, received_amount, payment_schedule,
                     created_at, updated_at"#
    ))
    .bind(id)
    .bind(req.get("customer_name").and_then(|v| v.as_str()))
    .bind(req.get("project_name").and_then(|v| v.as_str()))
    .bind(amount_decimal(&req, "amount"))
    .bind(
        req.get("invoice_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(req.get("due_date").and_then(|v| v.as_str()).and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    }))
    .bind(status)
    .bind(amount_decimal(&req, "received_amount"))
    .bind(req.get("payment_schedule"))
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(row) => row,
        Err(e) => return crate::shared::err_resp(e),
    };
    ApiResponse::success(row_to_receivable_json(&row), "应收更新成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/receivables/{id}",
    tag = "Receivable",
    params(("id" = Uuid, Path, description = "应收账款ID")),
    responses(
        (status = 200, description = "删除应收账款成功", body = ApiResponse<String>),
        (status = 404, description = "应收账款不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_receivable(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let tenant_id = match resolve_write_tenant(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.receivables SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    let r = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除应收失败: {}", e);
            return ApiResponse::server_error("删除应收失败");
        }
    };
    if r.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "应收删除成功")
    } else {
        ApiResponse::not_found("应收不存在")
    }
}

// ==================== 应付（Payables）====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/payables",
    tag = "Payable",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态"),
    ),
    responses(
        (status = 200, description = "获取应付账款列表成功", body = ApiResponse<PaginatedResponse<Value>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_payables(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Query(params): Query<PaginationParams>,
) -> ApiResponse<PaginatedResponse<Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, invoice_number, supplier_name, project_id, contract_id, category,
                  amount, invoice_date, due_date, status, paid_amount, payment_schedule,
                  created_at, updated_at
           FROM finance.payables
           WHERE ($1::text IS NULL OR invoice_number ILIKE $1 OR supplier_name ILIKE $1)
             AND ($2::text IS NULL OR status = $2)
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<Value> = rows.iter().map(row_to_payable_json).collect();
            let total: i64 = sqlx::query_scalar(
                only_own_schema_query!("finance", r#"SELECT COUNT(*) FROM finance.payables
                   WHERE deleted_at IS NULL AND ($1::text IS NULL OR invoice_number ILIKE $1 OR supplier_name ILIKE $1)
                     AND ($2::text IS NULL OR status = $2)"#),
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut scope)
            .await
            .unwrap_or(0);
            ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "获取应付列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取应付列表失败: {}", e);
            ApiResponse::server_error("获取应付列表失败")
        }
    }
}

pub async fn create_payable(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<Value>,
) -> ApiResponse<Value> {
    // 超管/服务身份落公共行（NULL）；普通用户绑定 claims.tenant_id，缺失/非法直接 400
    let tenant_opt: Option<Uuid> =
        match topems_shared_auth::middleware::resolve_create_tenant(&claims) {
            Ok(t) => t,
            Err((code, msg)) => return ApiResponse::error(code, &msg),
        };

    let id = Uuid::new_v4();
    let now = Utc::now();
    let invoice_number = req
        .get("invoice_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if invoice_number.is_empty() {
        return ApiResponse::bad_request("发票编号不能为空");
    }

    let status = match req.get("status").and_then(|v| v.as_str()) {
        None => ReceivablePayableStatus::Draft,
        Some(raw) => match normalize_receivable_payable(raw) {
            Some(status) => status,
            None => {
                return ApiResponse::bad_request("status 仅支持 draft/approved/posted/cancelled")
            }
        },
    };

    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.payables (id, invoice_number, supplier_name, project_id, contract_id,
                                 category, amount, invoice_date, due_date, status,
                                 paid_amount, payment_schedule, created_at, updated_at, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, NULL, $11, $12, $13)
           RETURNING id, invoice_number, supplier_name, project_id, contract_id, category,
                     amount, invoice_date, due_date, status, paid_amount, payment_schedule,
                     created_at, updated_at"#
    ))
    .bind(id)
    .bind(invoice_number)
    .bind(req.get("supplier_name").and_then(|v| v.as_str()))
    .bind(
        req.get("project_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(
        req.get("contract_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("category").and_then(|v| v.as_str()))
    .bind(amount_decimal(&req, "amount"))
    .bind(
        req.get("invoice_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(req.get("due_date").and_then(|v| v.as_str()).and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    }))
    .bind(status.as_str())
    .bind(now)
    .bind(now)
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("创建应付失败: {}", e);
            return ApiResponse::server_error("创建应付失败");
        }
    };
    ApiResponse::success(row_to_payable_json(&row), "应付创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/payables/{id}",
    tag = "Payable",
    params(("id" = Uuid, Path, description = "应付账款ID")),
    responses(
        (status = 200, description = "获取应付账款成功", body = ApiResponse<Value>),
        (status = 404, description = "应付账款不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_payable(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Value> {
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, invoice_number, supplier_name, project_id, contract_id, category,
                  amount, invoice_date, due_date, status, paid_amount, payment_schedule,
                  created_at, updated_at
           FROM finance.payables WHERE id = $1"#
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    let result = match result {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("获取应付失败: {}", e);
            return ApiResponse::server_error("获取应付失败");
        }
    };
    match result {
        Some(row) => ApiResponse::success(row_to_payable_json(&row), "获取应付成功"),
        None => ApiResponse::not_found("应付不存在"),
    }
}

pub async fn update_payable(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<Value>,
) -> ApiResponse<Value> {
    let tenant_id = match resolve_write_tenant(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let now = Utc::now();
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let status = match req.get("status").and_then(|v| v.as_str()) {
        None => None,
        Some(raw) => match normalize_receivable_payable(raw) {
            Some(status) => Some(status.as_str()),
            None => {
                return ApiResponse::bad_request("status 仅支持 draft/approved/posted/cancelled")
            }
        },
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.payables SET
              supplier_name = $2, category = $3, amount = $4, invoice_date = $5,
              due_date = $6, status = COALESCE($7, status), paid_amount = $8, payment_schedule = $9,
              updated_at = $10
           WHERE id = $1 AND tenant_id = $11
           RETURNING id, invoice_number, supplier_name, project_id, contract_id, category,
                     amount, invoice_date, due_date, status, paid_amount, payment_schedule,
                     created_at, updated_at"#
    ))
    .bind(id)
    .bind(req.get("supplier_name").and_then(|v| v.as_str()))
    .bind(req.get("category").and_then(|v| v.as_str()))
    .bind(amount_decimal(&req, "amount"))
    .bind(
        req.get("invoice_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(req.get("due_date").and_then(|v| v.as_str()).and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    }))
    .bind(status)
    .bind(amount_decimal(&req, "paid_amount"))
    .bind(req.get("payment_schedule"))
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(row) => row,
        Err(e) => return crate::shared::err_resp(e),
    };
    ApiResponse::success(row_to_payable_json(&row), "应付更新成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/payables/{id}",
    tag = "Payable",
    params(("id" = Uuid, Path, description = "应付账款ID")),
    responses(
        (status = 200, description = "删除应付账款成功", body = ApiResponse<String>),
        (status = 404, description = "应付账款不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_payable(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    let tenant_id = match resolve_write_tenant(&claims) {
        Ok(t) => t,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    // 复用请求级 RLS 事务：提交由 tenant_middleware 统一收尾，不再单独 commit。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE finance.payables SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;
    let r = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除应付失败: {}", e);
            return ApiResponse::server_error("删除应付失败");
        }
    };
    if r.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "应付删除成功")
    } else {
        ApiResponse::not_found("应付不存在")
    }
}

// ==================== 行转 JSON 辅助函数 ====================

fn row_to_expense_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "expense_number": row.try_get::<String, _>("expense_number").ok(),
        "expense_no": row.try_get::<String, _>("expense_number").ok(), // 双兼容：前端 expense_no ← 后端 expense_number
        "applicant_name": row.try_get::<Option<String>, _>("applicant_name").ok().flatten(),
        "title": row.try_get::<Option<String>, _>("applicant_name").ok().flatten(), // 双兼容：前端 title ← 后端 applicant_name
        "department_id": row.try_get::<Option<Uuid>, _>("department_id").ok().flatten(),
        "expense_type": row.try_get::<Option<String>, _>("expense_type").ok().flatten(),
        "category": row.try_get::<Option<String>, _>("expense_type").ok().flatten(), // 双兼容：前端 category ← 后端 expense_type
        "amount": row.try_get::<Decimal, _>("amount").ok(),
        "description": row.try_get::<Option<String>, _>("description").ok().flatten(),
        "expense_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("expense_date").ok().flatten(),
        "receipt_count": row.try_get::<Option<i32>, _>("receipt_count").ok().flatten(),
        "status": row.try_get::<String, _>("status").ok(),
        "approver_id": row.try_get::<Option<Uuid>, _>("approver_id").ok().flatten(),
        "approved_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("approved_at").ok().flatten(),
        "reimbursed_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("reimbursed_at").ok().flatten(),
        "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
        "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
        // 以下字段已建列（migration 20261018000004），真值读取
        "currency": row.try_get::<Option<String>, _>("currency").ok().flatten(),
        "sub_category": row.try_get::<Option<String>, _>("sub_category").ok().flatten(),
        "project_id": row.try_get::<Option<Uuid>, _>("project_id").ok().flatten(),
        "employee_id": row.try_get::<Option<Uuid>, _>("employee_id").ok().flatten(),
        "payment_method": row.try_get::<Option<String>, _>("payment_method").ok().flatten(),
        "voucher_id": row.try_get::<Option<Uuid>, _>("voucher_id").ok().flatten(),
    })
}

fn row_to_budget_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "tenant_id": row.try_get::<Option<Uuid>, _>("tenant_id").ok().flatten(),
        "department_id": row.try_get::<Option<Uuid>, _>("department_id").ok().flatten(),
        "budget_type": row.try_get::<Option<String>, _>("budget_type").ok().flatten(),
        "fiscal_year": row.try_get::<String, _>("fiscal_year").ok(),
        "total_budget": row.try_get::<rust_decimal::Decimal, _>("total_budget").ok(),
        "total_amount": row.try_get::<rust_decimal::Decimal, _>("total_budget").ok(), // 双兼容：前端 total_amount ← 后端 total_budget
        "used_amount": row.try_get::<rust_decimal::Decimal, _>("used_amount").ok(),
        "remaining_amount": row.try_get::<rust_decimal::Decimal, _>("remaining_amount").ok(),
        "usage_rate": row.try_get::<rust_decimal::Decimal, _>("usage_rate").ok(),
        "status": row.try_get::<String, _>("status").ok(),
        "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
        "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
        "deleted_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("deleted_at").ok().flatten(),
        // 以下字段 DB 无对应列，返回 null 保持前端契约兼容
        "code": null,
        "name": null,
        "period": null,
        "start_date": null,
        "end_date": null,
        "project_id": null,
        "items": null,
    })
}

fn row_to_receivable_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "invoice_number": row.try_get::<String, _>("invoice_number").ok(),
        "customer_name": row.try_get::<Option<String>, _>("customer_name").ok().flatten(),
        "project_id": row.try_get::<Option<Uuid>, _>("project_id").ok().flatten(),
        "contract_id": row.try_get::<Option<Uuid>, _>("contract_id").ok().flatten(),
        "project_name": row.try_get::<Option<String>, _>("project_name").ok().flatten(),
        "amount": row.try_get::<Decimal, _>("amount").ok(),
        "invoice_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("invoice_date").ok().flatten(),
        "due_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("due_date").ok().flatten(),
        "status": row.try_get::<String, _>("status").ok(),
        "received_amount": row.try_get::<Decimal, _>("received_amount").ok(),
        "payment_schedule": row.try_get::<Option<Value>, _>("payment_schedule").ok().flatten(),
        "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
        "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
    })
}

fn row_to_payable_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "invoice_number": row.try_get::<String, _>("invoice_number").ok(),
        "supplier_name": row.try_get::<Option<String>, _>("supplier_name").ok().flatten(),
        "project_id": row.try_get::<Option<Uuid>, _>("project_id").ok().flatten(),
        "contract_id": row.try_get::<Option<Uuid>, _>("contract_id").ok().flatten(),
        "category": row.try_get::<Option<String>, _>("category").ok().flatten(),
        "amount": row.try_get::<Decimal, _>("amount").ok(),
        "invoice_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("invoice_date").ok().flatten(),
        "due_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("due_date").ok().flatten(),
        "status": row.try_get::<String, _>("status").ok(),
        "paid_amount": row.try_get::<Decimal, _>("paid_amount").ok(),
        "payment_schedule": row.try_get::<Option<Value>, _>("payment_schedule").ok().flatten(),
        "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
        "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
    })
}

// ==================== 路由 ====================

/// V40 批 40 修复：operational 模块四组资源（expenses/budgets/receivables/payables）
/// 原先仅在 `#[utoipa::path]` 文档注解里声明 `security`，路由层未挂任何权限中间件，
/// 任意持有效 JWT 的同租户用户均可调用。照 `settlement_center/routes.rs` 惯例，
/// 按资源 × 动作拆分子 Router 并挂 `require_permission` 精确串匹配。
pub fn create_routes() -> Router<AppState> {
    use axum::routing::{delete, get, post, put};
    use topems_shared_auth::middleware::require_permission;

    // ===== Expenses（费用报销）=====
    let expenses_read = Router::new()
        .route("/expenses", get(list_expenses))
        .route("/expenses/{id}", get(get_expense))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:expense:read",
        )));
    let expenses_create = Router::new()
        .route("/expenses", post(create_expense))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:expense:create",
        )));
    let expenses_update = Router::new()
        .route("/expenses/{id}", put(update_expense))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:expense:update",
        )));
    let expenses_delete = Router::new()
        .route("/expenses/{id}", delete(delete_expense))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:expense:delete",
        )));

    // ===== Budgets（预算）：写动作统一用 finance:budget:write（细码 create/update/delete 不存在）=====
    let budgets_read = Router::new()
        .route("/budgets", get(list_budgets))
        .route("/budgets/{id}", get(get_budget))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:budget:read",
        )));
    let budgets_write = Router::new()
        .route("/budgets", post(create_budget))
        .route("/budgets/{id}", put(update_budget).delete(delete_budget))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:budget:write",
        )));

    // ===== Receivables（应收）=====
    let receivables_read = Router::new()
        .route("/receivables", get(list_receivables))
        .route("/receivables/{id}", get(get_receivable))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable:read",
        )));
    let receivables_create = Router::new()
        .route("/receivables", post(create_receivable))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable:create",
        )));
    let receivables_update = Router::new()
        .route("/receivables/{id}", put(update_receivable))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable:update",
        )));
    let receivables_delete = Router::new()
        .route("/receivables/{id}", delete(delete_receivable))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable:delete",
        )));

    // ===== Payables（应付）：复用 finance:receivable_payable:* 码族 =====
    let payables_read = Router::new()
        .route("/payables", get(list_payables))
        .route("/payables/{id}", get(get_payable))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable_payable:read",
        )));
    let payables_create = Router::new()
        .route("/payables", post(create_payable))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable_payable:create",
        )));
    let payables_update = Router::new()
        .route("/payables/{id}", put(update_payable))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable_payable:update",
        )));
    let payables_delete = Router::new()
        .route("/payables/{id}", delete(delete_payable))
        .layer(axum::middleware::from_fn(require_permission(
            "finance:receivable_payable:delete",
        )));

    Router::new()
        .merge(expenses_read)
        .merge(expenses_create)
        .merge(expenses_update)
        .merge(expenses_delete)
        .merge(budgets_read)
        .merge(budgets_write)
        .merge(receivables_read)
        .merge(receivables_create)
        .merge(receivables_update)
        .merge(receivables_delete)
        .merge(payables_read)
        .merge(payables_create)
        .merge(payables_update)
        .merge(payables_delete)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn claims(is_superuser: bool, tenant_id: Option<&str>) -> Claims {
        Claims {
            sub: "00000000-0000-0000-0000-0000000000aa".to_string(),
            username: "u".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant_id.map(str::to_string),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    #[test]
    fn superuser_create_uses_own_tenant() {
        // 超管自建数据必须落在自身租户，否则 tenant_id=NULL 会被按租户过滤的列表吞掉（自吞）
        let tid = "00000000-0000-0000-0000-000000000001";
        let got = resolve_create_tenant(&claims(true, Some(tid)));
        assert_eq!(got, Ok(Some(Uuid::parse_str(tid).unwrap())));
    }

    #[test]
    fn superuser_without_tenant_falls_back_to_public_row() {
        assert_eq!(resolve_create_tenant(&claims(true, None)), Ok(None));
    }

    #[test]
    fn normal_user_requires_tenant() {
        assert_eq!(
            resolve_create_tenant(&claims(false, None)),
            Err((400, "缺少租户ID".to_string()))
        );
    }

    #[test]
    fn invalid_tenant_is_rejected() {
        assert_eq!(
            resolve_create_tenant(&claims(false, Some("not-a-uuid"))),
            Err((400, "无效的租户ID".to_string()))
        );
    }
}
