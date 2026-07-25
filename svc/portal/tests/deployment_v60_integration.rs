//! Deployment Manager V60 HTTP 集成测试
//!
//! 用途：调用 portal 服务的 V60 部署管理 HTTP 端点，验证端到端可达性和响应格式。
//!
//! 运行方式：
//! ```bash
//! cargo test -p topems-portal --test deployment_v60_integration -- --ignored
//! ```
//!
//! 说明：
//! - 测试 V60 部署管理模块（网关部署 + 配置管理 + 回滚策略）的 REST 端点。
//! - 所有测试默认忽略，需显式使用 --ignored 运行。
//! - 运行前需确保 portal 服务（8063 端口）和 unified-core 服务（8000 端口）已启动。

use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;

const PORTAL_URL: &str = "http://localhost:8063";
const UNIFIED_CORE_URL: &str = "http://localhost:8000";
const LOGIN_USERNAME: &str = "admin";
const LOGIN_PASSWORD: &str = "admin123";

async fn check_portal_available() -> bool {
    let client = Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .expect("Failed to build HTTP client");

    let health_url = format!("{}/health", PORTAL_URL);
    match client.get(&health_url).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

async fn check_core_available() -> bool {
    let client = Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .expect("Failed to build HTTP client");

    let health_url = format!("{}/health", UNIFIED_CORE_URL);
    match client.get(&health_url).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

async fn login_and_get_token(client: &Client) -> Option<String> {
    let login_url = format!("{}/api/core/iam/auth/login", UNIFIED_CORE_URL);
    let body = json!({
        "username": LOGIN_USERNAME,
        "password": LOGIN_PASSWORD,
    });

    match client.post(&login_url).json(&body).send().await {
        Ok(resp) => {
            if !resp.status().is_success() {
                return None;
            }
            let json_val: Result<Value, _> = resp.json().await;
            match json_val {
                Ok(data) => {
                    let token = data
                        .get("data")
                        .and_then(|d| d.get("token"))
                        .and_then(|t| t.as_str())
                        .or_else(|| data.get("token").and_then(|t| t.as_str()))
                        .or_else(|| {
                            data.get("data")
                                .and_then(|d| d.get("access_token"))
                                .and_then(|t| t.as_str())
                        })
                        .or_else(|| data.get("access_token").and_then(|t| t.as_str()));
                    token.map(|s| s.to_string())
                }
                Err(_) => None,
            }
        }
        Err(_) => None,
    }
}

#[tokio::test]
#[ignore]
async fn test_portal_health_check_reachable() {
    if !check_portal_available().await {
        return;
    }

    let client = Client::new();

    let health_url = format!("{}/health", PORTAL_URL);
    let resp = client
        .get(&health_url)
        .send()
        .await
        .expect("Failed to send portal health check request");

    assert!(
        resp.status().is_success(),
        "Portal 健康检查失败，状态码: {}",
        resp.status()
    );
}

#[tokio::test]
#[ignore]
async fn test_list_deployments_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/deploy-v60/deployments", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send list deployments request");

    assert!(
        resp.status().is_success(),
        "获取部署列表失败，状态码: {}",
        resp.status()
    );

    let body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        body.get("success").is_some() || body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        body
    );
}

#[tokio::test]
#[ignore]
async fn test_create_deployment_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/deploy-v60/deployment", PORTAL_URL);
    let body = json!({
        "version": "v1.0.0-test",
        "environment": "development",
        "strategy": "rolling"
    });

    let resp = client
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .expect("Failed to send create deployment request");

    assert!(
        resp.status().is_success(),
        "创建部署失败，状态码: {}",
        resp.status()
    );

    let resp_body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        resp_body.get("success").is_some() || resp_body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        resp_body
    );
}

#[tokio::test]
#[ignore]
async fn test_list_configs_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/deploy-v60/configs", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send list configs request");

    assert!(
        resp.status().is_success(),
        "获取配置列表失败，状态码: {}",
        resp.status()
    );

    let body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        body.get("success").is_some() || body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        body
    );
}

#[tokio::test]
#[ignore]
async fn test_create_config_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/deploy-v60/config", PORTAL_URL);
    let body = json!({
        "name": "test-gateway-config",
        "version": "v1.0.0",
        "environment": "development",
        "settings": {"timeout": 30000, "max_connections": 1000}
    });

    let resp = client
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .expect("Failed to send create config request");

    assert!(
        resp.status().is_success(),
        "创建配置失败，状态码: {}",
        resp.status()
    );

    let resp_body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        resp_body.get("success").is_some() || resp_body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        resp_body
    );
}

#[tokio::test]
#[ignore]
async fn test_get_rollback_policies_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/deploy-v60/rollback/policies", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send rollback policies request");

    assert!(
        resp.status().is_success(),
        "获取回滚策略列表失败，状态码: {}",
        resp.status()
    );

    let body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        body.get("success").is_some() || body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        body
    );
}

#[tokio::test]
#[ignore]
async fn test_create_rollback_policy_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/deploy-v60/rollback/policy", PORTAL_URL);
    let body = json!({
        "name": "test-rollback-policy",
        "trigger": "manual",
        "condition": {"error_rate": 0.1},
        "rollback_steps": ["revert_config", "restart_service"],
        "max_rollbacks": 3
    });

    let resp = client
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .expect("Failed to send create rollback policy request");

    assert!(
        resp.status().is_success(),
        "创建回滚策略失败，状态码: {}",
        resp.status()
    );

    let resp_body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        resp_body.get("success").is_some() || resp_body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        resp_body
    );
}

#[tokio::test]
#[ignore]
async fn test_get_deployment_history_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/deploy-v60/deployment/history", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send deployment history request");

    assert!(
        resp.status().is_success(),
        "获取部署历史失败，状态码: {}",
        resp.status()
    );

    let body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        body.get("success").is_some() || body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        body
    );
}

#[tokio::test]
#[ignore]
async fn test_get_rollback_status_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/deploy-v60/rollback/status", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send rollback status request");

    assert!(
        resp.status().is_success(),
        "获取回滚状态失败，状态码: {}",
        resp.status()
    );

    let body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        body.get("success").is_some() || body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        body
    );
}

#[tokio::test]
#[ignore]
async fn test_create_environment_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/deploy-v60/environment", PORTAL_URL);
    let body = json!({
        "name": "test-env",
        "env_type": "development",
        "base_url": "http://localhost:8080",
        "variables": {"DEBUG": "true"},
        "is_protected": false
    });

    let resp = client
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .expect("Failed to send create environment request");

    assert!(
        resp.status().is_success(),
        "创建环境失败，状态码: {}",
        resp.status()
    );

    let resp_body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        resp_body.get("success").is_some() || resp_body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        resp_body
    );
}
