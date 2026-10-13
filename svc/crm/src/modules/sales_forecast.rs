use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use serde::Deserialize;
use sqlx::Row;
use uuid::Uuid;

use super::ApiState;
use crate::models::{CreateSalesForecastRequest, SalesForecast, SalesForecastQueryParams};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:sales_forecast:read"])),
    path = "/sales-forecast",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sales_forecast"
)]
pub async fn list_sales_forecasts(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SalesForecastQueryParams>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let period_type_filter = params.period_type.clone();
    let status_filter = params.status.clone();
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query_as::<_, SalesForecast>(
        r#"
        SELECT id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        FROM crm.sales_forecasts
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR period_type = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY period DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_opt)
    .bind(&period_type_filter)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(forecasts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.sales_forecasts
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR period_type = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_opt)
            .bind(&period_type_filter)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
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
            Json(ApiResponse::from(TopemsError::Internal(
                "获取销售预测列表失败".to_string(),
            )))
        }
    }
}

async fn get_sales_forecast(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<SalesForecast>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query_as::<_, SalesForecast>(
        r#"
        SELECT id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        FROM crm.sales_forecasts WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(forecast)) => Json(ApiResponse::success(forecast, "获取销售预测成功")),
        Ok(None) => Json(ApiResponse::from(TopemsError::ResourceNotFound(
            "销售预测不存在".to_string(),
        ))),
        Err(e) => {
            tracing::error!("获取销售预测失败: {}", e);
            Json(ApiResponse::from(TopemsError::Internal(
                "获取销售预测失败".to_string(),
            )))
        }
    }
}

async fn create_sales_forecast(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateSalesForecastRequest>,
) -> Json<ApiResponse<SalesForecast>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.period_type.is_empty() || req.period.is_empty() {
        return Json(ApiResponse::from(TopemsError::ValidationFailed(
            "周期类型和周期不能为空".to_string(),
        )));
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
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
            id, tenant_id, period_type, period, predicted_amount, trend, confidence_level, factors, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 0, 'stable', 0.7, $5, 'draft', $6, $7)
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
    .fetch_one(&mut **txn)
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
                Json(ApiResponse::from(TopemsError::Internal(
                    "销售预测创建失败".to_string(),
                ))),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return Json(ApiResponse::from(TopemsError::Internal(
                    "事务提交失败".to_string(),
                )));
            }
        }
    }

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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:sales_forecast:write"])),
    path = "/sales-forecast/generate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sales_forecast"
)]
pub async fn generate_forecast(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateSalesForecastRequest>,
) -> Json<ApiResponse<SalesForecast>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.period_type.is_empty() || req.period.is_empty() {
        return Json(ApiResponse::from(TopemsError::ValidationFailed(
            "周期类型和周期不能为空".to_string(),
        )));
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    let id = Uuid::new_v4();
    let now = Utc::now();

    // B3: 预测金额 Decimal（NUMERIC(15,2) 列），整数元演示种子，避免 f64 噪声
    let predicted_amount = Decimal::from(i64::from(rand::random::<u32>() % 1_000_000) + 500_000);
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
            id, tenant_id, period_type, period, predicted_amount, trend, confidence_level, factors, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'generated', $9, $10)
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
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(forecast) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return Json(ApiResponse::from(TopemsError::Internal(
                        "事务提交失败".to_string(),
                    )));
                }
            }
            Json(ApiResponse::success(forecast, "销售预测生成成功"))
        }
        Err(e) => {
            tracing::error!("生成销售预测失败: {}", e);
            Json(ApiResponse::from(TopemsError::Internal(
                "销售预测生成失败".to_string(),
            )))
        }
    }
}

