//! Demand Forecast handlers (migrated from APS)
//! 需求预测管理：创建、计算、验证、采纳预测

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::shared::aps_fsm::demand_forecast_can_transition;
use crate::AppState;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;
use utoipa::ToSchema;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/demand-forecasts",
            get(list_forecasts).post(create_forecast),
        )
        .route(
            "/demand-forecasts/{id}",
            get(get_forecast)
                .put(update_forecast)
                .delete(delete_forecast),
        )
        .route("/demand-forecasts/{id}/calculate", post(calculate_forecast))
        .route("/demand-forecasts/{id}/validate", post(validate_forecast))
        .route("/demand-forecasts/{id}/adopt", post(adopt_forecast))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct DemandForecast {
    pub id: Uuid,
    pub forecast_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub forecast_period: Option<String>,
    pub forecast_date: Option<NaiveDate>,
    pub forecast_quantity: Option<f64>,
    pub actual_quantity: Option<f64>,
    pub accuracy_rate: Option<f64>,
    pub method: String,
    pub confidence_level: Option<f64>,
    pub notes: Option<String>,
    pub status: String,
    pub tenant_id: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListForecastsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
    product_id: Option<Uuid>,
    method: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateForecastRequest {
    pub forecast_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub forecast_period: Option<String>,
    pub forecast_date: Option<NaiveDate>,
    pub forecast_quantity: Option<f64>,
    pub actual_quantity: Option<f64>,
    #[serde(default = "default_method")]
    pub method: String,
    pub confidence_level: Option<f64>,
    pub notes: Option<String>,
}

fn default_method() -> String {
    "moving_average".to_string()
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateForecastRequest {
    pub product_name: Option<String>,
    pub forecast_period: Option<String>,
    pub forecast_date: Option<NaiveDate>,
    pub forecast_quantity: Option<f64>,
    pub actual_quantity: Option<f64>,
    pub method: Option<String>,
    pub confidence_level: Option<f64>,
    pub notes: Option<String>,
    pub status: Option<String>,
}

// ==================== Database Init ====================

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS demand_forecasts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            forecast_no VARCHAR(64) NOT NULL,
            product_id UUID,
            product_name VARCHAR(256),
            forecast_period VARCHAR(32),
            forecast_date DATE,
            forecast_quantity DECIMAL(14,2),
            actual_quantity DECIMAL(14,2),
            accuracy_rate DECIMAL(5,2),
            method VARCHAR(64) DEFAULT 'moving_average',
            confidence_level DECIMAL(5,2),
            notes TEXT,
            status VARCHAR(32) DEFAULT 'draft',
            tenant_id UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_id, forecast_no)
        )
        "#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

// ==================== Helpers ====================

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap())
}

fn can_transition(from: &str, to: &str) -> bool {
    demand_forecast_can_transition(from, to).is_ok()
}

fn calc_accuracy(forecast: Option<f64>, actual: Option<f64>) -> Option<f64> {
    match (forecast, actual) {
        (Some(f), Some(a)) if f > 0.0 => {
            let diff = (f - a).abs();
            Some((1.0 - diff / f) * 100.0)
        }
        _ => None,
    }
}

// ==================== Handlers ====================

pub async fn list_forecasts(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListForecastsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let tenant_id = get_tenant_id(&claims);

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let product_filter = params.product_id;
    let method_filter = params.method.clone();

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        SELECT id, forecast_no, product_id, product_name, forecast_period, forecast_date,
               forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
               notes, status, tenant_id, created_at, updated_at
        FROM demand_forecasts
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR forecast_no ILIKE $2 OR product_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR product_id = $4)
          AND ($5::text IS NULL OR method = $5)
        ORDER BY forecast_date DESC, created_at DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(product_filter)
    .bind(&method_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(forecasts) => {
            let total = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM demand_forecasts
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR forecast_no ILIKE $2 OR product_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR product_id = $4)
                  AND ($5::text IS NULL OR method = $5)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(product_filter)
            .bind(&method_filter)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "forecasts": forecasts,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取需求预测列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取需求预测列表失败: {}", e);
            Json(ApiResponse::error(500, "获取需求预测列表失败"))
        }
    }
}

