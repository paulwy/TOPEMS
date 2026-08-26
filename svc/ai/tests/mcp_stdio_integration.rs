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

use std::io::{BufRead, BufReader, Read, Write};
use std::process::{Command, Stdio};

use serde_json::{json, Value};

/// 启动 mcp-stdio 子进程，返回 stdin 和 stdout
fn start_mcp_stdio() -> (std::process::Child, std::process::ChildStdin, BufReader<std::process::ChildStdout>) {
    let mut child = Command::new(env!("CARGO_BIN_EXE_mcp-stdio"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .expect("Failed to start mcp-stdio");

    let stdin = child.stdin.take().expect("Failed to open stdin");
    let stdout = child.stdout.take().expect("Failed to open stdout");
    let reader = BufReader::new(stdout);

    (child, stdin, reader)
}

/// 向 stdin 发送一行 JSON-RPC 请求
fn send_request(stdin: &mut std::process::ChildStdin, request: &Value) {
    let line = serde_json::to_string(request).expect("Failed to serialize request");
    stdin.write_all(line.as_bytes()).expect("Failed to write to stdin");
    stdin.write_all(b"\n").expect("Failed to write newline");
    stdin.flush().expect("Failed to flush stdin");
}

/// 从 stdout 读取一行响应
fn read_response(reader: &mut BufReader<std::process::ChildStdout>) -> Value {
    let mut line = String::new();
    reader.read_line(&mut line).expect("Failed to read from stdout");
    let trimmed = line.trim();
    assert!(!trimmed.is_empty(), "Received empty response");
    serde_json::from_str(trimmed).expect("Failed to parse response")
}

/// 从 stdout 读取一行响应（带超时）
fn read_response_with_timeout(
    reader: &mut BufReader<std::process::ChildStdout>,
    timeout_ms: u64,
) -> Option<Value> {
    use std::time::{Duration, Instant};

    let start = Instant::now();
    let mut line = String::new();

    loop {
        if start.elapsed() > Duration::from_millis(timeout_ms) {
            return None;
        }

        // 非阻塞读取：尝试读取一个字节
        let mut buf = [0u8; 1];
        match reader.read(&mut buf) {
            Ok(0) => return None, // EOF
            Ok(1) => {
                if buf[0] == b'\n' {
                    break;
                }
                line.push(buf[0] as char);
            }
            Ok(_) => {}
            Err(_) => {
                // 读取可能阻塞，短暂等待后重试
                std::thread::sleep(Duration::from_millis(10));
            }
        }
    }

    let trimmed = line.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(serde_json::from_str(trimmed).expect("Failed to parse response"))
    }
}

#[test]
fn test_initialize_request() {
    let (mut child, mut stdin, mut reader) = start_mcp_stdio();

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
    let response = read_response(&mut reader);

    // 验证响应
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 1);
    assert!(response["result"].is_object(), "Expected result object");
    assert!(response["result"]["protocolVersion"].is_string(), "Expected protocolVersion");
    assert!(response["result"]["serverInfo"].is_object(), "Expected serverInfo");
    assert!(response["result"]["capabilities"].is_object(), "Expected capabilities");

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_tools_list_request() {
    let (mut child, mut stdin, mut reader) = start_mcp_stdio();

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
    let _ = read_response(&mut reader);

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
    let response = read_response(&mut reader);

    // 验证响应
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 2);
    assert!(response["result"].is_object(), "Expected result object");
    assert!(response["result"]["tools"].is_array(), "Expected tools array");

    let tools = response["result"]["tools"].as_array().unwrap();
    assert!(tools.len() > 0, "Expected at least one tool");

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
    let (mut child, mut stdin, mut reader) = start_mcp_stdio();

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
    let _ = read_response(&mut reader);

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
    let response = read_response(&mut reader);

    // 验证响应
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 2);
    assert!(response["result"].is_object(), "Expected result object");
    assert!(response["result"]["content"].is_array(), "Expected content array");

    let content = response["result"]["content"].as_array().unwrap();
    assert!(content.len() > 0, "Expected at least one content item");
    assert!(content[0]["type"].is_string(), "Expected content type");
    assert!(content[0]["text"].is_string(), "Expected content text");

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_ping_request() {
    let (mut child, mut stdin, mut reader) = start_mcp_stdio();

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
    let _ = read_response(&mut reader);

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
    let response = read_response(&mut reader);

    // 验证响应
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 2);
    assert!(response["result"].is_object() || response["result"].is_null(), "Expected result or null");

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_invalid_json_returns_parse_error() {
    let (mut child, mut stdin, mut reader) = start_mcp_stdio();

    // 发送无效 JSON
    stdin.write_all(b"this is not json\n").expect("Failed to write to stdin");
    stdin.flush().expect("Failed to flush stdin");

    // 读取响应（应该是解析错误）
    let response = read_response(&mut reader);

    // 验证响应是错误
    assert_eq!(response["jsonrpc"], "2.0");
    assert!(response["error"].is_object(), "Expected error object");
    assert_eq!(response["error"]["code"], -32700, "Expected parse error code -32700");

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_notification_does_not_return_response() {
    let (mut child, mut stdin, mut reader) = start_mcp_stdio();

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
    let _ = read_response(&mut reader);

    // 发送通知（无 id）
    let notification = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });
    send_request(&mut stdin, &notification);

    // 等待一小段时间，确认没有响应
    let response = read_response_with_timeout(&mut reader, 500);
    assert!(response.is_none(), "Expected no response for notification");

    // 发送一个正常请求，确认服务器仍然正常工作
    let ping_request = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "ping",
        "params": {}
    });
    send_request(&mut stdin, &ping_request);
    let response = read_response(&mut reader);
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], 2);

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}

#[test]
fn test_multiple_requests_in_sequence() {
    let (mut child, mut stdin, mut reader) = start_mcp_stdio();

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
    let response1 = read_response(&mut reader);
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
    let response2 = read_response(&mut reader);
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
    let response3 = read_response(&mut reader);
    assert_eq!(response3["id"], 3);
    assert!(response3["result"]["content"].is_array());

    // 清理子进程
    let _ = child.kill();
    let _ = child.wait();
}
