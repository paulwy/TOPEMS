use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{Duration, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::TopemsError;
use uuid::Uuid;

use super::mrp_suggestion_status::MrpSuggestionStatus;
use super::ApiState;
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, require_tenant_bind, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::PaginationParams;

// =============================================================================
// Pure functions (unit-tested via mrp_logic_tests.rs & inline tests)
// =============================================================================

/// 净需求计算：毛需求 + 安全库存 + 已分配 − 在库 − 在途，下限为 0
pub fn calculate_net_requirement(
    gross_requirement: f64,
    on_hand: f64,
    allocated: f64,
    in_transit: f64,
    safety_stock: f64,
) -> f64 {
    let net = gross_requirement + safety_stock + allocated - on_hand - in_transit;
    net.max(0.0)
}

/// 安全库存 = avg_daily_demand × lead_time_days × service_factor，输入不合法时返回 0
pub fn calculate_safety_stock(
    avg_daily_demand: f64,
    lead_time_days: f64,
    service_factor: f64,
) -> f64 {
    if avg_daily_demand < 0.0 || lead_time_days < 0.0 || service_factor < 0.0 {
        return 0.0;
    }
    avg_daily_demand * lead_time_days * service_factor
}

/// 经济订货批量 EOQ = sqrt(2DS/H)；非法输入返回 Err
pub fn calculate_eoq(
    annual_demand: f64,
    ordering_cost: f64,
    holding_cost_per_unit: f64,
) -> Result<f64, TopemsError> {
    if annual_demand < 0.0 {
        return Err(TopemsError::BusinessLogic(
            "annual_demand must be non-negative".to_string(),
        ));
    }
    if holding_cost_per_unit <= 0.0 {
        return Err(TopemsError::BusinessLogic(
            "holding_cost_per_unit must be > 0".to_string(),
        ));
    }
    if annual_demand == 0.0 {
        return Ok(0.0);
    }
    Ok((2.0 * annual_demand * ordering_cost / holding_cost_per_unit).sqrt())
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LotSizingRule {
    /// Lot-for-Lot：按净需求订货
    LFL,
    /// Fixed Order Quantity：固定批量的整数倍
    FOQ(f64),
}

/// 批量调整：先按规则选量，再依次应用 min_order_qty 和 pack_multiple（零倍为 0）
pub fn apply_lot_sizing(
    requirement: f64,
    rule: LotSizingRule,
    min_order_qty: f64,
    pack_multiple: f64,
) -> f64 {
    if requirement <= 0.0 {
        return 0.0;
    }

    let after_rule = match rule {
        LotSizingRule::LFL => requirement,
        LotSizingRule::FOQ(q) if q <= 0.0 => requirement,
        LotSizingRule::FOQ(q) => {
            let batches = (requirement / q).ceil();
            batches * q
        }
    };

    let mut result = after_rule;
    if min_order_qty > 0.0 && result < min_order_qty {
        result = min_order_qty;
    }
    if pack_multiple > 1.0 {
        let ratio = result / pack_multiple;
        let ceiled = ratio.ceil();
        if (ceiled - ratio).abs() > 1e-9 {
            result = ceiled * pack_multiple;
        }
    }
    result
}

/// 订货日期 = 需求日期 − lead_time_days（负提前期会向后推）
pub fn calculate_order_date(required_date: NaiveDate, lead_time_days: i64) -> NaiveDate {
    required_date - Duration::days(lead_time_days)
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 组合建议：安全库存 + 净需求 + LFL 批量
/// Returns (suggested_qty, safety_stock, net_requirement)
pub fn compute_mrp_suggestion(
    gross_requirement: f64,
    on_hand: f64,
    allocated: f64,
    in_transit: f64,
    lead_time_days: i64,
    forecast_days: i64,
    service_factor: f64,
) -> (f64, f64, f64) {
    let avg_daily = if forecast_days > 0 && gross_requirement > 0.0 {
        gross_requirement / forecast_days as f64
    } else {
        0.0
    };
    let safety_stock = calculate_safety_stock(avg_daily, lead_time_days as f64, service_factor);
    let net = calculate_net_requirement(
        gross_requirement,
        on_hand,
        allocated,
        in_transit,
        safety_stock,
    );
    let suggested = apply_lot_sizing(net, LotSizingRule::LFL, 0.0, 1.0);
    (suggested, safety_stock, net)
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/mrp/suggestions", get(list_suggestions).post(compute_mrp))
        .route(
            "/mrp/suggestions/{id}",
            get(get_suggestion)
                .put(update_suggestion)
                .delete(delete_suggestion),
        )
        .route("/mrp/suggestions/{id}/confirm", post(confirm_suggestion))
        .route(
            "/mrp/demand-forecasts/import",
            post(import_demand_forecasts),
        )
        .route("/mrp-suggestions", get(list_suggestions))
        .route("/mrp-suggestions/{id}", get(get_suggestion))
        .route(
            "/mrp-suggestions/summary",
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
pub struct UpdateMrpSuggestionRequest {
    pub suggested_quantity: Option<f64>,
    pub supplier_id: Option<Uuid>,
    pub lead_time_days: Option<i32>,
    pub suggested_order_date: Option<NaiveDate>,
    pub suggested_delivery_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub remarks: Option<String>,
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
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
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
        "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
        "updated_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at").ok(),
    })
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:mrp:read"])),
    path = "/mrp/suggestions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/mrp"
)]
pub async fn list_suggestions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = match params.status.as_deref() {
        None | Some("") | Some("all") => None,
        Some(raw) => match MrpSuggestionStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str()),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的 MRP 建议状态".to_string(),
                ))
            }
        },
    };

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT id, suggestion_number, material_code, material_name, specification, unit,
               current_stock::float8, required_quantity::float8, suggested_quantity::float8, supplier_id, supplier_name,
               lead_time_days, suggested_order_date, suggested_delivery_date, status,
               source_type, source_order_id, remarks, created_at, updated_at
        FROM scm.mrp_suggestions
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND tenant_id = $5::uuid
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(&search_pattern)
    .bind(status_filter)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("scm", r#"
                SELECT COUNT(*) FROM scm.mrp_suggestions
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND tenant_id = $3::uuid
                "#),
            )
            .bind(&search_pattern)
            .bind(status_filter)
            .bind(tenant_bind)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);
            let items_json: Vec<serde_json::Value> =
                items.iter().map(mrp_suggestion_row_to_json).collect();

            ApiResponse::success(
                serde_json::json!({
                    "suggestions": items_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取MRP建议列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取MRP建议列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取MRP建议列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:mrp:read"])),
    path = "/mrp/suggestions/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/mrp"
)]
pub async fn get_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT id, suggestion_number, material_code, material_name, specification, unit,
               current_stock::float8, required_quantity::float8, suggested_quantity::float8, supplier_id, supplier_name,
               lead_time_days, suggested_order_date, suggested_delivery_date, status,
               source_type, source_order_id, remarks, created_at, updated_at
        FROM scm.mrp_suggestions WHERE id = $1 AND tenant_id = $2::uuid
        "#
    ))
    .bind(id)
    .bind(tenant_bind)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(row)) => {
            ApiResponse::success(mrp_suggestion_row_to_json(&row), "获取MRP建议详情成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("MRP建议不存在".to_string())),
        Err(e) => {
            tracing::error!("获取MRP建议详情失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取MRP建议详情失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/scm/mrp/suggestions/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn update_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateMrpSuggestionRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let now = Utc::now();

    let status = match req.status.as_deref() {
        None | Some("") => None,
        Some(raw) => match MrpSuggestionStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str()),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的 MRP 建议状态".to_string(),
                ))
            }
        },
    };
    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.mrp_suggestions
        SET suggested_quantity = COALESCE($3, suggested_quantity),
            supplier_id = COALESCE($4, supplier_id),
            lead_time_days = COALESCE($5, lead_time_days),
            suggested_order_date = COALESCE($6, suggested_order_date),
            suggested_delivery_date = COALESCE($7, suggested_delivery_date),
            status = COALESCE($8, status),
            remarks = COALESCE($9, remarks),
            updated_at = $10
        WHERE id = $1 AND tenant_id = $2::uuid
        "#
    ))
    .bind(id)
    .bind(tenant_bind)
    .bind(req.suggested_quantity)
    .bind(req.supplier_id)
    .bind(req.lead_time_days)
    .bind(req.suggested_order_date)
    .bind(req.suggested_delivery_date)
    .bind(status)
    .bind(&req.remarks)
    .bind(now)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"id": id}), "MRP 建议已更新")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("MRP 建议不存在".to_string())),
        Err(e) => ApiResponse::from(TopemsError::internal("更新 MRP 建议失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/scm/mrp/suggestions/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn delete_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        DELETE FROM scm.mrp_suggestions WHERE id = $1
        AND tenant_id = $2::uuid
        "#
    ))
    .bind(id)
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"id": id}), "MRP 建议已删除")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("MRP 建议不存在".to_string())),
        Err(e) => ApiResponse::from(TopemsError::internal("删除 MRP 建议失败", e)),
    }
}

