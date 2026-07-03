use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::Utc;
use num_traits::cast::ToPrimitive;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::api::ApiState;
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct AlertQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub alert_type: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
}

/// 库存预警记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryAlert {
    pub id: Uuid,
    pub inventory_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub location_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub alert_type: String,
    pub current_quantity: f64,
    pub threshold_value: Option<f64>,
    pub deviation_quantity: Option<f64>,
    pub severity: String,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

/// 预警汇总
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertSummary {
    pub total_alerts: i64,
    pub critical_count: i64,
    pub warning_count: i64,
    pub info_count: i64,
    pub below_min_count: i64,
    pub above_max_count: i64,
    pub reorder_count: i64,
    pub expiry_count: i64,
    pub out_of_stock_count: i64,
}

/// 按仓库统计预警
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WarehouseAlertCount {
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub alert_count: i64,
}

/// 按物料统计预警
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialAlertCount {
    pub material_code: String,
    pub material_name: String,
    pub alert_count: i64,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/api/wms/alerts", get(list_alerts))
        .route("/api/v1/alerts/{id}", get(get_alert))
        .route("/api/v1/alerts/{id}/acknowledge", post(acknowledge_alert))
        .route("/api/wms/alerts/statistics", get(get_alert_statistics))
        .route("/api/wms/alerts/summary", get(get_alert_summary))
        .route("/api/wms/alerts/by-warehouse", get(get_alerts_by_warehouse))
        .route("/api/wms/inventory-alerts", get(list_alerts))
        .route(
            "/api/wms/inventory-alerts/statistics",
            get(get_alert_statistics),
        )
        .route("/api/wms/inventory-alerts/{id}", get(get_alert))
        .route(
            "/api/wms/inventory-alerts/{id}/acknowledge",
            post(acknowledge_alert),
        )
}

