//! V51 合规内控模块 HTTP 集成测试
//!
//! 运行命令：
//! cargo test -p topems-finance --test compliance_v51_integration -- --ignored
//!
//! 覆盖端点：
//! - POST   /compliance-v51/control-points
//! - GET    /compliance-v51/control-points
//! - GET    /compliance-v51/control-points/{id}
//! - PUT    /compliance-v51/control-points/{id}
//! - DELETE /compliance-v51/control-points/{id}
//! - POST   /compliance-v51/risk-assessments
//! - GET    /compliance-v51/risk-assessments
//! - GET    /compliance-v51/risk-assessments/summary
//! - POST   /compliance-v51/reports/generate
//! - GET    /compliance-v51/reports

mod common;

use common::TestContext;
use serde_json::json;

#[tokio::test]
#[ignore]
async fn test_create_control_point() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "code": "CP-TEST-001",
        "name": "测试控制点",
        "description": "这是一个用于集成测试的控制点",
        "category": "authorization",
        "risk_level": "medium",
        "control_type": "preventive",
        "frequency": "monthly",
        "is_active": true
    });

    let (status, resp) = ctx
        .request("POST", "/compliance-v51/control-points", Some(body))
        .await;

    assert_eq!(status, 200, "创建控制点应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_list_control_points() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/compliance-v51/control-points", None)
        .await;

    assert_eq!(status, 200, "列出控制点应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_get_control_point() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "code": "CP-TEST-002",
        "name": "查询测试控制点",
        "description": "用于测试查询接口的控制点",
        "category": "segregation",
        "risk_level": "high",
        "control_type": "detective",
        "frequency": "weekly"
    });

    let (create_status, create_resp) = ctx
        .request("POST", "/compliance-v51/control-points", Some(create_body))
        .await;

    assert_eq!(create_status, 200, "创建控制点应该返回 200");
    let cp_id = create_resp["data"]["id"]
        .as_str()
        .expect("创建的控制点应该有 id");

    let (get_status, get_resp) = ctx
        .request("GET", &format!("/compliance-v51/control-points/{}", cp_id), None)
        .await;

    assert_eq!(get_status, 200, "获取控制点应该返回 200");
    assert!(get_resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_update_control_point() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "code": "CP-TEST-003",
        "name": "更新测试控制点",
        "description": "用于测试更新接口的控制点",
        "category": "approval",
        "risk_level": "low",
        "control_type": "corrective",
        "frequency": "quarterly"
    });

    let (create_status, create_resp) = ctx
        .request("POST", "/compliance-v51/control-points", Some(create_body))
        .await;

    assert_eq!(create_status, 200, "创建控制点应该返回 200");
    let cp_id = create_resp["data"]["id"]
        .as_str()
        .expect("创建的控制点应该有 id");

    let update_body = json!({
        "name": "更新后的控制点名称",
        "description": "更新后的描述信息",
        "risk_level": "medium",
        "is_active": true
    });

    let (update_status, update_resp) = ctx
        .request(
            "PUT",
            &format!("/compliance-v51/control-points/{}", cp_id),
            Some(update_body),
        )
        .await;

    assert_eq!(update_status, 200, "更新控制点应该返回 200");
    assert!(update_resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_delete_control_point() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "code": "CP-TEST-004",
        "name": "删除测试控制点",
        "description": "用于测试删除接口的控制点",
        "category": "monitoring",
        "risk_level": "critical",
        "control_type": "preventive",
        "frequency": "daily"
    });

    let (create_status, create_resp) = ctx
        .request("POST", "/compliance-v51/control-points", Some(create_body))
        .await;

    assert_eq!(create_status, 200, "创建控制点应该返回 200");
    let cp_id = create_resp["data"]["id"]
        .as_str()
        .expect("创建的控制点应该有 id");

    let (delete_status, delete_resp) = ctx
        .request(
            "DELETE",
            &format!("/compliance-v51/control-points/{}", cp_id),
            None,
        )
        .await;

    assert_eq!(delete_status, 200, "删除控制点应该返回 200");
    assert!(delete_resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_create_risk_assessment() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let cp_body = json!({
        "code": "CP-RA-001",
        "name": "风险评估测试控制点",
        "description": "用于测试风险评估的控制点",
        "category": "authorization",
        "risk_level": "medium",
        "control_type": "preventive",
        "frequency": "monthly"
    });

    let (cp_status, cp_resp) = ctx
        .request("POST", "/compliance-v51/control-points", Some(cp_body))
        .await;

    assert_eq!(cp_status, 200, "创建控制点应该返回 200");
    let cp_id = cp_resp["data"]["id"]
        .as_str()
        .expect("创建的控制点应该有 id");

    let ra_body = json!({
        "control_point_id": cp_id,
        "likelihood": "medium",
        "impact": "high",
        "mitigation_strategy": "加强审批流程，增加复核环节",
        "residual_risk": "low"
    });

    let (ra_status, ra_resp) = ctx
        .request("POST", "/compliance-v51/risk-assessments", Some(ra_body))
        .await;

    assert_eq!(ra_status, 200, "创建风险评估应该返回 200");
    assert!(ra_resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_list_risk_assessments() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/compliance-v51/risk-assessments", None)
        .await;

    assert_eq!(status, 200, "列出风险评估应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_risk_assessment_summary() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/compliance-v51/risk-assessments/summary", None)
        .await;

    assert_eq!(status, 200, "获取风险摘要应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_generate_compliance_report() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "report_type": "periodic",
        "period_start": "2026-01-01T00:00:00Z",
        "period_end": "2026-06-30T23:59:59Z"
    });

    let (status, resp) = ctx
        .request("POST", "/compliance-v51/reports/generate", Some(body))
        .await;

    assert_eq!(status, 200, "生成合规报告应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}

#[tokio::test]
#[ignore]
async fn test_list_compliance_reports() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/compliance-v51/reports", None)
        .await;

    assert_eq!(status, 200, "列出合规报告应该返回 200");
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
}
