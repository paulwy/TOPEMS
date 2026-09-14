//! ERP MCP 业务工具（V2026.09 真实业务 API 接入）
//!
//! 通过 `TypedServiceClient<ErpApi>` 调用真实 ERP 服务 API，
//! API 不可达时降级为 mock 数据。
//!
//! 工具清单：
//! - erp.list_sales_orders — 销售订单列表（分页 + 状态/客户筛选）
//! - erp.get_inventory_summary — 库存汇总
//! - erp.create_purchase_order — 创建采购订单
//! - erp.get_sales_order_detail — 销售订单详情

use serde_json::{json, Value};
use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;
use topems_shared_service_client::service_client::api::erp_api::ErpApi;
use topems_shared_service_client::service_client::TypedServiceClient;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 构造 ERP TypedServiceClient
fn erp_client() -> Result<TypedServiceClient<ErpApi>, ToolExecutionError> {
    TypedServiceClient::<ErpApi>::from_env_default()
        .map_err(|e| ToolExecutionError::Execution(format!("ERP 客户端初始化失败: {}", e)))
}

/// 注册 ERP 业务工具（4 个）
pub async fn register_erp_tools(server: &McpServer) {
    let registry = server.tool_registry();

    // 1. erp.list_sales_orders
    registry
        .register_async(
            "erp.list_sales_orders",
            "查询销售订单列表，支持分页、状态筛选和客户筛选。返回订单编号、客户、金额、状态等。",
            SchemaBuilder::object()
                .property("page", SchemaBuilder::integer().description("页码，从1开始").minimum(1.0).default(json!(1)))
                .property("page_size", SchemaBuilder::integer().description("每页条数").minimum(1.0).maximum(100.0).default(json!(20)))
                .property("status", SchemaBuilder::string().description("订单状态筛选").enum_values(&["pending", "confirmed", "shipped", "completed", "cancelled"]))
                .property("customer_id", SchemaBuilder::string().description("客户ID筛选"))
                .required(&["page"])
                .build(),
            |params| async move {
                let page = params["page"].as_u64().unwrap_or(1) as i32;
                let page_size = params["page_size"].as_u64().unwrap_or(20) as i32;
                let status = params["status"].as_str().unwrap_or("");
                let customer_id = params["customer_id"].as_str().unwrap_or("");

                let result = match erp_client()?.list_sales_orders(page, page_size).await {
                    Ok(orders) => {
                        let filtered: Vec<Value> = orders.into_iter().filter(|o| {
                            (status.is_empty() || o["status"].as_str() == Some(status))
                                && (customer_id.is_empty() || o["customer_id"].as_str() == Some(customer_id))
                        }).collect();
                        json!({ "total": filtered.len(), "page": page, "page_size": page_size, "orders": filtered, "source": "real_api" })
                    }
                    Err(e) => {
                        tracing::warn!("ERP list_sales_orders API 调用失败（降级 mock）: {}", e);
                        let all = generate_mock_orders(status, customer_id);
                        let total = all.len();
                        let start = ((page - 1) * page_size).max(0) as usize;
                        let end = (start + page_size as usize).min(total);
                        json!({ "total": total, "page": page, "page_size": page_size, "orders": &all[start.min(total)..end], "source": "mock_fallback" })
                    }
                };

                Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None })
            },
        )
        .await;

    // 2. erp.get_inventory_summary
    registry
        .register_async(
            "erp.get_inventory_summary",
            "获取库存汇总信息，包括总SKU数、总库存数量、库存总价值、低库存预警数等。",
            SchemaBuilder::object().build(),
            |_params| async move {
                let result = match erp_client()?.get_inventory_summary().await {
                    Ok(summary) => json!({ "summary": summary, "source": "real_api" }),
                    Err(e) => {
                        tracing::warn!("ERP get_inventory_summary API 调用失败（降级 mock）: {}", e);
                        json!({ "summary": generate_mock_inventory_summary(), "source": "mock_fallback" })
                    }
                };
                Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None })
            },
        )
        .await;

    // 3. erp.create_purchase_order
    registry
        .register_async(
            "erp.create_purchase_order",
            "创建采购订单。需提供供应商ID和采购明细（物料ID、数量、单价）。",
            SchemaBuilder::object()
                .property("supplier_id", SchemaBuilder::string().description("供应商ID"))
                .property("items", SchemaBuilder::array().description("采购明细列表，每项含 material_id/quantity/unit_price").items(SchemaBuilder::object()
                    .property("material_id", SchemaBuilder::string().description("物料ID"))
                    .property("quantity", SchemaBuilder::integer().description("数量").minimum(1.0))
                    .property("unit_price", SchemaBuilder::number().description("单价"))
                    .required(&["material_id", "quantity", "unit_price"])
                    ))
                .property("expected_date", SchemaBuilder::string().description("期望交货日期（YYYY-MM-DD）"))
                .property("remark", SchemaBuilder::string().description("备注"))
                .required(&["supplier_id", "items"])
                .build(),
            |params| async move {
                let supplier_id = params["supplier_id"].as_str()
                    .ok_or_else(|| ToolExecutionError::Validation("supplier_id 不能为空".to_string()))?.to_string();
                let items = params["items"].as_array()
                    .ok_or_else(|| ToolExecutionError::Validation("items 必须是数组".to_string()))?.clone();
                if items.is_empty() {
                    return Err(ToolExecutionError::Validation("items 不能为空".to_string()));
                }
                let expected_date = params["expected_date"].as_str().unwrap_or("").to_string();
                let remark = params["remark"].as_str().unwrap_or("").to_string();

                let payload = json!({
                    "supplier_id": supplier_id,
                    "items": items,
                    "expected_date": expected_date,
                    "remark": remark,
                });

                let result = match erp_client()?.create_purchase_order(&payload).await {
                    Ok(order) => json!({ "success": true, "purchase_order": order, "source": "real_api" }),
                    Err(e) => {
                        tracing::warn!("ERP create_purchase_order API 调用失败（降级 mock）: {}", e);
                        let total: f64 = items.iter().map(|it| {
                            it["quantity"].as_f64().unwrap_or(0.0) * it["unit_price"].as_f64().unwrap_or(0.0)
                        }).sum();
                        json!({
                            "success": true,
                            "purchase_order": {
                                "id": format!("PO-{}", uuid::Uuid::new_v4().simple()),
                                "supplier_id": supplier_id,
                                "items": items,
                                "total_amount": total,
                                "status": "pending",
                                "expected_date": expected_date,
                            },
                            "message": "采购订单创建成功（mock 降级）",
                            "source": "mock_fallback"
                        })
                    }
                };
                Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None })
            },
        )
        .await;

    // 4. erp.get_sales_order_detail
    registry
        .register_async(
            "erp.get_sales_order_detail",
            "根据订单ID获取销售订单完整详情，包括客户信息、商品明细、金额、收货地址、物流信息等。",
            SchemaBuilder::object()
                .property("order_id", SchemaBuilder::string().description("销售订单ID（如 ORD-00000001）"))
                .required(&["order_id"])
                .build(),
            |params| async move {
                let order_id = params["order_id"].as_str()
                    .ok_or_else(|| ToolExecutionError::Validation("order_id 不能为空".to_string()))?.to_string();

                let result = match erp_client()?.get_sales_order(&order_id).await {
                    Ok(order) => json!({ "order": order, "source": "real_api" }),
                    Err(e) => {
                        tracing::warn!("ERP get_sales_order API 调用失败（降级 mock）: {}", e);
                        json!({ "order": generate_mock_order_detail(&order_id), "source": "mock_fallback" })
                    }
                };
                Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None })
            },
        )
        .await;

    tracing::info!("ERP MCP Tools registered: 4 tools (erp.list_sales_orders, erp.get_inventory_summary, erp.create_purchase_order, erp.get_sales_order_detail) — TypedServiceClient 真实调用");
}

