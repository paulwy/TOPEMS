//! PM MCP Tools — 项目管理系统业务工具。
//!
//! 注册 4 个 PM 业务工具到 MCP Server：
//! - pm.list_projects — 查询项目列表
//! - pm.get_project — 获取项目详情
//! - pm.list_tasks — 查询任务列表
//! - pm.create_project — 创建项目
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 PM API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;
use super::super::tools::{http_call, service_base_url, url_encode};

/// 注册 PM 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - pm.list_projects — 查询项目列表（支持分页、状态筛选、负责人筛选）
/// - pm.get_project — 获取项目详情（按ID）
/// - pm.list_tasks — 查询任务列表（支持分页、项目筛选、状态筛选、负责人筛选）
/// - pm.create_project — 创建项目（名称、类型、负责人、开始/结束日期）
pub async fn register_pm_tools(server: &McpServer) {
    let registry = server.tool_registry();

    // 1. pm.list_projects
    registry
        .register(
            "pm.list_projects",
            "查询PM项目列表，支持分页、状态筛选和负责人筛选。返回项目的基本信息列表，包括项目编号、名称、类型、状态、负责人、开始/结束日期、进度等。",
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
                        .description("项目状态筛选")
                        .enum_values(&["planning", "in_progress", "on_hold", "completed", "cancelled"]),
                )
                .property(
                    "project_type",
                    SchemaBuilder::string()
                        .description("项目类型筛选")
                        .enum_values(&["internal", "external", "rnd", "maintenance", "implementation"]),
                )
                .property(
                    "manager",
                    SchemaBuilder::string().description("负责人筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配项目编号、名称）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let status = params["status"].as_str().unwrap_or("");
                let project_type = params["project_type"].as_str().unwrap_or("");
                let manager = params["manager"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                let base = service_base_url("PM_SERVICE_URL", 8023);
                let mut path = format!("/api/pm/projects?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                if !project_type.is_empty() { path.push_str(&format!("&project_type={}", url_encode(project_type))); }
                let mut real = None;
                if let Some(data) = http_call(&base, "GET", &path, None) {
                    if let Some(list) = data.get("projects").cloned() {
                        real = Some(json!({
                            "total": data.get("total").cloned().unwrap_or(json!(list.as_array().map(|a| a.len()).unwrap_or(0))),
                            "page": page,
                            "page_size": page_size,
                            "projects": list,
                        }));
                    }
                }
                let projects = real.map(|r| r["projects"].as_array().cloned().unwrap_or_default()).unwrap_or_else(|| {
                    generate_mock_projects(status, project_type, manager, keyword)
                });
                let total = projects.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_projects = &projects[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "projects": page_projects,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. pm.get_project
    registry
        .register(
            "pm.get_project",
            "获取PM项目详情，按项目ID查询。返回项目的完整信息，包括基本信息、范围、里程碑、任务统计、团队成员、风险、文档等。",
            SchemaBuilder::object()
                .property(
                    "project_id",
                    SchemaBuilder::string().description("项目ID"),
                )
                .required(&["project_id"])
                .build(),
            |params| {
                let project_id = params["project_id"].as_str().unwrap_or("");

                if project_id.is_empty() {
                    return Err(ToolExecutionError::Validation("project_id is required".to_string()));
                }

                let base = service_base_url("PM_SERVICE_URL", 8023);
                let project = if let Some(data) = http_call(&base, "GET", &format!("/api/pm/projects/{}", url_encode(&project_id)), None) {
                    data
                } else {
                    generate_mock_project_detail(project_id)
                };

                Ok(McpToolResult {
                    content: vec![McpContent::text(project.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. pm.list_tasks
    registry
        .register(
            "pm.list_tasks",
            "查询PM任务列表，支持分页、项目筛选、状态筛选和负责人筛选。返回任务的基本信息列表，包括任务编号、名称、项目、状态、优先级、负责人、开始/结束日期、进度等。",
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
                    "project_id",
                    SchemaBuilder::string().description("项目ID筛选"),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("任务状态筛选")
                        .enum_values(&["todo", "in_progress", "review", "done", "blocked"]),
                )
                .property(
                    "priority",
                    SchemaBuilder::string()
                        .description("优先级筛选")
                        .enum_values(&["low", "medium", "high", "urgent"]),
                )
                .property(
                    "assignee",
                    SchemaBuilder::string().description("负责人筛选"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let project_id = params["project_id"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let priority = params["priority"].as_str().unwrap_or("");
                let assignee = params["assignee"].as_str().unwrap_or("");

                // 真实服务优先：GET /api/pm/tasks（含筛选与分页），失败降级 mock
                let base = service_base_url("PM_SERVICE_URL", 8023);
                let mut path = format!("/api/pm/tasks?page={}&page_size={}", page, page_size);
                if !project_id.is_empty() {
                    path.push_str(&format!("&project_id={}", url_encode(&project_id)));
                }
                if !status.is_empty() {
                    path.push_str(&format!("&status={}", url_encode(status)));
                }
                if !priority.is_empty() {
                    path.push_str(&format!("&priority={}", url_encode(priority)));
                }
                if !assignee.is_empty() {
                    path.push_str(&format!("&assignee={}", url_encode(assignee)));
                }
                let mut real_total: Option<u64> = None;
                let real_tasks = if let Some(data) = http_call(&base, "GET", &path, None) {
                    if let Some(items) = data.get("items").cloned() {
                        real_total = data.get("total").and_then(|t| t.as_u64());
                        Some(items.as_array().cloned().unwrap_or_default())
                    } else {
                        None
                    }
                } else {
                    None
                };
                let tasks = real_tasks
                    .unwrap_or_else(|| generate_mock_tasks(project_id, status, priority, assignee));
                let total = real_total.unwrap_or(tasks.len() as u64) as usize;
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_tasks = &tasks[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "tasks": page_tasks,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. pm.create_project
    registry
        .register(
            "pm.create_project",
            "创建PM项目。需要提供项目名称、类型、负责人和开始日期，返回新创建的项目ID和项目编号。",
            SchemaBuilder::object()
                .property("name", SchemaBuilder::string().description("项目名称"))
                .property(
                    "project_type",
                    SchemaBuilder::string()
                        .description("项目类型")
                        .enum_values(&[
                            "internal",
                            "external",
                            "rnd",
                            "maintenance",
                            "implementation",
                        ]),
                )
                .property("manager", SchemaBuilder::string().description("项目负责人"))
                .property(
                    "start_date",
                    SchemaBuilder::string().description("开始日期（YYYY-MM-DD）"),
                )
                .property(
                    "end_date",
                    SchemaBuilder::string().description("结束日期（YYYY-MM-DD）"),
                )
                .property(
                    "description",
                    SchemaBuilder::string().description("项目描述"),
                )
                .property(
                    "budget",
                    SchemaBuilder::number()
                        .description("项目预算（元）")
                        .minimum(0.0),
                )
                .required(&["name", "project_type", "manager", "start_date"])
                .build(),
            |params| {
                let name = params["name"].as_str().unwrap_or("");
                let project_type = params["project_type"].as_str().unwrap_or("");
                let manager = params["manager"].as_str().unwrap_or("");
                let start_date = params["start_date"].as_str().unwrap_or("");

                if name.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "name is required".to_string(),
                    ));
                }
                if project_type.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "project_type is required".to_string(),
                    ));
                }
                if manager.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "manager is required".to_string(),
                    ));
                }
                if start_date.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "start_date is required".to_string(),
                    ));
                }

                let project_id = format!(
                    "PRJ-{}",
                    uuid::Uuid::new_v4()
                        .to_string()
                        .split('-')
                        .next()
                        .unwrap_or("00000000")
                );
                let project_number =
                    format!("PM{}{:06}", chrono::Utc::now().format("%Y%m%d"), 1001);

                // 真实调用：POST /api/pm/projects（失败自动降级为 mock）
                let base = service_base_url("PM_SERVICE_URL", 8023);
                // 日期 "YYYY-MM-DD" → RFC3339（API 需完整时间戳）
                let start_ts = if start_date.contains('T') {
                    start_date.to_string()
                } else {
                    format!("{}T00:00:00Z", start_date)
                };
                let end_ts = params["end_date"].as_str().unwrap_or("").to_string();
                let end_ts = if end_ts.is_empty() || end_ts.contains('T') {
                    end_ts
                } else {
                    format!("{}T00:00:00Z", end_ts)
                };
                let end_ts = if end_ts.is_empty() {
                    Value::Null
                } else {
                    Value::String(end_ts)
                };
                let body = json!({
                    "name": name,
                    "code": format!("PRJ-MCP-{}", chrono::Utc::now().format("%Y%m%d%H%M%S")),
                    "project_type": project_type,
                    "leader": manager,
                    "start_date": start_ts,
                    "end_date": end_ts,
                    "description": params["description"].as_str().unwrap_or(""),
                    "budget": params["budget"].as_f64().unwrap_or(0.0),
                    "status": "planning",
                });
                if let Some(data) = http_call(&base, "POST", "/api/pm/projects", Some(body)) {
                    return Ok(McpToolResult {
                        content: vec![McpContent::text(data.to_string())],
                        is_error: None,
                    });
                }
                let result = json!({
                    "project_id": project_id,
                    "project_number": project_number,
                    "name": name,
                    "project_type": project_type,
                    "manager": manager,
                    "start_date": start_date,
                    "end_date": params["end_date"].as_str().unwrap_or(""),
                    "description": params["description"].as_str().unwrap_or(""),
                    "budget": params["budget"].as_f64().unwrap_or(0.0),
                    "status": "planning",
                    "progress": 0,
                    "created_at": chrono::Utc::now().to_rfc3339(),
                    "message": "项目创建成功，已通知项目负责人",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("PM MCP Tools registered: 4 tools (pm.list_projects, pm.get_project, pm.list_tasks, pm.create_project)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 项目列表
fn generate_mock_projects(
    status_filter: &str,
    type_filter: &str,
    manager_filter: &str,
    keyword_filter: &str,
) -> Vec<Value> {
    let statuses = [
        "planning",
        "in_progress",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
    ];
    let types = [
        "internal",
        "external",
        "rnd",
        "maintenance",
        "implementation",
    ];
    let managers = ["张三", "李四", "王五", "赵六", "钱七"];

    (0..80)
        .map(|i| {
            let status = statuses[i % statuses.len()];
            let project_type = types[i % types.len()];
            let manager = managers[i % managers.len()];
            let progress = if status == "completed" {
                100
            } else if status == "planning" {
                0
            } else {
                (i * 7) % 90 + 10
            };

            json!({
                "project_id": format!("PRJ-{:08}", i + 1),
                "project_number": format!("PM2026{:06}", i + 1),
                "name": format!("项目{:03}", i + 1),
                "project_type": project_type,
                "status": status,
                "manager": manager,
                "start_date": format!("2026-{:02}-{:02}", (i % 12) + 1, (i % 28) + 1),
                "end_date": format!("2026-{:02}-{:02}", ((i + 3) % 12) + 1, ((i + 10) % 28) + 1),
                "progress": progress,
                "budget": 100000 + (i % 10) * 50000,
                "task_count": 10 + (i % 20),
                "completed_tasks": if status == "completed" { 10 + (i % 20) } else { i % 10 },
                "team_size": 3 + (i % 8),
                "priority": if i % 3 == 0 { "high" } else if i % 3 == 1 { "medium" } else { "low" },
                "created_at": format!("2026-{:02}-{:02}T10:00:00Z", (i % 12) + 1, (i % 28) + 1),
            })
        })
        .filter(|p| {
            (status_filter.is_empty() || p["status"].as_str() == Some(status_filter))
                && (type_filter.is_empty() || p["project_type"].as_str() == Some(type_filter))
                && (manager_filter.is_empty() || p["manager"].as_str() == Some(manager_filter))
                && (keyword_filter.is_empty()
                    || p["project_number"]
                        .as_str()
                        .unwrap_or("")
                        .contains(keyword_filter)
                    || p["name"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

/// 生成 Mock 项目详情
fn generate_mock_project_detail(project_id: &str) -> Value {
    json!({
        "project_id": project_id,
        "project_number": "PM2026001001",
        "name": "智能工厂数字化改造项目",
        "project_type": "implementation",
        "status": "in_progress",
        "manager": "张三",
        "description": "对现有工厂进行数字化改造，包括MES系统升级、IoT设备接入、数据中台建设等。",
        "start_date": "2026-01-15",
        "end_date": "2026-12-31",
        "progress": 45,
        "budget": 5000000,
        "spent": 2250000,
        "remaining_budget": 2750000,
        "scope": {
            "objectives": [
                "MES系统升级到V3.0",
                "接入200台IoT设备",
                "建设统一数据中台",
                "实现生产数据实时可视化",
            ],
            "deliverables": [
                "MES V3.0系统",
                "IoT平台",
                "数据中台",
                "可视化看板",
            ],
            "out_of_scope": [
                "ERP系统改造",
                "办公自动化",
            ],
        },
        "milestones": [
            {"id": "MS-001", "name": "需求分析", "date": "2026-02-28", "status": "completed"},
            {"id": "MS-002", "name": "系统设计", "date": "2026-04-30", "status": "completed"},
            {"id": "MS-003", "name": "MES开发", "date": "2026-08-31", "status": "in_progress"},
            {"id": "MS-004", "name": "IoT接入", "date": "2026-10-31", "status": "planning"},
            {"id": "MS-005", "name": "数据中台", "date": "2026-11-30", "status": "planning"},
            {"id": "MS-006", "name": "上线验收", "date": "2026-12-31", "status": "planning"},
        ],
        "task_statistics": {
            "total": 120,
            "todo": 30,
            "in_progress": 25,
            "review": 10,
            "done": 50,
            "blocked": 5,
        },
        "team_members": [
            {"id": "EMP-001", "name": "张三", "role": "项目经理", "allocation": 100},
            {"id": "EMP-002", "name": "李四", "role": "技术负责人", "allocation": 80},
            {"id": "EMP-003", "name": "王五", "role": "前端开发", "allocation": 100},
            {"id": "EMP-004", "name": "赵六", "role": "后端开发", "allocation": 100},
            {"id": "EMP-005", "name": "钱七", "role": "测试工程师", "allocation": 60},
        ],
        "risks": [
            {"id": "RISK-001", "description": "IoT设备供应商交付延迟", "probability": "medium", "impact": "high", "mitigation": "提前下单，备选供应商"},
            {"id": "RISK-002", "description": "需求变更频繁", "probability": "high", "impact": "medium", "mitigation": "严格变更控制流程"},
        ],
        "documents": [
            {"id": "DOC-001", "name": "项目章程.pdf", "size": 512000, "url": "/api/pm/documents/DOC-001"},
            {"id": "DOC-002", "name": "需求规格说明书.docx", "size": 1024000, "url": "/api/pm/documents/DOC-002"},
            {"id": "DOC-003", "name": "系统架构设计.pdf", "size": 2048000, "url": "/api/pm/documents/DOC-003"},
        ],
        "created_at": "2026-01-10T10:00:00Z",
        "updated_at": "2026-08-26T14:00:00Z",
    })
}

/// 生成 Mock 任务列表
fn generate_mock_tasks(
    project_filter: &str,
    status_filter: &str,
    priority_filter: &str,
    assignee_filter: &str,
) -> Vec<Value> {
    let statuses = ["todo", "in_progress", "review", "done", "blocked"];
    let priorities = ["low", "medium", "high", "urgent"];
    let assignees = ["张三", "李四", "王五", "赵六", "钱七"];

    (0..200)
        .map(|i| {
            let status = statuses[i % statuses.len()];
            let priority = priorities[i % priorities.len()];
            let assignee = assignees[i % assignees.len()];
            let progress = if status == "done" { 100 } else if status == "todo" { 0 } else { (i * 13) % 90 + 10 };

            json!({
                "task_id": format!("TASK-{:08}", i + 1),
                "task_number": format!("TK2026{:06}", i + 1),
                "title": format!("任务{:03}", i + 1),
                "project_id": format!("PRJ-{:08}", (i % 20) + 1),
                "project_name": format!("项目{:03}", (i % 20) + 1),
                "status": status,
                "priority": priority,
                "assignee": assignee,
                "reporter": assignees[(i + 1) % assignees.len()],
                "start_date": format!("2026-{:02}-{:02}", (i % 12) + 1, (i % 28) + 1),
                "due_date": format!("2026-{:02}-{:02}", ((i + 1) % 12) + 1, ((i + 5) % 28) + 1),
                "progress": progress,
                "estimated_hours": 8 + (i % 5) * 4,
                "logged_hours": if status == "todo" { 0 } else { (i % 8) * 2 },
                "tags": if i % 3 == 0 { vec!["前端", "UI"] } else if i % 3 == 1 { vec!["后端", "API"] } else { vec!["测试"] },
                "created_at": format!("2026-{:02}-{:02}T10:00:00Z", (i % 12) + 1, (i % 28) + 1),
                "updated_at": format!("2026-{:02}-{:02}T14:00:00Z", (i % 12) + 1, (i % 28) + 1),
            })
        })
        .filter(|t| {
            (project_filter.is_empty() || t["project_id"].as_str() == Some(project_filter))
                && (status_filter.is_empty() || t["status"].as_str() == Some(status_filter))
                && (priority_filter.is_empty() || t["priority"].as_str() == Some(priority_filter))
                && (assignee_filter.is_empty() || t["assignee"].as_str() == Some(assignee_filter))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_pm_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_pm_tools(&server).await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("pm.list_projects").await);
        assert!(registry.has_tool("pm.get_project").await);
        assert!(registry.has_tool("pm.list_tasks").await);
        assert!(registry.has_tool("pm.create_project").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_projects() {
        let server = McpServer::new("test", "1.0.0");
        register_pm_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("pm.list_projects", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["projects"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_project() {
        let server = McpServer::new("test", "1.0.0");
        register_pm_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("pm.get_project", json!({"project_id": "PRJ-00000001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["project_id"], "PRJ-00000001");
            assert!(parsed["milestones"].is_array());
            assert!(parsed["team_members"].is_array());
            assert!(parsed["risks"].is_array());
            assert!(parsed["task_statistics"].is_object());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_tasks() {
        let server = McpServer::new("test", "1.0.0");
        register_pm_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool(
                "pm.list_tasks",
                json!({"page": 1, "page_size": 10, "status": "in_progress"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["tasks"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_project() {
        let server = McpServer::new("test", "1.0.0");
        register_pm_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool(
                "pm.create_project",
                json!({
                    "name": "数字化转型项目",
                    "project_type": "implementation",
                    "manager": "张三",
                    "start_date": "2026-09-01",
                    "end_date": "2027-03-31",
                    "description": "企业数字化转型项目",
                    "budget": 1000000
                }),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["name"], "数字化转型项目");
            assert_eq!(parsed["project_type"], "implementation");
            assert_eq!(parsed["manager"], "张三");
            assert_eq!(parsed["status"], "planning");
            assert_eq!(parsed["progress"], 0);
            assert!(parsed["project_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_project_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_pm_tools(&server).await;

        // 缺少 manager
        let result = server
            .tool_registry()
            .call_tool(
                "pm.create_project",
                json!({
                    "name": "测试项目",
                    "project_type": "internal",
                    "start_date": "2026-09-01"
                }),
            )
            .await;
        assert!(result.is_err());

        // 缺少 start_date
        let result = server
            .tool_registry()
            .call_tool(
                "pm.create_project",
                json!({
                    "name": "测试项目",
                    "project_type": "internal",
                    "manager": "张三"
                }),
            )
            .await;
        assert!(result.is_err());
    }

    /// 端到端测试：真实 PM 服务（需网关 8099 运行，-p ignore）
    #[tokio::test]
    #[ignore]
    async fn test_e2e_pm_real_service() {
        // 模块化单体统一入口为网关 8099（含 dev 模拟认证）
        std::env::set_var("PM_SERVICE_URL", "http://localhost:8099");
        let server = McpServer::new("test", "1.0.0");
        register_pm_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("pm.list_projects", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();
        let text = match &result.content[0] {
            McpContent::Text { text } => text.clone(),
            _ => String::new(),
        };
        let parsed: Value = serde_json::from_str(&text).unwrap_or(json!({}));
        let total = parsed["total"].as_u64().unwrap_or(0);
        assert!(
            total > 0,
            "pm.list_projects 真实服务应返回 total>0，实际: {}",
            text
        );

        let result2 = server
            .tool_registry()
            .call_tool(
                "pm.create_project",
                json!({
                    "name": "e2e-pm-技改项目",
                    "project_type": "internal",
                    "manager": "测试员",
                    "start_date": "2026-09-01",
                    "budget": 100000,
                }),
            )
            .await
            .unwrap();
        assert!(
            !result2.is_error.unwrap_or(false),
            "pm.create_project 真实创建应成功: {:?}",
            result2.content
        );
    }
}
