use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post, put, delete},
    Json,
    Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::budget::{
    Budget,
    BudgetItem,
    CreateBudgetItemRequest,
    CreateBudgetRequest,
    UpdateBudgetItemRequest,
    UpdateBudgetRequest,
};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/api/v1/projects/{project_id}/budgets", get(get_project_budgets).post(create_budget))
        .route("/api/v1/budgets/{id}", get(get_budget).put(update_budget))
        .route("/api/v1/budgets/{id}/submit", post(submit_budget))
        .route("/api/v1/budgets/{id}/approve", post(approve_budget))
        .route("/api/v1/budgets/{id}/items", get(get_budget_items).post(create_budget_item))
        .route("/api/v1/budgets/{id}/items/{item_id}", put(update_budget_item).delete(delete_budget_item))
        .with_state(pool)
}

async fn get_project_budgets(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<Budget>>> {
    let budgets = sqlx::query_as::<_, Budget>("SELECT * FROM pm.budgets WHERE project_id = $1 ORDER BY version DESC")
        .bind(project_id)
        .fetch_all(&pool)
        .await;

    match budgets {
        Ok(b) => Json(ApiResponse::success(b, "获取项目预算列表成功")),
        Err(e) => {
            tracing::error!("获取预算失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取预算失败"))
        }
    }
}

async fn get_budget(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Budget>> {
    let budget = sqlx::query_as::<_, Budget>("SELECT * FROM pm.budgets WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await;

    match budget {
        Ok(b) => Json(ApiResponse::success(b, "获取预算详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "预算不存在")),
        Err(e) => {
            tracing::error!("获取预算失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取预算失败"))
        }
    }
}

async fn create_budget(
    State(pool): State<PgPool>,
    Json(req): Json<CreateBudgetRequest>,
) -> Json<ApiResponse<Budget>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let budget = sqlx::query_as::<_, Budget>(
        "INSERT INTO pm.budgets (id, project_id, budget_code, budget_name, budget_type, total_amount, status, version, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'draft', 1, $7, $8, $9) RETURNING *"
    )
    .bind(id)
    .bind(req.project_id)
    .bind(&req.budget_code)
    .bind(&req.budget_name)
    .bind(req.budget_type)
    .bind(req.total_amount)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match budget {
        Ok(b) => Json(ApiResponse::success(b, "创建预算成功")),
        Err(e) => {
            tracing::error!("创建预算失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建预算失败"))
        }
    }
}

async fn update_budget(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateBudgetRequest>,
) -> Json<ApiResponse<Budget>> {
    let budget = sqlx::query_as::<_, Budget>(
        "UPDATE pm.budgets SET
            budget_name = COALESCE($1, budget_name),
            budget_type = COALESCE($2, budget_type),
            total_amount = COALESCE($3, total_amount),
            status = COALESCE($4, status),
            updated_at = $5
        WHERE id = $6 RETURNING *"
    )
    .bind(req.budget_name)
    .bind(req.budget_type)
    .bind(req.total_amount)
    .bind(req.status)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match budget {
        Ok(b) => Json(ApiResponse::success(b, "更新预算成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "预算不存在")),
        Err(e) => {
            tracing::error!("更新预算失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "更新预算失败"))
        }
    }
}

async fn submit_budget(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Budget>> {
    let budget = sqlx::query_as::<_, Budget>(
        "UPDATE pm.budgets SET status = 'pending', updated_at = $1 WHERE id = $2 RETURNING *"
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match budget {
        Ok(b) => Json(ApiResponse::success(b, "提交审批成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "预算不存在")),
        Err(e) => {
            tracing::error!("提交审批失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "提交审批失败"))
        }
    }
}

async fn approve_budget(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Budget>> {
    let budget = sqlx::query_as::<_, Budget>(
        "UPDATE pm.budgets SET status = 'approved', updated_at = $1 WHERE id = $2 RETURNING *"
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match budget {
        Ok(b) => Json(ApiResponse::success(b, "批准预算成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "预算不存在")),
        Err(e) => {
            tracing::error!("批准预算失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "批准预算失败"))
        }
    }
}

async fn get_budget_items(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<BudgetItem>>> {
    let items = sqlx::query_as::<_, BudgetItem>("SELECT * FROM pm.budget_items WHERE budget_id = $1")
        .bind(id)
        .fetch_all(&pool)
        .await;

    match items {
        Ok(i) => Json(ApiResponse::success(i, "获取预算项列表成功")),
        Err(e) => {
            tracing::error!("获取预算项失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取预算项失败"))
        }
    }
}

async fn create_budget_item(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateBudgetItemRequest>,
) -> Json<ApiResponse<BudgetItem>> {
    let item_id = Uuid::new_v4();
    let now = Utc::now();
    
    let item = sqlx::query_as::<_, BudgetItem>(
        "INSERT INTO pm.budget_items (id, budget_id, item_code, item_name, category, subcategory, budget_amount, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *"
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
    .fetch_one(&pool)
    .await;

    match item {
        Ok(i) => Json(ApiResponse::success(i, "创建预算项成功")),
        Err(e) => {
            tracing::error!("创建预算项失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建预算项失败"))
        }
    }
}

async fn update_budget_item(
    State(pool): State<PgPool>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateBudgetItemRequest>,
) -> Json<ApiResponse<BudgetItem>> {
    let item = sqlx::query_as::<_, BudgetItem>(
        "UPDATE pm.budget_items SET
            item_name = COALESCE($1, item_name),
            category = COALESCE($2, category),
            subcategory = COALESCE($3, subcategory),
            budget_amount = COALESCE($4, budget_amount),
            description = COALESCE($5, description),
            updated_at = $6
        WHERE id = $7 AND budget_id = $8 RETURNING *"
    )
    .bind(req.item_name)
    .bind(req.category)
    .bind(req.subcategory)
    .bind(req.budget_amount)
    .bind(req.description)
    .bind(Utc::now())
    .bind(item_id)
    .bind(id)
    .fetch_one(&pool)
    .await;

    match item {
        Ok(i) => Json(ApiResponse::success(i, "更新预算项成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "预算项不存在")),
        Err(e) => {
            tracing::error!("更新预算项失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "更新预算项失败"))
        }
    }
}

async fn delete_budget_item(
    State(pool): State<PgPool>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM pm.budget_items WHERE id = $1 AND budget_id = $2")
        .bind(item_id)
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除预算项成功")),
        Ok(_) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "预算项不存在")),
        Err(e) => {
            tracing::error!("删除预算项失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "删除预算项失败"))
        }
    }
}