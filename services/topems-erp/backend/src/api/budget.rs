use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    Router,
    routing::{get, post, put, delete},
};
use uuid::Uuid;

use crate::models::{
    project_budget::{
        CreateBudgetItemRequest, CreateBudgetRequest,
        ProjectBudget, ProjectBudgetItem, UpdateBudgetItemRequest, UpdateBudgetRequest,
    },
};

use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/project-budgets", post(create_project_budget))
        .route("/api/v1/project-budgets/:project_id", get(get_project_budget).put(update_project_budget))
        .route("/api/v1/project-budgets/:budget_id/items", post(create_budget_item).get(get_budget_items))
        .route("/api/v1/project-budgets/items/:id", put(update_budget_item).delete(delete_budget_item))
}

pub async fn create_project_budget(
    State(state): State<ApiState>,
    Json(payload): Json<CreateBudgetRequest>,
) -> Result<Json<ProjectBudget>, (StatusCode, String)> {
    let budget_type = payload.budget_type.to_string();
    let status = "DRAFT".to_string();
    let remaining_amount = payload.total_budget;

    let budget = sqlx::query_as::<_, ProjectBudget>(
        r#"
        INSERT INTO project_budgets (
            project_id, budget_type, fiscal_year, total_budget, 
            allocated_amount, used_amount, remaining_amount, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        "#,
    )
    .bind(&payload.project_id)
    .bind(&budget_type)
    .bind(&payload.fiscal_year)
    .bind(&payload.total_budget)
    .bind(0.0)
    .bind(0.0)
    .bind(&remaining_amount)
    .bind(&status)
    .bind("admin")
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(budget))
}

pub async fn get_project_budget(
    State(state): State<ApiState>,
    Path(project_id): Path<Uuid>,
) -> Result<Json<ProjectBudget>, (StatusCode, String)> {
    let budget = sqlx::query_as::<_, ProjectBudget>(
        r#"SELECT * FROM project_budgets WHERE project_id = $1"#,
    )
    .bind(project_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (StatusCode::NOT_FOUND, "Budget not found".to_string()),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    })?;

    Ok(Json(budget))
}

pub async fn update_project_budget(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateBudgetRequest>,
) -> Result<Json<ProjectBudget>, (StatusCode, String)> {
    let budget = sqlx::query_as::<_, ProjectBudget>(
        r#"
        UPDATE project_budgets SET
            budget_type = COALESCE($1::text, budget_type),
            fiscal_year = COALESCE($2, fiscal_year),
            total_budget = COALESCE($3, total_budget),
            allocated_amount = COALESCE($4, allocated_amount),
            used_amount = COALESCE($5, used_amount),
            status = COALESCE($6::text, status),
            approved_by = COALESCE($7, approved_by),
            approved_at = COALESCE($8, approved_at),
            updated_at = NOW()
        WHERE id = $9
        RETURNING *
        "#
    )
    .bind(&payload.budget_type)
    .bind(&payload.fiscal_year)
    .bind(&payload.total_budget)
    .bind(&payload.allocated_amount)
    .bind(&payload.used_amount)
    .bind(&payload.status)
    .bind(&payload.approved_by)
    .bind(&payload.approved_at)
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (StatusCode::NOT_FOUND, "Budget not found".to_string()),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    })?;

    Ok(Json(budget))
}

pub async fn create_budget_item(
    State(state): State<ApiState>,
    Json(payload): Json<CreateBudgetItemRequest>,
) -> Result<Json<ProjectBudgetItem>, (StatusCode, String)> {
    let item = sqlx::query_as::<_, ProjectBudgetItem>(
        r#"
        INSERT INTO project_budget_items (budget_id, category, subcategory, budget_amount, used_amount, remarks)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(&payload.budget_id)
    .bind(&payload.category)
    .bind(&payload.subcategory)
    .bind(&payload.budget_amount)
    .bind(0.0)
    .bind(&payload.remarks)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(item))
}

pub async fn get_budget_items(
    State(state): State<ApiState>,
    Path(budget_id): Path<Uuid>,
) -> Result<Json<Vec<ProjectBudgetItem>>, (StatusCode, String)> {
    let items = sqlx::query_as::<_, ProjectBudgetItem>(
        r#"SELECT * FROM project_budget_items WHERE budget_id = $1 ORDER BY category, subcategory"#,
    )
    .bind(budget_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(items))
}

pub async fn update_budget_item(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateBudgetItemRequest>,
) -> Result<Json<ProjectBudgetItem>, (StatusCode, String)> {
    let item = sqlx::query_as::<_, ProjectBudgetItem>(
        r#"
        UPDATE project_budget_items SET
            category = COALESCE($1, category),
            subcategory = COALESCE($2, subcategory),
            budget_amount = COALESCE($3, budget_amount),
            used_amount = COALESCE($4, used_amount),
            remarks = COALESCE($5, remarks),
            updated_at = NOW()
        WHERE id = $6
        RETURNING *
        "#
    )
    .bind(&payload.category)
    .bind(&payload.subcategory)
    .bind(&payload.budget_amount)
    .bind(&payload.used_amount)
    .bind(&payload.remarks)
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (StatusCode::NOT_FOUND, "Budget item not found".to_string()),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
    })?;

    Ok(Json(item))
}

pub async fn delete_budget_item(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let result = sqlx::query(
        r#"DELETE FROM project_budget_items WHERE id = $1"#,
    )
    .bind(id)
    .execute(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Budget item not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}
