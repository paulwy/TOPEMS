//! SCM MCP Tools — 供应链管理系统业务工具。
//!
//! 注册 4 个 SCM 业务工具到 MCP Server：
//! - scm.list_suppliers — 查询供应商列表
//! - scm.get_supplier — 获取供应商详情
//! - scm.list_purchase_orders — 查询采购订单列表
//! - scm.create_purchase_order — 创建采购订单
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 SCM API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;
use super::super::tools::{http_call, service_base_url, url_encode};

/// 注册 SCM 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - scm.list_suppliers — 查询供应商列表（支持分页、等级筛选、状态筛选）
/// - scm.get_supplier — 获取供应商详情（按ID）
/// - scm.list_purchase_orders — 查询采购订单列表（支持分页、状态筛选、供应商筛选）
/// - scm.create_purchase_order — 创建采购订单（供应商、物料、数量、价格）
pub async fn register_scm_tools(server: &McpServer, _jwt_secret: &str) {
    let registry = server.tool_registry();

    // 1. scm.list_suppliers
    registry
        .register(
            "scm.list_suppliers",
            "查询SCM供应商列表，支持分页、等级筛选和状态筛选。返回供应商的基本信息列表，包括供应商编号、名称、联系人、等级、状态、行业、评分、合作年限等。",
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
                    "supplier_level",
                    SchemaBuilder::string()
                        .description("供应商等级筛选")
                        .enum_values(&["strategic", "preferred", "approved", "qualified", "pending", "blacklisted"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("供应商状态筛选")
                        .enum_values(&["active", "inactive", "suspended", "terminated"]),
                )
                .property(
                    "category",
                    SchemaBuilder::string().description("供应品类筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配供应商编号、名称）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let supplier_level = params["supplier_level"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let category = params["category"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                // 真实调用 SCM API（GET /api/scm/suppliers，降级 mock）
                let mut path = format!("/api/scm/suppliers?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                if !keyword.is_empty() { path.push_str(&format!("&search={}", url_encode(keyword))); }
                let base = service_base_url("SCM_SERVICE_URL", 8040);
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    let items = data.get("suppliers").cloned().unwrap_or(json!([]));
                    let total = data.get("total").cloned().unwrap_or(json!(0));
                    let result = json!({ "total": total, "page": page, "page_size": page_size, "suppliers": items });
                    return Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None });
                }

                let suppliers = generate_mock_suppliers(supplier_level, status, category, keyword);
                let total = suppliers.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_suppliers = &suppliers[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "suppliers": page_suppliers,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. scm.get_supplier
    registry
        .register(
            "scm.get_supplier",
            "获取SCM供应商详情，按供应商ID查询。返回供应商的完整信息，包括基本信息、联系人、银行账户、资质证书、评分、物料供应、采购历史、合同信息等。",
            SchemaBuilder::object()
                .property(
                    "supplier_id",
                    SchemaBuilder::string().description("供应商ID"),
                )
                .required(&["supplier_id"])
                .build(),
            |params| {
                let supplier_id = params["supplier_id"].as_str().unwrap_or("");

                if supplier_id.is_empty() {
                    return Err(ToolExecutionError::Validation("supplier_id is required".to_string()));
                }

                // 真实调用 SCM API（GET /api/scm/suppliers/{id}，降级 mock）
                let base = service_base_url("SCM_SERVICE_URL", 8040);
                let path = format!("/api/scm/suppliers/{}", url_encode(supplier_id));
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    let result = json!({ "supplier": data });
                    return Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None });
                }

                let supplier = generate_mock_supplier_detail(supplier_id);

                Ok(McpToolResult {
                    content: vec![McpContent::text(supplier.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. scm.list_purchase_orders
    registry
        .register(
            "scm.list_purchase_orders",
            "查询SCM采购订单列表，支持分页、状态筛选和供应商筛选。返回采购订单的基本信息列表，包括订单编号、供应商、状态、总金额、创建时间、预计交货时间等。",
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
                        .enum_values(&["draft", "pending_approval", "approved", "sent", "partial_received", "received", "closed", "cancelled"]),
                )
                .property(
                    "supplier_id",
                    SchemaBuilder::string().description("供应商ID筛选"),
                )
                .property(
                    "start_date",
                    SchemaBuilder::string().description("开始日期筛选（YYYY-MM-DD）"),
                )
                .property(
                    "end_date",
                    SchemaBuilder::string().description("结束日期筛选（YYYY-MM-DD）"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配订单编号）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let status = params["status"].as_str().unwrap_or("");
                let supplier_id = params["supplier_id"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                // 真实调用 SCM API（GET /api/scm/purchase-orders，降级 mock）
                let mut path = format!("/api/scm/purchase-orders?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                if !keyword.is_empty() { path.push_str(&format!("&search={}", url_encode(keyword))); }
                let base = service_base_url("SCM_SERVICE_URL", 8040);
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    let items = data.get("orders").cloned().unwrap_or(json!([]));
                    let total = data.get("total").cloned().unwrap_or(json!(0));
                    let result = json!({ "total": total, "page": page, "page_size": page_size, "orders": items });
                    return Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None });
                }

                let orders = generate_mock_purchase_orders(status, supplier_id, keyword);
                let total = orders.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_orders = &orders[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "purchase_orders": page_orders,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. scm.create_purchase_order
    registry
        .register(
            "scm.create_purchase_order",
            "创建SCM采购订单。需要提供供应商ID和物料明细，返回新创建的采购订单ID和订单编号。",
            SchemaBuilder::object()
                .property(
                    "supplier_id",
                    SchemaBuilder::string().description("供应商ID"),
                )
                .property(
                    "items",
                    SchemaBuilder::array()
                        .description("物料明细列表")
                        .items(SchemaBuilder::object()
                            .property("material_id", SchemaBuilder::string().description("物料ID"))
                            .property("material_code", SchemaBuilder::string().description("物料编码"))
                            .property("material_name", SchemaBuilder::string().description("物料名称"))
                            .property("quantity", SchemaBuilder::number().description("数量").minimum(0.0))
                            .property("unit_price", SchemaBuilder::number().description("单价").minimum(0.0))
                            .property("unit", SchemaBuilder::string().description("单位"))
                            .required(&["material_id", "quantity", "unit_price"])),
                )
                .property(
                    "expected_delivery_date",
                    SchemaBuilder::string().description("预计交货日期（YYYY-MM-DD）"),
                )
                .property(
                    "payment_terms",
                    SchemaBuilder::string().description("付款条件"),
                )
                .property(
                    "remark",
                    SchemaBuilder::string().description("备注"),
                )
                .property(
                    "creator",
                    SchemaBuilder::string().description("创建人"),
                )
                .required(&["supplier_id", "items"])
                .build(),
            |params| {
                let supplier_id = params["supplier_id"].as_str().unwrap_or("");
                let items = params["items"].as_array();

                if supplier_id.is_empty() {
                    return Err(ToolExecutionError::Validation("supplier_id is required".to_string()));
                }
                if items.is_none() || items.unwrap().is_empty() {
                    return Err(ToolExecutionError::Validation("items must contain at least one item".to_string()));
                }

                let items = items.unwrap();
                let mut total_amount = 0.0;
                for item in items {
                    let qty = item["quantity"].as_f64().unwrap_or(0.0);
                    let price = item["unit_price"].as_f64().unwrap_or(0.0);
                    total_amount += qty * price;
                }

                // 真实调用 SCM API（POST /api/scm/purchase-orders，降级 mock）
                let base = service_base_url("SCM_SERVICE_URL", 8040);
                let body = json!({
                    "supplier_id": params["supplier_id"].as_str().unwrap_or(""),
                    "items": params["items"].as_array().cloned().unwrap_or_default(),
                    "expected_delivery_date": params["expected_delivery_date"].as_str().unwrap_or(""),
                    "remark": params["remark"].as_str().unwrap_or(""),
                });
                if let Some(data) = http_call(&base, "POST", "/api/scm/purchase-orders", Some(body)) {
                    let result = json!({ "order": data, "message": "采购订单创建成功" });
                    return Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None });
                }

                let order_id = format!("PO-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("00000000"));
                let order_number = format!("PO{}{:06}", chrono::Utc::now().format("%Y%m%d"), 1001);

                let result = json!({
                    "order_id": order_id,
                    "order_number": order_number,
                    "supplier_id": supplier_id,
                    "items": items,
                    "total_amount": total_amount,
                    "expected_delivery_date": params["expected_delivery_date"].as_str().unwrap_or(""),
                    "payment_terms": params["payment_terms"].as_str().unwrap_or(""),
                    "remark": params["remark"].as_str().unwrap_or(""),
                    "creator": params["creator"].as_str().unwrap_or(""),
                    "status": "draft",
                    "created_at": chrono::Utc::now().to_rfc3339(),
                    "message": "采购订单创建成功，已分配订单编号，等待审批",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("SCM MCP Tools registered: 4 tools (scm.list_suppliers, scm.get_supplier, scm.list_purchase_orders, scm.create_purchase_order)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 供应商列表
fn generate_mock_suppliers(
    level_filter: &str,
    status_filter: &str,
    category_filter: &str,
    keyword_filter: &str,
) -> Vec<Value> {
    let levels = [
        "strategic",
        "preferred",
        "approved",
        "qualified",
        "pending",
        "blacklisted",
    ];
    let statuses = [
        "active",
        "active",
        "active",
        "inactive",
        "suspended",
        "terminated",
    ];
    let categories = [
        "原材料",
        "电子元件",
        "包装材料",
        "机械设备",
        "办公用品",
        "物流服务",
    ];

    (0..80)
        .map(|i| {
            let level = levels[i % levels.len()];
            let status = statuses[i % statuses.len()];
            let category = categories[i % categories.len()];

            json!({
                "supplier_id": format!("SUP-{:04}", i + 1),
                "supplier_code": format!("S{:06}", i + 1),
                "supplier_name": format!("供应商{:03}", i + 1),
                "contact_person": format!("联系人{:02}", (i % 10) + 1),
                "contact_phone": format!("138{:08}", (i % 100) + 1),
                "contact_email": format!("contact{}@supplier.com", i + 1),
                "supplier_level": level,
                "status": status,
                "category": category,
                "address": format!("广东省深圳市{}区{}路{}号", (i % 5) + 1, (i % 10) + 1, (i % 100) + 1),
                "rating": 3 + (i % 3),
                "cooperation_years": 1 + (i % 10),
                "total_orders": 10 + (i % 50),
                "total_amount": 100000 + (i % 20) * 50000,
                "on_time_delivery_rate": 85 + (i % 15),
                "quality_pass_rate": 90 + (i % 10),
                "created_at": format!("202{}-{:02}-{:02}", (i % 5) + 1, (i % 12) + 1, (i % 28) + 1),
            })
        })
        .filter(|s| {
            (level_filter.is_empty() || s["supplier_level"].as_str() == Some(level_filter))
                && (status_filter.is_empty() || s["status"].as_str() == Some(status_filter))
                && (category_filter.is_empty() || s["category"].as_str() == Some(category_filter))
                && (keyword_filter.is_empty()
                    || s["supplier_code"].as_str().unwrap_or("").contains(keyword_filter)
                    || s["supplier_name"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

/// 生成 Mock 供应商详情
fn generate_mock_supplier_detail(supplier_id: &str) -> Value {
    json!({
        "supplier_id": supplier_id,
        "supplier_code": "S000001",
        "supplier_name": "深圳某电子有限公司",
        "short_name": "深圳某电子",
        "contact_person": "张经理",
        "contact_phone": "13800138001",
        "contact_email": "zhang@supplier.com",
        "supplier_level": "strategic",
        "status": "active",
        "category": "电子元件",
        "address": "广东省深圳市南山区科技园路1号",
        "bank_account": {
            "bank_name": "中国工商银行深圳分行",
            "account_number": "4000020009000123456",
            "account_name": "深圳某电子有限公司",
            "swift_code": "ICBKCNBJSZN",
        },
        "certificates": [
            {"id": "CERT-001", "name": "ISO9001质量管理体系认证", "valid_until": "2027-12-31", "status": "valid"},
            {"id": "CERT-002", "name": "ISO14001环境管理体系认证", "valid_until": "2027-06-30", "status": "valid"},
            {"id": "CERT-003", "name": "RoHS认证", "valid_until": "2026-12-31", "status": "expiring_soon"},
        ],
        "rating": {
            "overall": 4.5,
            "quality": 4.6,
            "delivery": 4.4,
            "price": 4.3,
            "service": 4.7,
        },
        "performance": {
            "on_time_delivery_rate": 95,
            "quality_pass_rate": 98,
            "average_response_time": "4小时",
            "cooperation_years": 5,
            "total_orders": 156,
            "total_amount": 8500000,
        },
        "supplied_materials": [
            {"material_id": "MAT-0001", "material_code": "M000001", "material_name": "智能传感器A1", "unit_price": 50.0, "moq": 100, "lead_time": 7},
            {"material_id": "MAT-0002", "material_code": "M000002", "material_name": "控制模块B2", "unit_price": 120.0, "moq": 50, "lead_time": 14},
            {"material_id": "MAT-0003", "material_code": "M000003", "material_name": "电源模块C3", "unit_price": 80.0, "moq": 200, "lead_time": 10},
        ],
        "recent_orders": [
            {"order_id": "PO-00000001", "order_number": "PO202608001", "amount": 50000, "status": "received", "created_at": "2026-08-01"},
            {"order_id": "PO-00000002", "order_number": "PO202608002", "amount": 35000, "status": "partial_received", "created_at": "2026-08-10"},
            {"order_id": "PO-00000003", "order_number": "PO202608003", "amount": 80000, "status": "sent", "created_at": "2026-08-20"},
        ],
        "contracts": [
            {"id": "CON-001", "name": "2026年度框架协议", "start_date": "2026-01-01", "end_date": "2026-12-31", "status": "active"},
        ],
        "created_at": "2021-03-15T10:00:00Z",
        "updated_at": "2026-08-25T14:00:00Z",
    })
}

/// 生成 Mock 采购订单列表
fn generate_mock_purchase_orders(
    status_filter: &str,
    supplier_filter: &str,
    keyword_filter: &str,
) -> Vec<Value> {
    let statuses = [
        "draft",
        "pending_approval",
        "approved",
        "sent",
        "partial_received",
        "received",
        "closed",
        "cancelled",
    ];

    (0..120)
        .map(|i| {
            let status = statuses[i % statuses.len()];

            json!({
                "order_id": format!("PO-{:08}", i + 1),
                "order_number": format!("PO2026{:06}", i + 1),
                "supplier_id": format!("SUP-{:04}", (i % 20) + 1),
                "supplier_name": format!("供应商{:03}", (i % 20) + 1),
                "status": status,
                "total_amount": 5000 + (i % 20) * 5000,
                "currency": "CNY",
                "item_count": 1 + (i % 5),
                "creator": format!("采购员{:02}", (i % 5) + 1),
                "approver": if status != "draft" && status != "cancelled" { Some(format!("采购经理{:02}", (i % 3) + 1)) } else { None },
                "created_at": format!("2026-08-{:02}T{:02}:{:02}:00Z", (i % 26) + 1, (i % 24), (i % 60)),
                "expected_delivery_date": format!("2026-09-{:02}", (i % 28) + 1),
                "actual_delivery_date": if status == "received" || status == "closed" { Some(format!("2026-09-{:02}", (i % 28) + 1)) } else { None },
            })
        })
        .filter(|o| {
            (status_filter.is_empty() || o["status"].as_str() == Some(status_filter))
                && (supplier_filter.is_empty() || o["supplier_id"].as_str() == Some(supplier_filter))
                && (keyword_filter.is_empty() || o["order_number"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_mcp::protocol::McpContent;

    #[tokio::test]
    #[ignore = "需要 SCM_SERVICE_URL 指向真实服务时手动运行"]
    async fn test_scm_list_suppliers_real_api() {
        if std::env::var("SCM_SERVICE_URL").is_err() {
            eprintln!("SKIP: 未设置 SCM_SERVICE_URL");
            return;
        }
        let server = McpServer::new("test", "1.0.0");
        register_scm_tools(&server, "test-secret").await;
        let result = server
            .tool_registry()
            .call_tool("scm.list_suppliers", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();
        let text = match &result.content[0] {
            McpContent::Text { text } => text.clone(),
            _ => String::new(),
        };
        let parsed: Value = serde_json::from_str(&text).unwrap_or(json!({}));
        let total = parsed["total"].as_u64().unwrap_or(0);
        assert!(total > 0, "真实 API 应返回数据，total={}", total);
        eprintln!("scm.list_suppliers 真实调用返回 total = {}", total);
    }

    #[tokio::test]
    async fn test_register_scm_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_scm_tools(&server, "test-secret").await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("scm.list_suppliers").await);
        assert!(registry.has_tool("scm.get_supplier").await);
        assert!(registry.has_tool("scm.list_purchase_orders").await);
        assert!(registry.has_tool("scm.create_purchase_order").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_suppliers() {
        let server = McpServer::new("test", "1.0.0");
        register_scm_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("scm.list_suppliers", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["suppliers"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_supplier() {
        let server = McpServer::new("test", "1.0.0");
        register_scm_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("scm.get_supplier", json!({"supplier_id": "SUP-0001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["supplier_id"], "SUP-0001");
            assert!(parsed["bank_account"].is_object());
            assert!(parsed["certificates"].is_array());
            assert!(parsed["rating"].is_object());
            assert!(parsed["performance"].is_object());
            assert!(parsed["supplied_materials"].is_array());
            assert!(parsed["recent_orders"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_purchase_orders() {
        let server = McpServer::new("test", "1.0.0");
        register_scm_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "scm.list_purchase_orders",
                json!({"page": 1, "page_size": 10, "status": "approved"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["purchase_orders"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_purchase_order() {
        let server = McpServer::new("test", "1.0.0");
        register_scm_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("scm.create_purchase_order", json!({
                "supplier_id": "SUP-0001",
                "items": [
                    {"material_id": "MAT-0001", "material_code": "M000001", "material_name": "智能传感器A1", "quantity": 100, "unit_price": 50.0, "unit": "个"},
                    {"material_id": "MAT-0002", "material_code": "M000002", "material_name": "控制模块B2", "quantity": 50, "unit_price": 120.0, "unit": "个"}
                ],
                "expected_delivery_date": "2026-09-15",
                "payment_terms": "月结30天",
                "remark": "紧急订单",
                "creator": "张三"
            }))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["supplier_id"], "SUP-0001");
            assert_eq!(parsed["total_amount"], 11000.0);
            assert_eq!(parsed["status"], "draft");
            assert!(parsed["items"].is_array());
            assert_eq!(parsed["items"].as_array().unwrap().len(), 2);
            assert!(parsed["order_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_purchase_order_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_scm_tools(&server, "test-secret").await;

        // 缺少 supplier_id
        let result = server
            .tool_registry()
            .call_tool(
                "scm.create_purchase_order",
                json!({
                    "items": [{"material_id": "MAT-0001", "quantity": 100, "unit_price": 50.0}]
                }),
            )
            .await;
        assert!(result.is_err());

        // items 为空
        let result = server
            .tool_registry()
            .call_tool(
                "scm.create_purchase_order",
                json!({
                    "supplier_id": "SUP-0001",
                    "items": []
                }),
            )
            .await;
        assert!(result.is_err());
    }
}
