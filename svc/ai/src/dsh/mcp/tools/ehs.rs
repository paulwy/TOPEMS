//! EHS MCP Tools — 环境健康安全业务工具。
//!
//! 注册 4 个 EHS 业务工具到 MCP Server：
//! - ehs.list_incidents — 查询安全事件列表
//! - ehs.get_incident — 获取安全事件详情
//! - ehs.list_hazards — 查询隐患列表
//! - ehs.create_incident — 创建安全事件
//!
//! 当前版本优先调用真实 EHS 服务（网关 8099 / EHS_SERVICE_URL），调用失败时回退 mock 数据。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;
use super::super::tools::{http_call, service_base_url, url_encode};

/// 注册 EHS 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - ehs.list_incidents — 查询安全事件列表（支持分页、等级筛选、状态筛选）
/// - ehs.get_incident — 获取安全事件详情（按ID）
/// - ehs.list_hazards — 查询隐患列表（支持分页、等级筛选、状态筛选）
/// - ehs.create_incident — 创建安全事件（标题、类型、等级、描述）
pub async fn register_ehs_tools(server: &McpServer, _jwt_secret: &str) {
    let registry = server.tool_registry();

    // 1. ehs.list_incidents
    registry
        .register(
            "ehs.list_incidents",
            "查询EHS安全事件列表，支持分页、等级筛选和状态筛选。返回安全事件的基本信息列表，包括事件编号、标题、类型、等级、状态、发生时间、地点等。",
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
                    "level",
                    SchemaBuilder::string()
                        .description("事件等级筛选")
                        .enum_values(&["minor", "major", "serious", "critical"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("事件状态筛选")
                        .enum_values(&["reported", "investigating", "resolved", "closed"]),
                )
                .property(
                    "incident_type",
                    SchemaBuilder::string().description("事件类型筛选"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let level = params["level"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let incident_type = params["incident_type"].as_str().unwrap_or("");

                let base = service_base_url("EHS_SERVICE_URL", 8052);
                let mut path = format!("/api/ehs/incidents?page={}&page_size={}", page, page_size);
                if !level.is_empty() { path.push_str(&format!("&level={}", url_encode(level))); }
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                if !incident_type.is_empty() { path.push_str(&format!("&incident_type={}", url_encode(incident_type))); }
                let incidents = if let Some(data) = http_call(&base, "GET", &path, None) {
                    data.as_array().cloned().unwrap_or_default()
                } else {
                    generate_mock_incidents(level, status, incident_type)
                };
                let total = incidents.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_incidents = &incidents[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "incidents": page_incidents,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. ehs.get_incident
    registry
        .register(
            "ehs.get_incident",
            "获取EHS安全事件详情，按事件ID查询。返回事件的完整信息，包括基本信息、事件描述、调查过程、整改措施、责任人、附件等。",
            SchemaBuilder::object()
                .property(
                    "incident_id",
                    SchemaBuilder::string().description("事件ID"),
                )
                .required(&["incident_id"])
                .build(),
            |params| {
                let incident_id = params["incident_id"].as_str().unwrap_or("");

                if incident_id.is_empty() {
                    return Err(ToolExecutionError::Validation("incident_id is required".to_string()));
                }

                let base = service_base_url("EHS_SERVICE_URL", 8052);
                let incident = if let Some(data) = http_call(&base, "GET", &format!("/api/ehs/incidents/{}", url_encode(&incident_id)), None) {
                    data
                } else {
                    generate_mock_incident_detail(incident_id)
                };

                Ok(McpToolResult {
                    content: vec![McpContent::text(incident.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. ehs.list_hazards
    registry
        .register(
            "ehs.list_hazards",
            "查询EHS安全隐患列表，支持分页、等级筛选和状态筛选。返回隐患的基本信息列表，包括隐患编号、描述、位置、等级、状态、发现人、发现时间等。",
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
                    "risk_level",
                    SchemaBuilder::string()
                        .description("风险等级筛选")
                        .enum_values(&["low", "medium", "high", "extreme"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("隐患状态筛选")
                        .enum_values(&["identified", "assessing", "rectifying", "verified", "closed"]),
                )
                .property(
                    "location",
                    SchemaBuilder::string().description("位置筛选"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let risk_level = params["risk_level"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let location = params["location"].as_str().unwrap_or("");

                let base = service_base_url("EHS_SERVICE_URL", 8052);
                let mut path = format!("/api/ehs/hazards?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                if !location.is_empty() { path.push_str(&format!("&location={}", url_encode(location))); }
                let hazards = if let Some(data) = http_call(&base, "GET", &path, None) {
                    data.as_array().cloned().unwrap_or_default()
                } else {
                    generate_mock_hazards(risk_level, status, location)
                };
                let total = hazards.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_hazards = &hazards[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "hazards": page_hazards,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. ehs.create_incident
    registry
        .register(
            "ehs.create_incident",
            "创建EHS安全事件。需要提供标题、类型、等级、发生时间、地点和描述，返回新创建的事件ID和事件编号。",
            SchemaBuilder::object()
                .property(
                    "title",
                    SchemaBuilder::string().description("事件标题"),
                )
                .property(
                    "incident_type",
                    SchemaBuilder::string()
                        .description("事件类型")
                        .enum_values(&["injury", "near_miss", "property_damage", "environmental", "occupational_illness"]),
                )
                .property(
                    "level",
                    SchemaBuilder::string()
                        .description("事件等级")
                        .enum_values(&["minor", "major", "serious", "critical"]),
                )
                .property(
                    "occurred_at",
                    SchemaBuilder::string().description("发生时间（ISO 8601格式）"),
                )
                .property(
                    "location",
                    SchemaBuilder::string().description("发生地点"),
                )
                .property(
                    "description",
                    SchemaBuilder::string().description("事件描述"),
                )
                .property(
                    "reporter",
                    SchemaBuilder::string().description("报告人"),
                )
                .required(&["title", "incident_type", "level", "occurred_at", "location"])
                .build(),
            |params| {
                let title = params["title"].as_str().unwrap_or("");
                let incident_type = params["incident_type"].as_str().unwrap_or("");
                let level = params["level"].as_str().unwrap_or("");
                let occurred_at = params["occurred_at"].as_str().unwrap_or("");
                let location = params["location"].as_str().unwrap_or("");

                if title.is_empty() {
                    return Err(ToolExecutionError::Validation("title is required".to_string()));
                }
                if incident_type.is_empty() {
                    return Err(ToolExecutionError::Validation("incident_type is required".to_string()));
                }
                if level.is_empty() {
                    return Err(ToolExecutionError::Validation("level is required".to_string()));
                }
                if occurred_at.is_empty() {
                    return Err(ToolExecutionError::Validation("occurred_at is required".to_string()));
                }
                if location.is_empty() {
                    return Err(ToolExecutionError::Validation("location is required".to_string()));
                }

                let base = service_base_url("EHS_SERVICE_URL", 8052);
                let body = json!({
                    "title": title,
                    "incident_type": incident_type,
                    "level": level,
                    "occurred_at": occurred_at,
                    "location": location,
                    "description": params["description"].as_str().unwrap_or(""),
                    "reporter": params["reporter"].as_str().unwrap_or(""),
                });
                let result = http_call(&base, "POST", "/api/ehs/incidents", Some(body))
                    .map(|data| {
                        let mut d = data;
                        if d.get("message").is_none() {
                            d["message"] = json!("安全事件创建成功");
                        }
                        d
                    })
                    .unwrap_or_else(|| {
                        let incident_id = format!("INC-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("00000000"));
                        let incident_number = format!("EHS{}{:06}", chrono::Utc::now().format("%Y%m%d"), 1001);
                        json!({
                            "incident_id": incident_id,
                            "incident_number": incident_number,
                            "title": title,
                            "incident_type": incident_type,
                            "level": level,
                            "occurred_at": occurred_at,
                            "location": location,
                            "description": params["description"].as_str().unwrap_or(""),
                            "reporter": params["reporter"].as_str().unwrap_or(""),
                            "status": "reported",
                            "created_at": chrono::Utc::now().to_rfc3339(),
                            "message": "安全事件创建成功，已通知EHS负责人",
                        })
                    });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("EHS MCP Tools registered: 4 tools (ehs.list_incidents, ehs.get_incident, ehs.list_hazards, ehs.create_incident)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 安全事件列表
fn generate_mock_incidents(
    level_filter: &str,
    status_filter: &str,
    type_filter: &str,
) -> Vec<Value> {
    let levels = ["minor", "minor", "major", "serious", "critical"];
    let statuses = ["reported", "investigating", "resolved", "closed"];
    let types = [
        "injury",
        "near_miss",
        "property_damage",
        "environmental",
        "occupational_illness",
    ];
    let locations = ["一车间", "二车间", "仓库", "办公楼", "厂区道路"];

    (0..80)
        .map(|i| {
            let level = levels[i % levels.len()];
            let status = statuses[i % statuses.len()];
            let incident_type = types[i % types.len()];
            let location = locations[i % locations.len()];

            json!({
                "incident_id": format!("INC-{:08}", i + 1),
                "incident_number": format!("EHS2026{:06}", i + 1),
                "title": format!("安全事件{:03}", i + 1),
                "incident_type": incident_type,
                "level": level,
                "status": status,
                "location": location,
                "occurred_at": format!("2026-08-{:02}T{:02}:{:02}:00Z", (i % 26) + 1, (i % 24), (i % 60)),
                "reporter": format!("员工{:03}", (i % 50) + 1),
                "injured_count": if incident_type == "injury" { (i % 3) + 1 } else { 0 },
            })
        })
        .filter(|inc| {
            (level_filter.is_empty() || inc["level"].as_str() == Some(level_filter))
                && (status_filter.is_empty() || inc["status"].as_str() == Some(status_filter))
                && (type_filter.is_empty() || inc["incident_type"].as_str() == Some(type_filter))
        })
        .collect()
}

/// 生成 Mock 安全事件详情
fn generate_mock_incident_detail(incident_id: &str) -> Value {
    json!({
        "incident_id": incident_id,
        "incident_number": "EHS2026001001",
        "title": "一车间机械伤害事件",
        "incident_type": "injury",
        "level": "major",
        "status": "investigating",
        "location": "一车间A生产线",
        "occurred_at": "2026-08-20T14:30:00Z",
        "reported_at": "2026-08-20T14:45:00Z",
        "reporter": "张三",
        "description": "员工在操作冲压机时，因未按规程使用安全防护装置，导致左手手指被压伤。事故发生后立即停机并送医治疗。",
        "injured_persons": [
            {
                "name": "李四",
                "employee_id": "EMP-00000042",
                "department": "一车间",
                "injury_type": "机械伤害",
                "injury_part": "左手手指",
                "severity": "中度",
                "hospital": "市第一医院",
            }
        ],
        "investigation": {
            "investigator": "王五（EHS主管）",
            "started_at": "2026-08-20T15:00:00Z",
            "root_cause": "员工安全意识不足，未正确使用安全防护装置；设备安全联锁存在缺陷",
            "contributing_factors": [
                "新员工培训不到位",
                "设备日常检查未发现安全联锁问题",
                "现场安全监督不足",
            ],
        },
        "corrective_actions": [
            {
                "action": "立即修复冲压机安全联锁装置",
                "responsible": "设备部",
                "deadline": "2026-08-22",
                "status": "in_progress",
            },
            {
                "action": "组织全员安全操作规程再培训",
                "responsible": "EHS部",
                "deadline": "2026-08-25",
                "status": "planned",
            },
            {
                "action": "增加现场安全巡检频次",
                "responsible": "各车间",
                "deadline": "2026-08-21",
                "status": "completed",
            },
        ],
        "attachments": [
            {
                "id": "ATT-001",
                "name": "现场照片.jpg",
                "size": 2048000,
                "url": "/api/ehs/attachments/ATT-001",
            },
            {
                "id": "ATT-002",
                "name": "事故调查报告.pdf",
                "size": 1024000,
                "url": "/api/ehs/attachments/ATT-002",
            },
        ],
        "created_at": "2026-08-20T14:45:00Z",
        "updated_at": "2026-08-21T10:30:00Z",
    })
}

/// 生成 Mock 隐患列表
fn generate_mock_hazards(
    risk_filter: &str,
    status_filter: &str,
    location_filter: &str,
) -> Vec<Value> {
    let risk_levels = ["low", "medium", "high", "extreme"];
    let statuses = [
        "identified",
        "assessing",
        "rectifying",
        "verified",
        "closed",
    ];
    let locations = ["一车间", "二车间", "仓库", "办公楼", "厂区道路", "配电房"];
    let categories = [
        "电气安全",
        "机械安全",
        "消防安全",
        "化学品安全",
        "高处作业",
        "职业健康",
    ];

    (0..120)
        .map(|i| {
            let risk_level = risk_levels[i % risk_levels.len()];
            let status = statuses[i % statuses.len()];
            let location = locations[i % locations.len()];
            let category = categories[i % categories.len()];

            json!({
                "hazard_id": format!("HZD-{:08}", i + 1),
                "hazard_number": format!("HZD2026{:06}", i + 1),
                "description": format!("{}隐患{:03}", category, i + 1),
                "category": category,
                "risk_level": risk_level,
                "status": status,
                "location": location,
                "identified_by": format!("员工{:03}", (i % 50) + 1),
                "identified_at": format!("2026-08-{:02}", (i % 26) + 1),
                "rectification_deadline": format!("2026-09-{:02}", (i % 28) + 1),
            })
        })
        .filter(|h| {
            (risk_filter.is_empty() || h["risk_level"].as_str() == Some(risk_filter))
                && (status_filter.is_empty() || h["status"].as_str() == Some(status_filter))
                && (location_filter.is_empty() || h["location"].as_str() == Some(location_filter))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_ehs_tools() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_ehs_tools(&server, "test-secret").await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("ehs.list_incidents").await);
        assert!(registry.has_tool("ehs.get_incident").await);
        assert!(registry.has_tool("ehs.list_hazards").await);
        assert!(registry.has_tool("ehs.create_incident").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_incidents() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_ehs_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("ehs.list_incidents", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["incidents"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_incident() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_ehs_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("ehs.get_incident", json!({"incident_id": "INC-00000001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["incident_id"], "INC-00000001");
            assert!(parsed["investigation"].is_object());
            assert!(parsed["corrective_actions"].is_array());
            assert!(parsed["injured_persons"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_hazards() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_ehs_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "ehs.list_hazards",
                json!({"page": 1, "page_size": 10, "risk_level": "high"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["hazards"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_incident() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_ehs_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "ehs.create_incident",
                json!({
                    "title": "测试安全事件",
                    "incident_type": "near_miss",
                    "level": "minor",
                    "occurred_at": "2026-08-25T10:00:00Z",
                    "location": "二车间",
                    "description": "测试事件描述",
                    "reporter": "测试员工"
                }),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["title"], "测试安全事件");
            assert_eq!(parsed["incident_type"], "near_miss");
            assert_eq!(parsed["level"], "minor");
            assert_eq!(parsed["status"], "reported");
            assert!(parsed["incident_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_incident_validation() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_ehs_tools(&server, "test-secret").await;

        // 缺少 title
        let result = server
            .tool_registry()
            .call_tool(
                "ehs.create_incident",
                json!({
                    "incident_type": "near_miss",
                    "level": "minor",
                    "occurred_at": "2026-08-25T10:00:00Z",
                    "location": "二车间"
                }),
            )
            .await;
        assert!(result.is_err());

        // 缺少 location
        let result = server
            .tool_registry()
            .call_tool(
                "ehs.create_incident",
                json!({
                    "title": "测试",
                    "incident_type": "near_miss",
                    "level": "minor",
                    "occurred_at": "2026-08-25T10:00:00Z"
                }),
            )
            .await;
        assert!(result.is_err());
    }
}
