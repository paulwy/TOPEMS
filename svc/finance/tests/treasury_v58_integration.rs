//! V58 智能司库模块 HTTP 集成测试
//!
//! 运行命令：
//! cargo test -p topems-finance --test treasury_v58_integration -- --ignored

mod common;

use common::TestContext;
use serde_json::json;

#[tokio::test]
#[ignore]
async fn test_create_pool() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "主资金池",
        "pool_type": "physical",
        "currency": "CNY",
        "entities": ["entity_001", "entity_002"]
    });

    let (status, resp) = ctx.request("POST", "/finance-v58/pool", Some(body)).await;

    assert_eq!(status, 200, "创建现金池应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_list_pools() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx.request("GET", "/finance-v58/pools", None).await;

    assert_eq!(status, 200, "列出现金池应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_allocate_funds() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "分配测试资金池",
        "pool_type": "virtual",
        "currency": "CNY"
    });

    let (create_status, create_resp) = ctx
        .request("POST", "/finance-v58/pool", Some(create_body))
        .await;

    assert_eq!(create_status, 200, "创建资金池应该返回 200");
    let pool_id = create_resp["data"]["id"]
        .as_str()
        .expect("创建的资金池应该有 id");

    let allocate_body = json!({
        "pool_id": pool_id,
        "allocations": [
            {
                "entity_id": "entity_001",
                "amount": 500000.0,
                "percentage": 0.5
            },
            {
                "entity_id": "entity_002",
                "amount": 500000.0,
                "percentage": 0.5
            }
        ]
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v58/pool/allocate", Some(allocate_body))
        .await;

    assert_eq!(status, 200, "资金分配应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_create_forecast_scenario() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "Q3 现金流预测场景",
        "scenario_type": "medium_term",
        "horizon_days": 90,
        "assumptions": {
            "growth_rate": 0.05,
            "inflation_rate": 0.02
        }
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v58/forecast/scenario", Some(body))
        .await;

    assert_eq!(status, 200, "创建预测场景应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_list_forecast_scenarios() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v58/forecast/scenarios", None)
        .await;

    assert_eq!(status, 200, "列出预测场景应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_get_liquidity_snapshot() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v58/liquidity/snapshot", None)
        .await;

    assert_eq!(status, 200, "获取流动性快照应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}
