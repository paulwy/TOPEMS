use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::budget::{
    Budget, BudgetItem, CreateBudgetItemRequest, CreateBudgetRequest, UpdateBudgetItemRequest,
    UpdateBudgetRequest,
};

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

pub fn create_routes(pool: PgPool) -> Router {
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
        .with_state(pool)
}

async fn get_project_budgets(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<Budget>>> {
    let budgets = sqlx::query_as::<_, Budget>(
        "id, project_id, budget_code, budget_name, budget_type, total_amount, allocated_amount, spent_amount, remaining_amount, status, start_date, end_date, description, created_by, created_at, updated_at FROM plugin_pm.budgets WHERE project_id = $1 ORDER BY version DESC",
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match budgets {
        Ok(b) => Json(ApiResponse::success(b, "获取项目预算列表成功")),
        Err(e) => {
            tracing::error!("获取预算失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取预算失败",
            ))
        }
    }
}

async fn get_budget(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> Json<ApiResponse<Budget>> {
    let budget = sqlx::query_as::<_, Budget>("id, project_id, budget_code, budget_name, budget_type, total_amount, allocated_amount, spent_amount, remaining_amount, status, start_date, end_date, description, created_by, created_at, updated_at FROM plugin_pm.budgets WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await;

    match budget {
        Ok(b) => Json(ApiResponse::success(b, "获取预算详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "预算不存在",
        )),
        Err(e) => {
            tracing::error!("获取预算失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取预算失败",
            ))
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
        "INSERT INTO plugin_pm.budgets (id, project_id, budget_code, budget_name, budget_type, total_amount, status, version, created_by, created_at, updated_at)
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
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建预算失败",
            ))
        }
    }
}

async fn update_budget(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateBudgetRequest>,
) -> Json<ApiResponse<Budget>> {
    let budget = sqlx::query_as::<_, Budget>(
        "UPDATE plugin_pm.budgets SET
            budget_name = COALESCE($1, budget_name),
            budget_type = COALESCE($2, budget_type),
            total_amount = COALESCE($3, total_amount),
            status = COALESCE($4, status),
            updated_at = $5
        WHERE id = $6 RETURNING *",
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
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "预算不存在",
        )),
        Err(e) => {
            tracing::error!("更新预算失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新预算失败",
            ))
        }
    }
}

async fn submit_budget(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Budget>> {
    let budget = sqlx::query_as::<_, Budget>(
        "UPDATE plugin_pm.budgets SET status = 'pending', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match budget {
        Ok(b) => Json(ApiResponse::success(b, "提交审批成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "预算不存在",
        )),
        Err(e) => {
            tracing::error!("提交审批失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "提交审批失败",
            ))
        }
    }
}

async fn approve_budget(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Budget>> {
    let budget = sqlx::query_as::<_, Budget>(
        "UPDATE plugin_pm.budgets SET status = 'approved', updated_at = $1 WHERE id = $2 RETURNING *",
    )
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match budget {
        Ok(b) => Json(ApiResponse::success(b, "批准预算成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "预算不存在",
        )),
        Err(e) => {
            tracing::error!("批准预算失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "批准预算失败",
            ))
        }
    }
}

async fn get_budget_items(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<BudgetItem>>> {
    let items = sqlx::query_as::<_, BudgetItem>(
        "SELECT id, budget_id, item_code, item_name, category, subcategory, budget_amount, allocated_amount, spent_amount, remaining_amount, created_at FROM plugin_pm.budget_items WHERE budget_id = $1",
    )
    .bind(id)
    .fetch_all(&pool)
    .await;

    match items {
        Ok(i) => Json(ApiResponse::success(i, "获取预算项列表成功")),
        Err(e) => {
            tracing::error!("获取预算项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取预算项失败",
            ))
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
        "INSERT INTO plugin_pm.budget_items (id, budget_id, item_code, item_name, category, subcategory, budget_amount, created_at, updated_at)
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
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建预算项失败",
            ))
        }
    }
}

async fn update_budget_item(
    State(pool): State<PgPool>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateBudgetItemRequest>,
) -> Json<ApiResponse<BudgetItem>> {
    let item = sqlx::query_as::<_, BudgetItem>(
        "UPDATE plugin_pm.budget_items SET
            item_name = COALESCE($1, item_name),
            category = COALESCE($2, category),
            subcategory = COALESCE($3, subcategory),
            budget_amount = COALESCE($4, budget_amount),
            description = COALESCE($5, description),
            updated_at = $6
        WHERE id = $7 AND budget_id = $8 RETURNING *",
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
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "预算项不存在",
        )),
        Err(e) => {
            tracing::error!("更新预算项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新预算项失败",
            ))
        }
    }
}

async fn delete_budget_item(
    State(pool): State<PgPool>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM plugin_pm.budget_items WHERE id = $1 AND budget_id = $2")
        .bind(item_id)
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除预算项成功")),
        Ok(_) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "预算项不存在",
        )),
        Err(e) => {
            tracing::error!("删除预算项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "删除预算项失败",
            ))
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
