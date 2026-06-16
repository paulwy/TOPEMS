use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use uuid::Uuid;

use super::ApiState;
use crate::api::audit::log_audit_event;
use crate::models::{CreateSalesForecastRequest, SalesForecast, SalesForecastQueryParams};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/v1/sales-forecast",
            get(list_sales_forecasts).post(create_sales_forecast),
        )
        .route(
            "/api/v1/sales-forecast/generate",
            post(generate_forecast),
        )
        .route(
            "/api/v1/sales-forecast/:id",
            get(get_sales_forecast)
                .put(update_sales_forecast)
                .delete(delete_sales_forecast),
        )
}

async fn list_sales_forecasts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SalesForecastQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let period_type_filter = params.period_type.clone();
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, SalesForecast>(
        r#"
        SELECT id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        FROM crm.sales_forecasts
        WHERE ($1::text IS NULL OR period_type = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY period DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&period_type_filter)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(forecasts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.sales_forecasts
                WHERE ($1::text IS NULL OR period_type = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&period_type_filter)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": forecasts,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取销售预测列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取销售预测列表失败: {}", e);
            Json(api_error(500, "获取销售预测列表失败"))
        }
    }
}

async fn get_sales_forecast(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SalesForecast>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, SalesForecast>(
        r#"
        SELECT id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        FROM crm.sales_forecasts WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(forecast)) => Json(ApiResponse::success(forecast, "获取销售预测成功")),
        Ok(None) => Json(api_error(404, "销售预测不存在")),
        Err(e) => {
            tracing::error!("获取销售预测失败: {}", e);
            Json(api_error(500, "获取销售预测失败"))
        }
    }
}

async fn create_sales_forecast(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateSalesForecastRequest>,
) -> Json<ApiResponse<SalesForecast>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.period_type.is_empty() || req.period.is_empty() {
        return Json(api_error(400, "周期类型和周期不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let factors = serde_json::json!([
        {"name": "历史销售数据", "impact": 0.4, "description": "基于历史数据的趋势分析"},
        {"name": "市场趋势", "impact": 0.3, "description": "行业市场趋势预测"},
        {"name": "客户增长", "impact": 0.2, "description": "新增客户带来的增长"},
        {"name": "促销活动", "impact": 0.1, "description": "促销活动影响"}
    ]);

    let result = sqlx::query_as::<_, SalesForecast>(
        r#"
        INSERT INTO crm.sales_forecasts (
            id, period_type, period, predicted_amount, trend, confidence_level, factors, status, created_at, updated_at
        ) VALUES ($1, $2, $3, 0, 'stable', 0.7, $4, 'draft', $5, $6)
        RETURNING id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.period_type)
    .bind(&req.period)
    .bind(&factors)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(forecast) => (
            Json(ApiResponse::success(forecast.clone(), "销售预测创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建销售预测失败: {}", e);
            (
                Json(api_error(500, "销售预测创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(forecast) = &result {
        serde_json::to_value(forecast).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "sales_forecast".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn generate_forecast(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSalesForecastRequest>,
) -> Json<ApiResponse<SalesForecast>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.period_type.is_empty() || req.period.is_empty() {
        return Json(api_error(400, "周期类型和周期不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let predicted_amount = (rand::random::<f64>() * 1_000_000.0) + 500_000.0;
    let confidence_level = 0.7 + (rand::random::<f64>() * 0.25);
    let trend = match rand::random::<i32>() % 3 {
        0 => "up",
        1 => "down",
        _ => "stable",
    };

    let factors = serde_json::json!([
        {"name": "历史销售数据", "impact": 0.4, "description": "基于历史数据的趋势分析"},
        {"name": "市场趋势", "impact": 0.3, "description": "行业市场趋势预测"},
        {"name": "客户增长", "impact": 0.2, "description": "新增客户带来的增长"},
        {"name": "促销活动", "impact": 0.1, "description": "促销活动影响"}
    ]);

    let result = sqlx::query_as::<_, SalesForecast>(
        r#"
        INSERT INTO crm.sales_forecasts (
            id, period_type, period, predicted_amount, trend, confidence_level, factors, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'generated', $8, $9)
        RETURNING id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.period_type)
    .bind(&req.period)
    .bind(predicted_amount)
    .bind(trend)
    .bind(confidence_level)
    .bind(&factors)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(forecast) => Json(ApiResponse::success(forecast, "销售预测生成成功")),
        Err(e) => {
            tracing::error!("生成销售预测失败: {}", e);
            Json(api_error(500, "销售预测生成失败"))
        }
    }
}

async fn update_sales_forecast(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<SalesForecast>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, SalesForecast>(
        r#"
        SELECT id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at FROM crm.sales_forecasts WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "销售预测不存在")),
        Err(e) => return Json(api_error(500, &format!("查询销售预测失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let predicted_amount = req.get("predicted_amount").and_then(|v| v.as_f64()).unwrap_or(existing.predicted_amount);
    let actual_amount = req.get("actual_amount").and_then(|v| v.as_f64());
    let accuracy = req.get("accuracy").and_then(|v| v.as_f64());
    let trend = req.get("trend").and_then(|v| v.as_str()).unwrap_or(&existing.trend).to_string();
    let confidence_level = req.get("confidence_level").and_then(|v| v.as_f64()).unwrap_or(existing.confidence_level);
    let status = req.get("status").and_then(|v| v.as_str()).unwrap_or(&existing.status).to_string();
    let now = Utc::now();

    let result = sqlx::query_as::<_, SalesForecast>(
        r#"
        UPDATE crm.sales_forecasts SET
            predicted_amount = $2, actual_amount = $3, accuracy = $4, trend = $5, confidence_level = $6, status = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(predicted_amount)
    .bind(&actual_amount)
    .bind(&accuracy)
    .bind(&trend)
    .bind(confidence_level)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(forecast) => (
            Json(ApiResponse::success(forecast.clone(), "销售预测更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新销售预测失败: {}", e);
            (
                Json(api_error(500, "销售预测更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(forecast) = &result {
        serde_json::to_value(forecast).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "sales_forecast".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_sales_forecast(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM crm.sales_forecasts WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "销售预测删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "销售预测不存在")),
            "error".to_string(),
            Some("销售预测不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除销售预测失败: {}", e);
            (
                Json(api_error(500, "销售预测删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "sales_forecast".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}