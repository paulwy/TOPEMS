//! MES MCP Tools — 制造执行系统业务工具。
//!
//! 注册 4 个 MES 业务工具到 MCP Server：
//! - mes.list_production_orders — 查询生产订单列表
//! - mes.get_production_order — 获取生产订单详情
//! - mes.list_work_orders — 查询工单列表
//! - mes.get_oee_dashboard — 获取OEE仪表盘数据
//!
//! 当前版本优先调用真实 MES 服务（网关 8099 / MES_SERVICE_URL），调用失败时回退 mock 数据。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;
use super::super::tools::{http_call, service_base_url, url_encode};

/// 注册 MES 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - mes.list_production_orders — 查询生产订单列表（支持分页、状态筛选）
/// - mes.get_production_order — 获取生产订单详情（按ID）
/// - mes.list_work_orders — 查询工单列表（支持分页、工序筛选）
/// - mes.get_oee_dashboard — 获取OEE仪表盘数据（时间范围、车间筛选）
pub async fn register_mes_tools(server: &McpServer, _jwt_secret: &str) {
    let registry = server.tool_registry();

    // 1. mes.list_production_orders
    registry
        .register(
            "mes.list_production_orders",
            "查询MES生产订单列表，支持分页和状态筛选。返回生产订单的基本信息列表，包括订单号、产品、数量、计划开始/结束时间、状态、进度等。",
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
                        .enum_values(&["planned", "released", "in_progress", "completed", "cancelled"]),
                )
                .property(
                    "workshop",
                    SchemaBuilder::string().description("车间筛选"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let status = params["status"].as_str().unwrap_or("");
                let workshop = params["workshop"].as_str().unwrap_or("");

                let base = service_base_url("MES_SERVICE_URL", 8030);
                let mut path = format!("/api/mes/orders?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                let mut real = None;
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    if let Some(list) = data.get("orders").cloned() {
                        real = Some(json!({
                            "total": data.get("total").cloned().unwrap_or(json!(list.as_array().map(|a| a.len()).unwrap_or(0))),
                            "page": page,
                            "page_size": page_size,
                            "orders": list,
                        }));
                    }
                }
                let orders = real.map(|r| r["orders"].as_array().cloned().unwrap_or_default()).unwrap_or_else(|| {
                    generate_mock_production_orders(status, workshop)
                });
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

    // 2. mes.get_production_order
    registry
        .register(
            "mes.get_production_order",
            "获取MES生产订单详情，按订单ID查询。返回订单的完整信息，包括产品明细、BOM、工艺路线、生产进度、质量检验、物料消耗等。",
            SchemaBuilder::object()
                .property(
                    "order_id",
                    SchemaBuilder::string().description("生产订单ID"),
                )
                .required(&["order_id"])
                .build(),
            |params| {
                let order_id = params["order_id"].as_str().unwrap_or("");

                if order_id.is_empty() {
                    return Err(ToolExecutionError::Validation("order_id is required".to_string()));
                }

                let base = service_base_url("MES_SERVICE_URL", 8030);
                let order = if let Some(data) = http_call(&base, "GET", &format!("/api/mes/orders/{}", url_encode(&order_id)), None) {
                    data
                } else {
                    generate_mock_production_order_detail(order_id)
                };

                Ok(McpToolResult {
                    content: vec![McpContent::text(order.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. mes.list_work_orders
    registry
        .register(
            "mes.list_work_orders",
            "查询MES工单列表，支持分页和工序/设备筛选。返回工单的基本信息列表，包括工单号、工序、设备、操作员、开始/结束时间、状态、合格/不合格数量等。",
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
                        .description("工单状态筛选")
                        .enum_values(&["pending", "in_progress", "paused", "completed", "scrapped"]),
                )
                .property(
                    "process",
                    SchemaBuilder::string().description("工序筛选"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let status = params["status"].as_str().unwrap_or("");
                let process = params["process"].as_str().unwrap_or("");

                let base = service_base_url("MES_SERVICE_URL", 8030);
                let mut path = format!("/api/mes/work-orders?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                let mut real = None;
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    if let Some(list) = data.get("work_orders").cloned() {
                        real = Some(json!({
                            "total": data.get("total").cloned().unwrap_or(json!(list.as_array().map(|a| a.len()).unwrap_or(0))),
                            "page": page,
                            "page_size": page_size,
                            "work_orders": list,
                        }));
                    }
                }
                let work_orders = real.map(|r| r["work_orders"].as_array().cloned().unwrap_or_default()).unwrap_or_else(|| {
                    generate_mock_work_orders(status, process)
                });
                let total = work_orders.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_work_orders = &work_orders[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "work_orders": page_work_orders,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. mes.get_oee_dashboard
    registry
        .register(
            "mes.get_oee_dashboard",
            "获取MES OEE（设备综合效率）仪表盘数据。支持时间范围和车间筛选，返回OEE三大指标（可用率、性能率、质量率）及综合OEE，以及设备排名、趋势分析等。",
            SchemaBuilder::object()
                .property(
                    "from",
                    SchemaBuilder::string().description("开始日期时间（ISO 8601格式）"),
                )
                .property(
                    "to",
                    SchemaBuilder::string().description("结束日期时间（ISO 8601格式）"),
                )
                .property(
                    "workshop",
                    SchemaBuilder::string().description("车间筛选（可选，不填则全部车间）"),
                )
                .property(
                    "equipment_id",
                    SchemaBuilder::string().description("设备ID筛选（可选）"),
                )
                .required(&["from", "to"])
                .build(),
            |params| {
                let from = params["from"].as_str().unwrap_or("");
                let to = params["to"].as_str().unwrap_or("");

                if from.is_empty() {
                    return Err(ToolExecutionError::Validation("from is required".to_string()));
                }
                if to.is_empty() {
                    return Err(ToolExecutionError::Validation("to is required".to_string()));
                }

                let base = service_base_url("MES_SERVICE_URL", 8030);
                let path = format!(
                    "/api/mes/equipment-oee/statistics?from={}&to={}",
                    url_encode(&from), url_encode(&to)
                );
                let dashboard = if let Some(data) = http_call(&base, "GET", &path, None) {
                    data
                } else {
                    generate_mock_oee_dashboard(from, to)
                };

                Ok(McpToolResult {
                    content: vec![McpContent::text(dashboard.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("MES MCP Tools registered: 4 tools (mes.list_production_orders, mes.get_production_order, mes.list_work_orders, mes.get_oee_dashboard)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 生产订单列表
fn generate_mock_production_orders(status_filter: &str, workshop_filter: &str) -> Vec<Value> {
    let statuses = [
        "planned",
        "released",
        "in_progress",
        "completed",
        "cancelled",
    ];
    let workshops = ["一车间", "二车间", "三车间", "装配车间"];
    let products = [
        "智能传感器A1",
        "数据采集模块B2",
        "工业网关C3",
        "控制器D4",
        "显示屏E5",
    ];

    (0..100)
        .map(|i| {
            let status = statuses[i % statuses.len()];
            let workshop = workshops[i % workshops.len()];
            let product = products[i % products.len()];
            let progress = if status == "completed" {
                100
            } else if status == "in_progress" {
                (i * 7) % 90 + 10
            } else {
                0
            };

            json!({
                "order_id": format!("PO-{:08}", i + 1),
                "order_number": format!("MO2026{:06}", i + 1),
                "product_code": format!("PRD-{:04}", (i % 50) + 1),
                "product_name": product,
                "workshop": workshop,
                "planned_quantity": 100 + (i % 10) * 50,
                "completed_quantity": if progress == 100 { 100 + (i % 10) * 50 } else { (100 + (i % 10) * 50) * progress / 100 },
                "unit": "件",
                "status": status,
                "progress": progress,
                "planned_start": format!("2026-08-{:02}T08:00:00Z", (i % 26) + 1),
                "planned_end": format!("2026-08-{:02}T18:00:00Z", ((i + 3) % 26) + 1),
                "priority": if i % 3 == 0 { "high" } else if i % 3 == 1 { "medium" } else { "low" },
            })
        })
        .filter(|o| {
            (status_filter.is_empty() || o["status"].as_str() == Some(status_filter))
                && (workshop_filter.is_empty() || o["workshop"].as_str() == Some(workshop_filter))
        })
        .collect()
}

/// 生成 Mock 生产订单详情
fn generate_mock_production_order_detail(order_id: &str) -> Value {
    json!({
        "order_id": order_id,
        "order_number": "MO2026001001",
        "product_code": "PRD-0001",
        "product_name": "智能传感器A1",
        "specification": "型号A1-2026，精度±0.1%",
        "workshop": "一车间",
        "production_line": "生产线A",
        "planned_quantity": 500,
        "completed_quantity": 320,
        "scrapped_quantity": 5,
        "unit": "件",
        "status": "in_progress",
        "progress": 64,
        "planned_start": "2026-08-20T08:00:00Z",
        "planned_end": "2026-08-25T18:00:00Z",
        "actual_start": "2026-08-20T09:30:00Z",
        "priority": "high",
        "sales_order": "SO2026000500",
        "customer": "北京图宇科技有限公司",
        "bom_items": [
            {"material_code": "MAT-001", "material_name": "芯片模组", "quantity": 1, "unit": "个", "consumed": 320},
            {"material_code": "MAT-002", "material_name": "外壳", "quantity": 1, "unit": "个", "consumed": 320},
            {"material_code": "MAT-003", "material_name": "电路板", "quantity": 1, "unit": "块", "consumed": 320},
        ],
        "process_route": [
            {"process_code": "P01", "process_name": "SMT贴片", "workstation": "SMT-01", "status": "completed"},
            {"process_code": "P02", "process_name": "焊接", "workstation": "WELD-01", "status": "completed"},
            {"process_code": "P03", "process_name": "组装", "workstation": "ASM-01", "status": "in_progress"},
            {"process_code": "P04", "process_name": "测试", "workstation": "TEST-01", "status": "pending"},
            {"process_code": "P05", "process_name": "包装", "workstation": "PKG-01", "status": "pending"},
        ],
        "quality_inspection": {
            "inspected": 320,
            "passed": 315,
            "failed": 5,
            "pass_rate": 98.44,
            "defects": [
                {"type": "焊接不良", "count": 3},
                {"type": "外观划伤", "count": 2},
            ],
        },
        "created_at": "2026-08-18T10:00:00Z",
        "updated_at": "2026-08-23T15:30:00Z",
    })
}

/// 生成 Mock 工单列表
fn generate_mock_work_orders(status_filter: &str, process_filter: &str) -> Vec<Value> {
    let statuses = ["pending", "in_progress", "paused", "completed", "scrapped"];
    let processes = ["SMT贴片", "焊接", "组装", "测试", "包装", "调试"];
    let equipments = [
        "SMT-01", "SMT-02", "WELD-01", "WELD-02", "ASM-01", "TEST-01", "PKG-01",
    ];
    let operators = ["张三", "李四", "王五", "赵六", "钱七"];

    (0..200)
        .map(|i| {
            let status = statuses[i % statuses.len()];
            let process = processes[i % processes.len()];
            let equipment = equipments[i % equipments.len()];
            let operator = operators[i % operators.len()];
            let planned_qty = 50 + (i % 10) * 10;
            let completed_qty = if status == "completed" {
                planned_qty
            } else if status == "in_progress" {
                planned_qty / 2
            } else {
                0
            };

            json!({
                "work_order_id": format!("WO-{:08}", i + 1),
                "work_order_number": format!("WO2026{:06}", i + 1),
                "production_order_id": format!("PO-{:08}", (i / 5) + 1),
                "process_code": format!("P{:02}", (i % 6) + 1),
                "process_name": process,
                "equipment_id": equipment,
                "equipment_name": format!("设备{}", equipment),
                "operator": operator,
                "planned_quantity": planned_qty,
                "completed_quantity": completed_qty,
                "scrapped_quantity": if i % 20 == 0 { 2 } else { 0 },
                "status": status,
                "start_time": if status != "pending" { Some(format!("2026-08-{:02}T08:00:00Z", (i % 26) + 1)) } else { None },
                "end_time": if status == "completed" { Some(format!("2026-08-{:02}T17:00:00Z", (i % 26) + 1)) } else { None },
                "standard_cycle_time": 120,
                "actual_cycle_time": if status == "completed" { Some(115 + (i % 10)) } else { None },
            })
        })
        .filter(|w| {
            (status_filter.is_empty() || w["status"].as_str() == Some(status_filter))
                && (process_filter.is_empty() || w["process_name"].as_str() == Some(process_filter))
        })
        .collect()
}

/// 生成 Mock OEE 仪表盘数据
fn generate_mock_oee_dashboard(from: &str, to: &str) -> Value {
    json!({
        "period": {
            "from": from,
            "to": to,
        },
        "summary": {
            "availability": 85.6,
            "performance": 92.3,
            "quality": 98.7,
            "oee": 78.1,
            "target_oee": 85.0,
            "gap": -6.9,
        },
        "availability_breakdown": {
            "planned_production_time": 480,
            "run_time": 411,
            "downtime": 69,
            "downtime_reasons": [
                {"reason": "设备故障", "duration": 30, "percentage": 43.5},
                {"reason": "换型调整", "duration": 20, "percentage": 29.0},
                {"reason": "物料短缺", "duration": 12, "percentage": 17.4},
                {"reason": "其他", "duration": 7, "percentage": 10.1},
            ],
        },
        "performance_breakdown": {
            "ideal_cycle_time": 120,
            "actual_cycle_time": 130,
            "speed_loss": 10,
            "minor_stops": 5,
        },
        "quality_breakdown": {
            "total_produced": 1200,
            "good_parts": 1184,
            "defective_parts": 16,
            "defect_rate": 1.33,
            "top_defects": [
                {"type": "尺寸偏差", "count": 6},
                {"type": "外观不良", "count": 5},
                {"type": "功能故障", "count": 3},
                {"type": "其他", "count": 2},
            ],
        },
        "equipment_ranking": [
            {"equipment_id": "SMT-01", "equipment_name": "SMT贴片机1", "oee": 88.5, "availability": 92.0, "performance": 95.0, "quality": 99.2},
            {"equipment_id": "WELD-01", "equipment_name": "焊接机1", "oee": 82.3, "availability": 88.0, "performance": 90.5, "quality": 98.5},
            {"equipment_id": "ASM-01", "equipment_name": "组装线1", "oee": 75.8, "availability": 82.0, "performance": 91.0, "quality": 98.0},
            {"equipment_id": "TEST-01", "equipment_name": "测试台1", "oee": 70.2, "availability": 78.0, "performance": 88.5, "quality": 97.8},
        ],
        "trend": [
            {"date": "2026-08-20", "oee": 75.2},
            {"date": "2026-08-21", "oee": 77.8},
            {"date": "2026-08-22", "oee": 76.5},
            {"date": "2026-08-23", "oee": 79.1},
            {"date": "2026-08-24", "oee": 78.1},
        ],
        "generated_at": chrono::Utc::now().to_rfc3339(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_mes_tools() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_mes_tools(&server, "test-secret").await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("mes.list_production_orders").await);
        assert!(registry.has_tool("mes.get_production_order").await);
        assert!(registry.has_tool("mes.list_work_orders").await);
        assert!(registry.has_tool("mes.get_oee_dashboard").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_production_orders() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_mes_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "mes.list_production_orders",
                json!({"page": 1, "page_size": 5}),
            )
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
    async fn test_get_production_order() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_mes_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "mes.get_production_order",
                json!({"order_id": "PO-00000001"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["order_id"], "PO-00000001");
            assert!(parsed["bom_items"].is_array());
            assert!(parsed["process_route"].is_array());
            assert!(parsed["quality_inspection"].is_object());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_work_orders() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_mes_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "mes.list_work_orders",
                json!({"page": 1, "page_size": 10, "status": "in_progress"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["work_orders"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_oee_dashboard() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_mes_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "mes.get_oee_dashboard",
                json!({"from": "2026-08-20T00:00:00Z", "to": "2026-08-24T23:59:59Z"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert!(parsed["summary"].is_object());
            assert!(parsed["summary"]["oee"].is_number());
            assert!(parsed["equipment_ranking"].is_array());
            assert!(parsed["trend"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_oee_dashboard_validation() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_mes_tools(&server, "test-secret").await;

        // 缺少 from
        let result = server
            .tool_registry()
            .call_tool(
                "mes.get_oee_dashboard",
                json!({"to": "2026-08-24T23:59:59Z"}),
            )
            .await;
        assert!(result.is_err());

        // 缺少 to
        let result = server
            .tool_registry()
            .call_tool(
                "mes.get_oee_dashboard",
                json!({"from": "2026-08-20T00:00:00Z"}),
            )
            .await;
        assert!(result.is_err());
    }
}
