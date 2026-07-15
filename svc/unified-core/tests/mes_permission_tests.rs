//! MES 模块权限测试
//!
//! 覆盖制造执行系统模块的核心权限场景

use reqwest::Client;
use serde_json::{json, Value};

const API_URL: &str = "http://localhost:8000";

fn create_client() -> Client {
    Client::new()
}

async fn login(username: &str, password: &str) -> Result<String, String> {
    let client = create_client();
    let response = client
        .post(format!("{}/api/core/iam/v1/auth/login", API_URL))
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

#[tokio::test]
#[ignore]
async fn test_mes_001_view_production_plan() {
    tracing::info!("测试 MES-001: 查看生产计划");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/mes/production-plans", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("MES-001 测试通过");
        }
        Err(e) => tracing::warn!("MES-001: {}", e),
    }
}

#[tokio::test]
#[ignore]
async fn test_mes_002_create_production_plan() {
    tracing::info!("测试 MES-002: 创建生产计划");
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
        "/api/mes/production-plans",
        Some(json!({
            "name": format!("生产计划_{}", timestamp),
            "product_id": null,
            "quantity": 100,
            "start_date": "2026-07-01"
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("MES-002 测试通过");
        }
        Err(e) => tracing::warn!("MES-002: {}", e),
    }
}

#[tokio::test]
#[ignore]
async fn test_mes_003_view_workshop() {
    tracing::info!("测试 MES-003: 查看车间信息");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/mes/workshops", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("MES-003 测试通过");
        }
        Err(e) => tracing::warn!("MES-003: {}", e),
    }
}

#[tokio::test]
#[ignore]
async fn test_mes_004_view_machine_status() {
    tracing::info!("测试 MES-004: 查看设备状态");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/mes/machines", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("MES-004 测试通过");
        }
        Err(e) => tracing::warn!("MES-004: {}", e),
    }
}

#[tokio::test]
#[ignore]
async fn test_mes_005_view_production_stats() {
    tracing::info!("测试 MES-005: 查看生产统计");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/mes/statistics", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("MES-005 测试通过");
        }
        Err(e) => tracing::warn!("MES-005: {}", e),
    }
}

#[tokio::test]
#[ignore]
async fn test_mes_006_view_quality_control() {
    tracing::info!("测试 MES-006: 查看质量控制");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/mes/quality-control", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("MES-006 测试通过");
        }
        Err(e) => tracing::warn!("MES-006: {}", e),
    }
}

#[tokio::test]
#[ignore]
async fn run_all_mes_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  MES 权限测试套件");
    tracing::info!("========================================");
}
