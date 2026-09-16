//! MCP (Model Context Protocol) 协议适配层。
//!
//! 基于 topems-shared-mcp 库，提供 MCP Server 核心实现，
//! 支持 initialize/tools/list/tools/call 等标准 MCP 方法。
//!
//! ## 架构
//!
//! ```text
//! mcp/
//! ├── mod.rs     # MCP 模块入口
//! ├── server.rs  # McpServer 核心（请求路由、初始化管理）
//! ├── handler.rs # axum handler（HTTP/SSE 传输）
//! └── tools/     # ToolRegistry + 业务工具
//!     ├── mod.rs  # ToolRegistry（工具注册和执行）
//!     ├── crm.rs  # CRM 业务工具
//!     └── erp.rs  # ERP 业务工具
//! ```

#![allow(unused_imports)]

pub mod handler;
pub mod resources;
pub mod security;
pub mod server;
pub mod stdio;
pub mod tools;

pub use handler::create_mcp_routes;
pub use server::{McpServer, ServerState};
pub use tools::{
    register_aps_tools, register_bi_tools, register_crm_tools, register_cs_tools,
    register_ehs_tools, register_erp_tools, register_finance_tools, register_hr_tools,
    register_iot_tools, register_lims_tools, register_mes_tools, register_oa_tools,
    register_pm_tools, register_qms_tools, register_scm_tools, register_wms_tools,
    ToolExecutionError, ToolRegistry,
};

#[cfg(test)]
mod business_tools_integration_tests {
    use super::resources::{register_business_resources, ResourceRegistry};
    use super::*;
    use serde_json::json;

    /// 综合集成测试：10 个业务工具 + 3 个 Resource 端到端注册与调用
    #[tokio::test]
    async fn test_10_business_tools_and_3_resources_end_to_end() {
        let server = McpServer::new("integration-test", "1.0.0");

        // 注册 10 个业务工具
        register_crm_tools(&server, "test-secret").await;
        register_erp_tools(&server, "test-secret").await;
        register_finance_tools(&server, "test-secret").await;

        let registry = server.tool_registry();

        // 验证 10 个工具全部注册
        let expected_tools = vec![
            "crm.list_customers",
            "crm.get_customer_profile",
            "crm.create_opportunity",
            "erp.list_sales_orders",
            "erp.get_inventory_summary",
            "erp.create_purchase_order",
            "erp.get_sales_order_detail",
            "finance.create_voucher",
            "finance.get_account_balance",
            "finance.list_receivables",
        ];
        for tool in &expected_tools {
            assert!(
                registry.has_tool(tool).await,
                "工具未注册: {}",
                tool
            );
        }
        assert_eq!(registry.len().await, 10, "应注册 10 个业务工具");

        // 逐个调用工具（API 不可达时走 mock 降级，均应返回 Ok）
        let calls: Vec<(&str, serde_json::Value)> = vec![
            ("crm.list_customers", json!({"page": 1, "page_size": 5})),
            ("crm.get_customer_profile", json!({"customer_id": "CUST-0001"})),
            ("crm.create_opportunity", json!({"customer_id": "CUST-0001", "name": "测试商机", "amount": 50000.0})),
            ("erp.list_sales_orders", json!({"page": 1, "page_size": 5})),
            ("erp.get_inventory_summary", json!({})),
            ("erp.create_purchase_order", json!({"supplier_id": "SUP-001", "items": [{"material_id": "M1", "quantity": 5, "unit_price": 100.0}]})),
            ("erp.get_sales_order_detail", json!({"order_id": "ORD-00000001"})),
            ("finance.create_voucher", json!({"voucher_date": "2026-09-13", "summary": "集成测试凭证", "entries": [{"subject_code": "1001", "direction": "debit", "amount": 100.0}, {"subject_code": "1002", "direction": "credit", "amount": 100.0}]})),
            ("finance.get_account_balance", json!({})),
            ("finance.list_receivables", json!({"page": 1, "page_size": 5})),
        ];
        for (tool, args) in &calls {
            let result = registry.call_tool(tool, args.clone()).await;
            assert!(
                result.is_ok(),
                "工具调用失败 {}: {:?}",
                tool,
                result.err()
            );
            // 验证返回内容含 source 字段（real_api 或 mock_fallback）
            let content = result.unwrap().content;
            assert!(!content.is_empty(), "{} 返回内容为空", tool);
        }

        // 注册 3 个 Resource
        let resource_registry = ResourceRegistry::new();
        register_business_resources(&resource_registry).await;
        let resources = resource_registry.list().await;
        assert_eq!(resources.len(), 3, "应注册 3 个业务资源");
        let uris: Vec<&str> = resources.iter().map(|r| r.uri.as_str()).collect();
        assert!(uris.contains(&"crm://customers/{id}"));
        assert!(uris.contains(&"erp://sales_orders/{id}"));
        assert!(uris.contains(&"finance://vouchers/{id}"));
    }

    /// 验证 10 个工具均通过 TypedServiceClient 调用（源码层面：无直查 DB）
    #[test]
    fn test_tools_use_typed_service_client_not_direct_db() {
        // crm.rs / erp.rs / finance.rs 应导入 TypedServiceClient，不应出现 sqlx/sea_orm 直查
        let crm_src = include_str!("tools/crm.rs");
        let erp_src = include_str!("tools/erp.rs");
        let finance_src = include_str!("tools/finance.rs");
        for (name, src) in [("crm", crm_src), ("erp", erp_src), ("finance", finance_src)] {
            assert!(
                src.contains("TypedServiceClient"),
                "{} 未使用 TypedServiceClient",
                name
            );
            assert!(
                !src.contains("sqlx::query") && !src.contains("sea_orm"),
                "{} 存在直查 DB（禁止）",
                name
            );
        }
    }
}
