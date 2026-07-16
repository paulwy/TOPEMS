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
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginationParams};

use super::models::{CreateReplenishmentRuleRequest, UpdateReplenishmentRuleRequest};

pub(crate) fn rule_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
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

pub async fn list_rules(
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

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

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

pub async fn create_rule(
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

pub async fn get_rule(
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

pub async fn update_rule(
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

    let existing = sqlx::query("SELECT id FROM wms.replenishment_rules WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await;

    let _ = match existing {
        Ok(Some(_)) => (),
        Ok(None) => return Json(api_error(404, "补货规则不存在")),
        Err(_) => return Json(api_error(500, "查询补货规则失败")),
    };

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

pub async fn delete_rule(
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
