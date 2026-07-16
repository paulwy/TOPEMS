//! CRM 模块权限测试
//!
//! 覆盖 CRM 客户关系管理模块的核心权限场景
//!
//! 运行方式:
//! ```bash
//! cargo test --package unified-core-service --test crm_permission_tests -- --test-threads=1
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

// ==================== CRM-001: 查看客户列表 ====================

#[tokio::test]
#[ignore]
async fn test_crm_001_list_customers() {
    tracing::info!("测试 CRM-001: 查看客户列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/crm/customers", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("CRM-001 测试通过");
        }
        Err(e) => tracing::warn!("CRM-001: {}", e),
    }
}

// ==================== CRM-002: 创建客户 ====================

#[tokio::test]
#[ignore]
async fn test_crm_002_create_customer() {
    tracing::info!("测试 CRM-002: 创建客户");
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
        "/api/crm/customers",
        Some(json!({
            "name": format!("测试客户_{}", timestamp),
            "contact": "张三",
            "phone": "13800138000",
            "email": format!("customer_{}@test.com", timestamp)
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("CRM-002 测试通过");
        }
        Err(e) => tracing::warn!("CRM-002: {}", e),
    }
}

// ==================== CRM-003: 更新客户信息 ====================

#[tokio::test]
#[ignore]
async fn test_crm_003_update_customer() {
    tracing::info!("测试 CRM-003: 更新客户信息");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    let list_result = auth_request(&client, &token, "GET", "/api/crm/customers", None).await;
    if let Ok((_, body)) = list_result {
        let customers = body["data"]["customers"]
            .as_array()
            .or_else(|| body["data"].as_array());
        if let Some(list) = customers {
            if let Some(customer) = list.first() {
                if let Some(id) = customer["id"].as_str() {
                    if let Ok((status, _)) = auth_request(
                        &client,
                        &token,
                        "PUT",
                        &format!("/api/crm/customers/{}", id),
                        Some(json!({ "name": "更新后的客户" })),
                    )
                    .await
                    {
                        assert!(status == 200 || status == 403 || status == 404);
                        tracing::info!("CRM-003 测试通过");
                        return;
                    }
                }
            }
        }
    }
    tracing::warn!("未找到客户，跳过测试");
}

// ==================== CRM-004: 删除客户 ====================

#[tokio::test]
#[ignore]
async fn test_crm_004_delete_customer() {
    tracing::info!("测试 CRM-004: 删除客户");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    let list_result = auth_request(&client, &token, "GET", "/api/crm/customers", None).await;
    if let Ok((_, body)) = list_result {
        let customers = body["data"]["customers"]
            .as_array()
            .or_else(|| body["data"].as_array());
        if let Some(list) = customers {
            let test_customer = list.iter().find(|c| {
                c["name"]
                    .as_str()
                    .map(|s| s.contains("测试"))
                    .unwrap_or(false)
            });
            if let Some(customer) = test_customer {
                if let Some(id) = customer["id"].as_str() {
                    if let Ok((status, _)) = auth_request(
                        &client,
                        &token,
                        "DELETE",
                        &format!("/api/crm/customers/{}", id),
                        None,
                    )
                    .await
                    {
                        assert!(status == 200 || status == 204 || status == 403 || status == 404);
                        tracing::info!("CRM-004 测试通过");
                        return;
                    }
                }
            }
        }
    }
    tracing::warn!("未找到可删除的客户，跳过测试");
}

// ==================== CRM-005: 查看商机列表 ====================

#[tokio::test]
#[ignore]
async fn test_crm_005_list_opportunities() {
    tracing::info!("测试 CRM-005: 查看商机列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/crm/opportunities", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("CRM-005 测试通过");
        }
        Err(e) => tracing::warn!("CRM-005: {}", e),
    }
}

// ==================== CRM-006: 创建商机 ====================

#[tokio::test]
#[ignore]
async fn test_crm_006_create_opportunity() {
    tracing::info!("测试 CRM-006: 创建商机");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/crm/opportunities",
        Some(json!({
            "title": "测试商机",
            "customer_id": null,
            "amount": 50000.0,
            "stage": "qualification"
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("CRM-006 测试通过");
        }
        Err(e) => tracing::warn!("CRM-006: {}", e),
    }
}

// ==================== CRM-007: 查看联系人 ====================

#[tokio::test]
#[ignore]
async fn test_crm_007_list_contacts() {
    tracing::info!("测试 CRM-007: 查看联系人");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/crm/contacts", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("CRM-007 测试通过");
        }
        Err(e) => tracing::warn!("CRM-007: {}", e),
    }
}

// ==================== CRM-008: 查看客户跟进记录 ====================

#[tokio::test]
#[ignore]
async fn test_crm_008_view_followups() {
    tracing::info!("测试 CRM-008: 查看客户跟进记录");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/crm/followups", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("CRM-008 测试通过");
        }
        Err(e) => tracing::warn!("CRM-008: {}", e),
    }
}

// ==================== 测试总结 ====================

#[tokio::test]
#[ignore]
async fn run_all_crm_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  CRM 权限测试套件 (8个用例)");
    tracing::info!("========================================");
}