/// 获取库存预警列表
async fn list_alerts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let alert_type = params.alert_type.clone();
    let severity = params.severity.clone();
    let warehouse_id = params.warehouse_id;

    let result = sqlx::query!(
        r#"
        SELECT 
            i.id as inventory_id,
            i.material_code as material_code,
            i.material_name as material_name,
            i.warehouse_id as warehouse_id,
            w.warehouse_name as warehouse_name,
            i.location_id as location_id,
            l.location_code as location_code,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 'below_min'
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN 'above_max'
                WHEN i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point THEN 'reorder_needed'
                WHEN i.quantity <= 0 THEN 'out_of_stock'
                ELSE NULL
            END as alert_type,
            i.quantity as current_quantity,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN i.min_quantity
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN i.max_quantity
                WHEN i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point THEN i.reorder_point
                ELSE NULL
            END as threshold_value,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN i.min_quantity - i.quantity
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN i.quantity - i.max_quantity
                ELSE NULL
            END as deviation_quantity,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity * 0.5 THEN 'critical'
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 'warning'
                WHEN i.quantity <= 0 THEN 'critical'
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN 'warning'
                ELSE 'info'
            END as severity,
            'pending' as status,
            NULL as remarks
        FROM wms.inventory i
        LEFT JOIN wms.warehouses w ON i.warehouse_id = w.id
        LEFT JOIN wms.locations l ON i.location_id = l.id
        WHERE ($1::text IS NULL OR CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 'below_min'
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN 'above_max'
                WHEN i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point THEN 'reorder_needed'
                WHEN i.quantity <= 0 THEN 'out_of_stock'
                ELSE NULL
            END = $1)
          AND ($2::text IS NULL OR CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity * 0.5 THEN 'critical'
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 'warning'
                WHEN i.quantity <= 0 THEN 'critical'
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN 'warning'
                ELSE 'info'
            END = $2)
          AND ($3::uuid IS NULL OR i.warehouse_id = $3)
          AND i.deleted_at IS NULL
          AND (
            (i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity)
            OR (i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity)
            OR (i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point)
            OR i.quantity <= 0
          )
        ORDER BY 
            CASE 
                WHEN i.quantity <= 0 THEN 0
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity * 0.5 THEN 1
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 2
                ELSE 3
            END,
            i.material_name
        LIMIT $4 OFFSET $5
        "#,
        alert_type.as_deref(),
        severity.as_deref(),
        warehouse_id,
        page_size,
        offset
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let alerts: Vec<InventoryAlert> = rows
                .into_iter()
                .map(|r| InventoryAlert {
                    id: Uuid::new_v4(),
                    inventory_id: r.inventory_id,
                    material_code: r.material_code,
                    material_name: r.material_name,
                    warehouse_id: Some(r.warehouse_id),
                    warehouse_name: Some(r.warehouse_name),
                    location_id: r.location_id,
                    location_code: Some(r.location_code),
                    alert_type: r.alert_type.unwrap_or_default(),
                    current_quantity: r.current_quantity.to_f64().unwrap_or(0.0),
                    threshold_value: r.threshold_value.map(|v| v.to_f64().unwrap_or(0.0)),
                    deviation_quantity: r.deviation_quantity.map(|v| v.to_f64().unwrap_or(0.0)),
                    severity: r.severity.unwrap_or_default(),
                    status: r.status.unwrap_or_default(),
                    remarks: r.remarks,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                })
                .collect();

            let total = alerts.len() as i64;

            Json(ApiResponse::success(
                serde_json::json!({
                    "alerts": alerts,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取库存预警列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取库存预警列表失败: {}", e);
            Json(api_error(500, "获取库存预警列表失败"))
        }
    }
}

/// 获取单个预警详情
async fn get_alert(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<InventoryAlert>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            i.id as inventory_id,
            i.material_code as material_code,
            i.material_name as material_name,
            i.warehouse_id as warehouse_id,
            w.warehouse_name as warehouse_name,
            i.location_id as location_id,
            l.location_code as location_code,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 'below_min'
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN 'above_max'
                WHEN i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point THEN 'reorder_needed'
                WHEN i.quantity <= 0 THEN 'out_of_stock'
                ELSE NULL
            END as alert_type,
            i.quantity as current_quantity,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN i.min_quantity
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN i.max_quantity
                WHEN i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point THEN i.reorder_point
                ELSE NULL
            END as threshold_value,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN i.min_quantity - i.quantity
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN i.quantity - i.max_quantity
                ELSE NULL
            END as deviation_quantity,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity * 0.5 THEN 'critical'
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 'warning'
                WHEN i.quantity <= 0 THEN 'critical'
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN 'warning'
                ELSE 'info'
            END as severity,
            'pending' as status,
            NULL as remarks
        FROM wms.inventory i
        LEFT JOIN wms.warehouses w ON i.warehouse_id = w.id
        LEFT JOIN wms.locations l ON i.location_id = l.id
        WHERE i.id = $1
        "#,
        id
    )
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(r)) => {
            let alert = InventoryAlert {
                id: Uuid::new_v4(),
                inventory_id: r.inventory_id,
                material_code: r.material_code,
                material_name: r.material_name,
                warehouse_id: Some(r.warehouse_id),
                warehouse_name: Some(r.warehouse_name),
                location_id: r.location_id,
                location_code: Some(r.location_code),
                alert_type: r.alert_type.unwrap_or_default(),
                current_quantity: r.current_quantity.to_f64().unwrap_or(0.0),
                threshold_value: r.threshold_value.map(|v| v.to_f64().unwrap_or(0.0)),
                deviation_quantity: r.deviation_quantity.map(|v| v.to_f64().unwrap_or(0.0)),
                severity: r.severity.unwrap_or_default(),
                status: r.status.unwrap_or_default(),
                remarks: r.remarks,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            Json(ApiResponse::success(alert, "获取预警详情成功"))
        }
        Ok(None) => Json(api_error(404, "预警不存在")),
        Err(e) => {
            tracing::error!("获取预警详情失败: {}", e);
            Json(api_error(500, "获取预警详情失败"))
        }
    }
}

/// 确认预警
async fn acknowledge_alert(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 检查库存是否存在
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM wms.inventory WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match exists {
        Ok(Some(c)) if c > 0 => {
            log_audit_event(
                &state.db,
                "acknowledge".to_string(),
                "inventory_alert".to_string(),
                Some(id),
                None,
                None,
                None,
                None,
                None,
                "success".to_string(),
                None,
                &headers,
            )
            .await;

            Json(ApiResponse::success(
                serde_json::json!({"id": id}),
                "预警已确认",
            ))
        }
        Ok(_) => Json(api_error(404, "预警不存在")),
        Err(e) => {
            tracing::error!("确认预警失败: {}", e);
            Json(api_error(500, "确认预警失败"))
        }
    }
}

