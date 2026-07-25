//! V55 Commercial 模块 HTTP 集成测试
//!
//! 覆盖 API 商业化、计量计费、SLA 保障主要端点。
//! 所有测试默认 #[ignore]，需要服务启动时手动执行。
//!
//! 运行命令:
//! cargo test -p topems-master-data --test commercial_v55_integration -- --ignored

mod common;

use common::TestContext;
use serde_json::json;

const BASE_PATH: &str = "/api/master-data/api/master/mdm-v55";

/// 1. 创建 API 产品
#[tokio::test]
#[ignore]
async fn test_create_api_product() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "集成测试-专业版",
        "tier": "professional",
        "rate_limit_per_min": 1000,
        "rate_limit_per_day": 500000,
        "features": ["basic_access", "priority_support", "advanced_analytics"],
        "price_monthly": 999.0
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/products", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["name"], "集成测试-专业版");
}

/// 2. 获取 API 产品列表
#[tokio::test]
#[ignore]
async fn test_list_api_products() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/products", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 3. 租户订阅
#[tokio::test]
#[ignore]
async fn test_subscribe_tenant() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (_, products_resp) = ctx
        .request("GET", &format!("{}/products", BASE_PATH), None)
        .await
        .expect("获取产品列表失败");
    let product_id = products_resp["data"][0]["id"].as_str().unwrap_or("");

    let body = json!({
        "api_product_id": product_id,
        "tenant_id": "tenant-integration-test",
        "tier": "basic"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/subscribe", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["tenant_id"], "tenant-integration-test");
}

/// 4. 获取订阅列表
#[tokio::test]
#[ignore]
async fn test_list_subscriptions() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/subscriptions?tenant_id=tenant-001", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 5. 记录使用量
#[tokio::test]
#[ignore]
async fn test_record_usage() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (_, products_resp) = ctx
        .request("GET", &format!("{}/products", BASE_PATH), None)
        .await
        .expect("获取产品列表失败");
    let product_id = products_resp["data"][0]["id"].as_str().unwrap_or("");

    let body = json!({
        "tenant_id": "tenant-integration-test",
        "api_product_id": product_id,
        "endpoint": "/api/master/metadata",
        "requests": 100,
        "errors": 2,
        "data_transferred": 5.5
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/usage/record", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["requests"], 100);
}

/// 6. 获取使用量汇总
#[tokio::test]
#[ignore]
async fn test_get_usage_summary() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!("{}/usage/summary?tenant_id=tenant-integration-test", BASE_PATH),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["total_requests"].is_number());
}

/// 7. 生成账单
#[tokio::test]
#[ignore]
async fn test_generate_bill() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "tenant_id": "tenant-integration-test",
        "period_start": "2024-01-01T00:00:00Z",
        "period_end": "2024-01-31T23:59:59Z"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/bill/generate", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["total_amount"].is_number());
}

/// 8. 创建费率卡
#[tokio::test]
#[ignore]
async fn test_create_rate_card() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "tier": "enterprise",
        "cost_per_request": 0.0005,
        "cost_per_mb": 0.02,
        "overage_multiplier": 1.2,
        "currency": "CNY"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/rate-cards", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["cost_per_request"], 0.0005);
}

/// 9. 配置 SLA
#[tokio::test]
#[ignore]
async fn test_configure_sla() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "metric": "availability",
        "target_value": 99.9,
        "unit": "%",
        "penalty_per_min": 10.0,
        "measurement_window": 60
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/sla/configure", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["target_value"], 99.9);
}

/// 10. 获取 SLA 状态
#[tokio::test]
#[ignore]
async fn test_get_sla_status() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/sla/status", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["sla_statuses"].is_array());
}
