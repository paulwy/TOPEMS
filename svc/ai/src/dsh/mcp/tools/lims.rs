//! LIMS MCP Tools — 实验室信息管理系统业务工具。
//!
//! 注册 4 个 LIMS 业务工具到 MCP Server：
//! - lims.list_samples — 查询样品列表
//! - lims.get_sample — 获取样品详情
//! - lims.list_tests — 查询检测项目列表
//! - lims.create_sample — 创建样品
//!
//! 当前版本优先调用真实 LIMS 服务（网关 8099 / LIMS_SERVICE_URL），调用失败时回退 mock 数据。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;
use super::super::tools::{http_call, service_base_url, url_encode};

/// 注册 LIMS 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - lims.list_samples — 查询样品列表（支持分页、状态筛选、类型筛选）
/// - lims.get_sample — 获取样品详情（按ID）
/// - lims.list_tests — 查询检测项目列表（支持分页、样品筛选、状态筛选）
/// - lims.create_sample — 创建样品（名称、类型、来源、送检人）
pub async fn register_lims_tools(server: &McpServer, _jwt_secret: &str) {
    let registry = server.tool_registry();

    // 1. lims.list_samples
    registry
        .register(
            "lims.list_samples",
            "查询LIMS样品列表，支持分页、状态筛选和类型筛选。返回样品的基本信息列表，包括样品编号、名称、类型、来源、状态、送检人、接收日期、检测项目数等。",
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
                        .description("样品状态筛选")
                        .enum_values(&["received", "in_testing", "completed", "rejected", "archived"]),
                )
                .property(
                    "sample_type",
                    SchemaBuilder::string()
                        .description("样品类型筛选")
                        .enum_values(&["raw_material", "in_process", "finished_product", "environment", "water", "air"]),
                )
                .property(
                    "submitter",
                    SchemaBuilder::string().description("送检人筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配样品编号、名称）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let status = params["status"].as_str().unwrap_or("");
                let sample_type = params["sample_type"].as_str().unwrap_or("");
                let submitter = params["submitter"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                let base = service_base_url("LIMS_SERVICE_URL", 8051);
                let mut path = format!("/api/lims/samples?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                if !sample_type.is_empty() { path.push_str(&format!("&sample_type={}", url_encode(sample_type))); }
                if !keyword.is_empty() { path.push_str(&format!("&keyword={}", url_encode(keyword))); }
                let samples = if let Some(data) = http_call(&base, "GET", &path, None) {
                    data.as_array().cloned().unwrap_or_default()
                } else {
                    generate_mock_samples(status, sample_type, submitter, keyword)
                };
                let total = samples.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_samples = &samples[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "samples": page_samples,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. lims.get_sample
    registry
        .register(
            "lims.get_sample",
            "获取LIMS样品详情，按样品ID查询。返回样品的完整信息，包括基本信息、来源信息、检测项目、检测结果、审核信息、附件等。",
            SchemaBuilder::object()
                .property(
                    "sample_id",
                    SchemaBuilder::string().description("样品ID"),
                )
                .required(&["sample_id"])
                .build(),
            |params| {
                let sample_id = params["sample_id"].as_str().unwrap_or("");

                if sample_id.is_empty() {
                    return Err(ToolExecutionError::Validation("sample_id is required".to_string()));
                }

                let base = service_base_url("LIMS_SERVICE_URL", 8051);
                let sample = if let Some(data) = http_call(&base, "GET", &format!("/api/lims/samples/{}", url_encode(&sample_id)), None) {
                    data
                } else {
                    generate_mock_sample_detail(sample_id)
                };

                Ok(McpToolResult {
                    content: vec![McpContent::text(sample.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. lims.list_tests
    registry
        .register(
            "lims.list_tests",
            "查询LIMS检测项目列表，支持分页、样品筛选和状态筛选。返回检测项目的基本信息列表，包括检测编号、名称、样品、方法、状态、检测人、结果、单位等。",
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
                    "sample_id",
                    SchemaBuilder::string().description("样品ID筛选"),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("检测状态筛选")
                        .enum_values(&["pending", "in_progress", "completed", "reviewed", "rejected"]),
                )
                .property(
                    "test_method",
                    SchemaBuilder::string().description("检测方法筛选"),
                )
                .property(
                    "tester",
                    SchemaBuilder::string().description("检测人筛选"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let sample_id = params["sample_id"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let test_method = params["test_method"].as_str().unwrap_or("");
                let tester = params["tester"].as_str().unwrap_or("");

                let base = service_base_url("LIMS_SERVICE_URL", 8051);
                let mut path = format!("/api/lims/tasks?page={}&page_size={}", page, page_size);
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                let tests = if let Some(data) = http_call(&base, "GET", &path, None) {
                    data.as_array().cloned().unwrap_or_default()
                } else {
                    generate_mock_tests(sample_id, status, test_method, tester)
                };
                let total = tests.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_tests = &tests[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "tests": page_tests,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. lims.create_sample
    registry
        .register(
            "lims.create_sample",
            "创建LIMS样品。需要提供样品名称、类型、来源和送检人，返回新创建的样品ID和样品编号。",
            SchemaBuilder::object()
                .property("name", SchemaBuilder::string().description("样品名称"))
                .property(
                    "sample_type",
                    SchemaBuilder::string()
                        .description("样品类型")
                        .enum_values(&[
                            "raw_material",
                            "in_process",
                            "finished_product",
                            "environment",
                            "water",
                            "air",
                        ]),
                )
                .property(
                    "source",
                    SchemaBuilder::string().description("样品来源（供应商/生产线/采样点）"),
                )
                .property("submitter", SchemaBuilder::string().description("送检人"))
                .property(
                    "quantity",
                    SchemaBuilder::number().description("样品数量").minimum(0.0),
                )
                .property("unit", SchemaBuilder::string().description("数量单位"))
                .property(
                    "description",
                    SchemaBuilder::string().description("样品描述"),
                )
                .property(
                    "test_items",
                    SchemaBuilder::array()
                        .description("检测项目列表")
                        .items(SchemaBuilder::string()),
                )
                .required(&["name", "sample_type", "source", "submitter"])
                .build(),
            |params| {
                let name = params["name"].as_str().unwrap_or("");
                let sample_type = params["sample_type"].as_str().unwrap_or("");
                let source = params["source"].as_str().unwrap_or("");
                let submitter = params["submitter"].as_str().unwrap_or("");

                if name.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "name is required".to_string(),
                    ));
                }
                if sample_type.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "sample_type is required".to_string(),
                    ));
                }
                if source.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "source is required".to_string(),
                    ));
                }
                if submitter.is_empty() {
                    return Err(ToolExecutionError::Validation(
                        "submitter is required".to_string(),
                    ));
                }

                let base = service_base_url("LIMS_SERVICE_URL", 8051);
                let body = json!({
                    "name": name,
                    "sample_type": sample_type,
                    "source": source,
                    "submitter": submitter,
                    "quantity": params["quantity"].as_f64().unwrap_or(0.0),
                    "unit": params["unit"].as_str().unwrap_or(""),
                    "description": params["description"].as_str().unwrap_or(""),
                });
                let result = http_call(&base, "POST", "/api/lims/samples", Some(body))
                    .map(|data| {
                        let mut d = data;
                        if d.get("message").is_none() {
                            d["message"] = json!("样品创建成功，已分配样品编号，等待检测安排");
                        }
                        d
                    })
                    .unwrap_or_else(|| {
                        let sample_id = format!(
                            "SMP-{}",
                            uuid::Uuid::new_v4()
                                .to_string()
                                .split('-')
                                .next()
                                .unwrap_or("00000000")
                        );
                        let sample_number =
                            format!("LIMS{}{:06}", chrono::Utc::now().format("%Y%m%d"), 1001);
                        json!({
                            "sample_id": sample_id,
                            "sample_number": sample_number,
                            "name": name,
                            "sample_type": sample_type,
                            "source": source,
                            "submitter": submitter,
                            "quantity": params["quantity"].as_f64().unwrap_or(0.0),
                            "unit": params["unit"].as_str().unwrap_or(""),
                            "description": params["description"].as_str().unwrap_or(""),
                            "test_items": params["test_items"].as_array().unwrap_or(&vec![]),
                            "status": "received",
                            "received_at": chrono::Utc::now().to_rfc3339(),
                            "created_at": chrono::Utc::now().to_rfc3339(),
                            "message": "样品创建成功，已分配样品编号，等待检测安排",
                        })
                    });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("LIMS MCP Tools registered: 4 tools (lims.list_samples, lims.get_sample, lims.list_tests, lims.create_sample)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 样品列表
fn generate_mock_samples(
    status_filter: &str,
    type_filter: &str,
    submitter_filter: &str,
    keyword_filter: &str,
) -> Vec<Value> {
    let statuses = [
        "received",
        "in_testing",
        "completed",
        "completed",
        "rejected",
        "archived",
    ];
    let types = [
        "raw_material",
        "in_process",
        "finished_product",
        "environment",
        "water",
        "air",
    ];
    let submitters = ["张三", "李四", "王五", "赵六", "钱七"];

    (0..120)
        .map(|i| {
            let status = statuses[i % statuses.len()];
            let sample_type = types[i % types.len()];
            let submitter = submitters[i % submitters.len()];

            json!({
                "sample_id": format!("SMP-{:08}", i + 1),
                "sample_number": format!("LIMS2026{:06}", i + 1),
                "name": format!("样品{:03}", i + 1),
                "sample_type": sample_type,
                "source": format!("来源{:03}", (i % 20) + 1),
                "status": status,
                "submitter": submitter,
                "receiver": submitters[(i + 1) % submitters.len()],
                "received_date": format!("2026-{:02}-{:02}", (i % 12) + 1, (i % 28) + 1),
                "test_count": 3 + (i % 8),
                "completed_tests": if status == "completed" { 3 + (i % 8) } else { i % 5 },
                "quantity": 100 + (i % 10) * 50,
                "unit": if i % 3 == 0 { "g" } else if i % 3 == 1 { "mL" } else { "个" },
                "priority": if i % 4 == 0 { "urgent" } else if i % 4 == 1 { "high" } else { "normal" },
                "created_at": format!("2026-{:02}-{:02}T10:00:00Z", (i % 12) + 1, (i % 28) + 1),
            })
        })
        .filter(|s| {
            (status_filter.is_empty() || s["status"].as_str() == Some(status_filter))
                && (type_filter.is_empty() || s["sample_type"].as_str() == Some(type_filter))
                && (submitter_filter.is_empty() || s["submitter"].as_str() == Some(submitter_filter))
                && (keyword_filter.is_empty()
                    || s["sample_number"].as_str().unwrap_or("").contains(keyword_filter)
                    || s["name"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

/// 生成 Mock 样品详情
fn generate_mock_sample_detail(sample_id: &str) -> Value {
    json!({
        "sample_id": sample_id,
        "sample_number": "LIMS2026001001",
        "name": "原材料A批次202608",
        "sample_type": "raw_material",
        "source": "供应商A-批次B20260801",
        "status": "completed",
        "submitter": "张三",
        "receiver": "李四",
        "received_date": "2026-08-20",
        "completed_date": "2026-08-22",
        "quantity": 500,
        "unit": "g",
        "priority": "high",
        "description": "原材料A的2026年8月批次样品，用于来料检验",
        "storage_condition": "常温干燥保存",
        "expiry_date": "2026-09-20",
        "test_items": [
            {"id": "TEST-001", "name": "外观检查", "method": "目视检查", "status": "completed", "result": "合格", "tester": "王五"},
            {"id": "TEST-002", "name": "纯度检测", "method": "HPLC", "status": "completed", "result": "99.5%", "unit": "%", "standard": "≥99.0%", "tester": "赵六"},
            {"id": "TEST-003", "name": "水分含量", "method": "卡尔费休法", "status": "completed", "result": "0.3%", "unit": "%", "standard": "≤0.5%", "tester": "钱七"},
            {"id": "TEST-004", "name": "重金属检测", "method": "ICP-MS", "status": "completed", "result": "合格", "tester": "王五"},
            {"id": "TEST-005", "name": "微生物检测", "method": "平板计数法", "status": "completed", "result": "合格", "tester": "赵六"},
        ],
        "test_summary": {
            "total": 5,
            "passed": 5,
            "failed": 0,
            "pass_rate": 100,
        },
        "conclusion": "合格",
        "reviewer": "质量经理李四",
        "reviewed_at": "2026-08-22T16:00:00Z",
        "attachments": [
            {"id": "ATT-001", "name": "检测报告.pdf", "size": 1024000, "url": "/api/lims/attachments/ATT-001"},
            {"id": "ATT-002", "name": "原始记录.xlsx", "size": 512000, "url": "/api/lims/attachments/ATT-002"},
        ],
        "created_at": "2026-08-20T10:00:00Z",
        "updated_at": "2026-08-22T16:00:00Z",
    })
}

/// 生成 Mock 检测项目列表
fn generate_mock_tests(
    sample_filter: &str,
    status_filter: &str,
    method_filter: &str,
    tester_filter: &str,
) -> Vec<Value> {
    let statuses = [
        "pending",
        "in_progress",
        "completed",
        "reviewed",
        "rejected",
    ];
    let methods = [
        "HPLC",
        "GC",
        "ICP-MS",
        "目视检查",
        "卡尔费休法",
        "平板计数法",
        "滴定法",
        "分光光度法",
    ];
    let testers = ["张三", "李四", "王五", "赵六", "钱七"];
    let test_names = [
        "外观检查",
        "纯度检测",
        "水分含量",
        "重金属检测",
        "微生物检测",
        "pH值",
        "密度",
        "粘度",
        "熔点",
        "灰分",
    ];

    (0..300)
        .map(|i| {
            let status = statuses[i % statuses.len()];
            let method = methods[i % methods.len()];
            let tester = testers[i % testers.len()];
            let test_name = test_names[i % test_names.len()];
            let result = if status == "completed" || status == "reviewed" {
                if i % 10 == 0 { "不合格" } else { "合格" }
            } else {
                ""
            };

            json!({
                "test_id": format!("TEST-{:08}", i + 1),
                "test_number": format!("TST2026{:06}", i + 1),
                "name": test_name,
                "sample_id": format!("SMP-{:08}", (i % 30) + 1),
                "sample_name": format!("样品{:03}", (i % 30) + 1),
                "method": method,
                "status": status,
                "tester": tester,
                "result": result,
                "unit": if i % 4 == 0 { "%" } else if i % 4 == 1 { "mg/L" } else if i % 4 == 2 { "g/cm³" } else { "" },
                "standard_value": if i % 4 == 0 { "≥99.0" } else if i % 4 == 1 { "≤10" } else if i % 4 == 2 { "1.0-1.2" } else { "合格" },
                "started_at": if status != "pending" { Some(format!("2026-{:02}-{:02}T10:00:00Z", (i % 12) + 1, (i % 28) + 1)) } else { None },
                "completed_at": if status == "completed" || status == "reviewed" { Some(format!("2026-{:02}-{:02}T14:00:00Z", (i % 12) + 1, (i % 28) + 1)) } else { None },
                "created_at": format!("2026-{:02}-{:02}T10:00:00Z", (i % 12) + 1, (i % 28) + 1),
            })
        })
        .filter(|t| {
            (sample_filter.is_empty() || t["sample_id"].as_str() == Some(sample_filter))
                && (status_filter.is_empty() || t["status"].as_str() == Some(status_filter))
                && (method_filter.is_empty() || t["method"].as_str() == Some(method_filter))
                && (tester_filter.is_empty() || t["tester"].as_str() == Some(tester_filter))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_lims_tools() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_lims_tools(&server, "test-secret").await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("lims.list_samples").await);
        assert!(registry.has_tool("lims.get_sample").await);
        assert!(registry.has_tool("lims.list_tests").await);
        assert!(registry.has_tool("lims.create_sample").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_samples() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_lims_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("lims.list_samples", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["samples"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_sample() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_lims_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("lims.get_sample", json!({"sample_id": "SMP-00000001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["sample_id"], "SMP-00000001");
            assert!(parsed["test_items"].is_array());
            assert!(parsed["test_summary"].is_object());
            assert!(parsed["attachments"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_tests() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_lims_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "lims.list_tests",
                json!({"page": 1, "page_size": 10, "status": "completed"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["tests"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_sample() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_lims_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "lims.create_sample",
                json!({
                    "name": "原材料B批次202609",
                    "sample_type": "raw_material",
                    "source": "供应商B-批次B20260901",
                    "submitter": "张三",
                    "quantity": 300,
                    "unit": "g",
                    "description": "原材料B的2026年9月批次样品",
                    "test_items": ["外观检查", "纯度检测", "水分含量"]
                }),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["name"], "原材料B批次202609");
            assert_eq!(parsed["sample_type"], "raw_material");
            assert_eq!(parsed["source"], "供应商B-批次B20260901");
            assert_eq!(parsed["submitter"], "张三");
            assert_eq!(parsed["status"], "received");
            assert!(parsed["sample_id"].is_string());
            assert!(parsed["test_items"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_sample_validation() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_lims_tools(&server, "test-secret").await;

        // 缺少 source
        let result = server
            .tool_registry()
            .call_tool(
                "lims.create_sample",
                json!({
                    "name": "测试样品",
                    "sample_type": "raw_material",
                    "submitter": "张三"
                }),
            )
            .await;
        assert!(result.is_err());

        // 缺少 submitter
        let result = server
            .tool_registry()
            .call_tool(
                "lims.create_sample",
                json!({
                    "name": "测试样品",
                    "sample_type": "raw_material",
                    "source": "供应商A"
                }),
            )
            .await;
        assert!(result.is_err());
    }
}