#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/scm/mrp/suggestions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]
pub async fn compute_mrp(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<MrpComputeRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let request_data = serde_json::to_value(&req).ok();
    let forecast_days = req.forecast_days.unwrap_or(30);
    let safety_factor = req.safety_stock_factor.unwrap_or(1.2);
    let include_sales = req.include_sales_orders.unwrap_or(true);
    let include_forecast = req.include_forecast.unwrap_or(true);

    let clear_result = sqlx::query(only_own_schema_query!(
        "scm",
        "UPDATE scm.mrp_suggestions SET deleted_at = NOW() WHERE status = 'draft' AND tenant_id = $1::uuid"
    ))
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await;

    if let Err(e) = clear_result {
        tracing::error!("清理草稿建议失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("MRP计算失败".to_string()));
    }

    let now = Utc::now();
    let suggestion_number = format!("MRP{}", now.format("%Y%m%d%H%M%S"));

    let insert_result = sqlx::query(
        only_own_schema_query!("scm", r#"
        INSERT INTO scm.mrp_suggestions 
        (id, suggestion_number, material_code, material_name, specification, unit,
         current_stock, required_quantity, suggested_quantity, 
         supplier_id, supplier_name, lead_time_days,
         suggested_order_date, suggested_delivery_date, status, source_type,
         remarks, created_at, updated_at, tenant_id)
        SELECT 
            gen_random_uuid(),
            $1 || '_' || ROW_NUMBER() OVER (),
            COALESCE(m.material_code, 'UNKNOWN'),
            COALESCE(CASE WHEN $8 = 'en' THEN COALESCE(m.name_en, m.material_name) ELSE m.material_name END, '未知物料'),
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
            $9 as status,
            CASE 
                WHEN COALESCE(sales_orders.total, 0) > 0 AND COALESCE(forecast.total, 0) > 0 THEN 'both'
                WHEN COALESCE(sales_orders.total, 0) > 0 THEN 'sales_order'
                ELSE 'forecast'
            END as source_type,
            '系统自动生成' as remarks,
            $3,
            $3,
            $7::uuid
        FROM master_data.materials m
        LEFT JOIN (
            SELECT material_code, SUM(quantity) as total
            FROM erp.sales_order_items
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
              AND deleted_at IS NULL
              AND $4 = true
              AND tenant_id = $7::uuid
            GROUP BY material_code
        ) sales_orders ON m.material_code = sales_orders.material_code
        LEFT JOIN (
            SELECT material_code, AVG(quantity) * $5 as total
            FROM scm.demand_forecast
            WHERE forecast_date >= CURRENT_DATE 
              AND forecast_date <= CURRENT_DATE + ($5 || ' days')::INTERVAL
              AND $6 = true
              AND tenant_id = $7::uuid
            GROUP BY material_code
        ) forecast ON m.material_code = forecast.material_code
        LEFT JOIN (
            SELECT material_code, SUM(available_quantity) as quantity
            FROM wms.inventory
            WHERE tenant_id = $7::uuid
              AND deleted_at IS NULL
            GROUP BY material_code
        ) i ON m.material_code = i.material_code
        LEFT JOIN (
            SELECT DISTINCT ON (sp.material_code) sp.id as id,
                   CASE WHEN $8='en' THEN COALESCE(s.name_en, s.name) ELSE s.name END as name,
                   s.lead_time_days as lead_time_days, sp.material_code as material_code
            FROM scm.supplier_products sp
            JOIN scm.suppliers s ON sp.supplier_id = s.id
            WHERE s.status = 'active'
              AND s.tenant_id = $7::uuid
            ORDER BY sp.material_code, sp.priority
        ) s ON m.material_code = s.material_code
        WHERE (COALESCE(sales_orders.total, 0) + COALESCE(forecast.total, 0)) > 0
          AND m.tenant_id = $7::uuid
          AND m.deleted_at IS NULL
          AND COALESCE(m.status, 'active') = 'active'
        RETURNING id, suggestion_number, material_code, material_name, specification, unit,
                  current_stock::float8, required_quantity::float8, suggested_quantity::float8, supplier_id, supplier_name,
                  lead_time_days, suggested_order_date, suggested_delivery_date, status,
                  source_type, source_order_id, remarks, created_at, updated_at
        "#, "master_data", "wms", "erp"),
    )
    .bind(&suggestion_number)
    .bind(safety_factor)
    .bind(now.naive_utc())
    .bind(include_sales)
    .bind(forecast_days)
    .bind(include_forecast)
    .bind(tenant_bind)
    .bind(locale)
    .bind(MrpSuggestionStatus::DEFAULT.as_db_str())
    .fetch_all(&mut **txn)
    .await;

    let items = match insert_result {
        Ok(items) => items,
        Err(e) => {
            tracing::error!("MRP计算失败: {}", e);
            log_audit_event(
                &state.system_pool,
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
            return ApiResponse::from(TopemsError::Internal("MRP计算失败".to_string()));
        }
    };

    let items_json: Vec<serde_json::Value> = items.iter().map(mrp_suggestion_row_to_json).collect();
    let count = items.len() as i64;
    let response_data = Some(serde_json::json!({ "generated_count": count }));

    let response = ApiResponse::success(
        serde_json::json!({
            "suggestions": items_json,
            "total": count,
            "forecast_days": forecast_days,
            "safety_stock_factor": safety_factor
        }),
        &format!("MRP计算完成，生成{}条建议", count),
    );

    log_audit_event(
        &state.system_pool,
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

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/scm/mrp/suggestions/{id}/confirm",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn confirm_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ConfirmSuggestionRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now().naive_utc();

    let existing = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT id, suggestion_number, material_code, material_name, specification, unit,
               current_stock::float8, required_quantity::float8, suggested_quantity::float8, supplier_id, supplier_name,
               lead_time_days, suggested_order_date, suggested_delivery_date, status,
               source_type, source_order_id, remarks, created_at, updated_at
        FROM scm.mrp_suggestions WHERE id = $1 AND tenant_id = $2::uuid
        "#
    ))
    .bind(id)
    .bind(tenant_bind)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(row)) => row,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("MRP建议不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询MRP建议失败", e)),
    };

    let status: String = match existing.try_get("status") {
        Ok(status) => status,
        Err(e) => {
            tracing::error!("解析MRP建议状态失败: suggestion_id={}, err={}", id, e);
            return ApiResponse::from(TopemsError::internal("解析MRP建议状态失败", e));
        }
    };
    if status != MrpSuggestionStatus::Draft.as_db_str() {
        return ApiResponse::from(TopemsError::ValidationFailed(format!(
            "MRP建议当前状态为{}，无法确认",
            status
        )));
    }

    let confirmed_qty = req
        .confirmed_quantity
        .unwrap_or_else(|| existing.try_get("suggested_quantity").unwrap_or(0.0));

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.mrp_suggestions SET
            status = $7,
            suggested_quantity = $2::numeric,
            supplier_id = COALESCE($3, supplier_id),
            remarks = CASE 
                WHEN remarks IS NOT NULL THEN remarks || ' | ' || $4
                ELSE $4 
            END,
            updated_at = $5
        WHERE id = $1 AND tenant_id = $6::uuid
        RETURNING id, suggestion_number, material_code, material_name, specification, unit,
                  current_stock::float8, required_quantity::float8, suggested_quantity::float8, supplier_id, supplier_name,
                  lead_time_days, suggested_order_date, suggested_delivery_date, status,
                  source_type, source_order_id, remarks, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(confirmed_qty)
    .bind(req.supplier_id)
    .bind(req.remarks.unwrap_or_else(|| "已确认".to_string()))
    .bind(now)
    .bind(tenant_bind)
    .bind(MrpSuggestionStatus::Confirmed.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);

                    return ApiResponse::server_error("事务提交失败");
                }
            }
            (
                ApiResponse::success(mrp_suggestion_row_to_json(row), "MRP建议确认成功"),
                "success",
                None,
                Some(mrp_suggestion_row_to_json(row)),
            )
        }
        Err(e) => {
            tracing::error!("确认MRP建议失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("确认MRP建议失败".to_string())),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.system_pool,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:mrp:read"])),
    path = "/mrp-suggestions/summary",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/mrp"
)]
pub async fn material_requirement_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT 
            material_code,
            material_name,
            MAX(specification) as specification,
            MAX(unit) as unit,
            SUM(required_quantity)::float8 as total_required,
            MAX(current_stock)::float8 as current_stock,
            GREATEST(0, SUM(required_quantity)::float8 - MAX(current_stock)::float8) as shortage,
            COUNT(*) as suggestion_count,
            SUM(suggested_quantity)::float8 as suggested_total
        FROM scm.mrp_suggestions
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
          AND tenant_id = $4::uuid
        GROUP BY material_code, material_name
        ORDER BY shortage DESC
        LIMIT $2 OFFSET $3
        "#
    ))
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "scm",
                r#"
                SELECT COUNT(DISTINCT material_code) 
                FROM scm.mrp_suggestions
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
                  AND tenant_id = $2::uuid
                "#
            ))
            .bind(&search_pattern)
            .bind(tenant_bind)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);
            let summaries_result: Result<Vec<MaterialRequirementSummary>, sqlx::Error> = rows
                .iter()
                .map(|row| {
                    Ok(MaterialRequirementSummary {
                        // material_code/material_name 列可为 NULL：显式按 Option 解码后降级为空串，
                        // 解码失败则上抛，避免"字段类型不对也返回空串"。
                        material_code: row
                            .try_get::<Option<String>, _>("material_code")?
                            .unwrap_or_default(),
                        material_name: row
                            .try_get::<Option<String>, _>("material_name")?
                            .unwrap_or_default(),
                        specification: row.try_get("specification")?,
                        unit: row.try_get("unit")?,
                        total_required: row.try_get("total_required").unwrap_or(0.0),
                        current_stock: row.try_get("current_stock").unwrap_or(0.0),
                        shortage: row.try_get("shortage").unwrap_or(0.0),
                        suggestion_count: row.try_get("suggestion_count").unwrap_or(0),
                        suggested_total: row.try_get("suggested_total").unwrap_or(0.0),
                    })
                })
                .collect();

            let summaries = match summaries_result {
                Ok(summaries) => summaries,
                Err(e) => {
                    tracing::error!("解析物料需求汇总结果失败: {}", e);
                    return ApiResponse::from(TopemsError::internal("解析物料需求汇总结果失败", e));
                }
            };

            ApiResponse::success(
                serde_json::json!({
                    "summaries": summaries,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取物料需求汇总成功",
            )
        }
        Err(e) => {
            tracing::error!("获取物料需求汇总失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取物料需求汇总失败".to_string()))
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, utoipa::ToSchema)]
pub struct DemandForecastImportItem {
    pub material_code: String,
    pub quantity: f64,
    pub forecast_date: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, utoipa::ToSchema)]
