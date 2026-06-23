//! Production Order handlers

use axum::{extract::Path, extract::State, Json};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

// ==================== Data Types ====================

/// 生产工单来源
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProductionOrderSource {
    /// 手动创建
    Manual,
    /// 从 ERP 销售订单创建
    ErpSalesOrder,
    /// 从 MRP 计划创建
    Mrp,
}

/// ERP 销售订单信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpSalesOrderInfo {
    pub order_id: Uuid,
    pub order_number: String,
    pub customer_name: String,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub unit: String,
    pub delivery_date: Option<chrono::DateTime<Utc>>,
    pub priority: Option<i32>,
}

/// 从 ERP 创建生产工单的请求
#[derive(Debug, Clone, Deserialize)]
pub struct CreateFromErpRequest {
    pub erp_order: ErpSalesOrderInfo,
    pub planned_start_date: Option<chrono::DateTime<Utc>>,
    pub planned_completion_date: Option<chrono::DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
}

/// 生产工单响应
#[derive(Debug, Clone, Serialize)]
pub struct ProductionOrderResponse {
    pub id: Uuid,
    pub order_number: String,
    pub source: ProductionOrderSource,
    pub source_order_id: Option<Uuid>,
    pub source_order_number: Option<String>,
    pub status: String,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub completed_quantity: f64,
    pub planned_start_date: Option<chrono::DateTime<Utc>>,
    pub planned_completion_date: Option<chrono::DateTime<Utc>>,
    pub actual_start_date: Option<chrono::DateTime<Utc>>,
    pub actual_completion_date: Option<chrono::DateTime<Utc>>,
    pub created_at: chrono::DateTime<Utc>,
}

// ==================== Production Order Handlers ====================

/// List production orders
pub async fn list_production_orders(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list_production_orders called");
    Json(ApiResponse::success(
        serde_json::json!({
            "orders": [],
            "total": 0
        }),
        "获取生产工单列表成功",
    ))
}

/// Create a new production order
pub async fn create_production_order(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create_production_order called with: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "生产工单创建成功",
    ))
}

/// Create production order from ERP sales order
/// 这是 ERP → MES 数据转换的核心接口
pub async fn create_from_erp(
    State(_state): State<AppState>,
    Json(req): Json<CreateFromErpRequest>,
) -> Json<ApiResponse<ProductionOrderResponse>> {
    tracing::info!(
        "create_from_erp called for ERP order: {}",
        req.erp_order.order_number
    );

    let order_id = Uuid::new_v4();
    let now = Utc::now();

    // 生成生产工单号: MO + 年月日 + 4位序号
    let order_number = format!("MO{}{:04}", now.format("%Y%m%d"), rand::random::<u16>() % 10000);

    // 计算计划开始和完成日期
    let planned_start = req.planned_start_date.unwrap_or(now);
    let planned_completion = req.planned_completion_date
        .or_else(|| req.erp_order.delivery_date)
        .unwrap_or_else(|| now + chrono::Duration::days(7));

    let response = ProductionOrderResponse {
        id: order_id,
        order_number: order_number.clone(),
        source: ProductionOrderSource::ErpSalesOrder,
        source_order_id: Some(req.erp_order.order_id),
        source_order_number: Some(req.erp_order.order_number.clone()),
        status: "created".to_string(),
        product_name: req.erp_order.product_name.clone(),
        product_code: req.erp_order.product_code.clone(),
        quantity: req.erp_order.quantity,
        completed_quantity: 0.0,
        planned_start_date: Some(planned_start),
        planned_completion_date: Some(planned_completion),
        actual_start_date: None,
        actual_completion_date: None,
        created_at: now,
    };

    tracing::info!(
        "[MES] Created production order {} from ERP order {}",
        order_number,
        req.erp_order.order_number
    );

    Json(ApiResponse::success(response, "从ERP订单创建生产工单成功"))
}

/// Get production order by ID
pub async fn get_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_production_order called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取生产工单成功",
    ))
}

/// Update production order
pub async fn update_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update_production_order called: {}, req: {:?}", id, req);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "生产工单更新成功",
    ))
}

/// Delete production order
pub async fn delete_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    tracing::info!("delete_production_order called: {}", id);
    Json(ApiResponse::success("".to_string(), "生产工单删除成功"))
}

/// Start production order
pub async fn start_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("start_production_order called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "生产工单启动成功",
    ))
}

/// Complete production order
pub async fn complete_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("complete_production_order called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "生产工单完成成功",
    ))
}

/// Cancel production order
pub async fn cancel_production_order(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("cancel_production_order called: {}", id);
    Json(ApiResponse::success(
        serde_json::json!({}),
        "生产工单取消成功",
    ))
}
