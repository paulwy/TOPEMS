//! WMS 业务逻辑层
//!
//! 使用内存数据存储作为初始实现，后续可替换为数据库

use std::sync::{Mutex, OnceLock};

use super::models::*;

// 内存数据库 - 使用 OnceLock 延迟初始化

fn init_inbound_orders() -> Mutex<Vec<InboundOrder>> {
    Mutex::new(vec![
        InboundOrder {
            id: "1".to_string(),
            order_no: "IN202409001".to_string(),
            supplier: "供应商A".to_string(),
            warehouse: "主仓库".to_string(),
            status: "已完成".to_string(),
            total_amount: 15000.0,
            created_at: "2024-09-01T10:00:00Z".to_string(),
            updated_at: "2024-09-01T15:00:00Z".to_string(),
        },
        InboundOrder {
            id: "2".to_string(),
            order_no: "IN202409002".to_string(),
            supplier: "供应商B".to_string(),
            warehouse: "主仓库".to_string(),
            status: "待验收".to_string(),
            total_amount: 8500.0,
            created_at: "2024-09-05T09:30:00Z".to_string(),
            updated_at: "2024-09-05T09:30:00Z".to_string(),
        },
        InboundOrder {
            id: "3".to_string(),
            order_no: "IN202409003".to_string(),
            supplier: "供应商C".to_string(),
            warehouse: "分仓1".to_string(),
            status: "进行中".to_string(),
            total_amount: 22000.0,
            created_at: "2024-09-10T14:20:00Z".to_string(),
            updated_at: "2024-09-10T16:45:00Z".to_string(),
        },
    ])
}

fn init_outbound_orders() -> Mutex<Vec<OutboundOrder>> {
    Mutex::new(vec![
        OutboundOrder {
            id: "1".to_string(),
            order_no: "OUT202409001".to_string(),
            customer: "客户A".to_string(),
            warehouse: "主仓库".to_string(),
            status: "已发货".to_string(),
            total_amount: 12000.0,
            created_at: "2024-09-02T11:00:00Z".to_string(),
            updated_at: "2024-09-02T14:30:00Z".to_string(),
        },
        OutboundOrder {
            id: "2".to_string(),
            order_no: "OUT202409002".to_string(),
            customer: "客户B".to_string(),
            warehouse: "主仓库".to_string(),
            status: "待发货".to_string(),
            total_amount: 6800.0,
            created_at: "2024-09-08T10:15:00Z".to_string(),
            updated_at: "2024-09-08T10:15:00Z".to_string(),
        },
    ])
}

fn init_inventory_items() -> Mutex<Vec<InventoryItem>> {
    Mutex::new(vec![
        InventoryItem {
            id: "1".to_string(),
            sku: "SKU001".to_string(),
            product_name: "产品A".to_string(),
            warehouse: "主仓库".to_string(),
            location: "A-01-01".to_string(),
            quantity: 500,
            unit: "件".to_string(),
            updated_at: "2024-09-10T08:00:00Z".to_string(),
        },
        InventoryItem {
            id: "2".to_string(),
            sku: "SKU002".to_string(),
            product_name: "产品B".to_string(),
            warehouse: "主仓库".to_string(),
            location: "A-01-02".to_string(),
            quantity: 320,
            unit: "件".to_string(),
            updated_at: "2024-09-10T08:00:00Z".to_string(),
        },
        InventoryItem {
            id: "3".to_string(),
            sku: "SKU003".to_string(),
            product_name: "产品C".to_string(),
            warehouse: "分仓1".to_string(),
            location: "B-02-01".to_string(),
            quantity: 150,
            unit: "箱".to_string(),
            updated_at: "2024-09-09T16:30:00Z".to_string(),
        },
    ])
}

fn init_transfer_orders() -> Mutex<Vec<TransferOrder>> {
    Mutex::new(vec![
        TransferOrder {
            id: "1".to_string(),
            transfer_no: "TR202409001".to_string(),
            from_warehouse: "主仓库".to_string(),
            to_warehouse: "分仓1".to_string(),
            status: "运输中".to_string(),
            total_quantity: 200,
            created_at: "2024-09-07T09:00:00Z".to_string(),
        },
    ])
}

// 静态访问器
pub fn inbound_orders() -> &'static Mutex<Vec<InboundOrder>> {
    static INSTANCE: OnceLock<Mutex<Vec<InboundOrder>>> = OnceLock::new();
    INSTANCE.get_or_init(init_inbound_orders)
}

pub fn outbound_orders() -> &'static Mutex<Vec<OutboundOrder>> {
    static INSTANCE: OnceLock<Mutex<Vec<OutboundOrder>>> = OnceLock::new();
    INSTANCE.get_or_init(init_outbound_orders)
}

pub fn inventory_items() -> &'static Mutex<Vec<InventoryItem>> {
    static INSTANCE: OnceLock<Mutex<Vec<InventoryItem>>> = OnceLock::new();
    INSTANCE.get_or_init(init_inventory_items)
}

pub fn transfer_orders() -> &'static Mutex<Vec<TransferOrder>> {
    static INSTANCE: OnceLock<Mutex<Vec<TransferOrder>>> = OnceLock::new();
    INSTANCE.get_or_init(init_transfer_orders)
}

/// 入库订单服务
pub struct InboundOrderService;

impl InboundOrderService {
    pub fn list(page: i64, page_size: i64) -> PaginatedResponse<InboundOrder> {
        let orders = inbound_orders().lock().unwrap();
        let total = orders.len() as i64;
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, orders.len());
        let items = if start < orders.len() {
            orders[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
        }
    }

    pub fn get_by_id(id: &str) -> Option<InboundOrder> {
        let orders = inbound_orders().lock().unwrap();
        orders.iter().find(|o| o.id == id).cloned()
    }
}

/// 出库订单服务
pub struct OutboundOrderService;

impl OutboundOrderService {
    pub fn list(page: i64, page_size: i64) -> PaginatedResponse<OutboundOrder> {
        let orders = outbound_orders().lock().unwrap();
        let total = orders.len() as i64;
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, orders.len());
        let items = if start < orders.len() {
            orders[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
        }
    }
}

/// 库存服务
pub struct InventoryService;

impl InventoryService {
    pub fn list(page: i64, page_size: i64) -> PaginatedResponse<InventoryItem> {
        let items = inventory_items().lock().unwrap();
        let total = items.len() as i64;
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, items.len());
        let result = if start < items.len() {
            items[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items: result,
            total,
            page,
            page_size,
        }
    }
}

/// 调拨服务
pub struct TransferService;

impl TransferService {
    pub fn list(page: i64, page_size: i64) -> PaginatedResponse<TransferOrder> {
        let orders = transfer_orders().lock().unwrap();
        let total = orders.len() as i64;
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, orders.len());
        let items = if start < orders.len() {
            orders[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
        }
    }
}
