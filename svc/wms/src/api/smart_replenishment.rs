use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::api::ApiState;
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginationParams};

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/api/wms/replenishment/suggestions",
            get(list_suggestions).post(compute_replenishment),
        )
        .route(
            "/api/wms/replenishment/suggestions/{id}",
            get(get_suggestion).post(confirm_suggestion),
        )
        .route(
            "/api/wms/replenishment/rules",
            get(list_rules).post(create_rule),
        )
        .route(
            "/api/wms/replenishment/rules/{id}",
            get(get_rule).put(update_rule).delete(delete_rule),
        )
}

fn suggestion_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "suggestion_number": row.try_get::<String, _>("suggestion_number").ok(),
        "material_code": row.try_get::<String, _>("material_code").ok(),
        "material_name": row.try_get::<String, _>("material_name").ok(),
        "specification": row.try_get::<Option<String>, _>("specification").ok(),
        "unit": row.try_get::<Option<String>, _>("unit").ok(),
        "warehouse_id": row.try_get::<Uuid, _>("warehouse_id").ok(),
        "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
        "location_id": row.try_get::<Option<Uuid>, _>("location_id").ok(),
        "current_stock": row.try_get::<f64, _>("current_stock").ok(),
        "available_stock": row.try_get::<f64, _>("available_stock").ok(),
        "safety_stock": row.try_get::<f64, _>("safety_stock").ok(),
        "reorder_point": row.try_get::<f64, _>("reorder_point").ok(),
        "max_stock": row.try_get::<Option<f64>, _>("max_stock").ok(),
        "consumption_rate": row.try_get::<f64, _>("consumption_rate").ok(),
        "lead_time_days": row.try_get::<i32, _>("lead_time_days").ok(),
        "suggested_quantity": row.try_get::<f64, _>("suggested_quantity").ok(),
        "supplier_id": row.try_get::<Option<Uuid>, _>("supplier_id").ok(),
        "supplier_name": row.try_get::<Option<String>, _>("supplier_name").ok(),
        "status": row.try_get::<String, _>("status").ok(),
        "priority": row.try_get::<String, _>("priority").ok(),
        "trigger_type": row.try_get::<String, _>("trigger_type").ok(),
        "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
        "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
        "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
    })
}

fn rule_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "rule_name": row.try_get::<String, _>("rule_name").ok(),
        "rule_type": row.try_get::<String, _>("rule_type").ok(),
        "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
        "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
        "material_category": row.try_get::<Option<String>, _>("material_category").ok(),
        "material_code": row.try_get::<Option<String>, _>("material_code").ok(),
        "safety_stock": row.try_get::<Option<f64>, _>("safety_stock").ok(),
        "reorder_point": row.try_get::<Option<f64>, _>("reorder_point").ok(),
        "max_stock": row.try_get::<Option<f64>, _>("max_stock").ok(),
        "safety_factor": row.try_get::<Option<f64>, _>("safety_factor").ok(),
        "lead_time_days": row.try_get::<Option<i32>, _>("lead_time_days").ok(),
        "consumption_days": row.try_get::<Option<i32>, _>("consumption_days").ok(),
        "enabled": row.try_get::<bool, _>("enabled").ok(),
        "priority_order": row.try_get::<i32, _>("priority_order").ok(),
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query(
        r#"
        SELECT id, suggestion_number, material_code, material_name, specification, unit,
               warehouse_id, warehouse_name, location_id, current_stock, available_stock,
               safety_stock, reorder_point, max_stock, consumption_rate, lead_time_days,
               suggested_quantity, supplier_id, supplier_name, status, priority,
               trigger_type, remarks, created_at, updated_at
        FROM wms.replenishment_suggestions
        WHERE ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY 
            CASE priority 
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                ELSE 4
            END,
            created_at DESC
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
                SELECT COUNT(*) FROM wms.replenishment_suggestions
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
                items.iter().map(suggestion_row_to_json).collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "suggestions": items_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取补货建议列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取补货建议列表失败: {}", e);
            Json(api_error(500, "获取补货建议列表失败"))
        }
    }
}

