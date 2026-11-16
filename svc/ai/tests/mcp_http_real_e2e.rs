//! MCP B 档第 5 步：DSH ↔ 真实 search 服务双进程联调测试。
//!
//! 前置条件（本地手动联调时设置）：
//! ```bash
//! MCP_SERVER_TOKEN=test-secret cargo run -p topems-search --bin topems-search  # 终端 1：起 search（8082）
//! REAL_MCP_URL=http://127.0.0.1:8082/mcp REAL_MCP_TOKEN=test-secret \
//!     cargo test -p topems-ai --test mcp_http_real_e2e  # 终端 2：跑本测试
//! ```
//!
//! 未设置 `REAL_MCP_URL` 时测试直接跳过（占位通过），不进入 CI 常规路径
//! （CI 无外部 search 进程依赖）。

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

use serde_json::{json, Value};
use topems_ai::dsh::mcp::{register_external_tools, McpServer};
use topems_shared_mcp::protocol::McpContent;

fn real_mcp_url() -> Option<String> {
    std::env::var("REAL_MCP_URL").ok().filter(|s| !s.is_empty())
}

#[tokio::test]
async fn dsh_consumes_real_search_mcp_over_http() {
    let Some(url) = real_mcp_url() else {
        eprintln!("REAL_MCP_URL 未设置，跳过真实双进程联调（需先起 search 服务）");
        return;
    };
    let token = std::env::var("REAL_MCP_TOKEN").unwrap_or_default();

    let server = McpServer::new("e2e", "1.0.0", "test-jwt-secret");
    let cfg =
        json!([{ "name": "search", "transport": "http", "url": url, "token": token }]).to_string();
    let registered = register_external_tools(&server, &cfg).await;

    // search /mcp 暴露 3 个工具：search.global / search.suggest / search.documents
    assert_eq!(
        registered, 3,
        "真实 search 应注册 3 个工具，实际 {registered}"
    );
    let registry = server.tool_registry();
    for t in ["search.global", "search.suggest", "search.documents"] {
        let full = format!("ext.search.{t}");
        assert!(registry.has_tool(&full).await, "应挂载 {full}");
        let tool = registry.get_tool(&full).await.expect("工具存在");
        assert!(
            tool.description.starts_with("[external-mcp]"),
            "source 标记"
        );
    }

    // 真实调用：全局检索（本机投影表为空 → 0 条属数据面正常，与 HTTP /api/search 同源）
    // search /mcp 端点要求显式 tenant_id（端点无租户中间件），无数据租户只验证返回形状。
    let tenant_id = std::env::var("REAL_MCP_TENANT_ID")
        .unwrap_or_else(|_| "00000000-0000-0000-0000-000000000001".to_string());
    let result = registry
        .call_tool(
            "ext.search.search.global",
            json!({ "query": "订单", "limit": 5, "tenant_id": tenant_id }),
        )
        .await
        .expect("ext.search.search.global 应可调用");
    let text = match &result.content[0] {
        McpContent::Text { text } => text,
        _ => panic!("应为文本内容"),
    };
    let parsed: Value = serde_json::from_str(text).expect("结果应为 JSON");
    assert!(parsed.get("items").is_some(), "应含 items 数组");
    assert!(parsed.get("total").is_some(), "应含 total 计数");

    // 真实调用：搜索建议（空数据面仍返回合法形状）
    let suggest = registry
        .call_tool(
            "ext.search.search.suggest",
            json!({ "q": "订", "tenant_id": tenant_id }),
        )
        .await
        .expect("ext.search.search.suggest 应可调用");
    let _ = match &suggest.content[0] {
        McpContent::Text { text } => serde_json::from_str::<Value>(text).expect("建议应为 JSON"),
        _ => panic!("应为文本内容"),
    };

    // 错误 token → 0 注册跳过（fail-open 真实验证）
    let server2 = McpServer::new("e2e2", "1.0.0", "jwt");
    let bad_cfg =
        json!([{ "name": "search", "transport": "http", "url": url, "token": "wrong-token" }])
            .to_string();
    assert_eq!(
        register_external_tools(&server2, &bad_cfg).await,
        0,
        "错 token 应跳过注册"
    );

    eprintln!("✅ 双进程联调通过：DSH 经 HTTP 消费真实 search /mcp（{url}）");
}
