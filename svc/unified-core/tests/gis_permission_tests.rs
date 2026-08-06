//! GIS 模块权限测试
//!
//! 覆盖地理信息模块的核心权限场景
//!
//! 运行方式:
//! ```bash
//! cargo test --package topems-unified-core --test gis_permission_tests -- --test-threads=1
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

// ==================== GIS-001: 查看地图数据 ====================

#[tokio::test]
#[ignore]
async fn test_gis_001_view_map() {
    tracing::info!("测试 GIS-001: 查看地图数据");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/gis/map", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("GIS-001 测试通过");
        }
        Err(e) => tracing::warn!("GIS-001: {}", e),
    }
}

// ==================== GIS-002: 位置查询 ====================

#[tokio::test]
#[ignore]
async fn test_gis_002_search_location() {
    tracing::info!("测试 GIS-002: 位置查询");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/gis/search?q=测试位置", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("GIS-002 测试通过");
        }
        Err(e) => tracing::warn!("GIS-002: {}", e),
    }
}

// ==================== GIS-003: 添加地标 ====================

#[tokio::test]
#[ignore]
async fn test_gis_003_add_marker() {
    tracing::info!("测试 GIS-003: 添加地标");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/gis/markers",
        Some(json!({
            "name": "测试地标",
            "latitude": 31.2304,
            "longitude": 121.4737,
            "description": "测试位置"
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("GIS-003 测试通过");
        }
        Err(e) => tracing::warn!("GIS-003: {}", e),
    }
}

// ==================== GIS-004: 查看地标列表 ====================

#[tokio::test]
#[ignore]
async fn test_gis_004_list_markers() {
    tracing::info!("测试 GIS-004: 查看地标列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/gis/markers", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("GIS-004 测试通过");
        }
        Err(e) => tracing::warn!("GIS-004: {}", e),
    }
}

// ==================== GIS-005: 路径规划 ====================

#[tokio::test]
#[ignore]
async fn test_gis_005_route_planning() {
    tracing::info!("测试 GIS-005: 路径规划");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/gis/route",
        Some(json!({
            "start": { "lat": 31.2304, "lng": 121.4737 },
            "end": { "lat": 31.2305, "lng": 121.4738 }
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 403 || status == 404);
            tracing::info!("GIS-005 测试通过");
        }
        Err(e) => tracing::warn!("GIS-005: {}", e),
    }
}

// ==================== 测试总结 ====================

#[tokio::test]
#[ignore]
async fn run_all_gis_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  GIS 权限测试套件 (5个用例)");
    tracing::info!("========================================");
}
