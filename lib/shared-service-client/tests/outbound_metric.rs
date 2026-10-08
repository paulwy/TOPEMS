//! B15: 出站服务间调用边指标实证。
//!
//! 验证：GenericServiceClient 出站调用 → record_service_call 打点 →
//! prometheus /metrics 文本输出中出现 topems_service_to_service_calls_total
//! {service=caller, target=callee} 且计数 +1。

#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

use serde_json::json;
use std::net::TcpListener;

/// 启动一个最小 mock HTTP 服务，返回 200 JSON。
fn spawn_mock_server() -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    std::thread::spawn(move || {
        use std::io::{Read, Write};
        for stream in listener.incoming() {
            let mut stream = stream.unwrap();
            let mut buf = [0u8; 1024];
            let _ = stream.read(&mut buf);
            let body = serde_json::to_string(&json!({"data": null})).unwrap();
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: application/json\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(response.as_bytes());
        }
    });
    port
}

fn render_prometheus_text() -> String {
    use prometheus::{Encoder, TextEncoder};
    let encoder = TextEncoder::new();
    let metric_families = prometheus::gather();
    let mut buf = Vec::new();
    encoder.encode(&metric_families, &mut buf).unwrap();
    String::from_utf8_lossy(&buf).to_string()
}

#[tokio::test]
async fn outbound_call_emits_service_to_service_metric() {
    // caller 身份（bootstrap_service normally 注入；此处测试直接 set env）
    std::env::set_var("TOPEMS_SERVICE_NAME", "test-caller-service");

    let port = spawn_mock_server();
    let base_url = format!("http://127.0.0.1:{}", port);

    // 预注册（模拟 bootstrap_service 行为）
    topems_shared_auth::service::pre_register_service_metrics();

    // 调用前计数（target 由 /api/v1/erp/orders 路径推导为 erp-service）
    let before =
        topems_shared_auth::service::service_call_count("test-caller-service", "erp-service");

    // 发起一次出站调用（走 BaseServiceClient.execute_request → record_service_call）
    let client =
        topems_shared_service_client::service_client::GenericServiceClient::new("erp", &base_url)
            .unwrap();
    let _: Result<serde_json::Value, _> = client.get("/api/v1/erp/orders").await;

    // 调用后计数
    let after =
        topems_shared_auth::service::service_call_count("test-caller-service", "erp-service");

    assert_eq!(
        after - before,
        1,
        "出站调用应使 topems_service_to_service_calls_total{{service=test-caller-service,target=erp-service}} +1"
    );

    // 验证 prometheus 文本输出（与 /metrics handler 同源）中出现该指标族
    let text = render_prometheus_text();
    assert!(
        text.contains("topems_service_to_service_calls_total"),
        "prometheus 文本输出应包含 topems_service_to_service_calls_total，实际：\n{}",
        text
    );
    assert!(
        text.contains("service=\"test-caller-service\"") && text.contains("target=\"erp-service\""),
        "prometheus 文本应含正确 label 值，实际：\n{}",
        text
    );

    // 清理 env，避免污染其他测试
    std::env::remove_var("TOPEMS_SERVICE_NAME");
}
