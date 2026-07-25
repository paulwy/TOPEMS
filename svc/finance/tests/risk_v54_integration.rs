//! V54 实时风控模块集成测试
//!
//! 运行命令：
//! ```bash
//! cargo test -p topems-finance --test risk_v54_integration -- --ignored
//! ```

mod common;

use common::TestContext;
use serde_json::json;

#[tokio::test]
#[ignore]
async fn test_get_risk_dashboard() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v54/risk/dashboard", None)
        .await;

    assert_eq!(status, 200, "获取风险仪表盘应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"]["total_indicators"].is_number(), "data 应包含 total_indicators");
}

#[tokio::test]
#[ignore]
async fn test_get_risk_alerts() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v54/risk/alerts", None)
        .await;

    assert_eq!(status, 200, "获取风险告警列表应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_score_transaction() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "transaction": {
            "id": "tx-001",
            "account_id": "acc-001",
            "amount": 1500.0,
            "currency": "CNY",
            "merchant": "Test Merchant",
            "location": "Beijing",
            "device_id": "dev-001",
            "timestamp": "2026-01-15T10:30:00Z"
        }
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v54/fraud/score", Some(body))
        .await;

    assert_eq!(status, 200, "交易反欺诈评分应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"]["score"].is_number(), "data 应包含 score 字段");
    assert!(resp["data"]["risk_level"].is_string(), "data 应包含 risk_level 字段");
}

#[tokio::test]
#[ignore]
async fn test_get_fraud_rules() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v54/fraud/rules", None)
        .await;

    assert_eq!(status, 200, "获取反欺诈规则列表应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_compliance_review() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_type": "transaction",
        "entity_id": "tx-001"
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v54/compliance/review", Some(body))
        .await;

    assert_eq!(status, 200, "合规审查应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"].is_array(), "data 应该是审查结果数组");
}

#[tokio::test]
#[ignore]
async fn test_get_compliance_results() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v54/compliance/results", None)
        .await;

    assert_eq!(status, 200, "获取合规审查结果应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_create_compliance_workflow() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_type": "vendor",
        "entity_id": "vendor-001",
        "assigned_to": "admin",
        "steps": ["document_review", "financial_audit", "final_approval"]
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v54/compliance/workflow", Some(body))
        .await;

    assert_eq!(status, 200, "创建合规工作流应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"]["id"].is_string(), "data 应包含 id 字段");
}
