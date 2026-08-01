//! V58 Governance 模块 HTTP 集成测试
//!
//! 覆盖治理成熟度、自动化工作流、数据产品化三大子模块的主要端点。
//! 所有测试默认 #[ignore]，需要服务启动时手动执行。
//!
//! 运行命令：
//! ```bash
//! cargo test -p topems-master-data --test governance_v58_integration -- --ignored
//! ```

mod common;

use common::TestContext;
use serde_json::json;

const BASE_PATH: &str = "/api/master-data/api/master/mdm-v58";

/// 1. 评估治理成熟度
#[tokio::test]
#[ignore]
async fn test_assess_maturity() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "dimension": "quality",
        "target_level": "optimized"
    });

    let (status, resp) = ctx
        .request(
            "POST",
            &format!("{}/maturity/assess", BASE_PATH),
            Some(body),
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["dimension"], "quality");
    assert_eq!(resp["data"]["target_level"], "optimized");
}

/// 2. 获取维度评分
#[tokio::test]
#[ignore]
async fn test_get_dimension_scores() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/maturity/scores", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 3. 创建改进计划
#[tokio::test]
#[ignore]
async fn test_create_improvement_plan() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "dimension": "process",
        "target_level": "managed",
        "actions": [
            "建立数据治理工作流",
            "实施数据变更审批流程",
            "制定数据质量管理规范"
        ]
    });

    let (status, resp) = ctx
        .request(
            "POST",
            &format!("{}/maturity/improvement-plan", BASE_PATH),
            Some(body),
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["dimension"], "process");
    assert_eq!(resp["data"]["target_level"], "managed");
    assert!(resp["data"]["actions"].is_array());
}

/// 4. 创建工作流
#[tokio::test]
#[ignore]
async fn test_create_workflow() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "集成测试工作流",
        "workflow_type": "approval",
        "steps": [
            {"type": "action", "name": "提交申请", "assignee": "applicant"},
            {"type": "review", "name": "数据质量审核", "assignee": "data_quality"},
            {"type": "approval", "name": "主管审批", "assignee": "manager"},
            {"type": "notification", "name": "通知结果"}
        ]
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/workflow", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["name"], "集成测试工作流");
    assert_eq!(resp["data"]["workflow_type"], "approval");
    assert!(resp["data"]["steps"].is_array());
}

/// 5. 获取工作流模板
#[tokio::test]
#[ignore]
async fn test_get_workflow_templates() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/workflow/templates", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 6. 列出工作流
#[tokio::test]
#[ignore]
async fn test_list_workflows() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/workflows", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 7. 创建数据产品
#[tokio::test]
#[ignore]
async fn test_create_data_product() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "集成测试数据产品",
        "description": "用于集成测试的数据产品",
        "owner": "test_team",
        "domain": "test_domain",
        "sla_level": "gold"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/data-product", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["name"], "集成测试数据产品");
    assert_eq!(resp["data"]["owner"], "test_team");
    assert_eq!(resp["data"]["sla_level"], "gold");
}

/// 8. 列出数据产品
#[tokio::test]
#[ignore]
async fn test_list_data_products() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/data-products", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 9. 获取成熟度进度
#[tokio::test]
#[ignore]
async fn test_track_progress() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/maturity/progress", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 10. 获取基准对比数据
#[tokio::test]
#[ignore]
async fn test_get_benchmark() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/maturity/benchmark", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}
