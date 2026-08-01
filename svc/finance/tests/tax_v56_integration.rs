//! V56 智能税务模块集成测试
//!
//! 运行命令：
//! ```bash
//! cargo test -p topems-finance --test tax_v56_integration -- --ignored
//! ```

mod common;

use common::TestContext;
use serde_json::json;

#[tokio::test]
#[ignore]
async fn test_generate_tax_form() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "form_type": "vat",
        "jurisdiction": "CN",
        "period_start": "2026-01-01T00:00:00Z",
        "period_end": "2026-01-31T23:59:59Z",
        "entity": "company-001"
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v56/tax/generate", Some(body))
        .await;

    assert_eq!(status, 200, "生成税务表单应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(
        resp["data"]["form"]["id"].is_string(),
        "data 应包含 form.id 字段"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_tax_forms() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx.request("GET", "/finance-v56/tax/forms", None).await;

    assert_eq!(status, 200, "获取税务表单列表应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_calculate_tax() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "amount": 100000.0,
        "tax_type": "vat",
        "jurisdiction": "CN",
        "period": "2026-01"
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v56/tax/calculate", Some(body))
        .await;

    assert_eq!(status, 200, "计算税金应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(
        resp["data"]["tax_amount"].is_number(),
        "data 应包含 tax_amount 字段"
    );
    assert!(resp["data"]["rate"].is_number(), "data 应包含 rate 字段");
}

#[tokio::test]
#[ignore]
async fn test_get_tax_rates() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx.request("GET", "/finance-v56/tax/rates", None).await;

    assert_eq!(status, 200, "获取税率列表应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_lookup_tax_rate() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            "/finance-v56/tax/rates/lookup?tax_type=vat&jurisdiction=CN",
            None,
        )
        .await;

    assert_eq!(status, 200, "查询税率应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"]["rate"].is_number(), "data 应包含 rate 字段");
}

#[tokio::test]
#[ignore]
async fn test_create_tax_plan() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity": "company-001",
        "period": "2026-Q1",
        "strategy": "deduction_maximization"
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v56/tax/plan", Some(body))
        .await;

    assert_eq!(status, 200, "创建税务筹划方案应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"]["id"].is_string(), "data 应包含 id 字段");
}

#[tokio::test]
#[ignore]
async fn test_analyze_scenario() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity": "company-001",
        "period": "2026-Q1",
        "income": 500000.0,
        "deductions": 100000.0,
        "strategy": "legal_optimization"
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v56/tax/scenario", Some(body))
        .await;

    assert_eq!(status, 200, "税务场景分析应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(
        resp["data"]["projected_tax"].is_number(),
        "data 应包含 projected_tax 字段"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_tax_compliance() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v56/tax/compliance", None)
        .await;

    assert_eq!(status, 200, "获取税务合规状态应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(
        resp["data"]["compliant"].is_boolean(),
        "data 应包含 compliant 字段"
    );
}