async fn update_sales_forecast(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<SalesForecast>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let existing = sqlx::query_as::<_, SalesForecast>(
        r#"
        SELECT id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at FROM crm.sales_forecasts WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => {
            return Json(ApiResponse::from(TopemsError::ResourceNotFound(
                "销售预测不存在".to_string(),
            )))
        }
        Err(e) => {
            return Json(ApiResponse::from(TopemsError::internal(
                "查询销售预测失败",
                e,
            )))
        }
    };

    let request_data = serde_json::to_value(&req).ok();

    // B3: 金额从 JSON（数字或字符串）解析为 Decimal，对齐 U6 billing 请求侧契约
    let predicted_amount = req
        .get("predicted_amount")
        .and_then(|v| serde_json::from_value::<Decimal>(v.clone()).ok())
        .unwrap_or(existing.predicted_amount);
    let actual_amount = req
        .get("actual_amount")
        .and_then(|v| serde_json::from_value::<Decimal>(v.clone()).ok());
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
        UPDATE crm.sales_forecasts SET
            predicted_amount = $2, actual_amount = $3, accuracy = $4, trend = $5, confidence_level = $6, status = $7, updated_at = $8
        WHERE id = $1 AND tenant_id = $9
        RETURNING id, tenant_id, period_type, period, predicted_amount, actual_amount, accuracy, trend, confidence_level, factors, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(predicted_amount)
    .bind(actual_amount)
    .bind(accuracy)
    .bind(&trend)
    .bind(confidence_level)
    .bind(&status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
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
                Json(ApiResponse::from(TopemsError::Internal(
                    "销售预测更新失败".to_string(),
                ))),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return Json(ApiResponse::from(TopemsError::Internal(
                    "事务提交失败".to_string(),
                )));
            }
        }
    }

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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query(
        "UPDATE crm.sales_forecasts SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "销售预测删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(ApiResponse::from(TopemsError::ResourceNotFound(
                "销售预测不存在".to_string(),
            ))),
            "error".to_string(),
            Some("销售预测不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除销售预测失败: {}", e);
            (
                Json(ApiResponse::from(TopemsError::Internal(
                    "销售预测删除失败".to_string(),
                ))),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return Json(ApiResponse::from(TopemsError::Internal(
                    "事务提交失败".to_string(),
                )));
            }
        }
    }

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:sales_forecast:read"])),
    path = "/sales-forecast/trend",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sales_forecast"
)]
pub async fn get_sales_trend(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SalesTrendQuery>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let period_type = params.period_type.unwrap_or("month".to_string());
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query(
        r#"
        SELECT period, predicted_amount, actual_amount, accuracy, trend
        FROM crm.sales_forecasts
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND period_type = $2
          AND ($3::text IS NULL OR period >= $3)
          AND ($4::text IS NULL OR period <= $4)
        ORDER BY period ASC
        "#,
    )
    .bind(tenant_opt)
    .bind(&period_type)
    .bind(&params.start_period)
    .bind(&params.end_period)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            // B3: 金额列读为 Decimal；accuracy 为比率保留 f64。先落成结构化行，再派生 JSON 与环比。
            let rows: Vec<(String, Decimal, Option<Decimal>, Option<f64>, String)> = rows
                .into_iter()
                .map(|r| {
                    (
                        r.get::<String, _>("period"),
                        r.get::<Decimal, _>("predicted_amount"),
                        r.get::<Option<Decimal>, _>("actual_amount"),
                        r.get::<Option<f64>, _>("accuracy"),
                        r.get::<String, _>("trend"),
                    )
                })
                .collect();

            let trend_data: Vec<serde_json::Value> = rows
                .iter()
                .map(|(period, predicted, actual, accuracy, trend)| {
                    serde_json::json!({
                        "period": period,
                        "predicted_amount": predicted,
                        "actual_amount": actual,
                        "accuracy": accuracy,
                        "trend": trend,
                    })
                })
                .collect();

            let mut comparison_data = Vec::new();
            for i in 1..rows.len() {
                let (_, prev_p, _, _, _) = &rows[i - 1];
                let (period, curr_p, _, _, _) = &rows[i];
                // change_rate 为环比百分比（比率），沿用 f64 语义；absolute_change 为金额差值，Decimal 精确
                let prev_f = prev_p.to_f64().unwrap_or(0.0);
                let curr_f = curr_p.to_f64().unwrap_or(0.0);
                let change_rate = if prev_f != 0.0 {
                    ((curr_f - prev_f) / prev_f * 100.0).round() / 100.0
                } else {
                    0.0
                };
                comparison_data.push(serde_json::json!({
                    "period": period,
                    "change_rate": change_rate,
                    "absolute_change": curr_p - prev_p,
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
            Json(ApiResponse::from(TopemsError::Internal(
                "获取销售趋势数据失败".to_string(),
            )))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CompareForecastQuery {
    pub periods: Option<Vec<String>>,
    pub period_type: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:sales_forecast:read"])),
    path = "/sales-forecast/compare",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sales_forecast"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn compare_sales_forecasts(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CompareForecastQuery>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let periods = params.periods.unwrap_or_default();
    let period_type = params.period_type.unwrap_or("month".to_string());
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    if periods.len() < 2 {
        return Json(ApiResponse::from(TopemsError::ValidationFailed(
            "至少需要对比两个周期".to_string(),
        )));
    }

    let result = sqlx::query(
        r#"
        SELECT period, predicted_amount, actual_amount, accuracy, confidence_level, trend
        FROM crm.sales_forecasts
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND period_type = $2 AND period = ANY($3)
        ORDER BY period ASC
        "#,
    )
    .bind(tenant_opt)
    .bind(&period_type)
    .bind(&periods)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            // B3: 金额列读 Decimal；accuracy/confidence_level 为比率保留 f64
            let rows: Vec<(String, Decimal, Option<Decimal>, Option<f64>, f64, String)> = rows
                .into_iter()
                .map(|r| {
                    (
                        r.get::<String, _>("period"),
                        r.get::<Decimal, _>("predicted_amount"),
                        r.get::<Option<Decimal>, _>("actual_amount"),
                        r.get::<Option<f64>, _>("accuracy"),
                        r.get::<f64, _>("confidence_level"),
                        r.get::<String, _>("trend"),
                    )
                })
                .collect();

            let forecasts: Vec<serde_json::Value> = rows
                .iter()
                .map(|(period, predicted, actual, accuracy, confidence, trend)| {
                    serde_json::json!({
                        "period": period,
                        "predicted_amount": predicted,
                        "actual_amount": actual,
                        "accuracy": accuracy,
                        "confidence_level": confidence,
                        "trend": trend,
                    })
                })
                .collect();

            let base_period = forecasts.first().cloned();
            let base_pred: Decimal = rows
                .first()
                .map(|(_, p, _, _, _, _)| *p)
                .unwrap_or(Decimal::ZERO);
            let base_actual_dec: Decimal = rows
                .first()
                .and_then(|(_, _, a, _, _, _)| *a)
                .unwrap_or(Decimal::ZERO);
            let base_predicted: f64 = base_pred.to_f64().unwrap_or(0.0);
            let base_actual: f64 = base_actual_dec.to_f64().unwrap_or(0.0);
            let base_accuracy: f64 = rows
                .first()
                .and_then(|(_, _, _, a, _, _)| *a)
                .unwrap_or(0.0);

            let comparisons: Vec<serde_json::Value> = rows
                .iter()
                .skip(1)
                .map(|(period, predicted, actual, acc, _, _)| {
                    let predicted_f = predicted.to_f64().unwrap_or(0.0);
                    let actual_f = actual.unwrap_or(Decimal::ZERO).to_f64().unwrap_or(0.0);
                    let accuracy_gap = acc.unwrap_or(0.0) - base_accuracy;
                    serde_json::json!({
                        "period": period,
                        "predicted_vs_base": predicted - base_pred,
                        "predicted_rate": if base_predicted != 0.0 { (predicted_f / base_predicted * 100.0).round() / 100.0 } else { 0.0 },
                        "actual_vs_base": actual.unwrap_or(Decimal::ZERO) - base_actual_dec,
                        "actual_rate": if base_actual != 0.0 { (actual_f / base_actual * 100.0).round() / 100.0 } else { 0.0 },
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
            Json(ApiResponse::from(TopemsError::Internal(
                "销售预测对比分析失败".to_string(),
            )))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:sales_forecast:read"])),
    path = "/sales-forecast/accuracy-report",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sales_forecast"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_accuracy_report(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SalesTrendQuery>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let period_type = params.period_type.unwrap_or("month".to_string());
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());

    let result = sqlx::query(
        r#"
        SELECT period, predicted_amount, actual_amount, accuracy, confidence_level, trend
        FROM crm.sales_forecasts
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND period_type = $2
          AND ($3::text IS NULL OR period >= $3)
          AND ($4::text IS NULL OR period <= $4)
          AND actual_amount IS NOT NULL
        ORDER BY period ASC
        "#,
    )
    .bind(tenant_opt)
    .bind(&period_type)
    .bind(&params.start_period)
    .bind(&params.end_period)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            // B3: 金额列读 Decimal（查询已过滤 actual_amount IS NOT NULL）；accuracy/confidence 为比率保留 f64。
            let rows: Vec<(String, Decimal, Decimal, f64, f64, String)> = rows
                .into_iter()
                .map(|r| {
                    (
                        r.get::<String, _>("period"),
                        r.get::<Decimal, _>("predicted_amount"),
                        r.get::<Decimal, _>("actual_amount"),
                        r.get::<f64, _>("accuracy"),
                        r.get::<f64, _>("confidence_level"),
                        r.get::<String, _>("trend"),
                    )
                })
                .collect();

            let total_records = rows.len();

            // deviation 为金额差值（Decimal 精确）；deviation_rate 为偏差百分比（比率，f64）。
            let records: Vec<serde_json::Value> = rows
                .iter()
                .map(|(period, predicted, actual, accuracy, confidence, trend)| {
                    let deviation = (predicted - actual).abs();
                    let predicted_f = predicted.to_f64().unwrap_or(0.0);
                    let actual_f = actual.to_f64().unwrap_or(0.0);
                    let deviation_rate = if actual_f != 0.0 {
                        ((predicted_f - actual_f).abs() / actual_f * 100.0).round() / 100.0
                    } else {
                        0.0
                    };
                    serde_json::json!({
                        "period": period,
                        "predicted_amount": predicted,
                        "actual_amount": actual,
                        "accuracy": accuracy,
                        "confidence_level": confidence,
                        "trend": trend,
                        "deviation": deviation,
                        "deviation_rate": deviation_rate,
                    })
                })
                .collect();

            let avg_accuracy: f64 =
                rows.iter().map(|(_, _, _, a, _, _)| *a).sum::<f64>() / total_records as f64;

            let avg_deviation: f64 = rows
                .iter()
                .map(|(_, p, a, _, _, _)| (p - a).abs().to_f64().unwrap_or(0.0))
                .sum::<f64>()
                / total_records as f64;

            let max_accuracy = rows.iter().map(|(_, _, _, a, _, _)| *a).fold(0.0, f64::max);

            let min_accuracy = rows.iter().map(|(_, _, _, a, _, _)| *a).fold(1.0, f64::min);

            let high_confidence_count = rows.iter().filter(|(_, _, _, _, c, _)| *c >= 0.8).count();

            let trend_analysis = if rows.len() >= 3 {
                let recent: Vec<f64> = rows
                    .iter()
                    .rev()
                    .take(3)
                    .map(|(_, _, _, a, _, _)| *a)
                    .collect();
                let accuracy_trend = recent.windows(2).map(|w| w[1] - w[0]).sum::<f64>() / 2.0;

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
            Json(ApiResponse::from(TopemsError::Internal(
                "获取预测准确率报告失败".to_string(),
            )))
        }
    }
}
