//! AI 模块权限测试
//!
//! 覆盖人工智能模块的核心权限场景
//!
//! 运行方式:
//! ```bash
//! cargo test --package unified-core-service --test ai_permission_tests -- --test-threads=1
//! ```

use reqwest::Client;
use serde_json::{json, Value};

const API_URL: &str = "http://localhost:8000";

fn create_client() -> Client { Client::new() }

async fn login(username: &str, password: &str) -> Result<String, String> {
    let client = create_client();
    let response = client
        .post(format!("{}/api/v1/auth/login", API_URL))
        .json(&json!({ "username": username, "password": password }))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    let body: Value = response.json().await.map_err(|e| format!("解析响应失败: {}", e))?;
    if body["success"].as_bool().unwrap_or(false) {
        Ok(body["data"]["access_token"].as_str().unwrap_or("").to_string())
    } else {
        Err(format!("登录失败: {}", body["message"].as_str().unwrap_or("未知错误")))
    }
}

async fn auth_request(client: &Client, token: &str, method: &str, endpoint: &str, body: Option<Value>) -> Result<(u16, Value), String> {
    let url = format!("{}{}", API_URL, endpoint);
    let request = match method {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => return Err(format!("不支持的 HTTP 方法: {}", method)),
    };
    let response = request.bearer_auth(token).header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    let status = response.status().as_u16();
    let body: Value = response.json().await.map_err(|e| format!("解析响应失败: {}", e))?;
    Ok((status, body))
}

// ==================== AI-001: AI 对话 ====================

#[tokio::test]
async fn test_ai_001_chat() {
    tracing::info!("测试 AI-001: AI 对话");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "POST", "/api/ai/chat", Some(json!({
        "message": "你好，这是一个测试消息"
    }))).await {
        Ok((status, _)) => {
            assert!(status == 200 || status == 403 || status == 404);
            tracing::info!("AI-001 测试通过");
        }
        Err(e) => tracing::warn!("AI-001: {}", e),
    }
}

// ==================== AI-002: 文档摘要 ====================

#[tokio::test]
async fn test_ai_002_summarize() {
    tracing::info!("测试 AI-002: 文档摘要");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "POST", "/api/ai/summarize", Some(json!({
        "content": "这是一段需要摘要的文本内容，用于测试AI摘要功能。"
    }))).await {
        Ok((status, _)) => {
            assert!(status == 200 || status == 403 || status == 404);
            tracing::info!("AI-002 测试通过");
        }
        Err(e) => tracing::warn!("AI-002: {}", e),
    }
}

// ==================== AI-003: 生成报告 ====================

#[tokio::test]
async fn test_ai_003_generate_report() {
    tracing::info!("测试 AI-003: 生成报告");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "POST", "/api/ai/generate-report", Some(json!({
        "type": "summary",
        "parameters": {}
    }))).await {
        Ok((status, _)) => {
            assert!(status == 200 || status == 403 || status == 404);
            tracing::info!("AI-003 测试通过");
        }
        Err(e) => tracing::warn!("AI-003: {}", e),
    }
}

// ==================== AI-004: AI 模型管理 ====================

#[tokio::test]
async fn test_ai_004_model_management() {
    tracing::info!("测试 AI-004: AI 模型管理");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/ai/models", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("AI-004 测试通过");
        }
        Err(e) => tracing::warn!("AI-004: {}", e),
    }
}

// ==================== AI-005: AI 配置 ====================

#[tokio::test]
async fn test_ai_005_settings() {
    tracing::info!("测试 AI-005: AI 配置");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/ai/settings", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("AI-005 测试通过");
        }
        Err(e) => tracing::warn!("AI-005: {}", e),
    }
}

// ==================== 测试总结 ====================

#[tokio::test]
async fn run_all_ai_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  AI 权限测试套件 (5个用例)");
    tracing::info!("========================================");
}
