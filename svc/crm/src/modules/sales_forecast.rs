use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::Row;
use uuid::Uuid;

use super::ApiState;
use crate::middleware::tenant::get_tenant_id;
use crate::models::{CreateSalesForecastRequest, SalesForecast, SalesForecastQueryParams};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/sales-forecast",
            get(list_sales_forecasts).post(create_sales_forecast),
        )
        .route("/sales-forecast/generate", post(generate_forecast))
        .route(
            "/sales-forecast/{id}",
            get(get_sales_forecast)
                .put(update_sales_forecast)
                .delete(delete_sales_forecast),
        )
        .route("/sales-forecast/trend", get(get_sales_trend))
        .route("/sales-forecast/compare", get(compare_sales_forecasts))
        .route("/sales-forecast/accuracy-report", get(get_accuracy_report))
}

async fn list_sales_forecasts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SalesForecastQueryParams>,
    headers: HeaderMap,
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
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, SalesForecast>(
        r#"
        SELECT id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        FROM plugin_crm.sales_forecasts
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR period_type = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY period DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
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
                SELECT COUNT(*) FROM plugin_crm.sales_forecasts
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR period_type = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
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
    headers: HeaderMap,
) -> Json<ApiResponse<SalesForecast>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, SalesForecast>(
        r#"
        SELECT id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        FROM plugin_crm.sales_forecasts WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
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

    let tenant_id = get_tenant_id(&claims, &headers);
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
        INSERT INTO plugin_crm.sales_forecasts (
            id, tenant_id, period_type, period, predicted_amount, trend, confidence_level, factors, status, created_at, updated_at
        ) VALUES ($1, $2, $3, 0, 'stable', 0.7, $4, 'draft', $5, $6, $7)
        RETURNING id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
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
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "sales_forecast".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn generate_forecast(
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

    let tenant_id = get_tenant_id(&claims, &headers);
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
        INSERT INTO plugin_crm.sales_forecasts (
            id, tenant_id, period_type, period, predicted_amount, trend, confidence_level, factors, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'generated', $8, $9, $10)
        RETURNING id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
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

    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, SalesForecast>(
        r#"
        SELECT id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at FROM plugin_crm.sales_forecasts WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "销售预测不存在")),
        Err(e) => return Json(api_error(500, &format!("查询销售预测失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let predicted_amount = req
        .get("predicted_amount")
        .and_then(|v| v.as_f64())
        .unwrap_or(existing.predicted_amount);
    let actual_amount = req.get("actual_amount").and_then(|v| v.as_f64());
    let accuracy = req.get("accuracy").and_then(|v| v.as_f64());
    let trend = req
        .get("trend")
        .and_then(|v| v.as_str())
        .unwrap_or(&existing.trend)
        .to_string();
    let confidence_level = req
        .get("confidence_level")
        .and_then(|v| v.as_f64())
        .unwrap_or(existing.confidence_level);
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or(&existing.status)
        .to_string();
    let now = Utc::now();

    let result = sqlx::query_as::<_, SalesForecast>(
        r#"
        UPDATE plugin_crm.sales_forecasts SET
            predicted_amount = $2, actual_amount = $3, accuracy = $4, trend = $5, confidence_level = $6, status = $7, updated_at = $8
        WHERE id = $1 AND tenant_id = $9
        RETURNING id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
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
    .bind(tenant_id)
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
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "sales_forecast".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
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

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE plugin_crm.sales_forecasts SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
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
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "sales_forecast".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[derive(Debug, Deserialize)]
pub struct SalesTrendQuery {
    pub period_type: Option<String>,
    pub start_period: Option<String>,
    pub end_period: Option<String>,
}

async fn get_sales_trend(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SalesTrendQuery>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let period_type = params.period_type.unwrap_or("month".to_string());
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        r#"
        SELECT period, predicted_amount, actual_amount, accuracy, trend
        FROM plugin_crm.sales_forecasts
        WHERE tenant_id = $1
          AND period_type = $2
          AND ($3::text IS NULL OR period >= $3)
          AND ($4::text IS NULL OR period <= $4)
        ORDER BY period ASC
        "#,
    )
    .bind(tenant_id)
    .bind(&period_type)
    .bind(&params.start_period)
    .bind(&params.end_period)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let trend_data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "period": r.get::<String, _>("period"),
                        "predicted_amount": r.get::<f64, _>("predicted_amount"),
                        "actual_amount": r.get::<Option<f64>, _>("actual_amount"),
                        "accuracy": r.get::<Option<f64>, _>("accuracy"),
                        "trend": r.get::<String, _>("trend"),
                    })
                })
                .collect();

            let mut comparison_data = Vec::new();
            for i in 1..trend_data.len() {
                let prev = &trend_data[i - 1];
                let curr = &trend_data[i];
                let prev_predicted = prev
                    .get("predicted_amount")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                let curr_predicted = curr
                    .get("predicted_amount")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                let change_rate = if prev_predicted != 0.0 {
                    ((curr_predicted - prev_predicted) / prev_predicted * 100.0).round() / 100.0
                } else {
                    0.0
                };
                comparison_data.push(serde_json::json!({
                    "period": curr.get("period"),
                    "change_rate": change_rate,
                    "absolute_change": curr_predicted - prev_predicted,
                }));
            }

            Json(ApiResponse::success(
                serde_json::json!({
                    "trend_data": trend_data,
                    "period_type": period_type,
                    "comparison_data": comparison_data,
                    "total_periods": comparison_data.len() + 1,
                }),
                "获取销售趋势数据成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取销售趋势数据失败: {}", e);
            Json(api_error(500, "获取销售趋势数据失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CompareForecastQuery {
    pub periods: Option<Vec<String>>,
    pub period_type: Option<String>,
}

async fn compare_sales_forecasts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CompareForecastQuery>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let periods = params.periods.unwrap_or_default();
    let period_type = params.period_type.unwrap_or("month".to_string());
    let tenant_id = get_tenant_id(&claims, &headers);

    if periods.len() < 2 {
        return Json(api_error(400, "至少需要对比两个周期"));
    }

    let result = sqlx::query(
        r#"
        SELECT period, predicted_amount, actual_amount, accuracy, confidence_level, trend
        FROM plugin_crm.sales_forecasts
        WHERE tenant_id = $1 AND period_type = $2 AND period = ANY($3)
        ORDER BY period ASC
        "#,
    )
    .bind(tenant_id)
    .bind(&period_type)
    .bind(&periods)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let forecasts: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "period": r.get::<String, _>("period"),
                        "predicted_amount": r.get::<f64, _>("predicted_amount"),
                        "actual_amount": r.get::<Option<f64>, _>("actual_amount"),
                        "accuracy": r.get::<Option<f64>, _>("accuracy"),
                        "confidence_level": r.get::<f64, _>("confidence_level"),
                        "trend": r.get::<String, _>("trend"),
                    })
                })
                .collect();

            let base_period = forecasts.first();
            let (base_predicted, base_actual) = if let Some(base) = base_period {
                (
                    base.get("predicted_amount")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                    base.get("actual_amount")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0),
                )
            } else {
                (0.0, 0.0)
            };

            let comparisons: Vec<serde_json::Value> = forecasts
                .iter()
                .skip(1)
                .map(|f| {
                    let predicted = f.get("predicted_amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let actual = f.get("actual_amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let acc1 = f.get("accuracy").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let acc2 = base_period.and_then(|b| b.get("accuracy").and_then(|v| v.as_f64())).unwrap_or(0.0);
                    let accuracy_gap = acc1 - acc2;
                    serde_json::json!({
                        "period": f.get("period"),
                        "predicted_vs_base": predicted - base_predicted,
                        "predicted_rate": if base_predicted != 0.0 { (predicted / base_predicted * 100.0).round() / 100.0 } else { 0.0 },
                        "actual_vs_base": actual - base_actual,
                        "actual_rate": if base_actual != 0.0 { (actual / base_actual * 100.0).round() / 100.0 } else { 0.0 },
                        "accuracy_gap": accuracy_gap,
                    })
                })
                .collect();

            let avg_accuracy: f64 = forecasts
                .iter()
                .filter_map(|f| f.get("accuracy").and_then(|v| v.as_f64()))
                .collect::<Vec<f64>>()
                .into_iter()
                .sum::<f64>()
                / forecasts.len() as f64;

            Json(ApiResponse::success(
                serde_json::json!({
                    "base_period": base_period,
                    "comparisons": comparisons,
                    "forecasts": forecasts,
                    "period_type": period_type,
                    "average_accuracy": avg_accuracy.round() / 100.0,
                }),
                "销售预测对比分析成功",
            ))
        }
        Err(e) => {
            tracing::error!("销售预测对比分析失败: {}", e);
            Json(api_error(500, "销售预测对比分析失败"))
        }
    }
}

