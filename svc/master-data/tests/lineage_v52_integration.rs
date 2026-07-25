//! V52 Lineage 模块 HTTP 集成测试
//!
//! 覆盖数据血缘注册、图谱查询、上游/下游、影响分析等主要端点。
//! 所有测试默认 #[ignore]，需要服务启动时手动执行。
//!
//! 运行命令：
//! ```bash
//! cargo test -p topems-master-data --test lineage_v52_integration -- --ignored
//! ```

mod common;

use common::TestContext;
use serde_json::json;

const V52_PREFIX: &str = "/api/master-data/api/master/lineage-v52";

/// 1. 注册血缘关系
#[tokio::test]
#[ignore]
async fn test_register_lineage() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "from_entity_type": "source_system",
        "from_entity_id": "Test-System-A",
        "to_entity_type": "mdm_entity",
        "to_entity_id": "test_entity_001",
        "edge_type": "derives_from",
        "transformation_description": "测试系统同步数据到测试实体"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/register", V52_PREFIX), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false), "响应 success 应为 true");
    assert!(resp["data"]["from_node"].is_object(), "应返回 from_node");
    assert!(resp["data"]["to_node"].is_object(), "应返回 to_node");
    assert!(resp["data"]["edge"].is_object(), "应返回 edge");
}

/// 2. 获取血缘图谱
#[tokio::test]
#[ignore]
async fn test_get_lineage_graph() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/graph", V52_PREFIX), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["nodes"].is_array(), "nodes 应为数组");
    assert!(resp["data"]["edges"].is_array(), "edges 应为数组");
}

/// 3. 获取上游血缘
#[tokio::test]
#[ignore]
async fn test_get_upstream() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!("{}/upstream/mdm_entity/customer_master", V52_PREFIX),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "上游节点应为数组");
}

/// 4. 获取下游血缘
#[tokio::test]
#[ignore]
async fn test_get_downstream() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request(
            "GET",
            &format!("{}/downstream/source_system/SAP", V52_PREFIX),
            None,
        )
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "下游节点应为数组");
}

/// 5. 导出血缘图谱
#[tokio::test]
#[ignore]
async fn test_export_lineage() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/export?format=json", V52_PREFIX), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert_eq!(resp["data"]["format"], "json");
    assert!(resp["data"]["content"].is_string(), "content 应为字符串");
}

/// 6. 影响分析
#[tokio::test]
#[ignore]
async fn test_analyze_impact() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "target_entity_id": "customer_master",
        "analysis_depth": 3,
        "change_type": "update",
        "include_chain_reactions": true
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/impact/analyze", V52_PREFIX), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["affected_nodes"].is_array());
    assert!(resp["data"]["risk_level"].is_string());
    assert!(resp["data"]["recommendations"].is_array());
}

/// 7. 删除血缘节点
#[tokio::test]
#[ignore]
async fn test_delete_lineage() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let register_body = json!({
        "from_entity_type": "source_system",
        "from_entity_id": "Delete-Test-System",
        "to_entity_type": "mdm_entity",
        "to_entity_id": "delete_test_entity",
        "edge_type": "depends_on"
    });

    let (_, register_resp) = ctx
        .request("POST", &format!("{}/register", V52_PREFIX), Some(register_body))
        .await
        .expect("注册失败");
    let node_id = register_resp["data"]["from_node"]["id"].as_str().unwrap();

    let body = json!({
        "node_id": node_id
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/delete", V52_PREFIX), Some(body))
        .await
        .expect("删除请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
}

/// 8. 获取传播规则列表
#[tokio::test]
#[ignore]
async fn test_get_propagation_rules() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let (status, resp) = ctx
        .request("GET", &format!("{}/propagation/rules", V52_PREFIX), None)
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"].is_array(), "传播规则应为数组");
}

/// 9. 添加传播规则
#[tokio::test]
#[ignore]
async fn test_add_propagation_rule() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "source_entity_type": "product",
        "target_entity_type": "inventory",
        "condition": "product.price_changed",
        "action": "cascade_update"
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/propagation/rules", V52_PREFIX), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["id"].is_string());
    assert_eq!(resp["data"]["source_entity_type"], "product");
}

/// 10. 变更传播
#[tokio::test]
#[ignore]
async fn test_propagate_change() {
    if !common::service_available().await {
        return;
    }
    let ctx = TestContext::new().await;

    let body = json!({
        "entity_type": "customer",
        "entity_id": "C-TEST-PROP-001",
        "change_type": "update",
        "old_value": { "name": "旧名称" },
        "new_value": { "name": "新名称" }
    });

    let (status, resp) = ctx
        .request("POST", &format!("{}/propagate", V52_PREFIX), Some(body))
        .await
        .expect("请求失败");

    assert_eq!(status, 200);
    assert!(resp["success"].as_bool().unwrap_or(false));
    assert!(resp["data"]["change_event"].is_object());
    assert!(resp["data"]["propagation_logs"].is_array());
}
