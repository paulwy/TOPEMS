//! V57 Semantic 模块 HTTP 集成测试
//!
//! 覆盖图谱增强、语义搜索、智能标签三大子模块的主要端点。
//! 所有测试默认 #[ignore]，需要服务启动时手动执行。
//!
//! 运行命令：
//! ```bash
//! cargo test -p topems-master-data --test semantic_v57_integration -- --ignored
//! ```

mod common;

use common::TestContext;
use serde_json::json;

const BASE_PATH: &str = "/api/master-data/api/master/mdm-v57";

/// 1. 创建图谱节点
#[tokio::test]
#[ignore]
async fn test_add_graph_node() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "label": "集成测试节点",
        "node_type": "test_entity",
        "properties": {
            "source": "integration_test",
            "priority": "high"
        }
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/graph/node", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["label"], "集成测试节点");
    assert_eq!(resp["data"]["node_type"], "test_entity");
}

/// 2. 创建图谱边
#[tokio::test]
#[ignore]
async fn test_add_graph_edge() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "source_id": "customer_0_0",
        "target_id": "product_1_0",
        "relation_type": "purchases",
        "weight": 0.85,
        "confidence": 0.92
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/graph/edge", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["source_id"], "customer_0_0");
    assert_eq!(resp["data"]["target_id"], "product_1_0");
    assert_eq!(resp["data"]["relation_type"], "purchases");
}

/// 3. 获取节点邻居
#[tokio::test]
#[ignore]
async fn test_get_neighbors() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!("{}/graph/neighbors/customer_0_0", BASE_PATH),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 4. 语义搜索
#[tokio::test]
#[ignore]
async fn test_search_semantic() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "query": "企业管理软件",
        "top_k": 5,
        "filters": {
            "entity_type": "product"
        }
    });

    let (status, resp) = ctx
        .request(
            "POST",
            &format!("{}/search/semantic", BASE_PATH),
            Some(body),
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 5. 混合搜索
#[tokio::test]
#[ignore]
async fn test_search_hybrid() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "query": "北京 科技",
        "top_k": 10
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/search/hybrid", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 6. 创建标签
#[tokio::test]
#[ignore]
async fn test_create_tag() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "name": "集成测试标签",
        "category": "test",
        "color": "#FF5733",
        "description": "用于集成测试的标签"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/tags", BASE_PATH), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["name"], "集成测试标签");
    assert_eq!(resp["data"]["category"], "test");
}

/// 7. 获取搜索统计
#[tokio::test]
#[ignore]
async fn test_get_search_stats() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/search/stats", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["total_indexes"].is_number());
    assert!(resp["data"]["entity_types"].is_array());
}

/// 8. 列出所有标签
#[tokio::test]
#[ignore]
async fn test_list_tags() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/tags", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}

/// 9. 计算图嵌入
#[tokio::test]
#[ignore]
async fn test_compute_embeddings() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "node_ids": ["customer_0_0", "product_1_0"]
    });

    let (status, resp) = ctx
        .request(
            "POST",
            &format!("{}/graph/embeddings", BASE_PATH),
            Some(body),
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["nodes_processed"].is_number());
    assert_eq!(resp["data"]["status"], "completed");
}

/// 10. 检测社区
#[tokio::test]
#[ignore]
async fn test_detect_communities() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("POST", &format!("{}/graph/communities", BASE_PATH), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array());
}
