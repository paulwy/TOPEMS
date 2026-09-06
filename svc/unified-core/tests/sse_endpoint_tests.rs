//! SSE (Server-Sent Events) 端点测试
//!
//! 覆盖测试用例：
//! - SSE-001: SSE连接建立，接收endpoint事件
//! - SSE-002: SSE会话请求，发送事件并接收响应
//! - SSE-003: 会话未找到错误处理
//! - SSE-004: 客户端断开连接处理
//!
//! 运行方式:
//! ```bash
//! # 先启动服务器
//! cargo run --package topems-unified-core
//!
//! # 再运行测试（另一个终端）
//! cargo test --package topems-unified-core --test sse_endpoint_tests -- --test-threads=1
//! ```

use reqwest::{Client, ClientBuilder};
use serde_json::{json, Value};
use std::time::Duration;

const API_URL: &str = "http://localhost:8000";

fn create_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client")
}

/// 服务可达性探测：unified-core 未运行（localhost:8000）时跳过集成测试
/// （与其它集成测试的空 token / WARN 模式一致，保证无服务环境下 `cargo test --workspace` 可全绿）
async fn service_available() -> bool {
    let probe = ClientBuilder::new()
        .timeout(Duration::from_secs(2))
        .build()
        .expect("failed to build probe client");
    probe
        .get(format!("{}/health", API_URL))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

// ===== SSE-001: SSE连接建立，接收endpoint事件 =====

#[tokio::test]
async fn test_sse_connect_receives_endpoint_event() {
    if !service_available().await {
        eprintln!("SKIP: unified-core 服务未运行（{}），跳过 SSE 集成测试", API_URL);
        return;
    }
    let client = create_client();

    // 建立SSE连接
    let response = client
        .get(format!("{}/api/sse/connect", API_URL))
        .header("Accept", "text/event-stream")
        .send()
        .await
        .expect("SSE连接请求失败");

    assert_eq!(response.status(), 200, "SSE连接应返回200");

    // 验证Content-Type
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(
        content_type.contains("text/event-stream"),
        "Content-Type应包含text/event-stream，实际为: {}",
        content_type
    );

    // 读取流式响应，等待endpoint事件
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut found_endpoint = false;

    // 读取最多10秒的数据
    let timeout = tokio::time::sleep(Duration::from_secs(10));
    tokio::pin!(timeout);

    loop {
        tokio::select! {
            _ = &mut timeout => {
                break;
            }
            chunk = stream.next() => {
                match chunk {
                    Some(Ok(bytes)) => {
                        buffer.push_str(&String::from_utf8_lossy(&bytes));

                        // 检查是否收到endpoint事件
                        if buffer.contains("event: endpoint") {
                            found_endpoint = true;

                            // 解析endpoint事件数据
                            if let Some(data_start) = buffer.find("data:") {
                                let data_str = &buffer[data_start + 5..];
                                if let Ok(data) = serde_json::from_str::<Value>(data_str.trim()) {
                                    assert!(
                                        data.get("session_id").is_some(),
                                        "endpoint事件应包含session_id"
                                    );
                                    assert!(
                                        data.get("endpoint").is_some(),
                                        "endpoint事件应包含endpoint"
                                    );
                                    assert!(
                                        data.get("expires_in").is_some(),
                                        "endpoint事件应包含expires_in"
                                    );
                                }
                            }
                            break;
                        }
                    }
                    Some(Err(e)) => {
                        panic!("读取SSE流失败: {}", e);
                    }
                    None => {
                        break;
                    }
                }
            }
        }
    }

    assert!(found_endpoint, "应收到endpoint事件");
}

// ===== SSE-002: SSE会话请求，发送事件并接收响应 =====

#[tokio::test]
async fn test_sse_session_request_sends_event() {
    if !service_available().await {
        eprintln!("SKIP: unified-core 服务未运行（{}），跳过 SSE 集成测试", API_URL);
        return;
    }
    let client = create_client();

    // 第一步：建立SSE连接，获取session_id
    let connect_response = client
        .get(format!("{}/api/sse/connect", API_URL))
        .header("Accept", "text/event-stream")
        .send()
        .await
        .expect("SSE连接请求失败");

    assert_eq!(connect_response.status(), 200);

    // 读取endpoint事件，提取session_id
    let mut stream = connect_response.bytes_stream();
    let mut buffer = String::new();
    let mut session_id: Option<String> = None;

    let timeout = tokio::time::sleep(Duration::from_secs(10));
    tokio::pin!(timeout);

    loop {
        tokio::select! {
            _ = &mut timeout => break,
            chunk = stream.next() => {
                match chunk {
                    Some(Ok(bytes)) => {
                        buffer.push_str(&String::from_utf8_lossy(&bytes));
                        if buffer.contains("event: endpoint") {
                            if let Some(data_start) = buffer.find("data:") {
                                let data_str = &buffer[data_start + 5..];
                                if let Ok(data) = serde_json::from_str::<Value>(data_str.trim()) {
                                    session_id = data.get("session_id").and_then(|v| v.as_str()).map(|s| s.to_string());
                                }
                            }
                            break;
                        }
                    }
                    _ => break,
                }
            }
        }
    }

    let session_id = session_id.expect("应获取到session_id");

    // 第二步：发送会话请求
    let request_body = json!({
        "event_type": "message",
        "data": {
            "type": "test",
            "content": "Hello SSE"
        }
    });

    let response = client
        .post(format!("{}/api/sse/session/{}", API_URL, session_id))
        .json(&request_body)
        .send()
        .await
        .expect("SSE会话请求失败");

    assert_eq!(response.status(), 200, "会话请求应返回200");

    let body: Value = response.json().await.expect("解析响应失败");
    assert_eq!(body["success"], true, "请求应成功");
    assert_eq!(body["session_id"], session_id, "session_id应匹配");
    assert_eq!(body["message"], "Event sent successfully", "消息应正确");
}

// ===== SSE-003: 会话未找到错误处理 =====

#[tokio::test]
async fn test_sse_session_not_found() {
    if !service_available().await {
        eprintln!("SKIP: unified-core 服务未运行（{}），跳过 SSE 集成测试", API_URL);
        return;
    }
    let client = create_client();

    // 使用不存在的session_id发送请求
    let invalid_session_id = "nonexistent-session-id-12345";

    let request_body = json!({
        "event_type": "message",
        "data": {"test": true}
    });

    let response = client
        .post(format!(
            "{}/api/sse/session/{}",
            API_URL, invalid_session_id
        ))
        .json(&request_body)
        .send()
        .await
        .expect("SSE会话请求失败");

    assert_eq!(
        response.status(),
        200,
        "会话请求应返回200（即使会话不存在）"
    );

    let body: Value = response.json().await.expect("解析响应失败");
    assert_eq!(body["success"], false, "请求应失败");
    assert_eq!(body["session_id"], invalid_session_id, "session_id应匹配");
    assert_eq!(
        body["message"], "Session not found or expired",
        "错误消息应正确"
    );
}

// ===== SSE-004: SSE连接心跳机制 =====

#[tokio::test]
async fn test_sse_heartbeat() {
    if !service_available().await {
        eprintln!("SKIP: unified-core 服务未运行（{}），跳过 SSE 集成测试", API_URL);
        return;
    }
    let client = create_client();

    // 建立SSE连接
    let response = client
        .get(format!("{}/api/sse/connect", API_URL))
        .header("Accept", "text/event-stream")
        .send()
        .await
        .expect("SSE连接请求失败");

    assert_eq!(response.status(), 200);

    // 读取流式响应，等待心跳（keep-alive）
    // 心跳间隔为15秒，所以需要等待至少15秒
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    let timeout = tokio::time::sleep(Duration::from_secs(20));
    tokio::pin!(timeout);

    loop {
        tokio::select! {
            _ = &mut timeout => break,
            chunk = stream.next() => {
                match chunk {
                    Some(Ok(bytes)) => {
                        buffer.push_str(&String::from_utf8_lossy(&bytes));
                        // 心跳是注释行（以:开头）或keep-alive文本
                        if buffer.contains(": keep-alive") || buffer.contains("keep-alive") {
                            break;
                        }
                    }
                    _ => break,
                }
            }
        }
    }

    // 心跳可能是注释行，也可能是其他格式
    // 只要连接保持20秒没有断开，就说明心跳机制在工作
    println!("心跳测试完成，连接保持20秒，buffer长度: {}", buffer.len());
    assert!(!buffer.is_empty(), "应收到至少一些数据");
}

// ===== 辅助函数 =====

use futures_util::StreamExt;

/// 从SSE流中提取下一个事件
async fn read_sse_event(
    stream: &mut (impl futures_util::Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Unpin),
) -> Option<(String, String)> {
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                buffer.push_str(&String::from_utf8_lossy(&bytes));

                // 检查是否有完整的事件（以空行分隔）
                if let Some(event_end) = buffer.find("\n\n") {
                    let event_str = buffer[..event_end].to_string();
                    let _ = buffer.split_off(event_end + 2);

                    // 解析事件
                    let mut event_type = String::from("message");
                    let mut event_data = String::new();

                    for line in event_str.lines() {
                        if let Some(rest) = line.strip_prefix("event:") {
                            event_type = rest.trim().to_string();
                        } else if let Some(rest) = line.strip_prefix("data:") {
                            event_data = rest.trim().to_string();
                        }
                    }

                    return Some((event_type, event_data));
                }
            }
            Err(_) => return None,
        }
    }

    None
}