async fn get_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        SELECT id, suggestion_number, material_code, material_name, specification, unit,
               warehouse_id, warehouse_name, location_id, current_stock, available_stock,
               safety_stock, reorder_point, max_stock, consumption_rate, lead_time_days,
               suggested_quantity, supplier_id, supplier_name, status, priority,
               trigger_type, remarks, created_at, updated_at
        FROM wms.replenishment_suggestions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            suggestion_row_to_json(&row),
            "获取补货建议详情成功",
        )),
        Ok(None) => Json(api_error(404, "补货建议不存在")),
        Err(e) => {
            tracing::error!("获取补货建议详情失败: {}", e);
            Json(api_error(500, "获取补货建议详情失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ReplenishmentComputeRequest {
    pub warehouse_id: Option<Uuid>,
    pub include_all_warehouses: Option<bool>,
    pub rule_based_only: Option<bool>,
    pub consumption_period_days: Option<i32>,
}

async fn compute_replenishment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<ReplenishmentComputeRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let consumption_days = req.consumption_period_days.unwrap_or(30);

    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开启事务失败: {}", e);
            return Json(api_error(500, "补货计算失败"));
        }
    };

    let clear_result = sqlx::query("DELETE FROM wms.replenishment_suggestions WHERE status = 'draft'")
        .execute(&mut *tx)
        .await;

    if let Err(e) = clear_result {
        tracing::error!("清理草稿建议失败: {}", e);
        let _ = tx.rollback().await;
        return Json(api_error(500, "补货计算失败"));
    }

    let now = Utc::now();
    let suggestion_number = format!("REP{}", now.format("%Y%m%d%H%M%S"));

    let insert_result = sqlx::query(
        r#"
        INSERT INTO wms.replenishment_suggestions
        (id, suggestion_number, material_code, material_name, specification, unit,
         warehouse_id, warehouse_name, location_id, current_stock, available_stock,
         safety_stock, reorder_point, max_stock, consumption_rate, lead_time_days,
         suggested_quantity, supplier_id, supplier_name, status, priority, trigger_type,
         remarks, created_at, updated_at)
        SELECT
            gen_random_uuid(),
            $1 || '_' || ROW_NUMBER() OVER (),
            i.material_code,
            i.material_name,
            i.specification,
            i.unit,
            i.warehouse_id,
            w.name as warehouse_name,
            i.location_id,
            i.quantity as current_stock,
            i.available_quantity as available_stock,
            COALESCE(r.safety_stock, i.min_quantity, 0) as safety_stock,
            COALESCE(r.reorder_point, i.reorder_point, 0) as reorder_point,
            COALESCE(r.max_stock, i.max_quantity, 0) as max_stock,
            COALESCE(consumption.avg_daily, 0) as consumption_rate,
            COALESCE(r.lead_time_days, 7) as lead_time_days,
            CASE
                WHEN COALESCE(r.max_stock, i.max_quantity, 0) > 0
                THEN GREATEST(0, COALESCE(r.max_stock, i.max_quantity, 0) - i.available_quantity)
                ELSE GREATEST(0,
                    COALESCE(r.reorder_point, i.reorder_point, 0)
                    + COALESCE(consumption.avg_daily, 0) * COALESCE(r.lead_time_days, 7)
                    - i.available_quantity
                )
            END as suggested_quantity,
            s.id as supplier_id,
            s.name as supplier_name,
            'draft' as status,
            CASE
                WHEN i.available_quantity < COALESCE(r.safety_stock, i.min_quantity, 0) THEN 'urgent'
                WHEN i.available_quantity < COALESCE(r.reorder_point, i.reorder_point, 0) THEN 'high'
                ELSE 'medium'
            END as priority,
            CASE
                WHEN r.id IS NOT NULL THEN 'rule_based'
                ELSE 'stock_based'
            END as trigger_type,
            '系统自动生成' as remarks,
            $2,
            $2
        FROM wms.inventory i
        LEFT JOIN wms.warehouses w ON i.warehouse_id = w.id
        LEFT JOIN wms.replenishment_rules r ON 
            (r.material_code = i.material_code OR r.material_category IS NOT NULL)
            AND (r.warehouse_id = i.warehouse_id OR r.warehouse_id IS NULL)
            AND r.enabled = true
        LEFT JOIN (
            SELECT material_code, warehouse_id,
                   SUM(quantity) / $3 as avg_daily
            FROM wms.inventory_movements
            WHERE movement_type = 'outbound'
              AND created_at >= CURRENT_DATE - ($3 || ' days')::INTERVAL
            GROUP BY material_code, warehouse_id
        ) consumption ON i.material_code = consumption.material_code AND i.warehouse_id = consumption.warehouse_id
        LEFT JOIN (
            SELECT DISTINCT ON (sp.material_code) sp.supplier_id, s.name, sp.material_code
            FROM scm.supplier_products sp
            JOIN scm.suppliers s ON sp.supplier_id = s.id
            WHERE s.status = 'active'
            ORDER BY sp.material_code, sp.priority
        ) s ON i.material_code = s.material_code
        WHERE i.deleted_at IS NULL
          AND ($4::uuid IS NULL OR i.warehouse_id = $4
          AND (
              i.available_quantity < COALESCE(r.reorder_point, i.reorder_point, 0)
              OR (r.id IS NOT NULL AND $5 = true)
          )
          AND (
              CASE
                  WHEN COALESCE(r.max_stock, i.max_quantity, 0) > 0
                  THEN GREATEST(0, COALESCE(r.max_stock, i.max_quantity, 0) - i.available_quantity)
                  ELSE GREATEST(0,
                      COALESCE(r.reorder_point, i.reorder_point, 0)
                      + COALESCE(consumption.avg_daily, 0) * COALESCE(r.lead_time_days, 7)
                      - i.available_quantity
                  )
              END
          ) > 0
        RETURNING id, suggestion_number, material_code, material_name, specification, unit,
                  warehouse_id, warehouse_name, location_id, current_stock, available_stock,
                  safety_stock, reorder_point, max_stock, consumption_rate, lead_time_days,
                  suggested_quantity, supplier_id, supplier_name, status, priority,
                  trigger_type, remarks, created_at, updated_at
        "#,
    )
    .bind(&suggestion_number)
    .bind(now.naive_utc())
    .bind(consumption_days)
    .bind(req.warehouse_id)
    .bind(req.rule_based_only.unwrap_or(false))
    .fetch_all(&mut *tx)
    .await;

    let items = match insert_result {
        Ok(items) => items,
        Err(e) => {
            tracing::error!("补货计算失败: {}", e);
            let _ = tx.rollback().await;
            log_audit_event(
                &state.db,
                "compute".to_string(),
                "replenishment_suggestion".to_string(),
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
            return Json(api_error(500, "补货计算失败"));
        }
    };

    if let Err(e) = tx.commit().await {
        tracing::error!("提交事务失败: {}", e);
        return Json(api_error(500, "补货计算失败"));
    }

    let items_json: Vec<serde_json::Value> =
        items.iter().map(suggestion_row_to_json).collect();
    let count = items.len() as i64;
    let response_data = Some(serde_json::json!({ "generated_count": count }));

    let response = Json(ApiResponse::success(
        serde_json::json!({
            "suggestions": items_json,
            "total": count,
            "consumption_period_days": consumption_days
        }),
        &format!("补货计算完成，生成{}条建议", count),
    ));

    log_audit_event(
        &state.db,
        "compute".to_string(),
        "replenishment_suggestion".to_string(),
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now().naive_utc();

    let existing = sqlx::query(
        "SELECT id, status, suggested_quantity FROM wms.replenishment_suggestions WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(row)) => row,
        Ok(None) => return Json(api_error(404, "补货建议不存在")),
        Err(e) => return Json(api_error(500, &format!("查询补货建议失败: {}", e))),
    };

    let status: String = existing.try_get("status").unwrap_or_default();
    if status != "draft" {
        return Json(api_error(400, &format!("补货建议当前状态为{}，无法确认", status)));
    }

    let confirmed_qty = req
        .confirmed_quantity
        .unwrap_or_else(|| existing.try_get("suggested_quantity").unwrap_or(0.0));

    let result = sqlx::query(
        r#"
        UPDATE wms.replenishment_suggestions SET
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
                  warehouse_id, warehouse_name, location_id, current_stock, available_stock,
                  safety_stock, reorder_point, max_stock, consumption_rate, lead_time_days,
                  suggested_quantity, supplier_id, supplier_name, status, priority,
                  trigger_type, remarks, created_at, updated_at
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
                suggestion_row_to_json(row),
                "补货建议确认成功",
            )),
            "success",
            None,
            Some(suggestion_row_to_json(row)),
        ),
        Err(e) => {
            tracing::error!("确认补货建议失败: {}", e);
            (
                Json(api_error(500, "确认补货建议失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "confirm".to_string(),
        "replenishment_suggestion".to_string(),
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

async fn list_rules(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));

    let result = sqlx::query(
        r#"
        SELECT id, rule_name, rule_type, warehouse_id, warehouse_name,
               material_category, material_code, safety_stock, reorder_point,
               max_stock, safety_factor, lead_time_days, consumption_days,
               enabled, priority_order, remarks, created_at, updated_at
        FROM wms.replenishment_rules
        WHERE ($1::text IS NULL OR rule_name ILIKE $1 OR material_code ILIKE $1)
        ORDER BY priority_order ASC, created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM wms.replenishment_rules
                WHERE ($1::text IS NULL OR rule_name ILIKE $1 OR material_code ILIKE $1)
                "#,
            )
            .bind(&search_pattern)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let items_json: Vec<serde_json::Value> = items.iter().map(rule_row_to_json).collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "rules": items_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取补货规则列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取补货规则列表失败: {}", e);
            Json(api_error(500, "获取补货规则列表失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateReplenishmentRuleRequest {
    pub rule_name: String,
    pub rule_type: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub material_category: Option<String>,
    pub material_code: Option<String>,
    pub safety_stock: Option<f64>,
    pub reorder_point: Option<f64>,
    pub max_stock: Option<f64>,
    pub safety_factor: Option<f64>,
    pub lead_time_days: Option<i32>,
    pub consumption_days: Option<i32>,
    pub enabled: Option<bool>,
    pub priority_order: Option<i32>,
    pub remarks: Option<String>,
}

async fn create_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateReplenishmentRuleRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now().naive_utc();
    let enabled = req.enabled.unwrap_or(true);
    let priority_order = req.priority_order.unwrap_or(0);

    let result = sqlx::query(
        r#"
        INSERT INTO wms.replenishment_rules
        (id, rule_name, rule_type, warehouse_id, warehouse_name,
         material_category, material_code, safety_stock, reorder_point,
         max_stock, safety_factor, lead_time_days, consumption_days,
         enabled, priority_order, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id, rule_name, rule_type, warehouse_id, warehouse_name,
                  material_category, material_code, safety_stock, reorder_point,
                  max_stock, safety_factor, lead_time_days, consumption_days,
                  enabled, priority_order, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.rule_name)
    .bind(&req.rule_type.unwrap_or_else(|| "custom".to_string()))
    .bind(req.warehouse_id)
    .bind(&req.warehouse_name)
    .bind(&req.material_category)
    .bind(&req.material_code)
    .bind(req.safety_stock)
    .bind(req.reorder_point)
    .bind(req.max_stock)
    .bind(req.safety_factor)
    .bind(req.lead_time_days)
    .bind(req.consumption_days)
    .bind(enabled)
    .bind(priority_order)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => (
            Json(ApiResponse::success(
                rule_row_to_json(row),
                "补货规则创建成功",
            )),
            "success",
            None,
            Some(rule_row_to_json(row)),
        ),
        Err(e) => {
            tracing::error!("创建补货规则失败: {}", e);
            (
                Json(api_error(500, "创建补货规则失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "replenishment_rule".to_string(),
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

async fn get_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        SELECT id, rule_name, rule_type, warehouse_id, warehouse_name,
               material_category, material_code, safety_stock, reorder_point,
               max_stock, safety_factor, lead_time_days, consumption_days,
               enabled, priority_order, remarks, created_at, updated_at
        FROM wms.replenishment_rules WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            rule_row_to_json(&row),
            "获取补货规则详情成功",
        )),
        Ok(None) => Json(api_error(404, "补货规则不存在")),
        Err(e) => {
            tracing::error!("获取补货规则详情失败: {}", e);
            Json(api_error(500, "获取补货规则详情失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateReplenishmentRuleRequest {
    pub rule_name: Option<String>,
    pub rule_type: Option<String>,
    pub safety_stock: Option<f64>,
    pub reorder_point: Option<f64>,
    pub max_stock: Option<f64>,
    pub safety_factor: Option<f64>,
    pub lead_time_days: Option<i32>,
    pub consumption_days: Option<i32>,
    pub enabled: Option<bool>,
    pub priority_order: Option<i32>,
    pub remarks: Option<String>,
}

async fn update_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateReplenishmentRuleRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now().naive_utc();

    let existing = sqlx::query(
        "SELECT id FROM wms.replenishment_rules WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    if existing.is_err() {
        return Json(api_error(500, "查询补货规则失败"));
    }
    if existing.as_ref().unwrap().is_none() {
        return Json(api_error(404, "补货规则不存在"));
    }

    let result = sqlx::query(
        r#"
        UPDATE wms.replenishment_rules SET
            rule_name = COALESCE($2, rule_name),
            rule_type = COALESCE($3, rule_type),
            safety_stock = COALESCE($4, safety_stock),
            reorder_point = COALESCE($5, reorder_point),
            max_stock = COALESCE($6, max_stock),
            safety_factor = COALESCE($7, safety_factor),
            lead_time_days = COALESCE($8, lead_time_days),
            consumption_days = COALESCE($9, consumption_days),
            enabled = COALESCE($10, enabled),
            priority_order = COALESCE($11, priority_order),
            remarks = CASE 
                WHEN remarks IS NOT NULL AND $12 IS NOT NULL THEN remarks || ' | ' || $12
                ELSE COALESCE(remarks, $12)
            END,
            updated_at = $13
        WHERE id = $1
        RETURNING id, rule_name, rule_type, warehouse_id, warehouse_name,
                  material_category, material_code, safety_stock, reorder_point,
                  max_stock, safety_factor, lead_time_days, consumption_days,
                  enabled, priority_order, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.rule_name)
    .bind(&req.rule_type)
    .bind(req.safety_stock)
    .bind(req.reorder_point)
    .bind(req.max_stock)
    .bind(req.safety_factor)
    .bind(req.lead_time_days)
    .bind(req.consumption_days)
    .bind(req.enabled)
    .bind(req.priority_order)
    .bind(&req.remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => (
            Json(ApiResponse::success(
                rule_row_to_json(row),
                "补货规则更新成功",
            )),
            "success",
            None,
            Some(rule_row_to_json(row)),
        ),
        Err(e) => {
            tracing::error!("更新补货规则失败: {}", e);
            (
                Json(api_error(500, "更新补货规则失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "replenishment_rule".to_string(),
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

async fn delete_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query("DELETE FROM wms.replenishment_rules WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "补货规则删除成功")),
            "success",
            None,
            Some(serde_json::json!({ "rows_affected": r.rows_affected() })),
        ),
        Ok(_) => (
            Json(api_error(404, "补货规则不存在")),
            "error",
            Some("补货规则不存在".to_string()),
            None,
        ),
        Err(e) => {
            tracing::error!("删除补货规则失败: {}", e);
            (
                Json(api_error(500, "删除补货规则失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "replenishment_rule".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}
