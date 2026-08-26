//! Finance MCP Tools — 财务管理业务工具。
//!
//! 注册 4 个 Finance 业务工具到 MCP Server：
//! - finance.list_transactions — 查询交易列表
//! - finance.get_transaction — 获取交易详情
//! - finance.create_invoice — 创建发票
//! - finance.get_report — 获取财务报表
//!
//! 当前版本使用 mock 数据，后续版本将通过 shared-service-client 连接真实 Finance API。

use serde_json::{json, Value};

use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 注册 Finance 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - finance.list_transactions — 查询交易列表（支持分页、类型筛选、日期范围）
/// - finance.get_transaction — 获取交易详情（按ID）
/// - finance.create_invoice — 创建发票（客户、金额、税率）
/// - finance.get_report — 获取财务报表（月报/季报/年报）
pub async fn register_finance_tools(server: &McpServer) {
    let registry = server.tool_registry();

    // 1. finance.list_transactions
    registry
        .register(
            "finance.list_transactions",
            "查询财务交易列表，支持分页、交易类型筛选和日期范围。返回交易的基本信息列表，包括交易号、类型、金额、日期、状态等。",
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
                    "type",
                    SchemaBuilder::string()
                        .description("交易类型筛选")
                        .enum_values(&["income", "expense", "transfer", "refund"]),
                )
                .property(
                    "start_date",
                    SchemaBuilder::string().description("开始日期（YYYY-MM-DD）"),
                )
                .property(
                    "end_date",
                    SchemaBuilder::string().description("结束日期（YYYY-MM-DD）"),
                )
                .required(&["page"])
                .build(),
            |params| {
                let page = params["page"].as_u64().unwrap_or(1);
                let page_size = params["page_size"].as_u64().unwrap_or(20);
                let tx_type = params["type"].as_str().unwrap_or("");

                let transactions = generate_mock_transactions(tx_type);
                let total = transactions.len();
                let start = ((page - 1) * page_size) as usize;
                let end = (start + page_size as usize).min(total);
                let page_transactions = &transactions[start.min(total)..end];

                let result = json!({
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "transactions": page_transactions,
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 2. finance.get_transaction
    registry
        .register(
            "finance.get_transaction",
            "获取财务交易详情，按交易ID查询。返回交易的完整信息，包括交易号、类型、金额、日期、对方账户、备注、附件等。",
            SchemaBuilder::object()
                .property(
                    "transaction_id",
                    SchemaBuilder::string().description("交易ID"),
                )
                .required(&["transaction_id"])
                .build(),
            |params| {
                let transaction_id = params["transaction_id"].as_str().unwrap_or("");

                if transaction_id.is_empty() {
                    return Err(ToolExecutionError::Validation("transaction_id is required".to_string()));
                }

                let transaction = generate_mock_transaction_detail(transaction_id);

                Ok(McpToolResult {
                    content: vec![McpContent::text(transaction.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 3. finance.create_invoice
    registry
        .register(
            "finance.create_invoice",
            "创建财务发票。需要提供客户信息、金额、税率和商品明细，返回新创建的发票ID和发票号。",
            SchemaBuilder::object()
                .property(
                    "customer_id",
                    SchemaBuilder::string().description("客户ID"),
                )
                .property(
                    "customer_name",
                    SchemaBuilder::string().description("客户名称"),
                )
                .property(
                    "amount",
                    SchemaBuilder::number().description("发票金额（不含税）").minimum(0.01),
                )
                .property(
                    "tax_rate",
                    SchemaBuilder::number().description("税率（百分比，如13表示13%）").minimum(0.0).maximum(100.0),
                )
                .property(
                    "invoice_type",
                    SchemaBuilder::string()
                        .description("发票类型")
                        .enum_values(&["vat_special", "vat_normal", "electronic"]),
                )
                .property(
                    "remark",
                    SchemaBuilder::string().description("发票备注"),
                )
                .required(&["customer_id", "amount", "tax_rate"])
                .build(),
            |params| {
                let customer_id = params["customer_id"].as_str().unwrap_or("");
                let amount = params["amount"].as_f64().unwrap_or(0.0);
                let tax_rate = params["tax_rate"].as_f64().unwrap_or(0.0);

                if customer_id.is_empty() {
                    return Err(ToolExecutionError::Validation("customer_id is required".to_string()));
                }
                if amount <= 0.0 {
                    return Err(ToolExecutionError::Validation("amount must be positive".to_string()));
                }

                let tax_amount = amount * tax_rate / 100.0;
                let total_amount = amount + tax_amount;
                let invoice_id = format!("INV-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("00000000"));
                let invoice_number = format!("INV{}{:06}", chrono::Utc::now().format("%Y%m%d"), 2001);

                let result = json!({
                    "invoice_id": invoice_id,
                    "invoice_number": invoice_number,
                    "customer_id": customer_id,
                    "amount": amount,
                    "tax_rate": tax_rate,
                    "tax_amount": tax_amount,
                    "total_amount": total_amount,
                    "status": "pending",
                    "created_at": chrono::Utc::now().to_rfc3339(),
                    "message": "发票创建成功，等待审核",
                });

                Ok(McpToolResult {
                    content: vec![McpContent::text(result.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    // 4. finance.get_report
    registry
        .register(
            "finance.get_report",
            "获取财务报表。支持月报、季报、年报三种类型，返回收入、支出、利润、现金流等关键财务指标。",
            SchemaBuilder::object()
                .property(
                    "report_type",
                    SchemaBuilder::string()
                        .description("报表类型")
                        .enum_values(&["monthly", "quarterly", "yearly"]),
                )
                .property(
                    "period",
                    SchemaBuilder::string().description("报表期间（YYYY-MM 或 YYYY-QN 或 YYYY）"),
                )
                .property(
                    "department",
                    SchemaBuilder::string().description("部门筛选（可选）"),
                )
                .required(&["report_type", "period"])
                .build(),
            |params| {
                let report_type = params["report_type"].as_str().unwrap_or("");
                let period = params["period"].as_str().unwrap_or("");

                if report_type.is_empty() {
                    return Err(ToolExecutionError::Validation("report_type is required".to_string()));
                }
                if period.is_empty() {
                    return Err(ToolExecutionError::Validation("period is required".to_string()));
                }

                let report = generate_mock_finance_report(report_type, period);

                Ok(McpToolResult {
                    content: vec![McpContent::text(report.to_string())],
                    is_error: None,
                })
            },
        )
        .await;

    tracing::info!("Finance MCP Tools registered: 4 tools (finance.list_transactions, finance.get_transaction, finance.create_invoice, finance.get_report)");
}

// ============ Mock 数据生成 ============

/// 生成 Mock 交易列表
fn generate_mock_transactions(type_filter: &str) -> Vec<Value> {
    let types = ["income", "expense", "transfer", "refund"];
    let categories = ["销售收入", "采购支出", "工资发放", "房租水电", "服务费", "退款", "转账"];

    (0..100)
        .map(|i| {
            let tx_type = types[i % types.len()];
            let category = categories[i % categories.len()];
            let amount = if tx_type == "income" {
                (5000 + i * 200) as f64
            } else if tx_type == "expense" {
                -((1000 + i * 100) as f64)
            } else {
                (i % 2 == 0) as i64 as f64 * 3000.0 - 1500.0
            };

            json!({
                "transaction_id": format!("TX-{:08}", i + 1),
                "transaction_number": format!("FIN2026{:06}", i + 1),
                "type": tx_type,
                "category": category,
                "amount": amount,
                "currency": "CNY",
                "status": if i % 10 == 0 { "pending" } else { "completed" },
                "counterparty": format!("对方账户{}", i + 1),
                "transaction_date": format!("2026-08-{:02}", (i % 26) + 1),
                "created_at": format!("2026-08-{:02}T10:{:02}:00Z", (i % 26) + 1, i % 60),
            })
        })
        .filter(|t| type_filter.is_empty() || t["type"].as_str() == Some(type_filter))
        .collect()
}

/// 生成 Mock 交易详情
fn generate_mock_transaction_detail(transaction_id: &str) -> Value {
    json!({
        "transaction_id": transaction_id,
        "transaction_number": "FIN2026001001",
        "type": "income",
        "category": "销售收入",
        "amount": 15800.00,
        "currency": "CNY",
        "status": "completed",
        "counterparty": {
            "name": "北京图宇科技有限公司",
            "account": "6222****8888",
            "bank": "中国工商银行",
        },
        "payment_method": "银行转账",
        "transaction_date": "2026-08-25",
        "completed_at": "2026-08-25T14:30:00Z",
        "related_order": "SO2026001001",
        "remark": "8月份销售货款",
        "attachments": [
            {
                "id": "ATT-001",
                "name": "银行回单.pdf",
                "size": 256000,
                "url": "/api/finance/attachments/ATT-001",
            }
        ],
        "created_at": "2026-08-25T09:00:00Z",
        "updated_at": "2026-08-25T14:30:00Z",
    })
}

/// 生成 Mock 财务报表
fn generate_mock_finance_report(report_type: &str, period: &str) -> Value {
    let (income, expense, profit) = match report_type {
        "monthly" => (580000.00, 320000.00, 260000.00),
        "quarterly" => (1750000.00, 980000.00, 770000.00),
        "yearly" => (7200000.00, 4100000.00, 3100000.00),
        _ => (0.0, 0.0, 0.0),
    };

    json!({
        "report_type": report_type,
        "period": period,
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "summary": {
            "total_income": income,
            "total_expense": expense,
            "net_profit": profit,
            "profit_margin": if income > 0.0 { (profit / income * 100.0) } else { 0.0 },
        },
        "income_breakdown": {
            "sales_revenue": income * 0.7,
            "service_revenue": income * 0.2,
            "other_income": income * 0.1,
        },
        "expense_breakdown": {
            "cost_of_goods": expense * 0.4,
            "salaries": expense * 0.3,
            "rent_and_utilities": expense * 0.1,
            "marketing": expense * 0.1,
            "other_expenses": expense * 0.1,
        },
        "cash_flow": {
            "operating_cash_flow": profit * 0.85,
            "investing_cash_flow": -profit * 0.15,
            "financing_cash_flow": 0.0,
            "net_cash_flow": profit * 0.7,
        },
        "key_metrics": {
            "gross_margin": 45.2,
            "operating_margin": if income > 0.0 { (profit / income * 100.0) - 5.0 } else { 0.0 },
            "net_margin": if income > 0.0 { (profit / income * 100.0) } else { 0.0 },
            "current_ratio": 2.3,
            "quick_ratio": 1.8,
        },
        "comparison": {
            "previous_period_income": income * 0.92,
            "income_growth_rate": 8.7,
            "previous_period_profit": profit * 0.88,
            "profit_growth_rate": 13.6,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_finance_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("finance.list_transactions").await);
        assert!(registry.has_tool("finance.get_transaction").await);
        assert!(registry.has_tool("finance.create_invoice").await);
        assert!(registry.has_tool("finance.get_report").await);
        assert_eq!(registry.len().await, 4);
    }

    #[tokio::test]
    async fn test_list_transactions() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("finance.list_transactions", json!({"page": 1, "page_size": 5}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["page"], 1);
            assert_eq!(parsed["page_size"], 5);
            assert!(parsed["transactions"].is_array());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_transaction() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("finance.get_transaction", json!({"transaction_id": "TX-00000001"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["transaction_id"], "TX-00000001");
            assert!(parsed["counterparty"].is_object());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_create_invoice_validation() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;

        // 缺少 customer_id
        let result = server
            .tool_registry()
            .call_tool("finance.create_invoice", json!({"amount": 1000.0, "tax_rate": 13.0}))
            .await;
        assert!(result.is_err());

        // 金额为0
        let result = server
            .tool_registry()
            .call_tool("finance.create_invoice", json!({"customer_id": "C1", "amount": 0.0, "tax_rate": 13.0}))
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_create_invoice_success() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("finance.create_invoice", json!({
                "customer_id": "CUST-001",
                "amount": 10000.0,
                "tax_rate": 13.0,
                "invoice_type": "vat_special"
            }))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["amount"], 10000.0);
            assert_eq!(parsed["tax_rate"], 13.0);
            assert_eq!(parsed["tax_amount"], 1300.0);
            assert_eq!(parsed["total_amount"], 11300.0);
            assert!(parsed["invoice_id"].is_string());
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_get_report_monthly() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;

        let result = server
            .tool_registry()
            .call_tool("finance.get_report", json!({"report_type": "monthly", "period": "2026-08"}))
            .await
            .unwrap();

        if let McpContent::Text { text } = &result.content[0] {
            let parsed: Value = serde_json::from_str(text).unwrap();
            assert_eq!(parsed["report_type"], "monthly");
            assert_eq!(parsed["period"], "2026-08");
            assert!(parsed["summary"].is_object());
            assert!(parsed["income_breakdown"].is_object());
            assert!(parsed["cash_flow"].is_object());
        } else {
            panic!("Expected text content");
        }
    }
}
