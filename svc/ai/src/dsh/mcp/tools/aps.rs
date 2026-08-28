//! APS MCP Tools — 高级计划与排程系统业务工具。
//!
//! 注册 4 个 APS 业务工具到 MCP Server：
//! - aps.list_schedules — 查询排程列表
//! - aps.get_schedule — 获取排程详情
//! - aps.list_resources — 查询资源列表
//! - aps.create_schedule — 创建排程
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 APS API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 注册 APS 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - aps.list_schedules — 查询排程列表（支持分页、类型筛选、状态筛选）
/// - aps.get_schedule — 获取排程详情（按ID）
/// - aps.list_resources — 查询资源列表（支持分页、类型筛选、状态筛选）
/// - aps.create_schedule — 创建排程（类型、订单、资源、开始/结束时间）
pub async fn register_aps_tools(server: &McpServer) {
    let registry = server.tool_registry();

    // 1. aps.list_schedules
    registry
        .register(
            "aps.list_schedules",
            "查询APS排程列表，支持分页、类型筛选和状态筛选。返回排程的基本信息列表，包括排程编号、类型、订单、资源、开始/结束时间、状态、优先级等。",
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
                    "schedule_type",
                    SchemaBuilder::string()
                        .description("排程类型筛选")
                        .enum_values(&["production", "maintenance", "setup", "teardown", "inspection"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("排程状态筛选")
                        .enum_values(&["planned", "released", "in_progress", "completed", "cancelled", "delayed"]),
                )
                .property(
                    "resource_id",
                    SchemaBuilder::string().description("资源ID筛选"),
                )
                .property(
                    "order_id",
                    SchemaBuilder::string().description("订单ID筛选"),
                )
                .property(
                    "start_date",
                    SchemaBuilder::string().description("开始日期筛选（YYYY-MM-DD）"),
                )
                .property(
                    "end_date",
                    SchemaBuilder::string().description("结束日期筛选（YYYY-MM-DD）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let schedule_type = params["schedule_type"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let resource_id = params["resource_id"].as_str().unwrap_or("");
                let order_id = params["order_id"].as_str().unwrap_or("");

                let schedules = generate_mock_schedules(schedule_type, status, resource_id, order_id);
                let total = schedules.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_schedules = &schedules[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "schedules": page_schedules,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. aps.get_schedule
    registry
        .register(
            "aps.get_schedule",
            "获取APS排程详情，按排程ID查询。返回排程的完整信息，包括基本信息、订单信息、资源信息、工序序列、时间计划、物料需求、约束条件等。",
            SchemaBuilder::object()
                .property(
                    "schedule_id",
                    SchemaBuilder::string().description("排程ID"),
                )
                .required(&["schedule_id"])
                .build(),
            |params| {
                let schedule_id = params["schedule_id"].as_str().unwrap_or("");

                if schedule_id.is_empty() {
                    return Err(ToolExecutionError::Validation("schedule_id is required".to_string()));
                }

                let schedule = generate_mock_schedule_detail(schedule_id);

                Ok(McpToolResult {
                    content: vec![McpContent::text(schedule.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. aps.list_resources
    registry
        .register(
            "aps.list_resources",
            "查询APS资源列表，支持分页、类型筛选和状态筛选。返回资源的基本信息列表，包括资源编号、名称、类型、状态、产能、效率、所属车间、当前负载等。",
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
                    "resource_type",
                    SchemaBuilder::string()
                        .description("资源类型筛选")
                        .enum_values(&["machine", "labor", "tool", "fixture", "line", "workstation"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("资源状态筛选")
                        .enum_values(&["idle", "busy", "maintenance", "offline", "reserved"]),
                )
                .property(
                    "workshop",
                    SchemaBuilder::string().description("车间筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配资源编号、名称）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let resource_type = params["resource_type"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let workshop = params["workshop"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                let resources = generate_mock_resources(resource_type, status, workshop, keyword);
                let total = resources.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_resources = &resources[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "resources": page_resources,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. aps.create_schedule
    registry
        .register(
            "aps.create_schedule",
            "创建APS排程。需要提供排程类型、订单ID、资源ID和开始时间，返回新创建的排程ID和排程编号。",
            SchemaBuilder::object()
                .property(
                    "schedule_type",
                    SchemaBuilder::string()
                        .description("排程类型")
                        .enum_values(&["production", "maintenance", "setup", "teardown", "inspection"]),
                )
                .property(
                    "order_id",
                    SchemaBuilder::string().description("订单ID"),
                )
                .property(
                    "resource_id",
                    SchemaBuilder::string().description("资源ID"),
                )
                .property(
                    "start_time",
                    SchemaBuilder::string().description("开始时间（YYYY-MM-DD HH:mm:ss）"),
                )
                .property(
                    "end_time",
                    SchemaBuilder::string().description("结束时间（YYYY-MM-DD HH:mm:ss）"),
                )
                .property(
                    "quantity",
                    SchemaBuilder::integer().description("计划数量").minimum(1.0),
                )
                .property(
                    "priority",
                    SchemaBuilder::string()
                        .description("优先级")
                        .enum_values(&["low", "medium", "high", "urgent"])
                        .default(json!("medium")),
                )
                .property(
                    "operator",
                    SchemaBuilder::string().description("操作人"),
                )
                .property(
                    "remark",
                    SchemaBuilder::string().description("备注"),
                )
                .required(&["schedule_type", "order_id", "resource_id", "start_time"])
                .build(),
            |params| {
                let schedule_type = params["schedule_type"].as_str().unwrap_or("");
                let order_id = params["order_id"].as_str().unwrap_or("");
                let resource_id = params["resource_id"].as_str().unwrap_or("");
                let start_time = params["start_time"].as_str().unwrap_or("");

                if schedule_type.is_empty() {
                    return Err(ToolExecutionError::Validation("schedule_type is required".to_string()));
                }
                if order_id.is_empty() {
                    return Err(ToolExecutionError::Validation("order_id is required".to_string()));
                }
                if resource_id.is_empty() {
                    return Err(ToolExecutionError::Validation("resource_id is required".to_string()));
                }
                if start_time.is_empty() {
                    return Err(ToolExecutionError::Validation("start_time is required".to_string()));
                }

                let schedule_id = format!("SCH-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("00000000"));
                let schedule_number = format!("APS{}{:06}", chrono::Utc::now().format("%Y%m%d"), 1001);

                let result = json!({
                    "schedule_id": schedule_id,
                    "schedule_number": schedule_number,
                    "schedule_type": schedule_type,
                    "order_id": order_id,
                    "resource_id": resource_id,
                    "start_time": start_time,
                    "end_time": params["end_time"].as_str().unwrap_or(""),
                    "quantity": params["quantity"].as_i64().unwrap_or(0),
                    "priority": params["priority"].as_str().unwrap_or("medium"),
                    "operator": params["operator"].as_str().unwrap_or(""),
                    "remark": params["remark"].as_str().unwrap_or(""),
                    "status": "planned",
                    "created_at": chrono::Utc::now().to_rfc3339(),
                    "message": "排程创建成功，已分配排程编号，等待排程引擎确认",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("APS MCP Tools registered: 4 tools (aps.list_schedules, aps.get_schedule, aps.list_resources, aps.create_schedule)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 排程列表
fn generate_mock_schedules(type_filter: &str, status_filter: &str, resource_filter: &str, order_filter: &str) -> Vec<Value> {
    let types = ["production", "maintenance", "setup", "teardown", "inspection"];
    let statuses = ["planned", "released", "in_progress", "completed", "cancelled", "delayed"];
    let priorities = ["low", "medium", "high", "urgent"];

    (0..150)
        .map(|i| {
            let schedule_type = types[i % types.len()];
            let status = statuses[i % statuses.len()];
            let priority = priorities[i % priorities.len()];

            json!({
                "schedule_id": format!("SCH-{:08}", i + 1),
                "schedule_number": format!("APS2026{:06}", i + 1),
                "schedule_type": schedule_type,
                "order_id": format!("ORD-{:08}", (i % 30) + 1),
                "order_number": format!("MO2026{:06}", (i % 30) + 1),
                "resource_id": format!("RES-{:04}", (i % 20) + 1),
                "resource_name": format!("设备{:03}", (i % 20) + 1),
                "start_time": format!("2026-08-{:02} {:02}:00:00", (i % 26) + 1, (i % 24)),
                "end_time": format!("2026-08-{:02} {:02}:00:00", (i % 26) + 1, ((i + 4) % 24)),
                "quantity": 100 + (i % 10) * 50,
                "completed_quantity": if status == "completed" { 100 + (i % 10) * 50 } else { i % 50 },
                "priority": priority,
                "status": status,
                "operator": format!("操作员{:02}", (i % 10) + 1),
                "progress": if status == "completed" { 100 } else if status == "planned" { 0 } else { (i * 13) % 90 + 10 },
                "created_at": format!("2026-08-{:02}T10:00:00Z", (i % 26) + 1),
            })
        })
        .filter(|s| {
            (type_filter.is_empty() || s["schedule_type"].as_str() == Some(type_filter))
                && (status_filter.is_empty() || s["status"].as_str() == Some(status_filter))
                && (resource_filter.is_empty() || s["resource_id"].as_str() == Some(resource_filter))
                && (order_filter.is_empty() || s["order_id"].as_str() == Some(order_filter))
        })
        .collect()
}

/// 生成 Mock 排程详情
fn generate_mock_schedule_detail(schedule_id: &str) -> Value {
    json!({
        "schedule_id": schedule_id,
        "schedule_number": "APS2026001001",
        "schedule_type": "production",
        "status": "in_progress",
        "priority": "high",
        "order": {
            "order_id": "ORD-00000001",
            "order_number": "MO2026001001",
            "product_name": "智能传感器A1",
            "quantity": 500,
            "due_date": "2026-08-30",
            "customer": "某科技有限公司",
        },
        "resource": {
            "resource_id": "RES-0001",
            "resource_name": "CNC加工中心01",
            "resource_type": "machine",
            "workshop": "一车间",
            "capacity": 24,
            "efficiency": 95,
        },
        "time_plan": {
            "start_time": "2026-08-26 08:00:00",
            "end_time": "2026-08-26 16:00:00",
            "planned_duration": 480,
            "actual_start": "2026-08-26 08:15:00",
            "elapsed_time": 240,
            "remaining_time": 240,
        },
        "operations": [
            {"id": "OP-001", "name": "下料", "sequence": 1, "resource": "切割机01", "start_time": "2026-08-26 08:00:00", "end_time": "2026-08-26 09:00:00", "status": "completed", "operator": "张三"},
            {"id": "OP-002", "name": "粗加工", "sequence": 2, "resource": "CNC加工中心01", "start_time": "2026-08-26 09:00:00", "end_time": "2026-08-26 12:00:00", "status": "completed", "operator": "李四"},
            {"id": "OP-003", "name": "精加工", "sequence": 3, "resource": "CNC加工中心01", "start_time": "2026-08-26 13:00:00", "end_time": "2026-08-26 15:00:00", "status": "in_progress", "operator": "李四"},
            {"id": "OP-004", "name": "质检", "sequence": 4, "resource": "质检台01", "start_time": "2026-08-26 15:00:00", "end_time": "2026-08-26 16:00:00", "status": "planned", "operator": "王五"},
        ],
        "material_requirements": [
            {"material_id": "MAT-0001", "material_name": "铝合金板", "quantity": 50, "unit": "kg", "available": true},
            {"material_id": "MAT-0002", "material_name": "螺丝M3", "quantity": 2000, "unit": "个", "available": true},
            {"material_id": "MAT-0003", "material_name": "电子元件包", "quantity": 500, "unit": "套", "available": false},
        ],
        "constraints": [
            {"type": "resource_capacity", "description": "CNC加工中心01每日可用24小时"},
            {"type": "material_availability", "description": "电子元件包库存不足，需紧急采购"},
            {"type": "labor_skill", "description": "精加工需要CNC中级以上技能"},
            {"type": "tooling", "description": "需要专用夹具JIG-001"},
        ],
        "progress": {
            "total_operations": 4,
            "completed_operations": 2,
            "in_progress_operations": 1,
            "planned_operations": 1,
            "completion_rate": 50,
            "quantity_completed": 250,
            "quantity_total": 500,
        },
        "operator": "李四",
        "created_at": "2026-08-25T10:00:00Z",
        "updated_at": "2026-08-26T12:00:00Z",
    })
}

/// 生成 Mock 资源列表
fn generate_mock_resources(type_filter: &str, status_filter: &str, workshop_filter: &str, keyword_filter: &str) -> Vec<Value> {
    let types = ["machine", "labor", "tool", "fixture", "line", "workstation"];
    let statuses = ["idle", "busy", "busy", "maintenance", "offline", "reserved"];
    let workshops = ["一车间", "二车间", "三车间", "装配车间", "质检车间"];

    (0..80)
        .map(|i| {
            let resource_type = types[i % types.len()];
            let status = statuses[i % statuses.len()];
            let workshop = workshops[i % workshops.len()];

            json!({
                "resource_id": format!("RES-{:04}", i + 1),
                "resource_code": format!("R{:04}", i + 1),
                "resource_name": format!("{}{:03}", if resource_type == "machine" { "设备" } else if resource_type == "labor" { "人员" } else if resource_type == "tool" { "刀具" } else if resource_type == "fixture" { "夹具" } else if resource_type == "line" { "产线" } else { "工位" }, i + 1),
                "resource_type": resource_type,
                "status": status,
                "workshop": workshop,
                "capacity": if resource_type == "machine" { 24 } else if resource_type == "labor" { 8 } else { 16 },
                "efficiency": 85 + (i % 15),
                "current_load": if status == "busy" { 60 + (i % 40) } else { 0 },
                "utilization_rate": if status == "busy" { 60 + (i % 40) } else { 0 },
                "last_maintenance": format!("2026-{:02}-{:02}", (i % 12) + 1, (i % 28) + 1),
                "next_maintenance": format!("2026-{:02}-{:02}", ((i + 3) % 12) + 1, ((i + 10) % 28) + 1),
                "created_at": format!("2026-{:02}-{:02}T10:00:00Z", (i % 12) + 1, (i % 28) + 1),
            })
        })
        .filter(|r| {
            (type_filter.is_empty() || r["resource_type"].as_str() == Some(type_filter))
                && (status_filter.is_empty() || r["status"].as_str() == Some(status_filter))
                && (workshop_filter.is_empty() || r["workshop"].as_str() == Some(workshop_filter))
                && (keyword_filter.is_empty()
                    || r["resource_code"].as_str().unwrap_or("").contains(keyword_filter)
                    || r["resource_name"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_aps_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_aps_tools(&server).await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("aps.list_schedules").await);
        assert!(registry.has_tool("aps.get_schedule").await);
        assert!(registry.has_tool("aps.list_resources").await);
        assert!(registry.has_tool("aps.create_schedule").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_schedules() {
        let server = McpServer::new("test", "1.0.0");
        register_aps_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("aps.list_schedules", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["schedules"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_schedule() {
        let server = McpServer::new("test", "1.0.0");
        register_aps_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("aps.get_schedule", json!({"schedule_id": "SCH-00000001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["schedule_id"], "SCH-00000001");
            assert!(parsed["order"].is_object());
            assert!(parsed["resource"].is_object());
            assert!(parsed["operations"].is_array());
            assert!(parsed["material_requirements"].is_array());
            assert!(parsed["constraints"].is_array());
            assert!(parsed["progress"].is_object());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_resources() {
        let server = McpServer::new("test", "1.0.0");
        register_aps_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("aps.list_resources", json!({"page": 1, "page_size": 10, "status": "busy"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["resources"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_schedule() {
        let server = McpServer::new("test", "1.0.0");
        register_aps_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("aps.create_schedule", json!({
                "schedule_type": "production",
                "order_id": "ORD-00000001",
                "resource_id": "RES-0001",
                "start_time": "2026-08-27 08:00:00",
                "end_time": "2026-08-27 16:00:00",
                "quantity": 500,
                "priority": "high",
                "operator": "李四",
                "remark": "紧急订单"
            }))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["schedule_type"], "production");
            assert_eq!(parsed["order_id"], "ORD-00000001");
            assert_eq!(parsed["resource_id"], "RES-0001");
            assert_eq!(parsed["quantity"], 500);
            assert_eq!(parsed["priority"], "high");
            assert_eq!(parsed["status"], "planned");
            assert!(parsed["schedule_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_schedule_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_aps_tools(&server).await;

        // 缺少 resource_id
        let result = server
            .tool_registry()
            .call_tool("aps.create_schedule", json!({
                "schedule_type": "production",
                "order_id": "ORD-00000001",
                "start_time": "2026-08-27 08:00:00"
            }))
            .await;
        assert!(result.is_err());

        // 缺少 start_time
        let result = server
            .tool_registry()
            .call_tool("aps.create_schedule", json!({
                "schedule_type": "production",
                "order_id": "ORD-00000001",
                "resource_id": "RES-0001"
            }))
            .await;
        assert!(result.is_err());
    }
}
