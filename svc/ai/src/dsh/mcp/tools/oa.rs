//! OA MCP Tools — 办公自动化系统业务工具。
//!
//! 注册 4 个 OA 业务工具到 MCP Server：
//! - oa.list_approval_requests — 查询审批单列表
//! - oa.get_approval_request — 获取审批单详情
//! - oa.list_employees — 查询员工列表
//! - oa.create_approval_request — 创建审批单
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 OA API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 注册 OA 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - oa.list_approval_requests — 查询审批单列表（支持分页、类型筛选、状态筛选）
/// - oa.get_approval_request — 获取审批单详情（按ID）
/// - oa.list_employees — 查询员工列表（支持分页、部门筛选、状态筛选）
/// - oa.create_approval_request — 创建审批单（类型、标题、金额、审批人）
pub async fn register_oa_tools(server: &McpServer) {
    let registry = server.tool_registry();

    // 1. oa.list_approval_requests
    registry
        .register(
            "oa.list_approval_requests",
            "查询OA审批单列表，支持分页、类型筛选和状态筛选。返回审批单的基本信息列表，包括审批单编号、标题、类型、状态、申请人、申请时间、金额、当前审批人等。",
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
                    "approval_type",
                    SchemaBuilder::string()
                        .description("审批类型筛选")
                        .enum_values(&["leave", "expense", "purchase", "travel", "contract", "overtime", "business_card", "seal"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("审批状态筛选")
                        .enum_values(&["draft", "pending", "approved", "rejected", "cancelled", "completed"]),
                )
                .property(
                    "applicant",
                    SchemaBuilder::string().description("申请人筛选"),
                )
                .property(
                    "current_approver",
                    SchemaBuilder::string().description("当前审批人筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配审批单编号、标题）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let approval_type = params["approval_type"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let applicant = params["applicant"].as_str().unwrap_or("");
                let current_approver = params["current_approver"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                let requests = generate_mock_approval_requests(approval_type, status, applicant, current_approver, keyword);
                let total = requests.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_requests = &requests[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "approval_requests": page_requests,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. oa.get_approval_request
    registry
        .register(
            "oa.get_approval_request",
            "获取OA审批单详情，按审批单ID查询。返回审批单的完整信息，包括基本信息、申请人信息、审批流程、审批记录、附件、关联单据等。",
            SchemaBuilder::object()
                .property(
                    "request_id",
                    SchemaBuilder::string().description("审批单ID"),
                )
                .required(&["request_id"])
                .build(),
            |params| {
                let request_id = params["request_id"].as_str().unwrap_or("");

                if request_id.is_empty() {
                    return Err(ToolExecutionError::Validation("request_id is required".to_string()));
                }

                let request = generate_mock_approval_request_detail(request_id);

                Ok(McpToolResult {
                    content: vec![McpContent::text(request.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. oa.list_employees
    registry
        .register(
            "oa.list_employees",
            "查询OA员工列表，支持分页、部门筛选和状态筛选。返回员工的基本信息列表，包括员工编号、姓名、部门、职位、状态、入职时间、联系方式等。",
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
                    "department",
                    SchemaBuilder::string().description("部门筛选"),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("员工状态筛选")
                        .enum_values(&["active", "on_leave", "resigned", "retired"]),
                )
                .property(
                    "position",
                    SchemaBuilder::string().description("职位筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配员工编号、姓名）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let department = params["department"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let position = params["position"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                let employees = generate_mock_employees(department, status, position, keyword);
                let total = employees.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_employees = &employees[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "employees": page_employees,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. oa.create_approval_request
    registry
        .register(
            "oa.create_approval_request",
            "创建OA审批单。需要提供审批类型、标题、申请人和审批人，返回新创建的审批单ID和审批单编号。",
            SchemaBuilder::object()
                .property(
                    "approval_type",
                    SchemaBuilder::string()
                        .description("审批类型")
                        .enum_values(&["leave", "expense", "purchase", "travel", "contract", "overtime", "business_card", "seal"]),
                )
                .property(
                    "title",
                    SchemaBuilder::string().description("审批单标题"),
                )
                .property(
                    "applicant",
                    SchemaBuilder::string().description("申请人"),
                )
                .property(
                    "approver",
                    SchemaBuilder::string().description("审批人"),
                )
                .property(
                    "amount",
                    SchemaBuilder::number().description("金额（元）").minimum(0.0),
                )
                .property(
                    "start_date",
                    SchemaBuilder::string().description("开始日期（YYYY-MM-DD）"),
                )
                .property(
                    "end_date",
                    SchemaBuilder::string().description("结束日期（YYYY-MM-DD）"),
                )
                .property(
                    "reason",
                    SchemaBuilder::string().description("申请事由"),
                )
                .property(
                    "remark",
                    SchemaBuilder::string().description("备注"),
                )
                .required(&["approval_type", "title", "applicant", "approver"])
                .build(),
            |params| {
                let approval_type = params["approval_type"].as_str().unwrap_or("");
                let title = params["title"].as_str().unwrap_or("");
                let applicant = params["applicant"].as_str().unwrap_or("");
                let approver = params["approver"].as_str().unwrap_or("");

                if approval_type.is_empty() {
                    return Err(ToolExecutionError::Validation("approval_type is required".to_string()));
                }
                if title.is_empty() {
                    return Err(ToolExecutionError::Validation("title is required".to_string()));
                }
                if applicant.is_empty() {
                    return Err(ToolExecutionError::Validation("applicant is required".to_string()));
                }
                if approver.is_empty() {
                    return Err(ToolExecutionError::Validation("approver is required".to_string()));
                }

                let request_id = format!("REQ-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("00000000"));
                let request_number = format!("OA{}{:06}", chrono::Utc::now().format("%Y%m%d"), 1001);

                let result = json!({
                    "request_id": request_id,
                    "request_number": request_number,
                    "approval_type": approval_type,
                    "title": title,
                    "applicant": applicant,
                    "approver": approver,
                    "amount": params["amount"].as_f64().unwrap_or(0.0),
                    "start_date": params["start_date"].as_str().unwrap_or(""),
                    "end_date": params["end_date"].as_str().unwrap_or(""),
                    "reason": params["reason"].as_str().unwrap_or(""),
                    "remark": params["remark"].as_str().unwrap_or(""),
                    "status": "pending",
                    "current_step": 1,
                    "total_steps": 3,
                    "created_at": chrono::Utc::now().to_rfc3339(),
                    "message": "审批单创建成功，已提交给审批人",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("OA MCP Tools registered: 4 tools (oa.list_approval_requests, oa.get_approval_request, oa.list_employees, oa.create_approval_request)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 审批单列表
fn generate_mock_approval_requests(type_filter: &str, status_filter: &str, applicant_filter: &str, approver_filter: &str, keyword_filter: &str) -> Vec<Value> {
    let types = ["leave", "expense", "purchase", "travel", "contract", "overtime", "business_card", "seal"];
    let statuses = ["draft", "pending", "pending", "approved", "rejected", "cancelled", "completed"];
    let applicants = ["张三", "李四", "王五", "赵六", "钱七"];
    let approvers = ["部门经理A", "部门经理B", "总监A", "总监B", "总经理"];

    (0..120)
        .map(|i| {
            let approval_type = types[i % types.len()];
            let status = statuses[i % statuses.len()];
            let applicant = applicants[i % applicants.len()];
            let current_approver = if status == "pending" { approvers[i % approvers.len()] } else { "" };

            json!({
                "request_id": format!("REQ-{:08}", i + 1),
                "request_number": format!("OA2026{:06}", i + 1),
                "title": format!("审批单{:03}", i + 1),
                "approval_type": approval_type,
                "status": status,
                "applicant": applicant,
                "department": format!("部门{}", (i % 5) + 1),
                "current_approver": current_approver,
                "amount": if approval_type == "expense" || approval_type == "purchase" || approval_type == "travel" { Some(100 + (i % 50) * 100) } else { None },
                "current_step": if status == "pending" { (i % 3) + 1 } else { 0 },
                "total_steps": 3,
                "created_at": format!("2026-08-{:02}T{:02}:{:02}:00Z", (i % 26) + 1, (i % 24), (i % 60)),
                "updated_at": format!("2026-08-{:02}T{:02}:{:02}:00Z", (i % 26) + 1, ((i + 2) % 24), (i % 60)),
            })
        })
        .filter(|r| {
            (type_filter.is_empty() || r["approval_type"].as_str() == Some(type_filter))
                && (status_filter.is_empty() || r["status"].as_str() == Some(status_filter))
                && (applicant_filter.is_empty() || r["applicant"].as_str() == Some(applicant_filter))
                && (approver_filter.is_empty() || r["current_approver"].as_str() == Some(approver_filter))
                && (keyword_filter.is_empty()
                    || r["request_number"].as_str().unwrap_or("").contains(keyword_filter)
                    || r["title"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

/// 生成 Mock 审批单详情
fn generate_mock_approval_request_detail(request_id: &str) -> Value {
    json!({
        "request_id": request_id,
        "request_number": "OA2026001001",
        "title": "差旅费报销申请",
        "approval_type": "travel",
        "status": "pending",
        "applicant": {
            "employee_id": "EMP-0001",
            "name": "张三",
            "department": "销售部",
            "position": "销售经理",
            "email": "zhangsan@topems.com",
            "phone": "13800138001",
        },
        "amount": 5800.00,
        "currency": "CNY",
        "start_date": "2026-08-20",
        "end_date": "2026-08-25",
        "reason": "赴上海参加行业展会并拜访客户",
        "destination": "上海",
        "expense_details": [
            {"category": "交通", "description": "高铁往返", "amount": 1200.00},
            {"category": "住宿", "description": "酒店4晚", "amount": 2400.00},
            {"category": "餐饮", "description": "出差期间餐饮", "amount": 800.00},
            {"category": "其他", "description": "展会门票、交通等", "amount": 1400.00},
        ],
        "approval_flow": [
            {"step": 1, "approver": "部门经理A", "status": "approved", "approved_at": "2026-08-26T10:00:00Z", "comment": "同意报销"},
            {"step": 2, "approver": "财务经理B", "status": "pending", "approved_at": json!(null), "comment": ""},
            {"step": 3, "approver": "总经理", "status": "pending", "approved_at": json!(null), "comment": ""},
        ],
        "approval_history": [
            {"action": "submit", "operator": "张三", "time": "2026-08-26T09:00:00Z", "comment": "提交审批"},
            {"action": "approve", "operator": "部门经理A", "time": "2026-08-26T10:00:00Z", "comment": "同意报销"},
        ],
        "attachments": [
            {"id": "ATT-001", "name": "差旅费报销单.pdf", "size": 512000, "url": "/api/oa/attachments/ATT-001"},
            {"id": "ATT-002", "name": "发票扫描件.zip", "size": 2048000, "url": "/api/oa/attachments/ATT-002"},
        ],
        "related_documents": [
            {"id": "DOC-001", "name": "出差申请单", "type": "leave_request", "url": "/api/oa/requests/REQ-00000000"},
        ],
        "current_step": 2,
        "total_steps": 3,
        "created_at": "2026-08-26T09:00:00Z",
        "updated_at": "2026-08-26T10:00:00Z",
    })
}

/// 生成 Mock 员工列表
fn generate_mock_employees(department_filter: &str, status_filter: &str, position_filter: &str, keyword_filter: &str) -> Vec<Value> {
    let departments = ["销售部", "技术部", "财务部", "人力资源部", "生产部", "质量部", "采购部", "行政部"];
    let statuses = ["active", "active", "active", "active", "on_leave", "resigned"];
    let positions = ["经理", "主管", "工程师", "专员", "助理", "总监"];

    (0..100)
        .map(|i| {
            let department = departments[i % departments.len()];
            let status = statuses[i % statuses.len()];
            let position = positions[i % positions.len()];

            json!({
                "employee_id": format!("EMP-{:04}", i + 1),
                "employee_code": format!("E{:06}", i + 1),
                "name": format!("员工{:03}", i + 1),
                "gender": if i % 2 == 0 { "male" } else { "female" },
                "department": department,
                "position": position,
                "status": status,
                "email": format!("employee{}@topems.com", i + 1),
                "phone": format!("138{:08}", (i % 100) + 1),
                "hire_date": format!("202{}-{:02}-{:02}", (i % 5) + 1, (i % 12) + 1, (i % 28) + 1),
                "manager": if position != "总监" { format!("经理{:02}", (i % 5) + 1) } else { String::new() },
                "work_location": format!("办公区{}", (i % 3) + 1),
            })
        })
        .filter(|e| {
            (department_filter.is_empty() || e["department"].as_str() == Some(department_filter))
                && (status_filter.is_empty() || e["status"].as_str() == Some(status_filter))
                && (position_filter.is_empty() || e["position"].as_str() == Some(position_filter))
                && (keyword_filter.is_empty()
                    || e["employee_code"].as_str().unwrap_or("").contains(keyword_filter)
                    || e["name"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_oa_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_oa_tools(&server).await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("oa.list_approval_requests").await);
        assert!(registry.has_tool("oa.get_approval_request").await);
        assert!(registry.has_tool("oa.list_employees").await);
        assert!(registry.has_tool("oa.create_approval_request").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_approval_requests() {
        let server = McpServer::new("test", "1.0.0");
        register_oa_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("oa.list_approval_requests", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["approval_requests"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_approval_request() {
        let server = McpServer::new("test", "1.0.0");
        register_oa_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("oa.get_approval_request", json!({"request_id": "REQ-00000001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["request_id"], "REQ-00000001");
            assert!(parsed["applicant"].is_object());
            assert!(parsed["expense_details"].is_array());
            assert!(parsed["approval_flow"].is_array());
            assert!(parsed["approval_history"].is_array());
            assert!(parsed["attachments"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_employees() {
        let server = McpServer::new("test", "1.0.0");
        register_oa_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("oa.list_employees", json!({"page": 1, "page_size": 10, "status": "active"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["employees"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_approval_request() {
        let server = McpServer::new("test", "1.0.0");
        register_oa_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("oa.create_approval_request", json!({
                "approval_type": "expense",
                "title": "办公用品采购报销",
                "applicant": "张三",
                "approver": "部门经理A",
                "amount": 1500.00,
                "reason": "采购部门办公用品",
                "remark": "急需"
            }))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["approval_type"], "expense");
            assert_eq!(parsed["title"], "办公用品采购报销");
            assert_eq!(parsed["applicant"], "张三");
            assert_eq!(parsed["approver"], "部门经理A");
            assert_eq!(parsed["amount"], 1500.00);
            assert_eq!(parsed["status"], "pending");
            assert!(parsed["request_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_approval_request_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_oa_tools(&server).await;

        // 缺少 approver
        let result = server
            .tool_registry()
            .call_tool("oa.create_approval_request", json!({
                "approval_type": "leave",
                "title": "请假申请",
                "applicant": "张三"
            }))
            .await;
        assert!(result.is_err());

        // 缺少 title
        let result = server
            .tool_registry()
            .call_tool("oa.create_approval_request", json!({
                "approval_type": "leave",
                "applicant": "张三",
                "approver": "经理A"
            }))
            .await;
        assert!(result.is_err());
    }
}
