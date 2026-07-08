use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::{api_error, auth::Claims, ApiResponse, PaginationParams};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/scm/mrp/suggestions",
            get(list_suggestions).post(compute_mrp),
        )
        .route(
            "/api/scm/mrp/suggestions/{id}",
            get(get_suggestion).post(confirm_suggestion),
        )
        .route(
            "/api/scm/mrp/material-summary",
            get(material_requirement_summary),
        )
        .route("/api/scm/mrp-suggestions", get(list_suggestions))
        .route("/api/scm/mrp-suggestions/{id}", get(get_suggestion))
        .route(
            "/api/scm/mrp-suggestions/summary",
            get(material_requirement_summary),
        )
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MrpComputeRequest {
    pub forecast_days: Option<i32>,
    pub include_sales_orders: Option<bool>,
    pub include_forecast: Option<bool>,
    pub safety_stock_factor: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MrpSuggestion {
    pub id: Uuid,
    pub suggestion_number: String,
    pub material_code: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub current_stock: f64,
    pub required_quantity: f64,
    pub suggested_quantity: f64,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub lead_time_days: Option<i32>,
    pub suggested_order_date: Option<chrono::NaiveDate>,
    pub suggested_delivery_date: Option<chrono::NaiveDate>,
    pub status: String,
    pub source_type: String,
    pub source_order_id: Option<Uuid>,
    pub remarks: Option<String>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MaterialRequirementSummary {
    pub material_code: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub total_required: f64,
    pub current_stock: f64,
    pub shortage: f64,
    pub suggestion_count: i64,
    pub suggested_total: f64,
}

fn mrp_suggestion_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "suggestion_number": row.try_get::<String, _>("suggestion_number").ok(),
        "material_code": row.try_get::<String, _>("material_code").ok(),
        "material_name": row.try_get::<String, _>("material_name").ok(),
        "specification": row.try_get::<Option<String>, _>("specification").ok(),
        "unit": row.try_get::<Option<String>, _>("unit").ok(),
        "current_stock": row.try_get::<f64, _>("current_stock").ok(),
        "required_quantity": row.try_get::<f64, _>("required_quantity").ok(),
        "suggested_quantity": row.try_get::<f64, _>("suggested_quantity").ok(),
        "supplier_id": row.try_get::<Option<Uuid>, _>("supplier_id").ok(),
        "supplier_name": row.try_get::<Option<String>, _>("supplier_name").ok(),
        "lead_time_days": row.try_get::<Option<i32>, _>("lead_time_days").ok(),
        "suggested_order_date": row.try_get::<Option<chrono::NaiveDate>, _>("suggested_order_date").ok(),
        "suggested_delivery_date": row.try_get::<Option<chrono::NaiveDate>, _>("suggested_delivery_date").ok(),
        "status": row.try_get::<String, _>("status").ok(),
        "source_type": row.try_get::<String, _>("source_type").ok(),
        "source_order_id": row.try_get::<Option<Uuid>, _>("source_order_id").ok(),
        "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
        "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
        "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
    })
}

async fn list_suggestions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query(
        r#"
        SELECT id, suggestion_number, material_code, material_name, specification, unit,
               current_stock, required_quantity, suggested_quantity, supplier_id, supplier_name,
               lead_time_days, suggested_order_date, suggested_delivery_date, status,
               source_type, source_order_id, remarks, created_at, updated_at
        FROM scm.mrp_suggestions
        WHERE ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.mrp_suggestions
                WHERE ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let items_json: Vec<serde_json::Value> =
                items.iter().map(mrp_suggestion_row_to_json).collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "suggestions": items_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取MRP建议列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取MRP建议列表失败: {}", e);
            Json(api_error(500, "获取MRP建议列表失败"))
        }
    }
}

async fn get_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        SELECT id, suggestion_number, material_code, material_name, specification, unit,
               current_stock, required_quantity, suggested_quantity, supplier_id, supplier_name,
               lead_time_days, suggested_order_date, suggested_delivery_date, status,
               source_type, source_order_id, remarks, created_at, updated_at
        FROM scm.mrp_suggestions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            mrp_suggestion_row_to_json(&row),
            "获取MRP建议详情成功",
        )),
        Ok(None) => Json(api_error(404, "MRP建议不存在")),
        Err(e) => {
            tracing::error!("获取MRP建议详情失败: {}", e);
            Json(api_error(500, "获取MRP建议详情失败"))
        }
    }
}

