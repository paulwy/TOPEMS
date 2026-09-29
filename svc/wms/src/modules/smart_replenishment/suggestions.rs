use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use chrono::Utc;
use sqlx::Row;
use uuid::Uuid;

use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};

use super::models::{ConfirmSuggestionRequest, ReplenishmentComputeRequest};

pub(crate) fn suggestion_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/smart-replenishment/suggestions",
    tag = "smart_replenishment",
    operation_id = "list_suggestions",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_suggestions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
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
    .fetch_all(&mut **txn)
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
            .fetch_one(&mut **txn)
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/smart-replenishment/suggestions/{id}",
    tag = "smart_replenishment",
    operation_id = "get_suggestion",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
    .fetch_optional(&mut **txn)
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:write"])),
    path = "/smart-replenishment/suggestions/generate",
    tag = "smart_replenishment",
    operation_id = "compute_replenishment",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn compute_replenishment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ReplenishmentComputeRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let _txn = guard.as_mut().expect("rls txn missing");
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

    let clear_result = sqlx::query(
        "UPDATE wms.replenishment_suggestions SET deleted_at = NOW() WHERE status = 'draft'",
    )
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
            NULL::uuid as supplier_id,
            NULL::text as supplier_name,
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
        )
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

    // 供应商信息保持 NULL（原跨 schema JOIN scm.supplier_products 已移除，因该表不存在）
    // 用户在 UI 确认补货建议时可手动选择供应商
    if let Ok(items) = &insert_result {
        tracing::debug!(
            "补货计算完成，生成 {} 条建议（supplier 字段留空，由用户手动选择）",
            items.len()
        );
    }

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

    let items_json: Vec<serde_json::Value> = items.iter().map(suggestion_row_to_json).collect();
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:write"])),
    path = "/smart-replenishment/suggestions/{id}",
    tag = "smart_replenishment",
    operation_id = "confirm_suggestion",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn confirm_suggestion(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ConfirmSuggestionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(row)) => row,
        Ok(None) => return Json(api_error(404, "补货建议不存在")),
        Err(e) => return Json(api_error(500, &format!("查询补货建议失败: {}", e))),
    };

    let status: String = existing.try_get("status").unwrap_or_default();
    if status != "draft" {
        return Json(api_error(
            400,
            &format!("补货建议当前状态为{}，无法确认", status),
        ));
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
    .bind(req.remarks.unwrap_or_else(|| "已确认".to_string()))
    .bind(now)
    .fetch_one(&mut **txn)
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/smart-replenishment/statistics",
    tag = "smart_replenishment",
    operation_id = "get_statistics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<serde_json::Value>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let warehouse_id_str = params.get("warehouse_id").and_then(|v| v.as_str());
    let warehouse_id: Option<Uuid> = warehouse_id_str.and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as total_suggestions,
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
            SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count,
            SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_count,
            SUM(suggested_quantity) as total_suggested_quantity
        FROM wms.replenishment_suggestions
        WHERE warehouse_id = $1 OR $1 IS NULL
        "#,
        warehouse_id
    )
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let total_suggested_quantity = row.total_suggested_quantity.unwrap_or_default();
            Json(ApiResponse::success(
                serde_json::json!({
                    "total_suggestions": row.total_suggestions.unwrap_or(0),
                    "draft_count": row.draft_count.unwrap_or(0),
                    "confirmed_count": row.confirmed_count.unwrap_or(0),
                    "urgent_count": row.urgent_count.unwrap_or(0),
                    "high_count": row.high_count.unwrap_or(0),
                    "total_suggested_quantity": total_suggested_quantity,
                }),
                "获取补货统计成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取补货统计失败: {}", e);
            Json(api_error(500, "获取补货统计失败"))
        }
    }
}
