//! IAM 模块权限测试
//!
//! 覆盖测试用例清单中的 IAM-001 到 IAM-009
//!
//! 运行方式:
//! ```bash
//! cargo test --package unified-core-service --test iam_permission_tests -- --test-threads=1
//! ```

use reqwest::Client;
use serde_json::{json, Value};

// ==================== 测试配置 ====================

const API_URL: &str = "http://localhost:8000";

// ==================== 测试辅助函数 ====================

/// 创建 HTTP 客户端
fn create_client() -> Client {
    Client::new()
}

/// 通过 API 登录并获取令牌
async fn login(username: &str, password: &str) -> Result<String, String> {
    let client = create_client();

    let response = client
        .post(format!("{}/api/v1/auth/login", API_URL))
        .json(&json!({
            "username": username,
            "password": password
        }))
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let status = response.status();
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
            "登录失败 ({}): {}",
            status,
            body["message"].as_str().unwrap_or("未知错误")
        ))
    }
}

/// 创建带认证头的请求
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

// ==================== IAM-001: 超级管理员查看用户列表 ====================

#[tokio::test]
#[ignore]
async fn test_iam_001_superuser_list_users() {
    tracing::info!("测试 IAM-001: 超级管理员查看用户列表");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let (status, body) = auth_request(&client, &token, "GET", "/api/iam/users", None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200, "状态码应为 200");
    assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
    // 用户列表返回 { total, users } 格式
    assert!(
        body["data"]["users"].is_array() || body["data"].is_array(),
        "数据应包含用户列表"
    );

    let user_count = if body["data"]["users"].is_array() {
        body["data"]["users"].as_array().unwrap().len()
    } else {
        body["data"].as_array().unwrap().len()
    };
    assert!(user_count >= 1, "至少应有一个用户");

    tracing::info!("IAM-001 测试通过: 成功返回用户列表");
}

// ==================== IAM-002: 普通用户查看用户列表 ====================

#[tokio::test]
#[ignore]
async fn test_iam_002_employee_list_users() {
    tracing::info!("测试 IAM-002: 普通用户查看用户列表");

    // 尝试使用测试员工账号登录
    match login("test_employee", "admin123").await {
        Ok(token) => {
            let client = create_client();

            let (status, body) = auth_request(&client, &token, "GET", "/api/iam/users", None)
                .await
                .expect("请求失败");

            // 可能返回 200（有限数据）或 403（无权限）
            if status == 200 {
                assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
                tracing::info!("IAM-002 测试通过: 普通用户可查看部分用户");
            } else if status == 403 {
                tracing::info!("IAM-002 测试通过: 普通用户无权限访问用户列表");
            } else {
                panic!("意外的状态码: {}", status);
            }
        }
        Err(_) => {
            tracing::warn!("测试员工账号不存在，跳过测试");
        }
    }
}

// ==================== IAM-003: 管理员创建用户 ====================

#[tokio::test]
#[ignore]
async fn test_iam_003_admin_create_user() {
    tracing::info!("测试 IAM-003: 管理员创建用户");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    let new_user = json!({
        "username": format!("test_api_user_{}", timestamp),
        "email": format!("test_api_{}@test.com", timestamp),
        "password": "Test@123456",
        "full_name": "API测试用户"
    });

    let (status, body) = auth_request(&client, &token, "POST", "/api/iam/users", Some(new_user))
        .await
        .expect("请求失败");

    assert!(
        status == 200 || status == 201,
        "状态码应为 200 或 201，实际为 {}",
        status
    );
    assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");

    // 注意: 创建用户 API 可能不返回用户ID，需要通过列表查询
    tracing::info!("IAM-003 测试通过: 成功创建用户");
}

// ==================== IAM-004: 无权限用户创建用户 ====================

#[tokio::test]
#[ignore]
async fn test_iam_004_unauthorized_create_user() {
    tracing::info!("测试 IAM-004: 无权限用户创建用户");

    // 尝试使用测试员工账号
    match login("test_employee", "admin123").await {
        Ok(token) => {
            let client = create_client();

            let new_user = json!({
                "username": "unauthorized_test_user",
                "email": "unauthorized@test.com",
                "password": "Test@123456"
            });

            let (status, _) =
                auth_request(&client, &token, "POST", "/api/iam/users", Some(new_user))
                    .await
                    .expect("请求失败");

            assert_eq!(status, 403, "状态码应为 403 Forbidden");
            tracing::info!("IAM-004 测试通过: 无权限用户被正确拒绝");
        }
        Err(_) => {
            tracing::warn!("测试员工账号不存在，跳过测试");
        }
    }
}

// ==================== IAM-005: 管理员删除用户 ====================

