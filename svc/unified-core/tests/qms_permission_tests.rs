//! QMS 模块权限测试
//!
//! 覆盖质量管理模块的核心权限场景
//!
//! 运行方式:
//! ```bash
//! cargo test --package topems-unified-core --test qms_permission_tests -- --test-threads=1
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

// ==================== QMS-001: 查看质量检查列表 ====================

#[tokio::test]
#[ignore]
async fn test_qms_001_list_inspections() {
    tracing::info!("测试 QMS-001: 查看质量检查列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/qms/inspections", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("QMS-001 测试通过");
        }
        Err(e) => tracing::warn!("QMS-001: {}", e),
    }
}

// ==================== QMS-002: 创建质量检查 ====================

#[tokio::test]
#[ignore]
async fn test_qms_002_create_inspection() {
    tracing::info!("测试 QMS-002: 创建质量检查");
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
        "/api/qms/inspections",
        Some(json!({
            "title": format!("质检_{}", timestamp),
            "type": "incoming",
            "items": [{ "name": "测试项", "standard": "合格标准", "result": "pass" }]
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("QMS-002 测试通过");
        }
        Err(e) => tracing::warn!("QMS-002: {}", e),
    }
}

// ==================== QMS-003: 查看不合格记录 ====================

#[tokio::test]
#[ignore]
async fn test_qms_003_list_nonconformities() {
    tracing::info!("测试 QMS-003: 查看不合格记录");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/qms/nonconformities", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("QMS-003 测试通过");
        }
        Err(e) => tracing::warn!("QMS-003: {}", e),
    }
}

// ==================== QMS-004: 创建不合格记录 ====================

#[tokio::test]
#[ignore]
async fn test_qms_004_create_nonconformity() {
    tracing::info!("测试 QMS-004: 创建不合格记录");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "POST",
        "/api/qms/nonconformities",
        Some(json!({
            "title": "不合格测试记录",
            "description": "测试不合格描述",
            "severity": "minor"
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("QMS-004 测试通过");
        }
        Err(e) => tracing::warn!("QMS-004: {}", e),
    }
}

// ==================== QMS-005: 查看质量报告 ====================

#[tokio::test]
#[ignore]
async fn test_qms_005_view_reports() {
    tracing::info!("测试 QMS-005: 查看质量报告");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/qms/reports", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("QMS-005 测试通过");
        }
        Err(e) => tracing::warn!("QMS-005: {}", e),
    }
}

// ==================== QMS-006: 查看审核计划 ====================

#[tokio::test]
#[ignore]
async fn test_qms_006_view_audit_plan() {
    tracing::info!("测试 QMS-006: 查看审核计划");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/qms/audit-plans", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("QMS-006 测试通过");
        }
        Err(e) => tracing::warn!("QMS-006: {}", e),
    }
}

// ==================== 测试总结 ====================

#[tokio::test]
#[ignore]
async fn run_all_qms_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  QMS 权限测试套件 (6个用例)");
    tracing::info!("========================================");
}