pub async fn get_forecast(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DemandForecast>> {
    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        SELECT id, forecast_no, product_id, product_name, forecast_period, forecast_date,
               forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
               notes, status, tenant_id, created_at, updated_at
        FROM demand_forecasts
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(fc)) => Json(ApiResponse::success(fc, "获取需求预测详情成功")),
        Ok(None) => Json(ApiResponse::error(404, "需求预测不存在")),
        Err(e) => {
            tracing::error!("获取需求预测详情失败: {}", e);
            Json(ApiResponse::error(500, "获取需求预测详情失败"))
        }
    }
}

pub async fn create_forecast(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateForecastRequest>,
) -> Json<ApiResponse<DemandForecast>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims);
    let accuracy_rate = calc_accuracy(req.forecast_quantity, req.actual_quantity);

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        INSERT INTO demand_forecasts
            (id, forecast_no, product_id, product_name, forecast_period, forecast_date,
             forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
             notes, status, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft', $13, $14, $15)
        RETURNING id, forecast_no, product_id, product_name, forecast_period, forecast_date,
                  forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
                  notes, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.forecast_no)
    .bind(req.product_id)
    .bind(&req.product_name)
    .bind(&req.forecast_period)
    .bind(req.forecast_date)
    .bind(req.forecast_quantity)
    .bind(req.actual_quantity)
    .bind(accuracy_rate)
    .bind(&req.method)
    .bind(req.confidence_level)
    .bind(&req.notes)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(fc) => Json(ApiResponse::success(fc, "需求预测创建成功")),
        Err(e) => {
            tracing::error!("创建需求预测失败: {}", e);
            Json(ApiResponse::error(500, "创建需求预测失败"))
        }
    }
}

pub async fn update_forecast(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateForecastRequest>,
) -> Json<ApiResponse<DemandForecast>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = sqlx::query_as::<_, DemandForecast>(
        "SELECT * FROM demand_forecasts WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let existing = match existing {
        Ok(Some(f)) => f,
        Ok(None) => return Json(ApiResponse::error(404, "需求预测不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    let product_name = req.product_name.or(existing.product_name);
    let forecast_period = req.forecast_period.or(existing.forecast_period);
    let forecast_date = req.forecast_date.or(existing.forecast_date);
    let forecast_quantity = req.forecast_quantity.or(existing.forecast_quantity);
    let actual_quantity = req.actual_quantity.or(existing.actual_quantity);
    let method = req.method.unwrap_or(existing.method);
    let confidence_level = req.confidence_level.or(existing.confidence_level);
    let notes = req.notes.or(existing.notes);
    let status = req.status.unwrap_or(existing.status);
    let accuracy_rate = calc_accuracy(forecast_quantity, actual_quantity);
    let now = Utc::now();

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        UPDATE demand_forecasts SET
            product_name = $1, forecast_period = $2, forecast_date = $3,
            forecast_quantity = $4, actual_quantity = $5, accuracy_rate = $6,
            method = $7, confidence_level = $8, notes = $9, status = $10, updated_at = $11
        WHERE id = $12 AND tenant_id = $13
        RETURNING id, forecast_no, product_id, product_name, forecast_period, forecast_date,
                  forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
                  notes, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(&product_name)
    .bind(&forecast_period)
    .bind(forecast_date)
    .bind(forecast_quantity)
    .bind(actual_quantity)
    .bind(accuracy_rate)
    .bind(&method)
    .bind(confidence_level)
    .bind(&notes)
    .bind(&status)
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(fc) => Json(ApiResponse::success(fc, "需求预测更新成功")),
        Err(e) => {
            tracing::error!("更新需求预测失败: {}", e);
            Json(ApiResponse::error(500, "更新需求预测失败"))
        }
    }
}

pub async fn delete_forecast(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);

    let result = sqlx::query("DELETE FROM demand_forecasts WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"id": id}),
            "需求预测删除成功",
        )),
        Ok(_) => Json(ApiResponse::error(404, "需求预测不存在")),
        Err(e) => {
            tracing::error!("删除需求预测失败: {}", e);
            Json(ApiResponse::error(500, "删除需求预测失败"))
        }
    }
}

// ==================== State Machine Handlers ====================

