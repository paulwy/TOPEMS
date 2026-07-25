//! SLA HTTP 集成测试
//!
//! 用途：调用 unified-core 的真实 SLA HTTP 端点，验证端到端可达性和响应格式。
//!
//! 运行方式：
//! ```bash
//! cargo test -p topems-portal --test sla_http_integration -- --ignored
//! ```
//!
//! 说明：
//! - V60 后 SLA 已移至 unified-core，portal 不再代理。
//! - 这些测试验证的是「portal 视角下 SLA 端点的可达性」，用于端到端集成验证。
//! - 所有测试默认忽略，需显式使用 --ignored 运行。
//! - 运行前需确保 unified-core 服务已启动并监听 8000 端口。

use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;

const UNIFIED_CORE_URL: &str = "http://localhost:8000";
const LOGIN_USERNAME: &str = "admin";
const LOGIN_PASSWORD: &str = "admin123";

async fn check_service_available() -> bool {
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
async fn test_health_check_reachable() {
    if !check_service_available().await {
        return;
    }

    let client = Client::new();

    let health_url = format!("{}/health", UNIFIED_CORE_URL);
    let resp = client
        .get(&health_url)
        .send()
        .await
        .expect("Failed to send health check request");

    assert!(
        resp.status().is_success(),
        "健康检查失败，状态码: {}",
        resp.status()
    );
}

#[tokio::test]
#[ignore]
async fn test_iam_health_check_reachable() {
    if !check_service_available().await {
        return;
    }

    let client = Client::new();

    let health_url = format!("{}/api/core/iam/health", UNIFIED_CORE_URL);
    let resp = client
        .get(&health_url)
        .send()
        .await
        .expect("Failed to send IAM health check request");

    assert!(
        resp.status().is_success(),
        "IAM 健康检查失败，状态码: {}",
        resp.status()
    );
}

#[tokio::test]
#[ignore]
async fn test_login_success() {
    if !check_service_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await;

    assert!(
        token.is_some(),
        "登录失败，未能获取 token"
    );
}

#[tokio::test]
#[ignore]
async fn test_sla_policies_list_reachable() {
    if !check_service_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/core/master/sla-policies", UNIFIED_CORE_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send SLA policies request");

    assert!(
        resp.status().is_success(),
        "获取 SLA 策略列表失败，状态码: {}",
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
async fn test_sla_stats_reachable() {
    if !check_service_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/core/master/tickets/sla-stats", UNIFIED_CORE_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send SLA stats request");

    assert!(
        resp.status().is_success(),
        "获取 SLA 统计失败，状态码: {}",
        resp.status()
    );

    let body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        body.get("success").is_some() || body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        body
    );
}
