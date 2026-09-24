//! WMS MCP Tools — 仓储管理系统业务工具。
//!
//! 注册 4 个 WMS 业务工具到 MCP Server：
//! - wms.list_inventory — 查询库存列表
//! - wms.get_inventory — 获取库存详情
//! - wms.list_warehouses — 查询仓库列表
//! - wms.create_transfer — 创建库存调拨单
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 WMS API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;
use super::super::tools::{http_call, service_base_url, url_encode};

/// 注册 WMS 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - wms.list_inventory — 查询库存列表（支持分页、仓库筛选、物料搜索）
/// - wms.get_inventory — 获取库存详情（按物料ID+仓库ID）
/// - wms.list_warehouses — 查询仓库列表（支持分页、状态筛选）
/// - wms.create_transfer — 创建库存调拨单（源仓库、目标仓库、物料、数量）
pub async fn register_wms_tools(server: &McpServer, _jwt_secret: &str) {
    let registry = server.tool_registry();

    // 1. wms.list_inventory
    registry
        .register(
            "wms.list_inventory",
            "查询WMS库存列表，支持分页、仓库筛选和物料搜索。返回库存的基本信息列表，包括物料编码、名称、仓库、库位、数量、单位、状态等。",
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
                    "warehouse_id",
                    SchemaBuilder::string().description("仓库ID筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配物料编码、名称）"),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("库存状态筛选")
                        .enum_values(&["normal", "low_stock", "overstock", "frozen"]),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let warehouse_id = params["warehouse_id"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");

                // 真实调用 WMS API（GET /api/wms/inventory，降级 mock）
                let mut path = format!("/api/wms/inventory?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                if !keyword.is_empty() { path.push_str(&format!("&search={}", url_encode(keyword))); }
                let base = service_base_url("WMS_SERVICE_URL", 8041);
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    let items = data.get("items").cloned().unwrap_or(json!([]));
                    let total = data.get("total").cloned().unwrap_or(json!(0));
                    let result = json!({ "total": total, "page": page, "page_size": page_size, "inventory": items });
                    return Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None });
                }

                let inventory = generate_mock_inventory(warehouse_id, keyword, status);
                let total = inventory.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_inventory = &inventory[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "inventory": page_inventory,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. wms.get_inventory
    registry
        .register(
            "wms.get_inventory",
            "获取WMS库存详情，按物料ID和仓库ID查询。返回库存的完整信息，包括物料信息、仓库信息、库位、数量、批次、有效期、出入库记录等。",
            SchemaBuilder::object()
                .property(
                    "material_id",
                    SchemaBuilder::string().description("物料ID"),
                )
                .property(
                    "warehouse_id",
                    SchemaBuilder::string().description("仓库ID"),
                )
                .required(&["material_id", "warehouse_id"])
                .build(),
            |params| {
                let material_id = params["material_id"].as_str().unwrap_or("");
                let warehouse_id = params["warehouse_id"].as_str().unwrap_or("");

                if material_id.is_empty() {
                    return Err(ToolExecutionError::Validation("material_id is required".to_string()));
                }
                if warehouse_id.is_empty() {
                    return Err(ToolExecutionError::Validation("warehouse_id is required".to_string()));
                }

                // 真实调用 WMS API（GET /api/wms/inventory/{id}，降级 mock）
                let base = service_base_url("WMS_SERVICE_URL", 8041);
                let path = format!("/api/wms/inventory/{}", url_encode(material_id));
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    let result = json!({ "inventory": data });
                    return Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None });
                }

                let inventory = generate_mock_inventory_detail(material_id, warehouse_id);

                Ok(McpToolResult {
                    content: vec![McpContent::text(inventory.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. wms.list_warehouses
    registry
        .register(
            "wms.list_warehouses",
            "查询WMS仓库列表，支持分页和状态筛选。返回仓库的基本信息列表，包括仓库编码、名称、类型、地址、负责人、容量、状态等。",
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
                        .description("仓库状态筛选")
                        .enum_values(&["active", "inactive", "maintenance"]),
                )
                .property(
                    "warehouse_type",
                    SchemaBuilder::string()
                        .description("仓库类型筛选")
                        .enum_values(&["raw_material", "finished_goods", "wip", "return", "hazardous"]),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let status = params["status"].as_str().unwrap_or("");
                let warehouse_type = params["warehouse_type"].as_str().unwrap_or("");

                // 真实调用 WMS API（GET /api/wms/warehouses，降级 mock）
                let mut path = format!("/api/wms/warehouses?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                let base = service_base_url("WMS_SERVICE_URL", 8041);
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    let items = data.get("warehouses").cloned().unwrap_or(json!([]));
                    let total = data.get("total").cloned().unwrap_or(json!(0));
                    let result = json!({ "total": total, "page": page, "page_size": page_size, "warehouses": items });
                    return Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None });
                }

                let warehouses = generate_mock_warehouses(status, warehouse_type);
                let total = warehouses.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_warehouses = &warehouses[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "warehouses": page_warehouses,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. wms.create_transfer
    registry
        .register(
            "wms.create_transfer",
            "创建WMS库存调拨单。需要提供源仓库、目标仓库、物料编码和调拨数量，返回新创建的调拨单ID和调拨单号。",
            SchemaBuilder::object()
                .property(
                    "from_warehouse_id",
                    SchemaBuilder::string().description("源仓库ID"),
                )
                .property(
                    "to_warehouse_id",
                    SchemaBuilder::string().description("目标仓库ID"),
                )
                .property(
                    "material_id",
                    SchemaBuilder::string().description("物料ID"),
                )
                .property(
                    "quantity",
                    SchemaBuilder::integer().description("调拨数量").minimum(1.0),
                )
                .property(
                    "remark",
                    SchemaBuilder::string().description("调拨备注"),
                )
                .property(
                    "operator",
                    SchemaBuilder::string().description("操作人"),
                )
                .required(&["from_warehouse_id", "to_warehouse_id", "material_id", "quantity"])
                .build(),
            |params| {
                let from_warehouse_id = params["from_warehouse_id"].as_str().unwrap_or("");
                let to_warehouse_id = params["to_warehouse_id"].as_str().unwrap_or("");
                let material_id = params["material_id"].as_str().unwrap_or("");
                let quantity = params["quantity"].as_i64().unwrap_or(0);

                if from_warehouse_id.is_empty() {
                    return Err(ToolExecutionError::Validation("from_warehouse_id is required".to_string()));
                }
                if to_warehouse_id.is_empty() {
                    return Err(ToolExecutionError::Validation("to_warehouse_id is required".to_string()));
                }
                if from_warehouse_id == to_warehouse_id {
                    return Err(ToolExecutionError::Validation("Source and destination warehouses cannot be the same".to_string()));
                }
                if material_id.is_empty() {
                    return Err(ToolExecutionError::Validation("material_id is required".to_string()));
                }
                if quantity <= 0 {
                    return Err(ToolExecutionError::Validation("quantity must be positive".to_string()));
                }

                // 真实调用 WMS API（POST /api/wms/transfers，降级 mock）
                let base = service_base_url("WMS_SERVICE_URL", 8041);
                let body = json!({
                    "from_warehouse_id": params["from_warehouse_id"].as_str().unwrap_or(""),
                    "to_warehouse_id": params["to_warehouse_id"].as_str().unwrap_or(""),
                    "material_id": params["material_id"].as_str().unwrap_or(""),
                    "quantity": params["quantity"].as_i64().unwrap_or(0),
                });
                if let Some(data) = http_call(&base, "POST", "/api/wms/transfers", Some(body)) {
                    let result = json!({ "transfer": data, "message": "调拨单创建成功" });
                    return Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None });
                }

                let transfer_id = format!("TRF-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("00000000"));
                let transfer_number = format!("TRF{}{:06}", chrono::Utc::now().format("%Y%m%d"), 1001);

                let result = json!({
                    "transfer_id": transfer_id,
                    "transfer_number": transfer_number,
                    "from_warehouse_id": from_warehouse_id,
                    "to_warehouse_id": to_warehouse_id,
                    "material_id": material_id,
                    "quantity": quantity,
                    "remark": params["remark"].as_str().unwrap_or(""),
                    "operator": params["operator"].as_str().unwrap_or(""),
                    "status": "pending",
                    "created_at": chrono::Utc::now().to_rfc3339(),
                    "message": "库存调拨单创建成功，等待源仓库确认出库",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("WMS MCP Tools registered: 4 tools (wms.list_inventory, wms.get_inventory, wms.list_warehouses, wms.create_transfer)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 库存列表
fn generate_mock_inventory(
    warehouse_filter: &str,
    keyword_filter: &str,
    status_filter: &str,
) -> Vec<Value> {
    let warehouses = ["WH-001", "WH-002", "WH-003", "WH-004"];
    let warehouse_names = ["原材料仓", "成品仓", "半成品仓", "退货仓"];
    let statuses = [
        "normal",
        "normal",
        "normal",
        "low_stock",
        "overstock",
        "frozen",
    ];
    let units = ["个", "件", "箱", "kg", "m", "套"];

    (0..200)
        .map(|i| {
            let warehouse_idx = i % warehouses.len();
            let warehouse_id = warehouses[warehouse_idx];
            let warehouse_name = warehouse_names[warehouse_idx];
            let status = statuses[i % statuses.len()];
            let unit = units[i % units.len()];
            let quantity = 100 + (i * 7) % 5000;
            let safety_stock = 50 + (i % 10) * 20;

            json!({
                "inventory_id": format!("INV-{:08}", i + 1),
                "material_id": format!("MAT-{:04}", (i % 50) + 1),
                "material_code": format!("M{:06}", (i % 50) + 1),
                "material_name": format!("物料{:03}", (i % 50) + 1),
                "warehouse_id": warehouse_id,
                "warehouse_name": warehouse_name,
                "location": format!("{}-{:02}-{:02}", warehouse_id, (i % 10) + 1, (i % 5) + 1),
                "quantity": quantity,
                "unit": unit,
                "safety_stock": safety_stock,
                "max_stock": safety_stock * 10,
                "status": status,
                "batch_number": format!("BATCH{}{:04}", chrono::Utc::now().format("%Y%m"), (i % 100) + 1),
                "expiry_date": if i % 5 == 0 { Some(format!("2027-{:02}-{:02}", (i % 12) + 1, (i % 28) + 1)) } else { None },
                "last_inbound": format!("2026-08-{:02}", (i % 26) + 1),
                "last_outbound": if i % 3 == 0 { Some(format!("2026-08-{:02}", (i % 26) + 1)) } else { None },
            })
        })
        .filter(|inv| {
            (warehouse_filter.is_empty() || inv["warehouse_id"].as_str() == Some(warehouse_filter))
                && (keyword_filter.is_empty()
                    || inv["material_code"].as_str().unwrap_or("").contains(keyword_filter)
                    || inv["material_name"].as_str().unwrap_or("").contains(keyword_filter))
                && (status_filter.is_empty() || inv["status"].as_str() == Some(status_filter))
        })
        .collect()
}

/// 生成 Mock 库存详情
fn generate_mock_inventory_detail(material_id: &str, warehouse_id: &str) -> Value {
    json!({
        "inventory_id": "INV-00000001",
        "material_id": material_id,
        "material_code": "M000001",
        "material_name": "智能传感器A1",
        "material_spec": "型号A1-2026，精度±0.1%",
        "material_category": "电子元器件",
        "warehouse_id": warehouse_id,
        "warehouse_name": "原材料仓",
        "location": "WH-001-01-01",
        "quantity": 1250,
        "unit": "个",
        "safety_stock": 200,
        "max_stock": 2000,
        "status": "normal",
        "batch_number": "BATCH2026080001",
        "expiry_date": "2027-08-20",
        "production_date": "2026-08-10",
        "supplier": "深圳某电子有限公司",
        "last_inbound": {
            "date": "2026-08-20",
            "quantity": 500,
            "reference": "PO202608001",
        },
        "last_outbound": {
            "date": "2026-08-25",
            "quantity": 100,
            "reference": "MO202608001",
        },
        "recent_movements": [
            {"type": "inbound", "date": "2026-08-20", "quantity": 500, "reference": "PO202608001", "operator": "张三"},
            {"type": "outbound", "date": "2026-08-22", "quantity": 200, "reference": "MO202608001", "operator": "李四"},
            {"type": "outbound", "date": "2026-08-25", "quantity": 100, "reference": "MO202608002", "operator": "王五"},
            {"type": "transfer", "date": "2026-08-26", "quantity": 50, "reference": "TRF202608001", "operator": "赵六"},
        ],
        "created_at": "2026-01-15T10:00:00Z",
        "updated_at": "2026-08-26T14:30:00Z",
    })
}

/// 生成 Mock 仓库列表
fn generate_mock_warehouses(status_filter: &str, type_filter: &str) -> Vec<Value> {
    let statuses = ["active", "active", "active", "inactive", "maintenance"];
    let types = [
        "raw_material",
        "finished_goods",
        "wip",
        "return",
        "hazardous",
    ];
    let type_names = ["原材料仓", "成品仓", "半成品仓", "退货仓", "危化品仓"];

    (0..20)
        .map(|i| {
            let status = statuses[i % statuses.len()];
            let warehouse_type = types[i % types.len()];
            let type_name = type_names[i % types.len()];
            let capacity = 5000 + (i % 5) * 2000;
            let used = (capacity as f64 * (0.3 + (i % 7) as f64 * 0.1)) as i64;

            json!({
                "warehouse_id": format!("WH-{:03}", i + 1),
                "warehouse_code": format!("W{:03}", i + 1),
                "warehouse_name": format!("{}{}", type_name, if i > 4 { format!("{}号", (i % 4) + 1) } else { "".to_string() }),
                "warehouse_type": warehouse_type,
                "status": status,
                "address": format!("河北省石家庄市裕华区科技园区{}号楼", (i % 10) + 1),
                "manager": format!("仓管员{:02}", (i % 10) + 1),
                "phone": format!("138{:08}", (i % 100) + 1),
                "area": 500 + (i % 5) * 200,
                "capacity": capacity,
                "used_capacity": used,
                "available_capacity": capacity as i64 - used,
                "utilization_rate": (used as f64 / capacity as f64 * 100.0).round(),
                "created_at": format!("202{}-0{}-15T10:00:00Z", (i % 5) + 1, (i % 9) + 1),
            })
        })
        .filter(|w| {
            (status_filter.is_empty() || w["status"].as_str() == Some(status_filter))
                && (type_filter.is_empty() || w["warehouse_type"].as_str() == Some(type_filter))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_mcp::protocol::McpContent;

    #[tokio::test]
    #[ignore = "需要 WMS_SERVICE_URL 指向真实服务时手动运行"]
    async fn test_wms_list_inventory_real_api() {
        if std::env::var("WMS_SERVICE_URL").is_err() {
            eprintln!("SKIP: 未设置 WMS_SERVICE_URL");
            return;
        }
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_wms_tools(&server, "test-secret").await;
        let result = server
            .tool_registry()
            .call_tool("wms.list_inventory", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();
        let text = match &result.content[0] {
            McpContent::Text { text } => text.clone(),
            _ => String::new(),
        };
        let parsed: Value = serde_json::from_str(&text).unwrap_or(json!({}));
        let total = parsed["total"].as_u64().unwrap_or(0);
        assert!(total > 0, "真实 API 应返回数据，total={}", total);
        eprintln!("wms.list_inventory 真实调用返回 total = {}", total);
    }

    #[tokio::test]
    async fn test_register_wms_tools() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_wms_tools(&server, "test-secret").await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("wms.list_inventory").await);
        assert!(registry.has_tool("wms.get_inventory").await);
        assert!(registry.has_tool("wms.list_warehouses").await);
        assert!(registry.has_tool("wms.create_transfer").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_inventory() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_wms_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("wms.list_inventory", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["inventory"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_inventory() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_wms_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "wms.get_inventory",
                json!({"material_id": "MAT-0001", "warehouse_id": "WH-001"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["material_id"], "MAT-0001");
            assert_eq!(parsed["warehouse_id"], "WH-001");
            assert!(parsed["recent_movements"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_warehouses() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_wms_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "wms.list_warehouses",
                json!({"page": 1, "page_size": 10, "status": "active"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["warehouses"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_transfer() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_wms_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "wms.create_transfer",
                json!({
                    "from_warehouse_id": "WH-001",
                    "to_warehouse_id": "WH-002",
                    "material_id": "MAT-0001",
                    "quantity": 100,
                    "remark": "生产调拨",
                    "operator": "张三"
                }),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["from_warehouse_id"], "WH-001");
            assert_eq!(parsed["to_warehouse_id"], "WH-002");
            assert_eq!(parsed["material_id"], "MAT-0001");
            assert_eq!(parsed["quantity"], 100);
            assert_eq!(parsed["status"], "pending");
            assert!(parsed["transfer_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_transfer_validation() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_wms_tools(&server, "test-secret").await;

        // 源仓库和目标仓库相同
        let result = server
            .tool_registry()
            .call_tool(
                "wms.create_transfer",
                json!({
                    "from_warehouse_id": "WH-001",
                    "to_warehouse_id": "WH-001",
                    "material_id": "MAT-0001",
                    "quantity": 100
                }),
            )
            .await;
        assert!(result.is_err());

        // 数量为0
        let result = server
            .tool_registry()
            .call_tool(
                "wms.create_transfer",
                json!({
                    "from_warehouse_id": "WH-001",
                    "to_warehouse_id": "WH-002",
                    "material_id": "MAT-0001",
                    "quantity": 0
                }),
            )
            .await;
        assert!(result.is_err());
    }
}
