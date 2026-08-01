//! V59 AI Governance 模块 HTTP 集成测试
//!
//! 覆盖数据治理 AI、智能匹配、自动分类三大子模块的主要端点。
//! 所有测试默认 #[ignore]，需要服务启动时手动执行。
//!
//! 运行命令：
//! ```bash
//! cargo test -p topems-master-data --test ai_governance_v59_integration -- --ignored
//! ```

mod common;

use common::TestContext;
use serde_json::json;

const BASE_PATH: &str = "/api/master-data/api/master/mdm-v59";

/// 1. 数据治理分析
#[tokio::test]
#[ignore]
async fn test_analyze_governance() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_type": "customer",
        "entity_id": "cust_test_001"
    });

    let (status, resp) = ctx
        .request(
            "POST",
            &format!("{}/governance/analyze", BASE_PATH),
            Some(body),
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 2. 获取治理建议列表
#[tokio::test]
#[ignore]
async fn test_get_suggestions() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!("{}/governance/suggestions", BASE_PATH),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 3. 获取治理模型列表
#[tokio::test]
#[ignore]
async fn test_get_models() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/governance/models", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 4. 创建匹配规则
#[tokio::test]
#[ignore]
async fn test_create_match_rule() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "集成测试匹配规则",
        "rule_type": "fuzzy",
        "field_config": {
            "fields": ["name", "code"],
            "method": "levenshtein"
        },
        "threshold": 0.85
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/matching/rule", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["name"], "集成测试匹配规则");
    assert_eq!(resp["data"]["rule_type"], "fuzzy");
}

/// 5. 获取匹配规则列表
#[tokio::test]
#[ignore]
async fn test_get_match_rules() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/matching/rules", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 6. 实体匹配
#[tokio::test]
#[ignore]
async fn test_match_entities() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "source_id": "source_001",
        "target_id": "target_001",
        "entity_type": "customer"
    });

    let (status, resp) = ctx
        .request(
            "POST",
            &format!("{}/matching/entities", BASE_PATH),
            Some(body),
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 7. 获取匹配结果
#[tokio::test]
#[ignore]
async fn test_get_match_results() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/matching/results", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 8. 创建分类器
#[tokio::test]
#[ignore]
async fn test_create_classifier() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "集成测试分类器",
        "entity_type": "product",
        "categories": ["electronics", "clothing", "food", "other"],
        "algorithm": "ensemble"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/classifier", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["name"], "集成测试分类器");
    assert_eq!(resp["data"]["entity_type"], "product");
    assert!(resp["data"]["categories"].is_array());
}

/// 9. 获取分类器列表
#[tokio::test]
#[ignore]
async fn test_get_classifiers() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/classifiers", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 10. 获取分类统计
#[tokio::test]
#[ignore]
async fn test_get_classification_stats() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/classification/stats", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["total_models"].is_number());
    assert!(resp["data"]["total_classifications"].is_number());
}