pub async fn calculate_forecast(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DemandForecast>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = match sqlx::query_as::<_, DemandForecast>(
        "SELECT * FROM demand_forecasts WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(f)) => f,
        Ok(None) => return Json(ApiResponse::error(404, "需求预测不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    if !can_transition(&existing.status, "calculated") {
        return Json(ApiResponse::error(
            400,
            &format!("当前状态 {} 不允许计算预测", existing.status),
        ));
    }

    // 简单计算：如果没有预测数量，基于历史数据生成（此处简化为保持原值）
    let forecast_quantity = existing.forecast_quantity.unwrap_or(0.0);
    let accuracy_rate = calc_accuracy(Some(forecast_quantity), existing.actual_quantity);
    let now = Utc::now();

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        UPDATE demand_forecasts SET
            forecast_quantity = $1, accuracy_rate = $2, status = 'calculated', updated_at = $3
        WHERE id = $4 AND tenant_id = $5
        RETURNING id, forecast_no, product_id, product_name, forecast_period, forecast_date,
                  forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
                  notes, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(Some(forecast_quantity))
    .bind(accuracy_rate)
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(fc) => Json(ApiResponse::success(fc, "需求预测计算完成")),
        Err(e) => {
            tracing::error!("计算需求预测失败: {}", e);
            Json(ApiResponse::error(500, "计算需求预测失败"))
        }
    }
}

pub async fn validate_forecast(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DemandForecast>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = match sqlx::query_as::<_, DemandForecast>(
        "SELECT * FROM demand_forecasts WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(f)) => f,
        Ok(None) => return Json(ApiResponse::error(404, "需求预测不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    if !can_transition(&existing.status, "validated") {
        return Json(ApiResponse::error(
            400,
            &format!("当前状态 {} 不允许验证预测", existing.status),
        ));
    }

    // 验证：检查预测数量是否合理（>0）
    if existing.forecast_quantity.unwrap_or(0.0) <= 0.0 {
        return Json(ApiResponse::error(400, "预测数量必须大于0，无法验证"));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        UPDATE demand_forecasts SET status = 'validated', updated_at = $1
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, forecast_no, product_id, product_name, forecast_period, forecast_date,
                  forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
                  notes, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(fc) => Json(ApiResponse::success(fc, "需求预测验证通过")),
        Err(e) => {
            tracing::error!("验证需求预测失败: {}", e);
            Json(ApiResponse::error(500, "验证需求预测失败"))
        }
    }
}

pub async fn adopt_forecast(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<DemandForecast>> {
    let tenant_id = get_tenant_id(&claims);

    let existing = match sqlx::query_as::<_, DemandForecast>(
        "SELECT * FROM demand_forecasts WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(f)) => f,
        Ok(None) => return Json(ApiResponse::error(404, "需求预测不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    };

    if !can_transition(&existing.status, "adopted") {
        return Json(ApiResponse::error(
            400,
            &format!("当前状态 {} 不允许采纳预测", existing.status),
        ));
    }

    let now = Utc::now();
    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        UPDATE demand_forecasts SET status = 'adopted', updated_at = $1
        WHERE id = $2 AND tenant_id = $3
        RETURNING id, forecast_no, product_id, product_name, forecast_period, forecast_date,
                  forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
                  notes, status, tenant_id, created_at, updated_at
        "#,
    )
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(fc) => Json(ApiResponse::success(fc, "需求预测已采纳")),
        Err(e) => {
            tracing::error!("采纳需求预测失败: {}", e);
            Json(ApiResponse::error(500, "采纳需求预测失败"))
        }
    }
}

// ==================== Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_method() {
        assert_eq!(default_method(), "moving_average");
    }

    #[test]
    fn test_calc_accuracy() {
        assert_eq!(calc_accuracy(Some(100.0), Some(90.0)), Some(90.0));
        assert_eq!(calc_accuracy(Some(100.0), Some(100.0)), Some(100.0));
        assert_eq!(calc_accuracy(Some(100.0), Some(110.0)), Some(90.0));
        assert_eq!(calc_accuracy(Some(0.0), Some(50.0)), None);
        assert_eq!(calc_accuracy(None, Some(50.0)), None);
        assert_eq!(calc_accuracy(Some(100.0), None), None);
    }

    #[test]
    fn test_can_transition_valid() {
        assert!(can_transition("draft", "calculated"));
        assert!(can_transition("calculated", "validated"));
        assert!(can_transition("validated", "adopted"));
        assert!(can_transition("calculated", "draft"));
        assert!(can_transition("adopted", "superseded"));
        assert!(can_transition("draft", "cancelled"));
    }

    #[test]
    fn test_can_transition_invalid() {
        assert!(!can_transition("draft", "validated"));
        assert!(!can_transition("calculated", "adopted"));
        assert!(!can_transition("adopted", "draft"));
        assert!(!can_transition("superseded", "draft"));
        assert!(!can_transition("cancelled", "draft"));
    }
}
