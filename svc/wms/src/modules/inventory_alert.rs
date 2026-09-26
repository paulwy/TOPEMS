use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use num_traits::cast::ToPrimitive;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use utoipa::IntoParams;
use uuid::Uuid;

use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Deserialize, IntoParams)]
pub struct AlertQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
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
        .route("/alerts", get(list_alerts))
        .route("/alerts/{id}", get(get_alert))
        .route("/alerts/{id}/acknowledge", post(acknowledge_alert))
        .route("/alerts/statistics", get(get_alert_statistics))
        .route("/alerts/summary", get(get_alert_summary))
        .route("/alerts/by-warehouse", get(get_alerts_by_warehouse))
        .route("/inventory-alerts", get(list_alerts))
        .route("/inventory-alerts/statistics", get(get_alert_statistics))
        .route("/inventory-alerts/{id}", get(get_alert))
        .route(
            "/inventory-alerts/{id}/acknowledge",
            post(acknowledge_alert),
        )
        .route(
            "/inventory-alerts/rules",
            get(list_alert_rules).post(create_alert_rule),
        )
        .route(
            "/inventory-alerts/rules/{id}",
            get(get_alert_rule)
                .put(update_alert_rule)
                .delete(delete_alert_rule),
        )
        .route("/inventory-alerts/records", get(list_alert_records))
        .route("/inventory-alerts/records/{id}", get(get_alert_record))
        .route(
            "/inventory-alerts/records/{id}/confirm",
            post(confirm_alert_record),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts",
    responses(
        (status = 200, description = "list_alerts OK")
    ),
    tag = "WMS/inventory-alerts"
)]
/// 获取库存预警列表
pub async fn list_alerts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertQueryParams>,
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
    .fetch_all(&mut **txn)
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
                    warehouse_name: r.warehouse_name,
                    location_id: r.location_id,
                    location_code: r.location_code,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "get_alert OK")
    ),
    tag = "WMS/inventory-alerts"
)]
/// 获取单个预警详情
pub async fn get_alert(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<InventoryAlert>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(r)) => {
            let alert = InventoryAlert {
                id: Uuid::new_v4(),
                inventory_id: r.inventory_id,
                material_code: r.material_code,
                material_name: r.material_name,
                warehouse_id: Some(r.warehouse_id),
                warehouse_name: r.warehouse_name,
                location_id: r.location_id,
                location_code: r.location_code,
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/{id}/acknowledge",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "acknowledge_alert OK")
    ),
    tag = "WMS/inventory-alerts"
)]
/// 确认预警
pub async fn acknowledge_alert(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 检查库存是否存在
    let exists = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "wms",
        "SELECT COUNT(*) FROM wms.inventory WHERE id = $1 AND deleted_at IS NULL"
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/statistics",
    responses(
        (status = 200, description = "get_alert_statistics OK")
    ),
    tag = "WMS/inventory-alerts"
)]
/// 获取预警统计信息
pub async fn get_alert_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
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
    .fetch_one(&mut **txn)
    .await;

    let summary = match summary_result {
        Ok(r) => AlertSummary {
            total_alerts: r.below_min_count.unwrap_or(0),
            critical_count: r.critical_count.unwrap_or(0) as i64,
            warning_count: r.warning_count.unwrap_or(0) as i64,
            info_count: r.info_count.unwrap_or(0) as i64,
            below_min_count: r.below_min_count.unwrap_or(0),
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
    .fetch_all(&mut **txn)
    .await;

    let alerts_by_warehouse: Vec<WarehouseAlertCount> = match by_warehouse_result {
        Ok(rows) => rows
            .into_iter()
            .map(|r| WarehouseAlertCount {
                warehouse_id: Some(r.warehouse_id),
                warehouse_name: r.warehouse_name,
                alert_count: r.alert_count.unwrap_or(0),
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
    .fetch_all(&mut **txn)
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/alerts/summary",
    tag = "inventory_alert",
    operation_id = "get_alert_summary",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_alert_summary(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<AlertSummary>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(r) => {
            let summary = AlertSummary {
                total_alerts: r.total_alerts.unwrap_or(0),
                critical_count: r.critical_count.unwrap_or(0),
                warning_count: r.warning_count.unwrap_or(0),
                info_count: r.info_count.unwrap_or(0),
                below_min_count: r.below_min_count.unwrap_or(0),
                above_max_count: r.above_max_count.unwrap_or(0),
                reorder_count: r.reorder_count.unwrap_or(0),
                expiry_count: r.expiry_count.unwrap_or(0) as i64,
                out_of_stock_count: r.out_of_stock_count.unwrap_or(0),
            };

            // P3 事件驱动规范化：查询预警汇总时异步触发低库存事件发布，
            // 通知 SCM（补货计划）/Portal（用户提醒）。事件消费者需做幂等处理。
            if summary.total_alerts > 0 {
                let db = state.db.clone();
                let publisher = state.event_publisher.clone();
                tokio::spawn(async move {
                    if let Err(e) =
                        crate::event_handlers::emit_low_stock_alerts(&db, &publisher).await
                    {
                        tracing::warn!("[wms] 触发 WmsInventoryLowStock 事件发布失败: {}", e);
                    }
                });
            }

            Json(ApiResponse::success(summary, "获取预警汇总成功"))
        }
        Err(e) => {
            tracing::error!("获取预警汇总失败: {}", e);
            Json(api_error(500, "获取预警汇总失败"))
        }
    }
}

/// 按仓库获取预警列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/alerts/by-warehouse",
    tag = "inventory_alert",
    operation_id = "get_alerts_by_warehouse",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_alerts_by_warehouse(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertQueryParams>,
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
    .fetch_all(&mut **txn)
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
                    warehouse_name: r.warehouse_name,
                    location_id: r.location_id,
                    location_code: r.location_code,
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

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct InventoryAlertRule {
    pub id: Uuid,
    pub rule_name: String,
    pub alert_type: String,
    pub warehouse_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub threshold_value: f64,
    pub severity: String,
    pub enabled: bool,
    pub remarks: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateAlertRuleRequest {
    pub rule_name: String,
    pub alert_type: String,
    pub warehouse_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub threshold_value: f64,
    pub severity: String,
    pub enabled: Option<bool>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateAlertRuleRequest {
    pub rule_name: Option<String>,
    pub alert_type: Option<String>,
    pub threshold_value: Option<f64>,
    pub severity: Option<String>,
    pub enabled: Option<bool>,
    pub remarks: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/rules",
    responses(
        (status = 200, description = "list_alert_rules OK")
    ),
    tag = "WMS/inventory-alerts"
)]
pub async fn list_alert_rules(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertQueryParams>,
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

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, rule_name, alert_type, warehouse_id, material_code, 
               threshold_value, severity, enabled, remarks, created_at, updated_at
        FROM wms.inventory_alert_rules
        WHERE ($1::text IS NULL OR rule_name ILIKE $1)
          AND ($2::text IS NULL OR alert_type = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(params.search.as_deref().map(|s| format!("%{}%", s)))
    .bind(params.alert_type.as_deref())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rules) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.inventory_alert_rules
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR rule_name ILIKE $1)
                  AND ($2::text IS NULL OR alert_type = $2)
                "#
            ))
            .bind(params.search.as_deref().map(|s| format!("%{}%", s)))
            .bind(params.alert_type.as_deref())
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            let rules_json: Vec<serde_json::Value> = rules
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.try_get::<Uuid, _>("id").ok(),
                        "rule_name": row.try_get::<String, _>("rule_name").ok(),
                        "alert_type": row.try_get::<String, _>("alert_type").ok(),
                        "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                        "material_code": row.try_get::<Option<String>, _>("material_code").ok(),
                        "threshold_value": row.try_get::<f64, _>("threshold_value").ok(),
                        "severity": row.try_get::<String, _>("severity").ok(),
                        "enabled": row.try_get::<bool, _>("enabled").ok(),
                        "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
                        "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
                        "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "rules": rules_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取预警规则列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取预警规则列表失败: {}", e);
            Json(api_error(500, "获取预警规则列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/rules",
    responses(
        (status = 200, description = "create_alert_rule OK")
    ),
    tag = "WMS/inventory-alerts"
)]
pub async fn create_alert_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateAlertRuleRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.inventory_alert_rules (id, rule_name, alert_type, warehouse_id,
                                               material_code, threshold_value, severity,
                                               enabled, remarks, created_at, updated_at, tenant_id, organization_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, '00000000-0000-0000-0000-000000000001')
        RETURNING *
        "#
    ))
    .bind(id)
    .bind(&req.rule_name)
    .bind(&req.alert_type)
    .bind(req.warehouse_id)
    .bind(&req.material_code)
    .bind(req.threshold_value)
    .bind(&req.severity)
    .bind(req.enabled.unwrap_or(true))
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(claims.tenant_id.as_deref().and_then(|s| Uuid::parse_str(s).ok()).unwrap_or(Uuid::nil()))
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => {
            let rule_json = serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "rule_name": row.try_get::<String, _>("rule_name").ok(),
                "alert_type": row.try_get::<String, _>("alert_type").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "material_code": row.try_get::<Option<String>, _>("material_code").ok(),
                "threshold_value": row.try_get::<f64, _>("threshold_value").ok(),
                "severity": row.try_get::<String, _>("severity").ok(),
                "enabled": row.try_get::<bool, _>("enabled").ok(),
                "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
                "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
                "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
            });
            (
                Json(ApiResponse::success(rule_json.clone(), "预警规则创建成功")),
                "success",
                None,
                Some(rule_json),
            )
        }
        Err(e) => {
            tracing::error!("创建预警规则失败: {}", e);
            (
                Json(api_error(500, "创建预警规则失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "inventory_alert_rule".to_string(),
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
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/rules/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "get_alert_rule OK")
    ),
    tag = "WMS/inventory-alerts"
)]
pub async fn get_alert_rule(
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

    let result =
        sqlx::query(only_own_schema_query!("wms", "SELECT id, tenant_id, warehouse_id, item_id, item_code, alert_type, threshold_min, threshold_max, unit, is_active, created_at, updated_at FROM wms.inventory_alert_rules WHERE deleted_at IS NULL AND id = $1"))
            .bind(id)
            .fetch_optional(&mut **txn)
            .await;

    match result {
        Ok(Some(row)) => {
            let rule_json = serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "rule_name": row.try_get::<String, _>("rule_name").ok(),
                "alert_type": row.try_get::<String, _>("alert_type").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "material_code": row.try_get::<Option<String>, _>("material_code").ok(),
                "threshold_value": row.try_get::<f64, _>("threshold_value").ok(),
                "severity": row.try_get::<String, _>("severity").ok(),
                "enabled": row.try_get::<bool, _>("enabled").ok(),
                "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
                "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
                "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
            });
            Json(ApiResponse::success(rule_json, "获取预警规则成功"))
        }
        Ok(None) => Json(api_error(404, "预警规则不存在")),
        Err(e) => {
            tracing::error!("获取预警规则失败: {}", e);
            Json(api_error(500, "获取预警规则失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/rules/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "update_alert_rule OK")
    ),
    tag = "WMS/inventory-alerts"
)]
pub async fn update_alert_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateAlertRuleRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.inventory_alert_rules SET
            rule_name = COALESCE($2, rule_name),
            alert_type = COALESCE($3, alert_type),
            threshold_value = COALESCE($4, threshold_value),
            severity = COALESCE($5, severity),
            enabled = COALESCE($6, enabled),
            remarks = COALESCE($7, remarks),
            updated_at = $8
        WHERE id = $1
        RETURNING *
        "#
    ))
    .bind(id)
    .bind(&req.rule_name)
    .bind(&req.alert_type)
    .bind(req.threshold_value)
    .bind(&req.severity)
    .bind(req.enabled)
    .bind(&req.remarks)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => {
            let rule_json = serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "rule_name": row.try_get::<String, _>("rule_name").ok(),
                "alert_type": row.try_get::<String, _>("alert_type").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "material_code": row.try_get::<Option<String>, _>("material_code").ok(),
                "threshold_value": row.try_get::<f64, _>("threshold_value").ok(),
                "severity": row.try_get::<String, _>("severity").ok(),
                "enabled": row.try_get::<bool, _>("enabled").ok(),
                "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
                "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
                "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
            });
            (
                Json(ApiResponse::success(rule_json.clone(), "预警规则更新成功")),
                "success",
                None,
                Some(rule_json),
            )
        }
        Err(sqlx::Error::RowNotFound) => (
            Json(api_error(404, "预警规则不存在")),
            "error",
            Some("预警规则不存在".to_string()),
            None,
        ),
        Err(e) => {
            tracing::error!("更新预警规则失败: {}", e);
            (
                Json(api_error(500, "更新预警规则失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "inventory_alert_rule".to_string(),
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
    delete,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/rules/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "delete_alert_rule OK")
    ),
    tag = "WMS/inventory-alerts"
)]
pub async fn delete_alert_rule(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        "UPDATE wms.inventory_alert_rules SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            (
                Json(ApiResponse::success("".to_string(), "预警规则删除成功")),
                "success",
                None,
                Some(serde_json::json!({ "rows_affected": r.rows_affected() })),
            )
        }
        Ok(_) => (
            Json(api_error(404, "预警规则不存在")),
            "error",
            Some("预警规则不存在".to_string()),
            None,
        ),
        Err(e) => {
            tracing::error!("删除预警规则失败: {}", e);
            (
                Json(api_error(500, "删除预警规则失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "inventory_alert_rule".to_string(),
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/records",
    responses(
        (status = 200, description = "list_alert_records OK")
    ),
    tag = "WMS/inventory-alerts"
)]
pub async fn list_alert_records(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AlertQueryParams>,
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

    let result = sqlx::query(
        only_own_schema_query!("wms", r#"
        SELECT id, tenant_id, rule_id, warehouse_id, item_id, item_code, alert_type, alert_level, current_quantity, threshold_quantity, status, created_at FROM wms.inventory_alert_records
        WHERE ($1::text IS NULL OR alert_type = $1)
          AND ($2::text IS NULL OR severity = $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR warehouse_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#),
    )
    .bind(params.alert_type.as_deref())
    .bind(params.severity.as_deref())
    .bind(params.status.as_deref())
    .bind(params.warehouse_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.inventory_alert_records
                WHERE ($1::text IS NULL OR alert_type = $1)
                  AND ($2::text IS NULL OR severity = $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR warehouse_id = $4)
                "#
            ))
            .bind(params.alert_type.as_deref())
            .bind(params.severity.as_deref())
            .bind(params.status.as_deref())
            .bind(params.warehouse_id)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            let records_json: Vec<serde_json::Value> = records
                .iter()
                .map(|row| serde_json::json!({
                    "id": row.try_get::<Uuid, _>("id").ok(),
                    "inventory_id": row.try_get::<Option<Uuid>, _>("inventory_id").ok(),
                    "material_code": row.try_get::<String, _>("material_code").ok(),
                    "material_name": row.try_get::<String, _>("material_name").ok(),
                    "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                    "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
                    "location_id": row.try_get::<Option<Uuid>, _>("location_id").ok(),
                    "location_code": row.try_get::<Option<String>, _>("location_code").ok(),
                    "alert_type": row.try_get::<String, _>("alert_type").ok(),
                    "current_quantity": row.try_get::<f64, _>("current_quantity").ok(),
                    "threshold_value": row.try_get::<Option<f64>, _>("threshold_value").ok(),
                    "deviation_quantity": row.try_get::<Option<f64>, _>("deviation_quantity").ok(),
                    "severity": row.try_get::<String, _>("severity").ok(),
                    "status": row.try_get::<String, _>("status").ok(),
                    "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
                    "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
                    "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
                }))
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "records": records_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取预警记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取预警记录列表失败: {}", e);
            Json(api_error(500, "获取预警记录列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/records/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "get_alert_record OK")
    ),
    tag = "WMS/inventory-alerts"
)]
pub async fn get_alert_record(
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

    let result = sqlx::query(only_own_schema_query!("wms", "SELECT id, tenant_id, rule_id, warehouse_id, item_id, item_code, alert_type, alert_level, current_quantity, threshold_quantity, status, created_at FROM wms.inventory_alert_records WHERE id = $1"))
        .bind(id)
        .fetch_optional(&mut **txn)
        .await;

    match result {
        Ok(Some(row)) => {
            let record_json = serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "inventory_id": row.try_get::<Option<Uuid>, _>("inventory_id").ok(),
                "material_code": row.try_get::<String, _>("material_code").ok(),
                "material_name": row.try_get::<String, _>("material_name").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
                "location_id": row.try_get::<Option<Uuid>, _>("location_id").ok(),
                "location_code": row.try_get::<Option<String>, _>("location_code").ok(),
                "alert_type": row.try_get::<String, _>("alert_type").ok(),
                "current_quantity": row.try_get::<f64, _>("current_quantity").ok(),
                "threshold_value": row.try_get::<Option<f64>, _>("threshold_value").ok(),
                "deviation_quantity": row.try_get::<Option<f64>, _>("deviation_quantity").ok(),
                "severity": row.try_get::<String, _>("severity").ok(),
                "status": row.try_get::<String, _>("status").ok(),
                "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
                "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
                "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
            });
            Json(ApiResponse::success(record_json, "获取预警记录成功"))
        }
        Ok(None) => Json(api_error(404, "预警记录不存在")),
        Err(e) => {
            tracing::error!("获取预警记录失败: {}", e);
            Json(api_error(500, "获取预警记录失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConfirmAlertRecordRequest {
    pub notes: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:alert:read"])),
    path = "/api/wms/inventory-alerts/records/{id}/confirm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "confirm_alert_record OK")
    ),
    tag = "WMS/inventory-alerts"
)]
pub async fn confirm_alert_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ConfirmAlertRecordRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.inventory_alert_records SET
            status = 'confirmed',
            remarks = COALESCE(remarks || ' | ' || $2, $2),
            updated_at = $3
        WHERE id = $1
        RETURNING *
        "#
    ))
    .bind(id)
    .bind(req.notes.unwrap_or_else(|| "已确认".to_string()))
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(row) => {
            let record_json = serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "status": row.try_get::<String, _>("status").ok(),
                "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
            });
            (
                Json(ApiResponse::success(record_json.clone(), "预警记录已确认")),
                "success",
                None,
                Some(record_json),
            )
        }
        Err(sqlx::Error::RowNotFound) => (
            Json(api_error(404, "预警记录不存在")),
            "error",
            Some("预警记录不存在".to_string()),
            None,
        ),
        Err(e) => {
            tracing::error!("确认预警记录失败: {}", e);
            (
                Json(api_error(500, "确认预警记录失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "confirm".to_string(),
        "inventory_alert_record".to_string(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alert_query_params_deserialize() {
        let query = "search=test&alert_type=low_stock&severity=critical&status=open";
        let params: AlertQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.search.as_deref(), Some("test"));
        assert_eq!(params.alert_type.as_deref(), Some("low_stock"));
        assert_eq!(params.severity.as_deref(), Some("critical"));
        assert_eq!(params.status.as_deref(), Some("open"));
    }

    #[test]
    fn test_alert_query_params_default() {
        let query = "";
        let params: AlertQueryParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.search.is_none());
        assert!(params.alert_type.is_none());
        assert!(params.severity.is_none());
        assert!(params.status.is_none());
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_inventory_alert_serialization() {
        let alert = InventoryAlert {
            id: Uuid::nil(),
            inventory_id: Uuid::nil(),
            material_code: "MAT001".to_string(),
            material_name: "测试物料".to_string(),
            warehouse_id: None,
            warehouse_name: None,
            location_id: None,
            location_code: None,
            alert_type: "low_stock".to_string(),
            current_quantity: 5.0,
            threshold_value: Some(10.0),
            deviation_quantity: Some(-5.0),
            severity: "critical".to_string(),
            status: "open".to_string(),
            remarks: Some("库存不足".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_value(&alert).unwrap();
        assert_eq!(json["material_code"], "MAT001");
        assert_eq!(json["alert_type"], "low_stock");
        assert_eq!(json["severity"], "critical");
        assert_eq!(json["status"], "open");
        assert_eq!(json["current_quantity"], 5.0);
    }

    #[test]
    fn test_alert_summary_serialization() {
        let summary = AlertSummary {
            total_alerts: 100,
            critical_count: 20,
            warning_count: 30,
            info_count: 50,
            below_min_count: 40,
            above_max_count: 10,
            reorder_count: 25,
            expiry_count: 5,
            out_of_stock_count: 15,
        };
        let json = serde_json::to_value(&summary).unwrap();
        assert_eq!(json["total_alerts"], 100);
        assert_eq!(json["critical_count"], 20);
        assert_eq!(json["warning_count"], 30);
        assert_eq!(json["info_count"], 50);
        assert_eq!(json["out_of_stock_count"], 15);
    }

    #[test]
    fn test_warehouse_alert_count_serialization() {
        let count = WarehouseAlertCount {
            warehouse_id: Some(Uuid::nil()),
            warehouse_name: Some("主仓库".to_string()),
            alert_count: 25,
        };
        let json = serde_json::to_value(&count).unwrap();
        assert_eq!(json["warehouse_name"], "主仓库");
        assert_eq!(json["alert_count"], 25);
    }

    #[test]
    fn test_material_alert_count_serialization() {
        let count = MaterialAlertCount {
            material_code: "MAT001".to_string(),
            material_name: "测试物料".to_string(),
            alert_count: 10,
        };
        let json = serde_json::to_value(&count).unwrap();
        assert_eq!(json["material_code"], "MAT001");
        assert_eq!(json["material_name"], "测试物料");
        assert_eq!(json["alert_count"], 10);
    }

    #[test]
    fn test_inventory_alert_clone() {
        let alert = InventoryAlert {
            id: Uuid::nil(),
            inventory_id: Uuid::nil(),
            material_code: "MAT001".to_string(),
            material_name: "测试物料".to_string(),
            warehouse_id: None,
            warehouse_name: None,
            location_id: None,
            location_code: None,
            alert_type: "low_stock".to_string(),
            current_quantity: 5.0,
            threshold_value: None,
            deviation_quantity: None,
            severity: "warning".to_string(),
            status: "open".to_string(),
            remarks: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let cloned = alert.clone();
        assert_eq!(alert.material_code, cloned.material_code);
        assert_eq!(alert.alert_type, cloned.alert_type);
        assert_eq!(alert.severity, cloned.severity);
    }

    #[test]
    fn test_alert_summary_clone() {
        let summary = AlertSummary {
            total_alerts: 50,
            critical_count: 10,
            warning_count: 20,
            info_count: 20,
            below_min_count: 15,
            above_max_count: 5,
            reorder_count: 10,
            expiry_count: 0,
            out_of_stock_count: 5,
        };
        let cloned = summary.clone();
        assert_eq!(summary.total_alerts, cloned.total_alerts);
        assert_eq!(summary.critical_count, cloned.critical_count);
    }
}
