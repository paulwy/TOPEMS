//! SCM MCP Tools — 供应链管理系统业务工具。
//!
//! 注册 4 个 SCM 业务工具到 MCP Server：
//! - scm.list_suppliers — 查询供应商列表
//! - scm.get_supplier — 获取供应商详情
//! - scm.list_purchase_orders — 查询采购订单列表
//! - scm.create_purchase_order — 创建采购订单
//!
//! ## 接通状态：未接通（2026-11-13 起明确禁用，禁止 mock 兜底）
//!
//! 历史实现是「HTTP 失败 → 静默返回常量 mock 数据」，调用方无法分辨真假。
//! 复核结论：生产未监听独立 SCM `:8040`；单体 `:8099` 上的 `/api/scm/*` 虽然存在，
//! 但要求 `scm:read` / `scm:write` 权限且处理器强制 `claims.tenant_id`，
//! 而 `http_call` 使用的是权限集合为空、无租户上下文的 ai-service service token，
//! 同时 4 个工具的请求/响应契约与真实 SCM API 不一致。
//! 因此仅改 URL/权限无法接通，工具保留注册以便调用方看到明确错误，
//! 但一律返回 [`SCM_NOT_CONNECTED_CODE`]，不返回任何业务数据。

use serde_json::json;

use topems_shared_mcp::schema::SchemaBuilder;

use super::super::server::McpServer;
use super::super::tools::ToolExecutionError;

/// 未接通错误码（稳定标识，调用方据此区分「未接通」与普通执行失败）。
pub const SCM_NOT_CONNECTED_CODE: &str = "SCM_MCP_NOT_CONNECTED";

/// 未接通原因（写入错误文案，避免调用方误以为查询成功）。
const NOT_CONNECTED_REASON: &str = "生产未监听独立 SCM :8040；单体 :8099 的 /api/scm/* 要求 scm:read/scm:write 权限与 claims.tenant_id，ai-service service token 权限为空且无租户上下文；现有工具请求/响应契约也与真实 SCM API 不一致";

/// 构造统一的「未接通」错误：不含任何业务数据，禁止 mock 兜底。
fn not_connected(tool: &str, endpoint: &str) -> ToolExecutionError {
    ToolExecutionError::Execution(format!(
        "{SCM_NOT_CONNECTED_CODE}: {tool} 未接通真实 SCM 服务（{endpoint}），已禁用，不会返回 mock 数据。原因：{NOT_CONNECTED_REASON}。接通前请勿依赖该工具。"
    ))
}

