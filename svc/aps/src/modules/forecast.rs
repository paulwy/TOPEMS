use axum::{
    extract::FromRef,
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::middleware::tenant::get_tenant_id;
use crate::modules::ApiState;
use bigdecimal::ToPrimitive;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct DemandForecast {
    pub id: Uuid,
    pub forecast_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub forecast_period: Option<String>,
    pub forecast_date: Option<NaiveDate>,
    pub forecast_quantity: Option<sqlx::types::BigDecimal>,
    pub actual_quantity: Option<sqlx::types::BigDecimal>,
    pub accuracy_rate: Option<sqlx::types::BigDecimal>,
    pub method: String,
    pub confidence_level: Option<sqlx::types::BigDecimal>,
    pub notes: Option<String>,
    pub tenant_id: Option<Uuid>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateForecastRequest {
    pub forecast_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub forecast_period: Option<String>,
    pub forecast_date: Option<NaiveDate>,
    pub forecast_quantity: Option<f64>,
    pub actual_quantity: Option<f64>,
    pub method: Option<String>,
    pub confidence_level: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateForecastRequest {
    pub product_name: Option<String>,
    pub forecast_period: Option<String>,
    pub forecast_date: Option<NaiveDate>,
    pub forecast_quantity: Option<f64>,
    pub actual_quantity: Option<f64>,
    pub method: Option<String>,
    pub confidence_level: Option<f64>,
    pub notes: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/forecasts", get(list_forecasts).post(create_forecast))
        .route(
            "/forecasts/{id}",
            get(get_forecast)
                .put(update_forecast)
                .delete(delete_forecast),
        )
        .route("/forecasts/{id}/calculate", post(calculate_forecast))
        .route("/forecasts/{id}/validate", post(validate_forecast))
}

#[utoipa::path(
    get,
    path = "/api/aps/forecasts",
    responses(
        (status = 200, description = "list_forecasts OK")
    ),
    tag = "APS - Forecast"
)]
pub async fn list_forecasts(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<PaginationParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        SELECT id, forecast_no, product_id, product_name, forecast_period, forecast_date,
               forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
               notes, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_demand_forecasts
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR forecast_no ILIKE $2 OR product_name ILIKE $2)
          AND ($3::text IS NULL OR method = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(forecasts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_aps.aps_demand_forecasts
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR forecast_no ILIKE $2 OR product_name ILIKE $2)
                  AND ($3::text IS NULL OR method = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let response_data = serde_json::json!({
                "forecasts": forecasts,
                "total": total,
                "page": page,
                "page_size": page_size
            });
            Json(ApiResponse::success(response_data, "获取需求预测列表成功"))
        }
        Err(e) => {
            tracing::error!("获取需求预测列表失败: {}", e);
            Json(api_error(500, "获取需求预测列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/aps/forecasts/{id}",
    params(
        ("id" = Uuid, Path, description = "需求预测 ID")
    ),
    responses(
        (status = 200, description = "get_forecast OK")
    ),
    tag = "APS - Forecast"
)]
pub async fn get_forecast(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<DemandForecast>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        SELECT id, forecast_no, product_id, product_name, forecast_period, forecast_date,
               forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
               notes, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_demand_forecasts
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(forecast)) => Json(ApiResponse::success(forecast, "获取需求预测成功")),
        Ok(None) => Json(api_error(404, "需求预测不存在")),
        Err(e) => {
            tracing::error!("获取需求预测失败: {}", e);
            Json(api_error(500, "获取需求预测失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/aps/forecasts",
    request_body = CreateForecastRequest,
    responses(
        (status = 200, description = "create_forecast OK")
    ),
    tag = "APS - Forecast"
)]
pub async fn create_forecast(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<CreateForecastRequest>,
) -> Json<ApiResponse<DemandForecast>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);
    let method = req.method.unwrap_or_else(|| "moving_average".to_string());
    let forecast_quantity: Option<sqlx::types::BigDecimal> = req
        .forecast_quantity
        .and_then(|v| sqlx::types::BigDecimal::try_from(v).ok());
    let actual_quantity: Option<sqlx::types::BigDecimal> = req
        .actual_quantity
        .and_then(|v| sqlx::types::BigDecimal::try_from(v).ok());
    let confidence_level: Option<sqlx::types::BigDecimal> = req
        .confidence_level
        .and_then(|v| sqlx::types::BigDecimal::try_from(v).ok())
        .or_else(|| sqlx::types::BigDecimal::try_from(0.95f64).ok());

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        INSERT INTO plugin_aps.aps_demand_forecasts
            (id, forecast_no, product_id, product_name, forecast_period, forecast_date,
             forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
             notes, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13, $14)
        RETURNING id, forecast_no, product_id, product_name, forecast_period, forecast_date,
                  forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
                  notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.forecast_no)
    .bind(req.product_id)
    .bind(&req.product_name)
    .bind(&req.forecast_period)
    .bind(req.forecast_date)
    .bind(&forecast_quantity)
    .bind(&actual_quantity)
    .bind(&method)
    .bind(&confidence_level)
    .bind(&req.notes)
    .bind(tenant_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(forecast) => Json(ApiResponse::success(forecast, "需求预测创建成功")),
        Err(e) => {
            tracing::error!("创建需求预测失败: {}", e);
            Json(api_error(500, "创建需求预测失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/aps/forecasts/{id}",
    request_body = UpdateForecastRequest,
    params(
        ("id" = Uuid, Path, description = "需求预测 ID")
    ),
    responses(
        (status = 200, description = "update_forecast OK")
    ),
    tag = "APS - Forecast"
)]
pub async fn update_forecast(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    axum::extract::Json(req): axum::extract::Json<UpdateForecastRequest>,
) -> Json<ApiResponse<DemandForecast>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, DemandForecast>(
        r#"
        SELECT id, forecast_no, product_id, product_name, forecast_period, forecast_date,
               forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
               notes, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_demand_forecasts
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(f)) => f,
        Ok(None) => return Json(api_error(404, "需求预测不存在")),
        Err(e) => return Json(api_error(500, &format!("查询需求预测失败: {}", e))),
    };

    let product_name = req.product_name.or(existing.product_name);
    let forecast_period = req.forecast_period.or(existing.forecast_period);
    let forecast_date = req.forecast_date.or(existing.forecast_date);
    let method = req.method.unwrap_or(existing.method);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let forecast_quantity: Option<sqlx::types::BigDecimal> = match req.forecast_quantity {
        Some(v) => sqlx::types::BigDecimal::try_from(v).ok(),
        None => existing.forecast_quantity,
    };
    let actual_quantity: Option<sqlx::types::BigDecimal> = match req.actual_quantity {
        Some(v) => sqlx::types::BigDecimal::try_from(v).ok(),
        None => existing.actual_quantity,
    };
    let confidence_level: Option<sqlx::types::BigDecimal> = match req.confidence_level {
        Some(v) => sqlx::types::BigDecimal::try_from(v).ok(),
        None => existing.confidence_level,
    };

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        UPDATE plugin_aps.aps_demand_forecasts SET
            product_name = $2, forecast_period = $3, forecast_date = $4,
            forecast_quantity = $5, actual_quantity = $6, method = $7,
            confidence_level = $8, notes = $9, updated_at = $10
        WHERE id = $1 AND tenant_id = $11
        RETURNING id, forecast_no, product_id, product_name, forecast_period, forecast_date,
                  forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
                  notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&product_name)
    .bind(&forecast_period)
    .bind(forecast_date)
    .bind(&forecast_quantity)
    .bind(&actual_quantity)
    .bind(&method)
    .bind(&confidence_level)
    .bind(&notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(forecast) => Json(ApiResponse::success(forecast, "需求预测更新成功")),
        Err(e) => {
            tracing::error!("更新需求预测失败: {}", e);
            Json(api_error(500, "更新需求预测失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/aps/forecasts/{id}",
    params(
        ("id" = Uuid, Path, description = "需求预测 ID")
    ),
    responses(
        (status = 200, description = "delete_forecast OK")
    ),
    tag = "APS - Forecast"
)]
pub async fn delete_forecast(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("DELETE FROM plugin_aps.aps_demand_forecasts WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.db)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "需求预测删除成功"))
        }
        Ok(_) => Json(api_error(404, "需求预测不存在")),
        Err(e) => {
            tracing::error!("删除需求预测失败: {}", e);
            Json(api_error(500, "删除需求预测失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/aps/forecasts/{id}/calculate",
    params(
        ("id" = Uuid, Path, description = "需求预测 ID")
    ),
    responses(
        (status = 200, description = "calculate_forecast OK")
    ),
    tag = "APS - Forecast"
)]
pub async fn calculate_forecast(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<DemandForecast>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    // 取当前记录以确定 method
    let existing = sqlx::query_as::<_, DemandForecast>(
        r#"
        SELECT id, forecast_no, product_id, product_name, forecast_period, forecast_date,
               forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
               notes, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_demand_forecasts
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(f)) => f,
        Ok(None) => return Json(api_error(404, "需求预测不存在")),
        Err(e) => return Json(api_error(500, &format!("查询需求预测失败: {}", e))),
    };

    // 简化版预测计算：基于历史 actual_quantity 推算 forecast_quantity
    // 真实场景应接入 APS 算法引擎，此处仅做占位演示
    let historical_avg: Option<f64> = sqlx::query_scalar::<_, Option<sqlx::types::BigDecimal>>(
        r#"
        SELECT AVG(actual_quantity) FROM plugin_aps.aps_demand_forecasts
        WHERE product_id IS NOT NULL
          AND product_id = (SELECT product_id FROM plugin_aps.aps_demand_forecasts WHERE id = $1)
          AND actual_quantity IS NOT NULL
          AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await
    .ok()
    .flatten()
    .and_then(|b| b.to_f64());

    let calculated_qty: f64 = match (existing.method.as_str(), historical_avg) {
        ("moving_average", Some(avg)) if avg > 0.0 => avg,
        ("exponential_smoothing", Some(avg)) if avg > 0.0 => avg * 0.9,
        _ => existing
            .forecast_quantity
            .as_ref()
            .and_then(|b| b.to_f64())
            .unwrap_or(0.0),
    };
    let new_forecast_qty = sqlx::types::BigDecimal::try_from(calculated_qty).ok();
    let now = Utc::now();

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        UPDATE plugin_aps.aps_demand_forecasts SET
            forecast_quantity = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
        RETURNING id, forecast_no, product_id, product_name, forecast_period, forecast_date,
                  forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
                  notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&new_forecast_qty)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(forecast) => {
            tracing::info!("需求预测 {} 计算完成（method={}）", id, existing.method);
            Json(ApiResponse::success(forecast, "需求预测计算成功"))
        }
        Err(e) => {
            tracing::error!("需求预测计算失败: {}", e);
            Json(api_error(500, "需求预测计算失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/aps/forecasts/{id}/validate",
    params(
        ("id" = Uuid, Path, description = "需求预测 ID")
    ),
    responses(
        (status = 200, description = "validate_forecast OK")
    ),
    tag = "APS - Forecast"
)]
pub async fn validate_forecast(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<DemandForecast>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, DemandForecast>(
        r#"
        SELECT id, forecast_no, product_id, product_name, forecast_period, forecast_date,
               forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
               notes, tenant_id, created_at, updated_at
        FROM plugin_aps.aps_demand_forecasts
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(f)) => f,
        Ok(None) => return Json(api_error(404, "需求预测不存在")),
        Err(e) => return Json(api_error(500, &format!("查询需求预测失败: {}", e))),
    };

    // 准确率 = 1 - |forecast - actual| / MAX(forecast, actual, 1)
    // 若无 actual_quantity 则 accuracy_rate 保持 0
    let accuracy: Option<f64> = match (&existing.forecast_quantity, &existing.actual_quantity) {
        (Some(fc), Some(ac)) => {
            let fc: f64 = fc.to_f64().unwrap_or(0.0);
            let ac: f64 = ac.to_f64().unwrap_or(0.0);
            let denom = fc.max(ac).max(1.0);
            Some((1.0 - ((fc - ac).abs() / denom)).max(0.0))
        }
        _ => Some(0.0),
    };

    let accuracy_bd = accuracy.and_then(|v| sqlx::types::BigDecimal::try_from(v).ok());
    let now = Utc::now();

    let result = sqlx::query_as::<_, DemandForecast>(
        r#"
        UPDATE plugin_aps.aps_demand_forecasts SET
            accuracy_rate = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
        RETURNING id, forecast_no, product_id, product_name, forecast_period, forecast_date,
                  forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level,
                  notes, tenant_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&accuracy_bd)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(forecast) => {
            tracing::info!("需求预测 {} 准确率校验完成", id);
            Json(ApiResponse::success(forecast, "需求预测校验成功"))
        }
        Err(e) => {
            tracing::error!("需求预测校验失败: {}", e);
            Json(api_error(500, "需求预测校验失败"))
        }
    }
}
