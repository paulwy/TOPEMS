mod common;

use common::TestContext;
use serde_json::json;

#[tokio::test]
#[ignore]
async fn test_health_check() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;
    let url = format!("{}/health", ctx.base_url());
    let status = ctx
        .client
        .get(&url)
        .send()
        .await
        .map(|r| r.status().as_u16())
        .unwrap_or(0);
    assert_eq!(status, 200, "健康检查端点应该返回 200");
}

#[tokio::test]
#[ignore]
async fn test_create_scenario() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "测试投资决策场景",
        "scenario_type": "investment",
        "parameters": {
            "budget": 500000.0,
            "time_horizon": "3 years"
        },
        "objectives": [
            {
                "id": "obj_001",
                "name": "最大化收益",
                "weight": 0.6,
                "objective_type": "maximize"
            }
        ],
        "constraints": [
            {
                "type": "risk_limit",
                "value": 0.2
            }
        ]
    });

    let (status, resp) = ctx
        .request("POST", "/finance-v60/decision/scenario", Some(body))
        .await;

    assert_eq!(status, 200, "创建场景应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_list_scenarios() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v60/decision/scenarios", None)
        .await;

    assert_eq!(status, 200, "列出场景应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"].is_array(), "data 应该是数组");
}

#[tokio::test]
#[ignore]
async fn test_evaluate_scenario() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "评估测试场景",
        "scenario_type": "financing",
        "parameters": {
            "amount": 1000000.0
        }
    });

    let (create_status, create_resp) = ctx
        .request("POST", "/finance-v60/decision/scenario", Some(create_body))
        .await;

    assert_eq!(create_status, 200, "创建场景应该返回 200");
    assert!(
        create_resp["success"].as_bool().unwrap_or(false),
        "创建场景应成功"
    );

    let scenario_id = create_resp["data"]["id"]
        .as_str()
        .expect("创建的场景应该有 id");

    let eval_body = json!({
        "parameters": {
            "market_condition": "stable"
        }
    });

    let (eval_status, eval_resp) = ctx
        .request(
            "POST",
            &format!("/finance-v60/decision/evaluate/{}", scenario_id),
            Some(eval_body),
        )
        .await;

    assert_eq!(eval_status, 200, "评估场景应该返回 200");
    assert!(
        eval_resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(
        eval_resp["data"]["recommended_action"].is_string(),
        "应该有推荐行动"
    );
    assert!(eval_resp["data"]["confidence"].is_number(), "应该有置信度");
}

#[tokio::test]
#[ignore]
async fn test_get_decision_result() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let create_body = json!({
        "name": "决策结果测试场景",
        "scenario_type": "operational"
    });

    let (create_status, create_resp) = ctx
        .request("POST", "/finance-v60/decision/scenario", Some(create_body))
        .await;

    assert_eq!(create_status, 200, "创建场景应该返回 200");
    let scenario_id = create_resp["data"]["id"]
        .as_str()
        .expect("创建的场景应该有 id");

    let (eval_status, _) = ctx
        .request(
            "POST",
            &format!("/finance-v60/decision/evaluate/{}", scenario_id),
            Some(json!({})),
        )
        .await;

    assert_eq!(eval_status, 200, "评估场景应该返回 200");

    let (get_status, get_resp) = ctx
        .request(
            "GET",
            &format!("/finance-v60/decision/{}", scenario_id),
            None,
        )
        .await;

    assert_eq!(get_status, 200, "获取决策结果应该返回 200");
    assert!(
        get_resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
}

#[tokio::test]
#[ignore]
async fn test_decision_history() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", "/finance-v60/decision/history", None)
        .await;

    assert_eq!(status, 200, "获取决策历史应该返回 200");
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"].is_array(), "data 应该是数组");
}
