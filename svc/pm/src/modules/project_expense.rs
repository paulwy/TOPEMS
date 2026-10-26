use axum::{
    extract::{Extension, Path},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::project_expense::{CreateExpenseRequest, ProjectExpense, UpdateExpenseRequest};
use crate::modules::effective_tenant_id;

// ==================== Pure functions ====================

/// Determines whether an expense should be auto-approved.
///
/// An expense is approved when:
/// - `amount` is positive,
/// - `amount` does not exceed the approval `threshold`, and
/// - `amount` does not exceed `budget_remaining`.
pub fn should_approve_expense(amount: f64, threshold: f64, budget_remaining: f64) -> bool {
    amount > 0.0 && amount <= threshold && amount <= budget_remaining
}

type RlsTxnArc =
    std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>;

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/expenses",
            get(list_expenses).post(add_expense),
        )
        .route(
            "/projects/{project_id}/expenses/{id}",
            get(get_expense).put(update_expense).delete(remove_expense),
        )
        .with_state(pool)
}

/// 列对齐 pm.project_expenses 真库（含补列）：expense_type/amount/currency/expense_date/
/// description/status/approver/approved_date/created_by + phase_id/budget_item_id/resource_id/
/// expense_ref_id/approval_workflow_id/attachment_ids。

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/expenses",
    tag = "project_expenses",
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "获取项目费用列表成功", body = ApiResponse<Vec<ProjectExpense>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_expenses(
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectExpense>>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Json(ApiResponse::server_error("rls transaction unavailable")),
    };
    let result = sqlx::query_as::<_, ProjectExpense>(
        only_own_schema_query!("pm", "SELECT id, project_id, phase_id, expense_type, description, amount, currency, expense_date, approved_date, budget_item_id, resource_id, expense_ref_id, status, approval_workflow_id, attachment_ids, created_by, approver, created_at, updated_at FROM pm.project_expenses WHERE project_id = $1 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000')) ORDER BY expense_date DESC"),
    )
    .bind(project_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(expenses) => Json(ApiResponse::success(expenses, "获取项目费用列表成功")),
        Err(e) => {
            tracing::error!("获取项目费用列表失败: {}", e);
            Json(ApiResponse::server_error("获取项目费用列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/projects/{project_id}/expenses",
    tag = "project_expenses",
    request_body = CreateExpenseRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "添加项目费用成功", body = ApiResponse<ProjectExpense>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn add_expense(
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateExpenseRequest>,
) -> Json<ApiResponse<ProjectExpense>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Json(ApiResponse::server_error("rls transaction unavailable")),
    };
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = effective_tenant_id(&ctx, &claims);

    // 列对齐真库：incurred_date->expense_date, paid_date->approved_date, approved_by->approver；
    // category/subcategory/reported_date 表无列，已删除。
    let result = sqlx::query_as::<_, ProjectExpense>(
        only_own_schema_query!("pm", r#"
        INSERT INTO pm.project_expenses (
            id, project_id, phase_id, expense_type, description,
            amount, currency, expense_date, approved_date, budget_item_id,
            resource_id, expense_ref_id, status, approval_workflow_id, attachment_ids,
            created_by, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
        "#),
    )
    .bind(id)
    .bind(project_id)
    .bind(req.phase_id)
    .bind(&req.expense_type)
    .bind(&req.description)
    .bind(req.amount)
    .bind(&req.currency)
    .bind(req.expense_date)
    .bind(None::<chrono::NaiveDate>)
    .bind(req.budget_item_id)
    .bind(req.resource_id)
    .bind(&req.expense_ref_id)
    .bind("pending")
    .bind(req.approval_workflow_id)
    .bind(&req.attachment_ids)
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(expense) => Json(ApiResponse::success(expense, "添加项目费用成功")),
        Err(e) => {
            tracing::error!("添加项目费用失败: {}", e);
            Json(ApiResponse::server_error("添加项目费用失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/expenses/{id}",
    tag = "project_expenses",
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "获取项目费用成功", body = ApiResponse<ProjectExpense>),
        (status = 404, description = "项目费用不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_expense(
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<ProjectExpense>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Json(ApiResponse::server_error("rls transaction unavailable")),
    };
    let result = sqlx::query_as::<_, ProjectExpense>(
        only_own_schema_query!("pm", "SELECT id, project_id, phase_id, expense_type, description, amount, currency, expense_date, approved_date, budget_item_id, resource_id, expense_ref_id, status, approval_workflow_id, attachment_ids, created_by, approver, created_at, updated_at FROM pm.project_expenses WHERE project_id = $1 AND id = $2 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"),
    )
    .bind(project_id)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(expense)) => Json(ApiResponse::success(expense, "获取项目费用成功")),
        Ok(None) => Json(ApiResponse::not_found("项目费用不存在")),
        Err(e) => {
            tracing::error!("获取项目费用失败: {}", e);
            Json(ApiResponse::server_error("获取项目费用失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:update"])),
    path = "/projects/{project_id}/expenses/{id}",
    tag = "project_expenses",
    request_body = UpdateExpenseRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "更新项目费用成功", body = ApiResponse<ProjectExpense>),
        (status = 404, description = "项目费用不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn update_expense(
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateExpenseRequest>,
) -> Json<ApiResponse<ProjectExpense>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Json(ApiResponse::server_error("rls transaction unavailable")),
    };
    let now = Utc::now();

    // paid_date->approved_date, approved_by->approver; category/subcategory 表无列已删。
    let result = sqlx::query_as::<_, ProjectExpense>(only_own_schema_query!(
        "pm",
        r#"
        UPDATE pm.project_expenses
        SET expense_type = COALESCE($1, expense_type),
            description = COALESCE($2, description),
            amount = COALESCE($3, amount),
            approved_date = COALESCE($4, approved_date),
            status = COALESCE($5, status),
            approver = COALESCE($6, approver),
            updated_at = $7
        WHERE project_id = $8 AND id = $9 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
        RETURNING *
        "#
    ))
    .bind(&req.expense_type)
    .bind(&req.description)
    .bind(req.amount)
    .bind(req.approved_date)
    .bind(&req.status)
    .bind(&req.approver)
    .bind(now)
    .bind(project_id)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(expense)) => Json(ApiResponse::success(expense, "更新项目费用成功")),
        Ok(None) => Json(ApiResponse::not_found("项目费用不存在")),
        Err(e) => {
            tracing::error!("更新项目费用失败: {}", e);
            Json(ApiResponse::server_error("更新项目费用失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pm:delete"])),
    path = "/projects/{project_id}/expenses/{id}",
    tag = "project_expenses",
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "删除项目费用成功", body = ApiResponse<bool>),
        (status = 404, description = "项目费用不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn remove_expense(
    Extension(txn_arc): Extension<RlsTxnArc>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<bool>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return Json(ApiResponse::server_error("rls transaction unavailable")),
    };
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.project_expenses WHERE project_id = $1 AND id = $2 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"
    ))
    .bind(project_id)
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            Json(ApiResponse::success(true, "删除项目费用成功"))
        }
        Ok(_) => Json(ApiResponse::not_found("项目费用不存在")),
        Err(e) => {
            tracing::error!("删除项目费用失败: {}", e);
            Json(ApiResponse::server_error("删除项目费用失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_approve_within_threshold_and_budget() {
        assert!(should_approve_expense(50.0, 100.0, 200.0));
    }

    #[test]
    fn test_reject_exceeds_threshold() {
        assert!(!should_approve_expense(150.0, 100.0, 200.0));
    }

    #[test]
    fn test_reject_exceeds_budget() {
        assert!(!should_approve_expense(150.0, 200.0, 100.0));
    }

    #[test]
    fn test_reject_zero_amount() {
        assert!(!should_approve_expense(0.0, 100.0, 200.0));
    }

    #[test]
    fn test_reject_negative_amount() {
        assert!(!should_approve_expense(-10.0, 100.0, 200.0));
    }

    #[test]
    fn test_approve_exact_threshold() {
        assert!(should_approve_expense(100.0, 100.0, 100.0));
    }

    #[test]
    fn test_approve_exact_budget() {
        assert!(should_approve_expense(100.0, 200.0, 100.0));
    }

    #[test]
    fn test_reject_zero_budget() {
        assert!(!should_approve_expense(50.0, 100.0, 0.0));
    }

    #[test]
    fn test_approve_small_amount() {
        assert!(should_approve_expense(0.01, 100.0, 100.0));
    }
}
