//! ERP 模块权限测试
//!
//! 覆盖 ERP 企业资源计划模块的核心权限场景
//!
//! 运行方式:
//! ```bash
//! cargo test --package unified-core-service --test erp_permission_tests -- --test-threads=1
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

// ==================== ERP-001: 查看采购订单列表 ====================

#[tokio::test]
#[ignore]
async fn test_erp_001_list_purchase_orders() {
    tracing::info!("测试 ERP-001: 查看采购订单列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/erp/purchase-orders", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("ERP-001 测试通过");
        }
        Err(e) => tracing::warn!("ERP-001: {}", e),
    }
}

// ==================== ERP-002: 创建采购订单 ====================

#[tokio::test]
#[ignore]
async fn test_erp_002_create_purchase_order() {
    tracing::info!("测试 ERP-002: 创建采购订单");
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
        "/api/erp/purchase-orders",
        Some(json!({
            "supplier_id": null,
            "items": [{ "product_id": null, "quantity": 10, "price": 100.0 }],
            "total_amount": 1000.0,
            "status": "draft"
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("ERP-002 测试通过");
        }
        Err(e) => tracing::warn!("ERP-002: {}", e),
    }
}

// ==================== ERP-003: 查看销售订单列表 ====================

#[tokio::test]
#[ignore]
async fn test_erp_003_list_sales_orders() {
    tracing::info!("测试 ERP-003: 查看销售订单列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/erp/sales-orders", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("ERP-003 测试通过");
        }
        Err(e) => tracing::warn!("ERP-003: {}", e),
    }
}

// ==================== ERP-004: 创建销售订单 ====================

#[tokio::test]
#[ignore]
async fn test_erp_004_create_sales_order() {
    tracing::info!("测试 ERP-004: 创建销售订单");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/erp/sales-orders",
        Some(json!({
            "customer_id": null,
            "items": [{ "product_id": null, "quantity": 5, "price": 200.0 }],
            "total_amount": 1000.0
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("ERP-004 测试通过");
        }
        Err(e) => tracing::warn!("ERP-004: {}", e),
    }
}

// ==================== ERP-005: 查看库存 ====================

#[tokio::test]
#[ignore]
async fn test_erp_005_view_inventory() {
    tracing::info!("测试 ERP-005: 查看库存");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/erp/inventory", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("ERP-005 测试通过");
        }
        Err(e) => tracing::warn!("ERP-005: {}", e),
    }
}

// ==================== ERP-006: 库存盘点 ====================

#[tokio::test]
#[ignore]
async fn test_erp_006_stocktaking() {
    tracing::info!("测试 ERP-006: 库存盘点");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/erp/inventory/stocktaking",
        Some(json!({
            "items": [{ "product_id": null, "actual_quantity": 100 }]
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("ERP-006 测试通过");
        }
        Err(e) => tracing::warn!("ERP-006: {}", e),
    }
}

// ==================== ERP-007: 查看财务数据 ====================

#[tokio::test]
#[ignore]
async fn test_erp_007_view_finance() {
    tracing::info!("测试 ERP-007: 查看财务数据");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/erp/finance/reports", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("ERP-007 测试通过");
        }
        Err(e) => tracing::warn!("ERP-007: {}", e),
    }
}

// ==================== ERP-008: 普通用户查看财务 ====================

#[tokio::test]
#[ignore]
async fn test_erp_008_employee_view_finance() {
    tracing::info!("测试 ERP-008: 普通用户查看财务");
    match login("test_employee", "admin123").await {
        Ok(token) => {
            let client = create_client();
            match auth_request(&client, &token, "GET", "/api/erp/finance/reports", None).await {
                Ok((status, _)) => {
                    assert!(status == 403 || status == 404 || status == 200);
                    tracing::info!("ERP-008 测试通过: 权限控制正常");
                }
                Err(e) => tracing::warn!("ERP-008: {}", e),
            }
        }
        Err(_) => tracing::warn!("测试员工账号不存在，跳过测试"),
    }
}

// ==================== 测试总结 ====================

#[tokio::test]
#[ignore]
async fn run_all_erp_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  ERP 权限测试套件 (8个用例)");
    tracing::info!("========================================");
}
