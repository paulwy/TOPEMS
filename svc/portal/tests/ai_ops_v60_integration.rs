//! AI Ops V60 HTTP 集成测试
//!
//! 用途：调用 portal 服务的 V60 AI 运维 HTTP 端点，验证端到端可达性和响应格式。
//!
//! 运行方式：
//! ```bash
//! cargo test -p topems-portal --test ai_ops_v60_integration -- --ignored
//! ```
//!
//! 说明：
//! - 测试 V60 AI 运维模块（智能查询路由 + 自动缓存 + 自愈机制）的 REST 端点。
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
async fn test_get_routing_rules_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/aiops-v60/routing/rules", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send routing rules request");

    assert!(
        resp.status().is_success(),
        "获取路由规则列表失败，状态码: {}",
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
async fn test_create_routing_rule_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/aiops-v60/routing/rule", PORTAL_URL);
    let body = json!({
        "name": "test-rule",
        "condition": {"query_hash": "abc123"},
        "target_service": "ai-service",
        "priority": 10,
        "weight": 80
    });

    let resp = client
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .expect("Failed to send create routing rule request");

    assert!(
        resp.status().is_success(),
        "创建路由规则失败，状态码: {}",
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
async fn test_get_cache_policies_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/aiops-v60/cache/policies", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send cache policies request");

    assert!(
        resp.status().is_success(),
        "获取缓存策略列表失败，状态码: {}",
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
async fn test_create_cache_policy_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/aiops-v60/cache/policy", PORTAL_URL);
    let body = json!({
        "name": "test-policy",
        "scope": "query",
        "ttl_ms": 3600000,
        "invalidation_strategy": "time_based",
        "max_size": 10000
    });

    let resp = client
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .expect("Failed to send create cache policy request");

    assert!(
        resp.status().is_success(),
        "创建缓存策略失败，状态码: {}",
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
async fn test_get_cache_stats_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/aiops-v60/cache/stats", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send cache stats request");

    assert!(
        resp.status().is_success(),
        "获取缓存统计失败，状态码: {}",
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
async fn test_get_health_checks_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/aiops-v60/health/checks", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send health checks request");

    assert!(
        resp.status().is_success(),
        "获取健康检查列表失败，状态码: {}",
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
async fn test_get_health_summary_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/aiops-v60/health/summary", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send health summary request");

    assert!(
        resp.status().is_success(),
        "获取健康汇总失败，状态码: {}",
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
async fn test_get_route_stats_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/aiops-v60/routing/stats", PORTAL_URL);
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to send route stats request");

    assert!(
        resp.status().is_success(),
        "获取路由统计失败，状态码: {}",
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
async fn test_simulate_routing_reachable() {
    if !check_portal_available().await {
        return;
    }
    if !check_core_available().await {
        return;
    }

    let client = Client::new();
    let token = login_and_get_token(&client).await.expect("登录失败");

    let url = format!("{}/api/portal/aiops-v60/routing/simulate", PORTAL_URL);
    let body = json!({
        "query_hash": "test_hash_123",
        "operation_name": "TestQuery"
    });

    let resp = client
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .expect("Failed to send simulate routing request");

    assert!(
        resp.status().is_success(),
        "模拟路由失败，状态码: {}",
        resp.status()
    );

    let resp_body: Value = resp.json().await.expect("Failed to parse response JSON");
    assert!(
        resp_body.get("success").is_some() || resp_body.get("code").is_some(),
        "响应缺少 success 或 code 字段，响应体: {}",
        resp_body
    );
}
