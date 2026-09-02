//! MCP stdio 传输集成测试
//!
//! 启动 mcp-stdio 子进程，通过 stdin/stdout 进行 JSON-RPC 通信，
//! 验证 stdio 传输层的正确性。
//!
//! # 测试场景
//! - initialize 请求 → 验证返回 InitializeResult
//! - tools/list 请求 → 验证返回工具列表
//! - tools/call 请求 → 验证返回工具执行结果
//! - ping 请求 → 验证返回成功
//! - 无效 JSON → 验证返回解析错误
//! - 通知（无 id）→ 验证不返回响应

use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use serde_json::{json, Value};

/// 启动 mcp-stdio 子进程，返回 stdin 和响应接收通道
///
/// 内部创建一个持续运行的读取线程，将所有读取到的 JSON 响应发送到通道中。
/// 这样可以避免读取超时后线程仍在运行、消耗后续响应的竞态条件问题。
fn start_mcp_stdio() -> (
    std::process::Child,
    std::process::ChildStdin,
    mpsc::Receiver<Value>,
) {
    let mut child = Command::new(env!("CARGO_BIN_EXE_mcp-stdio"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .expect("Failed to start mcp-stdio");

    let stdin = child.stdin.take().expect("Failed to open stdin");
    let stdout = child.stdout.take().expect("Failed to open stdout");
    let mut reader = BufReader::new(stdout);

    // 等待子进程完全启动
    thread::sleep(Duration::from_millis(100));

    // 创建通道，读取线程将所有响应发送到通道中
    let (tx, rx) = mpsc::channel();

    // 启动持续运行的读取线程
    thread::spawn(move || {
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => {
                    // EOF，子进程关闭了 stdout
                    break;
                }
                Ok(_) => {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }
                    if let Ok(value) = serde_json::from_str(trimmed) {
                        if tx.send(value).is_err() {
                            // 接收端已关闭，退出线程
                            break;
                        }
                    }
                }
                Err(_) => {
                    // 读取错误，退出线程
                    break;
                }
            }
        }
    });

    (child, stdin, rx)
}

/// 向 stdin 发送一行 JSON-RPC 请求
fn send_request(stdin: &mut std::process::ChildStdin, request: &Value) {
    let line = serde_json::to_string(request).expect("Failed to serialize request");
    stdin
        .write_all(line.as_bytes())
        .expect("Failed to write to stdin");
    stdin.write_all(b"\n").expect("Failed to write newline");
    stdin.flush().expect("Failed to flush stdin");
}

/// 从响应通道读取一行响应（带超时）
///
/// 由于读取线程持续将所有响应发送到通道中，这里直接从通道接收即可，
/// 不会有竞态条件问题。
fn read_response_with_timeout(rx: &mpsc::Receiver<Value>, timeout_ms: u64) -> Option<Value> {
    rx.recv_timeout(Duration::from_millis(timeout_ms)).ok() // 超时或通道已关闭
}

/// 从响应通道读取一行响应（默认5秒超时，超时则 panic）
fn read_response(rx: &mpsc::Receiver<Value>) -> Value {
    read_response_with_timeout(rx, 5000).expect("Timed out waiting for response (5 seconds)")
}

