//! V52 智能审计模块 HTTP 集成测试
//!
//! 运行命令：
//! cargo test -p topems-finance --test audit_v52_integration -- --ignored
//!
//! 覆盖端点：
//! - POST   /audit-v52/rules
//! - GET    /audit-v52/rules
//! - PUT    /audit-v52/rules/{id}
//! - DELETE /audit-v52/rules/{id}
//! - GET    /audit-v52/findings
//! - POST   /audit-v52/run
//! - POST   /audit-v52/anomaly/detect
//! - GET    /audit-v52/anomaly/alerts
//! - POST   /audit-v52/alerts/config
//! - GET    /audit-v52/alerts

mod common;

use common::TestContext;
use serde_json::json;

#[tokio::test]
#[ignore]
async fn test_create_audit_rule() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "重复凭证检测规则",
        "category": "duplicate_voucher",
        "condition": {
            "threshold": 2
        },
        "severity": "high",
        "schedule": "daily",
        "is_active": true
    });

    let (status, resp) = ctx.request("POST", "/audit-v52/rules", Some(body)).await;

    assert_eq!(status, 200, "创建审计规则应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_list_audit_rules() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx.request("GET", "/audit-v52/rules", None).await;

    assert_eq!(status, 200, "列出审计规则应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_update_audit_rule() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "金额不匹配检测规则",
        "category": "amount_mismatch",
        "condition": {
            "tolerance": 0.01
        },
        "severity": "medium",
        "schedule": "weekly"
    });

    let (create_status, create_resp) = ctx
        .request("POST", "/audit-v52/rules", Some(create_body))
        .await;

    assert_eq!(create_status, 200, "创建审计规则应该返回 200");
    let rule_id = create_resp["data"]["id"]
        .as_str()
        .expect("创建的审计规则应该有 id");

    let update_body = json!({
        "name": "更新后的金额不匹配检测规则",
        "severity": "high",
        "is_active": true
    });

    let (update_status, update_resp) = ctx
        .request(
            "PUT",
            &format!("/audit-v52/rules/{}", rule_id),
            Some(update_body),
        )
        .await;

    assert_eq!(update_status, 200, "更新审计规则应该返回 200");
    assert!(
        update_resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_delete_audit_rule() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "待删除的审计规则",
        "category": "unauthorized_access",
        "condition": {
            "days": 7
        },
        "severity": "low",
        "schedule": "monthly"
    });

    let (create_status, create_resp) = ctx
        .request("POST", "/audit-v52/rules", Some(create_body))
        .await;

    assert_eq!(create_status, 200, "创建审计规则应该返回 200");
    let rule_id = create_resp["data"]["id"]
        .as_str()
        .expect("创建的审计规则应该有 id");

    let (delete_status, delete_resp) = ctx
        .request("DELETE", &format!("/audit-v52/rules/{}", rule_id), None)
        .await;

    assert_eq!(delete_status, 200, "删除审计规则应该返回 200");
    assert!(
        delete_resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_list_audit_findings() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx.request("GET", "/audit-v52/findings", None).await;

    assert_eq!(status, 200, "列出审计发现应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_run_audit() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "rule_ids": []
    });

    let (status, resp) = ctx.request("POST", "/audit-v52/run", Some(body)).await;

    assert_eq!(status, 200, "运行审计应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_detect_anomalies() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "detection_type": "z_score",
        "entity_type": "voucher"
    });

    let (status, resp) = ctx
        .request("POST", "/audit-v52/anomaly/detect", Some(body))
        .await;

    assert_eq!(status, 200, "异常检测应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_anomaly_alerts() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx.request("GET", "/audit-v52/anomaly/alerts", None).await;

    assert_eq!(status, 200, "获取异常告警应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_create_alert_config() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "channel": "email",
        "threshold": "high",
        "cooldown": 300,
        "recipients": [
            "admin@example.com",
            "finance@example.com"
        ],
        "is_active": true
    });

    let (status, resp) = ctx
        .request("POST", "/audit-v52/alerts/config", Some(body))
        .await;

    assert_eq!(status, 200, "创建告警配置应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_get_alerts() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx.request("GET", "/audit-v52/alerts", None).await;

    assert_eq!(status, 200, "获取告警历史应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}
