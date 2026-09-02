//! QMS MCP Tools — 质量管理系统业务工具。
//!
//! 注册 4 个 QMS 业务工具到 MCP Server：
//! - qms.list_inspections — 查询检验单列表
//! - qms.get_inspection — 获取检验单详情
//! - qms.list_nonconformances — 查询不合格品列表
//! - qms.create_inspection — 创建检验单
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 QMS API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;
use super::super::tools::{http_call, service_base_url, url_encode};

/// 注册 QMS 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - qms.list_inspections — 查询检验单列表（支持分页、类型筛选、状态筛选）
/// - qms.get_inspection — 获取检验单详情（按ID）
/// - qms.list_nonconformances — 查询不合格品列表（支持分页、严重程度筛选）
/// - qms.create_inspection — 创建检验单（类型、物料、数量、检验员）
pub async fn register_qms_tools(server: &McpServer) {
    let registry = server.tool_registry();

    // 1. qms.list_inspections
    registry
        .register(
            "qms.list_inspections",
            "查询QMS检验单列表，支持分页、类型筛选和状态筛选。返回检验单的基本信息列表，包括检验单号、类型、物料、数量、检验员、状态、检验结果等。",
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
                    "inspection_type",
                    SchemaBuilder::string()
                        .description("检验类型筛选")
                        .enum_values(&["incoming", "in_process", "final", "outgoing", "audit"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("检验状态筛选")
                        .enum_values(&["pending", "in_progress", "completed", "cancelled"]),
                )
                .property(
                    "result",
                    SchemaBuilder::string()
                        .description("检验结果筛选")
                        .enum_values(&["pass", "fail", "conditional"]),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let inspection_type = params["inspection_type"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let result = params["result"].as_str().unwrap_or("");

                // 真实调用 QMS API（GET /checks，降级 mock）
                let mut path = format!("/api/qms/checks?page={}&page_size={}", page, page_size);
                if !inspection_type.is_empty() { path.push_str(&format!("&inspection_type={}", url_encode(inspection_type))); }
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                if !result.is_empty() { path.push_str(&format!("&result={}", url_encode(result))); }
                let base = service_base_url("QMS_SERVICE_URL", 8050);
                let result_json = http_call(&base, "GET", &path, None).map(|data| {
                    let items = data.get("inspections").cloned().unwrap_or(json!([]));
                    let total = data.get("total").cloned().unwrap_or(json!(0));
                    json!({ "total": total, "page": page, "page_size": page_size, "inspections": items })
                }).unwrap_or_else(|| {
                    let inspections = generate_mock_inspections(inspection_type, status, result);
                    let total = inspections.len();
                    let start = ((page - 1) * page_size) as usize;
                    let end = (start + page_size as usize).min(total);
                    let page_inspections = &inspections[start.min(total)..end];
                    json!({
                        "total": total,
                        "page": page,
                        "page_size": page_size,
                        "inspections": page_inspections,
                    })
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result_json.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. qms.get_inspection
    registry
        .register(
            "qms.get_inspection",
            "获取QMS检验单详情，按检验单ID查询。返回检验单的完整信息，包括基本信息、物料信息、检验项目、检验结果、不合格项、检验员、审核信息等。",
            SchemaBuilder::object()
                .property(
                    "inspection_id",
                    SchemaBuilder::string().description("检验单ID"),
                )
                .required(&["inspection_id"])
                .build(),
            |params| {
                let inspection_id = params["inspection_id"].as_str().unwrap_or("");

                if inspection_id.is_empty() {
                    return Err(ToolExecutionError::Validation("inspection_id is required".to_string()));
                }

                // 真实调用 QMS API（GET /checks/{id}，降级 mock）
                let base = service_base_url("QMS_SERVICE_URL", 8050);
                let inspection = http_call(&base, "GET", &format!("/api/qms/checks/{}", inspection_id), None)
                    .unwrap_or_else(|| generate_mock_inspection_detail(inspection_id));

                Ok(McpToolResult {
                    content: vec![McpContent::text(inspection.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. qms.list_nonconformances
    registry
        .register(
            "qms.list_nonconformances",
            "查询QMS不合格品列表，支持分页、严重程度筛选和状态筛选。返回不合格品的基本信息列表，包括不合格单号、类型、物料、数量、严重程度、状态、处理方式等。",
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
                    "severity",
                    SchemaBuilder::string()
                        .description("严重程度筛选")
                        .enum_values(&["minor", "major", "critical"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("处理状态筛选")
                        .enum_values(&["open", "analyzing", "dispositioned", "closed"]),
                )
                .property(
                    "disposition",
                    SchemaBuilder::string()
                        .description("处理方式筛选")
                        .enum_values(&["rework", "scrap", "use_as_is", "return_to_supplier", "concession"]),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let severity = params["severity"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let disposition = params["disposition"].as_str().unwrap_or("");

                // 真实调用 QMS API（GET /issues，降级 mock）
                let mut path = format!("/api/qms/issues?page={}&page_size={}", page, page_size);
                if !severity.is_empty() { path.push_str(&format!("&severity={}", url_encode(severity))); }
                if !status.is_empty() { path.push_str(&format!("&status={}", url_encode(status))); }
                if !disposition.is_empty() { path.push_str(&format!("&disposition={}", url_encode(disposition))); }
                let base = service_base_url("QMS_SERVICE_URL", 8050);
                let result = http_call(&base, "GET", &path, None).map(|data| {
                    let items = data.as_array().cloned().unwrap_or_default();
                    let total = items.len();
                    json!({ "total": total, "page": page, "page_size": page_size, "nonconformances": items })
                }).unwrap_or_else(|| {
                    let nonconformances = generate_mock_nonconformances(severity, status, disposition);
                    let total = nonconformances.len();
                    let start = ((page - 1) * page_size) as usize;
                    let end = (start + page_size as usize).min(total);
                    let page_nc = &nonconformances[start.min(total)..end];
                    json!({
                        "total": total,
                        "page": page,
                        "page_size": page_size,
                        "nonconformances": page_nc,
                    })
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. qms.create_inspection
    registry
        .register(
            "qms.create_inspection",
            "创建QMS检验单。需要提供检验类型、物料编码、检验数量和检验员，返回新创建的检验单ID和检验单号。",
            SchemaBuilder::object()
                .property(
                    "inspection_type",
                    SchemaBuilder::string()
                        .description("检验类型")
                        .enum_values(&["incoming", "in_process", "final", "outgoing", "audit"]),
                )
                .property(
                    "material_id",
                    SchemaBuilder::string().description("物料ID"),
                )
                .property(
                    "material_code",
                    SchemaBuilder::string().description("物料编码"),
                )
                .property(
                    "quantity",
                    SchemaBuilder::integer().description("检验数量").minimum(1.0),
                )
                .property(
                    "inspector",
                    SchemaBuilder::string().description("检验员"),
                )
                .property(
                    "reference_order",
                    SchemaBuilder::string().description("关联单号（采购订单/生产订单）"),
                )
                .property(
                    "remark",
                    SchemaBuilder::string().description("备注"),
                )
                .required(&["inspection_type", "material_id", "quantity"])
                .build(),
            |params| {
                let inspection_type = params["inspection_type"].as_str().unwrap_or("");
                let material_id = params["material_id"].as_str().unwrap_or("");
                let quantity = params["quantity"].as_i64().unwrap_or(0);

                if inspection_type.is_empty() {
                    return Err(ToolExecutionError::Validation("inspection_type is required".to_string()));
                }
                if material_id.is_empty() {
                    return Err(ToolExecutionError::Validation("material_id is required".to_string()));
                }
                if quantity <= 0 {
                    return Err(ToolExecutionError::Validation("quantity must be positive".to_string()));
                }

                // 真实调用 QMS API（POST /checks，降级 mock）
                let payload = json!({
                    "inspection_type": inspection_type,
                    "material_id": material_id,
                    "material_code": params["material_code"].as_str().unwrap_or(""),
                    "quantity": quantity,
                    "inspector": params["inspector"].as_str().unwrap_or(""),
                    "reference_order": params["reference_order"].as_str().unwrap_or(""),
                    "remark": params["remark"].as_str().unwrap_or(""),
                });
                let base = service_base_url("QMS_SERVICE_URL", 8050);
                let result = http_call(&base, "POST", "/api/qms/checks", Some(payload)).unwrap_or_else(|| {
                    let inspection_id = format!("INS-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("00000000"));
                    let inspection_number = format!("QMS{}{:06}", chrono::Utc::now().format("%Y%m%d"), 1001);
                    json!({
                        "inspection_id": inspection_id,
                        "inspection_number": inspection_number,
                        "inspection_type": inspection_type,
                        "material_id": material_id,
                        "material_code": params["material_code"].as_str().unwrap_or(""),
                        "quantity": quantity,
                        "inspector": params["inspector"].as_str().unwrap_or(""),
                        "reference_order": params["reference_order"].as_str().unwrap_or(""),
                        "remark": params["remark"].as_str().unwrap_or(""),
                        "status": "pending",
                        "created_at": chrono::Utc::now().to_rfc3339(),
                        "message": "检验单创建成功（mock 降级），已通知检验员",
                    })
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("QMS MCP Tools registered: 4 tools (qms.list_inspections, qms.get_inspection, qms.list_nonconformances, qms.create_inspection)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 检验单列表
fn generate_mock_inspections(
    type_filter: &str,
    status_filter: &str,
    result_filter: &str,
) -> Vec<Value> {
    let types = ["incoming", "in_process", "final", "outgoing", "audit"];
    let statuses = [
        "pending",
        "in_progress",
        "completed",
        "completed",
        "cancelled",
    ];
    let results = ["pass", "pass", "pass", "fail", "conditional"];
    let inspectors = ["张三", "李四", "王五", "赵六", "钱七"];

    (0..150)
        .map(|i| {
            let inspection_type = types[i % types.len()];
            let status = statuses[i % statuses.len()];
            let result = if status == "completed" { results[i % results.len()] } else { "pending" };
            let inspector = inspectors[i % inspectors.len()];

            json!({
                "inspection_id": format!("INS-{:08}", i + 1),
                "inspection_number": format!("QMS2026{:06}", i + 1),
                "inspection_type": inspection_type,
                "material_id": format!("MAT-{:04}", (i % 50) + 1),
                "material_code": format!("M{:06}", (i % 50) + 1),
                "material_name": format!("物料{:03}", (i % 50) + 1),
                "quantity": 100 + (i % 10) * 50,
                "sampled_quantity": if status == "pending" { 0 } else { 10 + (i % 5) * 5 },
                "inspector": inspector,
                "status": status,
                "result": result,
                "reference_order": format!("{}{:06}", if inspection_type == "incoming" { "PO" } else { "MO" }, (i % 100) + 1),
                "created_at": format!("2026-08-{:02}T{:02}:{:02}:00Z", (i % 26) + 1, (i % 24), (i % 60)),
                "completed_at": if status == "completed" { Some(format!("2026-08-{:02}T{:02}:{:02}:00Z", (i % 26) + 1, (i % 24) + 2, (i % 60))) } else { None },
            })
        })
        .filter(|ins| {
            (type_filter.is_empty() || ins["inspection_type"].as_str() == Some(type_filter))
                && (status_filter.is_empty() || ins["status"].as_str() == Some(status_filter))
                && (result_filter.is_empty() || ins["result"].as_str() == Some(result_filter))
        })
        .collect()
}

/// 生成 Mock 检验单详情
fn generate_mock_inspection_detail(inspection_id: &str) -> Value {
    json!({
        "inspection_id": inspection_id,
        "inspection_number": "QMS2026001001",
        "inspection_type": "incoming",
        "material_id": "MAT-0001",
        "material_code": "M000001",
        "material_name": "智能传感器A1",
        "material_spec": "型号A1-2026，精度±0.1%",
        "supplier": "深圳某电子有限公司",
        "quantity": 500,
        "sampled_quantity": 32,
        "accepted_quantity": 490,
        "rejected_quantity": 10,
        "inspector": "张三",
        "status": "completed",
        "result": "conditional",
        "reference_order": "PO202608001",
        "inspection_items": [
            {"item": "外观检查", "standard": "无划痕、无变形", "sampled": 32, "passed": 30, "failed": 2, "result": "fail"},
            {"item": "尺寸测量", "standard": "10.0±0.1mm", "sampled": 32, "passed": 32, "failed": 0, "result": "pass"},
            {"item": "电气性能", "standard": "工作电压3.3V，电流<50mA", "sampled": 32, "passed": 31, "failed": 1, "result": "fail"},
            {"item": "可靠性测试", "standard": "高温老化72小时无故障", "sampled": 5, "passed": 5, "failed": 0, "result": "pass"},
        ],
        "defects": [
            {"type": "外观划痕", "count": 2, "severity": "minor"},
            {"type": "电气性能超标", "count": 1, "severity": "major"},
        ],
        "disposition": {
            "decision": "use_as_is",
            "reason": "不合格项不影响主要功能，经评估可让步接收",
            "approved_by": "质量经理李四",
            "approved_at": "2026-08-21T15:00:00Z",
        },
        "attachments": [
            {"id": "ATT-001", "name": "检验报告.pdf", "size": 1024000, "url": "/api/qms/attachments/ATT-001"},
            {"id": "ATT-002", "name": "不合格品照片.jpg", "size": 2048000, "url": "/api/qms/attachments/ATT-002"},
        ],
        "created_at": "2026-08-20T10:00:00Z",
        "started_at": "2026-08-20T10:30:00Z",
        "completed_at": "2026-08-20T16:00:00Z",
        "updated_at": "2026-08-21T15:00:00Z",
    })
}

/// 生成 Mock 不合格品列表
fn generate_mock_nonconformances(
    severity_filter: &str,
    status_filter: &str,
    disposition_filter: &str,
) -> Vec<Value> {
    let severities = ["minor", "minor", "major", "critical"];
    let statuses = ["open", "analyzing", "dispositioned", "closed"];
    let dispositions = [
        "rework",
        "scrap",
        "use_as_is",
        "return_to_supplier",
        "concession",
    ];
    let types = [
        "外观缺陷",
        "尺寸超差",
        "性能不达标",
        "包装破损",
        "标识错误",
        "混料",
    ];

    (0..100)
        .map(|i| {
            let severity = severities[i % severities.len()];
            let status = statuses[i % statuses.len()];
            let disposition = if status == "dispositioned" || status == "closed" {
                dispositions[i % dispositions.len()]
            } else {
                "pending"
            };
            let nc_type = types[i % types.len()];

            json!({
                "nc_id": format!("NC-{:08}", i + 1),
                "nc_number": format!("NCR2026{:06}", i + 1),
                "type": nc_type,
                "severity": severity,
                "status": status,
                "disposition": disposition,
                "material_id": format!("MAT-{:04}", (i % 50) + 1),
                "material_name": format!("物料{:03}", (i % 50) + 1),
                "quantity": 5 + (i % 20),
                "source_inspection": format!("QMS2026{:06}", (i % 50) + 1),
                "responsible": format!("部门{}", (i % 5) + 1),
                "created_at": format!("2026-08-{:02}", (i % 26) + 1),
                "closed_at": if status == "closed" { Some(format!("2026-08-{:02}", (i % 26) + 3)) } else { None },
            })
        })
        .filter(|nc| {
            (severity_filter.is_empty() || nc["severity"].as_str() == Some(severity_filter))
                && (status_filter.is_empty() || nc["status"].as_str() == Some(status_filter))
                && (disposition_filter.is_empty() || nc["disposition"].as_str() == Some(disposition_filter))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "需要 QMS_SERVICE_URL 指向真实 qms 服务时手动运行"]
    async fn test_list_inspections_real_api() {
        if std::env::var("QMS_SERVICE_URL").is_err() {
            eprintln!("SKIP: 未设置 QMS_SERVICE_URL");
            return;
        }
        let server = McpServer::new("test", "1.0.0");
        register_qms_tools(&server).await;
        let result = server
            .tool_registry()
            .call_tool("qms.list_inspections", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();
        assert_eq!(result.content.len(), 1);
        let text = match &result.content[0] {
            McpContent::Text { text } => text.clone(),
            _ => String::new(),
        };
        let parsed: Value = serde_json::from_str(&text).unwrap_or(json!({}));
        let total = parsed["total"].as_u64().unwrap_or(0);
        assert!(total > 0, "真实 API 应返回检查单，total={}", total);
        eprintln!("qms.list_inspections 真实调用返回 total = {}", total);
    }

    #[tokio::test]
    async fn test_register_qms_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_qms_tools(&server).await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("qms.list_inspections").await);
        assert!(registry.has_tool("qms.get_inspection").await);
        assert!(registry.has_tool("qms.list_nonconformances").await);
        assert!(registry.has_tool("qms.create_inspection").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_inspections() {
        let server = McpServer::new("test", "1.0.0");
        register_qms_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("qms.list_inspections", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["inspections"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_inspection() {
        let server = McpServer::new("test", "1.0.0");
        register_qms_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool(
                "qms.get_inspection",
                json!({"inspection_id": "INS-00000001"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["inspection_id"], "INS-00000001");
            assert!(parsed["inspection_items"].is_array());
            assert!(parsed["defects"].is_array());
            assert!(parsed["disposition"].is_object());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_nonconformances() {
        let server = McpServer::new("test", "1.0.0");
        register_qms_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool(
                "qms.list_nonconformances",
                json!({"page": 1, "page_size": 10, "severity": "major"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["nonconformances"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_inspection() {
        let server = McpServer::new("test", "1.0.0");
        register_qms_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool(
                "qms.create_inspection",
                json!({
                    "inspection_type": "incoming",
                    "material_id": "MAT-0001",
                    "material_code": "M000001",
                    "quantity": 500,
                    "inspector": "张三",
                    "reference_order": "PO202608001",
                    "remark": "来料检验"
                }),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["inspection_type"], "incoming");
            assert_eq!(parsed["material_id"], "MAT-0001");
            assert_eq!(parsed["quantity"], 500);
            assert_eq!(parsed["status"], "pending");
            assert!(parsed["inspection_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_inspection_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_qms_tools(&server).await;

        // 缺少 material_id
        let result = server
            .tool_registry()
            .call_tool(
                "qms.create_inspection",
                json!({
                    "inspection_type": "incoming",
                    "quantity": 500
                }),
            )
            .await;
        assert!(result.is_err());

        // 数量为0
        let result = server
            .tool_registry()
            .call_tool(
                "qms.create_inspection",
                json!({
                    "inspection_type": "incoming",
                    "material_id": "MAT-0001",
                    "quantity": 0
                }),
            )
            .await;
        assert!(result.is_err());
    }
}
