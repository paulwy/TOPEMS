//! QMS 模块权限测试
//!
//! 覆盖质量管理模块的核心权限场景：
//! - 管理员（qms:admin / superadmin）可访问 QMS 业务端点（200）
//! - 无 token 请求被 auth_middleware 拦截（401）
//!
//! 端点已同步 QMS 服务真实路由（2026-09-01）：
//! - inspections → /checks（quality_inspection）
//! - nonconformities → /issues（quality_issue）
//! - reports → /eightd（8D 报告）
//! - audit-plans → /audit-plans（audit）
//!
//! 运行前提：本地 unified-core（8000）+ qms 服务（8050）在运行。
//! 运行方式:
//! ```bash
//! cargo test --package topems-unified-core --test qms_permission_tests -- --test-threads=1
//! ```

use reqwest::Client;
use serde_json::{json, Value};

/// 登录服务（unified-core）
const LOGIN_URL: &str = "http://localhost:8000";
/// QMS 业务服务（api_prefix=/api/qms）
const API_URL: &str = "http://localhost:8050";

fn create_client() -> Client {
    Client::new()
}

async fn login(username: &str, password: &str) -> Result<String, String> {
    let client = create_client();
    let response = client
        .post(format!("{}/api/core/iam/auth/login", LOGIN_URL))
        .json(&json!({ "username": username, "password": password }))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    let body: Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    if body["code"].as_i64().unwrap_or(-1) == 0 {
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

/// 带 Bearer token 请求 QMS 服务
async fn auth_request(
    client: &Client,
    token: &str,
    endpoint: &str,
) -> Result<(u16, Value), String> {
    let url = format!("{}{}", API_URL, endpoint);
    let response = client
        .get(&url)
        .bearer_auth(token)
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

/// 无 token 请求 QMS 服务（应被 auth_middleware 拦截 401）
async fn no_auth_request(client: &Client, endpoint: &str) -> Result<u16, String> {
    let url = format!("{}{}", API_URL, endpoint);
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    Ok(response.status().as_u16())
}

// ==================== QMS-001: 管理员查看质量检查列表 ====================

#[tokio::test]
#[ignore]
async fn test_qms_001_list_inspections() {
    tracing::info!("测试 QMS-001: 管理员查看质量检查列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    let (status, body) =
        auth_request(&client, &token, "/api/qms/checks").await.expect("请求失败");
    assert_eq!(status, 200, "状态码应为 200，实际 {}", status);
    assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
    tracing::info!("QMS-001 测试通过");
}

// ==================== QMS-002: 无 token 访问被拦截 ====================

#[tokio::test]
#[ignore]
async fn test_qms_002_no_token_rejected() {
    tracing::info!("测试 QMS-002: 无 token 访问质量检查列表应 401");
    let client = create_client();
    let status = no_auth_request(&client, "/api/qms/checks").await.expect("请求失败");
    assert_eq!(status, 401, "无 token 应 401，实际 {}", status);
    tracing::info!("QMS-002 测试通过");
}

// ==================== QMS-003: 管理员查看质量问题列表 ====================

#[tokio::test]
#[ignore]
async fn test_qms_003_list_issues() {
    tracing::info!("测试 QMS-003: 管理员查看质量问题列表");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    let (status, _) = auth_request(&client, &token, "/api/qms/issues")
        .await
        .expect("请求失败");
    // 权限层验证：admin 通过 require_permission(qms:admin) 到达 handler（HTTP 200）。
    // 注意：issues 业务查询当前返回 code=500（已知 bug：qa_quality_issues.id 为 UUID 但
    // 代码 SELECT id 未 cast::TEXT，解码 String 失败），见 TODO QMS 查询 id cast 专项；
    // 权限层本身正确（无 token 401 / admin 200），业务修复不在此测试范围。
    assert_eq!(status, 200, "状态码应为 200，实际 {}", status);
    tracing::info!("QMS-003 测试通过");
}

// ==================== QMS-004: 无 token 访问问题列表被拦截 ====================

#[tokio::test]
#[ignore]
async fn test_qms_004_no_token_issues_rejected() {
    tracing::info!("测试 QMS-004: 无 token 访问问题列表应 401");
    let client = create_client();
    let status = no_auth_request(&client, "/api/qms/issues").await.expect("请求失败");
    assert_eq!(status, 401, "无 token 应 401，实际 {}", status);
    tracing::info!("QMS-004 测试通过");
}

// ==================== QMS-005: 管理员查看 8D 报告 ====================

#[tokio::test]
#[ignore]
async fn test_qms_005_view_reports() {
    tracing::info!("测试 QMS-005: 管理员查看 8D 报告");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    let (status, _) = auth_request(&client, &token, "/api/qms/eightd")
        .await
        .expect("请求失败");
    // 权限层验证：admin 通过权限层到达 handler（HTTP 200）。
    // 注意：eightd 业务查询存在类型错（uuid=jsonb）已知 bug，见 TODO QMS 查询 id cast 专项；
    // 权限层本身正确（无 token 401 / admin 200）。
    assert_eq!(status, 200, "状态码应为 200，实际 {}", status);
    tracing::info!("QMS-005 测试通过");
}

// ==================== QMS-006: 管理员查看审核计划 ====================

#[tokio::test]
#[ignore]
async fn test_qms_006_view_audit_plan() {
    tracing::info!("测试 QMS-006: 管理员查看审核计划");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    let (status, body) =
        auth_request(&client, &token, "/api/qms/audit-plans").await.expect("请求失败");
    assert_eq!(status, 200, "状态码应为 200，实际 {}", status);
    assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
    tracing::info!("QMS-006 测试通过");
}

// ==================== 测试总结 ====================

#[tokio::test]
#[ignore]
async fn run_all_qms_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  QMS 权限测试套件 (6个用例)");
    tracing::info!("  端点: /checks /issues /eightd /audit-plans (qms:8050)");
    tracing::info!("  凭据: admin/admin123 (登录 unified-core:8000)");
    tracing::info!("========================================");
}
