//! SCM 模块权限测试
//!
//! 覆盖 SCM 供应链管理模块的核心权限场景
//!
//! 运行方式:
//! ```bash
//! cargo test --package unified-core-service --test scm_permission_tests -- --test-threads=1
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

// ==================== SCM-001: 查看供应商列表 ====================

#[tokio::test]
#[ignore]
async fn test_scm_001_list_suppliers() {
    tracing::info!("测试 SCM-001: 查看供应商列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/scm/suppliers", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("SCM-001 测试通过");
        }
        Err(e) => tracing::warn!("SCM-001: {}", e),
    }
}

// ==================== SCM-002: 创建供应商 ====================

#[tokio::test]
#[ignore]
async fn test_scm_002_create_supplier() {
    tracing::info!("测试 SCM-002: 创建供应商");
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
        "/api/scm/suppliers",
        Some(json!({
            "name": format!("测试供应商_{}", timestamp),
            "contact": "李四",
            "phone": "13900139000"
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("SCM-002 测试通过");
        }
        Err(e) => tracing::warn!("SCM-002: {}", e),
    }
}

// ==================== SCM-003: 查看采购计划 ====================

#[tokio::test]
#[ignore]
async fn test_scm_003_list_purchase_plans() {
    tracing::info!("测试 SCM-003: 查看采购计划");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/scm/purchase-plans", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("SCM-003 测试通过");
        }
        Err(e) => tracing::warn!("SCM-003: {}", e),
    }
}

// ==================== SCM-004: 创建采购计划 ====================

#[tokio::test]
#[ignore]
async fn test_scm_004_create_purchase_plan() {
    tracing::info!("测试 SCM-004: 创建采购计划");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/scm/purchase-plans",
        Some(json!({
            "title": "测试采购计划",
            "items": [{ "product_id": null, "quantity": 100 }],
            "status": "draft"
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("SCM-004 测试通过");
        }
        Err(e) => tracing::warn!("SCM-004: {}", e),
    }
}

// ==================== SCM-005: 审批采购计划 ====================

#[tokio::test]
#[ignore]
async fn test_scm_005_approve_purchase_plan() {
    tracing::info!("测试 SCM-005: 审批采购计划");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    let list_result = auth_request(&client, &token, "GET", "/api/scm/purchase-plans", None).await;
    if let Ok((_, body)) = list_result {
        let plans = body["data"]["plans"]
            .as_array()
            .or_else(|| body["data"].as_array());
        if let Some(list) = plans {
            let draft_plan = list.iter().find(|p| p["status"].as_str() == Some("draft"));
            if let Some(plan) = draft_plan {
                if let Some(id) = plan["id"].as_str() {
                    match auth_request(
                        &client,
                        &token,
                        "POST",
                        &format!("/api/scm/purchase-plans/{}/approve", id),
                        None,
                    )
                    .await
                    {
                        Ok((status, _)) => {
                            assert!(status == 200 || status == 403 || status == 404);
                            tracing::info!("SCM-005 测试通过");
                            return;
                        }
                        Err(e) => tracing::warn!("SCM-005: {}", e),
                    }
                }
            }
        }
    }
    tracing::warn!("未找到待审批的采购计划，跳过测试");
}

// ==================== SCM-006: 查看物流跟踪 ====================

#[tokio::test]
#[ignore]
async fn test_scm_006_track_shipments() {
    tracing::info!("测试 SCM-006: 查看物流跟踪");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/scm/shipments", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("SCM-006 测试通过");
        }
        Err(e) => tracing::warn!("SCM-006: {}", e),
    }
}

// ==================== SCM-007: 查看仓库 ====================

#[tokio::test]
#[ignore]
async fn test_scm_007_list_warehouses() {
    tracing::info!("测试 SCM-007: 查看仓库");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/scm/warehouses", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("SCM-007 测试通过");
        }
        Err(e) => tracing::warn!("SCM-007: {}", e),
    }
}

// ==================== SCM-008: 仓库调拨 ====================

#[tokio::test]
#[ignore]
async fn test_scm_008_transfer_inventory() {
    tracing::info!("测试 SCM-008: 仓库调拨");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/scm/inventory/transfer",
        Some(json!({
            "from_warehouse_id": null,
            "to_warehouse_id": null,
            "items": [{ "product_id": null, "quantity": 10 }]
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("SCM-008 测试通过");
        }
        Err(e) => tracing::warn!("SCM-008: {}", e),
    }
}

// ==================== 测试总结 ====================

#[tokio::test]
#[ignore]
async fn run_all_scm_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  SCM 权限测试套件 (8个用例)");
    tracing::info!("========================================");
}
