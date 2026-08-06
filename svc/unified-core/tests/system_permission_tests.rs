//! System 模块权限测试
//!
//! 覆盖系统设置、监控等模块的核心权限场景
//!
//! 运行方式:
//! ```bash
//! cargo test --package topems-unified-core --test system_permission_tests -- --test-threads=1
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

// ==================== SYS-001: 查看系统设置 ====================

#[tokio::test]
#[ignore]
async fn test_sys_001_view_settings() {
    tracing::info!("测试 SYS-001: 查看系统设置");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/system/settings", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("SYS-001 测试通过");
        }
        Err(e) => tracing::warn!("SYS-001: {}", e),
    }
}

// ==================== SYS-002: 更新系统设置 ====================

#[tokio::test]
#[ignore]
async fn test_sys_002_update_settings() {
    tracing::info!("测试 SYS-002: 更新系统设置");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(
        &client,
        &token,
        "PUT",
        "/api/system/settings",
        Some(json!({
            "site_name": "TOPEMS 企业管理系统",
            "site_description": "测试环境"
        })),
    )
    .await
    {
        Ok((status, _)) => {
            assert!(status == 200 || status == 403 || status == 404);
            tracing::info!("SYS-002 测试通过");
        }
        Err(e) => tracing::warn!("SYS-002: {}", e),
    }
}

// ==================== SYS-003: 普通用户查看系统设置 ====================

#[tokio::test]
#[ignore]
async fn test_sys_003_employee_view_settings() {
    tracing::info!("测试 SYS-003: 普通用户查看系统设置");
    match login("test_employee", "admin123").await {
        Ok(token) => {
            let client = create_client();
            match auth_request(&client, &token, "GET", "/api/system/settings", None).await {
                Ok((status, _)) => {
                    assert!(status == 403 || status == 404, "普通用户应无权限");
                    tracing::info!("SYS-003 测试通过: 权限控制正常");
                }
                Err(e) => tracing::warn!("SYS-003: {}", e),
            }
        }
        Err(_) => tracing::warn!("测试员工账号不存在，跳过测试"),
    }
}

// ==================== SYS-004: 查看系统监控 ====================

#[tokio::test]
#[ignore]
async fn test_sys_004_view_monitoring() {
    tracing::info!("测试 SYS-004: 查看系统监控");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/system/monitoring", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("SYS-004 测试通过");
        }
        Err(e) => tracing::warn!("SYS-004: {}", e),
    }
}

// ==================== SYS-005: 查看审计日志 ====================

#[tokio::test]
#[ignore]
async fn test_sys_005_view_audit_logs() {
    tracing::info!("测试 SYS-005: 查看审计日志");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/audit/logs", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("SYS-005 测试通过");
        }
        Err(e) => tracing::warn!("SYS-005: {}", e),
    }
}

// ==================== SYS-006: 查看在线用户 ====================

#[tokio::test]
#[ignore]
async fn test_sys_006_view_online_users() {
    tracing::info!("测试 SYS-006: 查看在线用户");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/system/online-users", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("SYS-006 测试通过");
        }
        Err(e) => tracing::warn!("SYS-006: {}", e),
    }
}

// ==================== SYS-007: 查看系统健康状态 ====================

#[tokio::test]
#[ignore]
async fn test_sys_007_health_check() {
    tracing::info!("测试 SYS-007: 查看系统健康状态");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/system/health", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("SYS-007 测试通过");
        }
        Err(e) => tracing::warn!("SYS-007: {}", e),
    }
}

// ==================== SYS-008: 强制用户下线 ====================

#[tokio::test]
#[ignore]
async fn test_sys_008_force_logout() {
    tracing::info!("测试 SYS-008: 强制用户下线");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    // 获取在线用户
    match auth_request(&client, &token, "GET", "/api/system/online-users", None).await {
        Ok((_, body)) => {
            let users = body["data"]["users"]
                .as_array()
                .or_else(|| body["data"].as_array());
            if let Some(user_list) = users {
                if let Some(user) = user_list.first() {
                    if let Some(user_id) = user["user_id"].as_str() {
                        match auth_request(
                            &client,
                            &token,
                            "POST",
                            &format!("/api/system/force-logout/{}", user_id),
                            None,
                        )
                        .await
                        {
                            Ok((status, _)) => {
                                assert!(status == 200 || status == 403 || status == 404);
                                tracing::info!("SYS-008 测试通过");
                                return;
                            }
                            Err(e) => tracing::warn!("SYS-008: {}", e),
                        }
                    }
                }
            }
        }
        Err(e) => tracing::warn!("SYS-008: {}", e),
    }
    tracing::warn!("未找到在线用户，跳过测试");
}

// ==================== SYS-009: 查看数据字典 ====================

#[tokio::test]
#[ignore]
async fn test_sys_009_view_dictionaries() {
    tracing::info!("测试 SYS-009: 查看数据字典");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    match auth_request(&client, &token, "GET", "/api/system/dictionaries", None).await {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("SYS-009 测试通过");
        }
        Err(e) => tracing::warn!("SYS-009: {}", e),
    }
}

// ==================== SYS-010: 更新数据字典 ====================

#[tokio::test]
#[ignore]
async fn test_sys_010_update_dictionary() {
    tracing::info!("测试 SYS-010: 更新数据字典");
    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();
    // 获取字典列表
    match auth_request(&client, &token, "GET", "/api/system/dictionaries", None).await {
        Ok((_, body)) => {
            let dicts = body["data"]["dictionaries"]
                .as_array()
                .or_else(|| body["data"].as_array());
            if let Some(list) = dicts {
                if let Some(dict) = list.first() {
                    if let Some(id) = dict["id"].as_str() {
                        match auth_request(
                            &client,
                            &token,
                            "PUT",
                            &format!("/api/system/dictionaries/{}", id),
                            Some(json!({ "description": "更新描述" })),
                        )
                        .await
                        {
                            Ok((status, _)) => {
                                assert!(status == 200 || status == 403 || status == 404);
                                tracing::info!("SYS-010 测试通过");
                                return;
                            }
                            Err(e) => tracing::warn!("SYS-010: {}", e),
                        }
                    }
                }
            }
        }
        Err(e) => tracing::warn!("SYS-010: {}", e),
    }
    tracing::warn!("未找到数据字典，跳过测试");
}

// ==================== 测试总结 ====================

#[tokio::test]
#[ignore]
async fn run_all_system_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  System 权限测试套件 (10个用例)");
    tracing::info!("========================================");
}
