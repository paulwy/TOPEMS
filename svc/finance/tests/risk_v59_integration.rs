//! V59 智能风控升级模块 HTTP 集成测试
//!
//! 运行命令：
//! cargo test -p topems-finance --test risk_v59_integration -- --ignored

mod common;

use common::TestContext;
use serde_json::json;

// ==================== Fraud 反欺诈测试 ====================

#[tokio::test]
#[ignore]
async fn test_fraud_analyze_transaction() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "transaction_id": "TXN_TEST_001",
        "amount": 50000.0,
        "device_id": "device_test_001",
        "location": "Shanghai",
        "metadata": {
            "payment_method": "credit_card",
            "merchant_id": "MCH_001"
        }
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v59/fraud/analyze", Some(body))
        .await;

    assert_eq!(status, 200, "欺诈分析应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_fraud_get_signals() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v59/fraud/signals", None)
        .await;

    assert_eq!(status, 200, "获取欺诈信号应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_fraud_create_device() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "device_id": "device_test_002",
        "fingerprint": "fp_abc123xyz789",
        "trust_score": 0.85,
        "ip_history": [
            {"ip": "192.168.1.100", "timestamp": "2026-07-01T10:00:00Z"},
            {"ip": "192.168.1.101", "timestamp": "2026-07-15T14:30:00Z"}
        ]
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v59/fraud/device", Some(body))
        .await;

    assert_eq!(status, 200, "创建设备画像应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

// ==================== Credit 信用评分测试 ====================

#[tokio::test]
#[ignore]
async fn test_credit_calculate_score() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_id": "entity_credit_001",
        "features": {
            "payment_history": 0.9,
            "debt_ratio": 0.25,
            "income_stability": 0.8,
            "history_length": 0.6
        }
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v59/credit/score", Some(body))
        .await;

    assert_eq!(status, 200, "计算信用评分应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_credit_get_models() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v59/credit/models", None)
        .await;

    assert_eq!(status, 200, "获取评分模型应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_credit_create_model() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "中小企业信用评分模型",
        "version": "1.0.0",
        "features": ["payment_history", "debt_ratio", "income_stability", "history_length"],
        "weights": {
            "payment_history": 0.30,
            "debt_ratio": 0.35,
            "income_stability": 0.20,
            "history_length": 0.15
        },
        "accuracy": 0.85
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v59/credit/model", Some(body))
        .await;

    assert_eq!(status, 200, "创建评分模型应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}
