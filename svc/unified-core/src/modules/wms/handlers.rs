//! WMS API 处理器

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::Row;

use super::models::*;
use super::service::*;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct RealListParams {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub page_size: Option<u32>,
}

/// 获取库存列表（真实数据库查询）
pub async fn list_inventory_real(
    State(state): State<AppState>,
    Query(params): Query<RealListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询库存列表
    let inventory = sqlx::query(
        r#"
        SELECT id, material_code, material_name, quantity, unit, available_quantity, quality_status, created_at
        FROM wms.inventory
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM wms.inventory
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match inventory {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "material_code": r.get::<String, _>("material_code"),
                        "material_name": r.get::<String, _>("material_name"),
                        "quantity": r.get::<rust_decimal::Decimal, _>("quantity").to_string().parse::<f64>().unwrap_or(0.0),
                        "unit": r.get::<String, _>("unit"),
                        "available_quantity": r.get::<rust_decimal::Decimal, _>("available_quantity").to_string().parse::<f64>().unwrap_or(0.0),
                        "quality_status": r.get::<String, _>("quality_status"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query inventory: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取库存列表失败"
            }))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

impl PaginationQuery {
    pub fn page(&self) -> i64 {
        self.page.unwrap_or(1)
    }

    pub fn page_size(&self) -> i64 {
        self.page_size.or(self.page_size).unwrap_or(10)
    }
}

/// 获取入库订单列表
pub async fn list_inbound_orders(
    Query(query): Query<PaginationQuery>,
) -> Json<ApiResponse<PaginatedResponse<InboundOrder>>> {
    let result = InboundOrderService::list(query.page(), query.page_size());
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// 获取入库订单详情
pub async fn get_inbound_order(Path(id): Path<String>) -> Json<ApiResponse<InboundOrder>> {
    match InboundOrderService::get_by_id(&id) {
        Some(order) => Json(ApiResponse {
            success: true,
            data: Some(order),
            message: None,
        }),
        None => Json(ApiResponse {
            success: false,
            data: None,
            message: Some("入库订单不存在".to_string()),
        }),
    }
}

/// 获取出库订单列表
pub async fn list_outbound_orders(
    Query(query): Query<PaginationQuery>,
) -> Json<ApiResponse<PaginatedResponse<OutboundOrder>>> {
    let result = OutboundOrderService::list(query.page(), query.page_size());
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// 获取库存列表
pub async fn list_inventory(
    Query(query): Query<PaginationQuery>,
) -> Json<ApiResponse<PaginatedResponse<InventoryItem>>> {
    let result = InventoryService::list(query.page(), query.page_size());
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// 获取调拨单列表
pub async fn list_transfers(
    Query(query): Query<PaginationQuery>,
) -> Json<ApiResponse<PaginatedResponse<TransferOrder>>> {
    let result = TransferService::list(query.page(), query.page_size());
    Json(ApiResponse {
        success: true,
        data: Some(result),
        message: None,
    })
}

/// WMS 仪表盘统计
pub async fn dashboard_stats() -> Json<ApiResponse<serde_json::Value>> {
    let inbound_count = inbound_orders().lock().unwrap().len();
    let outbound_count = outbound_orders().lock().unwrap().len();
    let inventory_count = inventory_items().lock().unwrap().len();
    let transfer_count = transfer_orders().lock().unwrap().len();

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "inbound_orders": inbound_count,
            "outbound_orders": outbound_count,
            "inventory_items": inventory_count,
            "transfer_orders": transfer_count,
        })),
        message: None,
    })
}

// 导入静态访问器
use super::service::{inbound_orders, inventory_items, outbound_orders, transfer_orders};

/// WMS Analytics - 仪表盘汇总
pub async fn analytics_dashboard_summary() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "total_inbound_orders": inbound_orders().lock().unwrap().len(),
        "total_outbound_orders": outbound_orders().lock().unwrap().len(),
        "total_inventory_items": inventory_items().lock().unwrap().len(),
        "total_transfers": transfer_orders().lock().unwrap().len(),
    }))
}

