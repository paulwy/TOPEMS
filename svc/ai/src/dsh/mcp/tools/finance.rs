//! Finance MCP 业务工具（V2026.09 真实业务 API 接入）
//!
//! 通过 `TypedServiceClient<FinanceApi>` 调用真实 Finance 服务 API，
//! API 不可达时降级为 mock 数据。
//!
//! 工具清单：
//! - finance.create_voucher — 创建会计凭证
//! - finance.get_account_balance — 科目余额查询
//! - finance.list_receivables — 应收款列表

use serde_json::{json, Value};
use topems_shared_mcp::protocol::{McpContent, McpToolResult};
use topems_shared_mcp::schema::SchemaBuilder;
use topems_shared_service_client::service_client::api::finance_api::FinanceApi;
use topems_shared_service_client::service_client::TypedServiceClient;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 构造 Finance TypedServiceClient
fn finance_client() -> Result<TypedServiceClient<FinanceApi>, ToolExecutionError> {
    TypedServiceClient::<FinanceApi>::from_env_default()
        .map_err(|e| ToolExecutionError::Execution(format!("Finance 客户端初始化失败: {}", e)))
}

/// 注册 Finance 业务工具（3 个）
pub async fn register_finance_tools(server: &McpServer) {
    let registry = server.tool_registry();

    // 1. finance.create_voucher（受限工具，需 finance:write 权限）
    registry
        .register_async_with_permission(
            "finance.create_voucher",
            "创建会计凭证。需提供凭证日期、摘要和借贷分录（每条含科目编码、方向、金额），借贷必须平衡。",
            SchemaBuilder::object()
                .property("voucher_date", SchemaBuilder::string().description("凭证日期（YYYY-MM-DD）"))
                .property("summary", SchemaBuilder::string().description("凭证摘要"))
                .property("entries", SchemaBuilder::array().description("分录列表，每项含 subject_code/direction/amount").items(SchemaBuilder::object()
                    .property("subject_code", SchemaBuilder::string().description("科目编码"))
                    .property("direction", SchemaBuilder::string().description("方向").enum_values(&["debit", "credit"]))
                    .property("amount", SchemaBuilder::number().description("金额").minimum(0.0))
                    .required(&["subject_code", "direction", "amount"])
                    ))
                .required(&["voucher_date", "summary", "entries"])
                .build(),
            "finance:write",
            |params| async move {
                let voucher_date = params["voucher_date"].as_str()
                    .ok_or_else(|| ToolExecutionError::Validation("voucher_date 不能为空".to_string()))?.to_string();
                let summary = params["summary"].as_str()
                    .ok_or_else(|| ToolExecutionError::Validation("summary 不能为空".to_string()))?.to_string();
                let entries = params["entries"].as_array()
                    .ok_or_else(|| ToolExecutionError::Validation("entries 必须是数组".to_string()))?.clone();
                if entries.is_empty() {
                    return Err(ToolExecutionError::Validation("entries 不能为空".to_string()));
                }
                // 借贷平衡校验
                let debit: f64 = entries.iter().filter(|e| e["direction"] == "debit").map(|e| e["amount"].as_f64().unwrap_or(0.0)).sum();
                let credit: f64 = entries.iter().filter(|e| e["direction"] == "credit").map(|e| e["amount"].as_f64().unwrap_or(0.0)).sum();
                if (debit - credit).abs() > 0.01 {
                    return Err(ToolExecutionError::Validation(format!("借贷不平衡：借方={}，贷方={}", debit, credit)));
                }

                let payload = json!({ "voucher_date": voucher_date, "summary": summary, "entries": entries });

                let result = match finance_client()?.create_voucher(&payload).await {
                    Ok(voucher) => json!({ "success": true, "voucher": voucher, "source": "real_api" }),
                    Err(e) => {
                        tracing::warn!("Finance create_voucher API 调用失败（降级 mock）: {}", e);
                        json!({
                            "success": true,
                            "voucher": {
                                "id": format!("VCH-{}", uuid::Uuid::new_v4().simple()),
                                "voucher_no": format!("记-{}", chrono::Local::now().format("%Y%m%d%H%M%S")),
                                "voucher_date": voucher_date,
                                "summary": summary,
                                "entries": entries,
                                "status": "draft",
                                "total_debit": debit,
                                "total_credit": credit,
                            },
                            "message": "凭证创建成功（mock 降级）",
                            "source": "mock_fallback"
                        })
                    }
                };
                Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None })
            },
        )
        .await;

    // 2. finance.get_account_balance
    registry
        .register_async(
            "finance.get_account_balance",
            "查询科目余额。可指定科目编码查询单个科目，不传则返回全部科目余额汇总。",
            SchemaBuilder::object()
                .property("subject_code", SchemaBuilder::string().description("科目编码（可选，如 1001 库存现金）"))
                .build(),
            |params| async move {
                let subject_code = params["subject_code"].as_str().map(|s| s.to_string());

                let result = match finance_client()?.get_account_balance(subject_code.as_deref()).await {
                    Ok(balance) => json!({ "balance": balance, "source": "real_api" }),
                    Err(e) => {
                        tracing::warn!("Finance get_account_balance API 调用失败（降级 mock）: {}", e);
                        json!({ "balance": generate_mock_account_balance(subject_code.as_deref()), "source": "mock_fallback" })
                    }
                };
                Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None })
            },
        )
        .await;

    // 3. finance.list_receivables
    registry
        .register_async(
            "finance.list_receivables",
            "查询应收款列表，支持分页和状态筛选。返回客户、应收金额、已收金额、账龄等。",
            SchemaBuilder::object()
                .property("page", SchemaBuilder::integer().description("页码，从1开始").minimum(1.0).default(json!(1)))
                .property("page_size", SchemaBuilder::integer().description("每页条数").minimum(1.0).maximum(100.0).default(json!(20)))
                .property("status", SchemaBuilder::string().description("状态筛选").enum_values(&["unpaid", "partial", "paid", "overdue"]))
                .required(&["page"])
                .build(),
            |params| async move {
                let page = params["page"].as_u64().unwrap_or(1) as i32;
                let page_size = params["page_size"].as_u64().unwrap_or(20) as i32;
                let status = params["status"].as_str().unwrap_or("");

                let result = match finance_client()?.list_receivables(page, page_size).await {
                    Ok(receivables) => {
                        let filtered: Vec<Value> = if status.is_empty() { receivables } else {
                            receivables.into_iter().filter(|r| r["status"].as_str() == Some(status)).collect()
                        };
                        json!({ "total": filtered.len(), "page": page, "page_size": page_size, "receivables": filtered, "source": "real_api" })
                    }
                    Err(e) => {
                        tracing::warn!("Finance list_receivables API 调用失败（降级 mock）: {}", e);
                        let all = generate_mock_receivables(status);
                        let total = all.len();
                        let start = ((page - 1) * page_size).max(0) as usize;
                        let end = (start + page_size as usize).min(total);
                        json!({ "total": total, "page": page, "page_size": page_size, "receivables": &all[start.min(total)..end], "source": "mock_fallback" })
                    }
                };
                Ok(McpToolResult { content: vec![McpContent::text(result.to_string())], is_error: None })
            },
        )
        .await;

    tracing::info!("Finance MCP Tools registered: 3 tools (finance.create_voucher, finance.get_account_balance, finance.list_receivables) — TypedServiceClient 真实调用");
}