async fn compute_mrp(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<MrpComputeRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let forecast_days = req.forecast_days.unwrap_or(30);
    let safety_factor = req.safety_stock_factor.unwrap_or(1.2);
    let include_sales = req.include_sales_orders.unwrap_or(true);
    let include_forecast = req.include_forecast.unwrap_or(true);

    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开启事务失败: {}", e);
            return Json(api_error(500, "MRP计算失败"));
        }
    };

    let clear_result = sqlx::query("DELETE FROM scm.mrp_suggestions WHERE status = 'draft'")
        .execute(&mut *tx)
        .await;

    if let Err(e) = clear_result {
        tracing::error!("清理草稿建议失败: {}", e);
        let _ = tx.rollback().await;
        return Json(api_error(500, "MRP计算失败"));
    }

    let now = Utc::now();
    let suggestion_number = format!("MRP{}", now.format("%Y%m%d%H%M%S"));

    let insert_result = sqlx::query(
        r#"
        INSERT INTO scm.mrp_suggestions 
        (id, suggestion_number, material_code, material_name, specification, unit,
         current_stock, required_quantity, suggested_quantity, 
         supplier_id, supplier_name, lead_time_days,
         suggested_order_date, suggested_delivery_date, status, source_type,
         remarks, created_at, updated_at)
        SELECT 
            gen_random_uuid(),
            $1 || '_' || ROW_NUMBER() OVER (),
            COALESCE(m.material_code, 'UNKNOWN'),
            COALESCE(m.material_name, '未知物料'),
            m.specification,
            m.unit,
            COALESCE(i.quantity, 0) as current_stock,
            (COALESCE(sales_orders.total, 0) + COALESCE(forecast.total, 0)) as required_quantity,
            GREATEST(0, (COALESCE(sales_orders.total, 0) + COALESCE(forecast.total, 0)) * $2 - COALESCE(i.quantity, 0)) as suggested_quantity,
            s.id as supplier_id,
            s.name as supplier_name,
            s.lead_time_days,
            CASE 
                WHEN s.lead_time_days IS NOT NULL THEN CURRENT_DATE + (s.lead_time_days * INTERVAL '1 day')
                ELSE CURRENT_DATE + INTERVAL '7 days'
            END as suggested_delivery_date,
            CURRENT_DATE as suggested_order_date,
            'draft' as status,
            CASE 
                WHEN COALESCE(sales_orders.total, 0) > 0 AND COALESCE(forecast.total, 0) > 0 THEN 'both'
                WHEN COALESCE(sales_orders.total, 0) > 0 THEN 'sales_order'
                ELSE 'forecast'
            END as source_type,
            '系统自动生成' as remarks,
            $3,
            $3
        FROM scm.materials m
        LEFT JOIN (
            SELECT material_code, SUM(quantity) as total
            FROM scm.sales_order_items
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
              AND $4 = true
            GROUP BY material_code
        ) sales_orders ON m.material_code = sales_orders.material_code
        LEFT JOIN (
            SELECT material_code, AVG(quantity) * $5 as total
            FROM scm.demand_forecast
            WHERE forecast_date >= CURRENT_DATE 
              AND forecast_date <= CURRENT_DATE + ($5 || ' days')::INTERVAL
              AND $6 = true
            GROUP BY material_code
        ) forecast ON m.material_code = forecast.material_code
        LEFT JOIN wms.inventory i ON m.material_code = i.material_code AND i.deleted_at IS NULL
        LEFT JOIN (
            SELECT DISTINCT ON (material_code) id, name, lead_time_days, material_code
            FROM scm.supplier_products sp
            JOIN scm.suppliers s ON sp.supplier_id = s.id
            WHERE s.status = 'active'
            ORDER BY material_code, sp.priority
        ) s ON m.material_code = s.material_code
        WHERE (COALESCE(sales_orders.total, 0) + COALESCE(forecast.total, 0)) > 0
        RETURNING id, suggestion_number, material_code, material_name, specification, unit,
                  current_stock, required_quantity, suggested_quantity, supplier_id, supplier_name,
                  lead_time_days, suggested_order_date, suggested_delivery_date, status,
                  source_type, source_order_id, remarks, created_at, updated_at
        "#,
    )
    .bind(&suggestion_number)
    .bind(safety_factor)
    .bind(now.naive_utc())
    .bind(include_sales)
    .bind(forecast_days)
    .bind(include_forecast)
    .fetch_all(&mut *tx)
    .await;

    let items = match insert_result {
        Ok(items) => items,
        Err(e) => {
            tracing::error!("MRP计算失败: {}", e);
            let _ = tx.rollback().await;
            log_audit_event(
                &state.db,
                "compute".to_string(),
                "mrp_suggestion".to_string(),
                None,
                None,
                None,
                None,
                request_data,
                None,
                "error".to_string(),
                Some(e.to_string()),
                &headers,
            )
            .await;
            return Json(api_error(500, "MRP计算失败"));
        }
    };

    if let Err(e) = tx.commit().await {
        tracing::error!("提交事务失败: {}", e);
        return Json(api_error(500, "MRP计算失败"));
    }

    let items_json: Vec<serde_json::Value> = items.iter().map(mrp_suggestion_row_to_json).collect();
    let count = items.len() as i64;
    let response_data = Some(serde_json::json!({ "generated_count": count }));

    let response = Json(ApiResponse::success(
        serde_json::json!({
            "suggestions": items_json,
            "total": count,
            "forecast_days": forecast_days,
            "safety_stock_factor": safety_factor
        }),
        &format!("MRP计算完成，生成{}条建议", count),
    ));

    log_audit_event(
        &state.db,
        "compute".to_string(),
        "mrp_suggestion".to_string(),
        None,
        None,
        None,
        None,
        request_data,
        response_data,
        "success".to_string(),
        None,
        &headers,
    )
    .await;

    response
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfirmSuggestionRequest {
    pub confirmed_quantity: Option<f64>,
    pub supplier_id: Option<Uuid>,
    pub remarks: Option<String>,
}

