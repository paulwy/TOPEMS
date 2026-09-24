//! WMS API 处理器

use axum::{
    extract::{Path, Query},
    Json,
};
use serde::Deserialize;

use super::models::*;
use super::service::*;

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
