//! V55 智能结算自动化模块集成测试
//!
//! 运行命令：
//! ```bash
//! cargo test -p topems-finance --test settlement_v55_integration -- --ignored
//! ```

mod common;

use common::TestContext;
use serde_json::json;

#[tokio::test]
#[ignore]
async fn test_reconcile_single() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "bank_transaction": {
            "id": "bank-tx-001",
            "date": "2026-01-15T10:30:00Z",
            "description": "Payment for invoice #INV-001",
            "amount": 1500.0,
            "currency": "CNY",
            "reference": "INV-001",
            "counterparty": "Acme Corp"
        },
        "system_record": {
            "id": "sys-rec-001",
            "date": "2026-01-15T10:00:00Z",
            "record_type": "invoice",
            "amount": 1500.0,
            "currency": "CNY",
            "reference": "INV-001",
            "counterparty": "Acme Corp"
        }
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v55/reconcile/single", Some(body))
        .await;

    assert_eq!(status, 200, "单笔对账应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(
        resp["data"]["match_status"].is_string(),
        "data 应包含 match_status 字段"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_reconcile_results() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v55/reconcile/results", None)
        .await;

    assert_eq!(status, 200, "获取对账结果列表应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_create_reconcile_rule() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "精确金额匹配规则",
        "match_type": "exact",
        "tolerance": 0.01,
        "enabled": true
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v55/reconcile/rules", Some(body))
        .await;

    assert_eq!(status, 200, "创建对账规则应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"]["id"].is_string(), "data 应包含 id 字段");
}

#[tokio::test]
#[ignore]
async fn test_recognize_invoice() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "number": "INV-2026-001",
        "vendor": "Test Supplier Co.",
        "invoice_date": "2026-01-10T00:00:00Z",
        "total_amount": 1130.0,
        "tax_amount": 130.0,
        "items": [
            {
                "description": "办公用品",
                "quantity": 1.0,
                "unit_price": 1000.0,
                "amount": 1000.0,
                "tax_rate": 0.13
            }
        ]
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v55/invoice/recognize", Some(body))
        .await;

    assert_eq!(status, 200, "发票识别应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(
        resp["data"]["invoice"]["id"].is_string(),
        "data 应包含 invoice.id 字段"
    );
}

#[tokio::test]
#[ignore]
async fn test_list_invoices() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx.request("GET", "/finance-v55/invoices", None).await;

    assert_eq!(status, 200, "获取发票列表应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_initiate_payment() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "amount": 5000.0,
        "currency": "CNY",
        "from_account": "acc-from-001",
        "to_account": "acc-to-001",
        "method": "bank_transfer",
        "reference": "PAY-2026-001"
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v55/payment/initiate", Some(body))
        .await;

    assert_eq!(status, 200, "发起支付应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(
        resp["data"]["request"]["id"].is_string(),
        "data 应包含 request.id 字段"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_payment_methods() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v55/payment/methods", None)
        .await;

    assert_eq!(status, 200, "获取支付方式列表应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"].is_array(), "data 应该是数组");
}
