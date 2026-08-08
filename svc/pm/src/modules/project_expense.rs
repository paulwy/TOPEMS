use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::project_expense::{CreateExpenseRequest, ProjectExpense, UpdateExpenseRequest};

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
    path = "/projects/{project_id}/expenses",
    tag = "project_expenses",
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
        "id, project_id, phase_id, expense_type, category, subcategory, description, amount, currency, incurred_date, budget_ref_id, status, created_at, updated_at FROM pm.project_expenses WHERE project_id = $1 ORDER BY incurred_date DESC",
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
    path = "/projects/{project_id}/expenses",
    tag = "project_expenses",
    request_body = CreateExpenseRequest,
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
        r#"
        INSERT INTO plugin_pm.project_expenses (
            id, project_id, phase_id, expense_type, category,
            subcategory, description, amount, currency, incurred_date,
            reported_date, paid_date, budget_item_id, resource_id,
            expense_ref_id, status, approval_workflow_id, attachment_ids,
            created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
        "#,
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
    path = "/projects/{project_id}/expenses/{id}",
    tag = "project_expenses",
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
        "id, project_id, phase_id, expense_type, category, subcategory, description, amount, currency, incurred_date, budget_ref_id, status, created_at, updated_at FROM pm.project_expenses WHERE project_id = $1 AND id = $2",
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
    path = "/projects/{project_id}/expenses/{id}",
    tag = "project_expenses",
    request_body = UpdateExpenseRequest,
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

    let result = sqlx::query_as::<_, ProjectExpense>(
        r#"
        UPDATE plugin_pm.project_expenses
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
        "#,
    )
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
    path = "/projects/{project_id}/expenses/{id}",
    tag = "project_expenses",
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
    let result = sqlx::query("DELETE FROM pm.project_expenses WHERE project_id = $1 AND id = $2")
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
