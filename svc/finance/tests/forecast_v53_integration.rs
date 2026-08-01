//! V53 智能预测模块 HTTP 集成测试
//!
//! 运行命令：
//! cargo test -p topems-finance --test forecast_v53_integration -- --ignored
//!
//! 覆盖端点：
//! - POST   /forecast-v53/cash-flow/predict
//! - GET    /forecast-v53/cash-flow/predictions
//! - POST   /forecast-v53/cash-flow/retrain
//! - GET    /forecast-v53/cash-flow/accuracy
//! - POST   /forecast-v53/budget/analyze
//! - GET    /forecast-v53/budget/variance
//! - GET    /forecast-v53/budget/report
//! - POST   /forecast-v53/budget/anomalies
//! - GET    /forecast-v53/budget/trends

mod common;

use common::TestContext;
use serde_json::json;

#[tokio::test]
#[ignore]
async fn test_predict_cash_flow() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_id": "entity-001",
        "period": "2026-08",
        "model": "exponential_smoothing",
        "scenario": "realistic",
        "horizon_months": 1
    });

    let (status, resp) = ctx
        .request("POST", "/forecast-v53/cash-flow/predict", Some(body))
        .await;

    assert_eq!(status, 200, "现金流预测应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_cash_flow_predictions() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/forecast-v53/cash-flow/predictions", None)
        .await;

    assert_eq!(status, 200, "获取预测列表应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_retrain_model() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "model": "exponential_smoothing"
    });

    let (status, resp) = ctx
        .request("POST", "/forecast-v53/cash-flow/retrain", Some(body))
        .await;

    assert_eq!(status, 200, "模型重训练应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_prediction_accuracy() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/forecast-v53/cash-flow/accuracy", None)
        .await;

    assert_eq!(status, 200, "获取预测准确率应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_analyze_budget() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_id": "entity-001",
        "period": "2026-Q3",
        "budget_items": [
            {
                "item_id": "item-001",
                "item_name": "人力成本",
                "budget_amount": 500000.0,
                "actual_amount": 520000.0
            },
            {
                "item_id": "item-002",
                "item_name": "办公费用",
                "budget_amount": 80000.0,
                "actual_amount": 75000.0
            },
            {
                "item_id": "item-003",
                "item_name": "市场推广",
                "budget_amount": 200000.0,
                "actual_amount": 250000.0
            }
        ]
    });

    let (status, resp) = ctx
        .request("POST", "/forecast-v53/budget/analyze", Some(body))
        .await;

    assert_eq!(status, 200, "预算分析应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_budget_variance() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/forecast-v53/budget/variance", None)
        .await;

    assert_eq!(status, 200, "获取预算差异应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_budget_report() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/forecast-v53/budget/report", None)
        .await;

    assert_eq!(status, 200, "获取预算报告应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_detect_budget_anomalies() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_id": "entity-001",
        "period": "2026-Q3"
    });

    let (status, resp) = ctx
        .request("POST", "/forecast-v53/budget/anomalies", Some(body))
        .await;

    assert_eq!(status, 200, "预算异常检测应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_budget_trends() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/forecast-v53/budget/trends", None)
        .await;

    assert_eq!(status, 200, "获取预算趋势应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}
