use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::project_expense::{CreateExpenseRequest, ProjectExpense, UpdateExpenseRequest};

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
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectExpense>>> {
    let result = sqlx::query_as::<_, ProjectExpense>(
        only_own_schema_query!("pm", "id, project_id, phase_id, expense_type, category, subcategory, description, amount, currency, incurred_date, budget_ref_id, status, created_at, updated_at FROM pm.project_expenses WHERE project_id = $1 ORDER BY incurred_date DESC"),
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(expenses) => Json(ApiResponse::success(expenses, "获取项目费用列表成功")),
        Err(e) => {
            tracing::error!("获取项目费用列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目费用列表失败"))
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
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateExpenseRequest>,
) -> Json<ApiResponse<ProjectExpense>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectExpense>(
        only_own_schema_query!("pm", r#"
        INSERT INTO pm.project_expenses (
            id, project_id, phase_id, expense_type, category,
            subcategory, description, amount, currency, incurred_date,
            reported_date, paid_date, budget_item_id, resource_id,
            expense_ref_id, status, approval_workflow_id, attachment_ids,
            created_by, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
        "#),
    )
    .bind(id)
    .bind(project_id)
    .bind(req.phase_id)
    .bind(&req.expense_type)
    .bind(&req.category)
    .bind(&req.subcategory)
    .bind(&req.description)
    .bind(req.amount)
    .bind(&req.currency)
    .bind(req.incurred_date)
    .bind(now.date_naive())
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
    .bind(Uuid::nil())
    .fetch_one(&pool)
    .await;

    match result {
        Ok(expense) => Json(ApiResponse::success(expense, "添加项目费用成功")),
        Err(e) => {
            tracing::error!("添加项目费用失败: {}", e);
            Json(ApiResponse::error(500, "添加项目费用失败"))
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
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<ProjectExpense>> {
    let result = sqlx::query_as::<_, ProjectExpense>(
        only_own_schema_query!("pm", "id, project_id, phase_id, expense_type, category, subcategory, description, amount, currency, incurred_date, budget_ref_id, status, created_at, updated_at FROM pm.project_expenses WHERE project_id = $1 AND id = $2"),
    )
    .bind(project_id)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(expense)) => Json(ApiResponse::success(expense, "获取项目费用成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目费用不存在")),
        Err(e) => {
            tracing::error!("获取项目费用失败: {}", e);
            Json(ApiResponse::error(500, "获取项目费用失败"))
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
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateExpenseRequest>,
) -> Json<ApiResponse<ProjectExpense>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectExpense>(only_own_schema_query!(
        "pm",
        r#"
        UPDATE pm.project_expenses
        SET expense_type = COALESCE($1, expense_type),
            category = COALESCE($2, category),
            subcategory = COALESCE($3, subcategory),
            description = COALESCE($4, description),
            amount = COALESCE($5, amount),
            paid_date = COALESCE($6, paid_date),
            status = COALESCE($7, status),
            approved_by = COALESCE($8, approved_by),
            updated_at = $9
        WHERE project_id = $10 AND id = $11
        RETURNING *
        "#
    ))
    .bind(&req.expense_type)
    .bind(&req.category)
    .bind(&req.subcategory)
    .bind(&req.description)
    .bind(req.amount)
    .bind(req.paid_date)
    .bind(&req.status)
    .bind(&req.approved_by)
    .bind(now)
    .bind(project_id)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(expense)) => Json(ApiResponse::success(expense, "更新项目费用成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目费用不存在")),
        Err(e) => {
            tracing::error!("更新项目费用失败: {}", e);
            Json(ApiResponse::error(500, "更新项目费用失败"))
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
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.project_expenses WHERE project_id = $1 AND id = $2"
    ))
    .bind(project_id)
    .bind(id)
    .execute(&pool)
    .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            Json(ApiResponse::success(true, "删除项目费用成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "项目费用不存在")),
        Err(e) => {
            tracing::error!("删除项目费用失败: {}", e);
            Json(ApiResponse::error(500, "删除项目费用失败"))
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
        assert!(should_approve_expense(100.0, 100.0, 200.0));
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
        assert!(should_approve_expense(0.01, 100.0, 200.0));
    }
}