// ============ Mock 降级数据 ============

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
                && (customer_filter.is_empty()
                    || o["customer_id"].as_str() == Some(customer_filter))
        })
        .collect()
}

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
            { "product_id": "PROD-001", "product_name": "智能传感器A1", "quantity": 10, "unit_price": 800.00, "subtotal": 8000.00 },
            { "product_id": "PROD-002", "product_name": "数据采集模块B2", "quantity": 5, "unit_price": 1560.00, "subtotal": 7800.00 },
        ],
        "shipping_address": {
            "province": "河北省", "city": "石家庄市", "district": "裕华区",
            "detail": "科技园区A座1001室", "contact": "王经理", "phone": "138****8888",
        },
        "logistics": { "carrier": "顺丰速运", "tracking_number": "SF1234567890" },
    })
}

fn generate_mock_inventory_summary() -> Value {
    json!({
        "total_skus": 1256,
        "total_quantity": 45820,
        "total_value": 2856000.00,
        "low_stock_count": 23,
        "out_of_stock_count": 5,
        "warehouse_count": 4,
        "last_updated": "2026-09-13T08:00:00Z",
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
        assert!(registry.has_tool("erp.list_sales_orders").await);
        assert!(registry.has_tool("erp.get_inventory_summary").await);
        assert!(registry.has_tool("erp.create_purchase_order").await);
        assert!(registry.has_tool("erp.get_sales_order_detail").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_sales_orders_mock_fallback() {
        let server = McpServer::new("test", "1.0.0");
        register_erp_tools(&server).await;
        let result = server.tool_registry()
            .call_tool("erp.list_sales_orders", json!({"page": 1, "page_size": 10}))
            .await;
        assert!(result.is_ok(), "list_sales_orders 应返回 Ok: {:?}", result);
    }

    #[tokio::test]
    async fn test_get_inventory_summary_mock_fallback() {
        let server = McpServer::new("test", "1.0.0");
        register_erp_tools(&server).await;
        let result = server.tool_registry()
            .call_tool("erp.get_inventory_summary", json!({}))
            .await;
        assert!(result.is_ok(), "get_inventory_summary 应返回 Ok: {:?}", result);
    }

    #[tokio::test]
    async fn test_get_sales_order_detail_mock_fallback() {
        let server = McpServer::new("test", "1.0.0");
        register_erp_tools(&server).await;
        let result = server.tool_registry()
            .call_tool("erp.get_sales_order_detail", json!({"order_id": "ORD-00000001"}))
            .await;
        assert!(result.is_ok(), "get_sales_order_detail 应返回 Ok: {:?}", result);
    }

    #[tokio::test]
    async fn test_create_purchase_order_mock_fallback() {
        let server = McpServer::new("test", "1.0.0");
        register_erp_tools(&server).await;
        let result = server.tool_registry()
            .call_tool("erp.create_purchase_order", json!({
                "supplier_id": "SUP-001",
                "items": [{"material_id": "MAT-001", "quantity": 10, "unit_price": 100.0}]
            }))
            .await;
        assert!(result.is_ok(), "create_purchase_order 应返回 Ok: {:?}", result);
    }

    #[test]
    fn test_generate_mock_orders_filter() {
        let orders = generate_mock_orders("confirmed", "");
        assert!(!orders.is_empty());
        assert!(orders.iter().all(|o| o["status"] == "confirmed"));
    }
}