/// 获取预警统计信息
async fn get_alert_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 获取预警汇总
    let summary_result = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as below_min_count,
            0 as critical_count,
            0 as warning_count,
            0 as info_count,
            0 as above_max_count,
            0 as reorder_count,
            0 as expiry_count,
            0 as out_of_stock_count
        FROM wms.inventory i
        WHERE i.deleted_at IS NULL
          AND (
            (i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity)
            OR (i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity)
            OR (i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point)
            OR i.quantity <= 0
          )
        "#,
    )
    .fetch_one(&state.db)
    .await;

    let summary = match summary_result {
        Ok(r) => AlertSummary {
            total_alerts: r.below_min_count.unwrap_or(0) as i64,
            critical_count: r.critical_count.unwrap_or(0) as i64,
            warning_count: r.warning_count.unwrap_or(0) as i64,
            info_count: r.info_count.unwrap_or(0) as i64,
            below_min_count: r.below_min_count.unwrap_or(0) as i64,
            above_max_count: r.above_max_count.unwrap_or(0) as i64,
            reorder_count: r.reorder_count.unwrap_or(0) as i64,
            expiry_count: r.expiry_count.unwrap_or(0) as i64,
            out_of_stock_count: r.out_of_stock_count.unwrap_or(0) as i64,
        },
        Err(e) => {
            tracing::error!("获取预警汇总失败: {}", e);
            return Json(api_error(500, "获取预警统计失败"));
        }
    };

    // 按仓库统计
    let by_warehouse_result = sqlx::query!(
        r#"
        SELECT 
            i.warehouse_id,
            w.warehouse_name as warehouse_name,
            COUNT(*) as alert_count
        FROM wms.inventory i
        LEFT JOIN wms.warehouses w ON i.warehouse_id = w.id
        WHERE i.deleted_at IS NULL
          AND (
            (i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity)
            OR (i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity)
            OR (i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point)
            OR i.quantity <= 0
          )
        GROUP BY i.warehouse_id, w.warehouse_name
        "#,
    )
    .fetch_all(&state.db)
    .await;

    let alerts_by_warehouse: Vec<WarehouseAlertCount> = match by_warehouse_result {
        Ok(rows) => rows
            .into_iter()
            .map(|r| WarehouseAlertCount {
                warehouse_id: Some(r.warehouse_id),
                warehouse_name: Some(r.warehouse_name),
                alert_count: r.alert_count.unwrap_or(0) as i64,
            })
            .collect(),
        Err(_) => vec![],
    };

    // 按物料统计
    let by_material_result = sqlx::query!(
        r#"
        SELECT 
            i.material_code,
            i.material_name,
            COUNT(*) as alert_count
        FROM wms.inventory i
        WHERE i.deleted_at IS NULL
          AND (
            (i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity)
            OR (i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity)
            OR (i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point)
            OR i.quantity <= 0
          )
        GROUP BY i.material_code, i.material_name
        ORDER BY COUNT(*) DESC
        LIMIT 10
        "#,
    )
    .fetch_all(&state.db)
    .await;

    let alerts_by_material: Vec<MaterialAlertCount> = match by_material_result {
        Ok(rows) => rows
            .into_iter()
            .map(|r| MaterialAlertCount {
                material_code: r.material_code,
                material_name: r.material_name,
                alert_count: r.alert_count.unwrap_or(0),
            })
            .collect(),
        Err(_) => vec![],
    };

    Json(ApiResponse::success(
        serde_json::json!({
            "summary": summary,
            "alerts_by_warehouse": alerts_by_warehouse,
            "alerts_by_material": alerts_by_material
        }),
        "获取预警统计成功",
    ))
}

/// 获取预警汇总（简化版）
async fn get_alert_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<AlertSummary>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as total_alerts,
            SUM(CASE WHEN (min_quantity IS NOT NULL AND quantity < min_quantity * 0.5) OR quantity <= 0 THEN 1 ELSE 0 END) as critical_count,
            SUM(CASE WHEN min_quantity IS NOT NULL AND quantity < min_quantity AND quantity >= min_quantity * 0.5 THEN 1 ELSE 0 END) as warning_count,
            SUM(CASE WHEN max_quantity IS NOT NULL AND quantity > max_quantity THEN 1 ELSE 0 END) as info_count,
            SUM(CASE WHEN min_quantity IS NOT NULL AND quantity < min_quantity THEN 1 ELSE 0 END) as below_min_count,
            SUM(CASE WHEN max_quantity IS NOT NULL AND quantity > max_quantity THEN 1 ELSE 0 END) as above_max_count,
            SUM(CASE WHEN reorder_point IS NOT NULL AND quantity <= reorder_point AND (min_quantity IS NULL OR quantity >= min_quantity) THEN 1 ELSE 0 END) as reorder_count,
            0 as expiry_count,
            SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock_count
        FROM wms.inventory
        WHERE deleted_at IS NULL
          AND (
            (min_quantity IS NOT NULL AND quantity < min_quantity)
            OR (max_quantity IS NOT NULL AND quantity > max_quantity)
            OR (reorder_point IS NOT NULL AND quantity <= reorder_point)
            OR quantity <= 0
          )
        "#,
    )
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(r) => {
            let summary = AlertSummary {
                total_alerts: r.total_alerts.unwrap_or(0) as i64,
                critical_count: r.critical_count.unwrap_or(0) as i64,
                warning_count: r.warning_count.unwrap_or(0) as i64,
                info_count: r.info_count.unwrap_or(0) as i64,
                below_min_count: r.below_min_count.unwrap_or(0) as i64,
                above_max_count: r.above_max_count.unwrap_or(0) as i64,
                reorder_count: r.reorder_count.unwrap_or(0) as i64,
                expiry_count: r.expiry_count.unwrap_or(0) as i64,
                out_of_stock_count: r.out_of_stock_count.unwrap_or(0) as i64,
            };
            Json(ApiResponse::success(summary, "获取预警汇总成功"))
        }
        Err(e) => {
            tracing::error!("获取预警汇总失败: {}", e);
            Json(api_error(500, "获取预警汇总失败"))
        }
    }
}

