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
        crate::modules::inventory::list_low_stock_inventory,
        crate::modules::inventory::list_inventory_by_warehouse,
        crate::modules::inventory::get_inventory_statistics,
        crate::modules::inventory::get_abc_analysis,
        crate::modules::inventory::get_turnover,
        crate::modules::inventory::get_value_by_warehouse,
        crate::modules::inventory_alert::list_alerts,
        crate::modules::inventory_alert::get_alert,
        crate::modules::inventory_alert::acknowledge_alert,
        crate::modules::inventory_alert::get_alert_statistics,
        crate::modules::inventory_alert::list_alert_rules,
        crate::modules::inventory_alert::create_alert_rule,
        crate::modules::inventory_alert::get_alert_rule,
        crate::modules::inventory_alert::update_alert_rule,
        crate::modules::inventory_alert::delete_alert_rule,
        crate::modules::inventory_alert::list_alert_records,
        crate::modules::inventory_alert::get_alert_record,
        crate::modules::inventory_alert::confirm_alert_record,
        crate::modules::audit::list_audit_logs,
        crate::modules::audit::get_audit_log,
        crate::modules::batch::list_batches,
        crate::modules::batch::create_batch,
        crate::modules::batch::get_batch,
        crate::modules::batch::update_batch,
        crate::modules::batch::delete_batch,
        crate::modules::batch::get_batch_statistics,
        crate::modules::inbound_order::list_inbound_orders,
        crate::modules::inbound_order::create_inbound_order,
        crate::modules::inbound_order::get_inbound_order,
        crate::modules::inbound_order::update_inbound_order,
        crate::modules::inbound_order::delete_inbound_order,
        crate::modules::inbound_order::list_inbound_order_items,
        crate::modules::inbound_order::create_inbound_order_item,
        crate::modules::inbound_order::update_inbound_order_item,
        crate::modules::inbound_order::delete_inbound_order_item,
        crate::modules::inbound_order::confirm_inbound_order,
        crate::modules::inbound_order::receive_inbound_order,
        crate::modules::inbound_order::complete_inbound_order,
        crate::modules::location::list_locations,
        crate::modules::location::create_location,
        crate::modules::location::get_location,
        crate::modules::location::update_location,
        crate::modules::location::delete_location,
        crate::modules::location::get_location_status,
        crate::modules::location::batch_create_locations,
        crate::modules::location::batch_update_locations,
        crate::modules::location::batch_delete_locations,
        crate::modules::outbound_order::list_outbound_orders,
        crate::modules::outbound_order::create_outbound_order,
        crate::modules::outbound_order::get_outbound_order,
        crate::modules::outbound_order::update_outbound_order,
        crate::modules::outbound_order::delete_outbound_order,
        crate::modules::outbound_order::list_outbound_order_items,
        crate::modules::outbound_order::create_outbound_order_item,
        crate::modules::outbound_order::update_outbound_order_item,
        crate::modules::outbound_order::delete_outbound_order_item,
        crate::modules::outbound_order::confirm_outbound_order,
        crate::modules::outbound_order::pick_outbound_order,
        crate::modules::outbound_order::pack_outbound_order,
        crate::modules::outbound_order::ship_outbound_order,
        crate::modules::outbound_order::complete_outbound_order,
        crate::modules::serial_number::list_serial_numbers,
        crate::modules::serial_number::create_serial_number,
        crate::modules::serial_number::bulk_create_serial_numbers,
        crate::modules::serial_number::get_serial_number,
        crate::modules::serial_number::update_serial_number,
        crate::modules::serial_number::delete_serial_number,
        crate::modules::serial_number::get_serial_number_statistics,
        crate::modules::stock_take::list_stock_takes,
        crate::modules::stock_take::create_stock_take,
        crate::modules::stock_take::get_stock_take,
        crate::modules::stock_take::update_stock_take,
        crate::modules::stock_take::delete_stock_take,
        crate::modules::stock_take::list_stock_take_items,
        crate::modules::stock_take::create_stock_take_item,
        crate::modules::stock_take::get_stock_take_item,
        crate::modules::stock_take::update_stock_take_item,
        crate::modules::stock_take::delete_stock_take_item,
        crate::modules::stock_take::start_stock_take,
        crate::modules::stock_take::count_stock_take,
        crate::modules::stock_take::complete_stock_take,
        crate::modules::stock_take::adjust_stock_take,
        crate::modules::transfer_order::list_transfers,
        crate::modules::transfer_order::create_transfer,
        crate::modules::transfer_order::get_transfer,
        crate::modules::transfer_order::update_transfer,
        crate::modules::transfer_order::delete_transfer,
        crate::modules::transfer_order::list_transfer_items,
        crate::modules::transfer_order::confirm_transfer,
        crate::modules::transfer_order::ship_transfer,
        crate::modules::transfer_order::receive_transfer,
        crate::modules::transfer_order::complete_transfer,
        crate::modules::wave_pick::list_wave_picks,
        crate::modules::wave_pick::create_wave_pick,
        crate::modules::wave_pick::get_wave_pick,
        crate::modules::wave_pick::update_wave_pick,
        crate::modules::wave_pick::delete_wave_pick,
        crate::modules::wave_pick::list_wave_pick_items,
        crate::modules::wave_pick::assign_wave_pick,
        crate::modules::wave_pick::start_wave_pick,
        crate::modules::wave_pick::complete_wave_pick,
        crate::modules::wave_pick::cancel_wave_pick,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_warehouse_serialization() {
        let warehouse = Warehouse {
            id: Uuid::nil(),
            name: "主仓库".to_string(),
            code: "WH001".to_string(),
            address: Some("北京市朝阳区".to_string()),
            area: Some(1000.5),
            manager: Some("张三".to_string()),
            status: "active".to_string(),
            created_at: Utc::now(),
        };
        let json = serde_json::to_value(&warehouse).unwrap();
        assert_eq!(json["name"], "主仓库");
        assert_eq!(json["code"], "WH001");
        assert_eq!(json["address"], "北京市朝阳区");
        assert_eq!(json["area"], 1000.5);
        assert_eq!(json["manager"], "张三");
        assert_eq!(json["status"], "active");
    }

    #[test]
    fn test_warehouse_minimal() {
        let warehouse = Warehouse {
            id: Uuid::nil(),
            name: "简单仓库".to_string(),
            code: "WH002".to_string(),
            address: None,
            area: None,
            manager: None,
            status: "inactive".to_string(),
            created_at: Utc::now(),
        };
        let json = serde_json::to_value(&warehouse).unwrap();
        assert_eq!(json["name"], "简单仓库");
        assert_eq!(json["code"], "WH002");
        assert!(json["address"].is_null());
        assert!(json["area"].is_null());
        assert!(json["manager"].is_null());
        assert_eq!(json["status"], "inactive");
    }

    #[test]
    fn test_warehouse_clone() {
        let warehouse = Warehouse {
            id: Uuid::nil(),
            name: "克隆仓库".to_string(),
            code: "WH003".to_string(),
            address: None,
            area: None,
            manager: None,
            status: "active".to_string(),
            created_at: Utc::now(),
        };
        let cloned = warehouse.clone();
        assert_eq!(warehouse.name, cloned.name);
        assert_eq!(warehouse.code, cloned.code);
        assert_eq!(warehouse.status, cloned.status);
    }

    #[test]
    fn test_inventory_serialization() {
        let inventory = Inventory {
            id: Uuid::nil(),
            warehouse_id: Uuid::nil(),
            product_id: Uuid::nil(),
            product_name: "测试产品".to_string(),
            product_code: Some("P001".to_string()),
            quantity: 100.0,
            unit: Some("PCS".to_string()),
            location: Some("A-01-01".to_string()),
            batch_no: Some("BATCH001".to_string()),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_value(&inventory).unwrap();
        assert_eq!(json["product_name"], "测试产品");
        assert_eq!(json["product_code"], "P001");
        assert_eq!(json["quantity"], 100.0);
        assert_eq!(json["unit"], "PCS");
        assert_eq!(json["location"], "A-01-01");
        assert_eq!(json["batch_no"], "BATCH001");
    }

    #[test]
    fn test_inventory_minimal() {
        let inventory = Inventory {
            id: Uuid::nil(),
            warehouse_id: Uuid::nil(),
            product_id: Uuid::nil(),
            product_name: "简单产品".to_string(),
            product_code: None,
            quantity: 50.0,
            unit: None,
            location: None,
            batch_no: None,
            updated_at: Utc::now(),
        };
        let json = serde_json::to_value(&inventory).unwrap();
        assert_eq!(json["product_name"], "简单产品");
        assert_eq!(json["quantity"], 50.0);
        assert!(json["product_code"].is_null());
        assert!(json["unit"].is_null());
    }

    #[test]
    fn test_inbound_order_serialization() {
        let order = InboundOrder {
            id: Uuid::nil(),
            order_no: "IN001".to_string(),
            warehouse_id: Uuid::nil(),
            supplier_id: Some(Uuid::nil()),
            order_type: "purchase".to_string(),
            status: "pending".to_string(),
            total_quantity: Some(100.0),
            total_amount: Some(5000.0),
            expected_date: None,
            actual_date: None,
            created_at: Utc::now(),
        };
        let json = serde_json::to_value(&order).unwrap();
        assert_eq!(json["order_no"], "IN001");
        assert_eq!(json["order_type"], "purchase");
        assert_eq!(json["status"], "pending");
        assert_eq!(json["total_quantity"], 100.0);
        assert_eq!(json["total_amount"], 5000.0);
    }

    #[test]
    fn test_inbound_order_minimal() {
        let order = InboundOrder {
            id: Uuid::nil(),
            order_no: "IN002".to_string(),
            warehouse_id: Uuid::nil(),
            supplier_id: None,
            order_type: "return".to_string(),
            status: "completed".to_string(),
            total_quantity: None,
            total_amount: None,
            expected_date: None,
            actual_date: None,
            created_at: Utc::now(),
        };
        let json = serde_json::to_value(&order).unwrap();
        assert_eq!(json["order_no"], "IN002");
        assert_eq!(json["order_type"], "return");
        assert_eq!(json["status"], "completed");
        assert!(json["supplier_id"].is_null());
        assert!(json["total_quantity"].is_null());
    }

    #[test]
    fn test_outbound_order_serialization() {
        let order = OutboundOrder {
            id: Uuid::nil(),
            order_no: "OUT001".to_string(),
            warehouse_id: Uuid::nil(),
            customer_id: Some(Uuid::nil()),
            order_type: "sales".to_string(),
            status: "shipped".to_string(),
            total_quantity: Some(50.0),
            total_amount: Some(2500.0),
            expected_date: None,
            actual_date: None,
            created_at: Utc::now(),
        };
        let json = serde_json::to_value(&order).unwrap();
        assert_eq!(json["order_no"], "OUT001");
        assert_eq!(json["order_type"], "sales");
        assert_eq!(json["status"], "shipped");
        assert_eq!(json["total_quantity"], 50.0);
        assert_eq!(json["total_amount"], 2500.0);
    }

    #[test]
    fn test_outbound_order_minimal() {
        let order = OutboundOrder {
            id: Uuid::nil(),
            order_no: "OUT002".to_string(),
            warehouse_id: Uuid::nil(),
            customer_id: None,
            order_type: "transfer".to_string(),
            status: "pending".to_string(),
            total_quantity: None,
            total_amount: None,
            expected_date: None,
            actual_date: None,
            created_at: Utc::now(),
        };
        let json = serde_json::to_value(&order).unwrap();
        assert_eq!(json["order_no"], "OUT002");
        assert_eq!(json["order_type"], "transfer");
        assert_eq!(json["status"], "pending");
        assert!(json["customer_id"].is_null());
    }
}
