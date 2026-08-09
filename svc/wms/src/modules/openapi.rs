// WMS 服务 OpenAPI 文档
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Warehouse {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub address: Option<String>,
    pub area: Option<f64>,
    pub manager: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Inventory {
    pub id: Uuid,
    pub warehouse_id: Uuid,
    pub product_id: Uuid,
    pub product_name: String,
    pub product_code: Option<String>,
    pub quantity: f64,
    pub unit: Option<String>,
    pub location: Option<String>,
    pub batch_no: Option<String>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InboundOrder {
    pub id: Uuid,
    pub order_no: String,
    pub warehouse_id: Uuid,
    pub supplier_id: Option<Uuid>,
    pub order_type: String,
    pub status: String,
    pub total_quantity: Option<f64>,
    pub total_amount: Option<f64>,
    pub expected_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct OutboundOrder {
    pub id: Uuid,
    pub order_no: String,
    pub warehouse_id: Uuid,
    pub customer_id: Option<Uuid>,
    pub order_type: String,
    pub status: String,
    pub total_quantity: Option<f64>,
    pub total_amount: Option<f64>,
    pub expected_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::warehouse::list_warehouses,
        crate::modules::warehouse::create_warehouse,
        crate::modules::warehouse::get_warehouse,
        crate::modules::warehouse::update_warehouse,
        crate::modules::warehouse::delete_warehouse,
        crate::modules::inventory::list_inventory,
        crate::modules::inventory::create_inventory,
        crate::modules::inventory::get_inventory,
        crate::modules::inventory::update_inventory,
        crate::modules::inventory::delete_inventory,
    ),
    components(
        schemas(
            Warehouse,
            Inventory,
            InboundOrder,
            OutboundOrder,
        ),
    ),
    tags(
        (name = "warehouse", description = "仓库管理 API"),
        (name = "inventory", description = "库存管理 API"),
        (name = "inbound_order", description = "入库单 API"),
        (name = "outbound_order", description = "出库单 API"),
        (name = "audit", description = "审计日志 API"),
    ),
    info(
        title = "TOPEMS WMS API",
        version = "1.0.0",
        description = "仓库管理系统 API - 包含仓库管理、库存管理、入库出库等功能"
    )
)]
pub struct WmsApiDoc;
