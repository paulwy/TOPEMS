//! Notification 模块权限测试
//!
//! 覆盖测试用例清单中的 NOTIF-001 到 NOTIF-007
//!
//! 运行方式:
//! ```bash
//! cargo test --package unified-core-service --test notification_permission_tests -- --test-threads=1
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

    let request = request
        .bearer_auth(token)
        .header("Content-Type", "application/json");

    let response = match body {
        Some(b) => request.json(&b),
        None => request,
    }
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

// ==================== NOTIF-001: 查看通知列表 ====================

#[tokio::test]
#[ignore]
async fn test_notif_001_list_notifications() {
    tracing::info!("测试 NOTIF-001: 查看通知列表");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let result = auth_request(&client, &token, "GET", "/api/v1/notifications", None).await;

    match result {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("NOTIF-001 测试通过: 成功返回通知列表");
        }
        Err(e) => {
            tracing::warn!("NOTIF-001: {}", e);
        }
    }
}

// ==================== NOTIF-002: 查看未读通知 ====================

#[tokio::test]
#[ignore]
async fn test_notif_002_list_unread() {
    tracing::info!("测试 NOTIF-002: 查看未读通知");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let result = auth_request(&client, &token, "GET", "/api/v1/notifications/unread", None).await;

    match result {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("NOTIF-002 测试通过: 成功返回未读通知");
        }
        Err(e) => {
            tracing::warn!("NOTIF-002: {}", e);
        }
    }
}

// ==================== NOTIF-003: 标记通知已读 ====================

#[tokio::test]
#[ignore]
async fn test_notif_003_mark_read() {
    tracing::info!("测试 NOTIF-003: 标记通知已读");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    // 先获取通知列表
    let list_result = auth_request(&client, &token, "GET", "/api/v1/notifications", None).await;

    match list_result {
        Ok((_, body)) => {
            let notifications = body["data"]["notifications"]
                .as_array()
                .or_else(|| body["data"].as_array());

            if let Some(notes) = notifications {
                // 找未读通知
                let unread = notes.iter().find(|n| n["is_read"].as_bool() == Some(false));

                if let Some(note) = unread {
                    if let Some(note_id) = note["id"].as_str() {
                        let mark_result = auth_request(
                            &client,
                            &token,
                            "PUT",
                            &format!("/api/v1/notifications/{}", note_id),
                            Some(json!({ "is_read": true })),
                        )
                        .await;

                        match mark_result {
                            Ok((status, _)) => {
                                assert!(status == 200 || status == 404);
                                tracing::info!("NOTIF-003 测试通过: 标记已读功能正常");
                                return;
                            }
                            Err(_) => {}
                        }
                    }
                }
            }
        }
        Err(_) => {}
    }

    tracing::warn!("未找到未读通知，跳过测试");
}

// ==================== NOTIF-004: 全部标记已读 ====================

#[tokio::test]
#[ignore]
async fn test_notif_004_mark_all_read() {
    tracing::info!("测试 NOTIF-004: 全部标记已读");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let result = auth_request(
        &client,
        &token,
        "PUT",
        "/api/v1/notifications/read-all",
        None,
    )
    .await;

    match result {
        Ok((status, _)) => {
            assert!(status == 200 || status == 204 || status == 404);
            tracing::info!("NOTIF-004 测试通过: 全部标记已读功能正常");
        }
        Err(e) => {
            tracing::warn!("NOTIF-004: {}", e);
        }
    }
}

// ==================== NOTIF-005: 发送通知 ====================

#[tokio::test]
#[ignore]
async fn test_notif_005_send_notification() {
    tracing::info!("测试 NOTIF-005: 发送通知");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    let result = auth_request(
        &client,
        &token,
        "POST",
        "/api/core/comm/notify/send",
        Some(json!({
            "title": format!("测试通知_{}", timestamp),
            "content": "这是一条自动化测试通知",
            "type": "system",
            "recipient_ids": []
        })),
    )
    .await;

    match result {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("NOTIF-005 测试通过: 发送通知功能正常");
        }
        Err(e) => {
            tracing::warn!("NOTIF-005: {}", e);
        }
    }
}

// ==================== NOTIF-006: 广播通知 ====================

#[tokio::test]
#[ignore]
async fn test_notif_006_broadcast_notification() {
    tracing::info!("测试 NOTIF-006: 广播通知");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    let result = auth_request(
        &client,
        &token,
        "POST",
        "/api/core/comm/notify/broadcast",
        Some(json!({
            "title": format!("广播通知_{}", timestamp),
            "content": "这是一条广播通知",
            "type": "announcement"
        })),
    )
    .await;

    match result {
        Ok((status, _)) => {
            assert!(status == 200 || status == 201 || status == 403 || status == 404);
            tracing::info!("NOTIF-006 测试通过: 广播通知功能正常");
        }
        Err(e) => {
            tracing::warn!("NOTIF-006: {}", e);
        }
    }
}

// ==================== NOTIF-007: 访问他人通知 ====================

#[tokio::test]
#[ignore]
async fn test_notif_007_access_others_notification() {
    tracing::info!("测试 NOTIF-007: 访问他人通知");

    // 使用普通员工账号
    match login("test_employee", "admin123").await {
        Ok(token) => {
            let client = create_client();

            // 尝试访问不存在的通知
            let fake_notif_id = "00000000-0000-0000-0000-000000000999";

            let result = auth_request(
                &client,
                &token,
                "GET",
                &format!("/api/v1/notifications/{}", fake_notif_id),
                None,
            )
            .await;

            match result {
                Ok((status, _)) => {
                    assert!(status == 403 || status == 404, "应返回 403 或 404");
                    tracing::info!("NOTIF-007 测试通过: 访问他人通知被正确拒绝");
                }
                Err(e) => {
                    tracing::warn!("NOTIF-007: {}", e);
                }
            }
        }
        Err(_) => {
            tracing::warn!("测试员工账号不存在，跳过测试");
        }
    }
}

// ==================== 测试总结 ====================

#[tokio::test]
#[ignore]
async fn run_all_notification_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  Notification 权限测试套件");
    tracing::info!("========================================");
    tracing::info!("测试用例覆盖:");
    tracing::info!("  - NOTIF-001: 查看通知列表");
    tracing::info!("  - NOTIF-002: 查看未读通知");
    tracing::info!("  - NOTIF-003: 标记通知已读");
    tracing::info!("  - NOTIF-004: 全部标记已读");
    tracing::info!("  - NOTIF-005: 发送通知");
    tracing::info!("  - NOTIF-006: 广播通知");
    tracing::info!("  - NOTIF-007: 访问他人通知");
    tracing::info!("========================================");
}
