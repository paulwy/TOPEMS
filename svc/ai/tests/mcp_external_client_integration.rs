//! 外部 MCP server 消费集成测试——DSH 消费外部 MCP（Phase 1 POC）。
//!
//! 覆盖三层：
//! 1. `McpClient`（stdio）：连接 mock 外部 server → 握手 → tools/list → tools/call
//! 2. `register_external_tools`：配置解析 → ext.<server>.<tool> 挂入 ToolRegistry → 透明调用
//! 3. 失败场景：命令不存在 → server 跳过注册，不 panic、不阻断

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

use serde_json::{json, Value};
use topems_ai::dsh::mcp::{register_external_tools, McpServer};
use topems_shared_mcp::protocol::McpContent;

/// mock 外部 server 的命令与参数
fn mock_server_command() -> (String, Vec<String>) {
    let repo_root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("仓库根目录");
    (
        "python3".to_string(),
        vec![repo_root
            .join("scripts/tools/mcp_mock_external_server.py")
            .to_string_lossy()
            .to_string()],
    )
}

/// 构造 MCP_EXTERNAL_SERVERS 配置 JSON（单个 mock server）
fn mock_config() -> String {
    let (cmd, args) = mock_server_command();
    json!([{ "name": "toy", "command": cmd, "args": args }]).to_string()
}

#[tokio::test]
async fn mcp_client_stdio_handshake_and_call() {
    // 1) client 层：握手 + 工具探测 + 调用
    let (cmd, args) = mock_server_command();
    let mut client = topems_ai::dsh::mcp::client::McpClient::connect_stdio(&cmd, &args, &[]).await;
    let client = client.as_mut().expect("mock server 应可连接");

    let tools = client.list_tools().await.expect("tools/list 应成功");
    assert_eq!(tools.len(), 2, "mock server 应暴露 2 个工具");
    let names: Vec<&str> = tools.iter().map(|t| t.name.as_str()).collect();
    assert!(names.contains(&"greet"));
    assert!(names.contains(&"echo"));

    let result = client
        .call_tool("greet", json!({"name": "DSH"}))
        .await
        .expect("tools/call 应成功");
    assert_eq!(result.content.len(), 1);
    if let McpContent::Text { text } = &result.content[0] {
        let parsed: Value = serde_json::from_str(text).expect("结果应为 JSON");
        assert_eq!(parsed["greeting"], "你好，DSH！");
        assert_eq!(parsed["source"], "external-mock");
    } else {
        panic!("应为文本内容");
    }

    let echo = client
        .call_tool("echo", json!({"message": "hello"}))
        .await
        .expect("echo 应成功");
    if let McpContent::Text { text } = &echo.content[0] {
        let parsed: Value = serde_json::from_str(text).unwrap();
        assert_eq!(parsed["echo"], "hello");
    }
}

#[tokio::test]
async fn register_external_tools_mounts_and_forwards() {
    // 2) 注册器层：挂入 ToolRegistry 后透明调用（ext.<server>.<tool>）
    let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
    let cfg = mock_config();
    let registered = register_external_tools(&server, &cfg).await;
    assert_eq!(registered, 2, "应注册 2 个外部工具");

    let registry = server.tool_registry();
    assert!(registry.has_tool("ext.toy.greet").await || registry.has_tool("ext.toy.echo").await);
    assert_eq!(registry.len().await, 2);

    let result = registry
        .call_tool("ext.toy.greet", json!({"name": "DSH"}))
        .await
        .expect("外部工具应可透明调用");
    if let McpContent::Text { text } = &result.content[0] {
        let parsed: Value = serde_json::from_str(text).unwrap();
        assert_eq!(parsed["greeting"], "你好，DSH！");
    }
}

#[tokio::test]
async fn register_external_unreachable_server_skips_silently() {
    // 3) 失败场景：命令不存在 → 跳过注册（fail-open），不影响其余/不 panic
    let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
    let cfg = json!([
        { "name": "ghost", "command": "definitely-not-a-command-xyz", "args": [] },
        { "name": "toy", "command": mock_server_command().0, "args": mock_server_command().1 }
    ])
    .to_string();
    let registered = register_external_tools(&server, &cfg).await;
    assert_eq!(registered, 2, "ghost 应跳过，toy 的 2 个工具应注册");

    let registry = server.tool_registry();
    assert!(!registry.has_tool("ext.ghost.none").await);
    assert!(registry.has_tool("ext.toy.greet").await);
}

#[tokio::test]
async fn register_external_empty_config_noop() {
    // 空配置/非法配置 → 0 注册，不 panic
    let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
    assert_eq!(register_external_tools(&server, "").await, 0);
    assert_eq!(register_external_tools(&server, "not-json").await, 0);
    assert_eq!(server.tool_registry().len().await, 0);
}