/// 注册 SCM 业务工具到 MCP Server
///
/// # 参数
/// - `server`: MCP Server 实例
///
/// # 注册的工具
/// - scm.list_suppliers — 查询供应商列表（当前未接通，fail-closed）
/// - scm.get_supplier — 获取供应商详情（当前未接通，fail-closed）
/// - scm.list_purchase_orders — 查询采购订单列表（当前未接通，fail-closed）
/// - scm.create_purchase_order — 创建采购订单（当前未接通，fail-closed）
pub async fn register_scm_tools(server: &McpServer, _jwt_secret: &str) {
    let registry = server.tool_registry();

    // 1. scm.list_suppliers
    registry
        .register_with_permission(
            "scm.list_suppliers",
            "[未接通] 查询SCM供应商列表。当前未接通真实 SCM 服务，调用将返回 SCM_MCP_NOT_CONNECTED 错误，不会返回 mock 数据。",
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
                    "supplier_level",
                    SchemaBuilder::string()
                        .description("供应商等级筛选")
                        .enum_values(&["strategic", "preferred", "approved", "qualified", "pending", "blacklisted"]),
                )
                .property(
                    "status",
                    SchemaBuilder::string()
                        .description("供应商状态筛选")
                        .enum_values(&["active", "inactive", "suspended", "terminated"]),
                )
                .property(
                    "category",
                    SchemaBuilder::string().description("供应品类筛选"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配供应商编号、名称）"),
                )
                .required(&["page"])
                .build(),            "scm:read",

            |_params| Err(not_connected("scm.list_suppliers", "GET /api/scm/suppliers")),
        )
        .await;

    // 2. scm.get_supplier
    registry
        .register_with_permission(
            "scm.get_supplier",
            "[未接通] 获取SCM供应商详情。当前未接通真实 SCM 服务，调用将返回 SCM_MCP_NOT_CONNECTED 错误，不会返回 mock 数据。",
            SchemaBuilder::object()
                .property(
                    "supplier_id",
                    SchemaBuilder::string().description("供应商ID"),
                )
                .required(&["supplier_id"])
                .build(),            "scm:read",

            |_params| Err(not_connected("scm.get_supplier", "GET /api/scm/suppliers/{id}")),
        )
        .await;

    // Phase D 收尾：敏感输出声明——scm.get_supplier 返回供应商银行账户。
    // 该声明为「接通后」的真实数据形态预留；当前工具 fail-closed，不返回任何数据。
    registry
        .declare_sensitive_output(
            "scm.get_supplier",
            topems_shared_mcp::protocol::SensitiveOutput {
                fields: vec!["account_number".to_string(), "swift_code".to_string()],
                contains_sensitive: Some(true),
            },
        )
        .await;

    // 3. scm.list_purchase_orders
    registry
        .register_with_permission(
            "scm.list_purchase_orders",
            "[未接通] 查询SCM采购订单列表。当前未接通真实 SCM 服务，调用将返回 SCM_MCP_NOT_CONNECTED 错误，不会返回 mock 数据。",
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
                        .description("订单状态筛选")
                        .enum_values(&["draft", "pending_approval", "approved", "sent", "partial_received", "received", "closed", "cancelled"]),
                )
                .property(
                    "supplier_id",
                    SchemaBuilder::string().description("供应商ID筛选"),
                )
                .property(
                    "start_date",
                    SchemaBuilder::string().description("开始日期筛选（YYYY-MM-DD）"),
                )
                .property(
                    "end_date",
                    SchemaBuilder::string().description("结束日期筛选（YYYY-MM-DD）"),
                )
                .property(
                    "keyword",
                    SchemaBuilder::string().description("搜索关键词（匹配订单编号）"),
                )
                .required(&["page"])
                .build(),            "scm:read",

            |_params| Err(not_connected("scm.list_purchase_orders", "GET /api/scm/purchase-orders")),
        )
        .await;

    // 4. scm.create_purchase_order
    registry
        .register_with_permission(
            "scm.create_purchase_order",
            "[未接通] 创建SCM采购订单。当前未接通真实 SCM 服务，调用将返回 SCM_MCP_NOT_CONNECTED 错误，不会返回 mock 数据。",
            SchemaBuilder::object()
                .property(
                    "supplier_id",
                    SchemaBuilder::string().description("供应商ID"),
                )
                .property(
                    "items",
                    SchemaBuilder::array()
                        .description("物料明细列表")
                        .items(SchemaBuilder::object()
                            .property("material_id", SchemaBuilder::string().description("物料ID"))
                            .property("material_code", SchemaBuilder::string().description("物料编码"))
                            .property("material_name", SchemaBuilder::string().description("物料名称"))
                            .property("quantity", SchemaBuilder::number().description("数量").minimum(0.0))
                            .property("unit_price", SchemaBuilder::number().description("单价").minimum(0.0))
                            .property("unit", SchemaBuilder::string().description("单位"))
                            .required(&["material_id", "quantity", "unit_price"])),
                )
                .property(
                    "expected_delivery_date",
                    SchemaBuilder::string().description("预计交货日期（YYYY-MM-DD）"),
                )
                .property(
                    "payment_terms",
                    SchemaBuilder::string().description("付款条件"),
                )
                .property(
                    "remark",
                    SchemaBuilder::string().description("备注"),
                )
                .property(
                    "creator",
                    SchemaBuilder::string().description("创建人"),
                )
                .required(&["supplier_id", "items"])
                .build(),            "scm:write",

            |_params| Err(not_connected("scm.create_purchase_order", "POST /api/scm/purchase-orders")),
        )
        .await;

    tracing::info!(
        "SCM MCP Tools registered: 4 tools (NOT CONNECTED, fail-closed: no mock fallback)"
    );
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use topems_shared_mcp::protocol::McpToolResult;

    use super::*;

    fn execution_message(result: Result<McpToolResult, ToolExecutionError>) -> String {
        match result.expect_err("未接通工具不得返回成功结果") {
            ToolExecutionError::Execution(msg) => msg,
            other => panic!("期望 Execution 错误，实际: {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_register_scm_tools() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_scm_tools(&server, "test-secret").await;

        let registry = server.tool_registry();
        assert!(registry.has_tool("scm.list_suppliers").await);
        assert!(registry.has_tool("scm.get_supplier").await);
        assert!(registry.has_tool("scm.list_purchase_orders").await);
        assert!(registry.has_tool("scm.create_purchase_order").await);
        assert_eq!(registry.len().await, 4);
    }

    /// 锁定底线：4 个 SCM 工具一律返回「未接通」，不得返回任何成功结果/mock 数据。
    #[tokio::test]
    async fn test_scm_tools_fail_closed_not_connected() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_scm_tools(&server, "test-secret").await;

        let calls = vec![
            ("scm.list_suppliers", json!({"page": 1})),
            ("scm.get_supplier", json!({"supplier_id": "SUP-0001"})),
            ("scm.list_purchase_orders", json!({"page": 1})),
            (
                "scm.create_purchase_order",
                json!({
                    "supplier_id": "SUP-0001",
                    "items": [{"material_id": "MAT-0001", "quantity": 1, "unit_price": 1.0}]
                }),
            ),
        ];

        for (tool, args) in calls {
            let msg = execution_message(server.tool_registry().call_tool(tool, args).await);
            assert!(
                msg.contains(SCM_NOT_CONNECTED_CODE),
                "{tool} 错误必须包含错误码 {SCM_NOT_CONNECTED_CODE}: {msg}"
            );
            assert!(msg.contains("未接通"), "{tool} 错误必须说明未接通: {msg}");
            assert!(
                !msg.contains("供应商001") && !msg.contains("PO2026"),
                "{tool} 不得夹带任何 mock 业务数据: {msg}"
            );
        }
    }

    /// 静态回归锁：生产代码中不得重新出现 mock 兜底实现。
    #[test]
    fn test_scm_tools_source_has_no_mock_fallback() {
        let src = include_str!("scm.rs");
        let production = src
            .split("#[cfg(test)]")
            .next()
            .expect("源码应包含生产代码段");

        for forbidden in ["generate_mock", "mock_fallback"] {
            assert!(
                !production.contains(forbidden),
                "禁止重新引入 mock 兜底：生产代码命中 {forbidden}"
            );
        }
        assert!(
            production.contains(SCM_NOT_CONNECTED_CODE),
            "生产代码必须保留 {SCM_NOT_CONNECTED_CODE} 错误码"
        );
    }

    #[tokio::test]
    async fn test_get_supplier_sensitive_output_declared() {
        let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
        register_scm_tools(&server, "test-secret").await;

        let decl = server
            .tool_registry()
            .sensitive_output("scm.get_supplier")
            .await;
        assert!(decl.is_some(), "scm.get_supplier 应已声明敏感输出");
        assert_eq!(
            decl.unwrap().fields,
            vec!["account_number".to_string(), "swift_code".to_string()]
        );
    }
}
