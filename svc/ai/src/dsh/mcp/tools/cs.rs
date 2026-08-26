//! CS MCP Tools — 客户服务系统业务工具。
//!
//! 注册 4 个 CS 业务工具到 MCP Server：
//! - cs.list_tickets — 查询工单列表
//! - cs.get_ticket — 获取工单详情
//! - cs.list_customers — 查询客户列表
//! - cs.create_ticket — 创建工单
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 CS API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 注册 CS 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - cs.list_tickets — 查询工单列表（支持分页、状态筛选、优先级筛选）
/// - cs.get_ticket — 获取工单详情（按ID）
/// - cs.list_customers — 查询客户列表（支持分页、等级筛选、状态筛选）
/// - cs.create_ticket — 创建工单（标题、客户、类型、优先级、描述）
pub async fn register_cs_tools(server: &McpServer) {
    let registry = server.tool_registry();

    // 1. cs.list_tickets
    registry
        .register(
            "cs.list_tickets",
            "查询CS工单列表，支持分页、状态筛选和优先级筛选。返回工单的基本信息列表，包括工单编号、标题、客户、类型、状态、优先级、负责人、创建时间、更新时间等。",
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
                        .enum_values(&["open", "in_progress", "pending", "resolved", "closed", "reopened"]),
                )
                .property(
                    "priority",
                    SchemaBuilder::string()
                        .description("优先级筛选")
                        .enum_values(&["low", "medium", "high", "urgent"]),
                )
                .property(
                    "ticket_type",
                    SchemaBuilder::string()
                        .description("工单类型筛选")
                        .enum_values(&["question", "incident", "problem", "request", "complaint"]),
                )
                .property(
                    "assignee",
                    SchemaBuilder::string().description("负责人筛选"),
                )
                .property(
                    "customer_id",
                    SchemaBuilder::string().description("客户ID筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配工单编号、标题）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let status = params["status"].as_str().unwrap_or("");
                let priority = params["priority"].as_str().unwrap_or("");
                let ticket_type = params["ticket_type"].as_str().unwrap_or("");
                let assignee = params["assignee"].as_str().unwrap_or("");
                let customer_id = params["customer_id"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                let tickets = generate_mock_tickets(status, priority, ticket_type, assignee, customer_id, keyword);
                let total = tickets.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_tickets = &tickets[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "tickets": page_tickets,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. cs.get_ticket
    registry
        .register(
            "cs.get_ticket",
            "获取CS工单详情，按工单ID查询。返回工单的完整信息，包括基本信息、客户信息、描述、回复记录、附件、时间线、关联工单等。",
            SchemaBuilder::object()
                .property(
                    "ticket_id",
                    SchemaBuilder::string().description("工单ID"),
                )
                .required(&["ticket_id"])
                .build(),
            |params| {
                let ticket_id = params["ticket_id"].as_str().unwrap_or("");

                if ticket_id.is_empty() {
                    return Err(ToolExecutionError::Validation("ticket_id is required".to_string()));
                }

                let ticket = generate_mock_ticket_detail(ticket_id);

                Ok(McpToolResult {
                    content: vec![McpContent::text(ticket.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. cs.list_customers
    registry
        .register(
            "cs.list_customers",
            "查询CS客户列表，支持分页、等级筛选和状态筛选。返回客户的基本信息列表，包括客户编号、名称、联系人、等级、状态、工单统计、最近联系时间等。",
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
                    "customer_level",
                    SchemaBuilder::string()
                        .description("客户等级筛选")
                        .enum_values(&["vip", "gold", "silver", "bronze", "normal"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("客户状态筛选")
                        .enum_values(&["active", "inactive", "suspended", "churned"]),
                )
                .property(
                    "industry",
                    SchemaBuilder::string().description("行业筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配客户编号、名称）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let customer_level = params["customer_level"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let industry = params["industry"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                let customers = generate_mock_customers(customer_level, status, industry, keyword);
                let total = customers.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_customers = &customers[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "customers": page_customers,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. cs.create_ticket
    registry
        .register(
            "cs.create_ticket",
            "创建CS工单。需要提供工单标题、客户ID、类型和优先级，返回新创建的工单ID和工单编号。",
            SchemaBuilder::object()
                .property(
                    "title",
                    SchemaBuilder::string().description("工单标题"),
                )
                .property(
                    "customer_id",
                    SchemaBuilder::string().description("客户ID"),
                )
                .property(
                    "ticket_type",
                    SchemaBuilder::string()
                        .description("工单类型")
                        .enum_values(&["question", "incident", "problem", "request", "complaint"]),
                )
                .property(
                    "priority",
                    SchemaBuilder::string()
                        .description("优先级")
                        .enum_values(&["low", "medium", "high", "urgent"])
                        .default(json!("medium")),
                )
                .property(
                    "description",
                    SchemaBuilder::string().description("工单描述"),
                )
                .property(
                    "requester",
                    SchemaBuilder::string().description("请求人"),
                )
                .property(
                    "assignee",
                    SchemaBuilder::string().description("负责人"),
                )
                .property(
                    "channel",
                    SchemaBuilder::string()
                        .description("来源渠道")
                        .enum_values(&["phone", "email", "web", "wechat", "api"]),
                )
                .required(&["title", "customer_id", "ticket_type"])
                .build(),
            |params| {
                let title = params["title"].as_str().unwrap_or("");
                let customer_id = params["customer_id"].as_str().unwrap_or("");
                let ticket_type = params["ticket_type"].as_str().unwrap_or("");

                if title.is_empty() {
                    return Err(ToolExecutionError::Validation("title is required".to_string()));
                }
                if customer_id.is_empty() {
                    return Err(ToolExecutionError::Validation("customer_id is required".to_string()));
                }
                if ticket_type.is_empty() {
                    return Err(ToolExecutionError::Validation("ticket_type is required".to_string()));
                }

                let ticket_id = format!("TKT-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("00000000"));
                let ticket_number = format!("CS{}{:06}", chrono::Utc::now().format("%Y%m%d"), 1001);

                let result = json!({
                    "ticket_id": ticket_id,
                    "ticket_number": ticket_number,
                    "title": title,
                    "customer_id": customer_id,
                    "ticket_type": ticket_type,
                    "priority": params["priority"].as_str().unwrap_or("medium"),
                    "description": params["description"].as_str().unwrap_or(""),
                    "requester": params["requester"].as_str().unwrap_or(""),
                    "assignee": params["assignee"].as_str().unwrap_or(""),
                    "channel": params["channel"].as_str().unwrap_or("web"),
                    "status": "open",
                    "created_at": chrono::Utc::now().to_rfc3339(),
                    "message": "工单创建成功，已分配工单编号，等待客服处理",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("CS MCP Tools registered: 4 tools (cs.list_tickets, cs.get_ticket, cs.list_customers, cs.create_ticket)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 工单列表
fn generate_mock_tickets(status_filter: &str, priority_filter: &str, type_filter: &str, assignee_filter: &str, customer_filter: &str, keyword_filter: &str) -> Vec<Value> {
    let statuses = ["open", "in_progress", "pending", "resolved", "closed", "reopened"];
    let priorities = ["low", "medium", "high", "urgent"];
    let types = ["question", "incident", "problem", "request", "complaint"];
    let assignees = ["张三", "李四", "王五", "赵六", "钱七"];

    (0..200)
        .map(|i| {
            let status = statuses[i % statuses.len()];
            let priority = priorities[i % priorities.len()];
            let ticket_type = types[i % types.len()];
            let assignee = assignees[i % assignees.len()];

            json!({
                "ticket_id": format!("TKT-{:08}", i + 1),
                "ticket_number": format!("CS2026{:06}", i + 1),
                "title": format!("工单{:03}", i + 1),
                "customer_id": format!("CUS-{:04}", (i % 30) + 1),
                "customer_name": format!("客户{:03}", (i % 30) + 1),
                "ticket_type": ticket_type,
                "status": status,
                "priority": priority,
                "assignee": assignee,
                "requester": format!("联系人{:02}", (i % 10) + 1),
                "channel": if i % 5 == 0 { "phone" } else if i % 5 == 1 { "email" } else if i % 5 == 2 { "web" } else if i % 5 == 3 { "wechat" } else { "api" },
                "created_at": format!("2026-08-{:02}T{:02}:{:02}:00Z", (i % 26) + 1, (i % 24), (i % 60)),
                "updated_at": format!("2026-08-{:02}T{:02}:{:02}:00Z", (i % 26) + 1, ((i + 2) % 24), (i % 60)),
                "first_response_at": if status != "open" { Some(format!("2026-08-{:02}T{:02}:{:02}:00Z", (i % 26) + 1, ((i + 1) % 24), (i % 60))) } else { None },
                "resolved_at": if status == "resolved" || status == "closed" { Some(format!("2026-08-{:02}T{:02}:{:02}:00Z", (i % 26) + 1, ((i + 4) % 24), (i % 60))) } else { None },
                "reply_count": (i % 10),
                "satisfaction_score": if status == "closed" { Some(3 + (i % 3)) } else { None },
            })
        })
        .filter(|t| {
            (status_filter.is_empty() || t["status"].as_str() == Some(status_filter))
                && (priority_filter.is_empty() || t["priority"].as_str() == Some(priority_filter))
                && (type_filter.is_empty() || t["ticket_type"].as_str() == Some(type_filter))
                && (assignee_filter.is_empty() || t["assignee"].as_str() == Some(assignee_filter))
                && (customer_filter.is_empty() || t["customer_id"].as_str() == Some(customer_filter))
                && (keyword_filter.is_empty()
                    || t["ticket_number"].as_str().unwrap_or("").contains(keyword_filter)
                    || t["title"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

/// 生成 Mock 工单详情
fn generate_mock_ticket_detail(ticket_id: &str) -> Value {
    json!({
        "ticket_id": ticket_id,
        "ticket_number": "CS2026001001",
        "title": "系统登录异常问题",
        "customer_id": "CUS-0001",
        "customer_name": "某科技有限公司",
        "contact_person": "张经理",
        "contact_phone": "13800138001",
        "contact_email": "zhang@example.com",
        "ticket_type": "incident",
        "status": "in_progress",
        "priority": "high",
        "assignee": "李四",
        "requester": "张经理",
        "channel": "phone",
        "description": "客户反馈今天上午开始，多名员工无法正常登录系统，提示'服务器连接超时'。影响约20名员工正常办公，请求尽快处理。",
        "tags": ["登录", "连接超时", "紧急"],
        "replies": [
            {"id": "REP-001", "author": "李四", "role": "agent", "content": "您好，已收到您的反馈。我们正在排查服务器状态，请稍候。", "created_at": "2026-08-26T10:15:00Z", "attachments": []},
            {"id": "REP-002", "author": "张经理", "role": "customer", "content": "好的，请尽快，我们这边比较着急。", "created_at": "2026-08-26T10:20:00Z", "attachments": []},
            {"id": "REP-003", "author": "李四", "role": "agent", "content": "经排查，发现是应用服务器内存占用过高导致服务响应慢。已重启应用服务，目前登录功能已恢复正常。请您确认是否还有问题。", "created_at": "2026-08-26T10:45:00Z", "attachments": [{"id": "ATT-001", "name": "服务器监控截图.png", "size": 512000, "url": "/api/cs/attachments/ATT-001"}]},
        ],
        "timeline": [
            {"event": "created", "time": "2026-08-26T10:00:00Z", "user": "张经理"},
            {"event": "assigned", "time": "2026-08-26T10:05:00Z", "user": "系统", "detail": "分配给李四"},
            {"event": "first_response", "time": "2026-08-26T10:15:00Z", "user": "李四"},
            {"event": "status_changed", "time": "2026-08-26T10:15:00Z", "user": "李四", "detail": "open -> in_progress"},
            {"event": "reply_added", "time": "2026-08-26T10:45:00Z", "user": "李四"},
        ],
        "attachments": [
            {"id": "ATT-001", "name": "错误截图.png", "size": 1024000, "url": "/api/cs/attachments/ATT-001", "uploaded_by": "张经理", "uploaded_at": "2026-08-26T10:05:00Z"},
        ],
        "related_tickets": [
            {"id": "TKT-00000002", "number": "CS2026001002", "title": "系统响应慢", "relation": "related"},
        ],
        "resolution": "",
        "satisfaction_score": json!(null),
        "created_at": "2026-08-26T10:00:00Z",
        "updated_at": "2026-08-26T10:45:00Z",
        "first_response_at": "2026-08-26T10:15:00Z",
        "resolved_at": json!(null),
        "closed_at": json!(null),
    })
}

/// 生成 Mock 客户列表
fn generate_mock_customers(level_filter: &str, status_filter: &str, industry_filter: &str, keyword_filter: &str) -> Vec<Value> {
    let levels = ["vip", "gold", "silver", "bronze", "normal"];
    let statuses = ["active", "active", "active", "inactive", "suspended", "churned"];
    let industries = ["制造业", "零售业", "金融业", "教育", "医疗", "物流", "IT", "房地产"];

    (0..100)
        .map(|i| {
            let level = levels[i % levels.len()];
            let status = statuses[i % statuses.len()];
            let industry = industries[i % industries.len()];

            json!({
                "customer_id": format!("CUS-{:04}", i + 1),
                "customer_code": format!("C{:06}", i + 1),
                "customer_name": format!("客户{:03}", i + 1),
                "contact_person": format!("联系人{:02}", (i % 10) + 1),
                "contact_phone": format!("138{:08}", (i % 100) + 1),
                "contact_email": format!("contact{}@example.com", i + 1),
                "customer_level": level,
                "status": status,
                "industry": industry,
                "address": format!("河北省石家庄市{}区{}路{}号", (i % 5) + 1, (i % 10) + 1, (i % 100) + 1),
                "total_tickets": 5 + (i % 20),
                "open_tickets": (i % 5),
                "resolved_tickets": 5 + (i % 15),
                "satisfaction_score": 3 + (i % 3),
                "last_contact": format!("2026-08-{:02}", (i % 26) + 1),
                "created_at": format!("2026-{:02}-{:02}", (i % 12) + 1, (i % 28) + 1),
            })
        })
        .filter(|c| {
            (level_filter.is_empty() || c["customer_level"].as_str() == Some(level_filter))
                && (status_filter.is_empty() || c["status"].as_str() == Some(status_filter))
                && (industry_filter.is_empty() || c["industry"].as_str() == Some(industry_filter))
                && (keyword_filter.is_empty()
                    || c["customer_code"].as_str().unwrap_or("").contains(keyword_filter)
                    || c["customer_name"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_cs_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_cs_tools(&server).await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("cs.list_tickets").await);
        assert!(registry.has_tool("cs.get_ticket").await);
        assert!(registry.has_tool("cs.list_customers").await);
        assert!(registry.has_tool("cs.create_ticket").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_tickets() {
        let server = McpServer::new("test", "1.0.0");
        register_cs_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("cs.list_tickets", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["tickets"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_ticket() {
        let server = McpServer::new("test", "1.0.0");
        register_cs_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("cs.get_ticket", json!({"ticket_id": "TKT-00000001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["ticket_id"], "TKT-00000001");
            assert!(parsed["replies"].is_array());
            assert!(parsed["timeline"].is_array());
            assert!(parsed["attachments"].is_array());
            assert!(parsed["related_tickets"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_customers() {
        let server = McpServer::new("test", "1.0.0");
        register_cs_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("cs.list_customers", json!({"page": 1, "page_size": 10, "status": "active"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["customers"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_ticket() {
        let server = McpServer::new("test", "1.0.0");
        register_cs_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("cs.create_ticket", json!({
                "title": "系统登录异常",
                "customer_id": "CUS-0001",
                "ticket_type": "incident",
                "priority": "high",
                "description": "多名员工无法登录系统",
                "requester": "张经理",
                "assignee": "李四",
                "channel": "phone"
            }))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["title"], "系统登录异常");
            assert_eq!(parsed["customer_id"], "CUS-0001");
            assert_eq!(parsed["ticket_type"], "incident");
            assert_eq!(parsed["priority"], "high");
            assert_eq!(parsed["status"], "open");
            assert!(parsed["ticket_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_ticket_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_cs_tools(&server).await;

        // 缺少 customer_id
        let result = server
            .tool_registry()
            .call_tool("cs.create_ticket", json!({
                "title": "测试工单",
                "ticket_type": "question"
            }))
            .await;
        assert!(result.is_err());

        // 缺少 ticket_type
        let result = server
            .tool_registry()
            .call_tool("cs.create_ticket", json!({
                "title": "测试工单",
                "customer_id": "CUS-0001"
            }))
            .await;
        assert!(result.is_err());
    }
}