pub struct DemandForecastImportRequest {
    pub items: Vec<DemandForecastImportItem>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:purchase_order:write"])),
    path = "/mrp/demand-forecasts/import",
    request_body = DemandForecastImportRequest,
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/mrp"
)]
pub async fn import_demand_forecasts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<DemandForecastImportRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };

    if req.items.is_empty() {
        return ApiResponse::<serde_json::Value>::bad_request("预测明细不能为空");
    }

    let mut rows = Vec::with_capacity(req.items.len());
    for item in &req.items {
        let material_code = item.material_code.trim();
        if material_code.is_empty() {
            return ApiResponse::<serde_json::Value>::bad_request("物料编码不能为空");
        }
        if !item.quantity.is_finite() || item.quantity <= 0.0 {
            return ApiResponse::<serde_json::Value>::bad_request("预测数量必须大于 0");
        }
        let forecast_date = match NaiveDate::parse_from_str(item.forecast_date.trim(), "%Y-%m-%d") {
            Ok(date) => date,
            Err(_) => {
                return ApiResponse::<serde_json::Value>::bad_request(
                    "预测日期格式错误，应为 YYYY-MM-DD",
                )
            }
        };
        rows.push((material_code.to_string(), item.quantity, forecast_date));
    }

    let db = state.db.clone();
    let mut scope = match db.scope_with(&mut *txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启请求事务作用域失败: {}", e);
            return ApiResponse::<serde_json::Value>::server_error("导入需求预测失败");
        }
    };

    for (material_code, quantity, forecast_date) in &rows {
        let insert_result = sqlx::query(only_own_schema_query!(
            "scm",
            r#"
            INSERT INTO scm.demand_forecast (tenant_id, material_code, quantity, forecast_date)
            VALUES ($1, $2, $3::numeric, $4)
            "#,
            "scm"
        ))
        .bind(tenant_bind)
        .bind(material_code)
        .bind(*quantity)
        .bind(*forecast_date)
        .execute(&mut scope)
        .await;

        if let Err(e) = insert_result {
            tracing::error!("导入需求预测失败: {}", e);
            return ApiResponse::<serde_json::Value>::server_error("导入需求预测失败");
        }
    }
    drop(scope);

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    ApiResponse::success(
        serde_json::json!({"imported": rows.len()}),
        "需求预测导入成功",
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- Struct serde roundtrips ----

    #[test]
    fn mrp_compute_request_defaults_via_serde() {
        let req: MrpComputeRequest = serde_json::from_str("{}").expect("deserialize empty");
        assert!(req.forecast_days.is_none());
        assert!(req.include_sales_orders.is_none());
        assert!(req.include_forecast.is_none());
        assert!(req.safety_stock_factor.is_none());
    }

    #[test]
    fn mrp_compute_request_roundtrip_preserves_fields() {
        let req = MrpComputeRequest {
            forecast_days: Some(45),
            include_sales_orders: Some(false),
            include_forecast: Some(true),
            safety_stock_factor: Some(1.5),
        };
        let json = serde_json::to_string(&req).expect("serialize");
        let back: MrpComputeRequest = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.forecast_days, req.forecast_days);
        assert_eq!(back.include_sales_orders, req.include_sales_orders);
        assert_eq!(back.include_forecast, req.include_forecast);
        assert_eq!(back.safety_stock_factor, req.safety_stock_factor);
    }

    #[test]
    fn confirm_suggestion_request_defaults_via_serde() {
        let req: ConfirmSuggestionRequest = serde_json::from_str("{}").expect("deserialize empty");
        assert!(req.confirmed_quantity.is_none());
        assert!(req.supplier_id.is_none());
        assert!(req.remarks.is_none());
    }

    #[test]
    fn confirm_suggestion_request_roundtrip_preserves_fields() {
        let supplier_id = Uuid::new_v4();
        let req = ConfirmSuggestionRequest {
            confirmed_quantity: Some(150.0),
            supplier_id: Some(supplier_id),
            remarks: Some("approved".to_string()),
        };
        let json = serde_json::to_string(&req).expect("serialize");
        let back: ConfirmSuggestionRequest = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.confirmed_quantity, req.confirmed_quantity);
        assert_eq!(back.supplier_id, req.supplier_id);
        assert_eq!(back.remarks, req.remarks);
    }

    #[test]
    fn material_requirement_summary_serde_roundtrip() {
        let summary = MaterialRequirementSummary {
            material_code: "MAT-001".to_string(),
            material_name: "Steel".to_string(),
            specification: Some("1mm".to_string()),
            unit: Some("kg".to_string()),
            total_required: 500.0,
            current_stock: 200.0,
            shortage: 300.0,
            suggestion_count: 3,
            suggested_total: 350.0,
        };
        let json = serde_json::to_string(&summary).expect("serialize");
        let back: MaterialRequirementSummary = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.material_code, summary.material_code);
        assert_eq!(back.material_name, summary.material_name);
        assert_eq!(back.specification, summary.specification);
        assert_eq!(back.unit, summary.unit);
        assert_eq!(back.total_required, summary.total_required);
        assert_eq!(back.current_stock, summary.current_stock);
        assert_eq!(back.shortage, summary.shortage);
        assert_eq!(back.suggestion_count, summary.suggestion_count);
        assert_eq!(back.suggested_total, summary.suggested_total);
    }

    #[test]
    fn material_requirement_summary_handles_none_optionals() {
        let json = r#"{
            "material_code": "MAT-002",
            "material_name": "Plastic",
            "total_required": 0.0,
            "current_stock": 0.0,
            "shortage": 0.0,
            "suggestion_count": 0,
            "suggested_total": 0.0
        }"#;
        let s: MaterialRequirementSummary = serde_json::from_str(json).expect("deserialize");
        assert_eq!(s.material_code, "MAT-002");
        assert!(s.specification.is_none());
        assert!(s.unit.is_none());
    }

    // ---- Pure function additional edge cases ----

    #[test]
    fn apply_lot_sizing_zero_requirement_returns_zero() {
        assert_eq!(apply_lot_sizing(0.0, LotSizingRule::LFL, 0.0, 1.0), 0.0);
    }

    #[test]
    fn apply_lot_sizing_negative_requirement_returns_zero() {
        assert_eq!(apply_lot_sizing(-10.0, LotSizingRule::LFL, 0.0, 1.0), 0.0);
    }

    #[test]
    fn apply_lot_sizing_foq_with_zero_batch_size_falls_back_to_requirement() {
        // FOQ with q <= 0 should fall back to LFL behavior.
        let result = apply_lot_sizing(50.0, LotSizingRule::FOQ(0.0), 0.0, 1.0);
        assert_eq!(result, 50.0);
    }

    #[test]
    fn apply_lot_sizing_foq_negative_batch_falls_back_to_requirement() {
        let result = apply_lot_sizing(50.0, LotSizingRule::FOQ(-10.0), 0.0, 1.0);
        assert_eq!(result, 50.0);
    }

    #[test]
    fn apply_lot_sizing_foq_rounds_up_to_next_batch() {
        // 50 / 20 = 2.5 -> ceil = 3 -> 3 * 20 = 60
        let result = apply_lot_sizing(50.0, LotSizingRule::FOQ(20.0), 0.0, 1.0);
        assert_eq!(result, 60.0);
    }

    #[test]
    fn apply_lot_sizing_foq_exact_multiple_unchanged() {
        // 40 / 20 = 2 exactly -> 40
        let result = apply_lot_sizing(40.0, LotSizingRule::FOQ(20.0), 0.0, 1.0);
        assert_eq!(result, 40.0);
    }

    #[test]
    fn apply_lot_sizing_min_order_qty_bumps_below_threshold() {
        // requirement 5 < min 100 -> 100
        let result = apply_lot_sizing(5.0, LotSizingRule::LFL, 100.0, 1.0);
        assert_eq!(result, 100.0);
    }

    #[test]
    fn apply_lot_sizing_min_order_qty_above_threshold_unchanged() {
        let result = apply_lot_sizing(150.0, LotSizingRule::LFL, 100.0, 1.0);
        assert_eq!(result, 150.0);
    }

    #[test]
    fn apply_lot_sizing_pack_multiple_rounds_up() {
        // After LFL: 50; pack_multiple 12 -> 50/12=4.166 -> ceil=5 -> 5*12=60
        let result = apply_lot_sizing(50.0, LotSizingRule::LFL, 0.0, 12.0);
        assert_eq!(result, 60.0);
    }

    #[test]
    fn apply_lot_sizing_pack_multiple_exact_match_unchanged() {
        // 48 / 12 = 4 exactly -> no rounding
        let result = apply_lot_sizing(48.0, LotSizingRule::LFL, 0.0, 12.0);
        assert_eq!(result, 48.0);
    }

    #[test]
    fn apply_lot_sizing_pack_multiple_le_one_is_noop() {
        // pack_multiple <= 1.0 should not alter the result.
        let result = apply_lot_sizing(50.0, LotSizingRule::LFL, 0.0, 1.0);
        assert_eq!(result, 50.0);
    }

    #[test]
    fn calculate_order_date_subtracts_lead_time() {
        let required = chrono::NaiveDate::from_ymd_opt(2026, 1, 31).unwrap();
        let order_date = calculate_order_date(required, 7);
        assert_eq!(
            order_date,
            chrono::NaiveDate::from_ymd_opt(2026, 1, 24).unwrap()
        );
    }

    #[test]
    fn calculate_order_date_zero_lead_time_returns_same_date() {
        let required = chrono::NaiveDate::from_ymd_opt(2026, 6, 15).unwrap();
        assert_eq!(calculate_order_date(required, 0), required);
    }

    #[test]
    fn calculate_order_date_negative_lead_time_pushes_forward() {
        let required = chrono::NaiveDate::from_ymd_opt(2026, 6, 15).unwrap();
        let order_date = calculate_order_date(required, -5);
        assert_eq!(
            order_date,
            chrono::NaiveDate::from_ymd_opt(2026, 6, 20).unwrap()
        );
    }

    #[test]
    fn calculate_order_date_crosses_month_boundary() {
        let required = chrono::NaiveDate::from_ymd_opt(2026, 3, 1).unwrap();
        let order_date = calculate_order_date(required, 1);
        assert_eq!(
            order_date,
            chrono::NaiveDate::from_ymd_opt(2026, 2, 28).unwrap()
        );
    }

    #[test]
    fn compute_mrp_suggestion_zero_forecast_days_returns_zero_avg_daily() {
        // forecast_days == 0 -> avg_daily = 0 -> safety_stock = 0 -> net = gross - on_hand
        let (suggested, safety, net) = compute_mrp_suggestion(100.0, 30.0, 0.0, 0.0, 7, 0, 1.2);
        assert_eq!(safety, 0.0);
        assert_eq!(net, 70.0);
        assert_eq!(suggested, 70.0);
    }

    #[test]
    fn compute_mrp_suggestion_zero_gross_requirement_returns_zeros() {
        let (suggested, safety, net) = compute_mrp_suggestion(0.0, 0.0, 0.0, 0.0, 7, 30, 1.2);
        assert_eq!(safety, 0.0);
        assert_eq!(net, 0.0);
        assert_eq!(suggested, 0.0);
    }

    #[test]
    fn compute_mrp_suggestion_calculates_safety_stock_from_forecast() {
        // gross=300, forecast=30 -> avg_daily=10 -> safety = 10*7*1.2 = 84
        let (suggested, safety, net) = compute_mrp_suggestion(300.0, 100.0, 0.0, 0.0, 7, 30, 1.2);
        assert!((safety - 84.0).abs() < 0.001);
        // net = 300 + 84 + 0 - 100 - 0 = 284
        assert!((net - 284.0).abs() < 0.001);
        assert_eq!(suggested, net);
    }

    #[test]
    fn lot_sizing_rule_lfl_equality() {
        assert_eq!(LotSizingRule::LFL, LotSizingRule::LFL);
        assert_ne!(LotSizingRule::LFL, LotSizingRule::FOQ(10.0));
    }

    #[test]
    fn lot_sizing_rule_foq_equality_with_same_quantity() {
        assert_eq!(LotSizingRule::FOQ(10.0), LotSizingRule::FOQ(10.0));
        assert_ne!(LotSizingRule::FOQ(10.0), LotSizingRule::FOQ(20.0));
    }

    #[test]
    fn create_routes_returns_router_without_panic() {
        let _router = create_routes();
    }
}