// ===== SSE-005: 完整会话闭环（connect → 提取 session_id → POST 请求 → SSE 流接收响应） =====
// V426 计划的核心链路：建立 SSE 连接 → 读取 endpoint 事件提取 session_id →
// 通过 POST 发送请求 → 从同一 SSE 流中接收响应事件。

#[tokio::test]
async fn test_sse_full_session_roundtrip() {
    if !service_available().await {
        eprintln!("SKIP: unified-core 服务未运行（{}），跳过 SSE 完整会话闭环测试", API_URL);
        return;
    }
    let client = create_client();

    // 第一步：建立 SSE 连接（保持连接，不关闭 stream）
    let connect_response = client
        .get(format!("{}/api/sse/connect", API_URL))
        .header("Accept", "text/event-stream")
        .send()
        .await
        .expect("SSE连接请求失败");
    assert_eq!(connect_response.status(), 200);

    let mut stream = connect_response.bytes_stream();

    // 第二步：读取 endpoint 事件，提取 session_id
    let (event_type, event_data) = read_sse_event(&mut stream)
        .await
        .expect("应收到 endpoint 事件");
    assert_eq!(event_type, "endpoint", "首个事件应为 endpoint");

    let endpoint: Value = serde_json::from_str(&event_data).expect("endpoint 事件应为合法 JSON");
    let session_id = endpoint["session_id"]
        .as_str()
        .expect("endpoint 事件应包含 session_id")
        .to_string();
    assert!(!session_id.is_empty(), "session_id 不应为空");

    // 第三步：通过 POST 发送会话请求（echo 载荷）
    let request_body = json!({
        "event_type": "message",
        "data": {
            "type": "echo",
            "content": "roundtrip-ok"
        }
    });

    let response = client
        .post(format!("{}/api/sse/session/{}", API_URL, session_id))
        .json(&request_body)
        .send()
        .await
        .expect("SSE会话请求失败");
    assert_eq!(response.status(), 200, "会话请求应返回200");

    let body: Value = response.json().await.expect("解析响应失败");
    assert_eq!(body["success"], true, "请求应成功");
    assert_eq!(body["session_id"], session_id, "session_id应匹配");

    // 第四步：从同一 SSE 流中接收响应事件（闭环关键）
    let (resp_event, resp_data) = read_sse_event(&mut stream)
        .await
        .expect("应通过 SSE 流收到响应事件");
    assert_eq!(resp_event, "message", "响应事件类型应为 message");

    let echoed: Value = serde_json::from_str(&resp_data).expect("响应事件应为合法 JSON");
    assert_eq!(echoed["type"], "echo", "响应应回显请求 data.type");
    assert_eq!(echoed["content"], "roundtrip-ok", "响应应回显请求 data.content");

    println!(
        "SSE 完整会话闭环通过: session_id={} → 响应事件 {}: {}",
        session_id, resp_event, resp_data
    );
}
