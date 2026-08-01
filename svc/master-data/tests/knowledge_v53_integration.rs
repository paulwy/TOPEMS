//! V53 Knowledge 模块 HTTP 集成测试
//!
//! 覆盖知识图谱、智能推荐、数据资产目录等主要端点。
//! 所有测试默认 #[ignore]，需要服务启动时手动执行。
//!
//! 运行命令：
//! ```bash
//! cargo test -p topems-master-data --test knowledge_v53_integration -- --ignored
//! ```

mod common;

use common::TestContext;
use serde_json::json;

const V53_PREFIX: &str = "/api/master-data/api/master/kg-v53";

/// 1. 添加知识图谱节点
#[tokio::test]
#[ignore]
async fn test_add_kg_node() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "label": "Test-Entity",
        "node_type": "entity",
        "properties": {
            "code": "TEST-001",
            "description": "集成测试节点"
        }
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/nodes", V53_PREFIX), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(
        resp["success"].as_bool().unwrap_or(false),
        "响应 success 应为 true"
    );
    assert!(resp["data"]["id"].is_string(), "应返回节点 ID");
    assert_eq!(resp["data"]["label"], "Test-Entity");
}

/// 2. 添加知识图谱边
#[tokio::test]
#[ignore]
async fn test_add_kg_edge() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let node1_body = json!({
        "label": "Source-Node",
        "node_type": "entity"
    });
    let (_, node1_resp) = ctx
        .request("POST", &format!("{}/nodes", V53_PREFIX), Some(node1_body))
        .await
        .expect("创建源节点失败");
    let source_id = node1_resp["data"]["id"].as_str().unwrap();

    let node2_body = json!({
        "label": "Target-Node",
        "node_type": "concept"
    });
    let (_, node2_resp) = ctx
        .request("POST", &format!("{}/nodes", V53_PREFIX), Some(node2_body))
        .await
        .expect("创建目标节点失败");
    let target_id = node2_resp["data"]["id"].as_str().unwrap();

    let edge_body = json!({
        "source_id": source_id,
        "target_id": target_id,
        "relation_type": "belongs_to",
        "weight": 0.9,
        "confidence": 0.95
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/edges", V53_PREFIX), Some(edge_body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["source_id"], source_id);
}

/// 3. 获取子图谱
#[tokio::test]
#[ignore]
async fn test_get_subgraph() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!("{}/subgraph/kg-node-001?depth=2", V53_PREFIX),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["nodes"].is_array());
    assert!(resp["data"]["edges"].is_array());
}

/// 4. 查找路径
#[tokio::test]
#[ignore]
async fn test_find_path() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!(
                "{}/path?start_id=kg-node-001&end_id=kg-node-006",
                V53_PREFIX
            ),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "路径边列表应为数组");
}

/// 5. 获取相似节点
#[tokio::test]
#[ignore]
async fn test_get_similar_nodes() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!("{}/similar/kg-node-001?limit=5", V53_PREFIX),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "相似节点应为数组");
}

/// 6. 导出知识图谱
#[tokio::test]
#[ignore]
async fn test_export_kg() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/export?format=json", V53_PREFIX), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["format"], "json");
    assert!(resp["data"]["content"].is_string());
}

/// 7. 注册数据资产
#[tokio::test]
#[ignore]
async fn test_register_asset() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "集成测试-客户主数据资产",
        "asset_type": "entity",
        "description": "用于集成测试的客户主数据资产",
        "owner": "test_team",
        "domain": "customer",
        "tags": ["test", "customer", "integration"]
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/assets", V53_PREFIX), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["name"], "集成测试-客户主数据资产");
    assert_eq!(resp["data"]["domain"], "customer");
}

/// 8. 搜索数据资产
#[tokio::test]
#[ignore]
async fn test_search_assets() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!("{}/assets?q=customer&page=1&page_size=10", V53_PREFIX),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["items"].is_array());
    assert!(resp["data"]["total"].is_number());
}

/// 9. 获取资产统计
#[tokio::test]
#[ignore]
async fn test_get_asset_stats() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/assets/stats", V53_PREFIX), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["total_assets"].is_number());
    assert!(resp["data"]["by_type"].is_object());
    assert!(resp["data"]["avg_quality_score"].is_number());
}

/// 10. 获取资产分类列表
#[tokio::test]
#[ignore]
async fn test_list_categories() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/categories", V53_PREFIX), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "分类列表应为数组");
}

/// 11. 获取推荐结果
#[tokio::test]
#[ignore]
async fn test_get_recommendations() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!("{}/recommendations/test-user-001?limit=5", V53_PREFIX),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "推荐结果应为数组");
}

/// 12. 记录用户交互
#[tokio::test]
#[ignore]
async fn test_record_interaction() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "user_id": "test-user-001",
        "item_id": "asset-001",
        "interaction_type": "view"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/interactions", V53_PREFIX), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["user_id"], "test-user-001");
}
