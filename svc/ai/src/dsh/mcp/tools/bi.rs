//! BI MCP Tools — 商业智能系统业务工具。
//!
//! 注册 4 个 BI 业务工具到 MCP Server：
//! - bi.list_dashboards — 查询仪表盘列表
//! - bi.get_dashboard — 获取仪表盘详情
//! - bi.list_reports — 查询报表列表
//! - bi.get_metric_data — 获取指标数据
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 BI API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 注册 BI 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - bi.list_dashboards — 查询仪表盘列表（支持分页、分类筛选、负责人筛选）
/// - bi.get_dashboard — 获取仪表盘详情（按ID）
/// - bi.list_reports — 查询报表列表（支持分页、类型筛选、状态筛选）
/// - bi.get_metric_data — 获取指标数据（按指标ID、时间范围、维度）
pub async fn register_bi_tools(server: &McpServer, _jwt_secret: &str) {
    let registry = server.tool_registry();

    // 1. bi.list_dashboards
    registry
        .register(
            "bi.list_dashboards",
            "查询BI仪表盘列表，支持分页、分类筛选和负责人筛选。返回仪表盘的基本信息列表，包括仪表盘编号、名称、分类、状态、负责人、创建时间、组件数、访问量等。",
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
                    "category",
                    SchemaBuilder::string()
                        .description("仪表盘分类筛选")
                        .enum_values(&["sales", "finance", "hr", "production", "supply_chain", "quality", "executive"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("仪表盘状态筛选")
                        .enum_values(&["draft", "published", "archived"]),
                )
                .property(
                    "owner",
                    SchemaBuilder::string().description("负责人筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配仪表盘编号、名称）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let category = params["category"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let owner = params["owner"].as_str().unwrap_or("");
                let keyword = params["keyword"].as_str().unwrap_or("");

                let dashboards = generate_mock_dashboards(category, status, owner, keyword);
                let total = dashboards.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_dashboards = &dashboards[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "dashboards": page_dashboards,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. bi.get_dashboard
    registry
        .register(
            "bi.get_dashboard",
            "获取BI仪表盘详情，按仪表盘ID查询。返回仪表盘的完整信息，包括基本信息、组件列表、筛选条件、数据源、权限设置等。",
            SchemaBuilder::object()
                .property(
                    "dashboard_id",
                    SchemaBuilder::string().description("仪表盘ID"),
                )
                .required(&["dashboard_id"])
                .build(),
            |params| {
                let dashboard_id = params["dashboard_id"].as_str().unwrap_or("");

                if dashboard_id.is_empty() {
                    return Err(ToolExecutionError::Validation("dashboard_id is required".to_string()));
                }

                let dashboard = generate_mock_dashboard_detail(dashboard_id);

                Ok(McpToolResult {
                    content: vec![McpContent::text(dashboard.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. bi.list_reports
    registry
        .register(
            "bi.list_reports",
            "查询BI报表列表，支持分页、类型筛选和状态筛选。返回报表的基本信息列表，包括报表编号、名称、类型、状态、负责人、创建时间、调度周期、最近运行时间等。",
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
                    "report_type",
                    SchemaBuilder::string()
                        .description("报表类型筛选")
                        .enum_values(&["tabular", "chart", "pivot", "crosstab", "detail"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("报表状态筛选")
                        .enum_values(&["active", "paused", "failed", "archived"]),
                )
                .property(
                    "schedule",
                    SchemaBuilder::string()
                        .description("调度周期筛选")
                        .enum_values(&["daily", "weekly", "monthly", "quarterly", "on_demand"]),
                )
                .property(
                    "owner",
                    SchemaBuilder::string().description("负责人筛选"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let report_type = params["report_type"].as_str().unwrap_or("");
                let status = params["status"].as_str().unwrap_or("");
                let schedule = params["schedule"].as_str().unwrap_or("");
                let owner = params["owner"].as_str().unwrap_or("");

                let reports = generate_mock_reports(report_type, status, schedule, owner);
                let total = reports.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_reports = &reports[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "reports": page_reports,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. bi.get_metric_data
    registry
        .register(
            "bi.get_metric_data",
            "获取BI指标数据，按指标ID、时间范围和维度查询。返回指标的时间序列数据，包括时间点、数值、同比、环比等。",
            SchemaBuilder::object()
                .property(
                    "metric_id",
                    SchemaBuilder::string().description("指标ID"),
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
                    "granularity",
                    SchemaBuilder::string()
                        .description("时间粒度")
                        .enum_values(&["hourly", "daily", "weekly", "monthly", "quarterly", "yearly"])
                        .default(json!("daily")),
                )
                .property(
                    "dimension",
                    SchemaBuilder::string().description("分析维度（如region, department, product）"),
                )
                .property(
                    "include_comparison",
                    SchemaBuilder::boolean().description("是否包含同比环比数据").default(json!(true)),
                )
                .required(&["metric_id", "start_date", "end_date"])
                .build(),
            |params| {
                let metric_id = params["metric_id"].as_str().unwrap_or("");
                let start_date = params["start_date"].as_str().unwrap_or("");
                let end_date = params["end_date"].as_str().unwrap_or("");
                let granularity = params["granularity"].as_str().unwrap_or("daily");

                if metric_id.is_empty() {
                    return Err(ToolExecutionError::Validation("metric_id is required".to_string()));
                }
                if start_date.is_empty() {
                    return Err(ToolExecutionError::Validation("start_date is required".to_string()));
                }
                if end_date.is_empty() {
                    return Err(ToolExecutionError::Validation("end_date is required".to_string()));
                }

                let metric_data = generate_mock_metric_data(metric_id, start_date, end_date, granularity);

                Ok(McpToolResult {
                    content: vec![McpContent::text(metric_data.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("BI MCP Tools registered: 4 tools (bi.list_dashboards, bi.get_dashboard, bi.list_reports, bi.get_metric_data)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 仪表盘列表
fn generate_mock_dashboards(
    category_filter: &str,
    status_filter: &str,
    owner_filter: &str,
    keyword_filter: &str,
) -> Vec<Value> {
    let categories = [
        "sales",
        "finance",
        "hr",
        "production",
        "supply_chain",
        "quality",
        "executive",
    ];
    let statuses = ["draft", "published", "published", "published", "archived"];
    let owners = ["张三", "李四", "王五", "赵六", "钱七"];

    (0..60)
        .map(|i| {
            let category = categories[i % categories.len()];
            let status = statuses[i % statuses.len()];
            let owner = owners[i % owners.len()];

            json!({
                "dashboard_id": format!("DASH-{:08}", i + 1),
                "dashboard_number": format!("BI2026{:06}", i + 1),
                "name": format!("仪表盘{:03}", i + 1),
                "category": category,
                "status": status,
                "owner": owner,
                "description": format!("{}分析仪表盘", category),
                "widget_count": 4 + (i % 8),
                "view_count": 100 + (i % 50) * 10,
                "last_viewed": format!("2026-08-{:02}", (i % 26) + 1),
                "created_at": format!("2026-{:02}-{:02}T10:00:00Z", (i % 12) + 1, (i % 28) + 1),
                "updated_at": format!("2026-{:02}-{:02}T14:00:00Z", (i % 12) + 1, (i % 28) + 1),
            })
        })
        .filter(|d| {
            (category_filter.is_empty() || d["category"].as_str() == Some(category_filter))
                && (status_filter.is_empty() || d["status"].as_str() == Some(status_filter))
                && (owner_filter.is_empty() || d["owner"].as_str() == Some(owner_filter))
                && (keyword_filter.is_empty()
                    || d["dashboard_number"]
                        .as_str()
                        .unwrap_or("")
                        .contains(keyword_filter)
                    || d["name"].as_str().unwrap_or("").contains(keyword_filter))
        })
        .collect()
}

/// 生成 Mock 仪表盘详情
fn generate_mock_dashboard_detail(dashboard_id: &str) -> Value {
    json!({
        "dashboard_id": dashboard_id,
        "dashboard_number": "BI2026001001",
        "name": "销售业绩总览仪表盘",
        "category": "sales",
        "status": "published",
        "owner": "张三",
        "description": "公司整体销售业绩分析仪表盘，包含销售额、订单量、客户分布、产品销售等核心指标",
        "layout": "grid",
        "theme": "light",
        "refresh_interval": 300,
        "widgets": [
            {"id": "W-001", "type": "kpi_card", "title": "本月销售额", "position": {"row": 1, "col": 1, "width": 2, "height": 1}, "data_source": "sales_summary", "metric": "total_amount"},
            {"id": "W-002", "type": "kpi_card", "title": "本月订单数", "position": {"row": 1, "col": 3, "width": 2, "height": 1}, "data_source": "sales_summary", "metric": "order_count"},
            {"id": "W-003", "type": "line_chart", "title": "销售额趋势", "position": {"row": 2, "col": 1, "width": 4, "height": 2}, "data_source": "sales_trend", "x_axis": "date", "y_axis": "amount"},
            {"id": "W-004", "type": "bar_chart", "title": "区域销售分布", "position": {"row": 4, "col": 1, "width": 2, "height": 2}, "data_source": "sales_by_region", "x_axis": "region", "y_axis": "amount"},
            {"id": "W-005", "type": "pie_chart", "title": "产品销售占比", "position": {"row": 4, "col": 3, "width": 2, "height": 2}, "data_source": "sales_by_product", "dimension": "product"},
            {"id": "W-006", "type": "table", "title": "TOP10客户", "position": {"row": 6, "col": 1, "width": 4, "height": 2}, "data_source": "top_customers", "columns": ["customer", "amount", "orders"]},
        ],
        "filters": [
            {"id": "F-001", "name": "时间范围", "type": "date_range", "default": "this_month"},
            {"id": "F-002", "name": "区域", "type": "multi_select", "options": ["华北", "华东", "华南", "华中", "西南", "西北", "东北"]},
            {"id": "F-003", "name": "产品线", "type": "multi_select", "options": ["A系列", "B系列", "C系列"]},
        ],
        "data_sources": [
            {"id": "DS-001", "name": "sales_summary", "type": "sql", "connection": "mysql_prod"},
            {"id": "DS-002", "name": "sales_trend", "type": "sql", "connection": "mysql_prod"},
            {"id": "DS-003", "name": "sales_by_region", "type": "sql", "connection": "mysql_prod"},
        ],
        "permissions": {
            "view_roles": ["sales_manager", "executive", "admin"],
            "edit_roles": ["admin"],
            "share_enabled": true,
            "export_enabled": true,
        },
        "view_count": 1250,
        "last_viewed": "2026-08-26T10:30:00Z",
        "created_at": "2026-01-15T10:00:00Z",
        "updated_at": "2026-08-20T14:00:00Z",
    })
}

/// 生成 Mock 报表列表
fn generate_mock_reports(
    type_filter: &str,
    status_filter: &str,
    schedule_filter: &str,
    owner_filter: &str,
) -> Vec<Value> {
    let types = ["tabular", "chart", "pivot", "crosstab", "detail"];
    let statuses = ["active", "active", "active", "paused", "failed", "archived"];
    let schedules = ["daily", "weekly", "monthly", "quarterly", "on_demand"];
    let owners = ["张三", "李四", "王五", "赵六", "钱七"];

    (0..80)
        .map(|i| {
            let report_type = types[i % types.len()];
            let status = statuses[i % statuses.len()];
            let schedule = schedules[i % schedules.len()];
            let owner = owners[i % owners.len()];

            json!({
                "report_id": format!("RPT-{:08}", i + 1),
                "report_number": format!("RPT2026{:06}", i + 1),
                "name": format!("报表{:03}", i + 1),
                "report_type": report_type,
                "status": status,
                "schedule": schedule,
                "owner": owner,
                "description": format!("{}类型报表", report_type),
                "last_run": if status != "archived" { Some(format!("2026-08-{:02}", (i % 26) + 1)) } else { None },
                "next_run": if status == "active" && schedule != "on_demand" { Some(format!("2026-08-{:02}", (i % 26) + 2)) } else { None },
                "row_count": 100 + (i % 50) * 10,
                "file_size": 100 + (i % 20) * 50,
                "created_at": format!("2026-{:02}-{:02}T10:00:00Z", (i % 12) + 1, (i % 28) + 1),
            })
        })
        .filter(|r| {
            (type_filter.is_empty() || r["report_type"].as_str() == Some(type_filter))
                && (status_filter.is_empty() || r["status"].as_str() == Some(status_filter))
                && (schedule_filter.is_empty() || r["schedule"].as_str() == Some(schedule_filter))
                && (owner_filter.is_empty() || r["owner"].as_str() == Some(owner_filter))
        })
        .collect()
}

/// 生成 Mock 指标数据
fn generate_mock_metric_data(
    metric_id: &str,
    start_date: &str,
    end_date: &str,
    granularity: &str,
) -> Value {
    let points = match granularity {
        "hourly" => 24,
        "daily" => 30,
        "weekly" => 12,
        "monthly" => 6,
        "quarterly" => 4,
        "yearly" => 3,
        _ => 30,
    };

    let data_points: Vec<Value> = (0..points)
        .map(|i| {
            let base_value = 10000.0 + (i as f64) * 500.0;
            let value = base_value + (i as f64 * 137.0 % 2000.0) - 1000.0;
            let yoy = value * 0.15;
            let mom = value * 0.05;

            json!({
                "date": format!("2026-08-{:02}", (i % 26) + 1),
                "value": value.round(),
                "yoy": yoy.round(),
                "yoy_rate": (yoy / (value - yoy) * 100.0).round(),
                "mom": mom.round(),
                "mom_rate": (mom / (value - mom) * 100.0).round(),
            })
        })
        .collect();

    let total: f64 = data_points
        .iter()
        .map(|p| p["value"].as_f64().unwrap_or(0.0))
        .sum();
    let avg = total / points as f64;
    let max = data_points
        .iter()
        .map(|p| p["value"].as_f64().unwrap_or(0.0))
        .fold(f64::NEG_INFINITY, f64::max);
    let min = data_points
        .iter()
        .map(|p| p["value"].as_f64().unwrap_or(0.0))
        .fold(f64::INFINITY, f64::min);

    json!({
        "metric_id": metric_id,
        "metric_name": "销售额",
        "unit": "元",
        "start_date": start_date,
        "end_date": end_date,
        "granularity": granularity,
        "summary": {
            "total": total.round(),
            "average": avg.round(),
            "max": max.round(),
            "min": min.round(),
            "count": points,
        },
        "data_points": data_points,
        "generated_at": chrono::Utc::now().to_rfc3339(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_bi_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_bi_tools(&server, "test-secret").await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("bi.list_dashboards").await);
        assert!(registry.has_tool("bi.get_dashboard").await);
        assert!(registry.has_tool("bi.list_reports").await);
        assert!(registry.has_tool("bi.get_metric_data").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_dashboards() {
        let server = McpServer::new("test", "1.0.0");
        register_bi_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("bi.list_dashboards", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["dashboards"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_dashboard() {
        let server = McpServer::new("test", "1.0.0");
        register_bi_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool("bi.get_dashboard", json!({"dashboard_id": "DASH-00000001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["dashboard_id"], "DASH-00000001");
            assert!(parsed["widgets"].is_array());
            assert!(parsed["filters"].is_array());
            assert!(parsed["data_sources"].is_array());
            assert!(parsed["permissions"].is_object());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_list_reports() {
        let server = McpServer::new("test", "1.0.0");
        register_bi_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "bi.list_reports",
                json!({"page": 1, "page_size": 10, "status": "active"}),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert!(parsed["reports"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_metric_data() {
        let server = McpServer::new("test", "1.0.0");
        register_bi_tools(&server, "test-secret").await;

        let result = server
            .tool_registry()
            .call_tool(
                "bi.get_metric_data",
                json!({
                    "metric_id": "METRIC-001",
                    "start_date": "2026-08-01",
                    "end_date": "2026-08-31",
                    "granularity": "daily"
                }),
            )
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["metric_id"], "METRIC-001");
            assert_eq!(parsed["granularity"], "daily");
            assert!(parsed["summary"].is_object());
            assert!(parsed["data_points"].is_array());
            assert!(!parsed["data_points"].as_array().unwrap().is_empty());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_metric_data_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_bi_tools(&server, "test-secret").await;

        // 缺少 end_date
        let result = server
            .tool_registry()
            .call_tool(
                "bi.get_metric_data",
                json!({
                    "metric_id": "METRIC-001",
                    "start_date": "2026-08-01"
                }),
            )
            .await;
        assert!(result.is_err());

        // 缺少 metric_id
        let result = server
            .tool_registry()
            .call_tool(
                "bi.get_metric_data",
                json!({
                    "start_date": "2026-08-01",
                    "end_date": "2026-08-31"
                }),
            )
            .await;
        assert!(result.is_err());
    }
}