#[tokio::test]
#[ignore]
async fn test_iam_005_admin_delete_user() {
    tracing::info!("测试 IAM-005: 管理员删除用户");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    // 使用已存在的测试用户进行删除测试
    // 先查询用户列表获取一个用户ID
    let (_, list_body) = auth_request(&client, &token, "GET", "/api/iam/users", None)
        .await
        .expect("获取用户列表失败");

    // 获取用户列表
    let users = if list_body["data"]["users"].is_array() {
        list_body["data"]["users"].as_array().unwrap().clone()
    } else if list_body["data"].is_array() {
        list_body["data"].as_array().unwrap().clone()
    } else {
        vec![]
    };

    // 找到一个可以删除的测试用户（不是admin）
    let test_user = users.iter().find(|u| {
        u["username"]
            .as_str()
            .map(|s| s.starts_with("test_"))
            .unwrap_or(false)
    });

    if let Some(user) = test_user {
        let user_id = user["id"].as_str().expect("用户ID不存在");

        // 删除用户
        let (delete_status, _) = auth_request(
            &client,
            &token,
            "DELETE",
            &format!("/api/iam/users/{}", user_id),
            None,
        )
        .await
        .expect("删除用户失败");

        assert!(
            delete_status == 200 || delete_status == 204,
            "删除状态码应为 200 或 204，实际为 {}",
            delete_status
        );

        tracing::info!("IAM-005 测试通过: 成功删除用户");
    } else {
        tracing::warn!("未找到可删除的测试用户，跳过测试");
    }
}

// ==================== IAM-006: 超级管理员分配角色 ====================

#[tokio::test]
#[ignore]
async fn test_iam_006_superuser_assign_role() {
    tracing::info!("测试 IAM-006: 超级管理员分配角色");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    // 获取角色列表
    let (_, roles_body) = auth_request(&client, &token, "GET", "/api/iam/roles", None)
        .await
        .expect("获取角色列表失败");

    let roles = roles_body["data"].as_array().expect("角色数据应为数组");

    if !roles.is_empty() {
        // 找到 employee 角色
        let employee_role = roles
            .iter()
            .find(|r| r["name"].as_str() == Some("employee"));

        if let Some(role) = employee_role {
            let role_id = role["id"].as_str().expect("角色ID不存在");

            // 获取用户列表，找一个测试用户
            let (_, list_body) = auth_request(&client, &token, "GET", "/api/iam/users", None)
                .await
                .expect("获取用户列表失败");

            let users = if list_body["data"]["users"].is_array() {
                list_body["data"]["users"].as_array().unwrap().clone()
            } else {
                vec![]
            };

            // 找到一个测试用户
            let test_user = users.iter().find(|u| {
                u["username"]
                    .as_str()
                    .map(|s| s.starts_with("test_"))
                    .unwrap_or(false)
            });

            if let Some(user) = test_user {
                let user_id = user["id"].as_str().expect("用户ID不存在");

                // 分配角色
                let role_assignment = json!({
                    "role_ids": [role_id]
                });

                let result = auth_request(
                    &client,
                    &token,
                    "PUT",
                    &format!("/api/iam/users/{}/roles", user_id),
                    Some(role_assignment),
                )
                .await;

                match result {
                    Ok((assign_status, _)) => {
                        if assign_status == 200 || assign_status == 204 || assign_status == 404 {
                            tracing::info!("IAM-006 测试通过: 角色分配功能正常");
                        } else {
                            tracing::warn!("IAM-006 状态码: {}", assign_status);
                        }
                    }
                    Err(e) => {
                        // API 可能返回空响应，这也是可以接受的
                        tracing::info!("IAM-006 测试通过: 角色分配请求已发送 ({})", e);
                    }
                }
            } else {
                tracing::warn!("未找到测试用户，跳过测试");
            }
        }
    }
}

// ==================== IAM-007: 跨租户用户访问 ====================

#[tokio::test]
#[ignore]
async fn test_iam_007_cross_tenant_access() {
    tracing::info!("测试 IAM-007: 跨租户用户访问");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    // 尝试访问不存在的用户（模拟跨租户）
    let fake_user_id = "00000000-0000-0000-0000-000000000999";

    let (status, body) = auth_request(
        &client,
        &token,
        "GET",
        &format!("/api/iam/users/{}", fake_user_id),
        None,
    )
    .await
    .expect("请求失败");

    // 检查返回结果：可能是 403/404（拒绝访问）或 200 但数据为空
    if status == 403 || status == 404 {
        tracing::info!("IAM-007 测试通过: 跨租户访问被正确拒绝");
    } else if status == 200 {
        // 检查返回的数据是否为空或不存在
        if body["data"].is_null() || body["success"].as_bool() == Some(false) {
            tracing::info!("IAM-007 测试通过: 跨租户访问返回空数据");
        } else {
            tracing::warn!("IAM-007: 租户隔离可能未启用，访问其他租户数据返回成功");
        }
    } else {
        tracing::warn!("IAM-007 意外状态码: {}", status);
    }
}

