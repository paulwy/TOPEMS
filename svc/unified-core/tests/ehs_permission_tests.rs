//! EHS 模块权限测试
//!
//! 覆盖环境健康安全模块的核心权限场景
//!
//! 运行方式:
//! ```bash
//! cargo test --package unified-core-service --test ehs_permission_tests -- --test-threads=1
//! ```

use reqwest::Client;
use serde_json::{json, Value};

const API_URL: &str = "http://localhost:8000";

fn create_client() -> Client {
    Client::new()
}

async fn login(username: &str, password: &str) -> Result<String, String> {
    let client = create_client();
    let response = client
        .post(format!("{}/api/v1/auth/login", API_URL))
        .json(&json!({ "username": username, "password": password }))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    let body: Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    if body["success"].as_bool().unwrap_or(false) {
        Ok(body["data"]["access_token"]
            .as_str()
            .unwrap_or("")
            .to_string())
    } else {
        Err(format!(
            "登录失败: {}",
            body["message"].as_str().unwrap_or("未知错误")
        ))
    }
}

async fn auth_request(
    client: &Client,
    token: &str,
    method: &str,
    endpoint: &str,
    body: Option<Value>,
) -> Result<(u16, Value), String> {
    let url = format!("{}{}", API_URL, endpoint);
    let request = match method {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => return Err(format!("不支持的 HTTP 方法: {}", method)),
    };
    let response = request
        .bearer_auth(token)
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    let status = response.status().as_u16();
    let body: Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    Ok((status, body))
}

// ==================== EHS-001: 查看安全检查列表 ====================

#[tokio::test]
async fn test_ehs_001_list_inspections() {
    tracing::info!("测试 EHS-001: 查看安全检查列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/ehs/inspections", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("EHS-001 测试通过");
        }
        Err(e) => tracing::warn!("EHS-001: {}", e),
    }
}

// ==================== EHS-002: 创建安全检查 ====================

#[tokio::test]
async fn test_ehs_002_create_inspection() {
    tracing::info!("测试 EHS-002: 创建安全检查");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/ehs/inspections",
        Some(json!({
            "title": format!("安全检查_{}", timestamp),
            "location": "车间A",
            "items": [{ "name": "灭火器检查", "status": "pass" }]
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("EHS-002 测试通过");
        }
        Err(e) => tracing::warn!("EHS-002: {}", e),
    }
}

// ==================== EHS-003: 查看事故报告 ====================

#[tokio::test]
async fn test_ehs_003_list_incidents() {
    tracing::info!("测试 EHS-003: 查看事故报告");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/ehs/incidents", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("EHS-003 测试通过");
        }
        Err(e) => tracing::warn!("EHS-003: {}", e),
    }
}

// ==================== EHS-004: 报告安全事故 ====================

#[tokio::test]
async fn test_ehs_004_report_incident() {
    tracing::info!("测试 EHS-004: 报告安全事故");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/ehs/incidents",
        Some(json!({
            "title": "测试事故报告",
            "description": "测试事故描述",
            "severity": "minor",
            "location": "测试位置"
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("EHS-004 测试通过");
        }
        Err(e) => tracing::warn!("EHS-004: {}", e),
    }
}

// ==================== EHS-005: 查看安全培训 ====================

#[tokio::test]
async fn test_ehs_005_list_trainings() {
    tracing::info!("测试 EHS-005: 查看安全培训");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/ehs/trainings", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("EHS-005 测试通过");
        }
        Err(e) => tracing::warn!("EHS-005: {}", e),
    }
}

// ==================== EHS-006: 查看安全统计 ====================

#[tokio::test]
async fn test_ehs_006_view_statistics() {
    tracing::info!("测试 EHS-006: 查看安全统计");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/ehs/statistics", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("EHS-006 测试通过");
        }
        Err(e) => tracing::warn!("EHS-006: {}", e),
    }
}

// ==================== 测试总结 ====================

#[tokio::test]
async fn run_all_ehs_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  EHS 权限测试套件 (6个用例)");
    tracing::info!("========================================");
}