#[test]
fn test_initialize_request() {
    let (mut child, mut stdin, rx) = start_mcp_stdio();

    // 发送 initialize 请求
    let request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": { "name": "test-client", "version": "1.0" }
        }
    });
    send_request(&mut stdin, &request);

    // 读取响应
    let response = read_response(&rx);

    // 验证响应
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 1);
    assert!(response["result"].is_object(), "Expected result object");
    assert!(
        response["result"]["protocolVersion"].is_string(),
        "Expected protocolVersion"
    );
    assert!(
        response["result"]["serverInfo"].is_object(),
        "Expected serverInfo"
    );
    assert!(
        response["result"]["capabilities"].is_object(),
        "Expected capabilities"
    );

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_tools_list_request() {
    let (mut child, mut stdin, rx) = start_mcp_stdio();

    // 先发送 initialize
    let init_request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": { "name": "test-client", "version": "1.0" }
        }
    });
    send_request(&mut stdin, &init_request);
    let _ = read_response(&rx);

    // 发送 initialized 通知
    let initialized_notification = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });
    send_request(&mut stdin, &initialized_notification);

    // 发送 tools/list 请求
    let tools_request = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    });
    send_request(&mut stdin, &tools_request);

    // 读取响应
    let response = read_response(&rx);

    // 验证响应
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 2);
    assert!(response["result"].is_object(), "Expected result object");
    assert!(
        response["result"]["tools"].is_array(),
        "Expected tools array"
    );

    let tools = response["result"]["tools"].as_array().unwrap();
    assert!(!tools.is_empty(), "Expected at least one tool");

    // 验证每个工具的结构
    for tool in tools {
        assert!(tool["name"].is_string(), "Expected tool name");
        assert!(tool["description"].is_string(), "Expected tool description");
        assert!(tool["inputSchema"].is_object(), "Expected inputSchema");
    }

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_tools_call_request() {
    let (mut child, mut stdin, rx) = start_mcp_stdio();

    // 先发送 initialize
    let init_request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": { "name": "test-client", "version": "1.0" }
        }
    });
    send_request(&mut stdin, &init_request);
    let _ = read_response(&rx);

    // 发送 initialized 通知
    let initialized_notification = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });
    send_request(&mut stdin, &initialized_notification);

    // 发送 tools/call 请求（调用 system.ping）
    let call_request = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "system.ping",
            "arguments": {}
        }
    });
    send_request(&mut stdin, &call_request);

    // 读取响应
    let response = read_response(&rx);

    // 验证响应
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 2);
    assert!(response["result"].is_object(), "Expected result object");
    assert!(
        response["result"]["content"].is_array(),
        "Expected content array"
    );

    let content = response["result"]["content"].as_array().unwrap();
    assert!(!content.is_empty(), "Expected at least one content item");
    assert!(content[0]["type"].is_string(), "Expected content type");
    assert!(content[0]["text"].is_string(), "Expected content text");

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_ping_request() {
    let (mut child, mut stdin, rx) = start_mcp_stdio();

    // 先发送 initialize
    let init_request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": { "name": "test-client", "version": "1.0" }
        }
    });
    send_request(&mut stdin, &init_request);
    let _ = read_response(&rx);

    // 发送 initialized 通知
    let initialized_notification = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });
    send_request(&mut stdin, &initialized_notification);

    // 发送 ping 请求
    let ping_request = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "ping",
        "params": {}
    });
    send_request(&mut stdin, &ping_request);

    // 读取响应
    let response = read_response(&rx);

    // 验证响应
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 2);
    assert!(
        response["result"].is_object() || response["result"].is_null(),
        "Expected result or null"
    );

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_invalid_json_returns_parse_error() {
    let (mut child, mut stdin, rx) = start_mcp_stdio();

    // 发送无效 JSON
    stdin
        .write_all(b"this is not json\n")
        .expect("Failed to write to stdin");
    stdin.flush().expect("Failed to flush stdin");

    // 读取响应（应该是解析错误）
    let response = read_response(&rx);

    // 验证响应是错误
    assert_eq!(response["jsonrpc"], "2.0");
    assert!(response["error"].is_object(), "Expected error object");
    assert_eq!(
        response["error"]["code"], -32700,
        "Expected parse error code -32700"
    );

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_notification_does_not_return_response() {
    let (mut child, mut stdin, rx) = start_mcp_stdio();

    // 先发送 initialize
    let init_request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": { "name": "test-client", "version": "1.0" }
        }
    });
    send_request(&mut stdin, &init_request);
    let _ = read_response(&rx);

    // 发送通知（无 id）
    let notification = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });
    send_request(&mut stdin, &notification);

    // 等待一小段时间，确认没有响应
    let response = read_response_with_timeout(&rx, 500);
    assert!(response.is_none(), "Expected no response for notification");

    // 发送一个正常请求，确认服务器仍然正常工作
    let ping_request = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "ping",
        "params": {}
    });
    send_request(&mut stdin, &ping_request);
    let response = read_response(&rx);
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 2);

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_multiple_requests_in_sequence() {
    let (mut child, mut stdin, rx) = start_mcp_stdio();

    // 发送 initialize
    let init_request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": { "name": "test-client", "version": "1.0" }
        }
    });
    send_request(&mut stdin, &init_request);
    let response1 = read_response(&rx);
    assert_eq!(response1["id"], 1);

    // 发送 initialized 通知
    let initialized_notification = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });
    send_request(&mut stdin, &initialized_notification);

    // 发送 tools/list
    let tools_request = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    });
    send_request(&mut stdin, &tools_request);
    let response2 = read_response(&rx);
    assert_eq!(response2["id"], 2);
    assert!(response2["result"]["tools"].is_array());

    // 发送 tools/call
    let call_request = json!({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "system.ping",
            "arguments": {}
        }
    });
    send_request(&mut stdin, &call_request);
    let response3 = read_response(&rx);
    assert_eq!(response3["id"], 3);
    assert!(response3["result"]["content"].is_array());

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

/// 模拟外部 Agent（Cursor/Claude Desktop）通过 MCP stdio 协议连接并调用业务工具。
///
/// 验证外部 Agent 对接能力：initialize → initialized → 连续调用 3 个业务工具
/// （crm.list_customers / erp.list_orders / finance.list_transactions）。
/// 业务工具走真实 HTTP 调用（未启动服务时自动降级 mock），协议层始终可对接。
#[test]
fn test_external_agent_calls_business_tools() {
    let (mut child, mut stdin, rx) = start_mcp_stdio();

    // 1. initialize
    let init_request = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": { "name": "external-agent-test", "version": "1.0" }
        }
    });
    send_request(&mut stdin, &init_request);
    let init_resp = read_response(&rx);
    assert!(init_resp["result"].is_object(), "initialize 应成功");

    // 2. initialized 通知
    send_request(
        &mut stdin,
        &json!({"jsonrpc": "2.0", "method": "notifications/initialized"}),
    );

    // 3. 连续调用 3 个业务工具（外部 Agent 对接验收）
    let calls = [
        ("crm.list_customers", json!({"page": 1, "page_size": 3})),
        ("erp.list_orders", json!({"page": 1, "page_size": 3})),
        (
            "finance.list_transactions",
            json!({"page": 1, "page_size": 3}),
        ),
    ];
    let mut next_id = 2;
    for (name, args) in calls {
        let call_request = json!({
            "jsonrpc": "2.0",
            "id": next_id,
            "method": "tools/call",
            "params": { "name": name, "arguments": args }
        });
        send_request(&mut stdin, &call_request);
        let resp = read_response(&rx);
        assert_eq!(resp["id"], next_id, "工具 {} 应返回对应 id", name);
        assert!(
            resp["result"].is_object() || resp["error"].is_object(),
            "工具 {} 应返回 result 或 error",
            name
        );
        if let Some(err) = resp["error"].as_object() {
            // 允许降级 mock，但不应是权限拒绝/方法不存在
            assert!(
                err["code"] != -32001 && err["code"] != -32601,
                "工具 {} 不应被权限/未找到拒绝: {:?}",
                name,
                err
            );
        }
        eprintln!("外部 Agent 调用 {} 成功", name);
        next_id += 1;
    }

    // 4. 正常关闭
    drop(stdin);
    let _ = child.wait();
}