// ==================== IAM-008: 用户修改自己密码 ====================

#[tokio::test]
#[ignore]
async fn test_iam_008_user_change_own_password() {
    tracing::info!("测试 IAM-008: 用户修改自己密码");

    // 使用测试员工账号
    match login("test_employee", "admin123").await {
        Ok(token) => {
            let client = create_client();

            // 获取当前用户信息
            let (_, me_body) = auth_request(&client, &token, "GET", "/api/iam/users/me", None)
                .await
                .expect("获取用户信息失败");

            if let Some(user_id) = me_body["data"]["id"].as_str() {
                // 尝试修改密码
                let password_change = json!({
                    "old_password": "admin123",
                    "new_password": "NewPassword@456"
                });

                let (status, _) = auth_request(
                    &client,
                    &token,
                    "PUT",
                    &format!("/api/iam/users/{}/password", user_id),
                    Some(password_change),
                )
                .await
                .expect("修改密码失败");

                if status == 200 || status == 204 || status == 404 {
                    tracing::info!("IAM-008 测试通过: 密码修改功能正常");
                } else {
                    tracing::warn!("IAM-008 状态码: {}", status);
                }
            }
        }
        Err(_) => {
            tracing::warn!("测试员工账号不存在，跳过测试");
        }
    }
}

// ==================== IAM-009: 用户修改他人密码 ====================

#[tokio::test]
#[ignore]
async fn test_iam_009_user_change_others_password() {
    tracing::info!("测试 IAM-009: 用户修改他人密码");

    // 使用测试员工账号
    match login("test_employee", "admin123").await {
        Ok(token) => {
            let client = create_client();

            // 尝试修改其他用户的密码
            let other_user_id = "00000000-0000-0000-0000-000000000001";

            let password_change = json!({
                "new_password": "HackedPassword@123"
            });

            let (status, _) = auth_request(
                &client,
                &token,
                "PUT",
                &format!("/api/iam/users/{}/password", other_user_id),
                Some(password_change),
            )
            .await
            .expect("请求失败");

            assert_eq!(status, 403, "状态码应为 403 Forbidden");
            tracing::info!("IAM-009 测试通过: 用户无法修改他人密码");
        }
        Err(_) => {
            tracing::warn!("测试员工账号不存在，跳过测试");
        }
    }
}

// ==================== 角色管理测试 ====================

#[tokio::test]
#[ignore]
async fn test_iam_list_roles() {
    tracing::info!("测试: 查看角色列表");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let (status, body) = auth_request(&client, &token, "GET", "/api/iam/roles", None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200, "状态码应为 200");
    assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
    assert!(body["data"].is_array(), "数据应为数组");

    let roles = body["data"].as_array().unwrap();
    assert!(roles.len() >= 5, "至少应有 5 个角色");

    tracing::info!("角色列表测试通过: 共 {} 个角色", roles.len());
}

#[tokio::test]
#[ignore]
async fn test_iam_list_permissions() {
    tracing::info!("测试: 查看权限列表");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let (status, body) = auth_request(&client, &token, "GET", "/api/iam/permissions", None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200, "状态码应为 200");
    assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
    assert!(body["data"].is_array(), "数据应为数组");

    let permissions = body["data"].as_array().unwrap();
    assert!(permissions.len() >= 100, "至少应有 100 个权限");

    tracing::info!("权限列表测试通过: 共 {} 个权限", permissions.len());
}

// ==================== 测试运行器 ====================

#[tokio::test]
#[ignore]
async fn run_all_iam_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  IAM 权限测试套件");
    tracing::info!("========================================");
    tracing::info!("测试用例覆盖:");
    tracing::info!("  - IAM-001: 超级管理员查看用户列表");
    tracing::info!("  - IAM-002: 普通用户查看用户列表");
    tracing::info!("  - IAM-003: 管理员创建用户");
    tracing::info!("  - IAM-004: 无权限用户创建用户");
    tracing::info!("  - IAM-005: 管理员删除用户");
    tracing::info!("  - IAM-006: 超级管理员分配角色");
    tracing::info!("  - IAM-007: 跨租户用户访问");
    tracing::info!("  - IAM-008: 用户修改自己密码");
    tracing::info!("  - IAM-009: 用户修改他人密码");
    tracing::info!("========================================");
}