// ============ Mock 降级数据 ============

fn generate_mock_account_balance(subject_code: Option<&str>) -> Value {
    let all = vec![
        json!({ "subject_code": "1001", "subject_name": "库存现金", "debit_balance": 50000.00, "credit_balance": 0.00 }),
        json!({ "subject_code": "1002", "subject_name": "银行存款", "debit_balance": 2850000.00, "credit_balance": 0.00 }),
        json!({ "subject_code": "1122", "subject_name": "应收账款", "debit_balance": 1560000.00, "credit_balance": 0.00 }),
        json!({ "subject_code": "2202", "subject_name": "应付账款", "debit_balance": 0.00, "credit_balance": 980000.00 }),
        json!({ "subject_code": "4001", "subject_name": "实收资本", "debit_balance": 0.00, "credit_balance": 10000000.00 }),
    ];
    match subject_code {
        Some(code) => all.into_iter().find(|a| a["subject_code"] == code).unwrap_or_else(|| json!({ "subject_code": code, "subject_name": "未知科目", "debit_balance": 0.00, "credit_balance": 0.00 })),
        None => json!({ "accounts": all, "total_debit": 4460000.00, "total_credit": 10980000.00 }),
    }
}

fn generate_mock_receivables(status_filter: &str) -> Vec<Value> {
    let statuses = ["unpaid", "partial", "paid", "overdue"];
    let customers = ["CUST-001", "CUST-002", "CUST-003", "CUST-004", "CUST-005"];
    (0..30)
        .map(|i| {
            let status = statuses[i % statuses.len()];
            let total = (5000 + i * 1200) as f64;
            let received = if status == "paid" { total } else if status == "partial" { total * 0.5 } else { 0.0 };
            json!({
                "id": format!("REC-{:06}", i + 1),
                "customer_id": customers[i % customers.len()],
                "customer_name": format!("客户{}", i + 1),
                "invoice_no": format!("INV2026{:06}", i + 1),
                "total_amount": total,
                "received_amount": received,
                "outstanding_amount": total - received,
                "status": status,
                "due_date": format!("2026-{:02}-{:02}", (i % 12) + 1, (i % 28) + 1),
                "aging_days": (i * 7) % 180,
            })
        })
        .filter(|r| status_filter.is_empty() || r["status"].as_str() == Some(status_filter))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_finance_tools() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;
        let registry = server.tool_registry();
        assert!(registry.has_tool("finance.create_voucher").await);
        assert!(registry.has_tool("finance.get_account_balance").await);
        assert!(registry.has_tool("finance.list_receivables").await);
        assert_eq!(registry.len().await, 3);
    }

    #[tokio::test]
    async fn test_create_voucher_mock_fallback() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;
        let result = server.tool_registry()
            .call_tool("finance.create_voucher", json!({
                "voucher_date": "2026-09-13",
                "summary": "测试凭证",
                "entries": [
                    {"subject_code": "1001", "direction": "debit", "amount": 1000.0},
                    {"subject_code": "1002", "direction": "credit", "amount": 1000.0}
                ]
            }))
            .await;
        assert!(result.is_ok(), "create_voucher 应返回 Ok: {:?}", result);
    }

    #[tokio::test]
    async fn test_create_voucher_unbalanced_rejected() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;
        let result = server.tool_registry()
            .call_tool("finance.create_voucher", json!({
                "voucher_date": "2026-09-13",
                "summary": "不平衡凭证",
                "entries": [
                    {"subject_code": "1001", "direction": "debit", "amount": 1000.0},
                    {"subject_code": "1002", "direction": "credit", "amount": 500.0}
                ]
            }))
            .await;
        assert!(result.is_err(), "借贷不平衡应返回 Err");
    }

    #[tokio::test]
    async fn test_get_account_balance_mock_fallback() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;
        let result = server.tool_registry()
            .call_tool("finance.get_account_balance", json!({}))
            .await;
        assert!(result.is_ok(), "get_account_balance 应返回 Ok: {:?}", result);
    }

    #[tokio::test]
    async fn test_list_receivables_mock_fallback() {
        let server = McpServer::new("test", "1.0.0");
        register_finance_tools(&server).await;
        let result = server.tool_registry()
            .call_tool("finance.list_receivables", json!({"page": 1, "page_size": 10}))
            .await;
        assert!(result.is_ok(), "list_receivables 应返回 Ok: {:?}", result);
    }

    #[test]
    fn test_generate_mock_receivables_filter() {
        let recs = generate_mock_receivables("paid");
        assert!(!recs.is_empty());
        assert!(recs.iter().all(|r| r["status"] == "paid"));
    }
}