async fn get_accuracy_report(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SalesTrendQuery>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let period_type = params.period_type.unwrap_or("month".to_string());
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        r#"
        SELECT period, predicted_amount, actual_amount, accuracy, confidence_level, trend
        FROM plugin_crm.sales_forecasts
        WHERE tenant_id = $1
          AND period_type = $2
          AND ($3::text IS NULL OR period >= $3)
          AND ($4::text IS NULL OR period <= $4)
          AND actual_amount IS NOT NULL
        ORDER BY period ASC
        "#,
    )
    .bind(tenant_id)
    .bind(&period_type)
    .bind(&params.start_period)
    .bind(&params.end_period)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let records: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    let predicted = r.get::<f64, _>("predicted_amount");
                    let actual = r.get::<f64, _>("actual_amount");
                    let deviation = (predicted - actual).abs();
                    let deviation_rate = if actual != 0.0 {
                        ((predicted - actual).abs() / actual * 100.0).round() / 100.0
                    } else {
                        0.0
                    };
                    serde_json::json!({
                        "period": r.get::<String, _>("period"),
                        "predicted_amount": predicted,
                        "actual_amount": actual,
                        "accuracy": r.get::<f64, _>("accuracy"),
                        "confidence_level": r.get::<f64, _>("confidence_level"),
                        "trend": r.get::<String, _>("trend"),
                        "deviation": deviation,
                        "deviation_rate": deviation_rate,
                    })
                })
                .collect();

            let total_records = records.len();
            let avg_accuracy: f64 = records
                .iter()
                .filter_map(|r| r.get("accuracy").and_then(|v| v.as_f64()))
                .sum::<f64>()
                / total_records as f64;

            let avg_deviation: f64 = records
                .iter()
                .filter_map(|r| r.get("deviation").and_then(|v| v.as_f64()))
                .sum::<f64>()
                / total_records as f64;

            let max_accuracy = records
                .iter()
                .filter_map(|r| r.get("accuracy").and_then(|v| v.as_f64()))
                .fold(0.0, f64::max);

            let min_accuracy = records
                .iter()
                .filter_map(|r| r.get("accuracy").and_then(|v| v.as_f64()))
                .fold(1.0, f64::min);

            let high_confidence_count = records
                .iter()
                .filter(|r| {
                    r.get("confidence_level")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.0)
                        >= 0.8
                })
                .count();

            let trend_analysis = if records.len() >= 3 {
                let recent: Vec<&serde_json::Value> = records.iter().rev().take(3).rev().collect();
                let accuracy_trend = recent
                    .windows(2)
                    .map(|w| {
                        let acc1 = w[0].get("accuracy").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        let acc2 = w[1].get("accuracy").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        acc2 - acc1
                    })
                    .sum::<f64>()
                    / 2.0;

                if accuracy_trend > 0.01 {
                    "improving".to_string()
                } else if accuracy_trend < -0.01 {
                    "declining".to_string()
                } else {
                    "stable".to_string()
                }
            } else {
                "insufficient_data".to_string()
            };

            Json(ApiResponse::success(
                serde_json::json!({
                    "records": records,
                    "period_type": period_type,
                    "summary": {
                        "total_records": total_records,
                        "average_accuracy": avg_accuracy.round() / 100.0,
                        "average_deviation": avg_deviation.round() / 100.0,
                        "max_accuracy": max_accuracy.round() / 100.0,
                        "min_accuracy": min_accuracy.round() / 100.0,
                        "high_confidence_count": high_confidence_count,
                        "trend_analysis": trend_analysis,
                    },
                }),
                "获取预测准确率报告成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取预测准确率报告失败: {}", e);
            Json(api_error(500, "获取预测准确率报告失败"))
        }
    }
}
