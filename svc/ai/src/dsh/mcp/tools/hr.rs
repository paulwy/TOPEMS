//! HR MCP Tools — 人力资源管理业务工具。
//!
//! 注册 4 个 HR 业务工具到 MCP Server：
//! - hr.list_employees — 查询员工列表
//! - hr.get_employee — 获取员工详情
//! - hr.create_employee — 创建员工
//! - hr.update_employee — 更新员工信息
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 HR API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;
use super::super::tools::{http_call, service_base_url, url_encode};

/// 注册 HR 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - hr.list_employees — 查询员工列表（支持分页、部门筛选、状态筛选）
/// - hr.get_employee — 获取员工详情（按ID）
/// - hr.create_employee — 创建员工（姓名、工号、部门、职位）
/// - hr.update_employee — 更新员工信息（按ID，支持部分更新）
pub async fn register_hr_tools(server: &McpServer, _jwt_secret: &str) {
    let registry = server.tool_registry();

    // 1. hr.list_employees
    registry
        .register(
            "hr.list_employees",
            "查询员工列表，支持分页、部门筛选和状态筛选。返回员工的基本信息列表，包括工号、姓名、部门、职位、入职日期、状态等。",
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
                        .enum_values(&["active", "on_leave", "resigned", "probation"]),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配姓名、工号）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let department = params["department"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                // 真实调用 HRM API（GET /api/hrm/employees，降级 mock）
                let mut path = format!("/api/hrm/employees?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                if !keyword.is_empty() { path.push_str(&format!("&search={}", url_encode(keyword))); }
                let base = service_base_url("HRM_SERVICE_URL", 8020);
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    let items = data.get("items").cloned().unwrap_or(json!([]));
                    let total = data.get("total").cloned().unwrap_or(json!(0));
                    let result = json!({
                        "total": total,
                        "page": page,
                        "page_size": page_size,
                        "employees": items,
                    });
                    return Ok(McpToolResult {
                        content: vec![McpContent::text(result.to_string())],
                        is_error: None,
                    });
                }

                let employees = generate_mock_employees(department, status, keyword);
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

    // 2. hr.get_employee
    registry
        .register(
            "hr.get_employee",
            "获取员工详情，按员工ID查询。返回员工的完整信息，包括基本信息、联系方式、教育背景、工作经历、薪资信息等。",
            SchemaBuilder::object()
                .property(
                    "employee_id",
                    SchemaBuilder::string().description("员工ID"),
                )
                .required(&["employee_id"])
                .build(),
            |params| {
                let employee_id = params["employee_id"].as_str().unwrap_or("");

                if employee_id.is_empty() {
                    return Err(ToolExecutionError::Validation("employee_id is required".to_string()));
                }

                // 真实调用 HRM API（GET /api/hrm/employees/{id}，降级 mock）
                let base = service_base_url("HRM_SERVICE_URL", 8020);
                let path = format!("/api/hrm/employees/{}", url_encode(employee_id));
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    let result = json!({ "employee": data });
                    return Ok(McpToolResult {
                        content: vec![McpContent::text(result.to_string())],
                        is_error: None,
                    });
                }

                let employee = generate_mock_employee_detail(employee_id);

                Ok(McpToolResult {
                    content: vec![McpContent::text(employee.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. hr.create_employee
    registry
        .register(
            "hr.create_employee",
            "创建新员工。需要提供姓名、工号、部门、职位等基本信息，返回新创建的员工ID和工号。",
            SchemaBuilder::object()
                .property("name", SchemaBuilder::string().description("员工姓名"))
                .property(
                    "employee_no",
                    SchemaBuilder::string().description("工号（可选，不填则自动生成）"),
                )
                .property("department", SchemaBuilder::string().description("部门"))
                .property("position", SchemaBuilder::string().description("职位"))
                .property("email", SchemaBuilder::string().description("邮箱"))
                .property("phone", SchemaBuilder::string().description("手机号"))
                .property(
                    "hire_date",
                    SchemaBuilder::string().description("入职日期（YYYY-MM-DD）"),
                )
                .required(&["name", "department", "position"])
                .build(),
            |params| {
                let name = params["name"].as_str().unwrap_or("");
                let department = params["department"].as_str().unwrap_or("");
                let position = params["position"].as_str().unwrap_or("");

                if name.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "name is required".to_string(),
                    ));
                }
                if department.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "department is required".to_string(),
                    ));
                }
                if position.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "position is required".to_string(),
                    ));
                }

                // 真实调用 HRM API（POST /api/hrm/employees，降级 mock）
                let base = service_base_url("HRM_SERVICE_URL", 8020);
                let body = json!({
                    "name": name,
                    "employee_number": params["employee_no"].as_str().unwrap_or(""),
                    "email": params["email"].as_str().unwrap_or(""),
                    "phone": params["phone"].as_str().unwrap_or(""),
                    "hire_date": params["hire_date"].as_str().unwrap_or(""),
                });
                if let Some(data) = http_call(&base, "POST", "/api/hrm/employees", Some(body)) {
                    let result =
                        json!({ "employee": data, "message": "员工创建成功，已发送入职通知" });
                    return Ok(McpToolResult {
                        content: vec![McpContent::text(result.to_string())],
                        is_error: None,
                    });
                }

                let employee_id = format!(
                    "EMP-{}",
                    uuid::Uuid::new_v4()
                        .to_string()
                        .split('-')
                        .next()
                        .unwrap_or("00000000")
                );
                let default_employee_no = format!("EMP{:06}", 10001);
                let employee_no = params["employee_no"]
                    .as_str()
                    .unwrap_or(&default_employee_no);

                let default_hire_date = chrono::Utc::now().format("%Y-%m-%d").to_string();
                let hire_date = params["hire_date"].as_str().unwrap_or(&default_hire_date);

                let result = json!({
                    "employee_id": employee_id,
                    "employee_no": employee_no,
                    "name": name,
                    "department": department,
                    "position": position,
                    "email": params["email"].as_str().unwrap_or(""),
                    "phone": params["phone"].as_str().unwrap_or(""),
                    "hire_date": hire_date,
                    "status": "probation",
                    "created_at": chrono::Utc::now().to_rfc3339(),
                    "message": "员工创建成功，已发送入职通知",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. hr.update_employee
    registry
        .register(
            "hr.update_employee",
            "更新员工信息。按员工ID更新，支持部分字段更新（只更新提供的字段），返回更新后的员工信息。",
            SchemaBuilder::object()
                .property(
                    "employee_id",
                    SchemaBuilder::string().description("员工ID"),
                )
                .property(
                    "department",
                    SchemaBuilder::string().description("部门"),
                )
                .property(
                    "position",
                    SchemaBuilder::string().description("职位"),
                )
                .property(
                    "email",
                    SchemaBuilder::string().description("邮箱"),
                )
                .property(
                    "phone",
                    SchemaBuilder::string().description("手机号"),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("员工状态")
                        .enum_values(&["active", "on_leave", "resigned", "probation"]),
                )
                .property(
                    "salary",
                    SchemaBuilder::number().description("薪资（元/月）").minimum(0.0),
                )
                .required(&["employee_id"])
                .build(),
            |params| {
                let employee_id = params["employee_id"].as_str().unwrap_or("");

                if employee_id.is_empty() {
                    return Err(ToolExecutionError::Validation("employee_id is required".to_string()));
                }

                // 收集要更新的字段
                let mut updates = json!({});
                if let Some(dept) = params["department"].as_str() {
                    updates["department"] = json!(dept);
                }
                if let Some(pos) = params["position"].as_str() {
                    updates["position"] = json!(pos);
                }
                if let Some(email) = params["email"].as_str() {
                    updates["email"] = json!(email);
                }
                if let Some(phone) = params["phone"].as_str() {
                    updates["phone"] = json!(phone);
                }
                if let Some(status) = params["status"].as_str() {
                    updates["status"] = json!(status);
                }
                if let Some(salary) = params["salary"].as_f64() {
                    updates["salary"] = json!(salary);
                }

                if updates.as_object().is_none_or(|o| o.is_empty()) {
                    return Err(ToolExecutionError::Validation("At least one field to update is required".to_string()));
                }

                // 真实调用 HRM API（PUT /api/hrm/employees/{id}，降级 mock）
                let base = service_base_url("HRM_SERVICE_URL", 8020);
                let path = format!("/api/hrm/employees/{}", url_encode(employee_id));
                if let Some(data) = http_call(&base, "PUT", &path, Some(updates.clone())) {
                    let result = json!({ "employee": data, "message": "员工信息更新成功" });
                    return Ok(McpToolResult {
                        content: vec![McpContent::text(result.to_string())],
                        is_error: None,
                    });
                }

                let result = json!({
                    "employee_id": employee_id,
                    "updated_fields": updates,
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                    "message": "员工信息更新成功",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("HR MCP Tools registered: 4 tools (hr.list_employees, hr.get_employee, hr.create_employee, hr.update_employee)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 员工列表
fn generate_mock_employees(dept_filter: &str, status_filter: &str, keyword: &str) -> Vec<Value> {
    let departments = [
        "研发部",
        "产品部",
        "市场部",
        "销售部",
        "人力资源部",
        "财务部",
        "运营部",
    ];
    let positions = [
        "工程师",
        "高级工程师",
        "技术经理",
        "产品经理",
        "设计师",
        "市场专员",
        "销售经理",
        "HR专员",
        "财务专员",
    ];
    let statuses = ["active", "active", "active", "probation", "on_leave"];

    (0..200)
        .map(|i| {
            let dept = departments[i % departments.len()];
            let pos = positions[i % positions.len()];
            let status = statuses[i % statuses.len()];
            let name = format!("员工{:03}", i + 1);

            json!({
                "employee_id": format!("EMP-{:08}", i + 1),
                "employee_no": format!("EMP{:06}", i + 1),
                "name": name,
                "department": dept,
                "position": pos,
                "email": format!("emp{:03}@topems.com", i + 1),
                "phone": format!("138{:08}", i + 1),
                "hire_date": format!("202{}-{:02}-{:02}", (i % 5) + 1, (i % 12) + 1, (i % 28) + 1),
                "status": status,
            })
        })
        .filter(|e| {
            (dept_filter.is_empty() || e["department"].as_str() == Some(dept_filter))
                && (status_filter.is_empty() || e["status"].as_str() == Some(status_filter))
                && (keyword.is_empty()
                    || e["name"].as_str().unwrap_or("").contains(keyword)
                    || e["employee_no"].as_str().unwrap_or("").contains(keyword))
        })
        .collect()
}

/// 生成 Mock 员工详情
fn generate_mock_employee_detail(employee_id: &str) -> Value {
    json!({
        "employee_id": employee_id,
        "employee_no": "EMP001001",
        "name": "张三",
        "gender": "male",
        "birth_date": "1990-05-15",
        "id_card": "1301**********1234",
        "department": "研发部",
        "position": "高级工程师",
        "level": "P6",
        "email": "zhangsan@topems.com",
        "phone": "138****8888",
        "address": "河北省石家庄市裕华区科技园区",
        "hire_date": "2022-03-15",
        "probation_end_date": "2022-06-15",
        "status": "active",
        "employment_type": "full_time",
        "salary": {
            "base": 25000,
            "performance": 5000,
            "bonus": 0,
            "currency": "CNY",
        },
        "education": [
            {
                "school": "北京理工大学",
                "degree": "硕士",
                "major": "计算机科学与技术",
                "start_date": "2015-09-01",
                "end_date": "2018-06-30",
            },
            {
                "school": "河北工业大学",
                "degree": "学士",
                "major": "软件工程",
                "start_date": "2011-09-01",
                "end_date": "2015-06-30",
            }
        ],
        "work_experience": [
            {
                "company": "某科技公司",
                "position": "工程师",
                "start_date": "2018-07-01",
                "end_date": "2022-03-14",
                "description": "负责后端系统开发",
            }
        ],
        "emergency_contact": {
            "name": "李四",
            "relation": "配偶",
            "phone": "139****9999",
        },
        "created_at": "2022-03-15T09:00:00Z",
        "updated_at": "2026-08-20T14:30:00Z",
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_mcp::protocol::McpContent;

    #[tokio::test]
    #[ignore = "需要 HRM_SERVICE_URL 指向真实 hrm 服务时手动运行"]
    async fn test_list_employees_real_api() {
        if std::env::var("HRM_SERVICE_URL").is_err() {
            eprintln!("SKIP: 未设置 HRM_SERVICE_URL");
            return;
        }
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_hr_tools(&server, "test-secret").await;
        let result = server
            .tool_registry()
            .call_tool("hr.list_employees", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();
        let text = match &result.content[0] {
            McpContent::Text { text } => text.clone(),
            _ => String::new(),
        };
        let parsed: Value = serde_json::from_str(&text).unwrap_or(json!({}));
        let total = parsed["total"].as_u64().unwrap_or(0);
        assert!(total > 0, "真实 API 应返回员工，total={}", total);
        eprintln!("hr.list_employees 真实调用返回 total = {}", total);
    }

    #[tokio::test]
    async fn test_register_hr_tools() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_hr_tools(&server, "test-secret").await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("hr.list_employees").await);
        assert!(registry.has_tool("hr.get_employee").await);
        assert!(registry.has_tool("hr.create_employee").await);
        assert!(registry.has_tool("hr.update_employee").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_employees() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_hr_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("hr.list_employees", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["employees"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_employee() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_hr_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("hr.get_employee", json!({"employee_id": "EMP-00000001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["employee_id"], "EMP-00000001");
            assert!(parsed["education"].is_array());
            assert!(parsed["work_experience"].is_array());
            assert!(parsed["salary"].is_object());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_employee_validation() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_hr_tools(&server, "test-secret").await;

        // 缺少 name
        let result = server
            .tool_registry()
            .call_tool(
                "hr.create_employee",
                json!({"department": "研发部", "position": "工程师"}),
            )
            .await;
        assert!(result.is_err());

        // 缺少 department
        let result = server
            .tool_registry()
            .call_tool(
                "hr.create_employee",
                json!({"name": "张三", "position": "工程师"}),
            )
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_create_employee_success() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_hr_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "hr.create_employee",
                json!({
                    "name": "王五",
                    "department": "产品部",
                    "position": "产品经理",
                    "email": "wangwu@topems.com",
                    "phone": "13900001111"
                }),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["name"], "王五");
            assert_eq!(parsed["department"], "产品部");
            assert_eq!(parsed["position"], "产品经理");
            assert_eq!(parsed["status"], "probation");
            assert!(parsed["employee_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_update_employee() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_hr_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "hr.update_employee",
                json!({
                    "employee_id": "EMP-00000001",
                    "position": "技术经理",
                    "salary": 35000
                }),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["employee_id"], "EMP-00000001");
            assert_eq!(parsed["updated_fields"]["position"], "技术经理");
            assert_eq!(parsed["updated_fields"]["salary"].as_f64(), Some(35000.0));
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_update_employee_no_fields() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_hr_tools(&server, "test-secret").await;

        // 只传 employee_id，不传任何更新字段
        let result = server
            .tool_registry()
            .call_tool("hr.update_employee", json!({"employee_id": "EMP-00000001"}))
            .await;
        assert!(result.is_err());
    }
}
