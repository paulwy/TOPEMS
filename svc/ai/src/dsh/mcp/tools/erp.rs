//! ERP MCP Tools — 企业资源计划业务工具。
//!
//! 注册 4 个 ERP 业务工具到 MCP Server：
//! - erp.list_orders — 查询订单列表
//! - erp.get_order — 获取订单详情
//! - erp.create_order — 创建订单
//! - erp.update_inventory — 更新库存
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 ERP API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 注册 ERP 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - erp.list_orders — 查询订单列表（支持分页、状态筛选）
/// - erp.get_order — 获取订单详情（按 ID）
/// - erp.create_order — 创建订单（客户、商品、数量）
/// - erp.update_inventory — 更新库存（商品ID、数量、操作类型）
pub async fn register_erp_tools(server: &McpServer) {
    let registry = server.tool_registry();

    // 1. erp.list_orders
    registry
        .register(
            "erp.list_orders",
            "查询ERP订单列表，支持分页和状态筛选。返回订单的基本信息列表，包括订单号、客户、金额、状态、创建时间等。",
            SchemaBuilder::object()
                .property(
                    "page",
                    SchemaBuilder::integer()
                        .description("页码，从1开始")
                        .minimum(1.0)
                        .default(json!(1)),
                )
                .property(
                    "page_size",
                    SchemaBuilder::integer()
                        .description("每页数量")
                        .minimum(1.0)
                        .maximum(100.0)
                        .default(json!(20)),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("订单状态筛选")
                        .enum_values(&["pending", "confirmed", "shipped", "completed", "cancelled"]),
                )
                .property(
                    "customer_id",
                    SchemaBuilder::string().description("客户ID筛选"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let status = params["status"].as_str().unwrap_or("");
                let customer_id = params["customer_id"].as_str().unwrap_or("");

                let orders = generate_mock_orders(status, customer_id);
                let total = orders.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_orders = &orders[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "orders": page_orders,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. erp.get_order
    registry
        .register(
            "erp.get_order",
            "获取ERP订单详情，按订单ID查询。返回订单的完整信息，包括订单号、客户、商品明细、金额、状态、物流信息等。",
            SchemaBuilder::object()
                .property(
                    "order_id",
                    SchemaBuilder::string().description("订单ID"),
                )
                .required(&["order_id"])
                .build(),
            |params| {
                let order_id = params["order_id"].as_str().unwrap_or("");

                if order_id.is_empty() {
                    return Err(ToolExecutionError::Validation("order_id is required".to_string()));
                }

                let order = generate_mock_order_detail(order_id);

                Ok(McpToolResult {
                    content: vec![McpContent::text(order.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. erp.create_order
    registry
        .register(
            "erp.create_order",
            "创建ERP订单。需要提供客户ID和商品明细列表，返回新创建的订单ID和订单号。",
            SchemaBuilder::object()
                .property(
                    "customer_id",
                    SchemaBuilder::string().description("客户ID"),
                )
                .property(
                    "items",
                    SchemaBuilder::array()
                        .description("商品明细列表")
                        .items(SchemaBuilder::object()
                            .property("product_id", SchemaBuilder::string().description("商品ID"))
                            .property("product_name", SchemaBuilder::string().description("商品名称"))
                            .property("quantity", SchemaBuilder::integer().description("数量").minimum(1.0))
                            .property("unit_price", SchemaBuilder::number().description("单价").minimum(0.0))
                            .required(&["product_id", "quantity"])),
                )
                .property(
                    "remark",
                    SchemaBuilder::string().description("订单备注"),
                )
                .required(&["customer_id", "items"])
                .build(),
            |params| {
                let customer_id = params["customer_id"].as_str().unwrap_or("");
                let items = params["items"].as_array();

                if customer_id.is_empty() {
                    return Err(ToolExecutionError::Validation("customer_id is required".to_string()));
                }
                if items.is_none() || items.unwrap().is_empty() {
                    return Err(ToolExecutionError::Validation("items must contain at least one item".to_string()));
                }

                let order_id = format!("ORD-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("00000000"));
                let order_number = format!("SO{}{:06}", chrono::Utc::now().format("%Y%m%d"), 1001);

                let result = json!({
                    "order_id": order_id,
                    "order_number": order_number,
                    "customer_id": customer_id,
                    "status": "pending",
                    "created_at": chrono::Utc::now().to_rfc3339(),
                    "message": "订单创建成功，等待确认",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. erp.update_inventory
    registry
        .register(
            "erp.update_inventory",
            "更新ERP库存。支持入库、出库、盘点三种操作类型，返回更新后的库存数量。",
            SchemaBuilder::object()
                .property(
                    "product_id",
                    SchemaBuilder::string().description("商品ID"),
                )
                .property(
                    "quantity",
                    SchemaBuilder::integer().description("操作数量（正数）").minimum(1.0),
                )
                .property(
                    "operation",
                    SchemaBuilder::string()
                        .description("操作类型")
                        .enum_values(&["inbound", "outbound", "adjust"]),
                )
                .property(
                    "warehouse_id",
                    SchemaBuilder::string().description("仓库ID"),
                )
                .property(
                    "remark",
                    SchemaBuilder::string().description("操作备注"),
                )
                .required(&["product_id", "quantity", "operation"])
                .build(),
            |params| {
                let product_id = params["product_id"].as_str().unwrap_or("");
                let quantity = params["quantity"].as_i64().unwrap_or(0);
                let operation = params["operation"].as_str().unwrap_or("");
                let warehouse_id = params["warehouse_id"].as_str().unwrap_or("WH-DEFAULT");

                if product_id.is_empty() {
                    return Err(ToolExecutionError::Validation("product_id is required".to_string()));
                }
                if quantity <= 0 {
                    return Err(ToolExecutionError::Validation("quantity must be positive".to_string()));
                }

                let current_stock = 1000i64; // Mock 当前库存
                let new_stock = match operation {
                    "inbound" => current_stock + quantity,
                    "outbound" => {
                        if quantity > current_stock {
                            return Err(ToolExecutionError::Validation(format!(
                                "库存不足：当前库存{}，请求出库{}",
                                current_stock, quantity
                            )));
                        }
                        current_stock - quantity
                    }
                    "adjust" => quantity, // 盘点调整为指定数量
                    _ => return Err(ToolExecutionError::Validation(format!("Unknown operation: {}", operation))),
                };

                let result = json!({
                    "product_id": product_id,
                    "warehouse_id": warehouse_id,
                    "operation": operation,
                    "quantity": quantity,
                    "previous_stock": current_stock,
                    "current_stock": new_stock,
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                    "message": format!("库存更新成功：{} → {}", current_stock, new_stock),
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("ERP MCP Tools registered: 4 tools (erp.list_orders, erp.get_order, erp.create_order, erp.update_inventory)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 订单列表
fn generate_mock_orders(status_filter: &str, customer_filter: &str) -> Vec<Value> {
    let statuses = ["pending", "confirmed", "shipped", "completed", "cancelled"];
    let customers = ["CUST-001", "CUST-002", "CUST-003", "CUST-004", "CUST-005"];

    (0..50)
        .map(|i| {
            let status = statuses[i % statuses.len()];
            let customer = customers[i % customers.len()];
            json!({
                "order_id": format!("ORD-{:08}", i + 1),
                "order_number": format!("SO2026{:06}", i + 1),
                "customer_id": customer,
                "customer_name": format!("客户{}", i + 1),
                "total_amount": (1000 + i * 150) as f64,
                "status": status,
                "item_count": (i % 5) + 1,
                "created_at": format!("2026-08-{:02}T10:{:02}:00Z", (i % 26) + 1, i % 60),
            })
        })
        .filter(|o| {
            (status_filter.is_empty() || o["status"].as_str() == Some(status_filter))
                && (customer_filter.is_empty() || o["customer_id"].as_str() == Some(customer_filter))
        })
        .collect()
}

/// 生成 Mock 订单详情
fn generate_mock_order_detail(order_id: &str) -> Value {
    json!({
        "order_id": order_id,
        "order_number": "SO2026001001",
        "customer_id": "CUST-001",
        "customer_name": "北京图宇科技有限公司",
        "status": "confirmed",
        "total_amount": 15800.00,
        "tax_amount": 2054.00,
        "discount_amount": 500.00,
        "items": [
            {
                "product_id": "PROD-001",
                "product_name": "智能传感器A1",
                "quantity": 10,
                "unit_price": 800.00,
                "subtotal": 8000.00,
            },
            {
                "product_id": "PROD-002",
                "product_name": "数据采集模块B2",
                "quantity": 5,
                "unit_price": 1560.00,
                "subtotal": 7800.00,
            },
        ],
        "shipping_address": {
            "province": "河北省",
            "city": "石家庄市",
            "district": "裕华区",
            "detail": "科技园区A座1001室",
            "contact": "王经理",
            "phone": "138****8888",
        },
        "logistics": {
            "carrier": "顺丰速运",
            "tracking_number": "SF1234567890",
            "status": "已发货",
            "shipped_at": "2026-08-25T14:30:00Z",
        },
        "payment": {
            "method": "银行转账",
            "status": "已支付",
            "paid_at": "2026-08-24T09:15:00Z",
        },
        "remark": "加急订单，请优先处理",
        "created_at": "2026-08-24T08:00:00Z",
        "updated_at": "2026-08-25T14:30:00Z",
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_erp_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_erp_tools(&server).await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("erp.list_orders").await);
        assert!(registry.has_tool("erp.get_order").await);
        assert!(registry.has_tool("erp.create_order").await);
        assert!(registry.has_tool("erp.update_inventory").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_orders() {
        let server = McpServer::new("test", "1.0.0");
        register_erp_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("erp.list_orders", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["orders"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_order() {
        let server = McpServer::new("test", "1.0.0");
        register_erp_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("erp.get_order", json!({"order_id": "ORD-00000001"}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["order_id"], "ORD-00000001");
            assert!(parsed["items"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_order_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_erp_tools(&server).await;

        // 缺少 customer_id
        let result = server
            .tool_registry()
            .call_tool("erp.create_order", json!({"items": [{"product_id": "P1", "quantity": 1}]}))
            .await;
        assert!(result.is_err());

        // 缺少 items
        let result = server
            .tool_registry()
            .call_tool("erp.create_order", json!({"customer_id": "C1"}))
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_update_inventory_inbound() {
        let server = McpServer::new("test", "1.0.0");
        register_erp_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("erp.update_inventory", json!({"product_id": "P1", "quantity": 50, "operation": "inbound"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["operation"], "inbound");
            assert_eq!(parsed["current_stock"], 1050);
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_update_inventory_outbound_insufficient() {
        let server = McpServer::new("test", "1.0.0");
        register_erp_tools(&server).await;

        // 出库数量超过库存
        let result = server
            .tool_registry()
            .call_tool("erp.update_inventory", json!({"product_id": "P1", "quantity": 2000, "operation": "outbound"}))
            .await;
        assert!(result.is_err());
    }
}