/// 按仓库获取预警列表
async fn get_alerts_by_warehouse(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let warehouse_id = params.warehouse_id;

    let result = sqlx::query!(
        r#"
        SELECT 
            i.id as inventory_id,
            i.material_code as material_code,
            i.material_name as material_name,
            i.warehouse_id as warehouse_id,
            w.warehouse_name as warehouse_name,
            i.location_id as location_id,
            l.location_code as location_code,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 'below_min'
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN 'above_max'
                WHEN i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point THEN 'reorder_needed'
                WHEN i.quantity <= 0 THEN 'out_of_stock'
                ELSE NULL
            END as alert_type,
            i.quantity as current_quantity,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN i.min_quantity
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN i.max_quantity
                WHEN i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point THEN i.reorder_point
                ELSE NULL
            END as threshold_value,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN i.min_quantity - i.quantity
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN i.quantity - i.max_quantity
                ELSE NULL
            END as deviation_quantity,
            CASE
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity * 0.5 THEN 'critical'
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 'warning'
                WHEN i.quantity <= 0 THEN 'critical'
                WHEN i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity THEN 'warning'
                ELSE 'info'
            END as severity,
            'pending' as status,
            NULL as remarks
        FROM wms.inventory i
        LEFT JOIN wms.warehouses w ON i.warehouse_id = w.id
        LEFT JOIN wms.locations l ON i.location_id = l.id
        WHERE ($1::uuid IS NULL OR i.warehouse_id = $1)
          AND i.deleted_at IS NULL
          AND (
            (i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity)
            OR (i.max_quantity IS NOT NULL AND i.quantity > i.max_quantity)
            OR (i.reorder_point IS NOT NULL AND i.quantity <= i.reorder_point)
            OR i.quantity <= 0
          )
        ORDER BY 
            CASE 
                WHEN i.quantity <= 0 THEN 0
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity * 0.5 THEN 1
                WHEN i.min_quantity IS NOT NULL AND i.quantity < i.min_quantity THEN 2
                ELSE 3
            END,
            i.material_name
        "#,
        warehouse_id
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let alerts: Vec<InventoryAlert> = rows
                .into_iter()
                .map(|r| InventoryAlert {
                    id: Uuid::new_v4(),
                    inventory_id: r.inventory_id,
                    material_code: r.material_code,
                    material_name: r.material_name,
                    warehouse_id: Some(r.warehouse_id),
                    warehouse_name: Some(r.warehouse_name),
                    location_id: r.location_id,
                    location_code: Some(r.location_code),
                    alert_type: r.alert_type.unwrap_or_default(),
                    current_quantity: r.current_quantity.to_f64().unwrap_or(0.0),
                    threshold_value: r.threshold_value.map(|v| v.to_f64().unwrap_or(0.0)),
                    deviation_quantity: r.deviation_quantity.map(|v| v.to_f64().unwrap_or(0.0)),
                    severity: r.severity.unwrap_or_default(),
                    status: r.status.unwrap_or_default(),
                    remarks: r.remarks,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                })
                .collect();

            let total = alerts.len() as i64;

            Json(ApiResponse::success(
                serde_json::json!({
                    "alerts": alerts,
                    "total": total
                }),
                "获取仓库预警列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取仓库预警列表失败: {}", e);
            Json(api_error(500, "获取仓库预警列表失败"))
        }
    }
}