async fn confirm_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ConfirmSuggestionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now().naive_utc();

    let existing = sqlx::query(
        r#"
        SELECT id, suggestion_number, material_code, material_name, specification, unit,
               current_stock, required_quantity, suggested_quantity, supplier_id, supplier_name,
               lead_time_days, suggested_order_date, suggested_delivery_date, status,
               source_type, source_order_id, remarks, created_at, updated_at
        FROM scm.mrp_suggestions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(row)) => row,
        Ok(None) => return Json(api_error(404, "MRP建议不存在")),
        Err(e) => return Json(api_error(500, &format!("查询MRP建议失败: {}", e))),
    };

    let status: String = existing.try_get("status").unwrap_or_default();
    if status != "draft" {
        return Json(api_error(
            400,
            &format!("MRP建议当前状态为{}，无法确认", status),
        ));
    }

    let confirmed_qty = req
        .confirmed_quantity
        .unwrap_or_else(|| existing.try_get("suggested_quantity").unwrap_or(0.0));

    let result = sqlx::query(
        r#"
        UPDATE scm.mrp_suggestions SET
            status = 'confirmed',
            suggested_quantity = $2,
            supplier_id = COALESCE($3, supplier_id),
            remarks = CASE 
                WHEN remarks IS NOT NULL THEN remarks || ' | ' || $4
                ELSE $4 
            END,
            updated_at = $5
        WHERE id = $1
        RETURNING id, suggestion_number, material_code, material_name, specification, unit,
                  current_stock, required_quantity, suggested_quantity, supplier_id, supplier_name,
                  lead_time_days, suggested_order_date, suggested_delivery_date, status,
                  source_type, source_order_id, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(confirmed_qty)
    .bind(req.supplier_id)
    .bind(&req.remarks.unwrap_or_else(|| "已确认".to_string()))
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => (
            Json(ApiResponse::success(
                mrp_suggestion_row_to_json(row),
                "MRP建议确认成功",
            )),
            "success",
            None,
            Some(mrp_suggestion_row_to_json(row)),
        ),
        Err(e) => {
            tracing::error!("确认MRP建议失败: {}", e);
            (
                Json(api_error(500, "确认MRP建议失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "confirm".to_string(),
        "mrp_suggestion".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn material_requirement_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query(
        r#"
        SELECT 
            material_code,
            material_name,
            MAX(specification) as specification,
            MAX(unit) as unit,
            SUM(required_quantity) as total_required,
            MAX(current_stock) as current_stock,
            GREATEST(0, SUM(required_quantity) - MAX(current_stock)) as shortage,
            COUNT(*) as suggestion_count,
            SUM(suggested_quantity) as suggested_total
        FROM scm.mrp_suggestions
        WHERE ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
        GROUP BY material_code, material_name
        ORDER BY shortage DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(DISTINCT material_code) 
                FROM scm.mrp_suggestions
                WHERE ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
                "#,
            )
            .bind(&search_pattern)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let summaries: Vec<MaterialRequirementSummary> = rows
                .iter()
                .map(|row| MaterialRequirementSummary {
                    material_code: row.try_get("material_code").unwrap_or_default(),
                    material_name: row.try_get("material_name").unwrap_or_default(),
                    specification: row.try_get("specification").unwrap_or_default(),
                    unit: row.try_get("unit").unwrap_or_default(),
                    total_required: row.try_get("total_required").unwrap_or(0.0),
                    current_stock: row.try_get("current_stock").unwrap_or(0.0),
                    shortage: row.try_get("shortage").unwrap_or(0.0),
                    suggestion_count: row.try_get("suggestion_count").unwrap_or(0),
                    suggested_total: row.try_get("suggested_total").unwrap_or(0.0),
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "summaries": summaries,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取物料需求汇总成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取物料需求汇总失败: {}", e);
            Json(api_error(500, "获取物料需求汇总失败"))
        }
    }
}
