//! 外部 MCP server 消费集成测试——DSH 消费外部 MCP（Phase 1 POC + Phase 2 治理化）。
//!
//! 覆盖四层：
//! 1. `McpClient`（stdio）：连接 mock 外部 server → 握手 → tools/list → tools/call
//! 2. `register_external_tools`：配置解析 → ext.<server>.<tool> 挂入 ToolRegistry → 透明调用
//! 3. 失败场景：命令不存在 → server 跳过注册，不 panic、不阻断
//! 4. Phase 2 治理化：敏感字段就地脱敏 + 调用审计指标递增 + source 标记描述

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

/// mock server 暴露的工具名集合（保持与 mock 脚本一致）
fn mock_tool_names() -> [&'static str; 3] {
    ["greet", "echo", "echo_secret"]
}

#[tokio::test]
async fn mcp_client_stdio_handshake_and_call() {
    // 1) client 层：握手 + 工具探测 + 调用
    let (cmd, args) = mock_server_command();
    let mut client = topems_ai::dsh::mcp::client::McpClient::connect_stdio(&cmd, &args, &[]).await;
    let client = client.as_mut().expect("mock server 应可连接");

    let tools = client.list_tools().await.expect("tools/list 应成功");
    assert_eq!(tools.len(), 3, "mock server 应暴露 3 个工具");
    let names: Vec<&str> = tools.iter().map(|t| t.name.as_str()).collect();
    for n in mock_tool_names() {
        assert!(names.contains(&n), "应包含工具 {n}");
    }

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
    assert_eq!(registered, 3, "应注册 3 个外部工具");

    let registry = server.tool_registry();
    for n in mock_tool_names() {
        assert!(
            registry.has_tool(&format!("ext.toy.{n}")).await,
            "应挂载 ext.toy.{n}"
        );
    }
    assert_eq!(registry.len().await, 3);

    // Phase 2 source=external 标记：描述带 [external-mcp] 前缀
    let greet = registry
        .get_tool("ext.toy.greet")
        .await
        .expect("greet 应存在");
    assert!(
        greet.description.starts_with("[external-mcp]"),
        "描述应带 source 标记"
    );

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
    assert_eq!(registered, 3, "ghost 应跳过，toy 的 3 个工具应注册");

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

#[tokio::test]
async fn phase2_sanitizes_sensitive_fields_in_external_output() {
    // Phase 2 治理化：外部工具返回含 token/secret 的嵌套 JSON → 就地脱敏 + 审计指标递增
    let before = topems_ai::dsh::mcp::governance::metrics_snapshot();

    let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
    register_external_tools(&server, &mock_config()).await;

    let registry = server.tool_registry();
    let result = registry
        .call_tool("ext.toy.echo_secret", json!({}))
        .await
        .expect("echo_secret 应可调用");
    if let McpContent::Text { text } = &result.content[0] {
        let parsed: Value = serde_json::from_str(text).expect("应为合法 JSON");
        assert_eq!(parsed["ok"], true);
        // 敏感字段已脱敏，非敏感字段保留
        assert_eq!(parsed["data"]["token"], "***REDACTED***", "token 应脱敏");
        assert_eq!(
            parsed["data"]["nested"]["secret"], "***REDACTED***",
            "嵌套 secret 应脱敏"
        );
        assert_eq!(
            parsed["data"]["nested"]["safe"], "visible",
            "非敏感字段应保留"
        );
        assert_eq!(parsed["data"]["user"], "toy");
        let raw = text.to_string();
        assert!(
            !raw.contains("sk-test-1234567890abcdef"),
            "明文凭据不应透传"
        );
        assert!(!raw.contains("s3cr3t-val"), "明文 secret 不应透传");
    } else {
        panic!("应为文本内容");
    }

    let after = topems_ai::dsh::mcp::governance::metrics_snapshot();
    // 并行测试下其它用例的外部调用也会累加 calls_total，故用增量下限断言；
    // redacted_fields 仅 echo_secret 产生（无其它用例调用），可精确断言。
    assert!(
        after.calls_total > before.calls_total,
        "调用计数应至少递增 1"
    );
    assert_eq!(
        after.calls_failed, before.calls_failed,
        "成功调用不应计失败"
    );
    assert_eq!(
        after.redacted_fields_total,
        before.redacted_fields_total + 2,
        "token+secret 共 2 字段脱敏"
    );
}

#[tokio::test]
async fn register_external_http_transport_mounts_and_forwards() {
    // Phase 3 B 档第 3 步：transport=http 配置 → 注册 ext.search.<tool> → 透明调用
    // 用 axum 起一个模拟 search /mcp 端点（认证 + initialize + tools/list + tools/call）
    use axum::extract::State as AxState;
    use axum::http::{HeaderMap, StatusCode};
    use axum::routing::post;
    use axum::{Json, Router};

    async fn mock_mcp(
        AxState(token): AxState<&'static str>,
        headers: HeaderMap,
        Json(req): Json<Value>,
    ) -> (StatusCode, Json<Value>) {
        let ok = headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .map(|v| v == format!("Bearer {token}"))
            .unwrap_or(false);
        if !ok {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "jsonrpc": "2.0", "id": req.get("id").cloned().unwrap_or(Value::Null),
                    "error": { "code": -32001, "message": "Unauthorized" }
                })),
            );
        }
        let rq: topems_shared_mcp::jsonrpc::JsonRpcRequest =
            serde_json::from_value(req).expect("合法请求");
        let id = rq.id.clone().unwrap_or(Value::Null);
        let resp = match rq.method.as_str() {
            "initialize" => json!({
                "jsonrpc": "2.0", "id": id,
                "result": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": { "tools": { "listChanged": false } },
                    "serverInfo": { "name": "mock-search", "version": "1.0" }
                }
            }),
            "tools/list" => json!({
                "jsonrpc": "2.0", "id": id,
                "result": { "tools": [
                    { "name": "search.global", "description": "全局检索", "inputSchema": { "type": "object" } },
                    { "name": "search.suggest", "description": "搜索建议", "inputSchema": { "type": "object" } }
                ] }
            }),
            "tools/call" => json!({
                "jsonrpc": "2.0", "id": id,
                "result": {
                    "content": [ { "type": "text", "text": json!({ "items": [], "total": 0 }).to_string() } ],
                    "isError": false
                }
            }),
            _ => json!({
                "jsonrpc": "2.0", "id": id,
                "error": { "code": -32601, "message": "Method not found" }
            }),
        };
        (StatusCode::OK, Json(resp))
    }

    let app = Router::new()
        .route("/mcp", post(mock_mcp))
        .with_state("s3cret-http");
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind");
    let addr = listener.local_addr().expect("addr");
    tokio::spawn(async move {
        axum::serve(listener, app.into_make_service())
            .await
            .expect("serve");
    });
    let url = format!("http://{addr}/mcp");

    let server = McpServer::new("test", "1.0.0", "test-jwt-secret");
    let cfg =
        json!([{ "name": "search", "transport": "http", "url": url, "token": "s3cret-http" }])
            .to_string();
    let registered = register_external_tools(&server, &cfg).await;
    assert_eq!(registered, 2, "search server 应注册 2 个工具");

    let registry = server.tool_registry();
    assert!(registry.has_tool("ext.search.search.global").await);
    assert!(registry.has_tool("ext.search.search.suggest").await);
    assert_eq!(registry.len().await, 2);

    // source=external 标记（Phase 2 语义对 http 传输同样生效）
    let tool = registry
        .get_tool("ext.search.search.global")
        .await
        .expect("工具应存在");
    assert!(tool.description.starts_with("[external-mcp]"));

    // 透明调用（出站脱敏在 Phase 4 落地前，输入参数原样透传——本工具无敏感字段）
    let result = registry
        .call_tool(
            "ext.search.search.global",
            json!({ "query": "订单", "limit": 5 }),
        )
        .await
        .expect("http 外部工具应可透明调用");
    if let McpContent::Text { text } = &result.content[0] {
        let parsed: Value = serde_json::from_str(text).expect("应为 JSON");
        assert_eq!(parsed["total"], 0);
    } else {
        panic!("应为文本内容");
    }

    // 错误 token 配置 → server 跳过注册（fail-open），不 panic
    let server2 = McpServer::new("test2", "1.0.0", "jwt");
    let bad_cfg = json!([{ "name": "search", "transport": "http", "url": url, "token": "wrong" }])
        .to_string();
    assert_eq!(
        register_external_tools(&server2, &bad_cfg).await,
        0,
        "错 token 应跳过"
    );
}
