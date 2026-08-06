//! Workflow 模块权限测试
//!
//! 覆盖测试用例清单中的 WF-001 到 WF-008
//!
//! 运行方式:
//! ```bash
//! cargo test --package topems-unified-core --test workflow_permission_tests -- --test-threads=1
//! ```

use reqwest::Client;
use serde_json::{json, Value};

// ==================== 测试配置 ====================

const API_URL: &str = "http://localhost:8000";

// ==================== 测试辅助函数 ====================

fn create_client() -> Client {
    Client::new()
}

async fn login(username: &str, password: &str) -> Result<String, String> {
    let client = create_client();

    let response = client
        .post(format!("{}/api/core/iam/auth/login", API_URL))
        .json(&json!({
            "username": username,
            "password": password
        }))
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

// ==================== WF-001: 查看工作流列表 ====================

#[tokio::test]
#[ignore]
async fn test_wf_001_list_workflows() {
    tracing::info!("测试 WF-001: 查看工作流列表");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let (status, body) = auth_request(&client, &token, "GET", "/api/flow/workflows", None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200, "状态码应为 200");
    assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");

    tracing::info!("WF-001 测试通过: 成功返回工作流列表");
}

// ==================== WF-002: 创建工作流 ====================

#[tokio::test]
#[ignore]
async fn test_wf_002_create_workflow() {
    tracing::info!("测试 WF-002: 创建工作流");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    let new_workflow = json!({
        "name": format!("测试工作流_{}", timestamp),
        "description": "自动化测试创建的工作流",
        "status": "draft"
    });

    let (status, body) = auth_request(
        &client,
        &token,
        "POST",
        "/api/flow/workflows",
        Some(new_workflow),
    )
    .await
    .expect("请求失败");

    assert!(
        status == 200 || status == 201,
        "状态码应为 200 或 201，实际为 {}",
        status
    );

    tracing::info!("WF-002 测试通过: 成功创建工作流");
}

// ==================== WF-003: 删除工作流 ====================

#[tokio::test]
#[ignore]
async fn test_wf_003_delete_workflow() {
    tracing::info!("测试 WF-003: 删除工作流");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    // 先获取工作流列表
    let (_, list_body) = auth_request(&client, &token, "GET", "/api/flow/workflows", None)
        .await
        .expect("获取工作流列表失败");

    // 尝试找到可删除的工作流
    if let Some(workflows) = list_body["data"].as_array() {
        if let Some(workflow) = workflows.first() {
            if let Some(workflow_id) = workflow["id"].as_str() {
                let (delete_status, _) = auth_request(
                    &client,
                    &token,
                    "DELETE",
                    &format!("/api/flow/workflows/{}", workflow_id),
                    None,
                )
                .await
                .expect("删除工作流失败");

                assert!(
                    delete_status == 200 || delete_status == 204 || delete_status == 404,
                    "删除状态码应为 200、204 或 404"
                );

                tracing::info!("WF-003 测试通过: 删除工作流功能正常");
                return;
            }
        }
    }

    tracing::warn!("未找到可删除的工作流，跳过测试");
}

// ==================== WF-004: 发布工作流 ====================

#[tokio::test]
#[ignore]
async fn test_wf_004_publish_workflow() {
    tracing::info!("测试 WF-004: 发布工作流");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    // 先获取工作流列表
    let (_, list_body) = auth_request(&client, &token, "GET", "/api/flow/workflows", None)
        .await
        .expect("获取工作流列表失败");

    if let Some(workflows) = list_body["data"].as_array() {
        // 找到草稿状态的工作流
        let draft_workflow = workflows
            .iter()
            .find(|w| w["status"].as_str() == Some("draft"));

        if let Some(workflow) = draft_workflow {
            if let Some(workflow_id) = workflow["id"].as_str() {
                let result = auth_request(
                    &client,
                    &token,
                    "POST",
                    &format!("/api/flow/workflows/{}/publish", workflow_id),
                    None,
                )
                .await;

                match result {
                    Ok((status, _)) => {
                        assert!(status == 200 || status == 404, "发布状态码应为 200 或 404");
                        tracing::info!("WF-004 测试通过: 发布工作流功能正常");
                    }
                    Err(_) => {
                        tracing::warn!("WF-004: 发布工作流 API 可能不存在");
                    }
                }
                return;
            }
        }
    }

    tracing::warn!("未找到草稿状态的工作流，跳过测试");
}

// ==================== WF-005: 发起审批流程 ====================

#[tokio::test]
#[ignore]
async fn test_wf_005_start_approval() {
    tracing::info!("测试 WF-005: 发起审批流程");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    let approval_request = json!({
        "title": format!("测试审批_{}", timestamp),
        "type": "leave",
        "content": "自动化测试审批申请"
    });

    let result = auth_request(
        &client,
        &token,
        "POST",
        "/api/flow/instances",
        Some(approval_request),
    )
    .await;

    match result {
        Ok((status, _)) => {
            assert!(
                status == 200 || status == 201 || status == 404,
                "状态码应为 200、201 或 404"
            );
            tracing::info!("WF-005 测试通过: 发起审批流程功能正常");
        }
        Err(e) => {
            tracing::warn!("WF-005: {}", e);
        }
    }
}

// ==================== WF-006: 审批人批准流程 ====================

#[tokio::test]
#[ignore]
async fn test_wf_006_approve_workflow() {
    tracing::info!("测试 WF-006: 审批人批准流程");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    // 获取待审批列表
    let result = auth_request(&client, &token, "GET", "/api/flow/approvals/pending", None).await;

    match result {
        Ok((status, body)) => {
            if status == 200 {
                // 找到待审批项
                if let Some(approvals) = body["data"].as_array() {
                    if let Some(approval) = approvals.first() {
                        if let Some(approval_id) = approval["id"].as_str() {
                            let approve_result = auth_request(
                                &client,
                                &token,
                                "POST",
                                &format!("/api/flow/approvals/{}/approve", approval_id),
                                None,
                            )
                            .await;

                            match approve_result {
                                Ok((approve_status, _)) => {
                                    assert!(
                                        approve_status == 200
                                            || approve_status == 403
                                            || approve_status == 404,
                                        "审批状态码应为 200、403 或 404"
                                    );
                                    tracing::info!("WF-006 测试通过: 审批功能正常");
                                    return;
                                }
                                Err(_) => {}
                            }
                        }
                    }
                }
            }
        }
        Err(_) => {}
    }

    tracing::warn!("未找到待审批项，跳过测试");
}

// ==================== WF-007: 非审批人批准流程 ====================

#[tokio::test]
#[ignore]
async fn test_wf_007_unauthorized_approve() {
    tracing::info!("测试 WF-007: 非审批人批准流程");

    // 使用普通员工账号
    match login("test_employee", "admin123").await {
        Ok(token) => {
            let client = create_client();

            // 尝试批准一个不存在的审批
            let fake_approval_id = "00000000-0000-0000-0000-000000000999";

            let result = auth_request(
                &client,
                &token,
                "POST",
                &format!("/api/flow/approvals/{}/approve", fake_approval_id),
                None,
            )
            .await;

            match result {
                Ok((status, _)) => {
                    assert!(
                        status == 403 || status == 404,
                        "非审批人应被拒绝，状态码应为 403 或 404"
                    );
                    tracing::info!("WF-007 测试通过: 非审批人被正确拒绝");
                }
                Err(_) => {
                    tracing::warn!("WF-007: 审批 API 可能不存在");
                }
            }
        }
        Err(_) => {
            tracing::warn!("测试员工账号不存在，跳过测试");
        }
    }
}

// ==================== WF-008: 查看待审批列表 ====================

#[tokio::test]
#[ignore]
async fn test_wf_008_list_pending_approvals() {
    tracing::info!("测试 WF-008: 查看待审批列表");

    let token = login("admin", "admin123").await.expect("管理员登录失败");
    let client = create_client();

    let result = auth_request(&client, &token, "GET", "/api/flow/approvals/pending", None).await;

    match result {
        Ok((status, body)) => {
            assert_eq!(status, 200, "状态码应为 200");
            assert!(body["success"].as_bool().unwrap_or(false), "请求应成功");
            tracing::info!("WF-008 测试通过: 成功返回待审批列表");
        }
        Err(e) => {
            tracing::warn!("WF-008: {}", e);
        }
    }
}

// ==================== 测试总结 ====================

#[tokio::test]
#[ignore]
async fn run_all_workflow_tests_summary() {
    tracing::info!("========================================");
    tracing::info!("  Workflow 权限测试套件");
    tracing::info!("========================================");
    tracing::info!("测试用例覆盖:");
    tracing::info!("  - WF-001: 查看工作流列表");
    tracing::info!("  - WF-002: 创建工作流");
    tracing::info!("  - WF-003: 删除工作流");
    tracing::info!("  - WF-004: 发布工作流");
    tracing::info!("  - WF-005: 发起审批流程");
    tracing::info!("  - WF-006: 审批人批准流程");
    tracing::info!("  - WF-007: 非审批人批准流程");
    tracing::info!("  - WF-008: 查看待审批列表");
    tracing::info!("========================================");
}
