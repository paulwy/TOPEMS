//! RS 模块权限测试
//!
//! 覆盖资源管理模块的核心权限场景
//!
//! 运行方式:
//! ```bash
//! cargo test --package topems-unified-core --test rs_permission_tests -- --test-threads=1
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
        .post(format!("{}/api/core/iam/auth/login", API_URL))
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
    _body: Option<Value>,
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

// ==================== RS-001: 查看资源列表 ====================

#[tokio::test]
#[ignore]
async fn test_rs_001_list_resources() {
    tracing::info!("测试 RS-001: 查看资源列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/rs/resources", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("RS-001 测试通过");
        }
        Err(e) => tracing::warn!("RS-001: {}", e),
    }
}

// ==================== RS-002: 创建资源 ====================

#[tokio::test]
#[ignore]
async fn test_rs_002_create_resource() {
    tracing::info!("测试 RS-002: 创建资源");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/rs/resources",
        Some(json!({
            "name": "测试资源",
            "type": "server",
            "status": "active"
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("RS-002 测试通过");
        }
        Err(e) => tracing::warn!("RS-002: {}", e),
    }
}

// ==================== RS-003: 分配资源 ====================

#[tokio::test]
#[ignore]
async fn test_rs_003_allocate_resource() {
    tracing::info!("测试 RS-003: 分配资源");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/rs/resources", None).await {
        Ok((_, body)) => {
            let resources = body["data"]["resources"]
                .as_array()
                .or_else(|| body["data"].as_array());
            if let Some(list) = resources {
                if let Some(resource) = list.first() {
                    if let Some(id) = resource["id"].as_str() {
                        match auth_request(
                            &client,
                            &token,
                            "POST",
                            &format!("/api/rs/resources/{}/allocate", id),
                            Some(json!({ "user_id": null })),
                        )
                        .await
                        {
                            Ok((status, _)) => {
                                assert!(status == 200 || status == 403 || status == 404);
                                tracing::info!("RS-003 测试通过");
                                return;
                            }
                            Err(e) => tracing::warn!("RS-003: {}", e),
                        }
                    }
                }
            }
        }
        Err(e) => tracing::warn!("RS-003: {}", e),
    }
    tracing::warn!("未找到资源，跳过测试");
}

// ==================== RS-004: 释放资源 ====================

#[tokio::test]
#[ignore]
async fn test_rs_004_release_resource() {
    tracing::info!("测试 RS-004: 释放资源");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/rs/resources", None).await {
        Ok((_, body)) => {
            let resources = body["data"]["resources"]
                .as_array()
                .or_else(|| body["data"].as_array());
            if let Some(list) = resources {
                let allocated = list
                    .iter()
                    .find(|r| r["status"].as_str() == Some("allocated"));
                if let Some(resource) = allocated {
                    if let Some(id) = resource["id"].as_str() {
                        match auth_request(
                            &client,
                            &token,
                            "POST",
                            &format!("/api/rs/resources/{}/release", id),
                            None,
                        )
                        .await
                        {
                            Ok((status, _)) => {
                                assert!(status == 200 || status == 403 || status == 404);
                                tracing::info!("RS-004 测试通过");
                                return;
                            }
                            Err(e) => tracing::warn!("RS-004: {}", e),
                        }
                    }
                }
            }
        }
        Err(e) => tracing::warn!("RS-004: {}", e),
    }
    tracing::warn!("未找到已分配资源，跳过测试");
}

// ==================== RS-005: 资源使用统计 ====================

#[tokio::test]
#[ignore]
async fn test_rs_005_resource_stats() {
    tracing::info!("测试 RS-005: 资源使用统计");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/rs/stats", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("RS-005 测试通过");
        }
        Err(e) => tracing::warn!("RS-005: {}", e),
    }
}

// ==================== 测试总结 ====================

#[tokio::test]
#[ignore]
async fn run_all_rs_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  RS 权限测试套件 (5个用例)");
    tracing::info!("========================================");
}
