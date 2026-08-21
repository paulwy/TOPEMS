//! Dify AI 端到端冒烟测试
//!
//! Tests verify the Dify integration end-to-end:
//! 1. DifyService health check
//! 2. DifyService blocking chat
//! 3. DifyService SSE streaming chat
//!
//! Tests auto-skip when DIFY_API_KEY is not set (requires running Dify instance).
//! To enable: set DIFY_API_KEY=app-xxx in .env, then run:
//!   cargo test -p topems-ai --test dify_e2e_test -- --include-ignored

use topems_ai::models::{DifyChatRequest, DifyConfig};
use topems_ai::services::dify::DifyService;

fn get_dify_service() -> Option<DifyService> {
    let api_key = std::env::var("DIFY_API_KEY").unwrap_or_default();
    if api_key.is_empty() {
        return None;
    }
    let base_url =
        std::env::var("DIFY_BASE_URL").unwrap_or_else(|_| "http://localhost:8180".to_string());
    let default_user =
        std::env::var("DIFY_DEFAULT_USER").unwrap_or_else(|_| "topems-user".to_string());
    let cfg = DifyConfig {
        base_url,
        api_key,
        default_user,
        timeout_secs: 120,
    };
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .expect("Failed to build HTTP client");
    Some(DifyService::new(client, cfg))
}

fn require_dify() -> DifyService {
    match get_dify_service() {
        Some(s) if s.is_configured() => s,
        _ => {
            eprintln!("⏭️  Skipping: DIFY_API_KEY not set or Dify not configured");
            std::process::exit(0);
        }
    }
}

#[tokio::test]
#[ignore = "Requires running Dify instance (set DIFY_API_KEY to enable)"]
async fn test_dify_health() {
    let svc = require_dify();
    let result = svc.health().await;
    assert!(
        result.is_ok(),
        "Dify health check failed: {:?}",
        result.err()
    );
    println!("✅ Dify health OK");
}

#[tokio::test]
#[ignore = "Requires running Dify instance (set DIFY_API_KEY to enable)"]
async fn test_dify_chat_blocking() {
    let svc = require_dify();
    let req = DifyChatRequest {
        inputs: serde_json::json!({}),
        query: "Hello, please respond with a short greeting.".to_string(),
        response_mode: "blocking".to_string(),
        conversation_id: String::new(),
        user: "e2e-test".to_string(),
    };
    let resp = svc.chat(req).await.expect("Dify chat failed");
    assert!(
        !resp.answer.is_empty(),
        "Dify chat answer should not be empty"
    );
    assert!(
        !resp.message_id.is_empty(),
        "Dify chat message_id should not be empty"
    );
    println!(
        "✅ Dify chat blocking: answer = '{}'",
        &resp.answer[..resp.answer.len().min(80)]
    );
}

#[tokio::test]
#[ignore = "Requires running Dify instance (set DIFY_API_KEY to enable)"]
async fn test_dify_chat_stream() {
    let svc = require_dify();
    let req = DifyChatRequest {
        inputs: serde_json::json!({}),
        query: "Say 'test OK' and nothing else.".to_string(),
        response_mode: "streaming".to_string(),
        conversation_id: String::new(),
        user: "e2e-test-stream".to_string(),
    };
    let body = svc.chat_stream(req).await.expect("Dify chat_stream failed");

    use futures::StreamExt;
    let mut stream = body.into_data_stream();
    let mut has_message = false;
    let mut has_message_end = false;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.expect("Stream chunk error");
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("data:") {
                let data = trimmed.strip_prefix("data:").unwrap_or("").trim();
                if data.starts_with('{') {
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                        let event = v.get("event").and_then(|e| e.as_str()).unwrap_or("");
                        if event == "message" || event == "agent_message" {
                            has_message = true;
                        }
                        if event == "message_end" {
                            has_message_end = true;
                        }
                    }
                }
            }
        }
    }

    assert!(has_message, "SSE stream should contain message events");
    assert!(
        has_message_end,
        "SSE stream should contain message_end event"
    );
    println!("✅ Dify chat stream: received message + message_end events");
}
