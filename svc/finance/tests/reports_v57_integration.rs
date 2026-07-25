//! V57 智能报表模块 HTTP 集成测试
//!
//! 运行命令：
//! cargo test -p topems-finance --test reports_v57_integration -- --ignored

mod common;

use common::TestContext;
use serde_json::json;

#[tokio::test]
#[ignore]
async fn test_generate_report() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "report_type": "balance_sheet",
        "period_start": "2026-01-01T00:00:00Z",
        "period_end": "2026-06-30T23:59:59Z",
        "format": "json"
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v57/report/generate", Some(body))
        .await;

    assert_eq!(status, 200, "生成报表应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_list_reports() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v57/reports", None)
        .await;

    assert_eq!(status, 200, "列出报表应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_create_template() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "月度资产负债表模板",
        "report_type": "balance_sheet",
        "layout": "json",
        "parameters": {
            "include_subtotals": true,
            "currency": "CNY"
        },
        "schedule": "monthly"
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v57/report/template", Some(body))
        .await;

    assert_eq!(status, 200, "创建模板应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_list_templates() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v57/report/templates", None)
        .await;

    assert_eq!(status, 200, "列出模板应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_analyze() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "dimensions": ["department", "time"],
        "measures": ["revenue", "cost"],
        "filters": {
            "period": "2026-Q1"
        }
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v57/analysis", Some(body))
        .await;

    assert_eq!(status, 200, "多维分析应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_generate_forecast() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "target_metric": "revenue",
        "model_type": "linear_regression",
        "periods": 12,
        "features": ["marketing_spend", "economic_growth"]
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v57/forecast", Some(body))
        .await;

    assert_eq!(status, 200, "生成预测应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}
