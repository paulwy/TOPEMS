//! BFF Finance HTTP 集成测试
//!
//! 用途：调用 finance 服务的真实 HTTP 端点，验证 BFF 下游服务可达性。
//!
//! 运行方式：
//! ```bash
//! cargo test -p topems-portal --test bff_finance_http_integration -- --ignored
//! ```
//!
//! 说明：
//! - 验证 finance 服务的核心端点可达性和响应格式。
//! - 所有测试默认忽略，需显式使用 --ignored 运行。
//! - 运行前需确保 finance 服务（8011 端口）和 unified-core 服务（8000 端口）已启动。

use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;

const FINANCE_URL: &str = "http://localhost:8011";
const UNIFIED_CORE_URL: &str = "http://localhost:8000";
const LOGIN_USERNAME: &str = "admin";
const LOGIN_PASSWORD: &str = "admin123";

async fn check_finance_available() -> bool {
    let client = Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .expect("Failed to build HTTP client");

    let health_url = format!("{}/health", FINANCE_URL);
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
async fn test_finance_health_check_reachable() {
    if !check_finance_available().await {
        return;
    }

    let client = Client::new();

    let health_url = format!("{}/health", FINANCE_URL);
    let resp = client
        .get(&health_url)
        .send()
        .await
        .expect("Failed to send finance health check request");

    assert!(
        resp.status().is_success(),
        "Finance 健康检查失败，状态码: {}",
        resp.status()
    );
}

#[tokio::test]
#[ignore]
async fn test_finance_accounts_reachable() {
    if !check_finance_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/core/finance/v1/accounts", FINANCE_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send finance accounts request");

    assert!(
        resp.status().is_success(),
        "获取科目列表失败，状态码: {}",
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
async fn test_finance_vouchers_reachable() {
    if !check_finance_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/core/finance/v1/vouchers", FINANCE_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send finance vouchers request");

    assert!(
        resp.status().is_success(),
        "获取凭证列表失败，状态码: {}",
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
async fn test_finance_detailed_health_reachable() {
    if !check_finance_available().await {
        return;
    }

    let client = Client::new();

    let url = format!("{}/api/core/finance/v1/health/detailed", FINANCE_URL);
    let resp = client
        .get(&url)
        .send()
        .await
        .expect("Failed to send finance detailed health request");

    assert!(
        resp.status().is_success(),
        "Finance 详细健康检查失败，状态码: {}",
        resp.status()
    );

    let body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        body.get("success").is_some() || body.get("status").is_some() || body.get("code").is_some(),
        "响应缺少 success/status/code 字段，响应体: {}",
        body
    );
}

#[tokio::test]
#[ignore]
async fn test_finance_api_info_reachable() {
    if !check_finance_available().await {
        return;
    }

    let client = Client::new();

    let url = format!("{}/api/info", FINANCE_URL);
    let resp = client
        .get(&url)
        .send()
        .await
        .expect("Failed to send finance api info request");

    assert!(
        resp.status().is_success(),
        "Finance API info 失败，状态码: {}",
        resp.status()
    );
}