/// WMS Analytics - 库存类型分布
pub async fn analytics_inventory_types() -> Json<serde_json::Value> {
    Json(serde_json::json!([
        {"name": "原材料", "value": 35},
        {"name": "半成品", "value": 25},
        {"name": "成品", "value": 30},
        {"name": "辅料", "value": 10},
    ]))
}

/// WMS Analytics - 库存分布
pub async fn analytics_inventory_distribution() -> Json<serde_json::Value> {
    Json(serde_json::json!([
        {"warehouse": "华东仓", "quantity": 1200},
        {"warehouse": "华南仓", "quantity": 980},
        {"warehouse": "华北仓", "quantity": 760},
        {"warehouse": "西南仓", "quantity": 540},
    ]))
}

/// WMS Analytics - 每日趋势
pub async fn analytics_daily_trend() -> Json<serde_json::Value> {
    Json(serde_json::json!([
        {"date": "2026-09-10", "inbound": 45, "outbound": 38},
        {"date": "2026-09-11", "inbound": 52, "outbound": 41},
        {"date": "2026-09-12", "inbound": 48, "outbound": 45},
        {"date": "2026-09-13", "inbound": 61, "outbound": 52},
        {"date": "2026-09-14", "inbound": 55, "outbound": 48},
        {"date": "2026-09-15", "inbound": 63, "outbound": 56},
        {"date": "2026-09-16", "inbound": 58, "outbound": 51},
    ]))
}

/// 获取入库订单列表（真实数据库查询）
pub async fn list_inbound_orders_real(
    State(state): State<AppState>,
    Query(params): Query<RealListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询入库订单列表
    let orders = sqlx::query(
        r#"
        SELECT id, order_number, order_type, warehouse_name, supplier_name, expected_arrival_date, status, created_at
        FROM wms.inbound_orders
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM wms.inbound_orders
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match orders {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "order_number": r.get::<String, _>("order_number"),
                        "order_type": r.get::<String, _>("order_type"),
                        "warehouse_name": r.get::<Option<String>, _>("warehouse_name"),
                        "supplier_name": r.get::<Option<String>, _>("supplier_name"),
                        "expected_date": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("expected_arrival_date"),
                        "status": r.get::<String, _>("status"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query inbound orders: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取入库订单列表失败"
            }))
        }
    }
}

/// 获取出库订单列表（真实数据库查询）
pub async fn list_outbound_orders_real(
    State(state): State<AppState>,
    Query(params): Query<RealListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询出库订单列表
    let orders = sqlx::query(
        r#"
        SELECT id, order_number, order_type, warehouse_name, customer_name, expected_ship_date, status, created_at
        FROM wms.outbound_orders
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM wms.outbound_orders
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match orders {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "order_number": r.get::<String, _>("order_number"),
                        "order_type": r.get::<String, _>("order_type"),
                        "warehouse_name": r.get::<Option<String>, _>("warehouse_name"),
                        "customer_name": r.get::<Option<String>, _>("customer_name"),
                        "expected_date": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("expected_ship_date"),
                        "status": r.get::<String, _>("status"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query outbound orders: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取出库订单列表失败"
            }))
        }
    }
}

/// 获取仓库列表（真实数据库查询）
pub async fn list_warehouses_real(
    State(state): State<AppState>,
    Query(params): Query<RealListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询仓库列表
    let warehouses = sqlx::query(
        r#"
        SELECT id, warehouse_code, warehouse_name, address, manager, contact_phone, status, warehouse_type, city, province, created_at
        FROM wms.warehouses
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM wms.warehouses
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match warehouses {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "warehouse_code": r.get::<Option<String>, _>("warehouse_code"),
                        "warehouse_name": r.get::<Option<String>, _>("warehouse_name"),
                        "address": r.get::<Option<String>, _>("address"),
                        "manager": r.get::<Option<String>, _>("manager"),
                        "contact_phone": r.get::<Option<String>, _>("contact_phone"),
                        "status": r.get::<Option<String>, _>("status"),
                        "warehouse_type": r.get::<Option<String>, _>("warehouse_type"),
                        "city": r.get::<Option<String>, _>("city"),
                        "province": r.get::<Option<String>, _>("province"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query warehouses: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取仓库列表失败"
            }))
        }
    }
}
